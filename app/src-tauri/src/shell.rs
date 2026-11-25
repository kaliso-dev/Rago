//! Lancement de processus sans fenêtre de console.

use std::process::{Command, Stdio};

#[cfg(windows)]
pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Une commande qui n'ouvre pas de fenêtre noire.
pub fn hidden(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.stdin(Stdio::null());
    cmd
}

/// Lance une commande PowerShell et renvoie sa sortie standard, nettoyée.
pub fn powershell(script: &str) -> Option<String> {
    let out = hidden("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command"])
        .arg(format!("[Console]::OutputEncoding=[Text.Encoding]::UTF8; {script}"))
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

/// Sortie d'un programme de Windows : UTF-8 quand c'en est, sinon la page de code OEM de la console. powercfg écrit
/// dans cette page de code (CP850 sur un Windows français) : lue en UTF-8, « Recommandé par HP » devenait
/// « Recommand? par?HP » (retour de Sofiene du 25/11).
pub fn decode_output(bytes: &[u8]) -> String {
    if let Ok(s) = std::str::from_utf8(bytes) {
        return s.to_string();
    }
    #[cfg(windows)]
    if let Some(s) = oem_to_string(bytes) {
        return s;
    }
    String::from_utf8_lossy(bytes).into_owned()
}

#[cfg(windows)]
fn oem_to_string(bytes: &[u8]) -> Option<String> {
    use windows_sys::Win32::Globalization::{MultiByteToWideChar, CP_OEMCP};
    let len = i32::try_from(bytes.len()).ok().filter(|n| *n > 0)?;
    unsafe {
        let n = MultiByteToWideChar(CP_OEMCP, 0, bytes.as_ptr(), len, std::ptr::null_mut(), 0);
        if n <= 0 {
            return None;
        }
        let mut buf = vec![0u16; n as usize];
        let m = MultiByteToWideChar(CP_OEMCP, 0, bytes.as_ptr(), len, buf.as_mut_ptr(), n);
        (m > 0).then(|| String::from_utf16_lossy(&buf[..m as usize]))
    }
}

/// Vrai si le processus courant tourne avec un jeton administrateur élevé.
#[cfg(windows)]
pub fn is_elevated() -> bool {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
    unsafe {
        let mut token: HANDLE = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut size = 0u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut size,
        );
        CloseHandle(token);
        ok != 0 && elevation.TokenIsElevated != 0
    }
}

#[cfg(not(windows))]
pub fn is_elevated() -> bool {
    false
}
