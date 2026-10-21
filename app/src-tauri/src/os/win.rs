//! Rago OS sur Windows : écritures du registre, services, tâches, applications du Store (gestionnaire de paquets de
//! Windows, pour le compte du joueur seulement) et actions natives (fond d'écran par IDesktopWallpaper, écran de
//! verrouillage par l'API LockScreen, thème, plan d'alimentation par powercfg). Aucune DLL ni fichier de Windows modifié.
//! Le fond est un des fonds unis de Rago OS (resources/os/wall-*.jpg) ou l'image du joueur ; l'écran de verrouillage
//! et le thème le suivent.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::catalog::{Native, Refresh, Start};
use super::engine::{Appx, Host};
use crate::backup::{self, Probe, Saved, Sys};
use crate::shell;

/// GUID du plan d'alimentation « Rago OS » (copie du plan Performances élevées de Windows).
pub const PLAN: &str = "a3c0f7e2-5b1d-4c8e-9f6a-2d7b4e1c9a50";
const HIGH_PERFORMANCE: &str = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";
const BALANCED: &str = "381b4222-f694-41f0-9685-ff5bb260df2e";

pub struct WinHost {
    pub sys: Sys,
    pub resource_dir: PathBuf,
    /// %APPDATA%\gg.rago.optimizer\os : copies des images d'avant (fond, écran de verrouillage)
    pub keep_dir: PathBuf,
    /// fond choisi dans Rago OS (bureau et écran de verrouillage)
    pub wall: super::Wall,
}

impl WinHost {
    pub fn new(data_dir: &Path, resource_dir: &Path, wall: super::Wall) -> Self {
        WinHost { sys: Sys::new(data_dir.join("backup")), resource_dir: resource_dir.to_path_buf(), keep_dir: data_dir.join("os"), wall }
    }

    /// Image de Rago OS copiée dans %LOCALAPPDATA%\Rago OS (le dossier de l'app est remplacé à chaque mise à jour).
    fn image(&self, name: &str) -> Result<PathBuf, String> {
        let src = self.resource_dir.join("os").join(name);
        let dst_dir = super::resident::dir();
        std::fs::create_dir_all(&dst_dir).map_err(|e| e.to_string())?;
        let dst = dst_dir.join(name);
        std::fs::copy(&src, &dst).map_err(|e| format!("{}: {e}", src.display()))?;
        Ok(dst)
    }

    /// Fichier du fond choisi : une teinte de Rago OS, ou l'image du joueur (déjà copiée par `Os::set_wallpaper`).
    fn wall_file(&self) -> Result<PathBuf, String> {
        match &self.wall {
            super::Wall::Custom(p) if p.is_file() => Ok(p.clone()),
            super::Wall::Builtin(id) => self.image(&format!("wall-{id}.jpg")),
            super::Wall::Custom(_) => self.image(&format!("wall-{}.jpg", super::WALLS[0])),
        }
    }
}

fn run(exe: &str, args: &[&str]) -> Result<String, String> {
    let o = shell::hidden(exe).args(args).output().map_err(|e| e.to_string())?;
    let text = format!("{}{}", backup::decode_text(&o.stdout), backup::decode_text(&o.stderr));
    if o.status.success() {
        Ok(text)
    } else {
        Err(text.trim().lines().last().unwrap_or("failed").trim().to_string())
    }
}

fn reg_text(sys: &Sys, key: &str, name: &str) -> Option<String> {
    match sys.read(&Probe::Reg { key: key.into(), name: name.into() }) {
        Saved::Value { kind: 1 | 2, data } => {
            let b = backup::unhex(&data);
            let w: Vec<u16> = b.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).take_while(|&c| c != 0).collect();
            Some(String::from_utf16_lossy(&w))
        }
        _ => None,
    }
}

/// Valeurs de registre gardées avec une action native, remises à son retrait.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct Regs(Vec<(Probe, Saved)>);

impl Regs {
    fn take(sys: &Sys, list: &[(&str, &str)]) -> Self {
        Regs(list.iter().map(|(k, n)| {
            let p = Probe::Reg { key: (*k).into(), name: (*n).into() };
            let s = sys.read(&p);
            (p, s)
        }).collect())
    }
    fn put_back(&self, sys: &Sys) {
        for (p, s) in &self.0 {
            let _ = sys.restore(p, s);
        }
    }
}

impl Host for WinHost {
    fn read(&self, probe: &Probe) -> Saved {
        self.sys.read(probe)
    }

    fn restore(&self, probe: &Probe, saved: &Saved) -> Result<(), String> {
        self.sys.restore(probe, saved)
    }

    fn write_reg(&self, key: &str, name: &str, kind: u32, data: &[u8]) -> Result<(), String> {
        self.sys.write(key, name, kind, data)
    }

    fn set_task(&self, path: &str, enabled: bool) -> Result<(), String> {
        run("schtasks.exe", &["/change", "/tn", path, if enabled { "/enable" } else { "/disable" }]).map(|_| ())
    }

    fn set_service(&self, name: &str, start: Start) -> Result<(), String> {
        let key = super::engine::service_key(name);
        // certaines clés de service refusent l'écriture directe : le gestionnaire de services la fait
        if self.sys.write(&key, "Start", 4, &start.value().to_le_bytes()).is_err() {
            let mode = match start {
                Start::Disabled => "disabled",
                Start::Manual => "demand",
            };
            run("sc.exe", &["config", name, "start=", mode])?;
        }
        if start == Start::Disabled {
            // arrêté tout de suite, sans attendre (il ne redémarrera plus)
            let _ = shell::hidden("sc.exe").args(["stop", name]).output();
        }
        Ok(())
    }

    fn appx_find(&self, name: &str) -> Option<Appx> {
        appx::find(name)
    }

    fn appx_remove(&self, app: &Appx) -> Result<(), String> {
        appx::remove(&app.full_name)
    }

    fn appx_restore(&self, app: &Appx) -> Result<(), String> {
        appx::register(app)
    }

    fn native_apply(&self, what: Native) -> Result<serde_json::Value, String> {
        let v = match what {
            Native::Wallpaper => serde_json::to_value(wallpaper::apply(self)?),
            Native::Lockscreen => serde_json::to_value(lockscreen::apply(self)?),
            Native::Theme => serde_json::to_value(theme::apply(self)?),
            Native::Powerplan => serde_json::to_value(power::apply()?),
        };
        v.map_err(|e| e.to_string())
    }

    fn native_revert(&self, what: Native, saved: &serde_json::Value) -> Result<(), String> {
        let bad = |e: serde_json::Error| format!("saved state unreadable: {e}");
        match what {
            Native::Wallpaper => wallpaper::revert(self, &serde_json::from_value(saved.clone()).map_err(bad)?),
            Native::Lockscreen => lockscreen::revert(self, &serde_json::from_value(saved.clone()).map_err(bad)?),
            Native::Theme => theme::revert(&serde_json::from_value(saved.clone()).map_err(bad)?),
            Native::Powerplan => power::revert(&serde_json::from_value(saved.clone()).map_err(bad)?),
        }
    }

    fn native_update(&self, what: Native, saved: &serde_json::Value) -> Result<serde_json::Value, String> {
        let bad = |e: serde_json::Error| format!("saved state unreadable: {e}");
        let v = match what {
            Native::Wallpaper => serde_json::to_value(wallpaper::update(self, &serde_json::from_value(saved.clone()).map_err(bad)?)?),
            Native::Lockscreen => serde_json::to_value(lockscreen::update(self, &serde_json::from_value(saved.clone()).map_err(bad)?)?),
            Native::Theme => serde_json::to_value(theme::update(self, &serde_json::from_value(saved.clone()).map_err(bad)?)?),
            // le plan d'avant reste celui d'origine
            Native::Powerplan => {
                power::apply()?;
                return Ok(saved.clone());
            }
        };
        v.map_err(|e| e.to_string())
    }

    fn native_in_place(&self, what: Native, saved: &serde_json::Value) -> bool {
        match what {
            Native::Wallpaper => serde_json::from_value(saved.clone()).is_ok_and(|s| wallpaper::in_place(&s)),
            // l'image posée est copiée par Windows dans un dossier protégé : rien de fiable à comparer
            Native::Lockscreen => true,
            Native::Theme => serde_json::from_value::<theme::Saved>(saved.clone()).is_ok_and(|s| Path::new(&s.path).is_file()),
            Native::Powerplan => power::active().is_some_and(|g| g.eq_ignore_ascii_case(PLAN)),
        }
    }

    fn refresh(&self, what: Refresh) {
        refresh(&self.sys, what);
    }
}

// ------------------------------------------------------------------ prévenir Windows

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub fn broadcast(area: &str) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE};
    let s = wide(area);
    unsafe {
        SendMessageTimeoutW(HWND_BROADCAST, WM_SETTINGCHANGE, 0, s.as_ptr() as isize, SMTO_ABORTIFHUNG, 1500, std::ptr::null_mut());
    }
}

#[repr(C)]
struct Flags2 {
    cb: u32,
    flags: u32,
}

#[repr(C)]
struct FilterKeys {
    cb: u32,
    flags: u32,
    wait: u32,
    delay: u32,
    repeat: u32,
    bounce: u32,
}

fn refresh(sys: &Sys, what: Refresh) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPIF_SENDCHANGE};
    let num = |key: &str, name: &str| reg_text(sys, key, name).and_then(|s| s.trim().parse::<u32>().ok());
    match what {
        Refresh::Immersive => {
            broadcast("ImmersiveColorSet");
            broadcast("WindowsThemeElement");
        }
        Refresh::Mouse => {
            const MOUSE: &str = r"HKCU\Control Panel\Mouse";
            let mut v = [num(MOUSE, "MouseThreshold1").unwrap_or(6) as i32, num(MOUSE, "MouseThreshold2").unwrap_or(10) as i32, num(MOUSE, "MouseSpeed").unwrap_or(1) as i32];
            // SPI_SETMOUSE (4) : seuils et accélération, relus par le pilote de la souris tout de suite
            unsafe { SystemParametersInfoW(4, 0, v.as_mut_ptr() as *mut _, SPIF_SENDCHANGE) };
        }
        Refresh::Accessibility => {
            const ACC: &str = r"HKCU\Control Panel\Accessibility";
            unsafe {
                // SPI_GET/SETSTICKYKEYS 58/59, TOGGLEKEYS 52/53, FILTERKEYS 50/51 : seuls les drapeaux changent
                for (get, set, key) in [(58u32, 59u32, "StickyKeys"), (52, 53, "ToggleKeys")] {
                    let Some(flags) = num(&format!(r"{ACC}\{key}"), "Flags") else { continue };
                    let mut s = Flags2 { cb: 8, flags: 0 };
                    SystemParametersInfoW(get, 8, &mut s as *mut _ as *mut _, 0);
                    s.flags = flags;
                    SystemParametersInfoW(set, 8, &mut s as *mut _ as *mut _, SPIF_SENDCHANGE);
                }
                if let Some(flags) = num(&format!(r"{ACC}\Keyboard Response"), "Flags") {
                    let size = std::mem::size_of::<FilterKeys>() as u32;
                    let mut f = FilterKeys { cb: size, flags: 0, wait: 0, delay: 0, repeat: 0, bounce: 0 };
                    SystemParametersInfoW(50, size, &mut f as *mut _ as *mut _, 0);
                    f.flags = flags;
                    SystemParametersInfoW(51, size, &mut f as *mut _ as *mut _, SPIF_SENDCHANGE);
                }
            }
        }
    }
}

/// Redémarre l'Explorateur pour qu'il relise la barre des tâches, le menu contextuel et l'accent. Winlogon le relance
/// de lui-même ; s'il ne revient pas, il est relancé avec le jeton de la session (jamais en administrateur).
pub fn restart_explorer() {
    use windows_sys::Win32::UI::WindowsAndMessaging::FindWindowW;
    let tray = wide("Shell_TrayWnd");
    let token = token::Shell::take();
    let _ = shell::hidden("taskkill.exe").args(["/F", "/IM", "explorer.exe"]).output();
    for _ in 0..24 {
        std::thread::sleep(std::time::Duration::from_millis(250));
        if !unsafe { FindWindowW(tray.as_ptr(), std::ptr::null()) }.is_null() {
            return;
        }
    }
    if let Some(t) = token {
        t.launch("explorer.exe");
    }
}

mod token {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::{
        DuplicateTokenEx, SecurityImpersonation, TokenPrimary, TOKEN_ADJUST_DEFAULT, TOKEN_ADJUST_SESSIONID, TOKEN_ASSIGN_PRIMARY, TOKEN_DUPLICATE,
        TOKEN_QUERY,
    };
    use windows_sys::Win32::System::Threading::{
        CreateProcessWithTokenW, OpenProcess, OpenProcessToken, PROCESS_INFORMATION, PROCESS_QUERY_LIMITED_INFORMATION, STARTUPINFOW,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetShellWindow, GetWindowThreadProcessId};

    /// Jeton de l'Explorateur, pris avant de l'arrêter.
    pub struct Shell(HANDLE);

    impl Drop for Shell {
        fn drop(&mut self) {
            unsafe { CloseHandle(self.0) };
        }
    }

    impl Shell {
        pub fn take() -> Option<Shell> {
            unsafe {
                let w = GetShellWindow();
                if w.is_null() {
                    return None;
                }
                let mut pid = 0u32;
                GetWindowThreadProcessId(w, &mut pid);
                let p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
                if p.is_null() {
                    return None;
                }
                let mut t: HANDLE = std::ptr::null_mut();
                let ok = OpenProcessToken(p, TOKEN_DUPLICATE, &mut t);
                CloseHandle(p);
                if ok == 0 {
                    return None;
                }
                let mut primary: HANDLE = std::ptr::null_mut();
                let access = TOKEN_QUERY | TOKEN_ASSIGN_PRIMARY | TOKEN_DUPLICATE | TOKEN_ADJUST_DEFAULT | TOKEN_ADJUST_SESSIONID;
                let ok = DuplicateTokenEx(t, access, std::ptr::null(), SecurityImpersonation, TokenPrimary, &mut primary);
                CloseHandle(t);
                (ok != 0).then_some(Shell(primary))
            }
        }

        pub fn launch(&self, command: &str) {
            let mut line = super::wide(command);
            unsafe {
                let mut si: STARTUPINFOW = std::mem::zeroed();
                si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
                let mut pi: PROCESS_INFORMATION = std::mem::zeroed();
                if CreateProcessWithTokenW(self.0, 0, std::ptr::null(), line.as_mut_ptr(), 0, std::ptr::null(), std::ptr::null(), &si, &mut pi) != 0 {
                    CloseHandle(pi.hThread);
                    CloseHandle(pi.hProcess);
                }
            }
        }
    }
}

/// Exécute `f` dans un thread à part, avec COM initialisé (les fils de Tauri ont déjà leur propre mode COM).
fn com<T: Send + 'static>(f: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED};
    std::thread::spawn(move || unsafe {
        let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let r = f();
        if hr.is_ok() {
            CoUninitialize();
        }
        r
    })
    .join()
    .map_err(|_| "COM thread stopped".to_string())?
}

fn err(e: windows::core::Error) -> String {
    format!("{} (0x{:08X})", e.message(), e.code().0)
}

// ------------------------------------------------------------------ applications du Store

mod appx {
    use super::{com, err, Appx};
    use windows::core::HSTRING;
    use windows::Management::Deployment::{DeploymentOptions, DeploymentResult, PackageManager};

    /// Paquet installé pour le compte en cours (SID vide), hors frameworks.
    pub fn find(name: &str) -> Option<Appx> {
        let name = name.to_string();
        com(move || {
            let pm = PackageManager::new().map_err(err)?;
            let list = pm.FindPackagesByUserSecurityId(&HSTRING::new()).map_err(err)?;
            for p in list {
                let Ok(id) = p.Id() else { continue };
                if !id.Name().is_ok_and(|n| n.to_string_lossy().eq_ignore_ascii_case(&name)) || p.IsFramework().unwrap_or(false) {
                    continue;
                }
                return Ok(Some(Appx {
                    name: name.clone(),
                    full_name: id.FullName().map_err(err)?.to_string_lossy(),
                    family: id.FamilyName().map_err(err)?.to_string_lossy(),
                    location: p.InstalledPath().ok().map(|s| s.to_string_lossy()),
                }));
            }
            Ok(None)
        })
        .ok()
        .flatten()
    }

    fn done(r: windows::core::Result<DeploymentResult>) -> Result<(), String> {
        match r {
            Ok(res) => match res.ExtendedErrorCode() {
                Ok(code) if code.is_err() => Err(res.ErrorText().map(|t| t.to_string_lossy()).unwrap_or_else(|_| format!("0x{:08X}", code.0))),
                _ => Ok(()),
            },
            Err(e) => Err(err(e)),
        }
    }

    /// Retiré du compte du joueur seulement : le paquet reste sur le PC, prêt à être réinscrit.
    pub fn remove(full_name: &str) -> Result<(), String> {
        let full = HSTRING::from(full_name);
        com(move || {
            let pm = PackageManager::new().map_err(err)?;
            done(pm.RemovePackageAsync(&full).map_err(err)?.join())
        })
    }

    /// Réinscrit le paquet pour le compte : même version si elle est encore sur le PC, sinon celle que Windows garde
    /// pour la famille (mise à jour entre-temps), sinon par PowerShell.
    pub fn register(app: &Appx) -> Result<(), String> {
        let (full, family) = (HSTRING::from(&app.full_name), HSTRING::from(&app.family));
        let r = com(move || {
            let pm = PackageManager::new().map_err(err)?;
            let by_full = pm.RegisterPackageByFullNameAsync(&full, None, DeploymentOptions::None).map_err(err).and_then(|op| done(op.join()));
            if by_full.is_ok() {
                return by_full;
            }
            pm.RegisterPackageByFamilyNameAndOptionalPackagesAsync(&family, None, DeploymentOptions::None, None, None)
                .map_err(err)
                .and_then(|op| done(op.join()))
        });
        if r.is_ok() || find(&app.name).is_some() {
            return Ok(());
        }
        let family = app.family.replace('\'', "''");
        let _ = crate::shell::powershell(&format!("Add-AppxPackage -RegisterByFamilyName -MainPackage '{family}' -ErrorAction SilentlyContinue"));
        if find(&app.name).is_some() {
            Ok(())
        } else {
            r
        }
    }
}

// ------------------------------------------------------------------ fond d'écran

mod wallpaper {
    use super::*;
    use windows::core::{HSTRING, PCWSTR, PWSTR};
    use windows::Win32::Foundation::COLORREF;
    use windows::Win32::System::Com::{CoCreateInstance, CoTaskMemFree, CLSCTX_ALL};
    use windows::Win32::UI::Shell::{
        DesktopWallpaper, IDesktopWallpaper, IShellItem, IShellItemArray, SHCreateItemFromParsingName, SHCreateShellItemArrayFromShellItem,
        DESKTOP_SLIDESHOW_OPTIONS, DESKTOP_WALLPAPER_POSITION, DSS_SLIDESHOW, DWPOS_FILL, SIGDN_FILESYSPATH,
    };

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Saved {
        /// fond de chaque écran (identifiant de l'écran, fichier)
        monitors: Vec<(String, String)>,
        position: i32,
        color: u32,
        /// dossiers du diaporama, s'il tournait
        slideshow: Option<Vec<String>>,
        options: i32,
        tick: u32,
        /// copie de l'image affichée, si le fichier d'origine disparaît d'ici la désactivation
        copy: Option<String>,
        ours: String,
        regs: Regs,
    }

    fn take(p: PWSTR) -> String {
        let s = unsafe { p.to_string() }.unwrap_or_default();
        unsafe { CoTaskMemFree(Some(p.0 as *const _)) };
        s
    }

    fn desktop() -> Result<IDesktopWallpaper, String> {
        unsafe { CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL) }.map_err(err)
    }

    const REGS: &[(&str, &str)] = &[
        (r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Wallpapers", "BackgroundType"),
        (r"HKCU\Software\Microsoft\Windows\CurrentVersion\DesktopSpotlight\Settings", "EnabledState"),
    ];

    const DESKTOP: &str = r"HKCU\Control Panel\Desktop";

    /// SystemParametersInfo, si IDesktopWallpaper est refusé : un seul fond pour tous les écrans.
    fn spi(path: &str) -> Result<(), String> {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPIF_SENDCHANGE, SPIF_UPDATEINIFILE, SPI_SETDESKWALLPAPER};
        let mut w = super::wide(path);
        let ok = unsafe { SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, w.as_mut_ptr() as *mut _, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE) };
        if ok != 0 {
            Ok(())
        } else {
            Err("SystemParametersInfo refused the wallpaper".into())
        }
    }

    pub fn apply(host: &WinHost) -> Result<Saved, String> {
        let ours = host.wall_file()?;
        let mut regs = Regs::take(&host.sys, REGS);
        match apply_com(host, &ours, regs.clone()) {
            Ok(s) => Ok(s),
            Err(com_err) => {
                regs.0.extend(Regs::take(&host.sys, &[(DESKTOP, "WallpaperStyle"), (DESKTOP, "TileWallpaper")]).0);
                let before = reg_text(&host.sys, DESKTOP, "Wallpaper").unwrap_or_default();
                let ours_s = ours.to_string_lossy().into_owned();
                spi(&ours_s).map_err(|e| format!("{com_err}; {e}"))?;
                Ok(Saved { monitors: vec![(String::new(), before)], position: -1, color: 0, slideshow: None, options: 0, tick: 0, copy: None, ours: ours_s, regs })
            }
        }
    }

    fn apply_com(host: &WinHost, ours: &Path, regs: Regs) -> Result<Saved, String> {
        let keep = host.keep_dir.clone();
        let ours_s = ours.to_string_lossy().into_owned();
        com(move || unsafe {
            let dw = desktop()?;
            let mut monitors = Vec::new();
            for i in 0..dw.GetMonitorDevicePathCount().map_err(err)? {
                let id = take(dw.GetMonitorDevicePathAt(i).map_err(err)?);
                let path = dw.GetWallpaper(&HSTRING::from(&id)).map(take).unwrap_or_default();
                monitors.push((id, path));
            }
            let position = dw.GetPosition().map(|p| p.0).unwrap_or(DWPOS_FILL.0);
            let color = dw.GetBackgroundColor().map(|c| c.0).unwrap_or(0);
            let mut slideshow = None;
            let (mut options, mut tick) = (DESKTOP_SLIDESHOW_OPTIONS(0), 0u32);
            if dw.GetStatus().is_ok_and(|s| s.0 & DSS_SLIDESHOW.0 != 0) {
                if let Ok(items) = dw.GetSlideshow() {
                    let mut paths = Vec::new();
                    for i in 0..items.GetCount().unwrap_or(0) {
                        if let Ok(item) = items.GetItemAt(i) {
                            if let Ok(p) = item.GetDisplayName(SIGDN_FILESYSPATH) {
                                paths.push(take(p));
                            }
                        }
                    }
                    let _ = dw.GetSlideshowOptions(&mut options, &mut tick);
                    slideshow = Some(paths);
                }
            }
            // copie de l'image que Windows affiche (TranscodedWallpaper), pour un fichier d'origine supprimé depuis
            let copy = std::env::var("APPDATA").ok().and_then(|a| {
                let src = Path::new(&a).join(r"Microsoft\Windows\Themes\TranscodedWallpaper");
                let _ = std::fs::create_dir_all(&keep);
                let dst = keep.join("wallpaper-before.jpg");
                std::fs::copy(&src, &dst).ok().map(|_| dst.to_string_lossy().into_owned())
            });
            dw.SetWallpaper(PCWSTR::null(), &HSTRING::from(&ours_s)).map_err(err)?;
            let _ = dw.SetPosition(DWPOS_FILL);
            Ok(Saved { monitors, position, color, slideshow, options: options.0, tick, copy, ours: ours_s, regs })
        })
    }

    /// Autre fond choisi dans Rago OS : posé à la place du précédent, le fond d'avant Rago OS reste noté.
    pub fn update(host: &WinHost, s: &Saved) -> Result<Saved, String> {
        let ours = host.wall_file()?.to_string_lossy().into_owned();
        if s.position < 0 {
            spi(&ours)?;
        } else {
            let file = ours.clone();
            com(move || unsafe {
                let dw = desktop()?;
                dw.SetWallpaper(PCWSTR::null(), &HSTRING::from(&file)).map_err(err)?;
                let _ = dw.SetPosition(DWPOS_FILL);
                Ok(())
            })?;
        }
        Ok(Saved { ours, ..s.clone() })
    }

    fn current() -> Option<String> {
        com(|| unsafe {
            let dw = desktop()?;
            let id = take(dw.GetMonitorDevicePathAt(0).map_err(err)?);
            Ok(dw.GetWallpaper(&HSTRING::from(&id)).map(take).ok())
        })
        .ok()
        .flatten()
    }

    pub fn in_place(s: &Saved) -> bool {
        let now = if s.position < 0 { reg_text(&Sys::new(std::env::temp_dir()), DESKTOP, "Wallpaper") } else { current() };
        now.is_some_and(|c| c.eq_ignore_ascii_case(&s.ours))
    }

    pub fn revert(host: &WinHost, s: &Saved) -> Result<(), String> {
        // le joueur a choisi un autre fond depuis : son choix reste
        if !in_place(s) {
            return Ok(());
        }
        if s.position < 0 {
            // posé par SystemParametersInfo
            let before = s.monitors.first().map(|(_, p)| p.clone()).unwrap_or_default();
            s.regs.put_back(&host.sys);
            return spi(&before);
        }
        let s2 = s.clone();
        com(move || unsafe {
            let dw = desktop()?;
            let _ = dw.SetBackgroundColor(COLORREF(s2.color));
            if let Some(first) = s2.slideshow.as_ref().and_then(|p| p.first()) {
                let item: IShellItem = SHCreateItemFromParsingName(&HSTRING::from(first), None).map_err(err)?;
                let arr: IShellItemArray = SHCreateShellItemArrayFromShellItem(&item).map_err(err)?;
                dw.SetSlideshow(&arr).map_err(err)?;
                let _ = dw.SetSlideshowOptions(DESKTOP_SLIDESHOW_OPTIONS(s2.options), s2.tick);
            } else {
                let fallback = s2.copy.clone().filter(|c| Path::new(c).is_file());
                for (id, path) in &s2.monitors {
                    let file = if !path.is_empty() && Path::new(path).is_file() { Some(path.clone()) } else { fallback.clone() };
                    let Some(file) = file else { continue };
                    if dw.SetWallpaper(&HSTRING::from(id), &HSTRING::from(&file)).is_err() {
                        // écran débranché depuis : même image sur tous
                        let _ = dw.SetWallpaper(PCWSTR::null(), &HSTRING::from(&file));
                    }
                }
                if s2.monitors.iter().all(|(_, p)| p.is_empty()) {
                    // fond uni
                    let _ = dw.SetWallpaper(PCWSTR::null(), &HSTRING::new());
                }
            }
            let _ = dw.SetPosition(DESKTOP_WALLPAPER_POSITION(s2.position));
            Ok(())
        })?;
        s.regs.put_back(&host.sys);
        Ok(())
    }
}

// ------------------------------------------------------------------ écran de verrouillage

mod lockscreen {
    use super::*;
    use windows::core::HSTRING;
    use windows::Storage::StorageFile;
    use windows::System::UserProfile::LockScreen;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Saved {
        /// "api" : LockScreen.SetImageFileAsync ; "csp" : stratégie PersonalizationCSP (si l'API est refusée)
        mode: String,
        /// copie de l'image d'avant
        before: Option<String>,
        /// adresse de l'image juste après la pose : si elle a changé à la désactivation, le joueur en a mis une autre
        ours_uri: Option<String>,
        regs: Regs,
    }

    const CSP: &str = r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP";

    fn uri() -> Option<String> {
        com(|| Ok(LockScreen::OriginalImageFile().ok().and_then(|u| u.AbsoluteUri().ok()).map(|s| s.to_string_lossy()))).ok().flatten()
    }

    fn set(path: &str) -> Result<(), String> {
        let p = HSTRING::from(path);
        com(move || {
            let file = StorageFile::GetFileFromPathAsync(&p).map_err(err)?.join().map_err(err)?;
            LockScreen::SetImageFileAsync(&file).map_err(err)?.join().map_err(err)
        })
    }

    /// Copie de l'image actuelle de l'écran de verrouillage, lue par l'API (le dossier où Windows la garde est protégé).
    fn copy_current(dir: &Path) -> Option<String> {
        let dir = dir.to_path_buf();
        com(move || {
            use windows::Storage::Streams::DataReader;
            let stream = LockScreen::GetImageStream().map_err(err)?;
            let size = stream.Size().map_err(err)? as u32;
            if size == 0 {
                return Ok(None);
            }
            let reader = DataReader::CreateDataReader(&stream.GetInputStreamAt(0).map_err(err)?).map_err(err)?;
            let load: windows_future::IAsyncOperation<u32> = windows::core::Interface::cast(&reader.LoadAsync(size).map_err(err)?).map_err(err)?;
            load.join().map_err(err)?;
            let mut buf = vec![0u8; size as usize];
            reader.ReadBytes(&mut buf).map_err(err)?;
            let _ = std::fs::create_dir_all(&dir);
            let dst = dir.join("lockscreen-before.jpg");
            std::fs::write(&dst, buf).map_err(|e| e.to_string())?;
            Ok(Some(dst.to_string_lossy().into_owned()))
        })
        .ok()
        .flatten()
    }

    fn sz(s: &str) -> Vec<u8> {
        s.encode_utf16().chain(std::iter::once(0)).flat_map(u16::to_le_bytes).collect()
    }

    /// Même image que le bureau.
    pub fn apply(host: &WinHost) -> Result<Saved, String> {
        let ours = host.wall_file()?;
        let ours = ours.to_string_lossy().into_owned();
        let before = copy_current(&host.keep_dir);
        match set(&ours) {
            Ok(()) => Ok(Saved { mode: "api".into(), before, ours_uri: uri(), regs: Regs::default() }),
            Err(api_err) => {
                // API refusée : la stratégie que Paramètres affiche comme « gérée par ton organisation »
                let regs = Regs::take(&host.sys, &[(CSP, "LockScreenImagePath"), (CSP, "LockScreenImageUrl"), (CSP, "LockScreenImageStatus")]);
                host.sys.write(CSP, "LockScreenImagePath", 1, &sz(&ours)).map_err(|e| format!("{api_err}; {e}"))?;
                host.sys.write(CSP, "LockScreenImageUrl", 1, &sz(&ours))?;
                host.sys.write(CSP, "LockScreenImageStatus", 4, &1u32.to_le_bytes())?;
                Ok(Saved { mode: "csp".into(), before, ours_uri: None, regs })
            }
        }
    }

    /// Le fond du bureau a changé : l'écran de verrouillage le suit.
    pub fn update(host: &WinHost, s: &Saved) -> Result<Saved, String> {
        let ours = host.wall_file()?.to_string_lossy().into_owned();
        if s.mode == "csp" {
            host.sys.write(CSP, "LockScreenImagePath", 1, &sz(&ours))?;
            host.sys.write(CSP, "LockScreenImageUrl", 1, &sz(&ours))?;
            return Ok(s.clone());
        }
        set(&ours)?;
        Ok(Saved { ours_uri: uri(), ..s.clone() })
    }

    pub fn revert(host: &WinHost, s: &Saved) -> Result<(), String> {
        if s.mode == "csp" {
            s.regs.put_back(&host.sys);
            return Ok(());
        }
        if s.ours_uri.is_some() && uri() != s.ours_uri {
            return Ok(());
        }
        let windir = std::env::var("WINDIR").unwrap_or_else(|_| r"C:\Windows".into());
        let default = format!(r"{windir}\Web\Screen\img100.jpg");
        let file = s.before.clone().filter(|p| Path::new(p).is_file()).unwrap_or(default);
        set(&file)
    }
}

// ------------------------------------------------------------------ thème

mod theme {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Saved {
        pub path: String,
        pub before: Option<String>,
    }

    pub fn body(wallpaper: &Path) -> String {
        format!(
            "; Rago OS (Rago Optimizer)\r\n[Theme]\r\nDisplayName=Rago OS\r\n\r\n[Control Panel\\Desktop]\r\nWallpaper={}\r\nTileWallpaper=0\r\nWallpaperStyle=10\r\nPattern=\r\n\r\n[VisualStyles]\r\nPath=%SystemRoot%\\resources\\themes\\Aero\\Aero.msstyles\r\nColorStyle=NormalColor\r\nSize=NormalSize\r\nAutoColorization=0\r\nColorizationColor=0XC48A8E96\r\nSystemMode=Dark\r\nAppMode=Dark\r\nVisualStyleVersion=10\r\n\r\n[Sounds]\r\nSchemeName=@%SystemRoot%\\System32\\mmres.dll,-800\r\n\r\n[MasterThemeSelector]\r\nMTSM=RJSPBS\r\n",
            wallpaper.display()
        )
    }

    fn write(path: &Path, wall: &Path) -> Result<(), String> {
        // UTF-16 avec BOM, comme les thèmes de Windows
        let bytes: Vec<u8> = [0xFF, 0xFE].into_iter().chain(body(wall).encode_utf16().flat_map(u16::to_le_bytes)).collect();
        std::fs::write(path, bytes).map_err(|e| e.to_string())
    }

    pub fn apply(host: &WinHost) -> Result<Saved, String> {
        let wall = host.wall_file()?;
        let local = std::env::var("LOCALAPPDATA").map_err(|e| e.to_string())?;
        let dir = Path::new(&local).join(r"Microsoft\Windows\Themes");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join("Rago OS.theme");
        let before = std::fs::read_to_string(&path).ok();
        write(&path, &wall)?;
        Ok(Saved { path: path.to_string_lossy().into_owned(), before })
    }

    /// Le thème suit le fond choisi.
    pub fn update(host: &WinHost, s: &Saved) -> Result<Saved, String> {
        write(Path::new(&s.path), &host.wall_file()?)?;
        Ok(s.clone())
    }

    pub fn revert(s: &Saved) -> Result<(), String> {
        match &s.before {
            Some(b) => std::fs::write(&s.path, b).map_err(|e| e.to_string()),
            None => {
                let _ = std::fs::remove_file(&s.path);
                Ok(())
            }
        }
    }
}

// ------------------------------------------------------------------ plan d'alimentation

mod power {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Saved {
        /// plan actif juste avant Rago OS (celui d'un réglage classique de l'app, ou celui du joueur)
        pub prev: String,
    }

    pub fn active() -> Option<String> {
        run("powercfg.exe", &["/getactivescheme"]).ok().and_then(|o| backup::parse_guid(&o))
    }

    fn exists(guid: &str) -> bool {
        run("powercfg.exe", &["/query", guid]).is_ok()
    }

    pub fn apply() -> Result<Saved, String> {
        let prev = active().unwrap_or_else(|| BALANCED.into());
        if !exists(PLAN) {
            // PC en veille moderne : le plan Performances élevées est caché, copie du plan Équilibré avec le
            // processeur toujours prêt sur secteur (ce que Performances élevées change)
            if run("powercfg.exe", &["/duplicatescheme", HIGH_PERFORMANCE, PLAN]).is_err() {
                run("powercfg.exe", &["/duplicatescheme", BALANCED, PLAN])?;
                let _ = run("powercfg.exe", &["/setacvalueindex", PLAN, "SUB_PROCESSOR", "PROCTHROTTLEMIN", "100"]);
            }
            let _ = run("powercfg.exe", &["/changename", PLAN, "Rago OS", "Rago OS power plan (Rago Optimizer)"]);
        }
        run("powercfg.exe", &["/setactive", PLAN])?;
        Ok(Saved { prev })
    }

    pub fn revert(s: &Saved) -> Result<(), String> {
        if active().is_some_and(|g| g.eq_ignore_ascii_case(PLAN)) {
            let back = if exists(&s.prev) { s.prev.as_str() } else { BALANCED };
            run("powercfg.exe", &["/setactive", back])?;
        }
        if exists(PLAN) {
            run("powercfg.exe", &["/delete", PLAN])?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn theme_points_to_the_wallpaper_and_dark_mode() {
        let b = super::theme::body(std::path::Path::new(r"C:\Users\Tom\AppData\Local\Rago OS\wallpaper.jpg"));
        assert!(b.contains(r"Wallpaper=C:\Users\Tom\AppData\Local\Rago OS\wallpaper.jpg"));
        assert!(b.contains("SystemMode=Dark") && b.contains("ColorizationColor=0XC48A8E96"));
    }
}
