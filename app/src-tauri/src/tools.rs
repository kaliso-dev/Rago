//! Page Outils : nettoyage des fichiers inutiles, applis préinstallées, pilotes du PC, programmes lancés avec Windows,
//! cache DNS, mode d'alimentation et raccourcis vers les réglages de Windows. Natif, hors catalogue : le nettoyage
//! supprime pour de bon, une appli désinstallée se réinstalle depuis le Microsoft Store, un programme coupé au
//! démarrage se rallume ici ou dans le Gestionnaire des tâches.

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use crate::shell;

// ---------------------------------------------------------------------------------------------------- nettoyage

/// Zones du nettoyage, dans l'ordre affiché. Ni Prefetch ni journaux de Windows ni dossiers de Minecraft : le
/// vérificateur de screenshare RBW les regarde, les vider passerait pour un effacement de traces.
pub const AREAS: &[&str] = &["temp", "windows_temp", "update", "crash", "browsers", "discord", "launchers", "shaders", "recycle"];

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Area {
    pub id: &'static str,
    pub bytes: u64,
    pub files: u64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Cleaned {
    pub bytes: u64,
    pub files: u64,
    /// fichiers en cours d'utilisation (navigateur ouvert, mise à jour en cours) : laissés en place
    pub skipped: u64,
}

pub enum Target {
    /// le contenu du dossier, pas le dossier
    Dir(PathBuf),
    File(PathBuf),
}

/// Dossier d'une variable d'environnement, seulement s'il est absolu (vide ou relatif : rien, jamais le dossier courant).
fn env_dir(var: &str) -> Option<PathBuf> {
    let p = PathBuf::from(std::env::var_os(var)?);
    p.is_absolute().then_some(p)
}

/// Caches de chaque profil d'un navigateur Chromium (Default, Profile 1…) : jamais l'historique, les mots de passe
/// ni les cookies.
fn chromium(user_data: &Path, out: &mut Vec<Target>) {
    let Ok(rd) = std::fs::read_dir(user_data) else { return };
    for e in rd.flatten() {
        let p = e.path();
        if p.join("Preferences").is_file() {
            for sub in ["Cache", "Code Cache", "GPUCache"] {
                out.push(Target::Dir(p.join(sub)));
            }
        }
    }
    for sub in ["ShaderCache", "GrShaderCache"] {
        out.push(Target::Dir(user_data.join(sub)));
    }
}

pub fn targets(id: &str) -> Vec<Target> {
    let local = env_dir("LOCALAPPDATA");
    let roaming = env_dir("APPDATA");
    let windows = env_dir("SystemRoot").or_else(|| env_dir("windir"));
    let data = env_dir("ProgramData");
    let mut out = Vec::new();
    match id {
        "temp" => out.extend(Some(std::env::temp_dir()).filter(|t| temp_like(t)).map(Target::Dir)),
        "windows_temp" => out.extend(windows.map(|w| Target::Dir(w.join("Temp")))),
        "update" => out.extend(windows.map(|w| Target::Dir(w.join("SoftwareDistribution\\Download")))),
        "crash" => {
            if let Some(l) = &local {
                out.push(Target::Dir(l.join("CrashDumps")));
                out.push(Target::Dir(l.join("Microsoft\\Windows\\WER\\ReportArchive")));
                out.push(Target::Dir(l.join("Microsoft\\Windows\\WER\\ReportQueue")));
            }
            if let Some(w) = &windows {
                out.push(Target::Dir(w.join("Minidump")));
                out.push(Target::File(w.join("MEMORY.DMP")));
            }
            if let Some(d) = &data {
                out.push(Target::Dir(d.join("Microsoft\\Windows\\WER\\ReportArchive")));
                out.push(Target::Dir(d.join("Microsoft\\Windows\\WER\\ReportQueue")));
            }
        }
        "browsers" => {
            if let Some(l) = &local {
                for b in ["Google\\Chrome", "Microsoft\\Edge", "BraveSoftware\\Brave-Browser", "Vivaldi"] {
                    chromium(&l.join(b).join("User Data"), &mut out);
                }
                // Opera : le profil est le dossier lui-même
                for o in ["Opera Software\\Opera Stable", "Opera Software\\Opera GX Stable"] {
                    out.push(Target::Dir(l.join(o).join("Cache")));
                }
                if let Ok(rd) = std::fs::read_dir(l.join("Mozilla\\Firefox\\Profiles")) {
                    out.extend(rd.flatten().map(|e| Target::Dir(e.path().join("cache2"))));
                }
            }
        }
        "discord" => {
            if let Some(r) = &roaming {
                for app in ["discord", "discordptb", "discordcanary"] {
                    for sub in ["Cache", "Code Cache", "GPUCache"] {
                        out.push(Target::Dir(r.join(app).join(sub)));
                    }
                }
            }
        }
        // pages web des launchers (boutique, actus, pubs), recréées au besoin : jamais les jeux, la bibliothèque
        // d'images de Steam (librarycache) ni les réglages
        "launchers" => {
            if let Some(l) = &local {
                out.push(Target::Dir(l.join("Steam\\htmlcache")));
                // Epic : webcache, webcache_4147, webcache_4430… selon la version du launcher
                if let Ok(rd) = std::fs::read_dir(l.join("EpicGamesLauncher\\Saved")) {
                    out.extend(
                        rd.flatten()
                            .filter(|e| e.file_name().to_str().is_some_and(|n| n.to_ascii_lowercase().starts_with("webcache")))
                            .filter(|e| e.file_type().is_ok_and(|t| t.is_dir()))
                            .map(|e| Target::Dir(e.path())),
                    );
                }
            }
            out.extend(steam_root().map(|s| Target::Dir(s.join("appcache\\httpcache"))));
        }
        "shaders" => {
            if let Some(l) = &local {
                for sub in ["NVIDIA\\DXCache", "NVIDIA\\GLCache", "D3DSCache", "AMD\\DxCache", "AMD\\DxcCache", "AMD\\GLCache", "AMD\\VkCache"] {
                    out.push(Target::Dir(l.join(sub)));
                }
            }
            if let Some(d) = &data {
                out.push(Target::Dir(d.join("NVIDIA Corporation\\NV_Cache")));
            }
        }
        _ => {}
    }
    out
}

/// Dossier d'installation de Steam (comme la bibliothèque de jeux), seulement s'il est absolu.
#[cfg(windows)]
fn steam_root() -> Option<PathBuf> {
    crate::reg::string("HKCU\\Software\\Valve\\Steam", "SteamPath")
        .or_else(|| crate::reg::string("HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath"))
        .map(|p| PathBuf::from(p.replace('/', "\\")))
        .filter(|p| p.is_absolute())
}

#[cfg(not(windows))]
fn steam_root() -> Option<PathBuf> {
    None
}

/// Le dossier temporaire tel que Windows le donne, seulement s'il s'appelle bien Temp ou Tmp : une variable TEMP mal
/// réglée (« C:\\ ») ne doit jamais faire vider un disque entier.
fn temp_like(p: &Path) -> bool {
    p.is_absolute() && p.components().count() >= 3 && p.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.eq_ignore_ascii_case("temp") || n.eq_ignore_ascii_case("tmp"))
}

/// Dossiers que l'app crée elle-même dans le dossier temporaire (scripts en cours, ressources) : jamais touchés.
fn ours(path: &Path) -> bool {
    path.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.to_ascii_lowercase().starts_with("rago"))
}

/// Lien symbolique ou jonction : ni compté ni suivi (il peut mener n'importe où, y compris hors de la zone).
fn is_link(md: &std::fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        md.file_attributes() & 0x400 != 0 // FILE_ATTRIBUTE_REPARSE_POINT
    }
    #[cfg(not(windows))]
    {
        md.file_type().is_symlink()
    }
}

/// Fichiers d'un dossier, sous-dossiers compris, sans suivre les liens : (chemin, taille).
fn files_in(dir: &Path, top: bool, out: &mut Vec<(PathBuf, u64)>, dirs: &mut Vec<PathBuf>) {
    let Ok(rd) = std::fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let path = e.path();
        if top && ours(&path) {
            continue;
        }
        let Ok(md) = e.metadata() else { continue };
        if is_link(&md) {
            continue;
        }
        if md.is_dir() {
            files_in(&path, false, out, dirs);
            dirs.push(path);
        } else {
            out.push((path, md.len()));
        }
    }
}

fn collect(targets: &[Target]) -> (Vec<(PathBuf, u64)>, Vec<PathBuf>) {
    let (mut files, mut dirs) = (Vec::new(), Vec::new());
    let mut seen = HashSet::new();
    for t in targets {
        match t {
            Target::Dir(d) if seen.insert(d.clone()) => files_in(d, true, &mut files, &mut dirs),
            Target::File(f) if seen.insert(f.clone()) => {
                if let Ok(md) = std::fs::symlink_metadata(f) {
                    if md.is_file() && !is_link(&md) {
                        files.push((f.clone(), md.len()));
                    }
                }
            }
            _ => {}
        }
    }
    (files, dirs)
}

pub fn measure(targets: &[Target]) -> (u64, u64) {
    let (files, _) = collect(targets);
    (files.iter().map(|(_, n)| n).sum(), files.len() as u64)
}

pub fn clean(targets: &[Target]) -> Cleaned {
    let (files, dirs) = collect(targets);
    let mut out = Cleaned::default();
    for (path, size) in files {
        let gone = std::fs::remove_file(&path).is_ok() || {
            // lecture seule : on retire l'attribut, puis on réessaie
            std::fs::metadata(&path)
                .map(|md| {
                    let mut p = md.permissions();
                    #[allow(clippy::permissions_set_readonly_false)]
                    p.set_readonly(false);
                    std::fs::set_permissions(&path, p).is_ok() && std::fs::remove_file(&path).is_ok()
                })
                .unwrap_or(false)
        };
        if gone {
            out.bytes += size;
            out.files += 1;
        } else {
            out.skipped += 1;
        }
    }
    // dossiers vidés, des plus profonds aux plus hauts ; ceux qui gardent un fichier ouvert restent
    for d in dirs {
        let _ = std::fs::remove_dir(d);
    }
    out
}

pub fn scan() -> Vec<Area> {
    AREAS
        .iter()
        .map(|&id| {
            let (bytes, files) = if id == "recycle" { win::recycle_size() } else { measure(&targets(id)) };
            Area { id, bytes, files }
        })
        .collect()
}

pub fn clean_areas(ids: &[String]) -> Cleaned {
    let mut total = Cleaned::default();
    for id in ids.iter().filter(|id| AREAS.contains(&id.as_str())) {
        if id == "recycle" {
            let (bytes, files) = win::recycle_size();
            if win::empty_recycle() {
                total.bytes += bytes;
                total.files += files;
            }
            continue;
        }
        let c = clean(&targets(id));
        total.bytes += c.bytes;
        total.files += c.files;
        total.skipped += c.skipped;
    }
    total
}

// ---------------------------------------------------------------------------------------------------- applis

/// Applis préinstallées ou sponsorisées qu'on peut retirer sans rien casser : (nom du paquet, nom anglais, nom
/// français). Jamais le Store, Xbox et la Game Bar (Game Pass, captures), Photos, la calculatrice, le bloc-notes,
/// Paint, l'outil Capture ni la caméra.
pub const BLOAT: &[(&str, &str, &str)] = &[
    ("Microsoft.BingNews", "News", "Actualités"),
    ("Microsoft.BingWeather", "Weather", "Météo"),
    ("Microsoft.BingSearch", "Bing Search", "Recherche Bing"),
    ("Microsoft.GetHelp", "Get Help", "Obtenir de l'aide"),
    ("Microsoft.Getstarted", "Tips", "Astuces"),
    ("Microsoft.MicrosoftSolitaireCollection", "Solitaire Collection", "Solitaire Collection"),
    ("Microsoft.MicrosoftOfficeHub", "Microsoft 365 (Office)", "Microsoft 365 (Office)"),
    ("Microsoft.WindowsFeedbackHub", "Feedback Hub", "Hub de commentaires"),
    ("Microsoft.WindowsMaps", "Maps", "Cartes"),
    ("Microsoft.People", "People", "Contacts"),
    ("Microsoft.ZuneVideo", "Movies & TV", "Films et TV"),
    ("Microsoft.SkypeApp", "Skype", "Skype"),
    ("Microsoft.Todos", "Microsoft To Do", "Microsoft To Do"),
    ("Microsoft.PowerAutomateDesktop", "Power Automate", "Power Automate"),
    ("Clipchamp.Clipchamp", "Clipchamp", "Clipchamp"),
    ("Microsoft.549981C3F5F10", "Cortana", "Cortana"),
    ("MSTeams", "Teams (personal)", "Teams (personnel)"),
    ("MicrosoftTeams", "Teams (personal)", "Teams (personnel)"),
    ("Microsoft.OutlookForWindows", "Outlook (new)", "Outlook (nouveau)"),
    ("microsoft.windowscommunicationsapps", "Mail and Calendar", "Courrier et Calendrier"),
    ("Microsoft.MixedReality.Portal", "Mixed Reality Portal", "Portail de réalité mixte"),
    ("Microsoft.Microsoft3DViewer", "3D Viewer", "Visionneuse 3D"),
    ("Microsoft.Office.OneNote", "OneNote for Windows 10", "OneNote pour Windows 10"),
    ("Microsoft.WindowsSoundRecorder", "Sound Recorder", "Enregistreur vocal"),
    ("Microsoft.YourPhone", "Phone Link", "Lien avec le téléphone"),
    ("Microsoft.Copilot", "Copilot", "Copilot"),
    ("Microsoft.Windows.DevHome", "Dev Home", "Dev Home"),
    ("MicrosoftCorporationII.MicrosoftFamily", "Family Safety", "Family Safety"),
    ("king.com.CandyCrushSaga", "Candy Crush Saga", "Candy Crush Saga"),
    ("king.com.CandyCrushSodaSaga", "Candy Crush Soda Saga", "Candy Crush Soda Saga"),
    ("SpotifyAB.SpotifyMusic", "Spotify", "Spotify"),
    ("Disney.37853FC22B2CE", "Disney+", "Disney+"),
    ("BytedancePte.Ltd.TikTok", "TikTok", "TikTok"),
    ("Facebook.Facebook", "Facebook", "Facebook"),
    ("Facebook.InstagramBeta", "Instagram", "Instagram"),
    ("4DF9E0F8.Netflix", "Netflix", "Netflix"),
    ("AmazonVideo.PrimeVideo", "Prime Video", "Prime Video"),
    ("7EE7776C.LinkedInforWindows", "LinkedIn", "LinkedIn"),
];

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct App {
    /// nom du paquet
    pub id: &'static str,
    pub name: Names,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Names {
    pub en: &'static str,
    pub fr: &'static str,
}

/// Applis de la liste parmi les paquets installés (noms de paquets, sans tenir compte de la casse).
pub fn bloat_in(installed: &[String]) -> Vec<App> {
    let have: HashSet<String> = installed.iter().map(|s| s.trim().to_ascii_lowercase()).collect();
    BLOAT
        .iter()
        .filter(|(id, _, _)| have.contains(&id.to_ascii_lowercase()))
        .map(|&(id, en, fr)| App { id, name: Names { en, fr } })
        .collect()
}

fn installed_packages() -> Vec<String> {
    shell::powershell("Get-AppxPackage | Select-Object -ExpandProperty Name")
        .map(|s| s.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect())
        .unwrap_or_default()
}

pub fn apps() -> Vec<App> {
    bloat_in(&installed_packages())
}

/// Désinstalle pour le compte Windows courant (seulement des paquets de la liste) ; renvoie ceux encore là.
pub fn remove_apps(ids: &[String]) -> Vec<App> {
    let names: Vec<&str> = BLOAT.iter().map(|(id, _, _)| *id).filter(|id| ids.iter().any(|x| x == id)).collect();
    if !names.is_empty() {
        let list = names.iter().map(|n| format!("'{n}'")).collect::<Vec<_>>().join(",");
        shell::powershell(&format!(
            "foreach ($n in @({list})) {{ Get-AppxPackage -Name $n | Remove-AppxPackage -ErrorAction SilentlyContinue }}; 'ok'"
        ));
    }
    apps()
}

// ---------------------------------------------------------------------------------------------------- pilotes

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Driver {
    /// gpu, network ou audio
    pub kind: &'static str,
    pub name: String,
    pub version: String,
    /// AAAA-MM-JJ
    pub date: Option<String>,
    pub provider: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Drivers {
    pub drivers: Vec<Driver>,
    /// fabricant de la carte mère, ou du PC portable (pilotes de chipset et d'audio sur son site)
    pub maker: Option<String>,
    pub model: Option<String>,
}

const DRIVERS: &str = r#"$d = @(Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue | Where-Object { $_.DeviceClass -in 'DISPLAY','NET','MEDIA' -and $_.DeviceName } | ForEach-Object { [pscustomobject]@{ cls = $_.DeviceClass; name = $_.DeviceName; version = $_.DriverVersion; date = $(if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') }); provider = $_.DriverProviderName } });
$b = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1;
$s = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue | Select-Object -First 1;
[pscustomobject]@{ drivers = $d; board = $b.Manufacturer; boardModel = $b.Product; system = $s.Manufacturer; systemModel = $s.Model } | ConvertTo-Json -Compress -Depth 3"#;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PsDrivers {
    #[serde(default)]
    drivers: Option<serde_json::Value>,
    board: Option<String>,
    board_model: Option<String>,
    system: Option<String>,
    system_model: Option<String>,
}

#[derive(Deserialize)]
struct PsDriver {
    cls: Option<String>,
    name: Option<String>,
    version: Option<String>,
    date: Option<String>,
    provider: Option<String>,
}

/// Cartes virtuelles (VPN, machines virtuelles, captures) et pilotes génériques de Windows : rien à mettre à jour.
fn virtual_device(name: &str, provider: &str) -> bool {
    let n = name.to_ascii_lowercase();
    ["virtual", "vpn", "tap-", "tap ", "npcap", "loopback", "wan miniport", "hyper-v", "vmware", "virtualbox", "bluetooth", "streaming", "broadcast", "remote ndis", "kernel debug", "wi-fi direct"]
        .iter()
        .any(|w| n.contains(w))
        || provider.eq_ignore_ascii_case("microsoft")
}

/// « To Be Filled By O.E.M. », « System manufacturer » : pas un vrai fabricant.
fn real_maker(s: Option<String>) -> Option<String> {
    let s = s?.trim().to_string();
    let l = s.to_ascii_lowercase();
    (!s.is_empty() && !l.contains("o.e.m") && !l.contains("system manufacturer") && !l.contains("default string")).then_some(s)
}

pub fn parse_drivers(json: &str) -> Drivers {
    let ps: PsDrivers = serde_json::from_str(json).unwrap_or_default();
    let list: Vec<PsDriver> = match ps.drivers {
        Some(serde_json::Value::Array(a)) => a.into_iter().filter_map(|v| serde_json::from_value(v).ok()).collect(),
        Some(v @ serde_json::Value::Object(_)) => serde_json::from_value(v).ok().into_iter().collect(),
        _ => vec![],
    };
    let mut seen = HashSet::new();
    let mut drivers: Vec<Driver> = list
        .into_iter()
        .filter_map(|d| {
            let kind = match d.cls?.to_ascii_uppercase().as_str() {
                "DISPLAY" => "gpu",
                "NET" => "network",
                "MEDIA" => "audio",
                _ => return None,
            };
            let name = d.name?.trim().to_string();
            let provider = d.provider.unwrap_or_default().trim().to_string();
            if name.is_empty() || virtual_device(&name, &provider) || !seen.insert(name.to_ascii_lowercase()) {
                return None;
            }
            Some(Driver { kind, name, version: d.version.unwrap_or_default(), date: d.date.filter(|s| !s.is_empty()), provider })
        })
        .collect();
    drivers.sort_by_key(|d| ["gpu", "network", "audio"].iter().position(|k| *k == d.kind));
    // portable de marque : le fabricant du PC ; tour montée : celui de la carte mère
    let system = real_maker(ps.system);
    let laptop_maker = system.as_deref().is_some_and(|s| {
        let l = s.to_ascii_lowercase();
        ["lenovo", "hp", "hewlett", "dell", "acer", "asus", "msi", "micro-star", "gigabyte", "razer", "samsung", "huawei", "microsoft"].iter().any(|m| l.contains(m))
    });
    let board = real_maker(ps.board);
    let (maker, model) = match board {
        Some(b) if !laptop_maker => (Some(b), real_maker(ps.board_model)),
        board => (system.or(board), real_maker(ps.system_model)),
    };
    Drivers { drivers, maker, model }
}

pub fn drivers() -> Drivers {
    shell::powershell(DRIVERS).map(|s| parse_drivers(&s)).unwrap_or_default()
}

// ---------------------------------------------------------------------------------------------------- démarrage

/// Programme lancé avec Windows, comme le Gestionnaire des tâches les montre : clés Run (compte, PC, PC en 32 bits) et
/// dossiers Démarrage (compte, tous les comptes).
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StartupApp {
    /// « source|nom » : seul moyen de désigner une entrée pour l'activer ou la couper
    pub id: String,
    pub name: String,
    /// éditeur du programme (vide s'il n'est pas connu)
    pub publisher: String,
    /// commande lancée, ou cible du raccourci
    pub command: String,
    /// "user" (ce compte) ou "machine" (tous les comptes)
    pub scope: &'static str,
    pub enabled: bool,
    /// sécurité, pilotes audio ou du pavé tactile, anti-cheat, Rago : ne se coupe pas depuis Rago
    pub keep: bool,
}

/// Où chaque source garde son état activé/coupé : les valeurs binaires que le Gestionnaire des tâches écrit
/// (StartupApproved). Couper un programme n'efface rien : sa clé Run ou son raccourci restent en place.
const STARTUP_SOURCES: &[(&str, &str)] = &[
    ("hkcu", r"HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
    ("hklm", r"HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
    ("hklm32", r"HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32"),
    ("startup", r"HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder"),
    ("commonstartup", r"HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder"),
];

/// Liste les entrées de démarrage en JSON : source, nom, commande, description et éditeur de l'exe, premier octet de
/// l'état StartupApproved (absent = activé).
const STARTUP_LIST: &str = r#"$ok = @{ hkcu = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'; hklm = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'; hklm32 = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32'; startup = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder'; commonstartup = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder' };
function St($src, $name) { $k = Get-Item -LiteralPath $ok[$src] -ErrorAction SilentlyContinue; if ($k) { $v = $k.GetValue($name); if ($v -is [byte[]] -and $v.Length -gt 0) { return [int]$v[0] } }; return $null }
function ExeOf($c) { $c = [Environment]::ExpandEnvironmentVariables([string]$c); if ($c -match '^\s*"([^"]+)"') { return $Matches[1] }; if ($c -match '^\s*(.+?\.exe)(\s|$)') { return $Matches[1] }; return $c.Trim() }
function Info($p) { if ($p) { try { $vi = (Get-Item -LiteralPath $p -ErrorAction Stop).VersionInfo; return @([string]$vi.FileDescription, [string]$vi.CompanyName) } catch {} }; return @('', '') }
$out = New-Object System.Collections.ArrayList;
foreach ($s in @(@('hkcu', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'), @('hklm', 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'), @('hklm32', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run'))) {
  $k = Get-Item -LiteralPath $s[1] -ErrorAction SilentlyContinue; if (-not $k) { continue }
  foreach ($n in $k.GetValueNames()) { if (-not $n) { continue }; $cmd = [string]$k.GetValue($n); $i = Info (ExeOf $cmd); [void]$out.Add([pscustomobject]@{ src = $s[0]; name = $n; cmd = $cmd; desc = $i[0]; company = $i[1]; state = (St $s[0] $n) }) }
}
foreach ($s in @(@('startup', [Environment]::GetFolderPath('Startup')), @('commonstartup', [Environment]::GetFolderPath('CommonStartup')))) {
  if (-not $s[1] -or -not (Test-Path -LiteralPath $s[1])) { continue }
  foreach ($f in Get-ChildItem -LiteralPath $s[1] -File -Force -ErrorAction SilentlyContinue) {
    if ($f.Name -ieq 'desktop.ini') { continue }
    $target = $f.FullName; if ($f.Extension -ieq '.lnk') { try { $t = (New-Object -ComObject WScript.Shell).CreateShortcut($f.FullName).TargetPath; if ($t) { $target = $t } } catch {} }
    $i = Info $target; [void]$out.Add([pscustomobject]@{ src = $s[0]; name = $f.Name; cmd = $target; desc = $i[0]; company = $i[1]; state = (St $s[0] $f.Name) })
  }
}
ConvertTo-Json -InputObject @($out) -Compress -Depth 3"#;

#[derive(Deserialize)]
struct PsStartup {
    src: Option<String>,
    name: Option<String>,
    cmd: Option<String>,
    desc: Option<String>,
    company: Option<String>,
    state: Option<i64>,
}

/// Ce qu'on ne coupe pas depuis Rago : la sécurité de Windows et les antivirus, les consoles audio et les pilotes du
/// pavé tactile (sinon plus de son ou de gestes après un redémarrage), les anti-cheat (le jeu peut refuser de se lancer)
/// et Rago lui-même.
const STARTUP_KEEP: &[&str] = &[
    "securityhealth", "windows security", "windowsdefender", "windows defender", "msascui", "avast", "avgui", "avira",
    "bitdefender", "kaspersky", "norton", "mcafee", "eset", "malwarebytes", "sophos", "trend micro", "f-secure",
    "webroot", "rtkaud", "rthdvcpl", "ravcpl", "realtek", "nahimic", "maxxaudio", "dolby", "synaptics", "syntp",
    "elantech", "etdctrl", "vgtray", "vanguard", "faceit", "easyanticheat", "battleye", "rago optimizer",
    "rago-optimizer", "rago hub",
];

fn startup_keep(name: &str, command: &str, desc: &str, company: &str) -> bool {
    let all = format!("{name} {command} {desc} {company}").to_ascii_lowercase();
    STARTUP_KEEP.iter().any(|w| all.contains(w)) || name.to_ascii_lowercase().starts_with("rago")
}

/// Nom lisible : le nom de l'entrée (ou du raccourci, sans « .lnk »), sauf s'il ressemble à un identifiant
/// (« com.squirrel.Teams.Teams », « {GUID} ») et que l'exe a une description.
fn startup_name(name: &str, desc: &str) -> String {
    let base = name.strip_suffix(".lnk").or_else(|| name.strip_suffix(".LNK")).unwrap_or(name).trim();
    let id_like = !base.contains(' ') && (base.contains('.') || base.contains('{') || base.contains('_'));
    if (id_like || base.is_empty()) && !desc.trim().is_empty() {
        desc.trim().to_string()
    } else {
        base.to_string()
    }
}

pub fn parse_startup(json: &str) -> Vec<StartupApp> {
    let list: Vec<PsStartup> = match serde_json::from_str::<serde_json::Value>(json) {
        Ok(serde_json::Value::Array(a)) => a.into_iter().filter_map(|v| serde_json::from_value(v).ok()).collect(),
        Ok(v @ serde_json::Value::Object(_)) => serde_json::from_value(v).ok().into_iter().collect(),
        _ => vec![],
    };
    let mut seen = HashSet::new();
    let mut out: Vec<StartupApp> = list
        .into_iter()
        .filter_map(|e| {
            let src = e.src?;
            let scope = match src.as_str() {
                "hkcu" | "startup" => "user",
                "hklm" | "hklm32" | "commonstartup" => "machine",
                _ => return None,
            };
            let raw = e.name?;
            if raw.trim().is_empty() || raw.contains('|') {
                return None;
            }
            let id = format!("{src}|{raw}");
            if !seen.insert(id.to_lowercase()) {
                return None;
            }
            let (command, desc, company) = (e.cmd.unwrap_or_default(), e.desc.unwrap_or_default(), e.company.unwrap_or_default());
            Some(StartupApp {
                keep: startup_keep(&raw, &command, &desc, &company),
                name: startup_name(&raw, &desc),
                publisher: company.trim().to_string(),
                command: command.trim().to_string(),
                scope,
                // premier octet pair (2, 6) : activé ; impair (3, 7) : coupé ; pas de valeur : activé
                enabled: e.state.map_or(true, |b| b % 2 == 0),
                id,
            })
        })
        .collect();
    out.sort_by_key(|a| a.name.to_lowercase());
    out
}

pub fn startup() -> Vec<StartupApp> {
    shell::powershell(STARTUP_LIST).map(|s| parse_startup(&s)).unwrap_or_default()
}

/// Chaîne PowerShell qui redonne exactement `s`, quelles que soient ses apostrophes ou guillemets : le nom d'une entrée
/// vient du registre ou du disque, jamais collé tel quel dans un script.
fn ps_text(s: &str) -> String {
    let utf16: Vec<u8> = s.encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
    format!("[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('{}'))", base64::engine::general_purpose::STANDARD.encode(utf16))
}

/// Script qui active ou coupe une entrée comme le Gestionnaire des tâches : 02 00… pour activée, 03 00 00 00 suivi de
/// la date (FILETIME) pour coupée.
fn startup_script(key: &str, name: &str, enabled: bool) -> String {
    let value = if enabled {
        "([byte[]](2,0,0,0,0,0,0,0,0,0,0,0))"
    } else {
        "([byte[]]((3,0,0,0) + [BitConverter]::GetBytes([DateTime]::Now.ToFileTime())))"
    };
    format!(
        "$p = '{key}'; $n = {}; if (-not (Test-Path -LiteralPath $p)) {{ New-Item -Path $p -Force | Out-Null }}; New-ItemProperty -LiteralPath $p -Name $n -PropertyType Binary -Value {value} -Force | Out-Null; 'ok'",
        ps_text(name)
    )
}

/// Active ou coupe une entrée de la liste actuelle (jamais une valeur inventée) ; renvoie la liste à jour.
pub fn set_startup(id: &str, enabled: bool) -> Result<Vec<StartupApp>, String> {
    let list = startup();
    let app = list.iter().find(|a| a.id == id).ok_or("Unknown startup entry")?;
    if app.keep && !enabled {
        return Err("This program is needed by Windows or your hardware".into());
    }
    let (src, name) = id.split_once('|').ok_or("Unknown startup entry")?;
    let key = STARTUP_SOURCES.iter().find(|(s, _)| *s == src).map(|(_, k)| *k).ok_or("Unknown startup entry")?;
    shell::powershell(&startup_script(key, name, enabled));
    let list = startup();
    if list.iter().any(|a| a.id == id && a.enabled == enabled) {
        Ok(list)
    } else {
        Err("Windows refused the change".into())
    }
}

// ---------------------------------------------------------------------------------------------------- alimentation

/// Mode d'alimentation de Windows (powercfg).
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerPlan {
    pub guid: String,
    /// nom donné par Windows, dans sa langue
    pub name: String,
    pub active: bool,
}

/// Modes d'alimentation par WMI : les noms arrivent en UTF-8, quelle que soit la langue de Windows.
const POWER_PLANS: &str = r#"$p = @(Get-CimInstance -Namespace root\cimv2\power -ClassName Win32_PowerPlan -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ id = [string]$_.InstanceID; name = [string]$_.ElementName; active = [bool]$_.IsActive } }); ConvertTo-Json -InputObject $p -Compress"#;

#[derive(Deserialize)]
struct PsPlan {
    id: Option<String>,
    name: Option<String>,
    active: Option<bool>,
}

pub fn parse_power_plans(json: &str) -> Vec<PowerPlan> {
    let list: Vec<PsPlan> = match serde_json::from_str::<serde_json::Value>(json) {
        Ok(serde_json::Value::Array(a)) => a.into_iter().filter_map(|v| serde_json::from_value(v).ok()).collect(),
        Ok(v @ serde_json::Value::Object(_)) => serde_json::from_value(v).ok().into_iter().collect(),
        _ => vec![],
    };
    let mut seen = HashSet::new();
    list.into_iter()
        .filter_map(|p| {
            let guid = crate::session::parse_scheme(&p.id?)?;
            let name = p.name.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()).unwrap_or_else(|| guid.clone());
            seen.insert(guid.clone()).then_some(PowerPlan { guid, name, active: p.active.unwrap_or(false) })
        })
        .collect()
}

/// Repli sans WMI : `powercfg /list`, une ligne par mode (« GUID … : <guid>  (Nom) * », le texte autour change avec la
/// langue de Windows ; l'astérisque marque le mode actif).
pub fn parse_powercfg_list(out: &str) -> Vec<PowerPlan> {
    let mut seen = HashSet::new();
    out.lines()
        .filter_map(|line| {
            let guid = crate::session::parse_scheme(line)?;
            // minuscules ASCII seulement : mêmes positions d'octets que la ligne d'origine
            let after = &line[line.to_ascii_lowercase().find(&guid)? + guid.len()..];
            let name = after.split_once('(').and_then(|(_, r)| r.rsplit_once(')')).map(|(n, _)| n.trim().to_string()).filter(|n| !n.is_empty());
            seen.insert(guid.clone()).then(|| PowerPlan { name: name.unwrap_or_else(|| guid.clone()), active: after.trim_end().ends_with('*'), guid })
        })
        .collect()
}

pub fn power_plans() -> Vec<PowerPlan> {
    let plans = shell::powershell(POWER_PLANS).map(|s| parse_power_plans(&s)).unwrap_or_default();
    if !plans.is_empty() {
        return plans;
    }
    shell::hidden("powercfg.exe")
        .arg("/list")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .map(|o| parse_powercfg_list(&String::from_utf8_lossy(&o.stdout)))
        .unwrap_or_default()
}

/// Passe sur un mode de la liste (jamais un GUID venu d'ailleurs) ; renvoie la liste à jour.
pub fn set_power_plan(guid: &str) -> Result<Vec<PowerPlan>, String> {
    let guid = guid.to_ascii_lowercase();
    if !power_plans().iter().any(|p| p.guid == guid) {
        return Err("Unknown power plan".into());
    }
    let _ = shell::hidden("powercfg.exe").args(["/setactive", &guid]).stdout(Stdio::null()).stderr(Stdio::null()).status();
    let plans = power_plans();
    if plans.iter().any(|p| p.guid == guid && p.active) {
        Ok(plans)
    } else {
        // mode imposé par l'entreprise ou l'école (stratégie de groupe), ou refus de Windows
        Err("Windows refused the change".into())
    }
}

// ---------------------------------------------------------------------------------------------------- réseau

/// Vide le cache DNS de Windows (`ipconfig /flushdns`) : les adresses des sites et des serveurs de jeu sont redemandées
/// au prochain accès. Utile après un changement de DNS ou quand un site ou un serveur ne répond plus à la bonne adresse.
pub fn flush_dns() -> Result<(), String> {
    let status = shell::hidden("ipconfig.exe").arg("/flushdns").stdout(Stdio::null()).stderr(Stdio::null()).status().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("ipconfig /flushdns failed".into())
    }
}

// ---------------------------------------------------------------------------------------------------- raccourcis

/// Réglages de Windows qu'un joueur cherche souvent : (identifiant, programme, argument). Liste fermée : l'app tourne
/// en administrateur, l'interface ne choisit jamais le programme lancé.
pub const PANELS: &[(&str, &str, &str)] = &[
    ("graphics", "explorer.exe", "ms-settings:display-advancedgraphics"),
    ("display", "explorer.exe", "ms-settings:display-advanced"),
    ("gamemode", "explorer.exe", "ms-settings:gaming-gamemode"),
    ("sound", "control.exe", "mmsys.cpl"),
    ("mouse", "control.exe", "main.cpl"),
    ("network", "control.exe", "ncpa.cpl"),
    ("power", "control.exe", "powercfg.cpl"),
    ("devices", "mmc.exe", "devmgmt.msc"),
    ("visual", "SystemPropertiesPerformance.exe", ""),
    ("taskmgr", "taskmgr.exe", ""),
];

pub fn open_panel(id: &str) -> Result<(), String> {
    let (_, program, arg) = PANELS.iter().find(|(p, _, _)| *p == id).ok_or("Unknown panel")?;
    let mut cmd = std::process::Command::new(program);
    if !arg.is_empty() {
        cmd.arg(arg);
    }
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------------------------------- Windows

#[cfg(windows)]
mod win {
    use windows_sys::Win32::UI::Shell::{SHEmptyRecycleBinW, SHQueryRecycleBinW, SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI, SHERB_NOSOUND, SHQUERYRBINFO};

    /// Taille et nombre d'éléments de la corbeille, tous disques confondus.
    pub fn recycle_size() -> (u64, u64) {
        let mut info: SHQUERYRBINFO = unsafe { std::mem::zeroed() };
        info.cbSize = std::mem::size_of::<SHQUERYRBINFO>() as u32;
        if unsafe { SHQueryRecycleBinW(std::ptr::null(), &mut info) } == 0 {
            (info.i64Size.max(0) as u64, info.i64NumItems.max(0) as u64)
        } else {
            (0, 0)
        }
    }

    pub fn empty_recycle() -> bool {
        let r = unsafe { SHEmptyRecycleBinW(std::ptr::null_mut(), std::ptr::null(), SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND) };
        // corbeille déjà vide : E_UNEXPECTED, pas une erreur pour nous
        r == 0 || recycle_size().1 == 0
    }
}

#[cfg(not(windows))]
mod win {
    pub fn recycle_size() -> (u64, u64) {
        (0, 0)
    }
    pub fn empty_recycle() -> bool {
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cleans_files_but_not_links_or_our_folders() {
        let root = std::env::temp_dir().join(format!("tools-clean-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let area = root.join("area");
        std::fs::create_dir_all(area.join("sub/deeper")).unwrap();
        std::fs::create_dir_all(area.join("rago-run-1")).unwrap();
        std::fs::write(area.join("a.tmp"), vec![0u8; 100]).unwrap();
        std::fs::write(area.join("sub/b.tmp"), vec![0u8; 50]).unwrap();
        std::fs::write(area.join("sub/deeper/c.tmp"), vec![0u8; 25]).unwrap();
        std::fs::write(area.join("rago-run-1/script.bat"), b"echo").unwrap();
        // un lien vers un dossier hors de la zone : ni compté ni vidé
        let outside = root.join("outside");
        std::fs::create_dir_all(&outside).unwrap();
        std::fs::write(outside.join("keep.txt"), b"keep").unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, area.join("link")).unwrap();
        let single = root.join("MEMORY.DMP");
        std::fs::write(&single, vec![0u8; 10]).unwrap();

        let t = vec![Target::Dir(area.clone()), Target::File(single.clone()), Target::Dir(root.join("missing"))];
        assert_eq!(measure(&t), (185, 4));
        let c = clean(&t);
        assert_eq!(c, Cleaned { bytes: 185, files: 4, skipped: 0 });
        assert!(!area.join("sub").exists() && !single.exists() && area.exists());
        assert!(area.join("rago-run-1/script.bat").exists());
        assert!(outside.join("keep.txt").exists());
        assert_eq!(measure(&t), (0, 0));
        std::fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn every_area_has_targets_or_is_the_recycle_bin() {
        // sans les variables de Windows, aucune zone ne retombe sur un chemin relatif (le dossier courant)
        for id in AREAS {
            for t in targets(id) {
                let p = match t {
                    Target::Dir(p) | Target::File(p) => p,
                };
                assert!(p.is_absolute(), "{id}: {}", p.display());
            }
        }
        assert!(targets("nope").is_empty());
        // un chemin absolu a une lettre de lecteur sous Windows
        let abs = |p: &str| PathBuf::from(if cfg!(windows) { format!("C:{p}") } else { p.to_string() });
        assert!(temp_like(&abs("/home/u/AppData/Local/Temp")) && temp_like(&abs("/var/tmp")));
        assert!(!temp_like(Path::new("/")) && !temp_like(Path::new("/home/u")) && !temp_like(Path::new("Temp")) && !temp_like(Path::new("/Temp")));
    }

    #[test]
    fn finds_bloat_among_installed_packages() {
        let installed = ["Microsoft.WindowsStore", "microsoft.bingweather", "king.com.CandyCrushSaga", "Microsoft.GamingApp", "MSTeams"]
            .map(String::from);
        let ids: Vec<_> = bloat_in(&installed).iter().map(|a| a.id).collect();
        assert_eq!(ids, ["Microsoft.BingWeather", "MSTeams", "king.com.CandyCrushSaga"]);
        // jamais le Store, Xbox ni la Game Bar
        for keep in ["Microsoft.WindowsStore", "Microsoft.GamingApp", "Microsoft.XboxGamingOverlay", "Microsoft.Windows.Photos", "Microsoft.WindowsCalculator"] {
            assert!(!BLOAT.iter().any(|(id, _, _)| id.eq_ignore_ascii_case(keep)), "{keep}");
        }
    }

    #[test]
    fn reads_drivers_and_the_board_maker() {
        let json = r#"{"drivers":[
            {"cls":"DISPLAY","name":"NVIDIA GeForce RTX 4070","version":"32.0.15.6094","date":"2024-08-14","provider":"NVIDIA"},
            {"cls":"NET","name":"Realtek PCIe 2.5GbE Family Controller","version":"10.68.1003.2023","date":"2023-10-03","provider":"Realtek"},
            {"cls":"NET","name":"WAN Miniport (IP)","version":"10.0.22621.1","date":"2006-06-21","provider":"Microsoft"},
            {"cls":"NET","name":"TAP-Windows Adapter V9","version":"9.24.2.601","date":"2019-09-27","provider":"TAP-Windows Provider V9"},
            {"cls":"MEDIA","name":"Realtek High Definition Audio","version":"6.0.9235.1","date":"2021-09-10","provider":"Realtek Semiconductor Corp."},
            {"cls":"MEDIA","name":"NVIDIA Virtual Audio Device (Wave Extensible) (WDM)","version":"4.65.0.3","date":"2023-04-17","provider":"NVIDIA"},
            {"cls":"DISPLAY","name":"NVIDIA GeForce RTX 4070","version":"32.0.15.6094","date":"2024-08-14","provider":"NVIDIA"},
            {"cls":"SYSTEM","name":"PCI Express Root Port","version":"1","date":null,"provider":"Microsoft"}
        ],"board":"ASUSTeK COMPUTER INC.","boardModel":"ROG STRIX B650-A GAMING WIFI","system":"System manufacturer","systemModel":"System Product Name"}"#;
        let d = parse_drivers(json);
        let names: Vec<_> = d.drivers.iter().map(|x| (x.kind, x.name.as_str())).collect();
        assert_eq!(
            names,
            [("gpu", "NVIDIA GeForce RTX 4070"), ("network", "Realtek PCIe 2.5GbE Family Controller"), ("audio", "Realtek High Definition Audio")]
        );
        assert_eq!(d.maker.as_deref(), Some("ASUSTeK COMPUTER INC."));
        assert_eq!(d.model.as_deref(), Some("ROG STRIX B650-A GAMING WIFI"));
        // portable : le fabricant du PC, un seul pilote (objet au lieu de tableau)
        let d = parse_drivers(
            r#"{"drivers":{"cls":"DISPLAY","name":"Intel(R) Iris(R) Xe Graphics","version":"31.0.101.4502","date":"2023-06-01","provider":"Intel Corporation"},"board":"LENOVO","boardModel":"LNVNB161216","system":"LENOVO","systemModel":"82RK"}"#,
        );
        assert_eq!(d.drivers.len(), 1);
        assert_eq!((d.maker.as_deref(), d.model.as_deref()), (Some("LENOVO"), Some("82RK")));
        assert_eq!(parse_drivers("pas du json"), Drivers::default());
    }

    #[test]
    fn reads_startup_entries_like_task_manager() {
        let json = r#"[
            {"src":"hkcu","name":"Discord","cmd":"\"C:\\Users\\u\\AppData\\Local\\Discord\\Update.exe\" --processStart Discord.exe","desc":"Update","company":"Discord Inc.","state":null},
            {"src":"hkcu","name":"com.squirrel.Teams.Teams","cmd":"C:\\Users\\u\\AppData\\Local\\Microsoft\\Teams\\Update.exe --processStart \"Teams.exe\"","desc":"Microsoft Teams","company":"Microsoft Corporation","state":3},
            {"src":"hklm","name":"SecurityHealth","cmd":"%windir%\\system32\\SecurityHealthSystray.exe","desc":"Windows Security notification icon","company":"Microsoft Corporation","state":6},
            {"src":"hklm32","name":"RtkAudUService","cmd":"\"C:\\Windows\\System32\\DriverStore\\FileRepository\\RtkAudUService64.exe\" -background","desc":"Realtek HD Audio Universal Service","company":"Realtek Semiconductor","state":2},
            {"src":"startup","name":"Spotify.lnk","cmd":"C:\\Users\\u\\AppData\\Roaming\\Spotify\\Spotify.exe","desc":"Spotify","company":"Spotify Ltd","state":7},
            {"src":"commonstartup","name":"Paragon Backup.lnk","cmd":"C:\\Program Files\\Paragon\\backup.exe","desc":"","company":"Paragon Software","state":null},
            {"src":"hkcu","name":"Riot Vanguard","cmd":"\"C:\\Program Files\\Riot Vanguard\\vgtray.exe\"","desc":"Vanguard tray notification.","company":"Riot Games, Inc.","state":2},
            {"src":"hkcu","name":"Discord","cmd":"again","desc":"","company":"","state":null},
            {"src":"services","name":"Nope","cmd":"x","desc":"","company":"","state":null},
            {"src":"hkcu","name":"a|b","cmd":"x","desc":"","company":"","state":null},
            {"src":"hkcu","name":"  ","cmd":"x","desc":"","company":"","state":null}
        ]"#;
        let list = parse_startup(json);
        let view: Vec<_> = list.iter().map(|a| (a.name.as_str(), a.scope, a.enabled, a.keep)).collect();
        assert_eq!(
            view,
            [
                ("Discord", "user", true, false),
                ("Microsoft Teams", "user", false, false),
                ("Paragon Backup", "machine", true, false),
                ("Riot Vanguard", "user", true, true),
                ("RtkAudUService", "machine", true, true),
                ("SecurityHealth", "machine", true, true),
                ("Spotify", "user", false, false),
            ]
        );
        assert_eq!(list[0].id, "hkcu|Discord");
        assert_eq!(list[0].publisher, "Discord Inc.");
        assert_eq!(list[6].id, "startup|Spotify.lnk");
        // une seule entrée : PowerShell peut rendre un objet au lieu d'un tableau
        assert_eq!(parse_startup(r#"{"src":"hkcu","name":"Steam","cmd":"steam.exe -silent","desc":"Steam","company":"Valve","state":2}"#).len(), 1);
        assert!(parse_startup("").is_empty() && parse_startup("pas du json").is_empty());
    }

    #[test]
    fn startup_script_never_pastes_the_name() {
        let name = "Bob's app'; Remove-Item C:\\ -Recurse; '";
        for enabled in [true, false] {
            let s = startup_script(STARTUP_SOURCES[0].1, name, enabled);
            assert!(!s.contains("Remove-Item"), "{s}");
            assert!(s.contains(if enabled { "(2,0,0,0," } else { "(3,0,0,0)" }));
            // le nom se retrouve exactement après décodage
            let b64 = s.split("FromBase64String('").nth(1).unwrap().split('\'').next().unwrap();
            let bytes = base64::engine::general_purpose::STANDARD.decode(b64).unwrap();
            let utf16: Vec<u16> = bytes.chunks(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
            assert_eq!(String::from_utf16(&utf16).unwrap(), name);
        }
        // chaque source a sa clé StartupApproved, et seulement celles que liste le script
        for (src, key) in STARTUP_SOURCES {
            assert!(STARTUP_LIST.contains(key), "{src}");
        }
    }

    #[test]
    fn reads_power_plans_in_any_language() {
        let json = r#"[{"id":"Microsoft:PowerPlan\\{381B4222-F694-41F0-9685-FF5BB260DF2E}","name":"Équilibré","active":false},
            {"id":"Microsoft:PowerPlan\\{8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c}","name":"Performances élevées","active":true},
            {"id":"Microsoft:PowerPlan\\{8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c}","name":"doublon","active":false},
            {"id":"pas un guid","name":"x","active":false}]"#;
        let plans = parse_power_plans(json);
        assert_eq!(
            plans,
            [
                PowerPlan { guid: "381b4222-f694-41f0-9685-ff5bb260df2e".into(), name: "Équilibré".into(), active: false },
                PowerPlan { guid: "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".into(), name: "Performances élevées".into(), active: true },
            ]
        );
        assert_eq!(parse_power_plans(r#"{"id":"Microsoft:PowerPlan\\{381b4222-f694-41f0-9685-ff5bb260df2e}","name":"","active":true}"#)[0].name, "381b4222-f694-41f0-9685-ff5bb260df2e");

        let out = "Existing Power Schemes (* Active)\r\n-----------------------------------\r\nPower Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)\r\nPower Scheme GUID: 8C5E7FDA-E8BF-4A96-9A85-A6E23A8C635C  (High performance) *\r\nPower Scheme GUID: a1841308-3541-4fab-bc81-f71556f20b4a  (Rago (Low Latency))\r\n";
        let plans = parse_powercfg_list(out);
        let view: Vec<_> = plans.iter().map(|p| (p.name.as_str(), p.active)).collect();
        assert_eq!(view, [("Balanced", false), ("High performance", true), ("Rago (Low Latency)", false)]);
        assert_eq!(plans[1].guid, "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c");
        assert_eq!(parse_powercfg_list("GUID du mode de gestion de l'alimentation : 381b4222-f694-41f0-9685-ff5bb260df2e  (Utilisation normale) *")[0].active, true);
    }

    #[test]
    fn opens_only_known_panels() {
        let ids: HashSet<_> = PANELS.iter().map(|(id, _, _)| *id).collect();
        assert_eq!(ids.len(), PANELS.len());
        assert!(open_panel("cmd").is_err() && open_panel("").is_err());
    }
}
