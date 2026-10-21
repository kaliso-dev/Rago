//! Applications pour le Dock, la barre et la recherche : celles qui sont installées (le dossier « Applications » de
//! Windows, celui du menu Démarrer), les fenêtres ouvertes, leurs icônes, et de quoi les lancer, les afficher ou les
//! fermer. Tout passe par les API du Shell et des fenêtres : rien n'entre dans les autres programmes.

use std::collections::HashMap;

use windows::core::{Interface, BOOL, HSTRING, PCWSTR, PWSTR};
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM, RECT, SIZE, WPARAM};
use windows::Win32::Graphics::Direct2D::{ID2D1Bitmap1, ID2D1DeviceContext};
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
use windows::Win32::Graphics::Gdi::DeleteObject;
use windows::Win32::Graphics::Imaging::*;
use windows::Win32::Storage::EnhancedStorage::{PKEY_AppUserModel_ID, PKEY_FileDescription, PKEY_Link_TargetParsingPath};
use windows::Win32::Storage::Packaging::Appx::GetApplicationUserModelId;
use windows::Win32::System::Com::StructuredStorage::{PropVariantClear, PropVariantToStringAlloc};
use windows::Win32::System::Com::{CoCreateInstance, CoTaskMemFree, CLSCTX_INPROC_SERVER};
use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
use windows::Win32::UI::Shell::PropertiesSystem::{IPropertyStore, SHGetPropertyStoreForWindow};
use windows::Win32::UI::Shell::*;
use windows::Win32::UI::WindowsAndMessaging::*;

use crate::query;

/// Corbeille (dossier spécial du Shell).
pub const TRASH: &str = "::{645FF040-5081-101B-9F08-00AA002F954E}";

fn take(p: PWSTR) -> String {
    let s = unsafe { p.to_string() }.unwrap_or_default();
    unsafe { CoTaskMemFree(Some(p.0 as *const _)) };
    s
}

/// Application installée, telle que le menu Démarrer la liste.
#[derive(Debug, Clone)]
pub struct Installed {
    pub name: String,
    /// identifiant de l'appli (AUMID) ou chemin, à passer à `launch`
    pub id: String,
    /// programme lancé, en minuscules, quand Windows le dit
    pub exe: Option<String>,
    pub folded: String,
}

/// Chemin « {GUID}\dossier\programme.exe » (dossier connu de Windows) : chemin complet.
fn known_path(id: &str) -> Option<String> {
    let rest = id.strip_prefix('{')?;
    let (guid, rel) = rest.split_once("}\\")?;
    let guid = windows::core::GUID::try_from(guid).ok()?;
    let base = unsafe { SHGetKnownFolderPath(&guid, KF_FLAG_DEFAULT, None) }.ok().map(take)?;
    Some(format!("{base}\\{rel}"))
}

/// Ce qui n'est pas une appli dans le menu Démarrer : aides, sites, désinstallateurs.
fn noise(name: &str, id: &str) -> bool {
    let id = id.to_ascii_lowercase();
    let n = query::fold(name);
    [".chm", ".txt", ".url", ".htm", ".html", ".pdf", ".rtf", ".ini", ".log"].iter().any(|e| id.ends_with(e))
        || id.starts_with("http")
        || n.contains("uninstall")
        || n.contains("desinstall")
        || n.contains("readme")
        || n.contains("lisez-moi")
}

/// Toutes les applis du dossier « Applications » (bureau et Store), triées par nom. Quelques centaines de millisecondes :
/// appelée hors de la boucle (voir `host`).
pub fn installed() -> Vec<Installed> {
    let mut out = Vec::new();
    unsafe {
        let Ok(folder) = SHGetKnownFolderItem::<IShellItem>(&FOLDERID_AppsFolder, KF_FLAG_DEFAULT, None) else { return out };
        let Ok(items) = folder.BindToHandler::<_, IEnumShellItems>(None, &BHID_EnumItems) else { return out };
        loop {
            let mut batch: [Option<IShellItem>; 16] = Default::default();
            let mut n = 0u32;
            if items.Next(&mut batch, Some(&mut n)).is_err() && n == 0 {
                break;
            }
            if n == 0 {
                break;
            }
            for item in batch.iter().take(n as usize).flatten() {
                let Ok(name) = item.GetDisplayName(SIGDN_NORMALDISPLAY).map(take) else { continue };
                let Ok(id) = item.GetDisplayName(SIGDN_PARENTRELATIVEPARSING).map(take) else { continue };
                if name.is_empty() || id.is_empty() || noise(&name, &id) {
                    continue;
                }
                let exe = known_path(&id)
                    .or_else(|| item.cast::<IShellItem2>().ok().and_then(|i2| i2.GetString(&PKEY_Link_TargetParsingPath).ok().map(take)))
                    .filter(|p| p.to_ascii_lowercase().ends_with(".exe"))
                    .map(|p| p.to_ascii_lowercase());
                let folded = query::fold(&name);
                out.push(Installed { name, id, exe, folded });
            }
        }
    }
    out.sort_by(|a, b| a.folded.cmp(&b.folded));
    out.dedup_by(|a, b| a.id == b.id);
    out
}

/// Ce qui identifie une appli à l'écran : son identifiant (AUMID) si Windows le donne, sinon son programme.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Key {
    pub aumid: Option<String>,
    /// chemin du programme, en minuscules
    pub exe: Option<String>,
}

impl Key {
    /// Même appli qu'un élément épinglé (`id` : AUMID ou chemin, `exe` : programme connu).
    pub fn matches(&self, id: &str, exe: Option<&str>) -> bool {
        if let Some(a) = &self.aumid {
            if a.eq_ignore_ascii_case(id) {
                return true;
            }
        }
        match (&self.exe, exe) {
            (Some(mine), Some(theirs)) => mine.eq_ignore_ascii_case(theirs),
            (Some(mine), None) => mine.eq_ignore_ascii_case(id),
            _ => false,
        }
    }

    /// Texte stable pour regrouper les fenêtres et mettre les icônes en cache.
    pub fn id(&self) -> String {
        self.aumid.clone().or_else(|| self.exe.clone()).unwrap_or_default()
    }

    /// Ce qu'il faut lancer pour une nouvelle fenêtre.
    pub fn launch_id(&self) -> Option<String> {
        self.aumid.clone().or_else(|| self.exe.clone())
    }

    /// Source de l'icône pour le Shell.
    pub fn icon_source(&self) -> Option<String> {
        self.aumid.as_ref().map(|a| format!("shell:AppsFolder\\{a}")).or_else(|| self.exe.clone())
    }
}

#[derive(Debug, Clone)]
pub struct Window {
    pub hwnd: isize,
    pub title: String,
    pub key: Key,
}

fn class(hwnd: HWND) -> String {
    let mut buf = [0u16; 128];
    let n = unsafe { GetClassNameW(hwnd, &mut buf) } as usize;
    String::from_utf16_lossy(&buf[..n.min(buf.len())])
}

fn title(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let n = unsafe { GetWindowTextW(hwnd, &mut buf) } as usize;
    String::from_utf16_lossy(&buf[..n.min(buf.len())])
}

fn cloaked(hwnd: HWND) -> bool {
    let mut c = 0u32;
    unsafe { DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &mut c as *mut _ as *mut _, 4) }.is_ok() && c != 0
}

fn window_aumid(hwnd: HWND) -> Option<String> {
    unsafe {
        let store: IPropertyStore = SHGetPropertyStoreForWindow(hwnd).ok()?;
        let mut v = store.GetValue(&PKEY_AppUserModel_ID).ok()?;
        let s = PropVariantToStringAlloc(&v).ok().map(take);
        let _ = PropVariantClear(&mut v);
        s.filter(|s| !s.is_empty())
    }
}

fn process_of(hwnd: HWND) -> u32 {
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    pid
}

/// Programme (en minuscules) et identifiant d'appli empaquetée d'un processus.
fn process_info(pid: u32) -> (Option<String>, Option<String>) {
    unsafe {
        let Ok(h) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else { return (None, None) };
        let mut buf = [0u16; 1024];
        let mut size = buf.len() as u32;
        let exe = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut size)
            .ok()
            .map(|_| String::from_utf16_lossy(&buf[..size as usize]).to_ascii_lowercase());
        let mut len = 512u32;
        let mut ab = [0u16; 512];
        let aumid = (GetApplicationUserModelId(h, &mut len, Some(PWSTR(ab.as_mut_ptr()))).0 == 0)
            .then(|| String::from_utf16_lossy(&ab[..(len as usize).saturating_sub(1)]))
            .filter(|s| !s.is_empty());
        let _ = CloseHandle(h);
        (exe, aumid)
    }
}

/// Appli d'une fenêtre. Les applis du Store sont dans une fenêtre d'ApplicationFrameHost : l'identifiant vient alors de
/// la fenêtre elle-même, ou du processus de sa fenêtre intérieure.
pub fn key_of(hwnd: HWND) -> Key {
    let (exe, packaged) = process_info(process_of(hwnd));
    let frame = exe.as_deref().is_some_and(|e| e.ends_with("\\applicationframehost.exe"));
    let mut aumid = window_aumid(hwnd).or(packaged);
    if frame && aumid.is_none() {
        unsafe {
            if let Ok(core) = FindWindowExW(Some(hwnd), None, windows::core::w!("Windows.UI.Core.CoreWindow"), PCWSTR::null()) {
                aumid = process_info(process_of(core)).1;
            }
        }
    }
    Key { aumid, exe: if frame { None } else { exe } }
}

/// Tri rapide, dans les rappels de Windows : une fenêtre principale qui pourrait aller dans le Dock (pas une bulle,
/// un menu ou un contrôle). `listed` décide ensuite.
pub fn candidate(hwnd: HWND) -> bool {
    unsafe {
        if GetAncestor(hwnd, GA_ROOT) != hwnd {
            return false;
        }
        let ex = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let app = ex & WS_EX_APPWINDOW.0 != 0;
        app || (ex & WS_EX_TOOLWINDOW.0 == 0 && ex & WS_EX_NOACTIVATE.0 == 0 && !GetWindow(hwnd, GW_OWNER).is_ok_and(|o| !o.is_invalid()))
    }
}

/// Fenêtre qui aurait sa place dans la barre des tâches.
fn listed(hwnd: HWND, me: u32) -> bool {
    unsafe {
        if !IsWindowVisible(hwnd).as_bool() || cloaked(hwnd) {
            return false;
        }
        let ex = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let app = ex & WS_EX_APPWINDOW.0 != 0;
        if !app && (ex & WS_EX_TOOLWINDOW.0 != 0 || ex & WS_EX_NOACTIVATE.0 != 0) {
            return false;
        }
        if !app && GetWindow(hwnd, GW_OWNER).is_ok_and(|o| !o.is_invalid()) {
            return false;
        }
        if GetWindowTextLengthW(hwnd) == 0 || process_of(hwnd) == me {
            return false;
        }
        !matches!(class(hwnd).as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd" | "Windows.UI.Core.CoreWindow")
    }
}

/// Fenêtres ouvertes, de la plus en avant à la plus en arrière.
pub fn windows() -> Vec<Window> {
    unsafe extern "system" fn each(hwnd: HWND, data: LPARAM) -> BOOL {
        let list = unsafe { &mut *(data.0 as *mut Vec<HWND>) };
        list.push(hwnd);
        true.into()
    }
    let mut all: Vec<HWND> = Vec::new();
    unsafe {
        let _ = EnumWindows(Some(each), LPARAM(&mut all as *mut _ as isize));
    }
    let me = std::process::id();
    all.into_iter()
        .filter(|h| listed(*h, me))
        .map(|h| Window { hwnd: h.0 as isize, title: title(h), key: key_of(h) })
        .collect()
}

/// Fenêtre au premier plan, si c'est une appli (pas le bureau ni Rago Shell).
pub fn foreground() -> Option<Window> {
    let h = unsafe { GetForegroundWindow() };
    if h.is_invalid() {
        return None;
    }
    let root = unsafe { GetAncestor(h, GA_ROOTOWNER) };
    let h = if root.is_invalid() { h } else { root };
    listed(h, std::process::id()).then(|| Window { hwnd: h.0 as isize, title: title(h), key: key_of(h) })
}

/// Nom lisible d'un programme (« Google Chrome »), lu dans ses informations de version.
pub fn describe(exe: &str) -> Option<String> {
    unsafe {
        let item: IShellItem2 = SHCreateItemFromParsingName(&HSTRING::from(exe), None).ok()?;
        item.GetString(&PKEY_FileDescription).ok().map(take).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
    }
}

fn hwnd(h: isize) -> HWND {
    HWND(h as *mut _)
}

/// Met la fenêtre devant (et la rouvre si elle était réduite). Rago Shell vient de recevoir le clic : Windows le laisse
/// passer une autre fenêtre au premier plan.
pub fn activate(h: isize) {
    let w = hwnd(h);
    unsafe {
        if IsIconic(w).as_bool() {
            let _ = ShowWindowAsync(w, SW_RESTORE);
        }
        if !SetForegroundWindow(w).as_bool() {
            SwitchToThisWindow(w, true);
        }
    }
}

pub fn minimize(h: isize) {
    unsafe {
        let _ = PostMessageW(Some(hwnd(h)), WM_SYSCOMMAND, WPARAM(SC_MINIMIZE as usize), LPARAM(0));
    }
}

/// Demande à la fenêtre de se fermer, comme sa croix (l'appli peut demander d'enregistrer).
pub fn close(h: isize) {
    unsafe {
        let _ = PostMessageW(Some(hwnd(h)), WM_SYSCOMMAND, WPARAM(SC_CLOSE as usize), LPARAM(0));
    }
}

/// Ouvre un fichier, un dossier, une adresse ou une page des Paramètres, sans droits d'administrateur.
pub fn open(target: &str) {
    unsafe {
        ShellExecuteW(None, windows::core::w!("open"), &HSTRING::from(target), PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL);
    }
}

/// Lance une appli : identifiant du Store ou du menu Démarrer (AUMID), ou chemin d'un programme.
pub fn launch(id: &str) {
    let looks_like_path = id.contains(":\\") || id.starts_with("\\\\") || id.starts_with("::");
    if looks_like_path {
        open(id);
    } else if let Some(path) = known_path(id) {
        open(&path);
    } else {
        open(&format!("shell:AppsFolder\\{id}"));
    }
}

/// Icônes en cache, décodées une fois par taille.
pub struct Icons {
    wic: Option<IWICImagingFactory>,
    cache: HashMap<(String, u32), Option<ID2D1Bitmap1>>,
}

impl Icons {
    pub fn new() -> Icons {
        Icons { wic: unsafe { CoCreateInstance(&CLSID_WICImagingFactory, None, CLSCTX_INPROC_SERVER).ok() }, cache: HashMap::new() }
    }

    /// Icône (`source` : chemin, « shell:AppsFolder\… » ou dossier spécial « ::{…} ») à `px` pixels physiques.
    pub fn get(&mut self, ctx: &ID2D1DeviceContext, source: &str, px: u32) -> Option<ID2D1Bitmap1> {
        let k = (source.to_string(), px);
        if let Some(b) = self.cache.get(&k) {
            return b.clone();
        }
        let b = self.load(ctx, source, px);
        if self.cache.len() > 400 {
            self.cache.clear();
        }
        self.cache.insert(k, b.clone());
        b
    }

    /// Oublie une icône (la corbeille vide ou pleine change d'image).
    pub fn forget(&mut self, source: &str) {
        self.cache.retain(|(s, _), _| s != source);
    }

    pub fn clear(&mut self) {
        self.cache.clear();
    }

    fn load(&self, ctx: &ID2D1DeviceContext, source: &str, px: u32) -> Option<ID2D1Bitmap1> {
        let wic = self.wic.as_ref()?;
        unsafe {
            let factory: IShellItemImageFactory = SHCreateItemFromParsingName(&HSTRING::from(source), None).ok()?;
            let size = SIZE { cx: px as i32, cy: px as i32 };
            let hbmp = factory.GetImage(size, SIIGBF_ICONONLY | SIIGBF_BIGGERSIZEOK).ok()?;
            let bitmap = wic.CreateBitmapFromHBITMAP(hbmp, Default::default(), WICBitmapUsePremultipliedAlpha);
            let _ = DeleteObject(hbmp.into());
            let bitmap = bitmap.ok()?;
            let converter = wic.CreateFormatConverter().ok()?;
            converter.Initialize(&bitmap, &GUID_WICPixelFormat32bppPBGRA, WICBitmapDitherTypeNone, None, 0.0, WICBitmapPaletteTypeMedianCut).ok()?;
            ctx.CreateBitmapFromWicBitmap(&converter, None).ok()
        }
    }
}

/// Dossier de l'utilisateur (Téléchargements…) par son identifiant de dossier connu.
pub fn known_folder(id: &windows::core::GUID) -> Option<String> {
    unsafe { SHGetKnownFolderPath(id, KF_FLAG_DEFAULT, None) }.ok().map(take)
}

/// Rectangle d'une fenêtre (pixels physiques).
#[allow(dead_code)]
pub fn rect_of(h: isize) -> Option<RECT> {
    let mut r = RECT::default();
    unsafe { GetWindowRect(hwnd(h), &mut r) }.ok().map(|_| r)
}
