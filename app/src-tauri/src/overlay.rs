//! Barre en jeu (RAG-82). Un raccourci (Ctrl+Shift+R par défaut) ouvre par-dessus le jeu une barre en verre : FPS, ping,
//! processeur, carte graphique, mémoire, nettoyage de la RAM et quelques réglages qui s'appliquent sans redémarrer.
//!
//! - Le raccourci n'est pris à Windows que pendant qu'un jeu est au premier plan (ou la barre ouverte) : le reste du
//!   temps, Ctrl+Shift+R reste à l'app au premier plan (rechargement d'une page dans un navigateur).
//! - Un jeu : un jeu de la bibliothèque, Minecraft Java (javaw.exe, quel que soit le launcher), ou une fenêtre qui
//!   couvre tout son écran (plein écran fenêtré). Le plein écran exclusif ne laisse rien s'afficher par-dessus.
//! - Barre ouverte : elle prend le clavier et la souris, Échap, le raccourci ou un clic dans le jeu la ferment, et le jeu
//!   reprend le premier plan. Option « garder les stats à l'écran » : une pastille FPS et ping reste en haut à droite
//!   pendant la partie, sans prendre ni le focus ni les clics.
//! - Jeux qui se réduisent dès qu'ils perdent le premier plan (Minecraft Java en plein écran, et ceux qu'on voit se
//!   réduire à l'ouverture) : la barre s'ouvre sans le leur prendre. Elle prend les clics mais pas le clavier ; le jeu
//!   garde le premier plan, le raccourci, Échap ou ✕ ferment la barre.
//! - Souris : Minecraft la garde (curseur caché et ramené au centre) tant qu'il est au premier plan en jeu. En fenêtre,
//!   la barre lui prend le premier plan et il la rend de lui-même ; en plein écran, la barre lui envoie Échap, qui ouvre
//!   son menu pause et libère le curseur. Pendant ce temps, Échap ferme la barre et le jeu reste en pause.

use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::background::Background;
use crate::fps::Fps;
use crate::gameping::GamePing;
use crate::games::Library;

pub const LABEL: &str = "overlay";
/// Tailles en points (multipliées par l'échelle de l'écran du jeu).
const PANEL: (f64, f64) = (780.0, 600.0);
const PILL: (f64, f64) = (236.0, 44.0);
const MARGIN: f64 = 18.0;
const TICK: Duration = Duration::from_millis(700);
/// Pris à Windows tant que la barre est ouverte sans le premier plan : Échap la ferme au lieu d'aller au jeu.
const ESC: &str = "Escape";

/// Exes de jeux reconnus sans la bibliothèque : Minecraft Java (tous les launchers) et Bedrock.
const KNOWN: &[(&str, &str)] = &[("javaw.exe", "Minecraft"), ("java.exe", "Minecraft"), ("minecraft.windows.exe", "Minecraft")];
/// Jamais un jeu, même en plein écran : le bureau de Windows, les navigateurs et les lecteurs vidéo (une vidéo en plein
/// écran n'a pas à afficher la pastille, et Ctrl+Shift+R y reste le rechargement de la page).
const NEVER: &[&str] = &[
    "explorer.exe",
    "searchhost.exe",
    "startmenuexperiencehost.exe",
    "shellexperiencehost.exe",
    "lockapp.exe",
    "textinputhost.exe",
    "applicationframehost.exe",
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "brave.exe",
    "opera.exe",
    "vivaldi.exe",
    "arc.exe",
    "vlc.exe",
    "mpc-hc64.exe",
    "mpc-be64.exe",
    "potplayermini64.exe",
    "wmplayer.exe",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Hidden,
    Panel,
    Pill,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Target {
    pub hwnd: isize,
    pub pid: u32,
    pub name: String,
    /// Minecraft Java : ping du jeu, et la barre ne lui prend jamais le premier plan (en plein écran, il se réduit
    /// dès qu'il le perd)
    pub minecraft: bool,
    /// nom de l'exe en minuscules
    pub exe: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    pub mode: Mode,
    pub game: Option<String>,
    pub shortcut: String,
    pub pin: bool,
    /// PresentMon livré avec l'app : sans lui, pas de FPS
    pub fps_available: bool,
    /// raccourci refusé par Windows (déjà pris par une autre app)
    pub shortcut_taken: bool,
    /// barre ouverte sans prendre le premier plan au jeu : pas de clavier, Échap reste au jeu
    pub passive: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Live {
    pub fps: Option<f64>,
    pub ping: Option<u32>,
}

#[derive(Default)]
struct St {
    mode: Option<Mode>,
    game: Option<Target>,
    /// raccourci actuellement pris à Windows
    registered: Option<String>,
    taken: bool,
    /// barre ouverte sans prendre le premier plan au jeu
    passive: bool,
    /// Échap pris à Windows (barre ouverte sans le premier plan)
    esc: bool,
    /// exes vus se réduire quand la barre leur a pris le premier plan (pour cette session)
    minimizes: HashSet<String>,
}

pub struct Overlay {
    st: Mutex<St>,
    fps: Fps,
    ping: Mutex<GamePing>,
    resource_dir: PathBuf,
    library: Arc<Library>,
    background: Arc<Background>,
}

/// Nom affiché du jeu d'après son exe, None si ce n'est pas un jeu.
pub fn game_name(exe: &Path, covers_screen: bool, library: impl Fn(&Path) -> Option<String>) -> Option<String> {
    let file = exe.file_name()?.to_string_lossy().to_lowercase();
    if NEVER.contains(&file.as_str()) {
        return None;
    }
    if let Some(name) = library(exe) {
        return Some(name);
    }
    if let Some((_, name)) = KNOWN.iter().find(|(f, _)| *f == file) {
        return Some((*name).to_string());
    }
    covers_screen.then(|| exe.file_stem().map(|s| s.to_string_lossy().to_string())).flatten()
}

impl Overlay {
    pub fn new(resource_dir: PathBuf, library: Arc<Library>, background: Arc<Background>) -> Self {
        Overlay { st: Mutex::default(), fps: Fps::default(), ping: Mutex::default(), resource_dir, library, background }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, St> {
        self.st.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    pub fn mode(&self) -> Mode {
        self.lock().mode.unwrap_or(Mode::Hidden)
    }

    pub fn info(&self) -> Info {
        let prefs = self.background.prefs();
        let st = self.lock();
        Info {
            mode: st.mode.unwrap_or(Mode::Hidden),
            game: st.game.as_ref().map(|g| g.name.clone()),
            shortcut: prefs.shortcut,
            pin: prefs.pin,
            fps_available: Fps::available(&self.resource_dir),
            shortcut_taken: st.taken,
            passive: st.passive,
        }
    }

    pub fn live(&self) -> Live {
        let game = self.lock().game.as_ref().map(|g| (g.pid, g.minecraft));
        let ping = game.and_then(|(p, mc)| self.ping.lock().unwrap_or_else(std::sync::PoisonError::into_inner).read(p, mc));
        Live { fps: self.fps.value().map(|f| (f * 10.0).round() / 10.0), ping }
    }

    /// Le jeu au premier plan, s'il y en a un.
    fn foreground_game(&self) -> Option<Target> {
        let (hwnd, pid) = win::foreground()?;
        if pid == std::process::id() {
            return None;
        }
        let exe = win::process_path(pid)?;
        let name = game_name(&exe, win::covers_monitor(hwnd), |p| self.library.name_for(p))?;
        let file = exe.file_name().map(|f| f.to_string_lossy().to_lowercase()).unwrap_or_default();
        Some(Target { hwnd, pid, name, minecraft: matches!(file.as_str(), "javaw.exe" | "java.exe"), exe: file })
    }

    /// La barre ne doit pas prendre le premier plan à ce jeu : Minecraft en plein écran (il se réduirait), ou un jeu vu
    /// se réduire. Minecraft en fenêtre se met en pause et rend la souris quand il perd le premier plan.
    fn keeps_foreground(&self, game: Option<&Target>) -> bool {
        game.is_some_and(|g| (g.minecraft && win::covers_monitor(g.hwnd)) || self.lock().minimizes.contains(&g.exe))
    }

    /// Raccourcis pris à Windows : celui de la barre pendant qu'un jeu est au premier plan (`game_up`) ou que la barre est
    /// ouverte, et Échap tant que la barre est ouverte sans le premier plan.
    fn sync_shortcuts(&self, app: &AppHandle, game_up: bool) {
        let prefs = self.background.prefs();
        let (mode, passive, registered, had_esc) = {
            let st = self.lock();
            (st.mode.unwrap_or(Mode::Hidden), st.passive, st.registered.clone(), st.esc)
        };
        let want = (prefs.overlay && (game_up || mode == Mode::Panel)).then(|| prefs.shortcut.clone());
        let esc = want.is_some() && mode == Mode::Panel && passive;
        if want == registered && esc == had_esc {
            return;
        }
        let gs = app.global_shortcut();
        let _ = gs.unregister_all();
        let mut taken = false;
        if let Some(sc) = &want {
            taken = gs.register(sc.as_str()).is_err();
        }
        if esc {
            // refusé (pris par une autre app) : la barre se ferme alors par le raccourci ou ✕, sans réessai à chaque tour
            let _ = gs.register(ESC);
        }
        let mut st = self.lock();
        st.registered = if taken { None } else { want };
        st.taken = taken;
        st.esc = esc;
    }

    /// Fenêtre de la barre, créée cachée au premier jeu vu (puis gardée : l'ouvrir est instantané).
    fn window(&self, app: &AppHandle) -> Option<WebviewWindow> {
        if let Some(w) = app.get_webview_window(LABEL) {
            return Some(w);
        }
        WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("overlay.html".into()))
            .title("Rago Optimizer")
            .inner_size(PANEL.0, PANEL.1)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .visible(false)
            .focused(false)
            .build()
            .map_err(|e| eprintln!("[overlay] {e}"))
            .ok()
    }

    /// Place la fenêtre sur l'écran du jeu : en haut au centre (barre) ou en haut à droite (pastille).
    fn place(&self, app: &AppHandle, w: &WebviewWindow, game: Option<&Target>, mode: Mode) {
        let center = game.and_then(|g| win::window_center(g.hwnd));
        let monitors = app.available_monitors().unwrap_or_default();
        let monitor = center
            .and_then(|(x, y)| {
                monitors.iter().find(|m| {
                    let (p, s) = (m.position(), m.size());
                    x >= p.x && y >= p.y && x < p.x + s.width as i32 && y < p.y + s.height as i32
                })
            })
            .cloned()
            .or_else(|| app.primary_monitor().ok().flatten());
        let Some(m) = monitor else { return };
        let scale = m.scale_factor();
        let (lw, lh) = if mode == Mode::Pill { PILL } else { PANEL };
        let (mx, my, mw, mh) = (m.position().x, m.position().y, m.size().width as i32, m.size().height as i32);
        let margin = (MARGIN * scale).round() as i32;
        // petit écran (1280 × 720 à 125 %, par exemple) : la barre rétrécit, sa liste de réglages défile
        let pw = ((lw * scale).round() as i32).min(mw - 2 * margin);
        let ph = ((lh * scale).round() as i32).min(mh - 2 * margin);
        let x = if mode == Mode::Pill { mx + mw - pw - margin } else { mx + (mw - pw) / 2 };
        let _ = w.set_position(PhysicalPosition::new(x, my + margin));
        let _ = w.set_size(PhysicalSize::new(pw as u32, ph as u32));
    }

    fn set_mode(&self, app: &AppHandle, mode: Mode) {
        self.lock().mode = Some(mode);
        let _ = app.emit_to(LABEL, "overlay:mode", mode);
    }

    /// Raccourci : ouvre la barre, ou la ferme si elle est ouverte.
    pub fn toggle(&self, app: &AppHandle) {
        if self.mode() == Mode::Panel {
            self.close(app, true);
        } else {
            self.open(app);
        }
    }

    pub fn open(&self, app: &AppHandle) {
        if let Some(g) = self.foreground_game() {
            self.lock().game = Some(g);
        }
        let game = self.lock().game.clone();
        let Some(w) = self.window(app) else { return };
        let passive = self.keeps_foreground(game.as_ref());
        // relevé avant d'afficher la barre, quand le curseur est encore au-dessus du jeu
        let free_mouse = passive && game.as_ref().is_some_and(|g| g.minecraft) && win::mouse_captured();
        self.lock().passive = passive;
        let _ = w.set_ignore_cursor_events(false);
        let _ = w.set_focusable(!passive);
        self.set_mode(app, Mode::Panel);
        self.place(app, &w, game.as_ref(), Mode::Panel);
        win::show(&w, !passive);
        if free_mouse {
            // menu pause du jeu, qui libère le curseur ; Échap n'est pris à Windows qu'après son passage
            win::press_escape();
            std::thread::sleep(Duration::from_millis(80));
        }
        self.sync_shortcuts(app, true);
        self.follow();
    }

    /// Ferme la barre ; `refocus` : le jeu reprend le premier plan (pas après un clic dans le jeu, qui l'a déjà).
    pub fn close(&self, app: &AppHandle, refocus: bool) {
        if self.mode() != Mode::Panel {
            return;
        }
        self.set_mode(app, Mode::Hidden);
        if let Some(w) = app.get_webview_window(LABEL) {
            win::hide(&w);
        }
        let game = self.lock().game.clone();
        // Échap rendu au jeu tout de suite
        self.sync_shortcuts(app, game.is_some());
        if let (true, Some(g)) = (refocus, game) {
            win::bring_back(g.hwnd);
        }
        // la pastille revient au tour suivant si elle est gardée à l'écran
    }

    /// La fenêtre de la barre a perdu le premier plan : un clic dans le jeu la ferme. Sans effet quand la barre ne
    /// l'avait pas pris (le jeu l'a toujours).
    pub fn on_blur(&self, app: &AppHandle) {
        if !self.lock().passive {
            self.close(app, false);
        }
    }

    /// Le jeu s'est réduit quand la barre lui a pris le premier plan : il revient, et la barre reste ouverte par-dessus
    /// sans le lui reprendre (cette fois et les suivantes).
    fn keep_game_up(&self, app: &AppHandle, game: &Target) {
        {
            let mut st = self.lock();
            st.passive = true;
            st.minimizes.insert(game.exe.clone());
        }
        if let Some(w) = app.get_webview_window(LABEL) {
            let _ = w.set_focusable(false);
            win::bring_back(game.hwnd);
            win::show(&w, false);
        }
        self.sync_shortcuts(app, true);
        let _ = app.emit_to(LABEL, "overlay:mode", Mode::Panel);
    }

    fn show_pill(&self, app: &AppHandle, game: &Target) {
        let Some(w) = self.window(app) else { return };
        let _ = w.set_ignore_cursor_events(true);
        let _ = w.set_focusable(false);
        self.set_mode(app, Mode::Pill);
        self.place(app, &w, Some(game), Mode::Pill);
        win::show(&w, false);
    }

    fn hide_pill(&self, app: &AppHandle) {
        self.set_mode(app, Mode::Hidden);
        if let Some(w) = app.get_webview_window(LABEL) {
            win::hide(&w);
        }
    }

    /// FPS mesurés seulement quand la barre ou la pastille est à l'écran.
    fn follow(&self) {
        let st = self.lock();
        let pid = (st.mode.unwrap_or(Mode::Hidden) != Mode::Hidden).then(|| st.game.as_ref().map(|g| g.pid)).flatten();
        drop(st);
        self.fps.follow(&self.resource_dir, pid);
    }

    /// Un tour de surveillance : jeu au premier plan, raccourci, pastille, mesure des FPS.
    fn tick(&self, app: &AppHandle) {
        let prefs = self.background.prefs();
        let fg = if prefs.overlay { self.foreground_game() } else { None };
        let mode = self.mode();
        {
            let mut st = self.lock();
            if let Some(g) = &fg {
                st.game = Some(g.clone());
            } else if st.game.as_ref().is_some_and(|g| !win::alive(g.hwnd)) {
                st.game = None;
            }
        }
        if fg.is_some() {
            // fenêtre prête avant le premier appui sur le raccourci
            let _ = self.window(app);
        }
        self.sync_shortcuts(app, fg.is_some());
        if !prefs.overlay && mode == Mode::Panel {
            self.close(app, true);
        }
        if mode == Mode::Panel {
            let (game, passive) = {
                let st = self.lock();
                (st.game.clone(), st.passive)
            };
            if let Some(g) = game.filter(|g| win::minimized(g.hwnd)) {
                let ours = win::foreground().is_some_and(|(_, pid)| pid == std::process::id());
                // réduit pendant que la barre a le premier plan : c'est elle qui le lui a pris (ouverture, ou clic
                // dans une barre qui ne devait pas le prendre) ; réduit par le joueur, il reste réduit
                if ours || !passive {
                    self.keep_game_up(app, &g);
                }
            }
        }
        // le jeu en plein écran se remet parfois au-dessus de tout : la barre ou la pastille repasse devant
        if mode != Mode::Hidden {
            if let Some(w) = app.get_webview_window(LABEL) {
                win::keep_on_top(&w);
            }
        }
        match (mode, &fg) {
            (Mode::Hidden, Some(g)) if prefs.overlay && prefs.pin => self.show_pill(app, g),
            (Mode::Pill, None) => self.hide_pill(app),
            (Mode::Pill, Some(_)) if !prefs.overlay || !prefs.pin => self.hide_pill(app),
            _ => {}
        }
        self.follow();
    }
}

/// Surveillance de fond, toute la vie de l'app (quelques appels Windows par tour : rien de mesurable).
pub fn watch(app: AppHandle, overlay: Arc<Overlay>) {
    let _ = std::thread::Builder::new().name("rago-overlay".into()).spawn(move || {
        // jeux de la bibliothèque reconnus même si la page Bibliothèque n'a jamais été ouverte (lancement avec Windows)
        let library = Arc::clone(&overlay.library);
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(15));
            let _ = library.list(false);
        });
        loop {
            overlay.tick(&app);
            std::thread::sleep(TICK);
        }
    });
}

/// Le raccourci a été pressé (fil principal) : la barre s'ouvre depuis un autre fil, créer ou montrer une fenêtre
/// depuis le fil principal pendant un événement peut bloquer sous Windows.
pub fn on_shortcut(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        if let Some(ov) = app.try_state::<Arc<Overlay>>() {
            ov.toggle(&app);
        }
    });
}

#[cfg(windows)]
mod win {
    use std::path::PathBuf;
    use tauri::WebviewWindow;
    use windows_sys::Win32::Foundation::{CloseHandle, HWND, RECT};
    use windows_sys::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use windows_sys::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetClipCursor, GetCursorInfo, GetForegroundWindow, GetSystemMetrics, GetWindowRect, GetWindowThreadProcessId, IsIconic,
        IsWindow, IsWindowVisible, LoadCursorW, SetForegroundWindow, SetWindowPos, ShowWindow, CURSORINFO, CURSOR_SHOWING, HWND_TOPMOST,
        IDC_APPSTARTING, IDC_ARROW, IDC_CROSS, IDC_HAND, IDC_IBEAM, IDC_NO, IDC_SIZEALL, IDC_SIZENESW, IDC_SIZENS, IDC_SIZENWSE, IDC_SIZEWE,
        IDC_WAIT, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOOWNERZORDER,
        SWP_NOSIZE, SW_HIDE, SW_RESTORE, SW_SHOW, SW_SHOWNOACTIVATE,
    };

    fn hwnd_of(w: &WebviewWindow) -> Option<HWND> {
        w.hwnd().ok().map(|h| h.0 as HWND)
    }

    pub fn foreground() -> Option<(isize, u32)> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, &mut pid);
            (pid != 0).then_some((hwnd as isize, pid))
        }
    }

    pub fn process_path(pid: u32) -> Option<PathBuf> {
        unsafe {
            let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if h.is_null() {
                return None;
            }
            let mut buf = [0u16; 1024];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len);
            CloseHandle(h);
            (ok != 0).then(|| PathBuf::from(String::from_utf16_lossy(&buf[..len as usize])))
        }
    }

    /// La fenêtre couvre tout son écran (plein écran fenêtré), bureau et barre des tâches exclus.
    pub fn covers_monitor(hwnd: isize) -> bool {
        unsafe {
            let hwnd = hwnd as HWND;
            let mut class = [0u16; 64];
            let n = GetClassNameW(hwnd, class.as_mut_ptr(), class.len() as i32);
            let class = String::from_utf16_lossy(&class[..n.max(0) as usize]);
            if matches!(class.as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd") {
                return false;
            }
            let mut r: RECT = std::mem::zeroed();
            if GetWindowRect(hwnd, &mut r) == 0 {
                return false;
            }
            let mut mi: MONITORINFO = std::mem::zeroed();
            mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if GetMonitorInfoW(MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), &mut mi) == 0 {
                return false;
            }
            let m = mi.rcMonitor;
            r.left <= m.left && r.top <= m.top && r.right >= m.right && r.bottom >= m.bottom
        }
    }

    pub fn window_center(hwnd: isize) -> Option<(i32, i32)> {
        unsafe {
            let mut r: RECT = std::mem::zeroed();
            (GetWindowRect(hwnd as HWND, &mut r) != 0).then(|| ((r.left + r.right) / 2, (r.top + r.bottom) / 2))
        }
    }

    pub fn alive(hwnd: isize) -> bool {
        unsafe { IsWindow(hwnd as HWND) != 0 }
    }

    /// Montre la fenêtre au-dessus de tout ; `activate` : elle prend le clavier (barre), sinon le jeu le garde (pastille).
    pub fn show(w: &WebviewWindow, activate: bool) {
        let Some(h) = hwnd_of(w) else { return };
        unsafe {
            ShowWindow(h, if activate { SW_SHOW } else { SW_SHOWNOACTIVATE });
            SetWindowPos(h, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | if activate { 0 } else { SWP_NOACTIVATE });
            if activate {
                SetForegroundWindow(h);
            }
        }
        if activate {
            let _ = w.set_focus();
        }
    }

    pub fn hide(w: &WebviewWindow) {
        if let Some(h) = hwnd_of(w) {
            unsafe {
                ShowWindow(h, SW_HIDE);
            }
        }
    }

    /// Le jeu reprend le premier plan, rouvert s'il s'était réduit.
    pub fn bring_back(hwnd: isize) {
        unsafe {
            if IsIconic(hwnd as HWND) != 0 {
                ShowWindow(hwnd as HWND, SW_RESTORE);
            }
            SetForegroundWindow(hwnd as HWND);
        }
    }

    pub fn minimized(hwnd: isize) -> bool {
        unsafe { IsWindow(hwnd as HWND) != 0 && IsIconic(hwnd as HWND) != 0 }
    }

    /// Le jeu au premier plan tient la souris : curseur caché ou transparent (Minecraft en jeu : rien avec GLFW, un
    /// curseur vide avec LWJGL 2 en 1.8.9), ou enfermé dans une partie de l'écran. Dans ses menus, Minecraft montre un
    /// curseur de Windows et ne l'enferme pas.
    pub fn mouse_captured() -> bool {
        unsafe {
            let mut ci: CURSORINFO = std::mem::zeroed();
            ci.cbSize = std::mem::size_of::<CURSORINFO>() as u32;
            if GetCursorInfo(&mut ci) == 0 {
                return false;
            }
            if ci.flags & CURSOR_SHOWING == 0 || ci.hCursor.is_null() {
                return true;
            }
            let standard = [
                IDC_ARROW, IDC_HAND, IDC_IBEAM, IDC_CROSS, IDC_WAIT, IDC_APPSTARTING, IDC_NO, IDC_SIZEALL, IDC_SIZENS, IDC_SIZEWE, IDC_SIZENWSE,
                IDC_SIZENESW,
            ];
            if !standard.iter().any(|id| LoadCursorW(std::ptr::null_mut(), *id) == ci.hCursor) {
                return true;
            }
            let mut clip: RECT = std::mem::zeroed();
            if GetClipCursor(&mut clip) == 0 {
                return false;
            }
            let (x, y) = (GetSystemMetrics(SM_XVIRTUALSCREEN), GetSystemMetrics(SM_YVIRTUALSCREEN));
            let (w, h) = (GetSystemMetrics(SM_CXVIRTUALSCREEN), GetSystemMetrics(SM_CYVIRTUALSCREEN));
            clip.left > x || clip.top > y || clip.right < x + w || clip.bottom < y + h
        }
    }

    /// Appui sur Échap pour la fenêtre au premier plan, par son code de touche (GLFW et LWJGL lisent le code, pas la
    /// touche virtuelle).
    pub fn press_escape() {
        let key = |flags| INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: 0, wScan: 0x01, dwFlags: KEYEVENTF_SCANCODE | flags, time: 0, dwExtraInfo: 0 } },
        };
        let inputs = [key(0), key(KEYEVENTF_KEYUP)];
        unsafe {
            SendInput(inputs.len() as u32, inputs.as_ptr(), std::mem::size_of::<INPUT>() as i32);
        }
    }

    /// Repasse devant les autres fenêtres « toujours au-dessus » (dont le jeu en plein écran), sans activer la barre.
    pub fn keep_on_top(w: &WebviewWindow) {
        let Some(h) = hwnd_of(w) else { return };
        unsafe {
            if IsWindowVisible(h) != 0 {
                SetWindowPos(h, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER);
            }
        }
    }
}

#[cfg(not(windows))]
mod win {
    use std::path::PathBuf;
    use tauri::WebviewWindow;
    pub fn foreground() -> Option<(isize, u32)> {
        None
    }
    pub fn process_path(_pid: u32) -> Option<PathBuf> {
        None
    }
    pub fn covers_monitor(_hwnd: isize) -> bool {
        false
    }
    pub fn window_center(_hwnd: isize) -> Option<(i32, i32)> {
        None
    }
    pub fn alive(_hwnd: isize) -> bool {
        false
    }
    pub fn show(w: &WebviewWindow, _activate: bool) {
        let _ = w.show();
    }
    pub fn hide(w: &WebviewWindow) {
        let _ = w.hide();
    }
    pub fn bring_back(_hwnd: isize) {}
    pub fn minimized(_hwnd: isize) -> bool {
        false
    }
    pub fn keep_on_top(_w: &WebviewWindow) {}
    pub fn mouse_captured() -> bool {
        false
    }
    pub fn press_escape() {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_games() {
        // « / » : séparateur sous Windows comme ailleurs (les tests tournent aussi sous Linux)
        let none = |_: &Path| None;
        let lib = |p: &Path| p.starts_with("D:/Riot Games/VALORANT").then(|| "VALORANT".to_string());
        assert_eq!(game_name(Path::new("C:/Users/x/.lunarclient/jre/bin/javaw.exe"), false, none).as_deref(), Some("Minecraft"));
        assert_eq!(game_name(Path::new("D:/Riot Games/VALORANT/live/VALORANT.exe"), false, lib).as_deref(), Some("VALORANT"));
        // fenêtre plein écran inconnue : son nom d'exe ; fenêtre normale : rien
        assert_eq!(game_name(Path::new("C:/Games/Krunker/Krunker.exe"), true, none).as_deref(), Some("Krunker"));
        assert_eq!(game_name(Path::new("C:/Games/Krunker/Krunker.exe"), false, none), None);
        // le bureau ou une vidéo en plein écran ne sont pas des jeux
        assert_eq!(game_name(Path::new("C:/Windows/explorer.exe"), true, none), None);
        assert_eq!(game_name(Path::new("C:/Program Files/Google/Chrome/Application/chrome.exe"), true, none), None);
    }

    #[test]
    fn default_shortcut_parses() {
        use tauri_plugin_global_shortcut::Shortcut;
        assert!(crate::background::DEFAULT_SHORTCUT.parse::<Shortcut>().is_ok());
        assert!("Alt+F9".parse::<Shortcut>().is_ok());
        assert!(ESC.parse::<Shortcut>().is_ok());
        assert!("Ctrl+Shift+".parse::<Shortcut>().is_err());
    }
}
