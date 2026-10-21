//! État de ce que lit le vérificateur de Ranked Bedwars (RBW-SS, Services.ps1, relevé le 2026-10-13 : voir
//! tools/rbw.py), affiché sous RBW Mod : chaque service doit tourner, aucun réglage ne doit valoir 0 et la stratégie
//! AppCompat ne doit pas exister. Lecture seule : le RBW Mod « Activé » est ce qui corrige.

use serde::Serialize;

/// Services lus par le vérificateur, dans son ordre (les CDPUserSvc_xxxx de chaque session suivent).
pub const SERVICES: &[&str] = &["SysMain", "PcaSvc", "DPS", "BAM", "EventLog", "WSearch", "DusmSvc", "BFE", "AppInfo", "DCOMLaunch", "PlugPlay"];

/// Réglages lus par le vérificateur : nom affiché par le vérificateur, clé, valeur. En rouge quand la valeur vaut 0.
pub const SETTINGS: &[(&str, &str, &str)] = &[
    ("CMD", "HKCU\\Software\\Policies\\Microsoft\\Windows\\System", "DisableCMD"),
    ("PowerShell Scriptblock Logging", "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging", "EnableScriptBlockLogging"),
    ("Activities Cache", "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", "EnableActivityFeed"),
    ("Prefetch", "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters", "EnablePrefetcher"),
    ("Jump Lists", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", "Start_TrackDocs"),
];
/// Sa présence coupe la journalisation PCA (« PCA Logging: Disabled »).
pub const APPCOMPAT: &str = "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat";

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    /// nom du service, ou du réglage tel que le vérificateur l'affiche
    pub name: String,
    /// "service" ou "setting"
    pub kind: &'static str,
    pub ok: bool,
    /// service : running, stopped, starting, stopping, paused, missing ; réglage : on, off
    pub state: &'static str,
    /// démarrage du service : auto, manual, disabled, boot, system
    pub start: Option<&'static str>,
}

/// Un réglage du vérificateur : en rouge seulement quand la valeur existe et vaut 0 (absente : Windows par défaut).
pub fn setting(name: &str, value: Option<u32>) -> Check {
    let ok = value != Some(0);
    Check { name: name.into(), kind: "setting", ok, state: if ok { "on" } else { "off" }, start: None }
}

pub fn status() -> Vec<Check> {
    let mut out: Vec<Check> = SERVICES.iter().map(|s| win::service(s)).collect();
    out.extend(win::cdp_user_services().iter().map(|s| win::service(s)));
    for (name, key, value) in SETTINGS {
        out.push(setting(name, win::dword(key, value)));
    }
    let pca = !win::exists(APPCOMPAT);
    out.push(Check { name: "PCA Logging".into(), kind: "setting", ok: pca, state: if pca { "on" } else { "off" }, start: None });
    out
}

#[cfg(windows)]
mod win {
    use super::Check;
    use windows_sys::Win32::System::Services::*;

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    struct Handle(SC_HANDLE);
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe { CloseServiceHandle(self.0) };
        }
    }

    fn start_type(svc: &Handle) -> Option<&'static str> {
        let mut need = 0u32;
        unsafe { QueryServiceConfigW(svc.0, std::ptr::null_mut(), 0, &mut need) };
        if need == 0 {
            return None;
        }
        // tampon aligné pour QUERY_SERVICE_CONFIGW
        let mut buf = vec![0u64; (need as usize).div_ceil(8)];
        let cfg = buf.as_mut_ptr().cast::<QUERY_SERVICE_CONFIGW>();
        if unsafe { QueryServiceConfigW(svc.0, cfg, (buf.len() * 8) as u32, &mut need) } == 0 {
            return None;
        }
        Some(match unsafe { (*cfg).dwStartType } {
            SERVICE_BOOT_START => "boot",
            SERVICE_SYSTEM_START => "system",
            SERVICE_AUTO_START => "auto",
            SERVICE_DEMAND_START => "manual",
            SERVICE_DISABLED => "disabled",
            _ => return None,
        })
    }

    pub fn service(name: &str) -> Check {
        let missing = Check { name: name.into(), kind: "service", ok: false, state: "missing", start: None };
        let scm = unsafe { OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_CONNECT) };
        if scm.is_null() {
            return missing;
        }
        let scm = Handle(scm);
        let svc = unsafe { OpenServiceW(scm.0, wide(name).as_ptr(), SERVICE_QUERY_STATUS | SERVICE_QUERY_CONFIG) };
        if svc.is_null() {
            return missing;
        }
        let svc = Handle(svc);
        let mut st: SERVICE_STATUS = unsafe { std::mem::zeroed() };
        if unsafe { QueryServiceStatus(svc.0, &mut st) } == 0 {
            return missing;
        }
        let state = match st.dwCurrentState {
            SERVICE_RUNNING => "running",
            SERVICE_START_PENDING => "starting",
            SERVICE_STOP_PENDING => "stopping",
            SERVICE_PAUSED | SERVICE_PAUSE_PENDING | SERVICE_CONTINUE_PENDING => "paused",
            _ => "stopped",
        };
        Check { name: name.into(), kind: "service", ok: state == "running", state, start: start_type(&svc) }
    }

    /// Instances de CDPUserSvc, une par session (CDPUserSvc_1a2b3c) ; le modèle CDPUserSvc lui-même ne tourne jamais.
    pub fn cdp_user_services() -> Vec<String> {
        let mut out: Vec<String> = crate::reg::subkeys("HKLM\\SYSTEM\\CurrentControlSet\\Services")
            .into_iter()
            .filter(|k| k.len() > "CDPUserSvc_".len() && k[.."CDPUserSvc_".len()].eq_ignore_ascii_case("CDPUserSvc_"))
            .collect();
        out.sort();
        out
    }

    pub fn dword(key: &str, value: &str) -> Option<u32> {
        crate::reg::dword(key, value)
    }

    pub fn exists(key: &str) -> bool {
        crate::reg::exists(key)
    }
}

#[cfg(not(windows))]
mod win {
    use super::Check;
    pub fn service(name: &str) -> Check {
        Check { name: name.into(), kind: "service", ok: false, state: "missing", start: None }
    }
    pub fn cdp_user_services() -> Vec<String> {
        Vec::new()
    }
    pub fn dword(_key: &str, _value: &str) -> Option<u32> {
        None
    }
    pub fn exists(_key: &str) -> bool {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_are_red_only_at_zero() {
        assert!(setting("Prefetch", None).ok);
        assert!(setting("Prefetch", Some(3)).ok);
        assert!(!setting("Prefetch", Some(0)).ok);
        assert_eq!(setting("Jump Lists", Some(0)).state, "off");
    }

    /// Même liste que le vérificateur et que le RBW Mod (tools/rbw.py).
    #[test]
    fn same_checks_as_the_checker() {
        let rbw = include_str!("../../tools/rbw.py");
        for s in SERVICES {
            assert!(rbw.contains(&format!("'{s}'")), "{s}");
        }
        for (name, _, value) in SETTINGS {
            assert!(rbw.contains(&format!("@('{name}'")) && rbw.contains(value), "{name}");
        }
        let all = status();
        assert_eq!(all.len(), SERVICES.len() + SETTINGS.len() + 1);
        assert!(all.iter().any(|c| c.name == "PCA Logging"));
    }
}
