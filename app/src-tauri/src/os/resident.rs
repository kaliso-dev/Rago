//! Rago Shell (app/shell) : le seul programme de Rago OS qui reste ouvert. Il dessine l'animation de démarrage et la
//! Dynamic Island, sans droits d'administrateur, dans la session du joueur. Lancé à l'ouverture de session par une
//! tâche planifiée (plus tôt que la clé Run, qui attend que le bureau soit chargé), il lit ses options dans
//! %LOCALAPPDATA%\Rago OS\shell.json. L'app lui parle en le relançant avec un argument (`--reload`, `--preview`,
//! `--timer 300`…) : la deuxième copie passe la commande à celle qui tourne et quitte.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub const EXE: &str = "rago-shell.exe";
/// Nom de la tâche planifiée qui le lance à l'ouverture de session.
pub const TASK: &str = "Rago OS Shell";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub boot: bool,
    pub island: bool,
    /// surveiller l'Explorateur et couper TranslucentTB s'il redémarre en boucle
    pub ttb_guard: bool,
    pub lang: String,
}

pub fn dir() -> PathBuf {
    std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| std::env::temp_dir()).join("Rago OS")
}

pub fn exe(resource_dir: &Path) -> PathBuf {
    resource_dir.join(EXE)
}

pub fn installed(resource_dir: &Path) -> bool {
    exe(resource_dir).is_file()
}

pub fn write_config(c: &Config) -> Result<(), String> {
    let d = dir();
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    let tmp = d.join("shell.json.tmp");
    std::fs::write(&tmp, serde_json::to_vec_pretty(c).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, d.join("shell.json")).map_err(|e| e.to_string())
}

/// Ce que Rago Shell a noté pour l'app (TranslucentTB coupé après des redémarrages de l'Explorateur en boucle).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Report {
    pub ttb_stopped: Option<u64>,
}

pub fn report() -> Report {
    std::fs::read(dir().join("report.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}

pub fn clear_report() {
    let _ = std::fs::remove_file(dir().join("report.json"));
}

/// Lance Rago Shell (ou passe la commande à celui qui tourne), sans élévation.
pub fn send(resource_dir: &Path, args: &[&str]) -> Result<(), String> {
    let exe = exe(resource_dir);
    if !exe.is_file() {
        return Err("rago-shell.exe missing".into());
    }
    let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    crate::games::launch::unelevated(&exe, &args, resource_dir.parent())
}

/// Arrête Rago Shell (désactivation, désinstallation).
pub fn stop() {
    let _ = crate::shell::hidden("taskkill.exe").args(["/IM", EXE, "/F"]).output();
}

/// Tâche de l'ouverture de session : session du joueur, sans élévation, priorité normale le temps de l'animation (Rago
/// Shell se met ensuite de lui-même en priorité basse et en mode économie d'énergie).
pub fn task_xml(exe: &Path, user: &str) -> String {
    let esc = |s: &str| s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;");
    format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Rago OS : animation de démarrage et Dynamic Island (Rago Optimizer, section Rago OS).</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>{user}</UserId>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{user}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>5</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{exe}</Command>
      <Arguments>--logon</Arguments>
    </Exec>
  </Actions>
</Task>
"#,
        user = esc(user),
        exe = esc(&exe.to_string_lossy()),
    )
}

/// Crée ou retire la tâche de l'ouverture de session.
pub fn set_autostart(resource_dir: &Path, on: bool, temp_dir: &Path) -> Result<(), String> {
    if !on {
        let _ = crate::shell::hidden("schtasks.exe").args(["/Delete", "/TN", TASK, "/F"]).output();
        return Ok(());
    }
    let user = match (std::env::var("USERDOMAIN"), std::env::var("USERNAME")) {
        (Ok(d), Ok(u)) if !d.is_empty() => format!("{d}\\{u}"),
        (_, Ok(u)) => u,
        _ => return Err("user unknown".into()),
    };
    let xml: Vec<u8> = [0xFF, 0xFE].into_iter().chain(task_xml(&exe(resource_dir), &user).encode_utf16().flat_map(u16::to_le_bytes)).collect();
    std::fs::create_dir_all(temp_dir).map_err(|e| e.to_string())?;
    let file = temp_dir.join("rago-os-shell.xml");
    std::fs::write(&file, xml).map_err(|e| e.to_string())?;
    let out = crate::shell::hidden("schtasks.exe").args(["/Create", "/TN", TASK, "/XML"]).arg(&file).arg("/F").output();
    let _ = std::fs::remove_file(&file);
    let out = out.map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// Consommation mesurée de Rago Shell : processeur (part de tout le PC depuis la mesure précédente) et mémoire.
#[derive(Debug, Clone, Copy, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Usage {
    pub running: bool,
    pub cpu: Option<f64>,
    pub ram_mb: Option<f64>,
}

#[derive(Default)]
pub struct Meter {
    last: Mutex<Option<(u32, u64, std::time::Instant)>>,
}

impl Meter {
    pub fn sample(&self) -> Usage {
        #[cfg(windows)]
        {
            let Some((pid, cpu_100ns, ram)) = win::measure() else {
                *self.last.lock().unwrap() = None;
                return Usage::default();
            };
            let now = std::time::Instant::now();
            let mut last = self.last.lock().unwrap();
            let cpu = match *last {
                Some((p, before, t)) if p == pid && now > t => {
                    let cores = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1) as f64;
                    let wall = now.duration_since(t).as_secs_f64() * 1e7;
                    Some(((cpu_100ns.saturating_sub(before)) as f64 / wall / cores * 100.0).max(0.0))
                }
                _ => None,
            };
            *last = Some((pid, cpu_100ns, now));
            Usage { running: true, cpu, ram_mb: Some(ram as f64 / 1_048_576.0) }
        }
        #[cfg(not(windows))]
        {
            let _ = &self.last;
            Usage::default()
        }
    }
}

#[cfg(windows)]
mod win {
    use windows_sys::Win32::Foundation::{CloseHandle, FILETIME};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::ProcessStatus::{K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS_EX};
    use windows_sys::Win32::System::Threading::{GetProcessTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

    /// (pid, temps processeur total en 100 ns, mémoire privée en octets) de rago-shell.exe.
    pub fn measure() -> Option<(u32, u64, u64)> {
        let pid = find(super::EXE)?;
        unsafe {
            let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if h.is_null() {
                return None;
            }
            let z = FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 };
            let (mut c, mut e, mut k, mut u) = (z, z, z, z);
            let ft = |f: FILETIME| ((f.dwHighDateTime as u64) << 32) | f.dwLowDateTime as u64;
            let cpu = if GetProcessTimes(h, &mut c, &mut e, &mut k, &mut u) != 0 { ft(k) + ft(u) } else { 0 };
            let mut m: PROCESS_MEMORY_COUNTERS_EX = std::mem::zeroed();
            m.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS_EX>() as u32;
            let ram = if K32GetProcessMemoryInfo(h, &mut m as *mut _ as *mut _, m.cb) != 0 { m.PrivateUsage as u64 } else { 0 };
            CloseHandle(h);
            Some((pid, cpu, ram))
        }
    }

    fn find(name: &str) -> Option<u32> {
        unsafe {
            let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snap.is_null() || snap as isize == -1 {
                return None;
            }
            let mut entry: PROCESSENTRY32W = std::mem::zeroed();
            entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
            let mut more = Process32FirstW(snap, &mut entry) != 0;
            let mut found = None;
            while more {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
                if String::from_utf16_lossy(&entry.szExeFile[..len]).eq_ignore_ascii_case(name) {
                    found = Some(entry.th32ProcessID);
                    break;
                }
                more = Process32NextW(snap, &mut entry) != 0;
            }
            CloseHandle(snap);
            found
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn logon_task_runs_unelevated_without_time_limit() {
        let xml = task_xml(Path::new(r"C:\Program Files\Rago Optimizer\resources\rago-shell.exe"), r"PC\Tom & Co");
        assert!(xml.contains("<RunLevel>LeastPrivilege</RunLevel>"));
        assert!(xml.contains("<Arguments>--logon</Arguments>"));
        assert!(xml.contains("<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>"));
        assert!(xml.contains(r"<UserId>PC\Tom &amp; Co</UserId>"));
        assert!(!xml.contains("<Delay>"));
    }

    #[test]
    fn config_reads_missing_fields() {
        let c: Config = serde_json::from_str(r#"{"boot":true}"#).unwrap();
        assert!(c.boot && !c.island && c.lang.is_empty());
    }
}
