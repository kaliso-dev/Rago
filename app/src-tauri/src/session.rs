//! Pendant une partie (GAME V1) : ce que l'app fait le temps de jouer, et défait après. Chaque option se coupe dans les
//! paramètres (background.rs).
//! - Carte graphique performante : sur un PC à deux cartes, chaque exe de jeu vu en cours de partie reçoit le choix
//!   « Performances élevées » de Windows (Paramètres > Affichage > Graphiques), seulement s'il n'en a pas déjà un. Il
//!   sert dès le lancement suivant du jeu et reste ensuite ; couper l'option retire ceux que Rago a écrits.
//! - Mode Performances élevées le temps de jouer : seulement depuis Équilibré ou Économie d'énergie, sur secteur, sans
//!   stratégie d'entreprise, et jamais sur un Ryzen X3D à deux CCD (AMD y veut Équilibré, qui garde le jeu sur le cache
//!   3D). Le mode d'avant est noté sur le disque avant le changement, puis rendu à la fin de la partie, ou au lancement
//!   suivant de l'app si elle a été fermée entre-temps ; pas si le joueur a lui-même changé de mode pendant la partie.
//! - Jeu en priorité haute : chaque processus du jeu passe en priorité « Haute » (jamais « Temps réel ») et Windows
//!   ne le bride plus (EcoQoS) même quand la fenêtre n'est pas au premier plan. Seulement depuis la priorité normale
//!   (ou supérieure à la normale) : un choix du joueur n'est pas touché. Ça ne vit que le temps du processus, rien
//!   n'est écrit sur le disque ; couper l'option rend la priorité d'avant aux processus encore lancés.
//! - Vérifications : batterie, téléchargements, synchronisation et enregistrement en fond. Des conseils, rien n'est fermé.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::background::Prefs;

pub const BALANCED: &str = "381b4222-f694-41f0-9685-ff5bb260df2e";
pub const POWER_SAVER: &str = "a1841308-3541-4fab-bc81-f71556f20b4a";
pub const HIGH: &str = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";
#[cfg_attr(not(windows), allow(dead_code))]
const GPU_KEY: &str = r"HKCU\Software\Microsoft\DirectX\UserGpuPreferences";
#[cfg_attr(not(windows), allow(dead_code))]
const GPU_HIGH: &str = "GpuPreference=2;";

/// Ce qui doit survivre à une fermeture de l'app (session.json).
#[derive(Serialize, Deserialize, Default, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase", default)]
struct Saved {
    /// mode d'alimentation d'avant la partie, et celui que Rago a mis
    power: Option<(String, String)>,
    /// exes à qui Rago a donné la carte graphique performante
    gpu: Vec<String>,
}

#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    /// "battery", "download", "sync" ou "record"
    pub id: &'static str,
    /// applis concernées
    pub apps: Vec<String>,
}

#[derive(Serialize, Clone, PartialEq, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub playing: bool,
    /// mode Performances élevées mis pour la partie
    pub power: bool,
    /// processus du jeu passés en priorité haute par Rago pour la partie en cours
    pub priority: usize,
    /// jeux qui ont reçu la carte graphique performante (depuis toujours)
    pub gpu_games: usize,
    pub checks: Vec<Check>,
    /// PC à deux cartes graphiques : l'option carte performante sert (None tant que ce n'est pas vérifié)
    pub multi_gpu: Option<bool>,
    /// Ryzen X3D à deux CCD : le mode d'alimentation n'est jamais changé
    pub x3d: bool,
}

struct Inner {
    saved: Saved,
    state: State,
    /// mode d'alimentation déjà tenté pour cette partie
    tried: bool,
    /// exes déjà regardés pour la carte graphique
    seen: HashSet<String>,
    /// exes du jeu déjà passés par la priorité, tant qu'ils tournent
    prio_seen: HashSet<String>,
    /// processus mis en priorité haute par Rago : pid -> (chemin, priorité d'avant)
    raised: HashMap<u32, (String, u32)>,
}

pub struct Session {
    path: PathBuf,
    inner: Mutex<Inner>,
}

const DOWNLOAD: &[(&str, &str)] = &[
    ("qbittorrent.exe", "qBittorrent"),
    ("utorrent.exe", "µTorrent"),
    ("bittorrent.exe", "BitTorrent"),
    ("transmission-qt.exe", "Transmission"),
    ("deluge.exe", "Deluge"),
    ("tixati.exe", "Tixati"),
    ("idman.exe", "Internet Download Manager"),
];
const SYNC: &[(&str, &str)] = &[
    ("onedrive.exe", "OneDrive"),
    ("dropbox.exe", "Dropbox"),
    ("googledrivefs.exe", "Google Drive"),
    ("megasync.exe", "MEGA"),
    ("icloudservices.exe", "iCloud"),
];
const RECORD: &[(&str, &str)] = &[("obs64.exe", "OBS Studio"), ("obs32.exe", "OBS Studio"), ("streamlabs obs.exe", "Streamlabs")];

/// Dossiers où tournent le Java de Minecraft et ses clients (launcher officiel, Store, Lunar, Badlion, Feather…).
const MC_JAVA: &[&str] = &[
    "\\.minecraft\\",
    "\\minecraft launcher\\",
    "microsoft.4297127d64ec6",
    "\\.lunarclient\\",
    "badlion",
    "feather",
    "prismlauncher",
    "modrinth",
    "curseforge",
    "multimc",
    "tlauncher",
    "atlauncher",
    "gdlauncher",
];

/// Nom de l'exe en minuscules (chemin Windows, aussi lu tel quel dans les tests hors Windows).
fn file_of(p: &Path) -> String {
    p.to_string_lossy().rsplit(['\\', '/']).next().unwrap_or_default().to_lowercase()
}

/// L'exe de Minecraft lui-même : Bedrock, ou le Java d'un launcher Minecraft.
pub fn minecraft_exe(p: &Path) -> bool {
    let file = file_of(p);
    if file == "minecraft.windows.exe" {
        return true;
    }
    let path = p.to_string_lossy().to_lowercase();
    (file == "javaw.exe" || file == "java.exe") && MC_JAVA.iter().any(|m| path.contains(m))
}

/// Ryzen X3D à deux CCD, dont un seul a le cache 3D.
pub fn dual_ccd_x3d(cpu: &str) -> bool {
    let c = cpu.to_uppercase();
    ["7900X3D", "7950X3D", "9900X3D", "9950X3D", "7945HX3D"].iter().any(|m| c.contains(m))
}

/// Exes de jeu qui méritent la carte performante : pas les désinstalleurs, rapports de plantage ni installeurs.
pub fn wants_gpu(p: &Path) -> bool {
    let file = file_of(p);
    file.ends_with(".exe") && !["unins", "crash", "report", "setup", "redist", "vc_redist", "dxsetup"].iter().any(|w| file.contains(w))
}

/// Priorité : les exes du jeu pas encore vus (à passer en priorité haute), et ceux à retenir, c'est-à-dire ceux qui
/// tournent encore. Un exe fermé puis relancé est donc revu.
pub fn prio_fresh(seen: &HashSet<String>, exes: &[PathBuf]) -> (Vec<String>, HashSet<String>) {
    let now: HashSet<String> = exes.iter().filter(|p| wants_gpu(p)).map(|p| p.to_string_lossy().to_lowercase()).collect();
    let mut fresh: Vec<String> = now.difference(seen).cloned().collect();
    fresh.sort();
    (fresh, now)
}

/// Premier GUID de la sortie de `powercfg /getactivescheme` (le texte autour change avec la langue de Windows).
#[cfg_attr(not(windows), allow(dead_code))]
pub fn parse_scheme(out: &str) -> Option<String> {
    let b = out.as_bytes();
    (0..b.len().saturating_sub(35)).find_map(|i| {
        let s = out.get(i..i + 36)?;
        let ok = s.char_indices().all(|(j, c)| if [8, 13, 18, 23].contains(&j) { c == '-' } else { c.is_ascii_hexdigit() });
        ok.then(|| s.to_lowercase())
    })
}

/// Conseils d'après les processus lancés.
pub fn checks(procs: &[PathBuf], on_battery: bool) -> Vec<Check> {
    let names: HashSet<String> = procs.iter().map(|p| file_of(p)).collect();
    let found = |list: &[(&str, &str)]| {
        let mut apps: Vec<String> = list.iter().filter(|(exe, _)| names.contains(*exe)).map(|(_, name)| name.to_string()).collect();
        apps.dedup();
        apps
    };
    let mut out = Vec::new();
    if on_battery {
        out.push(Check { id: "battery", apps: Vec::new() });
    }
    for (id, list) in [("download", DOWNLOAD), ("sync", SYNC), ("record", RECORD)] {
        let apps = found(list);
        if !apps.is_empty() {
            out.push(Check { id, apps });
        }
    }
    out
}

impl Session {
    pub fn new(data_dir: &Path) -> Self {
        let path = data_dir.join("session.json");
        let saved: Saved = std::fs::read(&path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        let state = State { gpu_games: saved.gpu.len(), x3d: dual_ccd_x3d(&win::cpu_name()), ..State::default() };
        Session { path, inner: Mutex::new(Inner { saved, state, tried: false, seen: HashSet::new(), prio_seen: HashSet::new(), raised: HashMap::new() }) }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Inner> {
        self.inner.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn save(&self, saved: &Saved) {
        if *saved == Saved::default() {
            let _ = std::fs::remove_file(&self.path);
        } else if let Ok(json) = serde_json::to_vec_pretty(saved) {
            let _ = std::fs::write(&self.path, json);
        }
    }

    /// État pour l'interface ; vérifie une fois s'il y a deux cartes graphiques.
    pub fn state(&self) -> State {
        let mut g = self.lock();
        if g.state.multi_gpu.is_none() {
            g.state.multi_gpu = Some(win::gpu_count() >= 2);
        }
        g.state.clone()
    }

    /// Toutes les 4 secondes (lib.rs) : `playing` si un jeu tourne, `exes` ceux du jeu, `procs` tous les processus.
    /// Renvoie l'état quand il change.
    pub fn tick(&self, playing: bool, exes: &[PathBuf], procs: &[PathBuf], prefs: &Prefs) -> Option<State> {
        let mut g = self.lock();
        let before = g.state.clone();
        g.state.playing = playing;

        // mode d'alimentation : mis une fois par partie, rendu à la fin (ou au lancement de l'app, après une fermeture)
        let want = playing && prefs.game_power;
        if want && g.saved.power.is_none() && !g.tried {
            g.tried = true;
            self.power_on(&mut g);
        } else if !want && g.saved.power.is_some() {
            self.power_off(&mut g);
        }
        if !playing {
            g.tried = false;
        }

        // carte graphique : chaque nouvel exe de jeu, sur un PC à deux cartes
        if prefs.game_gpu && playing {
            let fresh: Vec<&PathBuf> = exes.iter().filter(|p| wants_gpu(p) && !g.seen.contains(&p.to_string_lossy().to_lowercase())).collect();
            if !fresh.is_empty() {
                if g.state.multi_gpu.is_none() {
                    g.state.multi_gpu = Some(win::gpu_count() >= 2);
                }
                for p in fresh {
                    g.seen.insert(p.to_string_lossy().to_lowercase());
                    let path = p.to_string_lossy().to_string();
                    if g.state.multi_gpu == Some(true) && win::gpu_pref(&path).is_none() && win::set_gpu_pref(&path) {
                        g.saved.gpu.push(path);
                        self.save(&g.saved);
                    }
                }
            }
        } else if !prefs.game_gpu && !g.saved.gpu.is_empty() {
            Self::gpu_off(&mut g.saved);
            g.seen.clear();
            self.save(&g.saved);
        }
        g.state.gpu_games = g.saved.gpu.len();

        // priorité haute : chaque processus du jeu, une fois par lancement ; rien à défaire quand il se ferme
        if prefs.game_priority && playing {
            let (fresh, now) = prio_fresh(&g.prio_seen, exes);
            if !fresh.is_empty() {
                for (pid, path, before) in win::raise(&fresh) {
                    g.raised.insert(pid, (path, before));
                }
            }
            g.prio_seen = now;
            let Inner { prio_seen, raised, .. } = &mut *g;
            raised.retain(|_, (path, _)| prio_seen.contains(path));
        } else {
            if !prefs.game_priority && !g.raised.is_empty() {
                win::restore(&g.raised);
            }
            g.raised.clear();
            g.prio_seen.clear();
        }
        g.state.priority = g.raised.len();

        g.state.checks = if playing && prefs.game_checks { checks(procs, win::on_battery()) } else { Vec::new() };
        (g.state != before).then(|| g.state.clone())
    }

    fn power_on(&self, g: &mut Inner) {
        if g.state.x3d || win::on_battery() || win::power_policy() {
            return;
        }
        let Some(current) = win::active_scheme() else { return };
        if current != BALANCED && current != POWER_SAVER {
            return; // le joueur a déjà choisi un autre mode (Performances élevées, Ultimate, plan Rago)
        }
        // noté avant de changer : l'app fermée pendant la partie, le lancement suivant rend le mode
        g.saved.power = Some((current, HIGH.into()));
        self.save(&g.saved);
        if win::set_scheme(HIGH) {
            g.state.power = true;
        } else {
            // mode absent (PC en veille moderne, qui n'a qu'Équilibré) : rien n'a changé
            g.saved.power = None;
            self.save(&g.saved);
        }
    }

    fn power_off(&self, g: &mut Inner) {
        if let Some((previous, set)) = g.saved.power.take() {
            if win::active_scheme().as_deref() == Some(set.as_str()) {
                win::set_scheme(&previous);
            }
            self.save(&g.saved);
        }
        g.state.power = false;
    }

    /// Retire les choix de carte graphique écrits par Rago, s'ils n'ont pas changé depuis.
    fn gpu_off(saved: &mut Saved) {
        for path in std::mem::take(&mut saved.gpu) {
            if win::gpu_pref(&path).as_deref() == Some(GPU_HIGH) {
                win::delete_gpu_pref(&path);
            }
        }
    }
}

/// Désinstallation (reset.rs) : le mode d'alimentation rendu, les choix de carte graphique retirés.
pub fn undo_all(data_dir: &Path) {
    let s = Session::new(data_dir);
    let mut g = s.lock();
    if g.saved.power.is_some() {
        s.power_off(&mut g);
    }
    Session::gpu_off(&mut g.saved);
    s.save(&g.saved);
}

#[cfg(windows)]
mod win {
    use super::{parse_scheme, GPU_HIGH, GPU_KEY};
    use crate::{reg, shell};

    pub fn cpu_name() -> String {
        reg::string(r"HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0", "ProcessorNameString").unwrap_or_default()
    }

    /// Cartes graphiques réelles : NVIDIA, AMD ou Intel (pas l'affichage de base ni les écrans virtuels).
    pub fn gpu_count() -> usize {
        shell::powershell("Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }")
            .unwrap_or_default()
            .lines()
            .filter(|n| matches!(crate::system::vendor_of(n).as_str(), "nvidia" | "amd" | "intel"))
            .count()
    }

    pub fn on_battery() -> bool {
        use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
        let mut s: SYSTEM_POWER_STATUS = unsafe { std::mem::zeroed() };
        unsafe { GetSystemPowerStatus(&mut s) != 0 && s.ACLineStatus == 0 }
    }

    /// Mode d'alimentation imposé par une stratégie (PC d'entreprise ou d'école).
    pub fn power_policy() -> bool {
        reg::string(r"HKLM\SOFTWARE\Policies\Microsoft\Power\PowerSettings", "ActivePowerScheme").is_some()
    }

    pub fn active_scheme() -> Option<String> {
        let out = shell::hidden("powercfg.exe").arg("/getactivescheme").output().ok()?;
        parse_scheme(&String::from_utf8_lossy(&out.stdout))
    }

    pub fn set_scheme(guid: &str) -> bool {
        let ok = shell::hidden("powercfg.exe").args(["/setactive", guid]).status().is_ok_and(|s| s.success());
        ok && active_scheme().as_deref() == Some(guid)
    }

    pub fn gpu_pref(path: &str) -> Option<String> {
        reg::string(GPU_KEY, path)
    }

    pub fn set_gpu_pref(path: &str) -> bool {
        reg::set_string(GPU_KEY, path, GPU_HIGH)
    }

    pub fn delete_gpu_pref(path: &str) -> bool {
        reg::delete_value(GPU_KEY, path)
    }

    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Threading::{
        GetPriorityClass, OpenProcess, ProcessPowerThrottling, QueryFullProcessImageNameW, SetPriorityClass, SetProcessInformation,
        ABOVE_NORMAL_PRIORITY_CLASS, HIGH_PRIORITY_CLASS, NORMAL_PRIORITY_CLASS, PROCESS_POWER_THROTTLING_CURRENT_VERSION,
        PROCESS_POWER_THROTTLING_EXECUTION_SPEED, PROCESS_POWER_THROTTLING_STATE, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_INFORMATION,
    };

    /// Ouvre un processus pour changer sa priorité ; renvoie aussi son chemin en minuscules.
    unsafe fn open(pid: u32) -> Option<(HANDLE, String)> {
        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SET_INFORMATION, 0, pid);
        if h.is_null() {
            return None; // processus protégé (anti-triche) ou d'un autre compte : laissé tel quel
        }
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        if QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut len) == 0 {
            CloseHandle(h);
            return None;
        }
        Some((h, String::from_utf16_lossy(&buf[..len as usize]).to_lowercase()))
    }

    /// EcoQoS : `throttle` false = jamais bridé ; true = Windows décide (son réglage par défaut).
    unsafe fn throttling(h: HANDLE, throttle: bool) {
        let state = PROCESS_POWER_THROTTLING_STATE {
            Version: PROCESS_POWER_THROTTLING_CURRENT_VERSION,
            ControlMask: if throttle { 0 } else { PROCESS_POWER_THROTTLING_EXECUTION_SPEED },
            StateMask: 0,
        };
        SetProcessInformation(h, ProcessPowerThrottling, &state as *const _ as *const _, std::mem::size_of::<PROCESS_POWER_THROTTLING_STATE>() as u32);
    }

    /// Pid de chaque processus lancé.
    fn pids() -> Vec<u32> {
        use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS};
        let mut out = Vec::new();
        unsafe {
            let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snap == INVALID_HANDLE_VALUE {
                return out;
            }
            let mut e: PROCESSENTRY32W = std::mem::zeroed();
            e.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
            let mut more = Process32FirstW(snap, &mut e) != 0;
            while more {
                if e.th32ProcessID > 4 {
                    out.push(e.th32ProcessID);
                }
                more = Process32NextW(snap, &mut e) != 0;
            }
            CloseHandle(snap);
        }
        out
    }

    /// Passe en priorité haute les processus de ces exes (chemins en minuscules), s'ils sont en priorité normale ou
    /// supérieure à la normale. Renvoie ceux changés : (pid, chemin, priorité d'avant).
    pub fn raise(paths: &[String]) -> Vec<(u32, String, u32)> {
        let mut out = Vec::new();
        for pid in pids() {
            unsafe {
                let Some((h, path)) = open(pid) else { continue };
                if paths.contains(&path) {
                    let before = GetPriorityClass(h);
                    if (before == NORMAL_PRIORITY_CLASS || before == ABOVE_NORMAL_PRIORITY_CLASS) && SetPriorityClass(h, HIGH_PRIORITY_CLASS) != 0 {
                        throttling(h, false);
                        out.push((pid, path, before));
                    }
                }
                CloseHandle(h);
            }
        }
        out
    }

    /// Rend la priorité d'avant aux processus encore lancés, s'ils sont toujours en priorité haute.
    pub fn restore(raised: &std::collections::HashMap<u32, (String, u32)>) {
        for (&pid, (path, before)) in raised {
            unsafe {
                let Some((h, now)) = open(pid) else { continue };
                if &now == path && GetPriorityClass(h) == HIGH_PRIORITY_CLASS {
                    SetPriorityClass(h, *before);
                    throttling(h, true);
                }
                CloseHandle(h);
            }
        }
    }
}

#[cfg(not(windows))]
mod win {
    pub fn cpu_name() -> String {
        String::new()
    }
    pub fn gpu_count() -> usize {
        0
    }
    pub fn on_battery() -> bool {
        false
    }
    pub fn power_policy() -> bool {
        false
    }
    pub fn active_scheme() -> Option<String> {
        None
    }
    pub fn set_scheme(_guid: &str) -> bool {
        false
    }
    pub fn gpu_pref(_path: &str) -> Option<String> {
        None
    }
    pub fn set_gpu_pref(_path: &str) -> bool {
        false
    }
    pub fn delete_gpu_pref(_path: &str) -> bool {
        true
    }
    pub fn raise(_paths: &[String]) -> Vec<(u32, String, u32)> {
        Vec::new()
    }
    pub fn restore(_raised: &std::collections::HashMap<u32, (String, u32)>) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_active_scheme_in_any_language() {
        let fr = "GUID du mode de gestion de l'alimentation : 381B4222-F694-41F0-9685-FF5BB260DF2E  (Utilisation normale)";
        assert_eq!(parse_scheme(fr).as_deref(), Some(BALANCED));
        let en = "Power Scheme GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  (High performance)";
        assert_eq!(parse_scheme(en).as_deref(), Some(HIGH));
        assert_eq!(parse_scheme("Accès refusé."), None);
    }

    #[test]
    fn recognizes_minecraft_and_skips_helpers() {
        assert!(minecraft_exe(Path::new(r"C:\Users\a\.lunarclient\jre\zulu17\bin\javaw.exe")));
        assert!(minecraft_exe(Path::new(r"C:\Program Files (x86)\Minecraft Launcher\runtime\java-runtime-gamma\windows-x64\java-runtime-gamma\bin\javaw.exe")));
        assert!(minecraft_exe(Path::new(r"C:\XboxGames\Minecraft for Windows\Content\Minecraft.Windows.exe")));
        // un autre programme Java n'est pas Minecraft
        assert!(!minecraft_exe(Path::new(r"C:\Program Files\Java\jdk-21\bin\javaw.exe")));
        assert!(wants_gpu(Path::new(r"D:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\game\bin\win64\cs2.exe")));
        assert!(!wants_gpu(Path::new(r"D:\Games\Fortnite\unins000.exe")));
        assert!(!wants_gpu(Path::new(r"D:\Games\Fortnite\CrashReportClient.exe")));
    }

    #[test]
    fn raises_each_game_exe_once_per_launch() {
        let cs2 = PathBuf::from(r"D:\Steam\steamapps\common\Counter-Strike Global Offensive\game\bin\win64\cs2.exe");
        let crash = PathBuf::from(r"D:\Games\Fortnite\CrashReportClient.exe");
        let (fresh, seen) = prio_fresh(&HashSet::new(), &[cs2.clone(), crash]);
        assert_eq!(fresh, [cs2.to_string_lossy().to_lowercase()]);
        // toujours lancé : pas revu
        let (fresh, seen) = prio_fresh(&seen, &[cs2.clone()]);
        assert!(fresh.is_empty());
        // fermé puis relancé : revu
        let (_, seen) = prio_fresh(&seen, &[]);
        assert_eq!(prio_fresh(&seen, &[cs2]).0.len(), 1);
    }

    #[test]
    fn spots_dual_ccd_x3d_only() {
        assert!(dual_ccd_x3d("AMD Ryzen 9 7950X3D 16-Core Processor"));
        assert!(dual_ccd_x3d("AMD Ryzen 9 9900X3D 12-Core Processor"));
        assert!(!dual_ccd_x3d("AMD Ryzen 7 7800X3D 8-Core Processor"));
        assert!(!dual_ccd_x3d("13th Gen Intel(R) Core(TM) i7-13700K"));
    }

    #[test]
    fn lists_background_apps_to_check() {
        let procs = [PathBuf::from(r"C:\Program Files\qBittorrent\qbittorrent.exe"), PathBuf::from(r"C:\Program Files\obs-studio\bin\64bit\obs64.exe")];
        let c = checks(&procs, true);
        assert_eq!(c.iter().map(|c| c.id).collect::<Vec<_>>(), ["battery", "download", "record"]);
        assert_eq!(c[1].apps, ["qBittorrent"]);
        assert!(checks(&[], false).is_empty());
    }

    #[test]
    fn keeps_nothing_on_disk_once_undone() {
        let dir = std::env::temp_dir().join(format!("rago-session-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let s = Session::new(&dir);
        let prefs = Prefs::default();
        // hors Windows, rien n'est changé : la partie commence et finit sans rien laisser
        assert!(s.tick(true, &[], &[], &prefs).is_some_and(|st| st.playing && !st.power));
        assert!(s.tick(false, &[], &[], &prefs).is_some_and(|st| !st.playing));
        assert!(!dir.join("session.json").exists());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
