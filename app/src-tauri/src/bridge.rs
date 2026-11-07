//! Pont avec Rago OS : Rago OS (le bureau Rago, un autre programme) lit l'état de Rago Optimizer et lui demande des
//! actions, sans que le joueur ouvre l'app. Rago Optimizer tourne avec les droits administrateur, Rago OS sans : le
//! pont est la seule porte, et il ne fait que ce que le joueur peut déjà faire dans l'app.
//!
//! Transport : un canal nommé local, `\\.\pipe\gg.rago.optimizer.bridge` (`gg.rago.optimizer.staging.bridge` pour l'exe
//! de test), une demande par connexion. Rago OS écrit une ligne JSON (`{"cmd": "status", ...}`) et lit une ligne JSON en retour
//! (`{"ok": true, "data": ...}` ou `{"ok": false, "error": "..."}`). Commandes : `handle` dans lib.rs.
//!
//! Garde-fous :
//! - canal refusé aux autres PC (PIPE_REJECT_REMOTE_CLIENTS), ouvert en lecture-écriture aux seuls utilisateurs de la
//!   session ouverte (SDDL IU), en plus du système et des administrateurs ;
//! - le client doit être Rago OS : l'exe à l'autre bout du canal s'appelle RagoOS.exe (ou rago-os.exe en
//!   développement). Ce n'est pas une signature, mais ça écarte les programmes qui ne se font pas passer pour lui ;
//! - une demande fait au plus 64 Ko, et la réponse part dans les 30 s (test réseau compris) ;
//! - ni identifiants, ni clé, ni e-mail ne passent par le pont : l'état de la licence se résume à l'offre.

use serde_json::{json, Value};
use std::sync::Arc;

pub type Handler = Arc<dyn Fn(Value) -> Result<Value, String> + Send + Sync>;

/// Nom du canal, tiré de l'identifiant de l'app : l'exe de test (gg.rago.optimizer.staging) a le sien.
pub fn pipe_name() -> String {
    format!(r"\\.\pipe\{}.bridge", crate::reset::IDENTIFIER)
}

/// Exes acceptés à l'autre bout du canal.
pub fn client_allowed(exe_path: &str) -> bool {
    let name = exe_path.rsplit(['\\', '/']).next().unwrap_or("").to_ascii_lowercase();
    name == "ragoos.exe" || name == "rago-os.exe"
}

/// Une demande (ligne JSON) → une réponse (ligne JSON).
pub fn answer(handler: &Handler, line: &[u8]) -> Vec<u8> {
    let reply = match serde_json::from_slice::<Value>(line) {
        Ok(req) if req.get("cmd").and_then(Value::as_str).is_some() => match handler(req) {
            Ok(data) => json!({ "ok": true, "data": data }),
            Err(e) => json!({ "ok": false, "error": e }),
        },
        _ => json!({ "ok": false, "error": "bad_request" }),
    };
    let mut out = serde_json::to_vec(&reply).unwrap_or_else(|_| b"{\"ok\":false,\"error\":\"encode\"}".to_vec());
    out.push(b'\n');
    out
}

/// Lance le serveur du canal sur son propre fil (un fil de plus par client, le temps de sa demande).
pub fn serve(handler: Handler) {
    #[cfg(windows)]
    std::thread::spawn(move || win::serve(handler));
    #[cfg(not(windows))]
    let _ = handler;
}

#[cfg(windows)]
mod win {
    use super::*;
    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, LocalFree, ERROR_PIPE_CONNECTED, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Security::Authorization::ConvertStringSecurityDescriptorToSecurityDescriptorW;
    use windows_sys::Win32::Security::{PSECURITY_DESCRIPTOR, SECURITY_ATTRIBUTES};
    use windows_sys::Win32::Storage::FileSystem::{FlushFileBuffers, ReadFile, WriteFile, PIPE_ACCESS_DUPLEX};
    use windows_sys::Win32::System::Pipes::*;
    use windows_sys::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};

    const MAX_REQUEST: usize = 64 * 1024;
    /// Système et administrateurs : tout ; utilisateurs de la session ouverte : lire et écrire.
    const SDDL: &str = "D:(A;;GA;;;SY)(A;;GA;;;BA)(A;;GRGW;;;IU)";

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    struct Pipe(HANDLE);
    unsafe impl Send for Pipe {}
    impl Drop for Pipe {
        fn drop(&mut self) {
            unsafe {
                FlushFileBuffers(self.0);
                DisconnectNamedPipe(self.0);
                CloseHandle(self.0);
            }
        }
    }

    fn client_exe(pipe: HANDLE) -> Option<String> {
        let mut pid = 0u32;
        if unsafe { GetNamedPipeClientProcessId(pipe, &mut pid) } == 0 {
            return None;
        }
        let proc = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
        if proc.is_null() {
            return None;
        }
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = unsafe { QueryFullProcessImageNameW(proc, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len) } != 0;
        unsafe { CloseHandle(proc) };
        ok.then(|| String::from_utf16_lossy(&buf[..len as usize]))
    }

    fn read_line(pipe: HANDLE) -> Option<Vec<u8>> {
        let mut data = Vec::new();
        let mut buf = [0u8; 4096];
        loop {
            let mut n = 0u32;
            let ok = unsafe { ReadFile(pipe, buf.as_mut_ptr(), buf.len() as u32, &mut n, std::ptr::null_mut()) } != 0;
            if n > 0 {
                data.extend_from_slice(&buf[..n as usize]);
            }
            if let Some(i) = data.iter().position(|&b| b == b'\n') {
                data.truncate(i);
                return Some(data);
            }
            // ERROR_MORE_DATA en mode message : on continue de lire
            if (!ok && unsafe { GetLastError() } != 234) || n == 0 || data.len() > MAX_REQUEST {
                return (!data.is_empty() && data.len() <= MAX_REQUEST).then_some(data);
            }
        }
    }

    fn write_all(pipe: HANDLE, mut bytes: &[u8]) {
        while !bytes.is_empty() {
            let mut n = 0u32;
            if unsafe { WriteFile(pipe, bytes.as_ptr(), bytes.len() as u32, &mut n, std::ptr::null_mut()) } == 0 || n == 0 {
                return;
            }
            bytes = &bytes[n as usize..];
        }
    }

    pub fn serve(handler: Handler) {
        let name = wide(&pipe_name());
        let mut sd: PSECURITY_DESCRIPTOR = std::ptr::null_mut();
        if unsafe { ConvertStringSecurityDescriptorToSecurityDescriptorW(wide(SDDL).as_ptr(), 1, &mut sd, std::ptr::null_mut()) } == 0 {
            eprintln!("[bridge] descripteur de sécurité refusé");
            return;
        }
        let sa = SECURITY_ATTRIBUTES { nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32, lpSecurityDescriptor: sd, bInheritHandle: 0 };
        let mut failures = 0;
        loop {
            let pipe = unsafe {
                CreateNamedPipeW(
                    name.as_ptr(),
                    PIPE_ACCESS_DUPLEX,
                    PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                    PIPE_UNLIMITED_INSTANCES,
                    64 * 1024,
                    64 * 1024,
                    0,
                    &sa,
                )
            };
            if pipe == INVALID_HANDLE_VALUE {
                // canal déjà pris (autre Rago Optimizer) ou refusé : on réessaie plus tard, sans jamais bloquer l'app
                failures += 1;
                std::thread::sleep(std::time::Duration::from_secs(if failures > 5 { 30 } else { 2 }));
                continue;
            }
            failures = 0;
            let connected = unsafe { ConnectNamedPipe(pipe, std::ptr::null_mut()) } != 0 || unsafe { GetLastError() } == ERROR_PIPE_CONNECTED;
            let pipe = Pipe(pipe);
            if !connected {
                continue;
            }
            let handler = Arc::clone(&handler);
            std::thread::spawn(move || {
                // le Pipe entier passe au fil (et se ferme à sa fin), pas seulement son handle
                let pipe = pipe;
                let allowed = client_exe(pipe.0).is_some_and(|exe| client_allowed(&exe));
                let Some(line) = read_line(pipe.0) else { return };
                let reply = if allowed { answer(&handler, &line) } else { b"{\"ok\":false,\"error\":\"client_refused\"}\n".to_vec() };
                write_all(pipe.0, &reply);
            });
        }
        #[allow(unreachable_code)]
        unsafe {
            LocalFree(sd as _);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seul_rago_os_peut_parler_au_pont() {
        assert!(client_allowed(r"C:\Users\a\AppData\Local\Rago OS\RagoOS.exe"));
        assert!(client_allowed(r"C:\dev\rago-os\src-tauri\target\debug\rago-os.exe"));
        assert!(!client_allowed(r"C:\Windows\System32\cmd.exe"));
        assert!(!client_allowed(r"C:\Temp\RagoOS.exe.bat"));
        assert!(!client_allowed(""));
    }

    #[test]
    fn reponse_en_une_ligne() {
        let h: Handler = Arc::new(|req| match req["cmd"].as_str() {
            Some("hello") => Ok(json!({ "bridge": 1 })),
            _ => Err("unknown_command".into()),
        });
        assert_eq!(answer(&h, br#"{"cmd":"hello"}"#), b"{\"data\":{\"bridge\":1},\"ok\":true}\n".to_vec());
        assert_eq!(answer(&h, br#"{"cmd":"nope"}"#), b"{\"error\":\"unknown_command\",\"ok\":false}\n".to_vec());
        assert_eq!(answer(&h, b"pas du json"), b"{\"error\":\"bad_request\",\"ok\":false}\n".to_vec());
        assert_eq!(answer(&h, br#"{"x":1}"#), b"{\"error\":\"bad_request\",\"ok\":false}\n".to_vec());
    }
}
