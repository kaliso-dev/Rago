//! Page Outils : nettoyage des fichiers inutiles, applis préinstallées, pilotes du PC. Natif, hors catalogue : le
//! nettoyage supprime pour de bon, une appli désinstallée se réinstalle depuis le Microsoft Store.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::shell;

// ---------------------------------------------------------------------------------------------------- nettoyage

/// Zones du nettoyage, dans l'ordre affiché. Ni Prefetch ni journaux de Windows ni dossiers de Minecraft : le
/// vérificateur de screenshare RBW les regarde, les vider passerait pour un effacement de traces.
pub const AREAS: &[&str] = &["temp", "windows_temp", "update", "crash", "browsers", "discord", "shaders", "recycle"];

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
}
