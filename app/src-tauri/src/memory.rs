//! Bouton « Nettoyer » de la RAM (tableau de bord, RAG-48, décidé le 17/10/2026) : vide la liste « standby » de
//! Windows, le cache des fichiers lus récemment que Windows garde en mémoire tant que personne n'en a besoin. Aucune
//! appli n'est fermée et aucune donnée n'est perdue : ce cache se reconstruit tout seul.
//!
//! Honnête par construction : Windows compte déjà ce cache comme disponible, donc la jauge « RAM utilisée » bouge à
//! peine. L'interface annonce le cache vidé (ce que ce module mesure), jamais de la « RAM libérée ». Seulement au clic :
//! un nettoyage automatique en boucle ralentirait le PC (Windows relirait sans cesse les mêmes fichiers).
//!
//! Option (désactivée par défaut, Paramètres) : réduire aussi la mémoire des applis en arrière-plan de la session du
//! joueur. Ni la fenêtre au premier plan, ni les jeux de la bibliothèque, ni les anti-cheat, ni les processus de
//! Windows ne sont touchés.

use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cleaned {
    /// cache vidé (liste standby), en octets
    pub standby: u64,
    /// mémoire rendue par les applis en arrière-plan réduites (option), en octets
    pub trimmed: u64,
    /// applis réduites
    pub apps: u32,
}

/// Processus jamais réduits, en minuscules : Windows lui-même, l'Explorateur (le bureau ralentirait), les anti-cheat
/// (ouvrir leur processus peut les alerter) et les jeux connus, même hors de la bibliothèque.
#[cfg_attr(not(windows), allow(dead_code))]
const PROTECTED: &[&str] = &[
    "system", "registry", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe", "services.exe", "lsass.exe",
    "lsaiso.exe", "svchost.exe", "dwm.exe", "fontdrvhost.exe", "audiodg.exe", "explorer.exe", "sihost.exe",
    "ctfmon.exe", "taskmgr.exe", "memcompression", "secure system", "msmpeng.exe", "nissrv.exe",
    "securityhealthservice.exe", "searchhost.exe", "startmenuexperiencehost.exe", "shellexperiencehost.exe",
    "textinputhost.exe", "runtimebroker.exe",
    // anti-cheat
    "vgc.exe", "vgtray.exe", "vgk.sys", "easyanticheat.exe", "easyanticheat_eos.exe", "easyanticheat_eossetup.exe",
    "beservice.exe", "beservice_x64.exe", "battleye.exe", "faceit.exe", "faceitclient.exe", "faceitservice.exe",
    "eaanticheat.gameservice.exe", "esportal.exe", "gameguard.exe", "xigncode.exe", "nprotect.exe",
    // jeux et clients courants
    "javaw.exe", "java.exe", "minecraft.windows.exe", "valorant.exe", "valorant-win64-shipping.exe",
    "league of legends.exe", "leagueclient.exe", "leagueclientux.exe", "riotclientservices.exe", "cs2.exe",
    "csgo.exe", "fortniteclient-win64-shipping.exe", "r5apex.exe", "r5apex_dx12.exe", "overwatch.exe",
    "rainbowsix.exe", "rainbowsix_be.exe", "cod.exe", "modernwarfare.exe", "robloxplayerbeta.exe", "rocketleague.exe",
    "dota2.exe", "eldenring.exe", "gta5.exe", "gta5_enhanced.exe", "deadlock.exe", "marvel-win64-shipping.exe",
];

/// Taille d'une page mémoire sur Windows x64.
#[cfg_attr(not(windows), allow(dead_code))]
const PAGE: u64 = 4096;

/// Vide la liste standby, puis réduit les applis en arrière-plan si `trim`. `keep` : dossiers des jeux de la
/// bibliothèque, dont aucun processus n'est touché.
#[cfg(windows)]
pub fn clean(trim: bool, keep: &[PathBuf]) -> Result<Cleaned, String> {
    let mut out = Cleaned::default();
    if trim {
        let (bytes, apps) = win::trim_background(keep);
        out.trimmed = bytes;
        out.apps = apps;
    }
    // après la réduction : les pages rendues par les applis passent par la liste standby, vidée ici aussi
    out.standby = win::purge_standby()?;
    Ok(out)
}

#[cfg(not(windows))]
pub fn clean(_trim: bool, _keep: &[PathBuf]) -> Result<Cleaned, String> {
    Err("Windows only".into())
}

#[cfg(windows)]
mod win {
    use super::{PAGE, PROTECTED};
    use std::ffi::c_void;
    use std::path::{Path, PathBuf};
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, LUID, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Security::{
        AdjustTokenPrivileges, LookupPrivilegeValueW, LUID_AND_ATTRIBUTES, SE_PRIVILEGE_ENABLED, TOKEN_ADJUST_PRIVILEGES,
        TOKEN_PRIVILEGES, TOKEN_QUERY,
    };
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
    use windows_sys::Win32::System::ProcessStatus::{K32EmptyWorkingSet, K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
    use windows_sys::Win32::System::RemoteDesktop::ProcessIdToSessionId;
    use windows_sys::Win32::System::Threading::{
        GetCurrentProcess, GetCurrentProcessId, OpenProcess, OpenProcessToken, QueryFullProcessImageNameW,
        PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_QUOTA, PROCESS_VM_READ,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    /// SystemMemoryListInformation (classe 80 de NtQuery/NtSetSystemInformation).
    const MEMORY_LIST_CLASS: i32 = 80;
    /// SYSTEM_MEMORY_LIST_COMMAND : MemoryPurgeStandbyList.
    const PURGE_STANDBY: u32 = 4;

    /// SYSTEM_MEMORY_LIST_INFORMATION : compteurs de pages des listes de mémoire de Windows.
    #[repr(C)]
    #[derive(Default)]
    struct MemoryLists {
        zero: usize,
        free: usize,
        modified: usize,
        modified_no_write: usize,
        bad: usize,
        standby_by_priority: [usize; 8],
        repurposed_by_priority: [usize; 8],
        modified_page_file: usize,
    }

    type NtQuery = unsafe extern "system" fn(i32, *mut c_void, u32, *mut u32) -> i32;
    type NtSet = unsafe extern "system" fn(i32, *const c_void, u32) -> i32;

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    /// Fonction de ntdll.dll, chargée à l'exécution : NtSetSystemInformation n'est pas dans les liaisons de windows-sys.
    unsafe fn ntdll(name: &[u8]) -> Option<unsafe extern "system" fn() -> isize> {
        let module = GetModuleHandleW(wide("ntdll.dll").as_ptr());
        if module.is_null() {
            return None;
        }
        GetProcAddress(module, name.as_ptr())
    }

    /// Active un privilège du jeton de Rago Optimizer (administrateur : il le possède, désactivé par défaut).
    fn enable_privilege(name: &str) -> bool {
        unsafe {
            let mut token: HANDLE = std::ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &mut token) == 0 {
                return false;
            }
            let mut luid = LUID { LowPart: 0, HighPart: 0 };
            let ok = LookupPrivilegeValueW(std::ptr::null(), wide(name).as_ptr(), &mut luid) != 0 && {
                let tp = TOKEN_PRIVILEGES {
                    PrivilegeCount: 1,
                    Privileges: [LUID_AND_ATTRIBUTES { Luid: luid, Attributes: SE_PRIVILEGE_ENABLED }],
                };
                // AdjustTokenPrivileges réussit même sans le privilège : seul GetLastError le dirait (ERROR_NOT_ALL_ASSIGNED)
                AdjustTokenPrivileges(token, 0, &tp, 0, std::ptr::null_mut(), std::ptr::null_mut()) != 0
                    && windows_sys::Win32::Foundation::GetLastError() == 0
            };
            CloseHandle(token);
            ok
        }
    }

    fn standby_pages() -> Option<u64> {
        unsafe {
            let query: NtQuery = std::mem::transmute(ntdll(b"NtQuerySystemInformation\0")?);
            let mut lists = MemoryLists::default();
            let mut len = 0u32;
            let status = query(
                MEMORY_LIST_CLASS,
                &mut lists as *mut _ as *mut c_void,
                std::mem::size_of::<MemoryLists>() as u32,
                &mut len,
            );
            (status >= 0).then(|| lists.standby_by_priority.iter().map(|&n| n as u64).sum())
        }
    }

    /// Vide la liste standby ; renvoie le cache vidé, en octets.
    pub fn purge_standby() -> Result<u64, String> {
        if !enable_privilege("SeProfileSingleProcessPrivilege") {
            return Err("privilege".into());
        }
        let before = standby_pages();
        let status = unsafe {
            let set: NtSet = std::mem::transmute(ntdll(b"NtSetSystemInformation\0").ok_or("ntdll")?);
            set(MEMORY_LIST_CLASS, &PURGE_STANDBY as *const u32 as *const c_void, std::mem::size_of::<u32>() as u32)
        };
        if status < 0 {
            return Err(format!("NTSTATUS 0x{:08X}", status as u32));
        }
        let after = standby_pages();
        Ok(match (before, after) {
            (Some(b), Some(a)) => b.saturating_sub(a) * PAGE,
            _ => 0,
        })
    }

    fn image_path(process: HANDLE) -> Option<PathBuf> {
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        unsafe {
            if QueryFullProcessImageNameW(process, 0, buf.as_mut_ptr(), &mut len) == 0 {
                return None;
            }
        }
        Some(PathBuf::from(String::from_utf16_lossy(&buf[..len as usize])))
    }

    fn working_set(process: HANDLE) -> u64 {
        let mut c: PROCESS_MEMORY_COUNTERS = unsafe { std::mem::zeroed() };
        c.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
        unsafe {
            if K32GetProcessMemoryInfo(process, &mut c, c.cb) == 0 {
                return 0;
            }
        }
        c.WorkingSetSize as u64
    }

    fn under(path: &Path, dirs: &[PathBuf]) -> bool {
        let p = path.to_string_lossy().to_lowercase();
        dirs.iter().any(|d| {
            let d = d.to_string_lossy().to_lowercase();
            !d.is_empty() && p.starts_with(d.trim_end_matches('\\'))
        })
    }

    /// Réduit la mémoire des applis en arrière-plan de la session du joueur ; renvoie (octets rendus, applis).
    pub fn trim_background(keep: &[PathBuf]) -> (u64, u32) {
        let me = unsafe { GetCurrentProcessId() };
        let mut session = 0u32;
        if unsafe { ProcessIdToSessionId(me, &mut session) } == 0 {
            return (0, 0);
        }
        let mut foreground = 0u32;
        unsafe { GetWindowThreadProcessId(GetForegroundWindow(), &mut foreground) };
        let windows_dir = std::env::var_os("SystemRoot").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\Windows"));
        let system = [windows_dir];

        let snap = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
        if snap == INVALID_HANDLE_VALUE {
            return (0, 0);
        }
        let (mut bytes, mut apps) = (0u64, 0u32);
        let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        let mut more = unsafe { Process32FirstW(snap, &mut entry) } != 0;
        while more {
            let pid = entry.th32ProcessID;
            let end = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
            let name = String::from_utf16_lossy(&entry.szExeFile[..end]).to_lowercase();
            let mut s = u32::MAX;
            let skip = pid <= 4
                || pid == me
                || pid == foreground
                || PROTECTED.contains(&name.as_str())
                || unsafe { ProcessIdToSessionId(pid, &mut s) } == 0
                || s != session;
            if !skip {
                // lecture du chemin d'abord, avec le droit le plus faible : un jeu ou un fichier de Windows n'est
                // jamais ouvert avec le droit de réduire sa mémoire
                let path = unsafe {
                    let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
                    let p = if h.is_null() { None } else { image_path(h) };
                    if !h.is_null() {
                        CloseHandle(h);
                    }
                    p
                };
                if let Some(path) = path.filter(|p| !under(p, keep) && !under(p, &system)) {
                    unsafe {
                        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SET_QUOTA | PROCESS_VM_READ, 0, pid);
                        if !h.is_null() {
                            // même processus qu'au premier coup d'œil (un pid peut être réutilisé entre-temps)
                            if image_path(h).as_deref() == Some(path.as_path()) {
                                let before = working_set(h);
                                if K32EmptyWorkingSet(h) != 0 {
                                    bytes += before.saturating_sub(working_set(h));
                                    apps += 1;
                                }
                            }
                            CloseHandle(h);
                        }
                    }
                }
            }
            more = unsafe { Process32NextW(snap, &mut entry) } != 0;
        }
        unsafe { CloseHandle(snap) };
        (bytes, apps)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protected_names_are_lowercase() {
        assert!(PROTECTED.iter().all(|n| n.to_lowercase() == *n));
        assert!(PROTECTED.contains(&"javaw.exe") && PROTECTED.contains(&"vgc.exe"));
    }
}
