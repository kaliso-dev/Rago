//! Conseils au lancement d'un jeu (session.rs) : rien n'est changé ni fermé, Rago signale seulement.
//! - Réglages en jeu conseillés pour le jeu lancé : la liste est dans `src/data/tips.json` (partagée avec
//!   l'interface, qui affiche les textes) ; ceux que le joueur a cochés « fait » sont gardés dans `tips-done.json`.
//! - Ce que le PC montre pendant la partie : écran sous sa fréquence la plus haute, Game DVR actif, applis qui
//!   prennent beaucoup de processeur, mémoire presque pleine.

use serde::Deserialize;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};

use crate::session::{file_of, Check};

#[derive(Deserialize)]
struct TipsFile {
    games: HashMap<String, GameTips>,
}

#[derive(Deserialize)]
struct GameTips {
    tips: Vec<Tip>,
}

#[derive(Deserialize)]
struct Tip {
    id: String,
}

/// Clé du jeu (variante de pri_game, comme games.rs) → identifiants de ses conseils.
static TIPS: LazyLock<HashMap<String, Vec<String>>> = LazyLock::new(|| {
    let file: TipsFile = serde_json::from_str(include_str!("../../src/data/tips.json")).expect("tips.json invalide");
    file.games.into_iter().map(|(k, g)| (k, g.tips.into_iter().map(|t| t.id).collect())).collect()
});

/// Le jeu des conseils qui tourne : la clé du premier exe connu (games.rs) qui a des conseils.
pub fn game_of(procs: &[PathBuf]) -> Option<&'static str> {
    procs.iter().filter_map(|p| crate::games::preset_key(&file_of(p))).find(|k| TIPS.contains_key(*k))
}

/// Conseils cochés « fait » par le joueur, gardés d'une partie à l'autre.
pub struct Done {
    path: PathBuf,
    ids: Mutex<BTreeSet<String>>,
}

impl Done {
    pub fn new(data_dir: &Path) -> Self {
        let path = data_dir.join("tips-done.json");
        let ids: BTreeSet<String> = std::fs::read(&path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        Done { path, ids: Mutex::new(ids) }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, BTreeSet<String>> {
        self.ids.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    pub fn list(&self) -> Vec<String> {
        self.lock().iter().cloned().collect()
    }

    /// Coche ou décoche un conseil ; un identifiant inconnu (conseil retiré depuis) est ignoré.
    pub fn set(&self, id: &str, done: bool) -> Vec<String> {
        let mut ids = self.lock();
        let known = TIPS.values().flatten().any(|t| t == id);
        let changed = if done && known { ids.insert(id.to_string()) } else { ids.remove(id) };
        if changed {
            if ids.is_empty() {
                let _ = std::fs::remove_file(&self.path);
            } else if let Ok(json) = serde_json::to_vec(&*ids) {
                let _ = std::fs::write(&self.path, json);
            }
        }
        ids.iter().cloned().collect()
    }

    /// Conseils du jeu pas encore cochés.
    pub fn left(&self, game: &str) -> usize {
        let ids = self.lock();
        TIPS.get(game).map_or(0, |list| list.iter().filter(|t| !ids.contains(*t)).count())
    }
}

/// Écran sous sa fréquence la plus haute (à la même définition) et Game DVR actif : relus de temps en temps pendant
/// la partie (le jeu peut changer la fréquence de l'écran en plein écran).
pub fn pc_checks() -> Vec<Check> {
    let mut out = Vec::new();
    if let (Some(cur), Some(max)) = crate::analysis::refresh() {
        if let Some(c) = refresh_check(cur, max) {
            out.push(c);
        }
    }
    if win::game_dvr() {
        out.push(Check { id: "gamedvr", apps: Vec::new() });
    }
    out
}

/// L'écran tourne au moins 5 Hz sous ce qu'il peut faire (59,94 contre 60 n'est pas un écart).
pub fn refresh_check(cur: u32, max: u32) -> Option<Check> {
    (max >= cur + 5).then(|| Check { id: "refresh", apps: vec![cur.to_string(), max.to_string()] })
}

/// Part du processeur (tous cœurs) à partir de laquelle une appli en fond est signalée, en %.
const CPU_HIGH: f32 = 10.0;
/// Mémoire occupée à partir de laquelle les applis qui en prennent le plus sont signalées, en % ; le signal s'éteint
/// sous RAM_OK.
const RAM_HIGH: f32 = 85.0;
const RAM_OK: f32 = 80.0;
/// Une appli signalée pour la mémoire en prend au moins autant (octets).
const RAM_APP: u64 = 500 * 1024 * 1024;
/// Tours de suite (4 s chacun) au-dessus du seuil avant de signaler, et en dessous avant de ne plus signaler.
const STRIKES_ON: u8 = 2;
const STRIKES_OFF: u8 = 3;

/// Jamais signalés : Windows et l'antivirus (memory.rs), les anti-cheat, les jeux connus, Rago lui-même et ce qu'il
/// lance (PresentMon pour les FPS, WebView2 pour ses fenêtres).
fn ignored(name: &str) -> bool {
    crate::memory::PROTECTED.contains(&name)
        || ["system idle process", "idle", "memory compression", "interrupts", "msedgewebview2.exe"].contains(&name)
        || name.starts_with("presentmon")
        || name.starts_with("rago")
}

/// Nom affiché d'une appli d'après son exe.
pub fn pretty(exe: &str) -> String {
    const NAMES: &[(&str, &str)] = &[
        ("chrome.exe", "Google Chrome"),
        ("msedge.exe", "Microsoft Edge"),
        ("firefox.exe", "Firefox"),
        ("opera.exe", "Opera"),
        ("brave.exe", "Brave"),
        ("discord.exe", "Discord"),
        ("spotify.exe", "Spotify"),
        ("steamwebhelper.exe", "Steam"),
        ("steam.exe", "Steam"),
        ("epicgameslauncher.exe", "Epic Games Launcher"),
        ("tiworker.exe", "Windows Update"),
        ("mousocoreworker.exe", "Windows Update"),
        ("searchindexer.exe", "Windows Search"),
    ];
    let low = exe.to_lowercase();
    if let Some((_, n)) = NAMES.iter().find(|(e, _)| *e == low) {
        return n.to_string();
    }
    let base = exe.strip_suffix(".exe").or_else(|| exe.strip_suffix(".EXE")).unwrap_or(exe);
    base.to_string()
}

/// Mesure d'un tour : par nom d'exe (minuscules), la part du processeur (tous cœurs, en %) et la mémoire (octets).
#[derive(Default, Clone, Debug, PartialEq)]
pub struct Sample {
    pub apps: HashMap<String, (f32, u64)>,
    /// mémoire occupée de tout le PC, en %
    pub ram: Option<f32>,
}

/// Nom d'exe (minuscules) d'une instance du compteur Windows `\Process(*)` : « chrome#3 » → « chrome.exe ». None pour
/// le total, l'inactivité, Windows, les anti-cheat, Rago et les exes du jeu (`skip`).
#[cfg_attr(not(windows), allow(dead_code))]
pub fn exe_of_instance(instance: &str, skip: &HashSet<String>) -> Option<String> {
    let base = instance.split('#').next().unwrap_or_default().trim().to_lowercase();
    if base.is_empty() || base == "_total" || ignored(&base) {
        return None;
    }
    let exe = format!("{base}.exe");
    (!ignored(&exe) && !skip.contains(&exe)).then_some(exe)
}

/// Applis gourmandes pendant la partie, avec une marge pour ne pas clignoter d'un tour à l'autre. Vit dans la boucle
/// des jeux (lib.rs) : les compteurs de Windows ne changent pas de fil.
#[derive(Default)]
pub struct Hogs {
    /// compteurs de Windows : processeur et mémoire privée de chaque processus, ouverts à la première partie
    #[cfg(windows)]
    pdh: Option<(Option<crate::stats::pdh::Counter>, Option<crate::stats::pdh::Counter>)>,
    /// mémoire du PC
    sys: Option<sysinfo::System>,
    /// par exe : tours de suite au-dessus du seuil, en dessous, et signalé ou non
    cpu: HashMap<String, (u8, u8, bool)>,
    ram: (u8, bool),
}

impl Hogs {
    /// Fin de partie : tout repart de zéro (et les compteurs sont fermés).
    pub fn reset(&mut self) {
        *self = Hogs::default();
    }

    /// Un tour (toutes les 4 s pendant une partie) ; les exes du jeu ne sont jamais signalés.
    pub fn tick(&mut self, game_exes: &[PathBuf]) -> Vec<Check> {
        let skip: HashSet<String> = game_exes.iter().map(|p| file_of(p)).collect();
        let sample = self.measure(&skip);
        self.judge(&sample)
    }

    /// Mesure par les compteurs de performance de Windows, comme le Gestionnaire des tâches : aucun processus n'est
    /// ouvert (pas même le jeu ou son anti-cheat).
    fn measure(&mut self, skip: &HashSet<String>) -> Sample {
        #[cfg_attr(not(windows), allow(unused_mut))]
        let mut apps: HashMap<String, (f32, u64)> = HashMap::new();
        #[cfg(windows)]
        {
            use crate::stats::pdh::Counter;
            let (cpu, mem) = self
                .pdh
                .get_or_insert_with(|| (Counter::open(r"\Process(*)\% Processor Time"), Counter::open(r"\Process(*)\Working Set - Private")));
            let cores = std::thread::available_parallelism().map_or(1, |n| n.get()) as f32;
            for (instance, v) in cpu.as_ref().and_then(|c| c.values_uncapped()).unwrap_or_default() {
                if let Some(exe) = exe_of_instance(&instance, skip) {
                    apps.entry(exe).or_default().0 += v.max(0.0) as f32 / cores;
                }
            }
            for (instance, v) in mem.as_ref().and_then(|c| c.values()).unwrap_or_default() {
                if let Some(exe) = exe_of_instance(&instance, skip) {
                    apps.entry(exe).or_default().1 += v.max(0.0) as u64;
                }
            }
        }
        #[cfg(not(windows))]
        let _ = skip;
        let sys = self.sys.get_or_insert_with(sysinfo::System::new);
        sys.refresh_memory();
        let total = sys.total_memory();
        let ram = (total > 0).then(|| total.saturating_sub(sys.available_memory()) as f32 / total as f32 * 100.0);
        Sample { apps, ram }
    }

    /// Ce qui est signalé d'après la mesure du tour (testé hors Windows).
    pub fn judge(&mut self, s: &Sample) -> Vec<Check> {
        // processeur : chaque appli au-dessus du seuil deux tours de suite, retirée après trois tours en dessous
        for (name, (cpu, _)) in &s.apps {
            let e = self.cpu.entry(name.clone()).or_insert((0, 0, false));
            if *cpu >= CPU_HIGH {
                *e = (e.0.saturating_add(1), 0, e.2 || e.0 + 1 >= STRIKES_ON);
            } else {
                *e = (0, e.1.saturating_add(1), e.2 && e.1 + 1 < STRIKES_OFF);
            }
        }
        self.cpu.retain(|name, e| s.apps.contains_key(name) && (e.0 > 0 || e.2));
        let mut hot: Vec<(&String, f32)> = self.cpu.iter().filter(|(_, e)| e.2).map(|(n, _)| (n, s.apps.get(n).map_or(0.0, |a| a.0))).collect();
        hot.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(b.0)));
        let cpu_apps: Vec<String> = dedup(hot.iter().take(2).map(|(n, _)| pretty(n)));

        // mémoire : presque pleine deux tours de suite ; les deux applis qui en prennent le plus
        match s.ram {
            Some(r) if r >= RAM_HIGH => self.ram = (self.ram.0.saturating_add(1), self.ram.1 || self.ram.0 + 1 >= STRIKES_ON),
            Some(r) if r < RAM_OK => self.ram = (0, false),
            _ => self.ram.0 = 0,
        }
        let ram_apps: Vec<String> = if self.ram.1 {
            let mut big: Vec<(&String, u64)> = s.apps.iter().filter(|(_, a)| a.1 >= RAM_APP).map(|(n, a)| (n, a.1)).collect();
            big.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(b.0)));
            dedup(big.iter().take(2).map(|(n, _)| pretty(n)))
        } else {
            Vec::new()
        };

        let mut out = Vec::new();
        if !cpu_apps.is_empty() {
            out.push(Check { id: "cpu", apps: cpu_apps });
        }
        if self.ram.1 {
            out.push(Check { id: "ram", apps: ram_apps });
        }
        out
    }
}

fn dedup(names: impl Iterator<Item = String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for n in names {
        if !out.contains(&n) {
            out.push(n);
        }
    }
    out
}

#[cfg(windows)]
mod win {
    use crate::reg;

    /// Game DVR (enregistrement en arrière-plan de la Xbox Game Bar) : absent vaut actif, comme l'analyse du PC
    /// (analysis.rs) ; l'un des deux réglages à 0 le coupe.
    pub fn game_dvr() -> bool {
        reg::dword(r"HKCU\System\GameConfigStore", "GameDVR_Enabled") != Some(0)
            && reg::dword(r"HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR", "AppCaptureEnabled") != Some(0)
    }
}

#[cfg(not(windows))]
mod win {
    pub fn game_dvr() -> bool {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_tip_belongs_to_a_known_game() {
        // chaque jeu de tips.json a un exe connu (games.rs), sinon ses conseils ne s'afficheraient jamais en partie
        for (game, ids) in TIPS.iter() {
            assert!(!ids.is_empty(), "{game} sans conseil");
            assert!(crate::games::preset_keys().contains(&game.as_str()), "{game} : aucun exe connu");
            assert!(ids.iter().all(|id| id.starts_with(&format!("{game}."))), "{game} : identifiant mal préfixé");
        }
        let all: Vec<&String> = TIPS.values().flatten().collect();
        let unique: HashSet<&&String> = all.iter().collect();
        assert_eq!(all.len(), unique.len(), "identifiant en double");
    }

    #[test]
    fn finds_the_game_from_its_exe() {
        let procs = [PathBuf::from(r"C:\Windows\explorer.exe"), PathBuf::from(r"C:\Riot Games\VALORANT\live\ShooterGame\Binaries\Win64\VALORANT-Win64-Shipping.exe")];
        assert_eq!(game_of(&procs), Some("valorant"));
        assert_eq!(game_of(&[PathBuf::from(r"D:\Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe")]), Some("fortnite"));
        // jeu connu mais sans conseils
        assert_eq!(game_of(&[PathBuf::from(r"C:\Roblox\RobloxPlayerBeta.exe")]), None);
        assert_eq!(game_of(&[]), None);
    }

    #[test]
    fn keeps_done_tips_and_counts_the_rest() {
        let dir = std::env::temp_dir().join(format!("rago-tips-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let d = Done::new(&dir);
        let total = TIPS["valorant"].len();
        assert_eq!(d.left("valorant"), total);
        assert_eq!(d.set("valorant.highlight", true), ["valorant.highlight"]);
        // inconnu : ignoré
        assert_eq!(d.set("valorant.nope", true), ["valorant.highlight"]);
        assert_eq!(d.left("valorant"), total - 1);
        // relu depuis le disque
        assert_eq!(Done::new(&dir).list(), ["valorant.highlight"]);
        assert!(d.set("valorant.highlight", false).is_empty());
        assert!(!dir.join("tips-done.json").exists());
        assert_eq!(d.left("unknown"), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn flags_the_screen_below_its_best_refresh_rate() {
        assert_eq!(refresh_check(60, 144).map(|c| c.apps), Some(vec!["60".to_string(), "144".to_string()]));
        assert!(refresh_check(144, 144).is_none());
        assert!(refresh_check(59, 60).is_none());
    }

    fn sample(apps: &[(&str, f32, u64)], ram: f32) -> Sample {
        Sample { apps: apps.iter().map(|(n, c, m)| (n.to_string(), (*c, *m))).collect(), ram: Some(ram) }
    }

    #[test]
    fn flags_busy_apps_only_after_two_rounds_and_keeps_them_steady() {
        let mut h = Hogs::default();
        let busy = sample(&[("chrome.exe", 14.0, 900 << 20), ("notepad.exe", 0.1, 20 << 20)], 60.0);
        assert!(h.judge(&busy).is_empty(), "un seul tour ne suffit pas");
        let c = h.judge(&busy);
        assert_eq!(c, vec![Check { id: "cpu", apps: vec!["Google Chrome".into()] }]);
        // repasse sous le seuil : toujours signalé pendant deux tours, retiré au troisième
        let calm = sample(&[("chrome.exe", 2.0, 900 << 20)], 60.0);
        assert_eq!(h.judge(&calm).len(), 1);
        assert_eq!(h.judge(&calm).len(), 1);
        assert!(h.judge(&calm).is_empty());
    }

    #[test]
    fn names_the_biggest_apps_when_memory_is_almost_full() {
        let mut h = Hogs::default();
        let full = sample(&[("chrome.exe", 1.0, 2 << 30), ("discord.exe", 1.0, 700 << 20), ("tiny.exe", 0.0, 50 << 20)], 91.0);
        assert!(h.judge(&full).is_empty());
        assert_eq!(h.judge(&full), vec![Check { id: "ram", apps: vec!["Google Chrome".into(), "Discord".into()] }]);
        // 82 % : toujours signalé (marge) ; 75 % : plus rien
        assert_eq!(h.judge(&sample(&[("chrome.exe", 1.0, 2 << 30)], 82.0)).len(), 1);
        assert!(h.judge(&sample(&[("chrome.exe", 1.0, 2 << 30)], 75.0)).is_empty());
    }

    #[test]
    fn reads_windows_counter_instances() {
        let skip: HashSet<String> = ["valorant-win64-shipping.exe".to_string()].into();
        assert_eq!(exe_of_instance("chrome#3", &skip).as_deref(), Some("chrome.exe"));
        assert_eq!(exe_of_instance("Discord", &skip).as_deref(), Some("discord.exe"));
        assert_eq!(exe_of_instance("Streamlabs OBS", &skip).as_deref(), Some("streamlabs obs.exe"));
        for skipped in ["_Total", "Idle", "System", "dwm", "vgc", "VALORANT-Win64-Shipping", "Rago Optimizer", "msedgewebview2#2", ""] {
            assert_eq!(exe_of_instance(skipped, &skip), None, "{skipped}");
        }
    }

    #[test]
    fn never_flags_windows_or_rago() {
        assert!(ignored("dwm.exe") && ignored("vgc.exe") && ignored("presentmon-2.3.0-x64.exe") && ignored("rago optimizer.exe"));
        assert!(!ignored("chrome.exe"));
        assert_eq!(pretty("Wallpaper64.exe"), "Wallpaper64");
        assert_eq!(pretty("MsEdge.exe"), "Microsoft Edge");
    }
}
