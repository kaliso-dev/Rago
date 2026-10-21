//! Vérifications avant l'activation : version et édition de Windows, activation, place sur le disque, redémarrage en
//! attente, droits administrateur, batterie. `Block` empêche l'activation, `Warn` est montré au joueur, qui décide.

use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Level {
    Ok,
    Warn,
    Block,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    pub id: &'static str,
    pub level: Level,
    /// détail pour l'interface (numéro de build, édition, Go libres…), traduit par elle
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// Ce que les vérifications lisent sur Windows (`read`), séparé de leurs règles (`checks`) pour les tests.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Facts {
    pub build: u32,
    pub edition: String,
    pub display: String,
    /// None : statut d'activation illisible
    pub activated: Option<bool>,
    pub free_gb: Option<f64>,
    pub reboot_pending: bool,
    pub admin: bool,
    pub on_battery: bool,
    pub busy: bool,
}

pub const WIN11: u32 = 22000;
/// Windows 10 22H2 : Rago OS y marche, sans les réglages et effets propres à Windows 11
pub const WIN10_MIN: u32 = 19045;

pub fn checks(f: &Facts, powerplan: bool) -> Vec<Check> {
    let mut out = Vec::new();
    let mut push = |id, level, detail: Option<String>| out.push(Check { id, level, detail });
    push(
        "windows",
        if f.build >= WIN11 {
            Level::Ok
        } else if f.build >= WIN10_MIN {
            Level::Warn
        } else {
            Level::Block
        },
        Some(format!("{} ({})", f.display, f.build)),
    );
    // Server, et éditions où les stratégies de groupe de l'entreprise reprendraient la main
    let edition = f.edition.to_lowercase();
    push(
        "edition",
        if edition.contains("server") {
            Level::Block
        } else if edition.contains("enterprise") || edition.contains("education") {
            Level::Warn
        } else {
            Level::Ok
        },
        Some(f.edition.clone()),
    );
    push("activation", if f.activated == Some(false) { Level::Warn } else { Level::Ok }, None);
    push(
        "disk",
        match f.free_gb {
            Some(g) if g < 0.5 => Level::Block,
            Some(g) if g < 2.0 => Level::Warn,
            _ => Level::Ok,
        },
        f.free_gb.map(|g| format!("{g:.1}")),
    );
    push("reboot", if f.reboot_pending { Level::Warn } else { Level::Ok }, None);
    push("admin", if f.admin { Level::Ok } else { Level::Block }, None);
    if powerplan {
        push("battery", if f.on_battery { Level::Warn } else { Level::Ok }, None);
    }
    push("busy", if f.busy { Level::Block } else { Level::Ok }, None);
    out
}

pub fn blocked(checks: &[Check]) -> bool {
    checks.iter().any(|c| c.level == Level::Block)
}

#[cfg(windows)]
pub fn read(busy: bool) -> Facts {
    use crate::backup::{Probe, Saved, Sys};
    let sys = Sys::new(std::env::temp_dir());
    let reg = |key: &str, name: &str| sys.read(&Probe::Reg { key: key.into(), name: name.into() });
    let text = |s: Saved| match s {
        Saved::Value { kind: 1 | 2, data } => {
            let b = crate::backup::unhex(&data);
            let w: Vec<u16> = b.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).take_while(|&c| c != 0).collect();
            Some(String::from_utf16_lossy(&w))
        }
        _ => None,
    };
    const NT: &str = r"HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion";
    let build = text(reg(NT, "CurrentBuildNumber")).and_then(|b| b.trim().parse().ok()).unwrap_or(0);
    let edition = text(reg(NT, "EditionID")).unwrap_or_default();
    // ProductName dit encore « Windows 10 » sur Windows 11 : le nom vient de la build
    let display = format!(
        "{} {}",
        if build >= WIN11 { "Windows 11" } else { "Windows 10" },
        text(reg(NT, "DisplayVersion")).unwrap_or_default()
    )
    .trim()
    .to_string();
    let exists = |key: &str| matches!(sys.read(&Probe::RegKey { key: key.into() }), Saved::Key { existed: true });
    let reboot_pending = exists(r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending")
        || exists(r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired");
    Facts {
        build,
        edition,
        display,
        activated: activated(),
        free_gb: free_gb(),
        reboot_pending,
        admin: crate::shell::is_elevated(),
        on_battery: on_battery(),
        busy,
    }
}

#[cfg(not(windows))]
pub fn read(busy: bool) -> Facts {
    Facts { build: 26100, edition: "Professional".into(), display: "Windows 11 24H2".into(), activated: Some(true), free_gb: Some(120.0), admin: true, busy, ..Default::default() }
}

/// Licence de Windows (pas celle de Rago) : lue, jamais modifiée.
#[cfg(windows)]
fn activated() -> Option<bool> {
    // 55c92734… : application « Windows » du service de licences ; LicenseStatus 1 = sous licence
    let out = crate::shell::powershell(
        "(Get-CimInstance SoftwareLicensingProduct -Filter \"ApplicationID='55c92734-d682-4d71-983e-d6ec3f16059f' AND PartialProductKey IS NOT NULL\" | Where-Object LicenseStatus -eq 1 | Measure-Object).Count",
    )?;
    out.trim().parse::<u32>().ok().map(|n| n > 0)
}

#[cfg(windows)]
fn free_gb() -> Option<f64> {
    use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;
    let drive = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".into());
    let root: Vec<u16> = format!("{drive}\\").encode_utf16().chain(std::iter::once(0)).collect();
    let mut free = 0u64;
    let ok = unsafe { GetDiskFreeSpaceExW(root.as_ptr(), &mut free, std::ptr::null_mut(), std::ptr::null_mut()) };
    (ok != 0).then(|| free as f64 / 1_073_741_824.0)
}

#[cfg(windows)]
fn on_battery() -> bool {
    use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    let mut s: SYSTEM_POWER_STATUS = unsafe { std::mem::zeroed() };
    // ACLineStatus 0 : sur batterie ; 128 dans BatteryFlag : pas de batterie
    unsafe { GetSystemPowerStatus(&mut s) != 0 && s.ACLineStatus == 0 && s.BatteryFlag != 128 }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn good() -> Facts {
        Facts { build: 26100, edition: "Professional".into(), display: "Windows 11 24H2".into(), activated: Some(true), free_gb: Some(50.0), admin: true, ..Default::default() }
    }

    #[test]
    fn a_normal_windows_11_passes() {
        let c = checks(&good(), true);
        assert!(c.iter().all(|c| c.level == Level::Ok), "{c:?}");
        assert!(!blocked(&c));
    }

    #[test]
    fn windows_10_and_inactive_windows_warn_old_windows_and_server_block() {
        let level = |f: Facts, id: &str| checks(&f, false).into_iter().find(|c| c.id == id).unwrap().level;
        assert_eq!(level(Facts { build: 19045, ..good() }, "windows"), Level::Warn);
        assert_eq!(level(Facts { build: 18363, ..good() }, "windows"), Level::Block);
        assert_eq!(level(Facts { activated: Some(false), ..good() }, "activation"), Level::Warn);
        assert_eq!(level(Facts { activated: None, ..good() }, "activation"), Level::Ok);
        assert_eq!(level(Facts { edition: "ServerStandard".into(), ..good() }, "edition"), Level::Block);
        assert_eq!(level(Facts { free_gb: Some(0.2), ..good() }, "disk"), Level::Block);
        assert_eq!(level(Facts { free_gb: Some(1.5), ..good() }, "disk"), Level::Warn);
        assert_eq!(level(Facts { admin: false, ..good() }, "admin"), Level::Block);
        assert_eq!(level(Facts { busy: true, ..good() }, "busy"), Level::Block);
    }

    #[test]
    fn battery_only_matters_for_the_power_plan() {
        let f = Facts { on_battery: true, ..good() };
        assert!(checks(&f, false).iter().all(|c| c.id != "battery"));
        assert_eq!(checks(&f, true).iter().find(|c| c.id == "battery").unwrap().level, Level::Warn);
    }
}
