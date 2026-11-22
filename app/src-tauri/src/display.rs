//! Couleurs et résolution par jeu (Sofiene, 11/11/2026 : « custom saturation » et « custom resolution », à la manière
//! de VibranceGUI). Chaque jeu de la bibliothèque peut avoir un profil :
//! - **Couleurs** : Digital Vibrance des cartes NVIDIA (NVAPI, niveaux 0 à 63 = 50 % à 100 % du panneau NVIDIA, comme
//!   VibranceGUI), saturation des cartes AMD (ADL, 100 à 200), et luminosité, contraste, gamma par la rampe gamma de
//!   Windows (toutes les cartes). Posées sur l'écran du jeu **seulement quand le jeu est au premier plan** ; un Alt+Tab
//!   ou la fin de la partie remettent les couleurs d'avant. Rien n'est lu ni écrit dans le jeu.
//! - **Résolution** : la résolution du bureau de l'écran principal est changée au lancement du jeu, en mode temporaire
//!   (`CDS_FULLSCREEN` : jamais écrit dans le registre, Windows le rend tout seul si l'app se ferme), étirée ou avec
//!   bandes noires ; elle est rendue à la fin de la partie. Pour Valorant, Fortnite et CS2, la même résolution est
//!   écrite dans leur fichier de réglages, jeu fermé, en ne touchant que les clés de résolution déjà présentes (les
//!   valeurs d'avant sont gardées dans display.json et remises quand le joueur retire la résolution).
//! Ce que l'app change dans les pilotes et le mode d'affichage est noté sur le disque **avant** le changement
//! (display-restore.json) : après un plantage, le lancement suivant remet tout comme avant ; la désinstallation aussi.
//! Réglage à la main gratuit ; import des réglages d'un pro (presets de data/pros.json) réservé au Premium (Sofiene,
//! 11/11) : lib.rs refuse un profil marqué `pro` sans licence active.
//! Fichiers : display.json (profils), display-restore.json (ce qu'il faut remettre), dans le dossier de données.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::{Duration, Instant};

/// Niveau de Windows : 50 % dans le panneau NVIDIA (niveau 0 du pilote), 100 sur AMD.
pub const VIBRANCE_WINDOWS: u8 = 50;
/// Clé du profil de Minecraft Java, quel que soit son launcher (tuile unique de la page Jeux).
pub const MINECRAFT: &str = "mc:java";
/// Lancé depuis Rago, le jeu a ce temps pour apparaître avant que la résolution soit rendue.
const LAUNCH_GRACE: Duration = Duration::from_secs(150);
/// Aperçu des couleurs depuis la page : rendu tout seul après ce temps, même si l'interface ne le demande pas.
const PREVIEW_MAX: Duration = Duration::from_secs(8);
/// Regard sur le jeu au premier plan, tant qu'un jeu à couleurs tourne.
const WATCH_EVERY: Duration = Duration::from_millis(250);

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase", default)]
pub struct Colors {
    /// Digital Vibrance façon panneau NVIDIA et VibranceGUI : 50 (Windows) à 100 %. AMD : saturation 100 à 200.
    pub vibrance: u8,
    /// -30 à 30, 0 = Windows (rampe gamma)
    pub brightness: i8,
    /// -30 à 30, 0 = Windows (rampe gamma)
    pub contrast: i8,
    /// gamma × 100, 70 à 150 ; 100 = Windows (rampe gamma)
    pub gamma: u8,
}

impl Default for Colors {
    fn default() -> Self {
        Colors { vibrance: VIBRANCE_WINDOWS, brightness: 0, contrast: 0, gamma: 100 }
    }
}

impl Colors {
    /// Bornes de l'interface : au-delà, Windows refuse souvent la rampe gamma.
    pub fn clamped(self) -> Self {
        Colors {
            vibrance: self.vibrance.clamp(VIBRANCE_WINDOWS, 100),
            brightness: self.brightness.clamp(-30, 30),
            contrast: self.contrast.clamp(-30, 30),
            gamma: self.gamma.clamp(70, 150),
        }
    }
    /// Luminosité, contraste ou gamma changés : la rampe gamma sert.
    pub fn needs_ramp(&self) -> bool {
        self.brightness != 0 || self.contrast != 0 || self.gamma != 100
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Resolution {
    pub width: u32,
    pub height: u32,
    /// étirée sur tout l'écran (sinon bandes noires)
    pub stretch: bool,
    /// aussi écrite dans le fichier de réglages du jeu (Valorant, Fortnite, CS2)
    pub game_file: bool,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Profile {
    pub colors: Option<Colors>,
    pub resolution: Option<Resolution>,
    /// preset de pro importé (id de data/pros.json), pour l'affichage ; Premium
    pub pro: Option<String>,
}

impl Profile {
    /// Un pro importé qui joue avec les couleurs de Windows et la résolution native garde son profil : la page montre
    /// qu'il est importé, et rien n'est posé.
    fn is_empty(&self) -> bool {
        self.colors.is_none() && self.resolution.is_none() && self.pro.is_none()
    }
}

/// display.json
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug, Default)]
#[serde(rename_all = "camelCase", default)]
struct Saved {
    /// id du jeu (bibliothèque, « mc:java » pour Minecraft Java) → profil
    profiles: BTreeMap<String, Profile>,
    /// fichier de réglages d'un jeu → valeurs d'avant Rago des clés de résolution qu'il y a écrites
    originals: BTreeMap<String, Vec<(String, String)>>,
}

/// Niveau de couleur d'un écran avant Rago.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
struct Level {
    /// écran (\\.\DISPLAY1)
    device: String,
    /// "nvidia" (niveau DVC du pilote) ou "amd" (saturation ADL)
    driver: String,
    value: i32,
}

/// display-restore.json : ce que Rago a changé et doit remettre, écrit avant chaque changement.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug, Default)]
#[serde(rename_all = "camelCase", default)]
struct Restore {
    levels: Vec<Level>,
    /// rampe gamma d'avant, par écran (3 × 256 valeurs)
    ramps: Vec<(String, Vec<u16>)>,
    /// écrans dont Rago a changé la résolution (rendus au mode du registre)
    modes: Vec<String>,
}

impl Restore {
    fn is_empty(&self) -> bool {
        self.levels.is_empty() && self.ramps.is_empty() && self.modes.is_empty()
    }
}

/// Pour l'interface (événement `display:state`).
#[derive(Serialize, Clone, PartialEq, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct State {
    /// jeu dont les couleurs sont posées en ce moment (« preview » pendant un aperçu)
    pub colors: Option<String>,
    /// jeu dont la résolution est posée
    pub resolution: Option<String>,
    /// dernier refus : "vibrance" (pilote), "ramp" (Windows refuse la rampe), "mode" (résolution refusée par l'écran),
    /// "file:read_only" / "file:missing" (fichier du jeu)
    pub error: Option<String>,
}

impl State {
    /// Note le résultat d'une opération : son erreur, ou efface la dernière erreur de la même famille quand elle a
    /// réussi (une erreur d'une autre famille reste affichée).
    fn outcome(&mut self, family: &str, err: Option<String>) {
        match err {
            Some(e) => self.error = Some(e),
            None if self.error.as_deref().is_some_and(|e| error_family(e) == family) => self.error = None,
            None => {}
        }
    }
}

/// Famille d'une erreur : "colors" (saturation, rampe), "mode" (résolution de l'écran), "file" (fichier du jeu).
fn error_family(e: &str) -> &str {
    match e {
        "vibrance" | "ramp" => "colors",
        "mode" => "mode",
        _ => "file",
    }
}

/// Résolution que Rago a posée.
#[derive(Clone, Debug)]
struct ResOn {
    game: String,
    device: String,
    /// lancé depuis Rago : depuis quand on attend que le jeu tourne (None : vu en cours de partie)
    waiting: Option<Instant>,
}

struct Inner {
    saved: Saved,
    restore: Restore,
    /// jeux lancés : id → dossier en minuscules terminé par \ (vide pour Minecraft Java, reconnu à son exe)
    running: Vec<(String, String)>,
    /// couleurs posées : jeu (ou « preview ») et écran
    colors_on: Option<(String, String)>,
    res_on: Option<ResOn>,
    /// jeu dont l'écran a refusé la résolution : pas de nouvel essai avant la fin de sa partie
    res_refused: Option<String>,
    preview: Option<(Colors, Instant)>,
    state: State,
    /// l'app se ferme : plus rien n'est posé
    closed: bool,
}

pub struct Display {
    dir: PathBuf,
    inner: Mutex<Inner>,
    wake: Condvar,
}

/// Valeur à écrire dans le fichier d'un jeu pour une clé.
type Values = Vec<(&'static str, String)>;

/// Jeux dont Rago sait écrire la résolution dans le fichier de réglages.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum GameFile {
    Valorant,
    Fortnite,
    Cs2,
}

impl GameFile {
    /// Le jeu de la bibliothèque (son id) dont Rago connaît le fichier de réglages.
    pub fn of(id: &str) -> Option<Self> {
        match id.to_ascii_lowercase().as_str() {
            "riot:valorant" => Some(GameFile::Valorant),
            "epic:fortnite" => Some(GameFile::Fortnite),
            "steam:730" => Some(GameFile::Cs2),
            _ => None,
        }
    }

    /// Section .ini des réglages (jeux Unreal), None pour CS2 (format KeyValues de Valve).
    fn section(self) -> Option<&'static str> {
        match self {
            GameFile::Valorant => Some("/Script/ShooterGame.ShooterGameUserSettings"),
            GameFile::Fortnite => Some("/Script/FortniteGame.FortGameUserSettings"),
            GameFile::Cs2 => None,
        }
    }

    /// Clés de résolution et de mode d'affichage écrites par Rago (partage avec gamecfg.rs, fil « presets graphiques par
    /// jeu » du 11/11 : ces clés-là sont à display.rs, les réglages de qualité à gamecfg.rs). Plein écran exclusif :
    /// l'image étirée y est la plus sûre et la plus réactive.
    pub fn values(self, r: &Resolution) -> Values {
        let (w, h) = (r.width.to_string(), r.height.to_string());
        match self {
            GameFile::Valorant => vec![
                ("ResolutionSizeX", w.clone()),
                ("ResolutionSizeY", h.clone()),
                ("LastUserConfirmedResolutionSizeX", w),
                ("LastUserConfirmedResolutionSizeY", h),
                ("FullscreenMode", "0".into()),
                ("LastConfirmedFullscreenMode", "0".into()),
                ("PreferredFullscreenMode", "0".into()),
                // « Aspect Ratio Method » : Fill (False) pour l'image étirée, Letterbox (True) pour les bandes noires
                ("bShouldLetterbox", if r.stretch { "False" } else { "True" }.into()),
                ("bLastConfirmedShouldLetterbox", if r.stretch { "False" } else { "True" }.into()),
            ],
            GameFile::Fortnite => vec![
                ("ResolutionSizeX", w.clone()),
                ("ResolutionSizeY", h.clone()),
                ("LastUserConfirmedResolutionSizeX", w.clone()),
                ("LastUserConfirmedResolutionSizeY", h.clone()),
                ("DesiredScreenWidth", w.clone()),
                ("DesiredScreenHeight", h.clone()),
                ("LastUserConfirmedDesiredScreenWidth", w),
                ("LastUserConfirmedDesiredScreenHeight", h),
                ("FullscreenMode", "0".into()),
                ("LastConfirmedFullscreenMode", "0".into()),
                ("PreferredFullscreenMode", "0".into()),
            ],
            GameFile::Cs2 => vec![
                ("setting.defaultres", w),
                ("setting.defaultresheight", h),
                ("setting.aspectratiomode", cs2_aspect(r.width, r.height).to_string()),
                ("setting.fullscreen", "1".into()),
            ],
        }
    }
}

/// Format d'image de CS2 (`setting.aspectratiomode`) : 0 = 4:3 (et 5:4), 1 = 16:9, 2 = 16:10.
pub fn cs2_aspect(w: u32, h: u32) -> u8 {
    let r = w as f64 / h.max(1) as f64;
    if r < 1.5 {
        0
    } else if r < 1.7 {
        2
    } else {
        1
    }
}

/// Niveau DVC du pilote NVIDIA (0 à 63) pour un pourcentage du panneau NVIDIA (50 à 100 %), comme la table de
/// VibranceGUI (NvidiaVibranceValueWrapper : 51 % = 1, 52 % = 3, 100 % = 63).
pub fn nvidia_level(vibrance: u8) -> i32 {
    let p = vibrance.clamp(VIBRANCE_WINDOWS, 100) as f64 - 50.0;
    ((p * 63.0 / 50.0).round() as i32).clamp(0, 63)
}

/// Saturation AMD (ADL) pour un pourcentage NVIDIA : 50 % = valeur par défaut du pilote (100), 100 % = le maximum (200).
pub fn amd_value(vibrance: u8, default: i32, max: i32) -> i32 {
    let p = (vibrance.clamp(VIBRANCE_WINDOWS, 100) as i32 - 50) as f64 / 50.0;
    let top = max.max(default);
    (default as f64 + p * (top - default) as f64).round() as i32
}

/// Rampe gamma de Windows (rouge, vert, bleu, 256 valeurs chacun) pour la luminosité, le contraste et le gamma.
/// Gamma au-dessus de 1 : tons moyens plus clairs (coins sombres plus visibles), comme le panneau NVIDIA.
pub fn ramp(c: &Colors) -> Vec<u16> {
    let c = c.clamped();
    let (g, k, b) = (c.gamma as f64 / 100.0, 1.0 + c.contrast as f64 / 100.0, c.brightness as f64 / 200.0);
    let one: Vec<u16> = (0..256)
        .map(|i| {
            let x = i as f64 / 255.0;
            let v = ((x.powf(1.0 / g) - 0.5) * k + 0.5 + b).clamp(0.0, 1.0);
            (v * 65535.0).round() as u16
        })
        .collect();
    [one.clone(), one.clone(), one].concat()
}

/// Fin de ligne d'une ligne lue avec `split_inclusive('\n')`.
fn split_eol(line: &str) -> (&str, &str) {
    if let Some(body) = line.strip_suffix("\r\n") {
        (body, "\r\n")
    } else if let Some(body) = line.strip_suffix('\n') {
        (body, "\n")
    } else {
        (line, "")
    }
}

/// Remplace dans la section `section` d'un .ini la valeur des clés **déjà présentes** (comparées sans la casse) ; garde
/// tout le reste tel quel (ordre, autres sections, fins de ligne). Renvoie le texte et, pour chaque clé changée, sa
/// valeur d'avant. N'ajoute jamais de clé : un fichier d'une autre version du jeu reste lisible par le jeu.
pub fn patch_ini(text: &str, section: &str, values: &[(&str, String)]) -> (String, Vec<(String, String)>) {
    let mut out = String::with_capacity(text.len() + 64);
    let mut old: Vec<(String, String)> = Vec::new();
    let mut inside = false;
    for line in text.split_inclusive('\n') {
        let (body, eol) = split_eol(line);
        let t = body.trim();
        if t.starts_with('[') && t.ends_with(']') {
            inside = t[1..t.len() - 1].trim().eq_ignore_ascii_case(section);
            out.push_str(line);
            continue;
        }
        if inside {
            if let Some((k, v)) = body.split_once('=') {
                let key = k.trim();
                if let Some((_, new)) = values.iter().find(|(name, _)| name.eq_ignore_ascii_case(key)) {
                    if !old.iter().any(|(o, _)| o.eq_ignore_ascii_case(key)) {
                        old.push((key.to_string(), v.trim().to_string()));
                    }
                    out.push_str(k);
                    out.push('=');
                    out.push_str(new);
                    out.push_str(eol);
                    continue;
                }
            }
        }
        out.push_str(line);
    }
    (out, old)
}

/// Les deux premiers textes entre guillemets d'une ligne KeyValues (`"clé"  "valeur"`) : leurs positions.
fn kv_quotes(body: &str) -> Option<((usize, usize), (usize, usize))> {
    let mut spans = Vec::with_capacity(2);
    let mut start = None;
    for (i, ch) in body.char_indices() {
        if ch == '"' {
            match start.take() {
                None => start = Some(i + 1),
                Some(s) => {
                    spans.push((s, i));
                    if spans.len() == 2 {
                        break;
                    }
                }
            }
        }
    }
    (spans.len() == 2).then(|| (spans[0], spans[1]))
}

/// Comme `patch_ini`, pour un fichier KeyValues de Valve (cs2_video.txt) : seules les clés déjà présentes changent.
pub fn patch_kv(text: &str, values: &[(&str, String)]) -> (String, Vec<(String, String)>) {
    let mut out = String::with_capacity(text.len() + 64);
    let mut old: Vec<(String, String)> = Vec::new();
    for line in text.split_inclusive('\n') {
        let (body, eol) = split_eol(line);
        if let Some(((ks, ke), (vs, ve))) = kv_quotes(body) {
            let key = &body[ks..ke];
            if let Some((_, new)) = values.iter().find(|(name, _)| name.eq_ignore_ascii_case(key)) {
                if !old.iter().any(|(o, _)| o.eq_ignore_ascii_case(key)) {
                    old.push((key.to_string(), body[vs..ve].to_string()));
                }
                out.push_str(&body[..vs]);
                out.push_str(new);
                out.push_str(&body[ve..]);
                out.push_str(eol);
                continue;
            }
        }
        out.push_str(line);
    }
    (out, old)
}

/// Écrit la résolution dans un fichier de réglages : renvoie le texte et les valeurs d'avant (None : rien à changer).
pub fn patch_file(kind: GameFile, text: &str, values: &[(&str, String)]) -> Option<(String, Vec<(String, String)>)> {
    let (out, old) = match kind.section() {
        Some(section) => patch_ini(text, section, values),
        None => patch_kv(text, values),
    };
    (out != text).then_some((out, old))
}

/// Le jeu en cours dont vient l'exe au premier plan : par le dossier du jeu, ou Minecraft Java par son exe.
pub fn owner<'a>(exe: &Path, running: &'a [(String, String)]) -> Option<&'a str> {
    let path = exe.to_string_lossy().to_lowercase();
    running.iter().find_map(|(id, dir)| {
        let hit = if id == MINECRAFT { crate::session::minecraft_exe(exe) } else { !dir.is_empty() && path.starts_with(dir.as_str()) };
        hit.then_some(id.as_str())
    })
}

/// Clé du profil d'un jeu : les launchers Minecraft Java partagent la tuile « mc:java ».
pub fn profile_key(id: &str) -> String {
    if id.starts_with("mc:") && id != "mc:bedrock" {
        MINECRAFT.to_string()
    } else {
        id.to_string()
    }
}

impl Display {
    /// Charge les profils ; après un plantage (display-restore.json non vide), remet tout de suite les couleurs, les
    /// rampes et les résolutions d'avant.
    pub fn new(data_dir: &Path) -> Arc<Self> {
        let read = |name: &str| std::fs::read(data_dir.join(name)).ok();
        let saved: Saved = read("display.json").and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        let mut restore: Restore = read("display-restore.json").and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        let had = !restore.is_empty();
        if had {
            undo(&mut restore);
        }
        let d = Arc::new(Display {
            dir: data_dir.to_path_buf(),
            inner: Mutex::new(Inner { saved, restore, running: Vec::new(), colors_on: None, res_on: None, res_refused: None, preview: None, state: State::default(), closed: false }),
            wake: Condvar::new(),
        });
        if had {
            d.save_restore(&d.lock().restore);
        }
        d
    }

    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn save(&self, saved: &Saved) {
        let path = self.dir.join("display.json");
        if *saved == Saved::default() {
            let _ = std::fs::remove_file(&path);
        } else if let Ok(json) = serde_json::to_vec_pretty(saved) {
            let _ = std::fs::write(&path, json);
        }
    }

    fn save_restore(&self, restore: &Restore) {
        let path = self.dir.join("display-restore.json");
        if restore.is_empty() {
            let _ = std::fs::remove_file(&path);
        } else if let Ok(json) = serde_json::to_vec(restore) {
            let _ = std::fs::write(&path, json);
        }
    }

    pub fn profiles(&self) -> BTreeMap<String, Profile> {
        self.lock().saved.profiles.clone()
    }

    pub fn state(&self) -> State {
        self.lock().state.clone()
    }

    /// Enregistre (ou retire, `None`) le profil d'un jeu. Jeu fermé, la résolution est écrite tout de suite dans son
    /// fichier de réglages, ou les valeurs d'avant y sont remises quand la résolution est retirée.
    pub fn set_profile(&self, id: &str, profile: Option<Profile>) -> State {
        let key = profile_key(id);
        let mut g = self.lock();
        let profile = profile.map(|mut p| {
            p.colors = p.colors.map(Colors::clamped);
            p.resolution = p.resolution.filter(|r| r.width >= 640 && r.height >= 480 && r.width <= 16384 && r.height <= 16384);
            p
        });
        let before = g.saved.profiles.get(&key).cloned().unwrap_or_default();
        match profile.filter(|p| !p.is_empty()) {
            Some(p) => {
                g.saved.profiles.insert(key.clone(), p);
            }
            None => {
                g.saved.profiles.remove(&key);
            }
        }
        let after = g.saved.profiles.get(&key).cloned().unwrap_or_default();
        let running = g.running.iter().any(|(r, _)| *r == key);
        // fichier du jeu : jamais pendant que le jeu tourne (il réécrit le sien en quittant), refait à la fin de la partie
        if !running && before.resolution != after.resolution {
            if let Some(kind) = GameFile::of(&key) {
                let err = match after.resolution.filter(|r| r.game_file) {
                    Some(r) => self.write_game_file(&mut g.saved, kind, &r),
                    None => self.put_back_game_file(&mut g.saved, kind),
                };
                g.state.outcome("file", err);
            }
        }
        self.save(&g.saved);
        // résolution changée ou retirée en pleine partie : rendue tout de suite, la nouvelle posée à sa place
        if before.resolution != after.resolution {
            g.res_refused = None;
            if let Some(waiting) = g.res_on.as_ref().filter(|on| on.game == key).map(|on| on.waiting) {
                self.res_off(&mut g);
                if let Some(r) = after.resolution {
                    self.res_on(&mut g, &key, &r, waiting);
                }
            }
        }
        // les couleurs changées en pleine partie : le regard sur le premier plan les repose
        if g.colors_on.as_ref().is_some_and(|(game, _)| *game == key) {
            let device = g.colors_on.as_ref().map(|(_, d)| d.clone()).unwrap_or_default();
            self.colors_off(&mut g);
            if let Some(c) = after.colors {
                self.colors_on(&mut g, &key, &device, c);
            }
        }
        drop(g);
        self.wake.notify_all();
        self.state()
    }

    /// Aperçu des couleurs sur l'écran principal, depuis la page (`None` : fin de l'aperçu). Rendu tout seul après
    /// quelques secondes.
    pub fn preview(&self, colors: Option<Colors>) {
        let mut g = self.lock();
        g.preview = colors.map(|c| (c.clamped(), Instant::now()));
        drop(g);
        self.wake.notify_all();
    }

    /// Avant un lancement depuis Rago : la résolution du jeu est posée tout de suite (le jeu démarre déjà dans la bonne
    /// résolution) et écrite dans son fichier.
    pub fn prepare(&self, id: &str) -> State {
        let key = profile_key(id);
        let mut g = self.lock();
        let Some(r) = g.saved.profiles.get(&key).and_then(|p| p.resolution) else { return g.state.clone() };
        let running = g.running.iter().any(|(r, _)| *r == key);
        if r.game_file && !running {
            if let Some(kind) = GameFile::of(&key) {
                let err = self.write_game_file(&mut g.saved, kind, &r);
                self.save(&g.saved);
                g.state.outcome("file", err);
            }
        }
        if g.res_on.is_none() {
            self.res_on(&mut g, &key, &r, Some(Instant::now()));
        }
        g.state.clone()
    }

    /// Le lancement depuis Rago a échoué : la résolution posée pour lui est rendue tout de suite.
    pub fn cancel_prepare(&self, id: &str) {
        let key = profile_key(id);
        let mut g = self.lock();
        if g.res_on.as_ref().is_some_and(|on| on.game == key && on.waiting.is_some()) {
            self.res_off(&mut g);
        }
    }

    /// Toutes les 4 secondes (lib.rs) : jeux lancés (id, dossier) et Minecraft Java en cours. Pose la résolution d'un jeu
    /// qui démarre, la rend à la fin de la partie, et réveille le regard sur le premier plan. Renvoie l'état s'il change.
    pub fn tick(&self, running: Vec<(String, String)>, minecraft: bool) -> Option<State> {
        let mut running: Vec<(String, String)> = running.into_iter().filter(|(id, _)| !id.starts_with("mc:")).collect();
        if minecraft {
            running.push((MINECRAFT.to_string(), String::new()));
        }
        let mut g = self.lock();
        if g.closed {
            return None;
        }
        let before = g.state.clone();
        let was: Vec<String> = g.running.iter().map(|(id, _)| id.clone()).collect();
        g.running = running;
        let now: Vec<String> = g.running.iter().map(|(id, _)| id.clone()).collect();

        // résolution refusée par l'écran : un nouvel essai seulement à la prochaine partie
        if g.res_refused.as_ref().is_some_and(|id| !now.contains(id)) {
            g.res_refused = None;
        }
        // résolution : la première partie lancée qui en a une la garde jusqu'à sa fin
        let want = now
            .iter()
            .find(|id| g.res_refused.as_ref() != Some(*id) && g.saved.profiles.get(*id).is_some_and(|p| p.resolution.is_some()))
            .cloned();
        match (want, g.res_on.clone()) {
            (Some(id), None) => {
                if let Some(r) = g.saved.profiles.get(&id).and_then(|p| p.resolution) {
                    self.res_on(&mut g, &id, &r, None);
                }
            }
            (_, Some(on)) if now.contains(&on.game) => {
                if let Some(res) = g.res_on.as_mut() {
                    res.waiting = None;
                }
            }
            (_, Some(on)) => {
                // lancé depuis Rago : le jeu a le temps de démarrer ; sinon la partie est finie
                if !on.waiting.is_some_and(|t| t.elapsed() < LAUNCH_GRACE) {
                    self.res_off(&mut g);
                }
            }
            (None, None) => {}
        }

        // partie finie : le jeu a pu réécrire son fichier en quittant, la résolution y est remise
        for id in was.iter().filter(|id| !now.contains(id)) {
            let res = g.saved.profiles.get(id).and_then(|p| p.resolution).filter(|r| r.game_file);
            if let (Some(kind), Some(r)) = (GameFile::of(id), res) {
                let err = self.write_game_file(&mut g.saved, kind, &r);
                self.save(&g.saved);
                g.state.outcome("file", err);
            }
        }
        let changed = g.state != before;
        let state = g.state.clone();
        drop(g);
        self.wake.notify_all();
        changed.then_some(state)
    }

    /// Fil qui regarde le jeu au premier plan, toutes les 250 ms tant qu'un jeu à couleurs tourne (ou pendant un
    /// aperçu), endormi sinon. `emit` reçoit l'état quand il change.
    pub fn spawn(self: &Arc<Self>, emit: impl Fn(State) + Send + 'static) {
        let me = Arc::clone(self);
        std::thread::spawn(move || loop {
            let mut g = me.lock();
            if g.closed {
                return;
            }
            if g.preview.is_some_and(|(_, t)| t.elapsed() >= PREVIEW_MAX) {
                g.preview = None;
            }
            let armed = g.running.iter().any(|(id, _)| g.saved.profiles.get(id).is_some_and(|p| p.colors.is_some()));
            if !armed && g.preview.is_none() && g.colors_on.is_none() {
                let (g, _) = me.wake.wait_timeout(g, Duration::from_secs(5)).unwrap_or_else(std::sync::PoisonError::into_inner);
                drop(g);
                continue;
            }
            let before = g.state.clone();
            // ce qui doit être posé : l'aperçu sur l'écran principal, sinon le jeu au premier plan sur son écran
            let target: Option<(String, String, Colors)> = match g.preview {
                Some((c, _)) => win::primary_device().map(|d| ("preview".to_string(), d, c)),
                None => win::foreground().and_then(|(exe, device)| {
                    let id = owner(&exe, &g.running)?.to_string();
                    let c = g.saved.profiles.get(&id)?.colors?;
                    Some((id, device, c))
                }),
            };
            let current = g.colors_on.clone();
            match (&target, &current) {
                (Some((id, device, _)), Some((on_id, on_device))) if id == on_id && device == on_device => {}
                (Some((id, device, c)), _) => {
                    me.colors_off(&mut g);
                    me.colors_on(&mut g, id, device, *c);
                }
                (None, Some(_)) => me.colors_off(&mut g),
                (None, None) => {}
            }
            let state = (g.state != before).then(|| g.state.clone());
            let (g, _) = me.wake.wait_timeout(g, WATCH_EVERY).unwrap_or_else(std::sync::PoisonError::into_inner);
            drop(g);
            if let Some(s) = state {
                emit(s);
            }
        });
    }

    /// L'app se ferme (RunEvent::Exit) : couleurs et résolution d'avant remises tout de suite, plus rien n'est posé
    /// ensuite. Les fichiers des jeux gardent la résolution choisie (le profil reste).
    pub fn shutdown(&self) {
        let mut g = self.lock();
        g.closed = true;
        g.preview = None;
        self.colors_off(&mut g);
        self.res_off(&mut g);
        let mut rest = std::mem::take(&mut g.restore);
        undo(&mut rest);
        g.restore = rest;
        self.save_restore(&g.restore);
        drop(g);
        self.wake.notify_all();
    }

    /// Pose les couleurs sur un écran ; ce qu'il y avait est noté sur le disque avant.
    fn colors_on(&self, g: &mut Inner, id: &str, device: &str, c: Colors) {
        let mut errors = Vec::new();
        if c.vibrance != VIBRANCE_WINDOWS {
            match win::vibrance_get(device) {
                Some((driver, value, default, max)) => {
                    if !g.restore.levels.iter().any(|l| l.device == device) {
                        g.restore.levels.push(Level { device: device.to_string(), driver: driver.to_string(), value });
                        self.save_restore(&g.restore);
                    }
                    let want = if driver == "nvidia" { nvidia_level(c.vibrance) } else { amd_value(c.vibrance, default, max) };
                    if !win::vibrance_set(device, driver, want) {
                        errors.push("vibrance");
                    }
                }
                // pas de carte NVIDIA ni AMD derrière cet écran (Intel, écran de portable) : la page le dit déjà
                None => {}
            }
        }
        if c.needs_ramp() {
            match win::ramp_get(device) {
                Some(old) => {
                    if !g.restore.ramps.iter().any(|(d, _)| d == device) {
                        g.restore.ramps.push((device.to_string(), old));
                        self.save_restore(&g.restore);
                    }
                    if !win::ramp_set(device, &ramp(&c)) {
                        errors.push("ramp");
                    }
                }
                None => errors.push("ramp"),
            }
        }
        g.colors_on = Some((id.to_string(), device.to_string()));
        g.state.colors = Some(id.to_string());
        g.state.outcome("colors", errors.first().map(|e| e.to_string()));
    }

    /// Remet les couleurs d'avant sur tous les écrans touchés.
    fn colors_off(&self, g: &mut Inner) {
        let mut r = Restore { levels: std::mem::take(&mut g.restore.levels), ramps: std::mem::take(&mut g.restore.ramps), modes: Vec::new() };
        undo(&mut r);
        g.restore.levels = r.levels;
        g.restore.ramps = r.ramps;
        self.save_restore(&g.restore);
        g.colors_on = None;
        g.state.colors = None;
    }

    /// Pose la résolution sur l'écran principal (mode testé avant, temporaire).
    fn res_on(&self, g: &mut Inner, id: &str, r: &Resolution, waiting: Option<Instant>) {
        let Some(device) = win::primary_device() else { return };
        if !g.restore.modes.contains(&device) {
            g.restore.modes.push(device.clone());
            self.save_restore(&g.restore);
        }
        if win::mode_set(&device, r) {
            g.res_on = Some(ResOn { game: id.to_string(), device, waiting });
            g.state.resolution = Some(id.to_string());
            g.state.outcome("mode", None);
        } else {
            g.restore.modes.retain(|d| *d != device);
            self.save_restore(&g.restore);
            g.res_refused = Some(id.to_string());
            g.state.outcome("mode", Some("mode".into()));
        }
    }

    fn res_off(&self, g: &mut Inner) {
        if let Some(on) = g.res_on.take() {
            win::mode_reset(&on.device);
            g.restore.modes.retain(|d| *d != on.device);
            self.save_restore(&g.restore);
        }
        g.state.resolution = None;
    }

    /// Écrit la résolution dans chaque fichier de réglages du jeu trouvé sur le PC (un par compte pour Valorant et CS2).
    /// Garde la première fois les valeurs d'avant. Renvoie une erreur pour l'interface, None si tout va bien.
    fn write_game_file(&self, saved: &mut Saved, kind: GameFile, r: &Resolution) -> Option<String> {
        let files = win::game_files(kind);
        if files.is_empty() {
            return Some("file:missing".into());
        }
        let values = kind.values(r);
        let mut err = None;
        for path in files {
            let Ok(text) = std::fs::read_to_string(&path) else { continue };
            let Some((out, old)) = patch_file(kind, &text, &values) else { continue };
            if win::read_only(&path) {
                err = Some("file:read_only".into());
                continue;
            }
            let key = path.to_string_lossy().to_string();
            // valeurs d'avant Rago : gardées une fois, jamais écrasées par celles que Rago a écrites
            let first = saved.originals.entry(key).or_default();
            for (k, v) in old {
                if !first.iter().any(|(o, _)| o.eq_ignore_ascii_case(&k)) {
                    first.push((k, v));
                }
            }
            if std::fs::write(&path, out).is_err() {
                err = Some("file:write".into());
            }
        }
        err
    }

    /// Remet dans les fichiers du jeu les valeurs d'avant Rago (résolution retirée du profil).
    fn put_back_game_file(&self, saved: &mut Saved, kind: GameFile) -> Option<String> {
        let mut err = None;
        for path in win::game_files(kind) {
            let key = path.to_string_lossy().to_string();
            let Some(old) = saved.originals.get(&key).cloned() else { continue };
            let Ok(text) = std::fs::read_to_string(&path) else { continue };
            let values: Vec<(&str, String)> = old.iter().map(|(k, v)| (k.as_str(), v.clone())).collect();
            if let Some((out, _)) = patch_file(kind, &text, &values) {
                if win::read_only(&path) {
                    err = Some("file:read_only".into());
                    continue;
                }
                if std::fs::write(&path, out).is_err() {
                    err = Some("file:write".into());
                    continue;
                }
            }
            saved.originals.remove(&key);
        }
        err
    }
}

/// Remet ce qui est noté (couleurs, rampes, résolutions). Ce qui est remis quitte la liste ; ce que le pilote refuse
/// (pas encore prêt juste après le démarrage de Windows) y reste pour la fois suivante.
fn undo(r: &mut Restore) {
    r.levels.retain(|l| !win::vibrance_set(&l.device, if l.driver == "amd" { "amd" } else { "nvidia" }, l.value));
    r.ramps.retain(|(d, old)| !win::ramp_set(d, old));
    for d in std::mem::take(&mut r.modes) {
        win::mode_reset(&d);
    }
}

/// Désinstallation (reset.rs) : couleurs, rampes et résolution d'avant, et valeurs d'avant Rago dans les fichiers des
/// jeux.
pub fn undo_all(data_dir: &Path) {
    let d = Display::new(data_dir);
    let mut g = d.lock();
    let kinds: Vec<GameFile> = g.saved.profiles.keys().filter_map(|id| GameFile::of(id)).collect();
    for kind in kinds {
        d.put_back_game_file(&mut g.saved, kind);
    }
    g.saved.profiles.clear();
    d.save(&g.saved);
}

/// Pour la page : ce que la carte graphique de l'écran principal sait faire, et ses résolutions.
#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    /// "nvidia" ou "amd" : qui fait la saturation sur l'écran principal ; None : pas de saturation (Intel, portable dont
    /// l'écran est branché sur la puce Intel…), luminosité, contraste et gamma restent possibles
    pub vibrance: Option<String>,
    pub monitor: Option<Monitor>,
}

#[derive(Serialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Monitor {
    pub device: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub hz: u32,
    /// résolutions que l'écran accepte (largeur, hauteur), de la plus grande à la plus petite
    pub modes: Vec<(u32, u32)>,
}

pub fn info() -> Info {
    let monitor = win::primary_monitor();
    let vibrance = monitor.as_ref().and_then(|m| win::vibrance_get(&m.device)).map(|(driver, ..)| driver.to_string());
    Info { vibrance, monitor }
}

/// Résolutions distinctes, de la plus grande à la plus petite.
#[cfg_attr(not(windows), allow(dead_code))]
pub fn unique_modes(mut modes: Vec<(u32, u32)>) -> Vec<(u32, u32)> {
    modes.retain(|(w, h)| *w >= 640 && *h >= 480);
    modes.sort_by(|a, b| (b.0 * b.1, b.0).cmp(&(a.0 * a.1, a.0)));
    modes.dedup();
    modes
}

#[cfg(windows)]
mod win {
    //! Pilotes NVIDIA (nvapi64.dll) et AMD (atiadlxx.dll), chargés depuis System32 seulement (Rago tourne en
    //! administrateur : jamais une DLL du dossier courant), rampe gamma et modes d'affichage de Windows.
    use super::{unique_modes, GameFile, Monitor, Resolution};
    use std::ffi::c_void;
    use std::path::{Path, PathBuf};
    use std::sync::OnceLock;
    use windows_sys::Win32::Foundation::{CloseHandle, HMODULE};
    use windows_sys::Win32::Graphics::Gdi::{
        ChangeDisplaySettingsExW, CreateDCW, DeleteDC, EnumDisplayDevicesW, EnumDisplaySettingsW, GetMonitorInfoW, MonitorFromWindow, CDS_FULLSCREEN, CDS_TEST, DEVMODEW,
        DISPLAY_DEVICEW, DISPLAY_DEVICE_ATTACHED_TO_DESKTOP, DISPLAY_DEVICE_PRIMARY_DEVICE, DISP_CHANGE_SUCCESSFUL, DMDFO_CENTER, DMDFO_STRETCH, DM_BITSPERPEL,
        DM_DISPLAYFIXEDOUTPUT, DM_DISPLAYFREQUENCY, DM_PELSHEIGHT, DM_PELSWIDTH, ENUM_CURRENT_SETTINGS, MONITORINFOEXW, MONITOR_DEFAULTTONEAREST,
    };
    use windows_sys::Win32::Storage::FileSystem::{GetFileAttributesW, FILE_ATTRIBUTE_READONLY, INVALID_FILE_ATTRIBUTES};
    use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryExW, LOAD_LIBRARY_SEARCH_SYSTEM32};
    use windows_sys::Win32::System::Memory::{GetProcessHeap, HeapAlloc, HeapFree, HEAP_ZERO_MEMORY};
    use windows_sys::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows_sys::Win32::UI::ColorSystem::{GetDeviceGammaRamp, SetDeviceGammaRamp};
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn text(buf: &[u16]) -> String {
        String::from_utf16_lossy(&buf[..buf.iter().position(|&c| c == 0).unwrap_or(buf.len())])
    }

    fn ascii(buf: &[u8]) -> String {
        String::from_utf8_lossy(&buf[..buf.iter().position(|&c| c == 0).unwrap_or(buf.len())]).to_string()
    }

    fn system_dll(name: &str) -> Option<HMODULE> {
        let h = unsafe { LoadLibraryExW(wide(name).as_ptr(), std::ptr::null_mut(), LOAD_LIBRARY_SEARCH_SYSTEM32) };
        (!h.is_null()).then_some(h)
    }

    fn proc_addr(h: HMODULE, name: &str) -> Option<unsafe extern "system" fn() -> isize> {
        let name: Vec<u8> = name.bytes().chain(std::iter::once(0)).collect();
        unsafe { GetProcAddress(h, name.as_ptr()) }
    }

    // ------------------------------------------------------------------ NVIDIA (NVAPI, comme VibranceGUI)

    /// Identifiants nvapi_QueryInterface (NvAPIWrapper, FunctionId.cs).
    const NVAPI_INITIALIZE: u32 = 0x0150_E828;
    const NVAPI_GET_ASSOCIATED_NVIDIA_DISPLAY_HANDLE: u32 = 0x35C2_9134;
    const NVAPI_GET_DVC_INFO: u32 = 0x4085_DE45;
    const NVAPI_SET_DVC_LEVEL: u32 = 0x1724_09B4;

    #[repr(C)]
    #[derive(Default)]
    struct DvcInfo {
        version: u32,
        current: i32,
        min: i32,
        max: i32,
    }

    struct Nvapi {
        handle_of: unsafe extern "C" fn(*const u8, *mut *mut c_void) -> i32,
        get: unsafe extern "C" fn(*mut c_void, u32, *mut DvcInfo) -> i32,
        set: unsafe extern "C" fn(*mut c_void, u32, i32) -> i32,
    }
    // pointeurs de fonctions du pilote, valables toute la vie de l'app
    unsafe impl Send for Nvapi {}
    unsafe impl Sync for Nvapi {}

    fn nvapi() -> Option<&'static Nvapi> {
        static NV: OnceLock<Option<Nvapi>> = OnceLock::new();
        NV.get_or_init(|| unsafe {
            let h = system_dll("nvapi64.dll")?;
            let query: unsafe extern "C" fn(u32) -> *const c_void = std::mem::transmute(proc_addr(h, "nvapi_QueryInterface")?);
            let get = |id: u32| {
                let p = query(id);
                (!p.is_null()).then_some(p)
            };
            let init: unsafe extern "C" fn() -> i32 = std::mem::transmute(get(NVAPI_INITIALIZE)?);
            if init() != 0 {
                return None;
            }
            Some(Nvapi {
                handle_of: std::mem::transmute(get(NVAPI_GET_ASSOCIATED_NVIDIA_DISPLAY_HANDLE)?),
                get: std::mem::transmute(get(NVAPI_GET_DVC_INFO)?),
                set: std::mem::transmute(get(NVAPI_SET_DVC_LEVEL)?),
            })
        })
        .as_ref()
    }

    fn nv_handle(nv: &Nvapi, device: &str) -> Option<*mut c_void> {
        let name: Vec<u8> = device.bytes().chain(std::iter::once(0)).collect();
        let mut h: *mut c_void = std::ptr::null_mut();
        (unsafe { (nv.handle_of)(name.as_ptr(), &mut h) } == 0 && !h.is_null()).then_some(h)
    }

    fn nv_get(device: &str) -> Option<i32> {
        let nv = nvapi()?;
        let h = nv_handle(nv, device)?;
        let mut info = DvcInfo { version: std::mem::size_of::<DvcInfo>() as u32 | (1 << 16), ..DvcInfo::default() };
        (unsafe { (nv.get)(h, 0, &mut info) } == 0).then_some(info.current)
    }

    fn nv_set(device: &str, level: i32) -> bool {
        let Some(nv) = nvapi() else { return false };
        let Some(h) = nv_handle(nv, device) else { return false };
        unsafe { (nv.set)(h, 0, level.clamp(0, 63)) == 0 }
    }

    // ------------------------------------------------------------------ AMD (ADL, comme VibranceGUI)

    const ADL_DISPLAY_COLOR_SATURATION: i32 = 1 << 2;

    #[repr(C)]
    struct AdapterInfo {
        size: i32,
        adapter_index: i32,
        udid: [u8; 256],
        bus: i32,
        device: i32,
        function: i32,
        vendor: i32,
        adapter_name: [u8; 256],
        display_name: [u8; 256],
        present: i32,
        exist: i32,
        driver_path: [u8; 256],
        driver_path_ext: [u8; 256],
        pnp: [u8; 256],
        os_display_index: i32,
    }

    #[repr(C)]
    struct DisplayId {
        logical_index: i32,
        physical_index: i32,
        logical_adapter_index: i32,
        physical_adapter_index: i32,
    }

    #[repr(C)]
    struct DisplayInfo {
        id: DisplayId,
        controller_index: i32,
        name: [u8; 256],
        manufacturer: [u8; 256],
        display_type: i32,
        output_type: i32,
        connector: i32,
        info_mask: i32,
        info_value: i32,
    }

    type Alloc = unsafe extern "C" fn(i32) -> *mut c_void;

    struct Adl {
        adapters: unsafe extern "C" fn(*mut i32) -> i32,
        adapter_info: unsafe extern "C" fn(*mut AdapterInfo, i32) -> i32,
        display_info: unsafe extern "C" fn(i32, *mut i32, *mut *mut DisplayInfo, i32) -> i32,
        color_get: unsafe extern "C" fn(i32, i32, i32, *mut i32, *mut i32, *mut i32, *mut i32, *mut i32) -> i32,
        color_set: unsafe extern "C" fn(i32, i32, i32, i32) -> i32,
    }
    unsafe impl Send for Adl {}
    unsafe impl Sync for Adl {}

    /// Mémoire demandée par ADL (liste des écrans), rendue par `adl_free`.
    unsafe extern "C" fn adl_alloc(size: i32) -> *mut c_void {
        HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, size.max(0) as usize)
    }

    fn adl_free(p: *mut c_void) {
        if !p.is_null() {
            unsafe { HeapFree(GetProcessHeap(), 0, p) };
        }
    }

    fn adl() -> Option<&'static Adl> {
        static ADL: OnceLock<Option<Adl>> = OnceLock::new();
        ADL.get_or_init(|| unsafe {
            let h = system_dll("atiadlxx.dll")?;
            let create: unsafe extern "C" fn(Alloc, i32) -> i32 = std::mem::transmute(proc_addr(h, "ADL_Main_Control_Create")?);
            if create(adl_alloc, 1) != 0 {
                return None;
            }
            Some(Adl {
                adapters: std::mem::transmute(proc_addr(h, "ADL_Adapter_NumberOfAdapters_Get")?),
                adapter_info: std::mem::transmute(proc_addr(h, "ADL_Adapter_AdapterInfo_Get")?),
                display_info: std::mem::transmute(proc_addr(h, "ADL_Display_DisplayInfo_Get")?),
                color_get: std::mem::transmute(proc_addr(h, "ADL_Display_Color_Get")?),
                color_set: std::mem::transmute(proc_addr(h, "ADL_Display_Color_Set")?),
            })
        })
        .as_ref()
    }

    /// (adaptateur, écran) ADL de l'écran Windows `device` (\\.\DISPLAY1), comme VibranceGUI : l'adaptateur dont le
    /// nom d'affichage est celui de l'écran, et son écran logique branché dessus.
    fn amd_display(device: &str) -> Option<(&'static Adl, i32, i32)> {
        let adl = adl()?;
        unsafe {
            let mut n = 0i32;
            if (adl.adapters)(&mut n) != 0 || n <= 0 {
                return None;
            }
            let size = std::mem::size_of::<AdapterInfo>();
            let mut infos: Vec<AdapterInfo> = (0..n).map(|_| std::mem::zeroed()).collect();
            if (adl.adapter_info)(infos.as_mut_ptr(), (size * n as usize) as i32) != 0 {
                return None;
            }
            for a in infos.iter().filter(|a| ascii(&a.display_name).eq_ignore_ascii_case(device)) {
                let mut count = 0i32;
                let mut list: *mut DisplayInfo = std::ptr::null_mut();
                if (adl.display_info)(a.adapter_index, &mut count, &mut list, 0) != 0 || list.is_null() {
                    continue;
                }
                let displays = std::slice::from_raw_parts(list, count.max(0) as usize);
                // l'écran logique de cet adaptateur, de préférence branché et affiché (bits 0x1 et 0x2 d'iDisplayInfoValue)
                let mine = || displays.iter().filter(|d| d.id.logical_adapter_index == a.adapter_index && d.id.logical_index >= 0);
                let found = mine().find(|d| d.info_value & 0x3 == 0x3).or_else(|| mine().next()).map(|d| d.id.logical_index);
                adl_free(list.cast());
                if let Some(display) = found {
                    return Some((adl, a.adapter_index, display));
                }
            }
        }
        None
    }

    fn amd_get(device: &str) -> Option<(i32, i32, i32)> {
        let (adl, adapter, display) = amd_display(device)?;
        let (mut cur, mut def, mut min, mut max, mut step) = (0, 0, 0, 0, 0);
        let ok = unsafe { (adl.color_get)(adapter, display, ADL_DISPLAY_COLOR_SATURATION, &mut cur, &mut def, &mut min, &mut max, &mut step) } == 0;
        (ok && max > min).then_some((cur, def, max))
    }

    fn amd_set(device: &str, value: i32) -> bool {
        let Some((adl, adapter, display)) = amd_display(device) else { return false };
        unsafe { (adl.color_set)(adapter, display, ADL_DISPLAY_COLOR_SATURATION, value) == 0 }
    }

    /// Saturation de l'écran : (pilote, valeur actuelle, valeur par défaut, maximum).
    pub fn vibrance_get(device: &str) -> Option<(&'static str, i32, i32, i32)> {
        if let Some(cur) = nv_get(device) {
            return Some(("nvidia", cur, 0, 63));
        }
        amd_get(device).map(|(cur, def, max)| ("amd", cur, def, max))
    }

    pub fn vibrance_set(device: &str, driver: &str, value: i32) -> bool {
        if driver == "amd" {
            amd_set(device, value)
        } else {
            nv_set(device, value)
        }
    }

    // ------------------------------------------------------------------ rampe gamma (toutes les cartes)

    fn with_dc<T>(device: &str, f: impl FnOnce(windows_sys::Win32::Graphics::Gdi::HDC) -> T) -> Option<T> {
        unsafe {
            let dc = CreateDCW(wide("DISPLAY").as_ptr(), wide(device).as_ptr(), std::ptr::null(), std::ptr::null());
            if dc.is_null() {
                return None;
            }
            let out = f(dc);
            DeleteDC(dc);
            Some(out)
        }
    }

    pub fn ramp_get(device: &str) -> Option<Vec<u16>> {
        with_dc(device, |dc| {
            let mut buf = vec![0u16; 768];
            (unsafe { GetDeviceGammaRamp(dc, buf.as_mut_ptr().cast()) } != 0).then_some(buf)
        })
        .flatten()
    }

    pub fn ramp_set(device: &str, ramp: &[u16]) -> bool {
        ramp.len() == 768 && with_dc(device, |dc| unsafe { SetDeviceGammaRamp(dc, ramp.as_ptr().cast()) } != 0).unwrap_or(false)
    }

    // ------------------------------------------------------------------ écrans et résolutions

    fn devmode() -> DEVMODEW {
        let mut m: DEVMODEW = unsafe { std::mem::zeroed() };
        m.dmSize = std::mem::size_of::<DEVMODEW>() as u16;
        m
    }

    /// Écrans branchés au bureau : (\\.\DISPLAYn, nom de l'écran, principal).
    fn devices() -> Vec<(String, String, bool)> {
        let mut out = Vec::new();
        for i in 0..16 {
            let mut d: DISPLAY_DEVICEW = unsafe { std::mem::zeroed() };
            d.cb = std::mem::size_of::<DISPLAY_DEVICEW>() as u32;
            if unsafe { EnumDisplayDevicesW(std::ptr::null(), i, &mut d, 0) } == 0 {
                break;
            }
            if d.StateFlags & DISPLAY_DEVICE_ATTACHED_TO_DESKTOP == 0 {
                continue;
            }
            let device = text(&d.DeviceName);
            // le nom de l'écran est sous celui de la sortie
            let mut m: DISPLAY_DEVICEW = unsafe { std::mem::zeroed() };
            m.cb = std::mem::size_of::<DISPLAY_DEVICEW>() as u32;
            let name = if unsafe { EnumDisplayDevicesW(wide(&device).as_ptr(), 0, &mut m, 0) } != 0 { text(&m.DeviceString) } else { text(&d.DeviceString) };
            out.push((device, name, d.StateFlags & DISPLAY_DEVICE_PRIMARY_DEVICE != 0));
        }
        out
    }

    pub fn primary_device() -> Option<String> {
        let list = devices();
        list.iter().find(|(_, _, p)| *p).or(list.first()).map(|(d, ..)| d.clone())
    }

    pub fn primary_monitor() -> Option<Monitor> {
        let list = devices();
        let (device, name, _) = list.iter().find(|(_, _, p)| *p).or(list.first())?.clone();
        let w = wide(&device);
        let mut cur = devmode();
        if unsafe { EnumDisplaySettingsW(w.as_ptr(), ENUM_CURRENT_SETTINGS, &mut cur) } == 0 {
            return None;
        }
        let mut modes = Vec::new();
        for i in 0..4096u32 {
            let mut m = devmode();
            if unsafe { EnumDisplaySettingsW(w.as_ptr(), i, &mut m) } == 0 {
                break;
            }
            modes.push((m.dmPelsWidth, m.dmPelsHeight));
        }
        Some(Monitor { device, name, width: cur.dmPelsWidth, height: cur.dmPelsHeight, hz: cur.dmDisplayFrequency, modes: unique_modes(modes) })
    }

    /// Fréquence la plus haute que l'écran accepte pour cette résolution (celle d'aujourd'hui si elle y est).
    fn best_hz(w: &[u16], width: u32, height: u32, current: u32) -> u32 {
        let mut best = 0;
        for i in 0..4096u32 {
            let mut m = devmode();
            if unsafe { EnumDisplaySettingsW(w.as_ptr(), i, &mut m) } == 0 {
                break;
            }
            if m.dmPelsWidth == width && m.dmPelsHeight == height {
                if m.dmDisplayFrequency == current {
                    return current;
                }
                best = best.max(m.dmDisplayFrequency);
            }
        }
        best
    }

    /// Change la résolution de l'écran, en mode temporaire (jamais dans le registre), testée avant.
    pub fn mode_set(device: &str, r: &Resolution) -> bool {
        let w = wide(device);
        let mut m = devmode();
        if unsafe { EnumDisplaySettingsW(w.as_ptr(), ENUM_CURRENT_SETTINGS, &mut m) } == 0 {
            return false;
        }
        let hz = best_hz(&w, r.width, r.height, m.dmDisplayFrequency);
        if hz == 0 {
            return false; // l'écran ne propose pas cette résolution (à créer dans le panneau NVIDIA ou AMD)
        }
        m.dmPelsWidth = r.width;
        m.dmPelsHeight = r.height;
        m.dmDisplayFrequency = hz;
        m.dmFields = DM_PELSWIDTH | DM_PELSHEIGHT | DM_DISPLAYFREQUENCY | DM_BITSPERPEL | DM_DISPLAYFIXEDOUTPUT;
        // demande au pilote d'étirer (ou de centrer) l'image ; le panneau NVIDIA ou AMD peut l'imposer autrement
        m.Anonymous1.Anonymous2.dmDisplayFixedOutput = if r.stretch { DMDFO_STRETCH } else { DMDFO_CENTER };
        unsafe {
            if ChangeDisplaySettingsExW(w.as_ptr(), &m, std::ptr::null_mut(), CDS_TEST, std::ptr::null()) != DISP_CHANGE_SUCCESSFUL {
                // certains pilotes refusent l'échelle demandée : la résolution seule
                m.dmFields &= !DM_DISPLAYFIXEDOUTPUT;
                if ChangeDisplaySettingsExW(w.as_ptr(), &m, std::ptr::null_mut(), CDS_TEST, std::ptr::null()) != DISP_CHANGE_SUCCESSFUL {
                    return false;
                }
            }
            ChangeDisplaySettingsExW(w.as_ptr(), &m, std::ptr::null_mut(), CDS_FULLSCREEN, std::ptr::null()) == DISP_CHANGE_SUCCESSFUL
        }
    }

    /// Rend à l'écran le mode du registre (celui choisi par le joueur dans Windows).
    pub fn mode_reset(device: &str) {
        let w = wide(device);
        unsafe { ChangeDisplaySettingsExW(w.as_ptr(), std::ptr::null(), std::ptr::null_mut(), 0, std::ptr::null()) };
    }

    // ------------------------------------------------------------------ jeu au premier plan

    /// Exe de la fenêtre au premier plan, et l'écran où elle est.
    pub fn foreground() -> Option<(PathBuf, String)> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 || pid == std::process::id() {
                return None;
            }
            let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if h.is_null() {
                return None;
            }
            let mut buf = [0u16; 1024];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len);
            CloseHandle(h);
            if ok == 0 {
                return None;
            }
            let exe = PathBuf::from(String::from_utf16_lossy(&buf[..len as usize]));
            let mut mi: MONITORINFOEXW = std::mem::zeroed();
            mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
            if GetMonitorInfoW(MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), (&mut mi as *mut MONITORINFOEXW).cast()) == 0 {
                return None;
            }
            Some((exe, text(&mi.szDevice)))
        }
    }

    // ------------------------------------------------------------------ fichiers de réglages des jeux

    pub fn read_only(path: &Path) -> bool {
        let a = unsafe { GetFileAttributesW(wide(&path.to_string_lossy()).as_ptr()) };
        a != INVALID_FILE_ATTRIBUTES && a & FILE_ATTRIBUTE_READONLY != 0
    }

    fn subdirs(dir: &Path) -> Vec<PathBuf> {
        std::fs::read_dir(dir).map(|it| it.flatten().map(|e| e.path()).filter(|p| p.is_dir()).collect()).unwrap_or_default()
    }

    /// Fichiers de réglages du jeu présents sur le PC, dans tous les comptes Windows (Rago peut être élevé avec un autre
    /// compte que celui du joueur) : un dossier par compte Riot pour Valorant, par compte Steam pour CS2.
    pub fn game_files(kind: GameFile) -> Vec<PathBuf> {
        let mut out = Vec::new();
        match kind {
            GameFile::Valorant => {
                for local in crate::games::local_dirs() {
                    let config = local.join("VALORANT").join("Saved").join("Config");
                    for account in subdirs(&config) {
                        out.push(account.join("Windows").join("GameUserSettings.ini"));
                    }
                }
            }
            GameFile::Fortnite => {
                for local in crate::games::local_dirs() {
                    out.push(local.join("FortniteGame").join("Saved").join("Config").join("WindowsClient").join("GameUserSettings.ini"));
                }
            }
            GameFile::Cs2 => {
                let roots = [
                    crate::reg::string("HKCU\\Software\\Valve\\Steam", "SteamPath"),
                    crate::reg::string("HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath"),
                ];
                let mut seen: Vec<PathBuf> = Vec::new();
                for root in roots.into_iter().flatten().map(|p| PathBuf::from(p.replace('/', "\\"))) {
                    if seen.iter().any(|s| s.as_os_str().eq_ignore_ascii_case(root.as_os_str())) {
                        continue;
                    }
                    for user in subdirs(&root.join("userdata")) {
                        out.push(user.join("730").join("local").join("cfg").join("cs2_video.txt"));
                    }
                    seen.push(root);
                }
            }
        }
        out.retain(|p| p.is_file());
        out
    }
}

#[cfg(not(windows))]
mod win {
    use super::{GameFile, Monitor, Resolution};
    use std::path::{Path, PathBuf};
    pub fn vibrance_get(_device: &str) -> Option<(&'static str, i32, i32, i32)> {
        None
    }
    pub fn vibrance_set(_device: &str, _driver: &str, _value: i32) -> bool {
        false
    }
    pub fn ramp_get(_device: &str) -> Option<Vec<u16>> {
        None
    }
    pub fn ramp_set(_device: &str, _ramp: &[u16]) -> bool {
        false
    }
    pub fn primary_device() -> Option<String> {
        None
    }
    pub fn primary_monitor() -> Option<Monitor> {
        None
    }
    pub fn mode_set(_device: &str, _r: &Resolution) -> bool {
        false
    }
    pub fn mode_reset(_device: &str) {}
    pub fn foreground() -> Option<(PathBuf, String)> {
        None
    }
    pub fn read_only(_path: &Path) -> bool {
        false
    }
    pub fn game_files(_kind: GameFile) -> Vec<PathBuf> {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_vibrance_like_vibrancegui() {
        // table de VibranceGUI : 50 % = 0, 51 % = 1, 52 % = 3, 56 % = 8, 100 % = 63
        assert_eq!(nvidia_level(50), 0);
        assert_eq!(nvidia_level(51), 1);
        assert_eq!(nvidia_level(52), 3);
        assert_eq!(nvidia_level(56), 8);
        assert_eq!(nvidia_level(75), 32);
        assert_eq!(nvidia_level(100), 63);
        assert_eq!(nvidia_level(20), 0);
        // AMD : 50 % = la valeur par défaut du pilote, 100 % = son maximum
        assert_eq!(amd_value(50, 100, 200), 100);
        assert_eq!(amd_value(75, 100, 200), 150);
        assert_eq!(amd_value(100, 100, 200), 200);
    }

    #[test]
    fn a_success_clears_only_its_own_error() {
        let mut s = State::default();
        s.outcome("colors", Some("vibrance".into()));
        s.outcome("mode", None);
        assert_eq!(s.error.as_deref(), Some("vibrance"));
        s.outcome("colors", None);
        assert_eq!(s.error, None);
        s.outcome("file", Some("file:read_only".into()));
        s.outcome("colors", None);
        assert_eq!(s.error.as_deref(), Some("file:read_only"));
        s.outcome("file", None);
        assert_eq!(s.error, None);
    }

    #[test]
    fn windows_ramp_is_identity() {
        let r = ramp(&Colors::default());
        assert_eq!(r.len(), 768);
        assert_eq!(r[0], 0);
        assert_eq!(r[255], 65535);
        assert_eq!(r[128], (128.0 / 255.0 * 65535.0f64).round() as u16);
        assert_eq!(&r[..256], &r[256..512]);
        // gamma plus haut : tons moyens plus clairs, noir et blanc gardés
        let bright = ramp(&Colors { gamma: 130, ..Colors::default() });
        assert!(bright[64] > r[64] && bright[0] == 0 && bright[255] == 65535);
        assert!(!Colors::default().needs_ramp());
        assert!(Colors { contrast: 5, ..Colors::default() }.needs_ramp());
    }

    #[test]
    fn clamps_to_safe_values() {
        let c = Colors { vibrance: 120, brightness: 100, contrast: -100, gamma: 10 }.clamped();
        assert_eq!(c, Colors { vibrance: 100, brightness: 30, contrast: -30, gamma: 70 });
    }

    const VALORANT: &str = "[/Script/ShooterGame.ShooterGameUserSettings]\r\nDefaultMonitorIndex=0\r\nbShouldLetterbox=True\r\nbLastConfirmedShouldLetterbox=True\r\nResolutionSizeX=1920\r\nResolutionSizeY=1080\r\nLastUserConfirmedResolutionSizeX=1920\r\nLastUserConfirmedResolutionSizeY=1080\r\nLastConfirmedFullscreenMode=2\r\nPreferredFullscreenMode=0\r\nDesiredScreenWidth=1280\r\n\r\n[ScalabilityGroups]\r\nsg.ResolutionQuality=100.000000\r\nResolutionSizeX=7\r\n";

    #[test]
    fn patches_only_existing_resolution_keys_of_valorant() {
        let r = Resolution { width: 1440, height: 1080, stretch: true, game_file: true };
        let (out, old) = patch_file(GameFile::Valorant, VALORANT, &GameFile::Valorant.values(&r)).unwrap();
        assert!(out.contains("ResolutionSizeX=1440\r\nResolutionSizeY=1080\r\n"));
        assert!(out.contains("bShouldLetterbox=False\r\nbLastConfirmedShouldLetterbox=False\r\n"));
        assert!(out.contains("LastConfirmedFullscreenMode=0\r\nPreferredFullscreenMode=0\r\n"));
        // clé absente (FullscreenMode) jamais ajoutée ; autres clés et autres sections gardées
        assert!(!out.contains("\nFullscreenMode="));
        assert!(out.contains("DesiredScreenWidth=1280\r\n"));
        assert!(out.ends_with("[ScalabilityGroups]\r\nsg.ResolutionQuality=100.000000\r\nResolutionSizeX=7\r\n"));
        assert!(old.contains(&("ResolutionSizeX".to_string(), "1920".to_string())));
        assert!(old.contains(&("bShouldLetterbox".to_string(), "True".to_string())));
        assert!(old.contains(&("LastConfirmedFullscreenMode".to_string(), "2".to_string())));
        // les valeurs d'avant remises redonnent le fichier d'origine
        let back: Vec<(&str, String)> = old.iter().map(|(k, v)| (k.as_str(), v.clone())).collect();
        let (again, _) = patch_file(GameFile::Valorant, &out, &back).unwrap();
        assert_eq!(again, VALORANT);
        // déjà à jour : rien à écrire
        assert!(patch_file(GameFile::Valorant, &out, &GameFile::Valorant.values(&r)).is_none());
    }

    #[test]
    fn patches_cs2_video_file() {
        let text = "\"video.cfg\"\n{\n\t\"Version\"\t\t\"16\"\n\t\"setting.defaultres\"\t\t\"1920\"\n\t\"setting.defaultresheight\"\t\t\"1080\"\n\t\"setting.aspectratiomode\"\t\t\"1\"\n\t\"setting.fullscreen\"\t\t\"0\"\n}\n";
        let r = Resolution { width: 1280, height: 960, stretch: true, game_file: true };
        let (out, old) = patch_file(GameFile::Cs2, text, &GameFile::Cs2.values(&r)).unwrap();
        assert!(out.contains("\t\"setting.defaultres\"\t\t\"1280\"\n\t\"setting.defaultresheight\"\t\t\"960\"\n"));
        assert!(out.contains("\"setting.aspectratiomode\"\t\t\"0\""));
        assert!(out.contains("\"setting.fullscreen\"\t\t\"1\""));
        assert!(out.starts_with("\"video.cfg\"\n{\n\t\"Version\"\t\t\"16\"\n"));
        assert_eq!(old.len(), 4);
        assert_eq!(cs2_aspect(1920, 1080), 1);
        assert_eq!(cs2_aspect(1680, 1050), 2);
        assert_eq!(cs2_aspect(1280, 1024), 0);
    }

    #[test]
    fn knows_which_games_have_a_settings_file() {
        assert_eq!(GameFile::of("riot:valorant"), Some(GameFile::Valorant));
        assert_eq!(GameFile::of("epic:Fortnite"), Some(GameFile::Fortnite));
        assert_eq!(GameFile::of("steam:730"), Some(GameFile::Cs2));
        assert_eq!(GameFile::of("steam:570"), None);
        assert_eq!(profile_key("mc:lunar"), MINECRAFT);
        assert_eq!(profile_key("riot:valorant"), "riot:valorant");
    }

    #[test]
    fn finds_the_game_in_front() {
        let running = vec![("riot:valorant".to_string(), "c:\\riot games\\valorant\\live\\".to_string()), (MINECRAFT.to_string(), String::new())];
        let exe = Path::new("C:\\Riot Games\\VALORANT\\live\\ShooterGame\\Binaries\\Win64\\VALORANT-Win64-Shipping.exe");
        assert_eq!(owner(exe, &running), Some("riot:valorant"));
        assert_eq!(owner(Path::new("C:\\Program Files\\Google\\Chrome\\chrome.exe"), &running), None);
        let java = Path::new("C:\\Users\\a\\.lunarclient\\jre\\bin\\javaw.exe");
        assert_eq!(owner(java, &running), Some(MINECRAFT));
    }

    #[test]
    fn keeps_profiles_and_cleans_up() {
        let dir = std::env::temp_dir().join(format!("rago-display-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let d = Display::new(&dir);
        let p = Profile { colors: Some(Colors { vibrance: 80, ..Colors::default() }), resolution: None, pro: Some("tenz".into()) };
        d.set_profile("riot:valorant", Some(p.clone()));
        d.set_profile("mc:lunar", Some(Profile { colors: Some(Colors { vibrance: 250, ..Colors::default() }), ..Profile::default() }));
        let again = Display::new(&dir);
        assert_eq!(again.profiles().get("riot:valorant"), Some(&p));
        assert_eq!(again.profiles().get(MINECRAFT).and_then(|p| p.colors).map(|c| c.vibrance), Some(100));
        // profil vide : retiré, et le fichier disparaît avec le dernier
        again.set_profile("riot:valorant", Some(Profile::default()));
        again.set_profile(MINECRAFT, None);
        assert!(again.profiles().is_empty());
        assert!(!dir.join("display.json").exists());
        // rien n'est posé hors Windows : l'état reste vide
        assert_eq!(again.tick(vec![("riot:valorant".into(), "c:\\riot\\".into())], false), None);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn sets_nothing_once_the_app_closes() {
        let dir = std::env::temp_dir().join(format!("rago-display-exit-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let d = Display::new(&dir);
        let res = Resolution { width: 1280, height: 960, stretch: true, game_file: false };
        d.set_profile("steam:730", Some(Profile { resolution: Some(res), ..Profile::default() }));
        d.shutdown();
        assert_eq!(d.tick(vec![("steam:730".into(), "c:\\cs2\\".into())], false), None);
        assert_eq!(d.state(), State::default());
        assert!(!dir.join("display-restore.json").exists());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn sorts_modes_biggest_first() {
        let modes = unique_modes(vec![(1280, 960), (1920, 1080), (1280, 960), (800, 600), (640, 400), (1440, 1080)]);
        assert_eq!(modes, vec![(1920, 1080), (1440, 1080), (1280, 960), (800, 600)]);
    }
}
