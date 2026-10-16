//! Ce que l'app sait du PC : Windows, processeur, RAM, cartes graphiques, carte réseau.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::shell;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Gpu {
    pub name: String,
    /// "nvidia", "amd", "intel" ou "other"
    pub vendor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os_name: String,
    pub os_build: u32,
    pub is_win11: bool,
    pub hostname: String,
    pub cpu_name: String,
    /// "intel", "amd" ou "other"
    pub cpu_vendor: String,
    pub cpu_cores: usize,
    pub cpu_threads: usize,
    pub ram_gb: u32,
    /// Palier de RAM du .bat le plus proche (4, 8, 12, 16, 24, 32, 48, 64, 128)
    pub ram_tier: u32,
    pub gpus: Vec<Gpu>,
    pub adapter: Option<String>,
    pub adapter_desc: Option<String>,
    pub link_speed: Option<String>,
    pub is_admin: bool,
    pub has_wmic: bool,
    pub minecraft_dir: Option<String>,
    /// Fichiers optionnels présents dans le dossier resources (profil NVIDIA, plan, smartctl)
    pub resources: Vec<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PsProbe {
    #[serde(default)]
    gpus: Option<serde_json::Value>,
    adapter: Option<String>,
    adapter_desc: Option<String>,
    link_speed: Option<String>,
}

const PROBE: &str = r#"$g = @(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object { $_.Name });
$a = Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up' | Sort-Object ifIndex | Select-Object -First 1;
[pscustomobject]@{ gpus = $g; adapter = $a.Name; adapterDesc = $a.InterfaceDescription; linkSpeed = $a.LinkSpeed } | ConvertTo-Json -Compress"#;

pub const RAM_TIERS: [u32; 9] = [4, 8, 12, 16, 24, 32, 48, 64, 128];

pub fn vendor_of(name: &str) -> String {
    let n = name.to_lowercase();
    if n.contains("nvidia") || n.contains("geforce") || n.contains("rtx") || n.contains("gtx") {
        "nvidia".into()
    } else if n.contains("amd") || n.contains("radeon") || n.contains("ryzen") || n.contains("ati ") {
        "amd".into()
    } else if n.contains("intel") {
        "intel".into()
    } else {
        "other".into()
    }
}

fn ram_tier(gb: u32) -> u32 {
    // Windows réserve un peu de mémoire : 15,8 Go visibles doivent tomber sur 16.
    *RAM_TIERS
        .iter()
        .min_by_key(|t| (**t as i64 - gb as i64).abs())
        .unwrap_or(&16)
}

pub fn probe(resource_dir: &Path) -> SystemInfo {
    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_memory();
    sys.refresh_cpu_all();

    let cpu_name = sys.cpus().first().map(|c| c.brand().trim().to_string()).unwrap_or_default();
    let ram_bytes = sys.total_memory();
    let ram_gb = ((ram_bytes as f64) / 1024f64.powi(3)).round() as u32;
    let os_build: u32 = System::kernel_version()
        .unwrap_or_default()
        .chars()
        .filter(|c| c.is_ascii_digit())
        .collect::<String>()
        .parse()
        .unwrap_or(0);
    let is_win11 = os_build >= 22000;

    let probe: PsProbe = shell::powershell(PROBE)
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let gpu_names: Vec<String> = match probe.gpus {
        Some(serde_json::Value::Array(a)) => a.into_iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        Some(serde_json::Value::String(s)) => vec![s],
        _ => vec![],
    };
    let gpus = gpu_names
        .into_iter()
        .filter(|n| !n.to_lowercase().contains("basic display"))
        .map(|name| Gpu { vendor: vendor_of(&name), name })
        .collect();

    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
    let has_wmic = Path::new(&system_root).join("System32\\wbem\\WMIC.exe").exists();

    let minecraft_dir = std::env::var("APPDATA")
        .ok()
        .map(|a| PathBuf::from(a).join(".minecraft"))
        .filter(|p| p.exists())
        .map(|p| p.to_string_lossy().to_string());

    // plan d'alimentation et profil NVIDIA : chiffrés dans l'exe (assets.rs), toujours là
    let resources = ["nvidiaProfileInspector.exe", "smartctl.exe"]
        .iter()
        .filter(|f| resource_dir.join(f).exists())
        .map(|f| f.to_string())
        .chain(crate::assets::NAMES.iter().map(|f| f.to_string()))
        .collect();

    SystemInfo {
        os_name: System::long_os_version().unwrap_or_else(|| "Windows".into()),
        os_build,
        is_win11,
        hostname: System::host_name().unwrap_or_default(),
        cpu_vendor: vendor_of(&cpu_name),
        cpu_name,
        cpu_cores: System::physical_core_count().unwrap_or(0),
        cpu_threads: sys.cpus().len(),
        ram_gb,
        ram_tier: ram_tier(ram_gb),
        gpus,
        adapter: probe.adapter.filter(|s| !s.is_empty()),
        adapter_desc: probe.adapter_desc,
        link_speed: probe.link_speed,
        is_admin: shell::is_elevated(),
        has_wmic,
        minecraft_dir,
        resources,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ram_tiers_round_to_nearest() {
        assert_eq!(ram_tier(16), 16);
        assert_eq!(ram_tier(15), 16);
        assert_eq!(ram_tier(7), 8);
        assert_eq!(ram_tier(31), 32);
        assert_eq!(ram_tier(100), 128);
    }

    #[test]
    fn vendors() {
        assert_eq!(vendor_of("NVIDIA GeForce RTX 4070"), "nvidia");
        assert_eq!(vendor_of("AMD Radeon RX 7800 XT"), "amd");
        assert_eq!(vendor_of("Intel(R) UHD Graphics 770"), "intel");
        assert_eq!(vendor_of("AMD Ryzen 7 7800X3D 8-Core Processor"), "amd");
        assert_eq!(vendor_of("13th Gen Intel(R) Core(TM) i7-13700K"), "intel");
    }
}
