//! Bibliothèque de jeux (RAG-57) : les jeux installés par les launchers (Steam, Epic, Riot, Battle.net, Ubisoft
//! Connect, Xbox) et les launchers Minecraft (officiel, Lunar, Badlion, Feather, Prism, Modrinth, CurseForge), plus
//! ceux que le joueur ajoute à la main.
//!
//! Image de chaque jeu : l'image officielle, celle que le launcher a déjà enregistrée sur le PC d'abord (cache de
//! Steam, catalogue d'Epic), sinon celle de la boutique officielle (Steam, Epic). Elle est copiée une fois dans
//! `art\` du dossier de l'app ; aucune image n'est livrée avec l'app.
//!
//! Lancement : par le launcher (Steam, Epic, Riot…), jamais en administrateur. Rago Optimizer tourne en administrateur
//! ; le jeu est lancé avec les droits de la session Windows (jeton de l'Explorateur), comme depuis le menu Démarrer.
//!
//! Dernière partie : un coup d'œil toutes les 4 secondes aux processus lancés depuis le dossier d'un jeu.

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    /// "steam:730", "epic:Fortnite", "riot:valorant", "mc:lunar", "manual:1a2b3c4d"…
    pub id: String,
    pub name: String,
    /// steam, epic, riot, battlenet, ubisoft, xbox, minecraft, manual
    pub launcher: String,
    /// launcher Minecraft (Lunar Client…), sous le nom du jeu
    pub client: Option<String>,
    /// minecraft, shooter ou other : filtre de la page et preset proposé
    pub kind: String,
    pub install_dir: Option<String>,
    pub last_played: Option<u64>,
    pub running: bool,
    #[serde(skip)]
    launch: Launch,
    #[serde(skip)]
    art: Vec<Art>,
}

#[derive(Debug, Clone, Default, PartialEq)]
enum Launch {
    #[default]
    None,
    /// steam://, com.epicgames.launcher://, uplay://
    Url(String),
    Exe { path: PathBuf, args: Vec<String> },
    /// application du Microsoft Store ou de l'app Xbox : shell:AppsFolder\<famille>!<app>
    AppsFolder(String),
}

/// D'où vient l'image officielle, dans l'ordre d'essai.
#[derive(Debug, Clone, PartialEq)]
enum Art {
    /// enregistrée par le launcher sur ce PC
    File(PathBuf),
    /// boutique officielle
    Url(String),
    /// en-tête de la page Steam du jeu (adresse donnée par la boutique, sans clé)
    SteamDetails(u32),
    /// en-tête de la page Steam du jeu, s'il y en a une au même nom (jeux Battle.net, Ubisoft, Xbox, ajoutés à la main)
    SteamSearch(String),
    /// image de la page du jeu sur l'Epic Games Store (jeux Riot)
    EpicProduct(&'static str),
}

impl Game {
    fn new(id: String, name: String, launcher: &str, launch: Launch) -> Self {
        let kind = kind_of(&name).to_string();
        Game { id, name, launcher: launcher.into(), client: None, kind, install_dir: None, last_played: None, running: false, launch, art: Vec::new() }
    }
    fn dir(mut self, dir: Option<PathBuf>) -> Self {
        self.install_dir = dir.map(|d| d.to_string_lossy().trim_end_matches(['\\', '/']).to_string());
        self
    }
}

/// Lettres et chiffres en minuscules : « Counter-Strike 2™ » et « counter strike 2 » se rejoignent.
pub fn normalize(name: &str) -> String {
    name.chars().filter(|c| c.is_alphanumeric()).flat_map(char::to_lowercase).collect()
}

const SHOOTERS: &[&str] = &[
    "valorant", "counterstrike", "overwatch", "apexlegends", "fortnite", "callofduty", "rainbowsix", "thefinals",
    "marvelrivals", "battlefield", "pubg", "playerunknown", "escapefromtarkov", "destiny2", "halo", "splitgate",
    "xdefiant", "teamfortress2", "deltaforce", "arenabreakout", "warzone", "bloodstrike", "spectre", "deadlock",
];

fn kind_of(name: &str) -> &'static str {
    let n = normalize(name);
    if n.contains("minecraft") {
        "minecraft"
    } else if SHOOTERS.iter().any(|s| n.contains(s)) {
        "shooter"
    } else {
        "other"
    }
}

// ---------------------------------------------------------------- formats des launchers (testés hors Windows)

/// Valeur d'un fichier VDF texte de Steam (libraryfolders.vdf, appmanifest_*.acf).
#[derive(Debug, Clone, PartialEq)]
pub enum Vdf {
    Str(String),
    Obj(BTreeMap<String, Vdf>),
}

impl Vdf {
    fn get(&self, key: &str) -> Option<&Vdf> {
        match self {
            // les clés de Steam changent de casse d'une version à l'autre (StateFlags, stateflags)
            Vdf::Obj(m) => m.iter().find(|(k, _)| k.eq_ignore_ascii_case(key)).map(|(_, v)| v),
            Vdf::Str(_) => None,
        }
    }
    fn str(&self, key: &str) -> Option<&str> {
        match self.get(key)? {
            Vdf::Str(s) => Some(s),
            Vdf::Obj(_) => None,
        }
    }
}

pub fn parse_vdf(text: &str) -> Vdf {
    let mut tokens = Vec::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' => {
                let mut s = String::new();
                while let Some(c) = chars.next() {
                    match c {
                        '\\' => match chars.next() {
                            Some('n') => s.push('\n'),
                            Some('t') => s.push('\t'),
                            Some(o) => s.push(o),
                            None => {}
                        },
                        '"' => break,
                        _ => s.push(c),
                    }
                }
                tokens.push(Some(s));
            }
            '{' => tokens.push(None),
            '}' => tokens.push(Some("\u{0}}".into())),
            '/' if chars.peek() == Some(&'/') => {
                for c in chars.by_ref() {
                    if c == '\n' {
                        break;
                    }
                }
            }
            _ => {}
        }
    }
    fn obj(tokens: &mut std::vec::IntoIter<Option<String>>) -> BTreeMap<String, Vdf> {
        let mut m = BTreeMap::new();
        while let Some(t) = tokens.next() {
            let Some(key) = t else { continue };
            if key == "\u{0}}" {
                break;
            }
            match tokens.next() {
                Some(Some(v)) if v != "\u{0}}" => {
                    m.insert(key, Vdf::Str(v));
                }
                Some(None) => {
                    m.insert(key, Vdf::Obj(obj(tokens)));
                }
                _ => break,
            }
        }
        m
    }
    Vdf::Obj(obj(&mut tokens.into_iter()))
}

/// Dossiers des bibliothèques Steam (libraryfolders.vdf, ancien et nouveau format).
pub fn steam_libraries(vdf: &Vdf) -> Vec<PathBuf> {
    let Some(Vdf::Obj(m)) = vdf.get("libraryfolders").or_else(|| vdf.get("LibraryFolders")) else { return Vec::new() };
    m.iter()
        .filter(|(k, _)| k.chars().all(|c| c.is_ascii_digit()))
        .filter_map(|(_, v)| match v {
            Vdf::Str(p) => Some(PathBuf::from(p)),
            Vdf::Obj(_) => v.str("path").map(PathBuf::from),
        })
        .collect()
}

/// Jeu d'un appmanifest_*.acf entièrement installé : (appid, nom, dossier dans steamapps\common).
pub fn steam_app(acf: &Vdf) -> Option<(u32, String, String)> {
    let app = acf.get("AppState")?;
    let id: u32 = app.str("appid")?.parse().ok()?;
    let flags: u32 = app.str("StateFlags").and_then(|f| f.parse().ok()).unwrap_or(0);
    // 4 : entièrement installé (les mises à jour en cours gardent ce bit)
    if flags & 4 == 0 {
        return None;
    }
    let name = app.str("name")?.trim().to_string();
    let dir = app.str("installdir")?.to_string();
    (!steam_tool(id, &name)).then_some((id, name, dir))
}

/// Outils de Steam installés comme des jeux : redistribuables, Proton, SteamVR, serveurs dédiés…
fn steam_tool(id: u32, name: &str) -> bool {
    const IDS: &[u32] = &[228_980, 250_820, 431_960, 1_070_560, 1_391_110, 1_628_350, 1_493_710, 2_180_100];
    let n = name.to_lowercase();
    IDS.contains(&id)
        || n.starts_with("proton")
        || n.starts_with("steam linux runtime")
        || n.starts_with("steamvr")
        || ["redistributable", "dedicated server", " sdk", "soundtrack", "wallpaper engine", "benchmark"].iter().any(|w| n.contains(w))
}

/// Manifeste d'un jeu Epic (Manifests\*.item).
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
pub struct EpicItem {
    pub display_name: String,
    pub install_location: String,
    pub app_name: String,
    pub main_game_app_name: String,
    pub catalog_namespace: String,
    pub catalog_item_id: String,
    pub app_categories: Vec<String>,
    #[serde(rename = "bIsIncompleteInstall")]
    pub incomplete: bool,
}

impl EpicItem {
    /// Jeu complet (pas un DLC, ni une appli comme Unreal Engine, ni une installation en cours).
    pub fn is_game(&self) -> bool {
        !self.incomplete
            && !self.display_name.is_empty()
            && !self.install_location.is_empty()
            && (self.main_game_app_name.is_empty() || self.main_game_app_name == self.app_name)
            && (self.app_categories.is_empty() || self.app_categories.iter().any(|c| c == "games"))
    }
    pub fn launch_url(&self) -> String {
        format!(
            "com.epicgames.launcher://apps/{}%3A{}%3A{}?action=launch&silent=true",
            self.catalog_namespace, self.catalog_item_id, self.app_name
        )
    }
}

/// Image officielle de chaque jeu du catalogue enregistré par le launcher Epic (catcache.bin : JSON en base64),
/// par identifiant de catalogue. Paysage d'abord, comme les tuiles de la bibliothèque d'Epic.
pub fn epic_images(catcache: &[u8]) -> HashMap<String, String> {
    const ORDER: &[&str] = &["DieselGameBox", "OfferImageWide", "DieselStoreFrontWide", "Featured", "DieselGameBoxTall", "Thumbnail"];
    let text: Vec<u8> = catcache.iter().copied().filter(|b| !b.is_ascii_whitespace()).collect();
    let Ok(json) = base64::engine::general_purpose::STANDARD.decode(&text) else { return HashMap::new() };
    let Ok(serde_json::Value::Array(items)) = serde_json::from_slice::<serde_json::Value>(&json) else { return HashMap::new() };
    let mut out = HashMap::new();
    for item in items {
        let Some(id) = item["id"].as_str() else { continue };
        let Some(images) = item["keyImages"].as_array() else { continue };
        let best = ORDER.iter().find_map(|kind| {
            images.iter().find(|i| i["type"].as_str() == Some(kind)).and_then(|i| i["url"].as_str())
        });
        if let Some(url) = best.filter(|u| u.starts_with("https://")) {
            out.insert(id.to_string(), url.to_string());
        }
    }
    out
}

/// `clé: "valeur"` d'un fichier YAML de Riot (product_settings.yaml), sans dépendance YAML.
pub fn yaml_value(text: &str, key: &str) -> Option<String> {
    text.lines().find_map(|l| {
        let (k, v) = l.trim().split_once(':')?;
        (k.trim() == key).then(|| v.trim().trim_matches(['"', '\'']).to_string()).filter(|v| !v.is_empty())
    })
}

/// Jeux Riot connus : produit, nom.
const RIOT: &[(&str, &str)] = &[("valorant", "VALORANT"), ("league_of_legends", "League of Legends"), ("bacon", "Legends of Runeterra")];

/// Identifiant Battle.net (--uid du désinstalleur) → code de lancement de Battle.net.exe --exec="launch <code>".
const BATTLENET: &[(&str, &str)] = &[
    ("prometheus", "Pro"),
    ("fenris", "Fen"),
    ("osi", "OSI"),
    ("wow", "WoW"),
    ("wow_classic", "WoWC"),
    ("hs_beta", "WTCG"),
    ("heroes", "Hero"),
    ("diablo3", "D3"),
    ("s2", "S2"),
    ("s1", "S1"),
    ("auks", "AUKS"),
    ("odin", "ODIN"),
    ("zeus", "ZEUS"),
    ("lazarus", "LAZR"),
    ("fore", "FORE"),
    ("viper", "VIPR"),
];

/// Identifiant de l'éditeur dans un nom de famille de paquet Windows (« 8wekyb3d8bbwe ») : SHA-256 du nom de
/// l'éditeur en UTF-16, 8 premiers octets en base 32 (alphabet de Crockford).
pub fn publisher_id(publisher: &str) -> String {
    use sha2::{Digest, Sha256};
    let utf16: Vec<u8> = publisher.encode_utf16().flat_map(u16::to_le_bytes).collect();
    let hash = Sha256::digest(&utf16);
    let mut bits: u128 = 0;
    for b in &hash[..8] {
        bits = (bits << 8) | u128::from(*b);
    }
    // 64 bits complétés à 65 pour 13 caractères de 5 bits
    bits <<= 1;
    const ALPHABET: &[u8] = b"0123456789abcdefghjkmnpqrstvwxyz";
    (0..13).rev().map(|i| ALPHABET[((bits >> (i * 5)) & 31) as usize] as char).collect()
}

/// Attribut `name="…"` du premier élément `tag` d'un XML simple (MicrosoftGame.config).
pub fn xml_attr(xml: &str, tag: &str, name: &str) -> Option<String> {
    let start = xml.find(&format!("<{tag} ")).or_else(|| xml.find(&format!("<{tag}\n")).or_else(|| xml.find(&format!("<{tag}\r"))))?;
    let end = start + xml[start..].find('>')?;
    let el = &xml[start..end];
    let mut at = 0;
    while let Some(pos) = el[at..].find(name) {
        let i = at + pos;
        let before = el[..i].chars().next_back();
        let rest = el[i + name.len()..].trim_start();
        if before.is_some_and(char::is_whitespace) && rest.starts_with('=') {
            let rest = rest[1..].trim_start();
            let q = rest.chars().next()?;
            if q == '"' || q == '\'' {
                let v = &rest[1..];
                return Some(v[..v.find(q)?].replace("&amp;", "&").replace("&apos;", "'").replace("&quot;", "\""));
            }
        }
        at = i + name.len();
    }
    None
}

/// Dossiers listés dans le fichier .GamingRoot d'un disque (app Xbox) : « RGBX », version, puis chemins UTF-16.
pub fn gaming_root(bytes: &[u8]) -> Vec<String> {
    if bytes.len() < 8 || &bytes[..4] != b"RGBX" {
        return Vec::new();
    }
    let words: Vec<u16> = bytes[8..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
    words
        .split(|w| *w == 0)
        .map(String::from_utf16_lossy)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s.chars().all(|c| !c.is_control()))
        .collect()
}

/// Chemin d'un exe tiré d'une valeur DisplayIcon (« "C:\…\app.exe",0 »).
fn icon_exe(icon: &str) -> Option<PathBuf> {
    let s = icon.trim().trim_matches('"');
    let s = match s.rsplit_once(',') {
        Some((p, n)) if n.trim().parse::<i32>().is_ok() => p.trim().trim_matches('"'),
        _ => s,
    };
    s.to_lowercase().ends_with(".exe").then(|| PathBuf::from(s))
}

/// Launchers Minecraft reconnus par leur nom dans « Programmes et fonctionnalités » : clé, nom affiché, exe.
const MC_LAUNCHERS: &[(&str, &str, &str, &[&str])] = &[
    ("official", "Minecraft Launcher", "MinecraftLauncher.exe", &["minecraft launcher"]),
    ("lunar", "Lunar Client", "Lunar Client.exe", &["lunar client"]),
    ("badlion", "Badlion Client", "Badlion Client.exe", &["badlion client"]),
    ("feather", "Feather Client", "Feather Launcher.exe", &["feather launcher", "feather client"]),
    ("prism", "Prism Launcher", "prismlauncher.exe", &["prism launcher"]),
    ("modrinth", "Modrinth App", "Modrinth App.exe", &["modrinth app"]),
    ("curseforge", "CurseForge", "CurseForge.exe", &["curseforge"]),
];

fn mc_launcher(display_name: &str) -> Option<&'static (&'static str, &'static str, &'static str, &'static [&'static str])> {
    let n = display_name.to_lowercase();
    MC_LAUNCHERS.iter().find(|(_, _, _, names)| names.iter().any(|m| n == *m || n.starts_with(&format!("{m} "))))
}

// ---------------------------------------------------------------- détection (Windows)

/// Entrée de « Programmes et fonctionnalités ».
#[derive(Debug, Clone, Default)]
struct Uninstall {
    key: String,
    name: String,
    location: Option<PathBuf>,
    icon: Option<String>,
    uninstall: String,
}

#[cfg(windows)]
use crate::reg;

#[cfg(windows)]
fn env_path(var: &str) -> Option<PathBuf> {
    std::env::var_os(var).filter(|v| !v.is_empty()).map(PathBuf::from)
}

#[cfg(windows)]
fn uninstall_entries() -> Vec<Uninstall> {
    let mut out = Vec::new();
    for root in [
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    ] {
        for key in reg::subkeys(root) {
            let path = format!("{root}\\{key}");
            let Some(name) = reg::string(&path, "DisplayName") else { continue };
            out.push(Uninstall {
                key,
                name,
                location: reg::string(&path, "InstallLocation").map(|l| PathBuf::from(l.trim_matches('"'))),
                icon: reg::string(&path, "DisplayIcon"),
                uninstall: reg::string(&path, "UninstallString").unwrap_or_default(),
            });
        }
    }
    out
}

#[cfg(windows)]
fn steam(out: &mut Vec<Game>) {
    let Some(root) = reg::string("HKCU\\Software\\Valve\\Steam", "SteamPath")
        .or_else(|| reg::string("HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath"))
        .map(|p| PathBuf::from(p.replace('/', "\\")))
    else {
        return;
    };
    let mut libs = vec![root.clone()];
    if let Ok(text) = fs::read_to_string(root.join("steamapps").join("libraryfolders.vdf")) {
        for lib in steam_libraries(&parse_vdf(&text)) {
            if !libs.iter().any(|l| l.as_os_str().eq_ignore_ascii_case(lib.as_os_str())) {
                libs.push(lib);
            }
        }
    }
    let cache = root.join("appcache").join("librarycache");
    let mut seen = HashSet::new();
    for lib in libs {
        let apps = lib.join("steamapps");
        let Ok(dir) = fs::read_dir(&apps) else { continue };
        for e in dir.flatten() {
            let name = e.file_name().to_string_lossy().to_lowercase();
            if !(name.starts_with("appmanifest_") && name.ends_with(".acf")) {
                continue;
            }
            let Some((id, title, folder)) = fs::read_to_string(e.path()).ok().and_then(|t| steam_app(&parse_vdf(&t))) else { continue };
            if !seen.insert(id) {
                continue;
            }
            let mut g = Game::new(format!("steam:{id}"), title, "steam", Launch::Url(format!("steam://rungameid/{id}")))
                .dir(Some(apps.join("common").join(folder)));
            g.art = steam_cached_art(&cache, id);
            g.art.push(Art::SteamDetails(id));
            g.art.extend(steam_cdn(id));
            out.push(g);
        }
    }
}

/// Images de la bibliothèque de Steam sur ce PC : ancien format (<appid>_header.jpg) et nouveau (<appid>\…\header.jpg).
fn steam_cached_art(cache: &Path, id: u32) -> Vec<Art> {
    const NAMES: &[&str] = &["header.jpg", "library_header.jpg", "capsule_616x353.jpg", "library_hero.jpg"];
    let mut out: Vec<Art> = NAMES.iter().map(|n| cache.join(format!("{id}_{n}"))).filter(|p| p.is_file()).map(Art::File).collect();
    let dir = cache.join(id.to_string());
    for name in NAMES {
        let direct = dir.join(name);
        if direct.is_file() {
            out.push(Art::File(direct));
            continue;
        }
        // dossier au nom d'un hash par image
        if let Ok(subs) = fs::read_dir(&dir) {
            for s in subs.flatten() {
                let p = s.path().join(name);
                if p.is_file() {
                    out.push(Art::File(p));
                    break;
                }
            }
        }
    }
    out
}

fn steam_cdn(id: u32) -> [Art; 2] {
    [
        Art::Url(format!("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{id}/header.jpg")),
        Art::Url(format!("https://cdn.cloudflare.steamstatic.com/steam/apps/{id}/header.jpg")),
    ]
}

#[cfg(windows)]
fn epic(out: &mut Vec<Game>) {
    let Some(data) = env_path("ProgramData").map(|p| p.join("Epic").join("EpicGamesLauncher").join("Data")) else { return };
    let Ok(dir) = fs::read_dir(data.join("Manifests")) else { return };
    let images = fs::read(data.join("Catalog").join("catcache.bin")).map(|b| epic_images(&b)).unwrap_or_default();
    let mut seen = HashSet::new();
    for e in dir.flatten() {
        if e.path().extension().is_none_or(|x| !x.eq_ignore_ascii_case("item")) {
            continue;
        }
        let Some(item) = fs::read(e.path()).ok().and_then(|b| serde_json::from_slice::<EpicItem>(&b).ok()) else { continue };
        if !item.is_game() || !seen.insert(item.app_name.clone()) {
            continue;
        }
        let mut g = Game::new(format!("epic:{}", item.app_name), item.display_name.clone(), "epic", Launch::Url(item.launch_url()))
            .dir(Some(PathBuf::from(&item.install_location)));
        if let Some(url) = images.get(&item.catalog_item_id) {
            g.art.push(Art::Url(epic_sized(url)));
        }
        g.art.push(Art::SteamSearch(item.display_name));
        out.push(g);
    }
}

#[cfg(windows)]
fn riot(out: &mut Vec<Game>) {
    let Some(data) = env_path("ProgramData").map(|p| p.join("Riot Games")) else { return };
    let client = fs::read(data.join("RiotClientInstalls.json"))
        .ok()
        .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
        .and_then(|v| v["rc_default"].as_str().or(v["rc_live"].as_str()).map(|p| PathBuf::from(p.replace('/', "\\"))))
        .filter(|p| p.is_file());
    let Some(client) = client else { return };
    for (product, name) in RIOT {
        let settings = data.join("Metadata").join(format!("{product}.live")).join(format!("{product}.live.product_settings.yaml"));
        let Ok(text) = fs::read_to_string(settings) else { continue };
        let Some(dir) = yaml_value(&text, "product_install_full_path").map(|p| PathBuf::from(p.replace('/', "\\"))) else { continue };
        if !dir.is_dir() {
            continue;
        }
        let launch = Launch::Exe {
            path: client.clone(),
            args: vec![format!("--launch-product={product}"), "--launch-patchline=live".into()],
        };
        let mut g = Game::new(format!("riot:{product}"), (*name).into(), "riot", launch).dir(Some(dir));
        g.art = official_art(product);
        out.push(g);
    }
}

#[cfg(windows)]
fn battlenet(out: &mut Vec<Game>, entries: &[Uninstall]) {
    let app = entries
        .iter()
        .find(|e| e.name == "Battle.net")
        .and_then(|e| e.location.clone())
        .map(|d| d.join("Battle.net.exe"))
        .or_else(|| env_path("ProgramFiles(x86)").map(|p| p.join("Battle.net").join("Battle.net.exe")))
        .filter(|p| p.is_file());
    let Some(app) = app else { return };
    for e in entries {
        let Some(uid) = e.uninstall.split("--uid=").nth(1).map(|s| s.split(['"', ' ']).next().unwrap_or("").to_lowercase()) else { continue };
        if uid.is_empty() || !e.uninstall.to_lowercase().contains("battle.net") || e.name == "Battle.net" {
            continue;
        }
        let args = BATTLENET.iter().find(|(u, _)| *u == uid).map(|(_, code)| vec![format!("--exec=launch {code}")]).unwrap_or_default();
        let mut g = Game::new(format!("bnet:{uid}"), e.name.clone(), "battlenet", Launch::Exe { path: app.clone(), args }).dir(e.location.clone());
        g.art.push(Art::SteamSearch(e.name.clone()));
        out.push(g);
    }
}

#[cfg(windows)]
fn ubisoft(out: &mut Vec<Game>, entries: &[Uninstall]) {
    let root = "HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs";
    for id in reg::subkeys(root) {
        let Some(dir) = reg::string(&format!("{root}\\{id}"), "InstallDir").map(|d| PathBuf::from(d.replace('/', "\\"))) else { continue };
        if !dir.is_dir() {
            continue;
        }
        let name = entries
            .iter()
            .find(|e| e.key.eq_ignore_ascii_case(&format!("Uplay Install {id}")))
            .map(|e| e.name.clone())
            .or_else(|| dir.file_name().map(|n| n.to_string_lossy().into_owned()))
            .unwrap_or_else(|| format!("Ubisoft {id}"));
        let mut g = Game::new(format!("ubi:{id}"), name.clone(), "ubisoft", Launch::Url(format!("uplay://launch/{id}/0"))).dir(Some(dir));
        g.art.push(Art::SteamSearch(name));
        out.push(g);
    }
}

/// Jeux de l'app Xbox (dossiers listés par les fichiers .GamingRoot de chaque disque).
#[cfg(windows)]
fn xbox(out: &mut Vec<Game>) {
    for letter in b'C'..=b'Z' {
        let drive = PathBuf::from(format!("{}:\\", letter as char));
        let Ok(bytes) = fs::read(drive.join(".GamingRoot")) else { continue };
        for folder in gaming_root(&bytes) {
            let root = drive.join(folder.trim_start_matches(['\\', '/']));
            let Ok(dir) = fs::read_dir(&root) else { continue };
            for e in dir.flatten() {
                let content = e.path().join("Content");
                let Ok(xml) = fs::read_to_string(content.join("MicrosoftGame.config")) else { continue };
                let (Some(name), Some(publisher)) = (xml_attr(&xml, "Identity", "Name"), xml_attr(&xml, "Identity", "Publisher")) else { continue };
                let app = xml_attr(&xml, "Executable", "Id").unwrap_or_else(|| "Game".into());
                let title = xml_attr(&xml, "ShellVisuals", "DefaultDisplayName")
                    .filter(|t| !t.starts_with("ms-resource:"))
                    .unwrap_or_else(|| e.file_name().to_string_lossy().into_owned());
                let family = format!("{name}_{}", publisher_id(&publisher));
                let mut g = Game::new(format!("xbox:{family}"), title.clone(), "xbox", Launch::AppsFolder(format!("{family}!{app}"))).dir(Some(content.clone()));
                g.art.push(Art::SteamSearch(title));
                for logo in ["Square480x480Logo", "Square150x150Logo"] {
                    if let Some(f) = xml_attr(&xml, "ShellVisuals", logo).map(|f| content.join(f)).filter(|p| p.is_file()) {
                        g.art.push(Art::File(f));
                    }
                }
                out.push(g);
            }
        }
    }
}

/// Launchers Minecraft : l'officiel (installeur ou Microsoft Store) et les clients PvP. L'image est celle de
/// Minecraft, le nom du launcher en sous-titre.
#[cfg(windows)]
fn minecraft(out: &mut Vec<Game>, entries: &[Uninstall]) {
    let mut add = |key: &str, client: &str, launch: Launch, dir: Option<PathBuf>| {
        let id = format!("mc:{key}");
        if out.iter().any(|g| g.id == id) {
            return;
        }
        let mut g = Game::new(id, "Minecraft".into(), "minecraft", launch).dir(dir);
        g.client = Some(client.into());
        g.kind = "minecraft".into();
        g.art = official_art("minecraft");
        out.push(g);
    };
    for e in entries {
        let Some((key, client, exe, _)) = mc_launcher(&e.name) else { continue };
        let path = e
            .icon
            .as_deref()
            .and_then(icon_exe)
            .filter(|p| p.is_file() && !p.to_string_lossy().to_lowercase().contains("uninstall"))
            .or_else(|| e.location.as_ref().map(|d| d.join(exe)).filter(|p| p.is_file()));
        if let Some(path) = path {
            let dir = path.parent().map(Path::to_path_buf);
            add(key, client, Launch::Exe { path, args: Vec::new() }, dir);
        }
    }
    // installés sans entrée dans « Programmes et fonctionnalités »
    let local = env_path("LOCALAPPDATA").unwrap_or_default();
    for (key, client, path) in [
        ("lunar", "Lunar Client", local.join("Programs").join("lunarclient").join("Lunar Client.exe")),
        ("badlion", "Badlion Client", env_path("ProgramFiles").unwrap_or_default().join("Badlion Client").join("Badlion Client.exe")),
        ("official", "Minecraft Launcher", env_path("ProgramFiles(x86)").unwrap_or_default().join("Minecraft Launcher").join("MinecraftLauncher.exe")),
    ] {
        if path.is_file() {
            let dir = path.parent().map(Path::to_path_buf);
            add(key, client, Launch::Exe { path, args: Vec::new() }, dir);
        }
    }
    // launcher du Microsoft Store (paquet Microsoft.4297127D64EC6)
    let packages = "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages";
    if reg::subkeys(packages).iter().any(|k| k.starts_with("Microsoft.4297127D64EC6_")) {
        add("store", "Minecraft Launcher", Launch::AppsFolder("Microsoft.4297127D64EC6_8wekyb3d8bbwe!Minecraft".into()), None);
    }
}

/// Image officielle des jeux qu'aucun launcher n'enregistre sur ce PC (Riot, Minecraft) : page du jeu sur l'Epic Games
/// Store et minecraft.net (relevées le 17/10/2026), puis la page Epic lue à la demande. Une adresse qui ne répond plus
/// passe à la suivante ; sans aucune, la tuile garde le nom du jeu.
fn official_art(key: &str) -> Vec<Art> {
    const EGS: &str = "https://cdn1.epicgames.com/offer";
    let (urls, product): (Vec<String>, Option<&'static str>) = match key {
        "valorant" => (
            vec![
                format!("{EGS}/cbd5b3d310a54b12bf3fe8c41994174f/EGS_VALORANT_RiotGames_S1_2560x1440-48f2c552ddca4947b6f103d5b8c70aa7"),
                "https://cdn2.unrealengine.com/egs-valorant-riotgames-s1-2560x1440-4742836df9eb.jpg".into(),
            ],
            Some("valorant"),
        ),
        "league_of_legends" => (
            vec![format!("{EGS}/24b9b5e323bc40eea252a10cdd3b2f10/EGS_LeagueofLegends_RiotGames_S1_2560x1440-47eb328eac5ddd63ebd096ded7d0d5ab")],
            Some("league-of-legends"),
        ),
        "bacon" => (Vec::new(), Some("legends-of-runeterra")),
        "minecraft" => (
            vec![
                "https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Hero-Image_Vanilla_Standard_1200x675.jpg".into(),
                "https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Hero-Image_Vanilla_Deluxe_1200x675.jpg".into(),
            ],
            None,
        ),
        _ => (Vec::new(), None),
    };
    urls.iter().map(|u| Art::Url(epic_sized(u))).chain(product.map(Art::EpicProduct)).collect()
}

/// Images d'Epic en 2560×1440 : la boutique les demande réduites à 1280×720, comme ici (quelques centaines de Ko).
fn epic_sized(url: &str) -> String {
    if url.starts_with("https://cdn1.epicgames.com/") && !url.contains('?') {
        format!("{url}?resize=1&w=1280&h=720&quality=medium")
    } else {
        url.to_string()
    }
}

#[cfg(windows)]
pub fn detect() -> Vec<Game> {
    let entries = uninstall_entries();
    let mut out = Vec::new();
    steam(&mut out);
    epic(&mut out);
    riot(&mut out);
    battlenet(&mut out, &entries);
    ubisoft(&mut out, &entries);
    xbox(&mut out);
    minecraft(&mut out, &entries);
    // le même jeu par deux launchers (Fortnite sur Epic et dans l'app Xbox…) : le premier trouvé
    let mut seen = HashSet::new();
    out.retain(|g| g.launcher == "minecraft" || seen.insert(normalize(&g.name)));
    out
}

#[cfg(not(windows))]
pub fn detect() -> Vec<Game> {
    Vec::new()
}

// ---------------------------------------------------------------- launchers

/// Un launcher installé (Steam, Epic Games, Lunar Client…), ouvert depuis la bibliothèque. Son image est l'icône de
/// son exe, celle que Windows affiche (icon.rs).
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Launcher {
    /// steam, epic, riot, battlenet, ea, ubisoft, gog, rockstar, xbox, minecraft, lunar, badlion…
    pub id: String,
    pub name: String,
    /// launcher Minecraft
    pub minecraft: bool,
    pub running: bool,
    #[serde(skip)]
    exe: Option<PathBuf>,
    #[serde(skip)]
    launch: Launch,
}

/// Launchers reconnus : id, nom affiché, noms dans « Programmes et fonctionnalités », exe relatif au dossier
/// d'installation, chemins habituels (variable d'environnement, chemin), launcher Minecraft.
struct LauncherDef {
    id: &'static str,
    name: &'static str,
    uninstall: &'static [&'static str],
    exe: &'static [&'static str],
    known: &'static [(&'static str, &'static str)],
    minecraft: bool,
}

const fn def(
    id: &'static str,
    name: &'static str,
    uninstall: &'static [&'static str],
    exe: &'static [&'static str],
    known: &'static [(&'static str, &'static str)],
    minecraft: bool,
) -> LauncherDef {
    LauncherDef { id, name, uninstall, exe, known, minecraft }
}

const EPIC_EXE: &str = "Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe";
const LAUNCHER_DEFS: &[LauncherDef] = &[
    def("steam", "Steam", &["steam"], &["steam.exe"], &[("ProgramFiles(x86)", "Steam\\steam.exe")], false),
    def(
        "epic",
        "Epic Games",
        &["epic games launcher"],
        &["Portal\\Binaries\\Win64\\EpicGamesLauncher.exe", "Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe"],
        &[("ProgramFiles(x86)", EPIC_EXE), ("ProgramFiles", EPIC_EXE)],
        false,
    ),
    def("riot", "Riot Client", &["riot client"], &["RiotClientServices.exe"], &[], false),
    def(
        "battlenet",
        "Battle.net",
        &["battle.net"],
        &["Battle.net Launcher.exe", "Battle.net.exe"],
        &[("ProgramFiles(x86)", "Battle.net\\Battle.net Launcher.exe"), ("ProgramFiles(x86)", "Battle.net\\Battle.net.exe")],
        false,
    ),
    def(
        "ea",
        "EA app",
        &["ea app"],
        &["EA Desktop\\EADesktop.exe", "EADesktop.exe"],
        &[("ProgramFiles", "Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe")],
        false,
    ),
    def(
        "ubisoft",
        "Ubisoft Connect",
        &["ubisoft connect"],
        &["UbisoftConnect.exe", "upc.exe"],
        &[("ProgramFiles(x86)", "Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe"), ("ProgramFiles(x86)", "Ubisoft\\Ubisoft Game Launcher\\upc.exe")],
        false,
    ),
    def("gog", "GOG Galaxy", &["gog galaxy"], &["GalaxyClient.exe"], &[("ProgramFiles(x86)", "GOG Galaxy\\GalaxyClient.exe")], false),
    def(
        "rockstar",
        "Rockstar Games",
        &["rockstar games launcher"],
        &["Launcher.exe"],
        &[("ProgramFiles", "Rockstar Games\\Launcher\\Launcher.exe")],
        false,
    ),
    def(
        "minecraft",
        "Minecraft Launcher",
        &["minecraft launcher"],
        &["MinecraftLauncher.exe"],
        &[("ProgramFiles(x86)", "Minecraft Launcher\\MinecraftLauncher.exe")],
        true,
    ),
    def("lunar", "Lunar Client", &["lunar client"], &["Lunar Client.exe"], &[("LOCALAPPDATA", "Programs\\lunarclient\\Lunar Client.exe")], true),
    def("badlion", "Badlion Client", &["badlion client"], &["Badlion Client.exe"], &[("ProgramFiles", "Badlion Client\\Badlion Client.exe")], true),
    def(
        "feather",
        "Feather Client",
        &["feather launcher", "feather client"],
        &["Feather Launcher.exe"],
        &[("LOCALAPPDATA", "Programs\\feather-launcher\\Feather Launcher.exe")],
        true,
    ),
    def("prism", "Prism Launcher", &["prism launcher"], &["prismlauncher.exe"], &[("LOCALAPPDATA", "Programs\\PrismLauncher\\prismlauncher.exe")], true),
    def("modrinth", "Modrinth App", &["modrinth app"], &["Modrinth App.exe"], &[("LOCALAPPDATA", "Modrinth App\\Modrinth App.exe")], true),
    def("curseforge", "CurseForge", &["curseforge"], &["CurseForge.exe"], &[("LOCALAPPDATA", "Programs\\CurseForge Windows\\CurseForge.exe")], true),
];

/// Nom de « Programmes et fonctionnalités » qui correspond (« Lunar Client 3.2.1 » pour « lunar client »).
fn matches_name(display_name: &str, names: &[&str]) -> bool {
    let n = display_name.to_lowercase();
    names.iter().any(|m| n == *m || n.starts_with(&format!("{m} ")))
}

/// Exe d'un launcher d'après son entrée de « Programmes et fonctionnalités » : dans son dossier d'installation, sinon
/// l'exe de son icône s'il porte le nom attendu.
fn uninstall_exe(d: &LauncherDef, e: &Uninstall) -> Option<PathBuf> {
    let in_dir = e.location.as_ref().and_then(|dir| d.exe.iter().map(|x| dir.join(x)).find(|p| p.is_file()));
    in_dir.or_else(|| {
        let icon = e.icon.as_deref().and_then(icon_exe)?;
        let file = icon.file_name()?.to_string_lossy().to_lowercase();
        let wanted = d.exe.iter().any(|x| Path::new(x).file_name().is_some_and(|f| f.to_string_lossy().to_lowercase() == file));
        (wanted && icon.is_file()).then_some(icon)
    })
}

#[cfg(windows)]
fn special_exe(id: &str) -> Option<PathBuf> {
    let p = match id {
        "steam" => reg::string("HKCU\\Software\\Valve\\Steam", "SteamExe").map(|p| PathBuf::from(p.replace('/', "\\"))),
        "riot" => env_path("ProgramData")
            .and_then(|d| fs::read(d.join("Riot Games").join("RiotClientInstalls.json")).ok())
            .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
            .and_then(|v| v["rc_default"].as_str().or(v["rc_live"].as_str()).map(|p| PathBuf::from(p.replace('/', "\\")))),
        "ubisoft" => reg::string("HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher", "InstallDir").and_then(|d| {
            let d = PathBuf::from(d.replace('/', "\\"));
            ["UbisoftConnect.exe", "upc.exe"].iter().map(|x| d.join(x)).find(|p| p.is_file())
        }),
        "gog" => reg::string("HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient\\paths", "client").map(|d| PathBuf::from(d).join("GalaxyClient.exe")),
        _ => None,
    };
    p.filter(|p| p.is_file())
}

/// Un paquet du Microsoft Store installé pour ce compte (« Microsoft.GamingApp_… »).
#[cfg(windows)]
fn has_package(prefix: &str) -> bool {
    let packages = "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages";
    reg::subkeys(packages).iter().any(|k| k.starts_with(prefix))
}

#[cfg(windows)]
pub fn detect_launchers() -> Vec<Launcher> {
    let entries = uninstall_entries();
    let mut out = Vec::new();
    for d in LAUNCHER_DEFS {
        let exe = special_exe(d.id)
            .or_else(|| d.known.iter().filter_map(|(var, rel)| env_path(var).map(|b| b.join(rel))).find(|p| p.is_file()))
            .or_else(|| entries.iter().filter(|e| matches_name(&e.name, d.uninstall)).find_map(|e| uninstall_exe(d, e)));
        if let Some(exe) = exe {
            let launch = Launch::Exe { path: exe.clone(), args: Vec::new() };
            out.push(Launcher { id: d.id.into(), name: d.name.into(), minecraft: d.minecraft, running: false, exe: Some(exe), launch });
        }
    }
    // applications du Microsoft Store : l'app Xbox, et le launcher Minecraft s'il n'est pas installé autrement
    let store = |id: &str, name: &str, app: &str, minecraft: bool| Launcher {
        id: id.into(),
        name: name.into(),
        minecraft,
        running: false,
        exe: None,
        launch: Launch::AppsFolder(app.into()),
    };
    if has_package("Microsoft.GamingApp_") {
        out.push(store("xbox", "Xbox", "Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App", false));
    }
    if !out.iter().any(|l| l.id == "minecraft") && has_package("Microsoft.4297127D64EC6_") {
        out.push(store("minecraft", "Minecraft Launcher", "Microsoft.4297127D64EC6_8wekyb3d8bbwe!Minecraft", true));
    }
    out
}

#[cfg(not(windows))]
pub fn detect_launchers() -> Vec<Launcher> {
    Vec::new()
}

/// Lance un jeu ou un launcher avec les droits de la session Windows.
fn start(launch: &Launch) -> Result<(), String> {
    match launch {
        Launch::Url(url) => launch::unelevated(Path::new("explorer.exe"), std::slice::from_ref(url), None),
        Launch::AppsFolder(app) => launch::unelevated(Path::new("explorer.exe"), &[format!("shell:AppsFolder\\{app}")], None),
        Launch::Exe { path, args } => {
            if !path.is_file() {
                return Err("not_found".into());
            }
            launch::unelevated(path, args, path.parent())
        }
        Launch::None => Err("Nothing to launch".into()),
    }
}

/// Launcher ouvert : un processus lancé depuis le dossier même de son exe (pas ses sous-dossiers, où Steam range les
/// jeux).
pub fn launcher_running(exe: &Path, procs: &[PathBuf]) -> bool {
    let Some(dir) = exe.parent().map(|d| d.to_string_lossy().to_lowercase()) else { return false };
    procs.iter().any(|p| p.parent().is_some_and(|d| d.to_string_lossy().to_lowercase() == dir))
}

// ---------------------------------------------------------------- bibliothèque

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Manual {
    id: String,
    name: String,
    exe: PathBuf,
}

/// games.json : jeux ajoutés à la main, jeux retirés de la bibliothèque, dernière partie de chacun.
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default)]
struct Saved {
    manual: Vec<Manual>,
    hidden: Vec<String>,
    played: HashMap<String, u64>,
}

pub struct Library {
    path: PathBuf,
    art_dir: PathBuf,
    saved: Mutex<Saved>,
    games: Mutex<Option<Vec<Game>>>,
    running: Mutex<HashSet<String>>,
    launchers: Mutex<Option<Vec<Launcher>>>,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

impl Library {
    pub fn new(data_dir: &Path) -> Self {
        let path = data_dir.join("games.json");
        let saved = fs::read(&path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        Library {
            path,
            art_dir: data_dir.join("art"),
            saved: Mutex::new(saved),
            games: Mutex::new(None),
            running: Mutex::new(HashSet::new()),
            launchers: Mutex::new(None),
        }
    }

    fn save(&self, saved: &Saved) {
        if let Ok(json) = serde_json::to_vec_pretty(saved) {
            let tmp = self.path.with_extension("json.tmp");
            if fs::write(&tmp, json).is_ok() {
                let _ = fs::rename(&tmp, &self.path);
            }
        }
    }

    /// Jeux de la bibliothèque, détectés à nouveau si `refresh` (ou à la première demande).
    pub fn list(&self, refresh: bool) -> Vec<Game> {
        let mut games = self.games.lock().unwrap();
        if refresh || games.is_none() {
            let saved = self.saved.lock().unwrap();
            let mut found = detect();
            for m in &saved.manual {
                if found.iter().any(|g| g.id == m.id) {
                    continue;
                }
                let mut g = Game::new(m.id.clone(), m.name.clone(), "manual", Launch::Exe { path: m.exe.clone(), args: Vec::new() })
                    .dir(m.exe.parent().map(Path::to_path_buf));
                g.art.push(Art::SteamSearch(m.name.clone()));
                found.push(g);
            }
            found.retain(|g| !saved.hidden.contains(&g.id));
            *games = Some(found);
        }
        let saved = self.saved.lock().unwrap();
        let running = self.running.lock().unwrap();
        let mut out = games.clone().unwrap_or_default();
        for g in &mut out {
            g.last_played = saved.played.get(&g.id).copied();
            g.running = running.contains(&g.id);
        }
        out.sort_by(|a, b| b.last_played.cmp(&a.last_played).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase())));
        out
    }

    fn find(&self, id: &str) -> Option<Game> {
        self.list(false).into_iter().find(|g| g.id == id)
    }

    /// Dossiers des jeux, jamais touchés par « Nettoyer » la RAM.
    pub fn install_dirs(&self) -> Vec<PathBuf> {
        self.games.lock().unwrap().iter().flatten().filter_map(|g| g.install_dir.as_ref().map(PathBuf::from)).collect()
    }

    /// Nom du jeu dont le dossier contient cet exe (barre en jeu).
    pub fn name_for(&self, exe: &Path) -> Option<String> {
        let norm = |s: &str| s.to_lowercase().replace('/', "\\");
        let p = norm(&exe.to_string_lossy());
        let games = self.games.lock().unwrap();
        games.iter().flatten().find_map(|g| {
            let dir = format!("{}\\", norm(g.install_dir.as_deref()?).trim_end_matches('\\'));
            (dir.len() > 4 && p.starts_with(&dir)).then(|| g.name.clone())
        })
    }

    pub fn launch(&self, id: &str) -> Result<(), String> {
        let g = self.find(id).ok_or("Unknown game")?;
        let r = start(&g.launch);
        if r.is_ok() {
            let mut saved = self.saved.lock().unwrap();
            saved.played.insert(g.id, now_ms());
            self.save(&saved);
        }
        r
    }

    /// Launchers installés, détectés à nouveau si `refresh` (ou à la première demande), avec ceux ouverts en ce moment.
    pub fn launchers(&self, refresh: bool) -> Vec<Launcher> {
        let mut list = {
            let mut cached = self.launchers.lock().unwrap();
            if refresh || cached.is_none() {
                *cached = Some(detect_launchers());
            }
            cached.clone().unwrap_or_default()
        };
        let procs = process_paths();
        for l in &mut list {
            l.running = l.exe.as_deref().is_some_and(|e| launcher_running(e, &procs));
        }
        list
    }

    pub fn launch_launcher(&self, id: &str) -> Result<(), String> {
        let l = self.launchers(false).into_iter().find(|l| l.id == id).ok_or("Unknown launcher")?;
        start(&l.launch)
    }

    /// Icône du launcher en data: URL (PNG), tirée de son exe une fois puis gardée dans art\.
    pub fn launcher_icon(&self, id: &str) -> Option<String> {
        let file = self.art_dir.join(format!("launcher-{}.png", art_stem(id)));
        if let Ok(bytes) = fs::read(&file) {
            return data_url(&bytes);
        }
        let exe = self.launchers(false).into_iter().find(|l| l.id == id)?.exe?;
        let png = crate::icon::exe_png(&exe, 128)?;
        let _ = fs::create_dir_all(&self.art_dir);
        let _ = fs::write(&file, &png);
        data_url(&png)
    }

    /// Jeu ajouté à la main (un .exe choisi par le joueur).
    pub fn add(&self, exe: &str) -> Result<String, String> {
        let exe = PathBuf::from(exe);
        if !exe.extension().is_some_and(|e| e.eq_ignore_ascii_case("exe")) || !exe.is_file() {
            return Err("Not a program".into());
        }
        use sha2::{Digest, Sha256};
        let hash = Sha256::digest(exe.to_string_lossy().to_lowercase().as_bytes());
        let id = format!("manual:{}", hash[..4].iter().map(|b| format!("{b:02x}")).collect::<String>());
        let name = exe.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| "Game".into());
        {
            let mut saved = self.saved.lock().unwrap();
            saved.hidden.retain(|h| *h != id);
            if !saved.manual.iter().any(|m| m.id == id) {
                saved.manual.push(Manual { id: id.clone(), name, exe });
            }
            self.save(&saved);
        }
        self.list(true);
        Ok(id)
    }

    /// Retire un jeu : ajouté à la main, il est oublié ; détecté, il est masqué (rien n'est désinstallé).
    pub fn remove(&self, id: &str) {
        {
            let mut saved = self.saved.lock().unwrap();
            let before = saved.manual.len();
            saved.manual.retain(|m| m.id != id);
            if saved.manual.len() == before && !saved.hidden.iter().any(|h| h == id) {
                saved.hidden.push(id.to_string());
            }
            saved.played.remove(id);
            self.save(&saved);
        }
        if let Ok(dir) = fs::read_dir(&self.art_dir) {
            let stem = art_stem(id);
            for e in dir.flatten() {
                if e.path().file_stem().is_some_and(|s| s.to_string_lossy() == stem) {
                    let _ = fs::remove_file(e.path());
                }
            }
        }
        if let Some(games) = self.games.lock().unwrap().as_mut() {
            games.retain(|g| g.id != id);
        }
    }

    /// Jeux retirés de la bibliothèque à nouveau affichés.
    pub fn unhide_all(&self) {
        let mut saved = self.saved.lock().unwrap();
        saved.hidden.clear();
        self.save(&saved);
        drop(saved);
        self.list(true);
    }

    /// Image officielle du jeu en data: URL, copiée dans art\ à la première demande.
    pub fn art(&self, id: &str) -> Option<String> {
        let stem = art_stem(id);
        for ext in ["jpg", "png", "webp"] {
            if let Ok(bytes) = fs::read(self.art_dir.join(format!("{stem}.{ext}"))) {
                return data_url(&bytes);
            }
        }
        // aucune image trouvée (ou pas de réseau) aujourd'hui : on ne redemande pas avant demain
        let none = self.art_dir.join(format!("{stem}.none"));
        if none.metadata().and_then(|m| m.modified()).ok().and_then(|t| t.elapsed().ok()).is_some_and(|age| age.as_secs() < 86_400) {
            return None;
        }
        let g = self.find(id)?;
        let _ = fs::create_dir_all(&self.art_dir);
        for source in &g.art {
            let bytes = match source {
                Art::File(p) => fs::metadata(p).ok().filter(|m| m.len() <= MAX_ART).and_then(|_| fs::read(p).ok()),
                Art::Url(u) => download(u),
                Art::SteamDetails(appid) => steam_header(*appid).and_then(|u| download(&u)),
                Art::SteamSearch(name) => steam_search(name).and_then(|appid| {
                    steam_header(appid).and_then(|u| download(&u)).or_else(|| {
                        steam_cdn(appid).iter().find_map(|a| match a {
                            Art::Url(u) => download(u),
                            _ => None,
                        })
                    })
                }),
                Art::EpicProduct(slug) => epic_hero(slug).and_then(|u| download(&epic_sized(&u))),
            };
            let Some(bytes) = bytes else { continue };
            let Some(ext) = image_ext(&bytes) else { continue };
            let _ = fs::write(self.art_dir.join(format!("{stem}.{ext}")), &bytes);
            let _ = fs::remove_file(&none);
            return data_url(&bytes);
        }
        let _ = fs::write(none, b"");
        None
    }

    /// Jeux lancés en ce moment : un processus dont l'exe est dans le dossier du jeu. Renvoie la liste quand elle
    /// change ; la dernière partie de chaque jeu est notée à son lancement et à sa fermeture.
    pub fn poll(&self, procs: &[PathBuf]) -> Option<Vec<String>> {
        let dirs: Vec<(String, String)> = self
            .games
            .lock()
            .unwrap()
            .iter()
            .flatten()
            .filter_map(|g| g.install_dir.as_ref().map(|d| (g.id.clone(), format!("{}\\", d.to_lowercase().trim_end_matches('\\')))))
            .filter(|(_, d)| d.len() > 4)
            .collect();
        let now: HashSet<String> = procs
            .iter()
            .map(|p| p.to_string_lossy().to_lowercase())
            .flat_map(|p| dirs.iter().filter(move |(_, d)| p.starts_with(d.as_str())).map(|(id, _)| id.clone()).collect::<Vec<_>>())
            .collect();
        let mut running = self.running.lock().unwrap();
        if *running == now {
            return None;
        }
        let changed: Vec<String> = running.symmetric_difference(&now).cloned().collect();
        *running = now.clone();
        drop(running);
        let mut saved = self.saved.lock().unwrap();
        let t = now_ms();
        for id in changed {
            saved.played.insert(id, t);
        }
        self.save(&saved);
        Some(now.into_iter().collect())
    }
}

const MAX_ART: u64 = 6 * 1024 * 1024;

fn art_stem(id: &str) -> String {
    id.chars().map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect()
}

fn image_ext(b: &[u8]) -> Option<&'static str> {
    if b.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("jpg")
    } else if b.starts_with(b"\x89PNG") {
        Some("png")
    } else if b.len() > 12 && &b[..4] == b"RIFF" && &b[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

fn data_url(bytes: &[u8]) -> Option<String> {
    let mime = match image_ext(bytes)? {
        "jpg" => "image/jpeg",
        "png" => "image/png",
        _ => "image/webp",
    };
    Some(format!("data:{mime};base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes)))
}

fn agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(std::time::Duration::from_secs(12)))
        .user_agent(concat!("RagoOptimizer/", env!("CARGO_PKG_VERSION")))
        // TLS de Windows (schannel), comme license.rs et account.rs : le TLS par défaut de ureq (rustls) n'est pas
        // compilé, et une adresse https le ferait paniquer, ce qui ferme l'app (panic = "abort")
        .tls_config(ureq::tls::TlsConfig::builder().provider(ureq::tls::TlsProvider::NativeTls).build())
        .build()
        .into()
}

fn download(url: &str) -> Option<Vec<u8>> {
    let resp = agent().get(url).call().ok()?;
    let bytes = resp.into_body().with_config().limit(MAX_ART).read_to_vec().ok()?;
    image_ext(&bytes).map(|_| bytes)
}

fn get_json(url: &str, query: &[(&str, &str)]) -> Option<serde_json::Value> {
    let mut req = agent().get(url);
    for (k, v) in query {
        req = req.query(*k, *v);
    }
    let mut resp = req.call().ok()?;
    resp.body_mut().with_config().limit(2 * 1024 * 1024).read_json().ok()
}

/// Page Steam du jeu au même nom (recherche de la boutique, sans clé). « Overwatch 2 » s'appelle « Overwatch® » sur
/// Steam : un numéro en plus à la fin du nom est accepté.
fn steam_search(name: &str) -> Option<u32> {
    let want = normalize(name);
    if want.len() < 2 {
        return None;
    }
    let json = get_json("https://store.steampowered.com/api/storesearch/", &[("term", name), ("cc", "us"), ("l", "en")])?;
    let items = json["items"].as_array()?;
    let id = |pred: &dyn Fn(&str) -> bool| items.iter().find(|i| i["name"].as_str().is_some_and(|n| pred(&normalize(n)))).and_then(|i| i["id"].as_u64());
    id(&|n| n == want)
        .or_else(|| id(&|n| n.len() >= 4 && want.strip_prefix(n).is_some_and(|rest| !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit()))))
        .and_then(|id| u32::try_from(id).ok())
}

/// Adresse de l'en-tête de la page Steam (les images récentes ont un chemin haché que seule la boutique connaît).
fn steam_header(appid: u32) -> Option<String> {
    let id = appid.to_string();
    let json = get_json("https://store.steampowered.com/api/appdetails", &[("appids", &id), ("filters", "basic"), ("cc", "us"), ("l", "en")])?;
    json[&id]["data"]["header_image"].as_str().filter(|u| u.starts_with("https://")).map(str::to_string)
}

/// Grande image de la page du jeu sur l'Epic Games Store.
fn epic_hero(slug: &str) -> Option<String> {
    let json = get_json(&format!("https://store-content-ipv4.ak.epicgames.com/api/en-US/content/products/{slug}"), &[])?;
    json["pages"].as_array()?.iter().find_map(|p| p["hero"]["backgroundImageUrl"].as_str().filter(|u| u.starts_with("https://")).map(str::to_string))
}

// ---------------------------------------------------------------- lancement sans droits d'administrateur

mod launch {
    use std::path::Path;

    /// Lance `program` avec le jeton de l'Explorateur (session du joueur, sans élévation). Rago Optimizer pas en
    /// administrateur, ou Explorateur introuvable : lancement direct.
    pub fn unelevated(program: &Path, args: &[String], cwd: Option<&Path>) -> Result<(), String> {
        #[cfg(windows)]
        if crate::shell::is_elevated() {
            if let Some(r) = win::with_shell_token(program, args, cwd) {
                return r;
            }
        }
        let mut cmd = std::process::Command::new(program);
        cmd.args(args);
        if let Some(dir) = cwd {
            cmd.current_dir(dir);
        }
        cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
    }

    /// Ligne de commande Windows : chaque argument entre guillemets s'il le faut.
    pub fn command_line(program: &Path, args: &[String]) -> String {
        let quote = |s: &str| {
            if !s.is_empty() && !s.contains([' ', '\t', '"']) {
                return s.to_string();
            }
            let mut out = String::from("\"");
            let mut backslashes = 0;
            for c in s.chars() {
                match c {
                    '\\' => backslashes += 1,
                    '"' => {
                        out.push_str(&"\\".repeat(backslashes * 2 + 1));
                        out.push('"');
                        backslashes = 0;
                    }
                    _ => {
                        out.push_str(&"\\".repeat(backslashes));
                        out.push(c);
                        backslashes = 0;
                    }
                }
            }
            out.push_str(&"\\".repeat(backslashes * 2));
            out.push('"');
            out
        };
        std::iter::once(quote(&program.to_string_lossy())).chain(args.iter().map(|a| quote(a))).collect::<Vec<_>>().join(" ")
    }

    #[cfg(windows)]
    mod win {
        use std::os::windows::ffi::OsStrExt;
        use std::path::Path;
        use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
        use windows_sys::Win32::Security::{
            DuplicateTokenEx, SecurityImpersonation, TokenPrimary, TOKEN_ADJUST_DEFAULT, TOKEN_ADJUST_SESSIONID, TOKEN_ASSIGN_PRIMARY,
            TOKEN_DUPLICATE, TOKEN_QUERY,
        };
        use windows_sys::Win32::System::Threading::{
            CreateProcessWithTokenW, OpenProcess, OpenProcessToken, PROCESS_INFORMATION, PROCESS_QUERY_LIMITED_INFORMATION, STARTUPINFOW,
        };
        use windows_sys::Win32::UI::WindowsAndMessaging::{GetShellWindow, GetWindowThreadProcessId};

        fn wide(s: &std::ffi::OsStr) -> Vec<u16> {
            s.encode_wide().chain(std::iter::once(0)).collect()
        }

        struct Handle(HANDLE);
        impl Drop for Handle {
            fn drop(&mut self) {
                if !self.0.is_null() {
                    unsafe { CloseHandle(self.0) };
                }
            }
        }

        /// None : pas d'Explorateur (session sans bureau) ou jeton refusé, l'appelant lance autrement.
        pub fn with_shell_token(program: &Path, args: &[String], cwd: Option<&Path>) -> Option<Result<(), String>> {
            unsafe {
                let shell = GetShellWindow();
                if shell.is_null() {
                    return None;
                }
                let mut pid = 0u32;
                GetWindowThreadProcessId(shell, &mut pid);
                if pid == 0 {
                    return None;
                }
                let process = Handle(OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid));
                if process.0.is_null() {
                    return None;
                }
                let mut token: HANDLE = std::ptr::null_mut();
                if OpenProcessToken(process.0, TOKEN_DUPLICATE, &mut token) == 0 {
                    return None;
                }
                let token = Handle(token);
                let mut primary: HANDLE = std::ptr::null_mut();
                let access = TOKEN_QUERY | TOKEN_ASSIGN_PRIMARY | TOKEN_DUPLICATE | TOKEN_ADJUST_DEFAULT | TOKEN_ADJUST_SESSIONID;
                if DuplicateTokenEx(token.0, access, std::ptr::null(), SecurityImpersonation, TokenPrimary, &mut primary) == 0 {
                    return None;
                }
                let primary = Handle(primary);
                let app = wide(program.as_os_str());
                let mut line = wide(std::ffi::OsStr::new(&super::command_line(program, args)));
                let dir = cwd.map(|d| wide(d.as_os_str()));
                let mut si: STARTUPINFOW = std::mem::zeroed();
                si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
                let mut pi: PROCESS_INFORMATION = std::mem::zeroed();
                // explorer.exe : cherché dans le PATH par la ligne de commande, pas par le nom d'application
                let app_ptr = if program.is_absolute() { app.as_ptr() } else { std::ptr::null() };
                let ok = CreateProcessWithTokenW(
                    primary.0,
                    0,
                    app_ptr,
                    line.as_mut_ptr(),
                    0,
                    std::ptr::null(),
                    dir.as_ref().map_or(std::ptr::null(), |d| d.as_ptr()),
                    &si,
                    &mut pi,
                );
                if ok == 0 {
                    return None;
                }
                CloseHandle(pi.hThread);
                CloseHandle(pi.hProcess);
                Some(Ok(()))
            }
        }
    }
}

/// Exe de chaque processus lancé (pour `Library::poll`), sans ceux de Windows.
#[cfg(windows)]
pub fn process_paths() -> Vec<PathBuf> {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS};
    use windows_sys::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION};
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
                let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, e.th32ProcessID);
                if !h.is_null() {
                    let mut buf = [0u16; 1024];
                    let mut len = buf.len() as u32;
                    if QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut len) != 0 {
                        out.push(PathBuf::from(String::from_utf16_lossy(&buf[..len as usize])));
                    }
                    CloseHandle(h);
                }
            }
            more = Process32NextW(snap, &mut e) != 0;
        }
        CloseHandle(snap);
    }
    out
}

#[cfg(not(windows))]
pub fn process_paths() -> Vec<PathBuf> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_steam_libraries_and_manifests() {
        let lib = r#""libraryfolders"
{
	"0"
	{
		"path"		"C:\\Program Files (x86)\\Steam"
		"apps" { "730" "123" }
	}
	"1"
	{
		"path"		"D:\\SteamLibrary"
	}
}"#;
        assert_eq!(steam_libraries(&parse_vdf(lib)), vec![PathBuf::from("C:\\Program Files (x86)\\Steam"), PathBuf::from("D:\\SteamLibrary")]);
        let old = "\"LibraryFolders\" { \"TimeNextStatsReport\" \"1\" \"1\" \"E:\\\\Games\" }";
        assert_eq!(steam_libraries(&parse_vdf(old)), vec![PathBuf::from("E:\\Games")]);
        let acf = "\"AppState\"\n{\n\t\"appid\"\t\t\"730\"\n\t\"name\"\t\t\"Counter-Strike 2\"\n\t\"StateFlags\"\t\t\"4\"\n\t\"installdir\"\t\t\"Counter-Strike Global Offensive\"\n}";
        assert_eq!(steam_app(&parse_vdf(acf)), Some((730, "Counter-Strike 2".into(), "Counter-Strike Global Offensive".into())));
        // en cours de téléchargement, ou outil de Steam
        assert_eq!(steam_app(&parse_vdf(&acf.replace("\"4\"", "\"1026\""))).map(|a| a.0), None);
        assert_eq!(steam_app(&parse_vdf(&acf.replace("Counter-Strike 2", "Steamworks Common Redistributables"))), None);
    }

    #[test]
    fn reads_epic_manifest_and_catalog() {
        let item: EpicItem = serde_json::from_str(
            r#"{"DisplayName":"Fortnite","InstallLocation":"C:\\Program Files\\Epic Games\\Fortnite","AppName":"Fortnite","MainGameAppName":"Fortnite",
                "CatalogNamespace":"fn","CatalogItemId":"4fe75bbc5a674f4f9b356b5c90567da5","AppCategories":["public","games","applications"],"bIsIncompleteInstall":false}"#,
        )
        .unwrap();
        assert!(item.is_game());
        assert_eq!(item.launch_url(), "com.epicgames.launcher://apps/fn%3A4fe75bbc5a674f4f9b356b5c90567da5%3AFortnite?action=launch&silent=true");
        let dlc = EpicItem { main_game_app_name: "Other".into(), ..serde_json::from_str(r#"{"DisplayName":"x","InstallLocation":"y","AppName":"z"}"#).unwrap() };
        assert!(!dlc.is_game());
        let json = r#"[{"id":"4fe75bbc5a674f4f9b356b5c90567da5","keyImages":[{"type":"DieselGameBoxTall","url":"https://cdn1.epicgames.com/tall.jpg"},{"type":"DieselGameBox","url":"https://cdn1.epicgames.com/wide.jpg"}]}]"#;
        let bin = base64::engine::general_purpose::STANDARD.encode(json);
        assert_eq!(epic_images(bin.as_bytes()).get("4fe75bbc5a674f4f9b356b5c90567da5").map(String::as_str), Some("https://cdn1.epicgames.com/wide.jpg"));
    }

    #[test]
    fn reads_riot_xbox_and_uninstall_values() {
        let yaml = "product_install_full_path: \"C:/Riot Games/VALORANT/live\"\nproduct_install_root: \"C:/Riot Games\"\n";
        assert_eq!(yaml_value(yaml, "product_install_full_path").as_deref(), Some("C:/Riot Games/VALORANT/live"));
        // identifiant d'éditeur bien connu de Microsoft
        assert_eq!(publisher_id("CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US"), "8wekyb3d8bbwe");
        let xml = r#"<Game configVersion="1"><Identity Name="Microsoft.624F8B84B80" Publisher="CN=A, O=B" Version="1.0"/>
            <ExecutableList><Executable Name="FortniteClient.exe" Id="Game" /></ExecutableList>
            <ShellVisuals DefaultDisplayName="Fortnite &amp; Co" Square480x480Logo="Logo480.png"/></Game>"#;
        assert_eq!(xml_attr(xml, "Identity", "Name").as_deref(), Some("Microsoft.624F8B84B80"));
        assert_eq!(xml_attr(xml, "ShellVisuals", "DefaultDisplayName").as_deref(), Some("Fortnite & Co"));
        assert_eq!(xml_attr(xml, "Executable", "Id").as_deref(), Some("Game"));
        let mut root = b"RGBX\x01\x00\x00\x00".to_vec();
        root.extend("\\XboxGames\0".encode_utf16().flat_map(u16::to_le_bytes));
        assert_eq!(gaming_root(&root), vec!["\\XboxGames".to_string()]);
        assert_eq!(icon_exe("\"C:\\Program Files\\Lunar Client\\Lunar Client.exe\",0"), Some(PathBuf::from("C:\\Program Files\\Lunar Client\\Lunar Client.exe")));
        assert_eq!(mc_launcher("Lunar Client 3.2.1").map(|l| l.0), Some("lunar"));
        assert_eq!(mc_launcher("Minecraft Launcher").map(|l| l.0), Some("official"));
        assert!(mc_launcher("Minecraft Education").is_none());
    }

    #[test]
    fn sorts_games_by_kind() {
        assert_eq!(kind_of("Counter-Strike 2"), "shooter");
        assert_eq!(kind_of("VALORANT"), "shooter");
        assert_eq!(kind_of("Minecraft"), "minecraft");
        assert_eq!(kind_of("Rocket League®"), "other");
        assert_eq!(normalize("Tom Clancy's Rainbow Six® Siege"), "tomclancysrainbowsixsiege");
    }

    #[test]
    fn quotes_command_lines() {
        let line = launch::command_line(Path::new("C:\\Riot Games\\Riot Client\\RiotClientServices.exe"), &["--launch-product=valorant".into(), "a b".into()]);
        assert_eq!(line, "\"C:\\Riot Games\\Riot Client\\RiotClientServices.exe\" --launch-product=valorant \"a b\"");
    }

    #[test]
    fn images_download_over_https_without_crashing() {
        // un serveur qui accepte la connexion sans répondre : la poignée de main TLS échoue, sans panique
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        std::thread::spawn(move || {
            let _c = l.accept();
            std::thread::sleep(std::time::Duration::from_secs(2));
        });
        assert_eq!(agent().config().tls_config().provider(), ureq::tls::TlsProvider::NativeTls);
        let local = agent().get(format!("https://127.0.0.1:{port}/x.jpg")).config().proxy(None).build().call();
        assert!(local.is_err());
    }

    #[test]
    fn notes_running_games_and_last_played() {
        let dir = std::env::temp_dir().join(format!("rago-games-test-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let lib = Library::new(&dir);
        let g = Game::new("steam:730".into(), "Counter-Strike 2".into(), "steam", Launch::Url("steam://rungameid/730".into()))
            .dir(Some(PathBuf::from("D:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive")));
        *lib.games.lock().unwrap() = Some(vec![g]);
        let cs = PathBuf::from("D:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive\\game\\bin\\win64\\cs2.exe");
        assert_eq!(lib.poll(&[cs.clone()]), Some(vec!["steam:730".to_string()]));
        assert_eq!(lib.poll(&[cs]), None);
        assert_eq!(lib.poll(&[PathBuf::from("C:\\Windows\\explorer.exe")]), Some(vec![]));
        // barre en jeu : le nom du jeu d'après son exe, sans confondre un dossier voisin au nom plus long
        assert_eq!(lib.name_for(Path::new("d:/steamlibrary/steamapps/common/Counter-Strike Global Offensive/game/bin/win64/cs2.exe")).as_deref(), Some("Counter-Strike 2"));
        assert_eq!(lib.name_for(Path::new("D:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive 2\\x.exe")), None);
        let listed = lib.list(false);
        assert!(listed[0].last_played.is_some() && !listed[0].running);
        // gardée sur disque
        assert!(Library::new(&dir).saved.lock().unwrap().played.contains_key("steam:730"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn launchers_are_recognized() {
        assert!(matches_name("Lunar Client 3.2.1", &["lunar client"]));
        assert!(matches_name("Steam", &["steam"]));
        assert!(!matches_name("SteamVR", &["steam"]));
        assert!(!matches_name("Epic Games Store Helper", &["epic games launcher"]));
        // ids uniques, un exe attendu pour chacun
        let mut ids = HashSet::new();
        assert!(LAUNCHER_DEFS.iter().all(|d| ids.insert(d.id) && !d.exe.is_empty() && !d.uninstall.is_empty()));
        // Steam ouvert : steam.exe dans son dossier ; un jeu de steamapps n'ouvre pas Steam
        let steam = Path::new("C:/Program Files (x86)/Steam/steam.exe");
        assert!(launcher_running(steam, &[PathBuf::from("C:/Program Files (x86)/Steam/steam.exe")]));
        assert!(!launcher_running(steam, &[PathBuf::from("C:/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive/game/bin/win64/cs2.exe")]));
    }

}
