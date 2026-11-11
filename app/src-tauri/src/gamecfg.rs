//! Graphismes des jeux (Sofiene, 11/11/2026 : « comme OptiFine dans Minecraft, pour tous les jeux ») : trois niveaux
//! par jeu, écrits dans les fichiers de réglages que le jeu a lui-même créés.
//! - Performance : tout au plus bas, le plus de FPS possible.
//! - Équilibré : ce que joue la plupart des joueurs compétitifs (image lisible, FPS hauts).
//! - Qualité : tout au plus haut.
//!
//! Règles :
//! - Rago ne change que des clés que le jeu a déjà écrites. Il n'en ajoute jamais, sauf celles marquées `add` (le mode de
//!   rendu de Fortnite, une section standard d'Unreal Engine que le jeu n'écrit pas toujours).
//! - Jamais pendant que le jeu tourne : il réécrit ses réglages en quittant et effacerait ceux de Rago.
//! - Avant la première écriture, une copie du fichier est gardée à côté (`<fichier>.rago-original`) ; « Remettre mes
//!   réglages » la remet et la supprime. Une deuxième écriture (un autre niveau) ne remplace pas cette copie.
//! - Un fichier en lecture seule n'est pas touché : le joueur l'a verrouillé exprès (souvent pour une résolution étirée).
//! - Aucune clé de résolution ni de mode d'affichage : elles appartiennent aux résolutions des pros (autre fil, display.rs).
//! - Rago tourne en administrateur, parfois avec un autre compte que celui du joueur : les dossiers de tous les comptes
//!   du PC sont regardés, comme pour la bibliothèque de jeux.
//!
//! Sources des clés (11/11) : fichiers réels publiés par des joueurs et outils qui les modifient (voir le vault,
//! « Graphismes des jeux »). Jamais testé sur Windows tant que Sofiene ne l'a pas essayé.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Level {
    Performance,
    Balanced,
    Quality,
}

impl Level {
    pub const ALL: [Level; 3] = [Level::Performance, Level::Balanced, Level::Quality];

    pub fn parse(s: &str) -> Option<Level> {
        Level::ALL.into_iter().find(|l| l.id() == s)
    }

    pub fn id(self) -> &'static str {
        match self {
            Level::Performance => "performance",
            Level::Balanced => "balanced",
            Level::Quality => "quality",
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Format {
    /// `cle=valeur` sous des `[sections]` (Unreal Engine : GameUserSettings.ini)
    Ini,
    /// `"cle"  "valeur"` dans un bloc `{ }` (Source 2 : cs2_video.txt, videoconfig.txt d'Apex)
    Kv,
}

#[derive(Clone, Copy)]
enum Base {
    /// AppData\Local de chaque compte
    Local,
    /// dossier de chaque compte (C:\Users\x)
    Home,
    /// dossier d'installation de Steam
    Steam,
}

struct Place {
    base: Base,
    /// sous-dossiers à partir de la base ; `*` = chacun des sous-dossiers (un par compte du jeu, par exemple)
    dir: &'static str,
    file: &'static str,
    format: Format,
}

/// Une valeur à écrire. `add` : la section où l'ajouter si le jeu ne l'a pas encore écrite (fichiers ini seulement).
pub struct Set {
    pub key: &'static str,
    pub val: &'static str,
    add: Option<&'static str>,
}

const fn s(key: &'static str, val: &'static str) -> Set {
    Set { key, val, add: None }
}

const fn add(section: &'static str, key: &'static str, val: &'static str) -> Set {
    Set { key, val, add: Some(section) }
}

pub struct Def {
    pub id: &'static str,
    places: &'static [Place],
    /// exes du jeu, en minuscules ; `*` à la fin = tout exe qui commence ainsi
    exes: &'static [&'static str],
    performance: &'static [Set],
    balanced: &'static [Set],
    quality: &'static [Set],
}

impl Def {
    pub fn values(&self, level: Level) -> &'static [Set] {
        match level {
            Level::Performance => self.performance,
            Level::Balanced => self.balanced,
            Level::Quality => self.quality,
        }
    }
}

// ---------- Les jeux ----------

/// Valorant : GameUserSettings.ini de chaque compte Riot (Config\<compte>\Windows), groupes de qualité d'Unreal Engine
/// (0 = le plus bas). Les options du compte Riot (vignette, bloom, distorsion : RiotUserSettings.ini, synchronisé avec
/// le compte) ne sont pas touchées.
const VALORANT: Def = Def {
    id: "valorant",
    places: &[
        Place { base: Base::Local, dir: "VALORANT\\Saved\\Config\\*\\Windows", file: "GameUserSettings.ini", format: Format::Ini },
        Place { base: Base::Local, dir: "VALORANT\\Saved\\Config\\Windows", file: "GameUserSettings.ini", format: Format::Ini },
    ],
    exes: &["valorant-win64-shipping.exe", "valorant.exe"],
    performance: &[
        s("sg.ViewDistanceQuality", "0"),
        s("sg.AntiAliasingQuality", "0"),
        s("sg.ShadowQuality", "0"),
        s("sg.PostProcessQuality", "0"),
        s("sg.TextureQuality", "0"),
        s("sg.EffectsQuality", "0"),
        s("sg.FoliageQuality", "0"),
        s("sg.ShadingQuality", "0"),
        s("bUseVSync", "False"),
    ],
    // les pros : matériaux et détails bas, pas d'ombres ni d'effets d'image, anti-crénelage gardé pour une image nette
    balanced: &[
        s("sg.ViewDistanceQuality", "1"),
        s("sg.AntiAliasingQuality", "2"),
        s("sg.ShadowQuality", "0"),
        s("sg.PostProcessQuality", "0"),
        s("sg.TextureQuality", "1"),
        s("sg.EffectsQuality", "0"),
        s("sg.FoliageQuality", "0"),
        s("sg.ShadingQuality", "1"),
        s("bUseVSync", "False"),
    ],
    quality: &[
        s("sg.ViewDistanceQuality", "3"),
        s("sg.AntiAliasingQuality", "3"),
        s("sg.ShadowQuality", "3"),
        s("sg.PostProcessQuality", "3"),
        s("sg.TextureQuality", "3"),
        s("sg.EffectsQuality", "3"),
        s("sg.FoliageQuality", "3"),
        s("sg.ShadingQuality", "3"),
    ],
};

/// Fortnite : GameUserSettings.ini (WindowsClient). Mode de rendu dans [D3DRHIPreference] : dx11 + es31 = mode
/// Performance, dx12 + sm6 = DirectX 12 (le jeu redescend seul si la carte ne suit pas). [PerformanceMode] MeshQuality :
/// qualité des modèles en mode Performance.
const FORTNITE: Def = Def {
    id: "fortnite",
    places: &[Place { base: Base::Local, dir: "FortniteGame\\Saved\\Config\\WindowsClient", file: "GameUserSettings.ini", format: Format::Ini }],
    exes: &["fortniteclient-win64-shipping*", "fortnitelauncher.exe"],
    performance: &[
        add("D3DRHIPreference", "PreferredRHI", "dx11"),
        add("D3DRHIPreference", "PreferredFeatureLevel", "es31"),
        s("MeshQuality", "0"),
        s("sg.ViewDistanceQuality", "0"),
        s("sg.AntiAliasingQuality", "0"),
        s("sg.ShadowQuality", "0"),
        s("sg.GlobalIlluminationQuality", "0"),
        s("sg.ReflectionQuality", "0"),
        s("sg.PostProcessQuality", "0"),
        s("sg.TextureQuality", "0"),
        s("sg.EffectsQuality", "0"),
        s("sg.FoliageQuality", "0"),
        s("sg.ShadingQuality", "0"),
        s("DesiredGlobalIlluminationQuality", "0"),
        s("DesiredReflectionQuality", "0"),
        s("bUseNanite", "False"),
        s("bRayTracing", "False"),
        s("FortAntiAliasingMethod", "Disabled"),
        s("bMotionBlur", "False"),
        s("bShowGrass", "False"),
        s("bUseVSync", "False"),
    ],
    // le réglage de la plupart des joueurs compétitifs : mode Performance, distance d'affichage au max pour voir loin,
    // textures et modèles moyens, rien qui gêne la vue (herbe, flou)
    balanced: &[
        add("D3DRHIPreference", "PreferredRHI", "dx11"),
        add("D3DRHIPreference", "PreferredFeatureLevel", "es31"),
        s("MeshQuality", "1"),
        s("sg.ViewDistanceQuality", "3"),
        s("sg.AntiAliasingQuality", "0"),
        s("sg.ShadowQuality", "0"),
        s("sg.GlobalIlluminationQuality", "0"),
        s("sg.ReflectionQuality", "0"),
        s("sg.PostProcessQuality", "0"),
        s("sg.TextureQuality", "1"),
        s("sg.EffectsQuality", "0"),
        s("sg.FoliageQuality", "0"),
        s("sg.ShadingQuality", "0"),
        s("DesiredGlobalIlluminationQuality", "0"),
        s("DesiredReflectionQuality", "0"),
        s("bUseNanite", "False"),
        s("bRayTracing", "False"),
        s("bMotionBlur", "False"),
        s("bShowGrass", "False"),
        s("bUseVSync", "False"),
    ],
    quality: &[
        add("D3DRHIPreference", "PreferredRHI", "dx12"),
        add("D3DRHIPreference", "PreferredFeatureLevel", "sm6"),
        s("sg.ViewDistanceQuality", "3"),
        s("sg.AntiAliasingQuality", "3"),
        s("sg.ShadowQuality", "3"),
        s("sg.GlobalIlluminationQuality", "3"),
        s("sg.ReflectionQuality", "3"),
        s("sg.PostProcessQuality", "3"),
        s("sg.TextureQuality", "3"),
        s("sg.EffectsQuality", "3"),
        s("sg.FoliageQuality", "3"),
        s("sg.ShadingQuality", "3"),
        s("DesiredGlobalIlluminationQuality", "3"),
        s("DesiredReflectionQuality", "3"),
        s("bUseNanite", "True"),
        s("bShowGrass", "True"),
    ],
};

/// Counter-Strike 2 : cs2_video.txt de chaque compte Steam (userdata\<compte>\730\local\cfg). « Autoconfig » 2 = préréglage
/// personnalisé (sinon le jeu peut remettre le sien). Ombres, textures : 0 bas, 1 moyen, 2 haut ; filtrage : 0 bilinéaire,
/// 1 trilinéaire, 2 à 5 anisotrope 2x à 16x ; HDR : 3 performance, -1 qualité.
const CS2: Def = Def {
    id: "cs2",
    places: &[Place { base: Base::Steam, dir: "userdata\\*\\730\\local\\cfg", file: "cs2_video.txt", format: Format::Kv }],
    exes: &["cs2.exe"],
    performance: &[
        s("Autoconfig", "2"),
        s("setting.shaderquality", "0"),
        s("setting.r_texturefilteringquality", "0"),
        s("setting.msaa_samples", "0"),
        s("setting.r_csgo_cmaa_enable", "0"),
        s("setting.videocfg_shadow_quality", "0"),
        s("setting.videocfg_dynamic_shadows", "0"),
        s("setting.videocfg_texture_detail", "0"),
        s("setting.videocfg_particle_detail", "0"),
        s("setting.videocfg_ao_detail", "0"),
        s("setting.videocfg_hdr_detail", "3"),
        s("setting.videocfg_fsr_detail", "0"),
        s("setting.mat_vsync", "0"),
    ],
    // les pros : ombres hautes et dynamiques (on voit l'ombre des ennemis de plus loin), MSAA 4x, le reste bas
    balanced: &[
        s("Autoconfig", "2"),
        s("setting.shaderquality", "0"),
        s("setting.r_texturefilteringquality", "3"),
        s("setting.msaa_samples", "4"),
        s("setting.r_csgo_cmaa_enable", "0"),
        s("setting.videocfg_shadow_quality", "2"),
        s("setting.videocfg_dynamic_shadows", "1"),
        s("setting.videocfg_texture_detail", "1"),
        s("setting.videocfg_particle_detail", "0"),
        s("setting.videocfg_ao_detail", "0"),
        s("setting.videocfg_hdr_detail", "3"),
        s("setting.videocfg_fsr_detail", "0"),
        s("setting.mat_vsync", "0"),
    ],
    quality: &[
        s("Autoconfig", "2"),
        s("setting.shaderquality", "1"),
        s("setting.r_texturefilteringquality", "5"),
        s("setting.msaa_samples", "8"),
        s("setting.r_csgo_cmaa_enable", "0"),
        s("setting.videocfg_shadow_quality", "2"),
        s("setting.videocfg_dynamic_shadows", "1"),
        s("setting.videocfg_texture_detail", "2"),
        s("setting.videocfg_particle_detail", "2"),
        s("setting.videocfg_ao_detail", "2"),
        s("setting.videocfg_hdr_detail", "-1"),
        s("setting.videocfg_fsr_detail", "0"),
    ],
};

/// Apex Legends : videoconfig.txt (Saved Games\Respawn\Apex\local). Budget de textures en Ko (160000 ≈ 2 Go,
/// 600000 ≈ 3 Go, 1000000 ≈ 4 Go) ; anti-crénelage 0 aucun, 12 TSAA ; détail des modèles 0.6 bas à 1.0 haut.
const APEX: Def = Def {
    id: "apex",
    places: &[Place { base: Base::Home, dir: "Saved Games\\Respawn\\Apex\\local", file: "videoconfig.txt", format: Format::Kv }],
    exes: &["r5apex.exe", "r5apex_dx12.exe"],
    performance: &[
        s("setting.mat_antialias_mode", "0"),
        s("setting.stream_memory", "160000"),
        s("setting.mat_forceaniso", "1"),
        s("setting.mat_mip_linear", "0"),
        s("setting.ssao_enabled", "0"),
        s("setting.ssao_quality", "0"),
        s("setting.csm_coverage", "1"),
        s("setting.csm_cascade_res", "512"),
        s("setting.volumetric_lighting", "0"),
        s("setting.shadow_maxdynamic", "0"),
        s("setting.r_lod_switch_scale", "0.6"),
        s("setting.particle_cpu_level", "0"),
        s("setting.r_decals", "0"),
        s("setting.r_createmodeldecals", "0"),
        s("setting.cl_ragdoll_maxcount", "0"),
        s("setting.mat_vsync_mode", "0"),
        s("setting.dvs_enable", "0"),
    ],
    balanced: &[
        s("setting.mat_antialias_mode", "12"),
        s("setting.stream_memory", "600000"),
        s("setting.mat_forceaniso", "4"),
        s("setting.mat_mip_linear", "1"),
        s("setting.ssao_enabled", "0"),
        s("setting.ssao_quality", "0"),
        s("setting.csm_coverage", "1"),
        s("setting.csm_cascade_res", "512"),
        s("setting.volumetric_lighting", "0"),
        s("setting.shadow_maxdynamic", "0"),
        s("setting.r_lod_switch_scale", "0.8"),
        s("setting.particle_cpu_level", "1"),
        s("setting.cl_ragdoll_maxcount", "4"),
        s("setting.mat_vsync_mode", "0"),
        s("setting.dvs_enable", "0"),
    ],
    quality: &[
        s("setting.mat_antialias_mode", "12"),
        s("setting.stream_memory", "1000000"),
        s("setting.mat_forceaniso", "16"),
        s("setting.mat_mip_linear", "1"),
        s("setting.ssao_enabled", "1"),
        s("setting.ssao_quality", "2"),
        s("setting.csm_coverage", "2"),
        s("setting.csm_cascade_res", "1024"),
        s("setting.volumetric_lighting", "1"),
        s("setting.shadow_maxdynamic", "4"),
        s("setting.r_lod_switch_scale", "1.0"),
        s("setting.particle_cpu_level", "2"),
        s("setting.r_decals", "256"),
        s("setting.r_createmodeldecals", "1"),
        s("setting.cl_ragdoll_maxcount", "8"),
    ],
};

/// Jeux Unreal Engine 5 sans réglage propre connu : les groupes de qualité standard (0 bas à 3 épique).
const UE_PERFORMANCE: &[Set] = &[
    s("sg.ViewDistanceQuality", "0"),
    s("sg.AntiAliasingQuality", "0"),
    s("sg.ShadowQuality", "0"),
    s("sg.GlobalIlluminationQuality", "0"),
    s("sg.ReflectionQuality", "0"),
    s("sg.PostProcessQuality", "0"),
    s("sg.TextureQuality", "0"),
    s("sg.EffectsQuality", "0"),
    s("sg.FoliageQuality", "0"),
    s("sg.ShadingQuality", "0"),
    s("bUseVSync", "False"),
];
const UE_BALANCED: &[Set] = &[
    s("sg.ViewDistanceQuality", "2"),
    s("sg.AntiAliasingQuality", "2"),
    s("sg.ShadowQuality", "1"),
    s("sg.GlobalIlluminationQuality", "1"),
    s("sg.ReflectionQuality", "1"),
    s("sg.PostProcessQuality", "1"),
    s("sg.TextureQuality", "2"),
    s("sg.EffectsQuality", "1"),
    s("sg.FoliageQuality", "1"),
    s("sg.ShadingQuality", "1"),
    s("bUseVSync", "False"),
];
const UE_QUALITY: &[Set] = &[
    s("sg.ViewDistanceQuality", "3"),
    s("sg.AntiAliasingQuality", "3"),
    s("sg.ShadowQuality", "3"),
    s("sg.GlobalIlluminationQuality", "3"),
    s("sg.ReflectionQuality", "3"),
    s("sg.PostProcessQuality", "3"),
    s("sg.TextureQuality", "3"),
    s("sg.EffectsQuality", "3"),
    s("sg.FoliageQuality", "3"),
    s("sg.ShadingQuality", "3"),
];

/// Marvel Rivals : projet Unreal « Marvel » (AppData\Local\Marvel\Saved\Config\Windows).
const RIVALS: Def = Def {
    id: "rivals",
    places: &[Place { base: Base::Local, dir: "Marvel\\Saved\\Config\\*", file: "GameUserSettings.ini", format: Format::Ini }],
    exes: &["marvel-win64-shipping.exe", "marvelrivals_launcher.exe"],
    performance: UE_PERFORMANCE,
    balanced: UE_BALANCED,
    quality: UE_QUALITY,
};

/// The Finals : projet Unreal « Discovery » (AppData\Local\Discovery\Saved\Config\WindowsClient).
const FINALS: Def = Def {
    id: "finals",
    places: &[Place { base: Base::Local, dir: "Discovery\\Saved\\Config\\*", file: "GameUserSettings.ini", format: Format::Ini }],
    exes: &["discovery.exe"],
    performance: UE_PERFORMANCE,
    balanced: UE_BALANCED,
    quality: UE_QUALITY,
};

pub const GAMES: [&Def; 6] = [&VALORANT, &FORTNITE, &CS2, &APEX, &RIVALS, &FINALS];

pub fn def(id: &str) -> Option<&'static Def> {
    GAMES.into_iter().find(|d| d.id == id)
}

/// Clés de résolution et d'affichage : jamais touchées ici (résolutions des pros, display.rs).
#[cfg(test)]
const DISPLAY_KEYS: &[&str] = &[
    "ResolutionSizeX",
    "ResolutionSizeY",
    "LastUserConfirmedResolutionSizeX",
    "LastUserConfirmedResolutionSizeY",
    "DesiredScreenWidth",
    "DesiredScreenHeight",
    "LastUserConfirmedDesiredScreenWidth",
    "LastUserConfirmedDesiredScreenHeight",
    "FullscreenMode",
    "LastConfirmedFullscreenMode",
    "PreferredFullscreenMode",
    "bShouldLetterbox",
    "bLastConfirmedShouldLetterbox",
    "sg.ResolutionQuality",
    "setting.defaultres",
    "setting.defaultresheight",
    "setting.aspectratiomode",
    "setting.fullscreen",
    "setting.nowindowborder",
];

// ---------- Où sont les fichiers ----------

/// Dossiers de départ, un par compte Windows (et par installation de Steam).
#[derive(Default, Debug, Clone)]
pub struct Roots {
    pub local: Vec<PathBuf>,
    pub home: Vec<PathBuf>,
    pub steam: Vec<PathBuf>,
}

impl Roots {
    #[cfg(windows)]
    pub fn detect() -> Roots {
        let local = crate::games::local_dirs();
        // C:\Users\x\AppData\Local -> C:\Users\x
        let home = local.iter().filter_map(|l| l.parent().and_then(Path::parent)).map(Path::to_path_buf).collect();
        let mut steam: Vec<PathBuf> = Vec::new();
        for p in [crate::reg::string("HKCU\\Software\\Valve\\Steam", "SteamPath"), crate::reg::string("HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath")]
            .into_iter()
            .flatten()
        {
            let p = PathBuf::from(p.replace('/', "\\"));
            if !steam.iter().any(|s| s.as_os_str().eq_ignore_ascii_case(p.as_os_str())) {
                steam.push(p);
            }
        }
        Roots { local, home, steam }
    }

    #[cfg(not(windows))]
    pub fn detect() -> Roots {
        Roots::default()
    }

    fn of(&self, base: Base) -> &[PathBuf] {
        match base {
            Base::Local => &self.local,
            Base::Home => &self.home,
            Base::Steam => &self.steam,
        }
    }
}

/// Dossiers qui correspondent à `dir` sous `base` (`*` = chacun des sous-dossiers).
fn expand(base: &Path, dir: &str) -> Vec<PathBuf> {
    let mut paths = vec![base.to_path_buf()];
    for part in dir.split('\\').filter(|p| !p.is_empty()) {
        let mut next = Vec::new();
        for p in &paths {
            if part == "*" {
                if let Ok(rd) = fs::read_dir(p) {
                    let mut subs: Vec<PathBuf> = rd.flatten().map(|e| e.path()).filter(|p| p.is_dir()).collect();
                    subs.sort();
                    next.extend(subs);
                }
            } else {
                let q = p.join(part);
                if q.is_dir() {
                    next.push(q);
                }
            }
        }
        paths = next;
    }
    paths
}

/// Fichiers de réglages du jeu présents sur ce PC.
pub fn files(def: &Def, roots: &Roots) -> Vec<(PathBuf, Format)> {
    let mut out: Vec<(PathBuf, Format)> = Vec::new();
    for place in def.places {
        for base in roots.of(place.base) {
            for dir in expand(base, place.dir) {
                let f = dir.join(place.file);
                let key = f.to_string_lossy().to_lowercase();
                if f.is_file() && !out.iter().any(|(o, _)| o.to_string_lossy().to_lowercase() == key) {
                    out.push((f, place.format));
                }
            }
        }
    }
    out
}

/// Le jeu tourne-t-il ? `exes` : noms des exes lancés, en minuscules.
pub fn running(def: &Def, exes: &[String]) -> bool {
    exes.iter().any(|e| {
        def.exes.iter().any(|x| match x.strip_suffix('*') {
            Some(prefix) => e.starts_with(prefix),
            None => e == x,
        })
    })
}

// ---------- Lire et écrire ----------

/// Texte du fichier et ce qu'il faut pour le réécrire à l'identique (BOM UTF-8, ou UTF-16 qu'Unreal écrit parfois).
#[derive(Clone, Copy, PartialEq, Debug)]
enum Encoding {
    Utf8,
    Utf8Bom,
    Utf16Le,
}

fn decode(bytes: &[u8]) -> Option<(String, Encoding)> {
    if let Some(rest) = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]) {
        return String::from_utf8(rest.to_vec()).ok().map(|s| (s, Encoding::Utf8Bom));
    }
    if let Some(rest) = bytes.strip_prefix(&[0xFF, 0xFE]) {
        if rest.len() % 2 != 0 {
            return None;
        }
        let units: Vec<u16> = rest.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        return String::from_utf16(&units).ok().map(|s| (s, Encoding::Utf16Le));
    }
    String::from_utf8(bytes.to_vec()).ok().map(|s| (s, Encoding::Utf8))
}

fn encode(text: &str, enc: Encoding) -> Vec<u8> {
    match enc {
        Encoding::Utf8 => text.as_bytes().to_vec(),
        Encoding::Utf8Bom => [&[0xEF, 0xBB, 0xBF][..], text.as_bytes()].concat(),
        Encoding::Utf16Le => {
            let mut out = vec![0xFF, 0xFE];
            for u in text.encode_utf16() {
                out.extend_from_slice(&u.to_le_bytes());
            }
            out
        }
    }
}

/// Clé et valeur d'une ligne, en positions dans la ligne (sans sa fin de ligne).
fn parse_line(line: &str, format: Format) -> Option<(std::ops::Range<usize>, std::ops::Range<usize>)> {
    match format {
        Format::Ini => {
            let t = line.trim_start();
            if t.is_empty() || t.starts_with('[') || t.starts_with(';') || t.starts_with('#') {
                return None;
            }
            let eq = line.find('=')?;
            let start = line.len() - t.len();
            let key_end = start + line[start..eq].trim_end().len();
            if key_end <= start {
                return None;
            }
            Some((start..key_end, eq + 1..line.len()))
        }
        Format::Kv => {
            // "cle"<espaces>"valeur"
            let start = line.len() - line.trim_start().len();
            let rest = line[start..].strip_prefix('"')?;
            let key_end = start + 1 + rest.find('"')?;
            let after = &line[key_end + 1..];
            let gap = after.len() - after.trim_start().len();
            if gap == 0 {
                return None;
            }
            let val_start = key_end + 1 + gap + 1;
            if !line[key_end + 1 + gap..].starts_with('"') {
                return None;
            }
            let val_end = val_start + line[val_start..].find('"')?;
            Some((start + 1..key_end, val_start..val_end))
        }
    }
}

/// Une ligne sans sa fin (`\n` ou `\r\n`), et cette fin.
fn split_ending(chunk: &str) -> (&str, &str) {
    if let Some(l) = chunk.strip_suffix("\r\n") {
        (l, "\r\n")
    } else if let Some(l) = chunk.strip_suffix('\n') {
        (l, "\n")
    } else {
        (chunk, "")
    }
}

/// Valeurs actuelles des clés du fichier (dernière occurrence).
fn read_values(text: &str, format: Format) -> Vec<(String, String)> {
    let mut out: Vec<(String, String)> = Vec::new();
    for chunk in text.split_inclusive('\n') {
        let (line, _) = split_ending(chunk);
        if let Some((k, v)) = parse_line(line, format) {
            let key = line[k].to_string();
            let val = line[v].trim().to_string();
            match out.iter_mut().find(|(o, _)| o.eq_ignore_ascii_case(&key)) {
                Some(slot) => slot.1 = val,
                None => out.push((key, val)),
            }
        }
    }
    out
}

fn same(a: &str, b: &str) -> bool {
    a.trim().eq_ignore_ascii_case(b.trim())
}

#[derive(Debug, PartialEq)]
struct Edited {
    text: String,
    /// clés du niveau trouvées (ou ajoutées)
    found: usize,
    /// valeurs réellement changées
    changed: usize,
}

/// Remplace les valeurs connues ligne par ligne ; le reste du fichier (ordre, fins de ligne, autres clés) ne bouge pas.
fn edit(text: &str, format: Format, values: &[Set]) -> Edited {
    let mut out = String::with_capacity(text.len() + 64);
    let mut seen = vec![false; values.len()];
    let mut changed = 0;
    for chunk in text.split_inclusive('\n') {
        let (line, ending) = split_ending(chunk);
        let hit = parse_line(line, format).and_then(|(k, v)| values.iter().position(|s| line[k.clone()].eq_ignore_ascii_case(s.key)).map(|i| (i, v)));
        match hit {
            Some((i, v)) => {
                seen[i] = true;
                if same(&line[v.clone()], values[i].val) {
                    out.push_str(chunk);
                } else {
                    changed += 1;
                    out.push_str(&line[..v.start]);
                    out.push_str(values[i].val);
                    out.push_str(&line[v.end..]);
                    out.push_str(ending);
                }
            }
            None => out.push_str(chunk),
        }
    }
    let mut found = seen.iter().filter(|s| **s).count();
    if format == Format::Ini {
        let nl = if text.contains("\r\n") { "\r\n" } else { "\n" };
        for (i, set) in values.iter().enumerate() {
            if let (false, Some(section)) = (seen[i], set.add) {
                out = add_to_section(&out, section, &format!("{}={}", set.key, set.val), nl);
                found += 1;
                changed += 1;
            }
        }
    }
    Edited { text: out, found, changed }
}

/// Ajoute `line` à la fin de `[section]` (créée à la fin du fichier si elle n'existe pas).
fn add_to_section(text: &str, section: &str, line: &str, nl: &str) -> String {
    let header = format!("[{section}]");
    let chunks: Vec<&str> = text.split_inclusive('\n').collect();
    let Some(h) = chunks.iter().position(|c| split_ending(c).0.trim().eq_ignore_ascii_case(&header)) else {
        let mut out = text.to_string();
        if !out.is_empty() && !out.ends_with('\n') {
            out.push_str(nl);
        }
        if !out.is_empty() && !out.ends_with(&format!("{nl}{nl}")) {
            out.push_str(nl);
        }
        out.push_str(&format!("{header}{nl}{line}{nl}"));
        return out;
    };
    // dernière ligne non vide de la section
    let mut end = h + 1;
    let mut last = h;
    while end < chunks.len() && !split_ending(chunks[end]).0.trim_start().starts_with('[') {
        if !split_ending(chunks[end]).0.trim().is_empty() {
            last = end;
        }
        end += 1;
    }
    let mut out = String::new();
    for (i, c) in chunks.iter().enumerate() {
        out.push_str(c);
        if i == last {
            if !c.ends_with('\n') {
                out.push_str(nl);
            }
            out.push_str(line);
            out.push_str(nl);
        }
    }
    out
}

// ---------- Ce que voit l'interface ----------

fn backup_of(file: &Path) -> PathBuf {
    let mut name = file.file_name().unwrap_or_default().to_os_string();
    name.push(".rago-original");
    file.with_file_name(name)
}

fn read_only(file: &Path) -> bool {
    fs::metadata(file).map(|m| m.permissions().readonly()).unwrap_or(false)
}

#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    /// fichiers de réglages trouvés (un par compte du jeu, souvent un seul)
    pub files: usize,
    /// dont verrouillés en lecture seule par le joueur
    pub locked: usize,
    /// niveau que les fichiers ont en ce moment, s'il correspond à l'un des trois
    pub level: Option<&'static str>,
    /// une copie d'avant Rago existe : « Remettre mes réglages » est possible
    pub saved: bool,
    pub running: bool,
}

/// Niveau dont toutes les valeurs connues sont celles des fichiers.
fn current_level(def: &Def, files: &[(PathBuf, Format)]) -> Option<&'static str> {
    let read: Vec<Vec<(String, String)>> = files
        .iter()
        .filter_map(|(f, format)| fs::read(f).ok().and_then(|b| decode(&b)).map(|(t, _)| read_values(&t, *format)))
        .collect();
    if read.is_empty() {
        return None;
    }
    Level::ALL.into_iter().map(|l| (l, def.values(l))).find_map(|(level, values)| {
        let mut any = false;
        for vals in &read {
            for set in values {
                if let Some((_, v)) = vals.iter().find(|(k, _)| k.eq_ignore_ascii_case(set.key)) {
                    if !same(v, set.val) {
                        return None;
                    }
                    any = true;
                }
            }
        }
        any.then_some(level.id())
    })
}

pub fn status(def: &Def, files: &[(PathBuf, Format)], running_now: bool) -> Status {
    Status {
        files: files.len(),
        locked: files.iter().filter(|(f, _)| read_only(f)).count(),
        level: current_level(def, files),
        saved: files.iter().any(|(f, _)| backup_of(f).is_file()),
        running: running_now,
    }
}

#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    /// fichiers écrits
    pub files: usize,
    /// valeurs changées en tout
    pub changed: usize,
    /// fichiers laissés tels quels car en lecture seule
    pub locked: usize,
}

/// Écrit le niveau dans chaque fichier. Erreurs lisibles par l'interface : `running`, `not_found`, `locked`,
/// `unknown_format`, sinon le message du système.
pub fn apply(def: &Def, level: Level, files: &[(PathBuf, Format)], running_now: bool) -> Result<Outcome, String> {
    if running_now {
        return Err("running".into());
    }
    if files.is_empty() {
        return Err("not_found".into());
    }
    let values = def.values(level);
    let mut out = Outcome { files: 0, changed: 0, locked: 0 };
    let mut known = 0;
    for (file, format) in files {
        if read_only(file) {
            out.locked += 1;
            continue;
        }
        let bytes = fs::read(file).map_err(|e| format!("{}: {e}", file.display()))?;
        let Some((text, enc)) = decode(&bytes) else { continue };
        let ed = edit(&text, *format, values);
        if ed.found == 0 {
            continue;
        }
        known += 1;
        if ed.changed == 0 {
            continue;
        }
        let backup = backup_of(file);
        if !backup.exists() {
            fs::write(&backup, &bytes).map_err(|e| format!("{}: {e}", backup.display()))?;
        }
        fs::write(file, encode(&ed.text, enc)).map_err(|e| format!("{}: {e}", file.display()))?;
        out.files += 1;
        out.changed += ed.changed;
    }
    if known == 0 {
        return Err(if out.locked > 0 { "locked" } else { "unknown_format" }.into());
    }
    Ok(out)
}

/// Remet les fichiers d'avant Rago et supprime les copies. Renvoie le nombre de fichiers remis.
pub fn restore(files: &[(PathBuf, Format)], running_now: bool) -> Result<usize, String> {
    if running_now {
        return Err("running".into());
    }
    let mut done = 0;
    let mut locked = 0;
    for (file, _) in files {
        let backup = backup_of(file);
        if !backup.is_file() {
            continue;
        }
        if read_only(file) {
            locked += 1;
            continue;
        }
        fs::copy(&backup, file).map_err(|e| format!("{}: {e}", file.display()))?;
        let _ = fs::remove_file(&backup);
        done += 1;
    }
    match (done, locked) {
        (0, 0) => Err("no_backup".into()),
        (0, _) => Err("locked".into()),
        _ => Ok(done),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("rago-gfx-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    const UE_FILE: &str = "[/Script/ShooterGame.ShooterGameUserSettings]\r\nbUseVSync=True\r\nResolutionSizeX=1280\r\n\r\n[ScalabilityGroups]\r\nsg.ResolutionQuality=100.000000\r\nsg.ViewDistanceQuality=3\r\nsg.AntiAliasingQuality=3\r\nsg.ShadowQuality=3\r\nsg.PostProcessQuality=3\r\nsg.TextureQuality=2\r\nsg.EffectsQuality=3\r\nsg.FoliageQuality=3\r\nsg.ShadingQuality=3\r\n\r\n[ShaderPipelineCache.CacheFile]\r\nLastOpened=ShooterGame\r\n";

    const CS2_FILE: &str = "\"video.cfg\"\n{\n\t\"Version\"\t\t\"15\"\n\t\"setting.defaultres\"\t\t\"1440\"\n\t\"setting.mat_vsync\"\t\t\"1\"\n\t\"Autoconfig\"\t\t\"2\"\n\t\"setting.shaderquality\"\t\t\"1\"\n\t\"setting.videocfg_hdr_detail\"\t\t\"-1\"\n}\n";

    #[test]
    fn ini_edit_changes_only_known_keys_and_keeps_the_rest() {
        let ed = edit(UE_FILE, Format::Ini, VALORANT.performance);
        assert_eq!(ed.found, 9);
        assert_eq!(ed.changed, 9);
        assert!(ed.text.contains("sg.ShadowQuality=0\r\n"));
        assert!(ed.text.contains("bUseVSync=False\r\n"));
        // résolution, lignes vides, autres sections : identiques
        assert!(ed.text.contains("ResolutionSizeX=1280\r\n\r\n[ScalabilityGroups]\r\nsg.ResolutionQuality=100.000000\r\n"));
        assert!(ed.text.ends_with("[ShaderPipelineCache.CacheFile]\r\nLastOpened=ShooterGame\r\n"));
        assert_eq!(ed.text.lines().count(), UE_FILE.lines().count());
        // deuxième passage : rien à changer
        assert_eq!(edit(&ed.text, Format::Ini, VALORANT.performance).changed, 0);
    }

    #[test]
    fn kv_edit_keeps_tabs_and_quotes() {
        let ed = edit(CS2_FILE, Format::Kv, CS2.performance);
        assert!(ed.text.contains("\t\"setting.mat_vsync\"\t\t\"0\"\n"));
        assert!(ed.text.contains("\t\"setting.shaderquality\"\t\t\"0\"\n"));
        assert!(ed.text.contains("\t\"setting.videocfg_hdr_detail\"\t\t\"3\"\n"));
        assert!(ed.text.contains("\t\"setting.defaultres\"\t\t\"1440\"\n"), "résolution jamais touchée");
        assert!(ed.text.starts_with("\"video.cfg\"\n{\n\t\"Version\"\t\t\"15\"\n"));
        // clés absentes du fichier : jamais ajoutées dans ce format
        assert!(!ed.text.contains("msaa_samples"));
        assert_eq!(ed.found, 4);
        assert_eq!(ed.changed, 3);
    }

    #[test]
    fn missing_keys_are_never_added_except_render_mode() {
        let file = "[/Script/FortniteGame.FortGameUserSettings]\nbMotionBlur=True\n\n[ScalabilityGroups]\nsg.ShadowQuality=3\n";
        let ed = edit(file, Format::Ini, FORTNITE.performance);
        assert!(!ed.text.contains("bShowGrass"), "clé absente : pas ajoutée");
        assert!(ed.text.contains("bMotionBlur=False\n"));
        assert!(ed.text.contains("sg.ShadowQuality=0\n"));
        assert!(ed.text.ends_with("sg.ShadowQuality=0\n\n[D3DRHIPreference]\nPreferredRHI=dx11\nPreferredFeatureLevel=es31\n"), "{}", ed.text);
        // section déjà là : ajouté à sa fin, avant la section suivante
        let file = "[D3DRHIPreference]\nPreferredRHI=dx12\n\n[PerformanceMode]\nMeshQuality=2\n";
        let ed = edit(file, Format::Ini, FORTNITE.balanced);
        assert_eq!(ed.text, "[D3DRHIPreference]\nPreferredRHI=dx11\nPreferredFeatureLevel=es31\n\n[PerformanceMode]\nMeshQuality=1\n");
    }

    #[test]
    fn utf16_and_bom_are_written_back_as_they_were() {
        for enc in [Encoding::Utf8, Encoding::Utf8Bom, Encoding::Utf16Le] {
            let bytes = encode(UE_FILE, enc);
            let (text, got) = decode(&bytes).unwrap();
            assert_eq!(got, enc);
            assert_eq!(encode(&text, got), bytes);
        }
        assert!(decode(&[0xFF, 0xFE, 0x41]).is_none(), "UTF-16 coupé : pas lu");
    }

    #[test]
    fn apply_keeps_the_original_once_and_restore_puts_it_back() {
        let dir = temp("apply");
        let file = dir.join("GameUserSettings.ini");
        fs::write(&file, UE_FILE).unwrap();
        let files = vec![(file.clone(), Format::Ini)];
        assert_eq!(status(&VALORANT, &files, false).level, None, "réglages du joueur : aucun niveau");

        let out = apply(&VALORANT, Level::Performance, &files, false).unwrap();
        assert_eq!(out, Outcome { files: 1, changed: 9, locked: 0 });
        let st = status(&VALORANT, &files, false);
        assert_eq!((st.level, st.saved), (Some("performance"), true));

        // un autre niveau : la copie reste celle d'avant Rago
        apply(&VALORANT, Level::Quality, &files, false).unwrap();
        assert_eq!(status(&VALORANT, &files, false).level, Some("quality"));
        assert_eq!(fs::read_to_string(backup_of(&file)).unwrap(), UE_FILE);

        assert_eq!(restore(&files, false).unwrap(), 1);
        assert_eq!(fs::read_to_string(&file).unwrap(), UE_FILE);
        assert!(!backup_of(&file).exists());
        assert_eq!(restore(&files, false).unwrap_err(), "no_backup");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn refuses_while_running_or_when_nothing_is_found() {
        let dir = temp("refuse");
        let file = dir.join("GameUserSettings.ini");
        fs::write(&file, UE_FILE).unwrap();
        let files = vec![(file.clone(), Format::Ini)];
        assert_eq!(apply(&VALORANT, Level::Performance, &files, true).unwrap_err(), "running");
        assert_eq!(fs::read_to_string(&file).unwrap(), UE_FILE);
        assert_eq!(apply(&VALORANT, Level::Performance, &[], false).unwrap_err(), "not_found");
        fs::write(&file, "[Other]\nfoo=1\n").unwrap();
        assert_eq!(apply(&VALORANT, Level::Performance, &files, false).unwrap_err(), "unknown_format");
        assert!(!backup_of(&file).exists(), "rien d'écrit, pas de copie");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn read_only_files_are_left_alone() {
        let dir = temp("locked");
        let file = dir.join("GameUserSettings.ini");
        fs::write(&file, UE_FILE).unwrap();
        let mut perm = fs::metadata(&file).unwrap().permissions();
        perm.set_readonly(true);
        fs::set_permissions(&file, perm.clone()).unwrap();
        let files = vec![(file.clone(), Format::Ini)];
        assert_eq!(status(&VALORANT, &files, false).locked, 1);
        assert_eq!(apply(&VALORANT, Level::Performance, &files, false).unwrap_err(), "locked");
        assert_eq!(fs::read_to_string(&file).unwrap(), UE_FILE);
        #[allow(clippy::permissions_set_readonly_false)]
        perm.set_readonly(false);
        fs::set_permissions(&file, perm).unwrap();
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn finds_the_files_of_every_account() {
        let dir = temp("find");
        let local = dir.join("Local");
        for account in ["aaaa-eu", "bbbb-na"] {
            let d = local.join("VALORANT").join("Saved").join("Config").join(account).join("Windows");
            fs::create_dir_all(&d).unwrap();
            fs::write(d.join("GameUserSettings.ini"), UE_FILE).unwrap();
        }
        // un dossier de compte sans fichier : ignoré
        fs::create_dir_all(local.join("VALORANT").join("Saved").join("Config").join("cccc-ap").join("Windows")).unwrap();
        let steam = dir.join("Steam");
        let cfg = steam.join("userdata").join("12345").join("730").join("local").join("cfg");
        fs::create_dir_all(&cfg).unwrap();
        fs::write(cfg.join("cs2_video.txt"), CS2_FILE).unwrap();
        let roots = Roots { local: vec![local.clone()], home: vec![dir.join("Home")], steam: vec![steam] };
        assert_eq!(files(&VALORANT, &roots).len(), 2);
        assert_eq!(files(&CS2, &roots), vec![(cfg.join("cs2_video.txt"), Format::Kv)]);
        assert!(files(&APEX, &roots).is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn expand_follows_stars() {
        let dir = temp("expand");
        fs::create_dir_all(dir.join("a").join("one").join("w")).unwrap();
        fs::create_dir_all(dir.join("a").join("two").join("w")).unwrap();
        fs::create_dir_all(dir.join("a").join("three")).unwrap();
        let got = expand(&dir, "a\\*\\w");
        assert_eq!(got, vec![dir.join("a").join("one").join("w"), dir.join("a").join("two").join("w")]);
        assert!(expand(&dir, "missing\\*").is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn running_matches_exe_names_and_prefixes() {
        let exes = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert!(running(&FORTNITE, &exes(&["explorer.exe", "fortniteclient-win64-shipping_eac_eos.exe"])));
        assert!(running(&CS2, &exes(&["cs2.exe"])));
        assert!(!running(&CS2, &exes(&["cs2launcher.exe", "steam.exe"])));
    }

    /// Contrat avec les résolutions des pros (display.rs) : aucune clé d'affichage ici, et chaque niveau a ses valeurs.
    #[test]
    fn no_display_keys_and_every_level_is_filled() {
        for def in GAMES {
            for level in Level::ALL {
                let values = def.values(level);
                assert!(!values.is_empty(), "{} {}", def.id, level.id());
                for set in values {
                    assert!(!DISPLAY_KEYS.iter().any(|k| k.eq_ignore_ascii_case(set.key)), "{} {} : {}", def.id, level.id(), set.key);
                    assert!(!set.val.is_empty());
                }
                let mut keys: Vec<String> = values.iter().map(|s| s.key.to_lowercase()).collect();
                keys.sort();
                keys.dedup();
                assert_eq!(keys.len(), values.len(), "{} {} : clé en double", def.id, level.id());
            }
            assert!(def.places.iter().all(|p| p.format == Format::Ini || def.values(Level::Quality).iter().all(|s| s.add.is_none())));
        }
        assert_eq!(Level::parse("balanced"), Some(Level::Balanced));
        assert!(Level::parse("ultra").is_none());
        assert!(def("cs2").is_some() && def("minecraft").is_none());
    }

    /// Un vrai cs2_video.txt a toutes les clés : chaque niveau se reconnaît après coup.
    #[test]
    fn levels_are_told_apart() {
        let dir = temp("levels");
        let file = dir.join("cs2_video.txt");
        let files = vec![(file.clone(), Format::Kv)];
        let mut full = String::from("\"video.cfg\"\n{\n");
        for set in CS2.performance {
            full.push_str(&format!("\t\"{}\"\t\t\"9\"\n", set.key));
        }
        full.push_str("}\n");
        for level in Level::ALL {
            fs::write(&file, &full).unwrap();
            apply(&CS2, level, &files, false).unwrap();
            assert_eq!(status(&CS2, &files, false).level, Some(level.id()));
            let _ = fs::remove_file(backup_of(&file));
        }
        fs::remove_dir_all(&dir).unwrap();
    }
}
