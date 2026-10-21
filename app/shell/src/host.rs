//! Boucle de Rago Shell : une seule copie par session, une fenêtre cachée qui reçoit les commandes de l'app et les
//! événements de Windows. Les fenêtres ne font que noter leurs événements ; ils sont traités ici, hors de la procédure
//! de fenêtre. Sans animation en cours, la boucle dort dans GetMessage : zéro image dessinée, zéro réveil inutile.

use std::cell::RefCell;
use std::collections::{HashSet, VecDeque};
use std::time::Instant;

use windows::core::{w, BOOL, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE, HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};
use windows::Win32::System::DataExchange::COPYDATASTRUCT;
use windows::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::{
    CreateMutexW, GetCurrentProcess, OpenProcess, SetPriorityClass, SetProcessInformation, TerminateProcess, ProcessPowerThrottling,
    BELOW_NORMAL_PRIORITY_CLASS, PROCESS_POWER_THROTTLING_CURRENT_VERSION, PROCESS_POWER_THROTTLING_EXECUTION_SPEED, PROCESS_POWER_THROTTLING_STATE,
    PROCESS_TERMINATE,
};
use windows::Win32::UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK};
use windows::Win32::UI::HiDpi::{SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2};
use windows::Win32::UI::WindowsAndMessaging::*;

use crate::config::{self, Command, Config};
use crate::{boot, desk, gfx, island, media, screen, taskbar, volume};

pub const HOST_CLASS: PCWSTR = w!("RagoShell.Host");
pub const WIN_CLASS: PCWSTR = w!("RagoShell.Window");
/// marque des messages WM_COPYDATA de Rago Shell
const COPY_MAGIC: usize = 0x5241_474F;

/// (dans Win32::UI::Controls, que Rago Shell n'utilise pas par ailleurs)
const WM_MOUSELEAVE: u32 = 0x02A3;

pub const WM_MEDIA: u32 = WM_APP + 1;
pub const WM_VOLUME: u32 = WM_APP + 2;
pub const WM_AUDIO_DEVICE: u32 = WM_APP + 3;
/// messages de Windows aux barres d'application (barre et Dock)
pub const WM_APPBAR: u32 = WM_APP + 4;
pub const WM_NETWORK: u32 = WM_APP + 5;
pub const WM_RADIOS: u32 = WM_APP + 6;
/// liste des applis installées prête
pub const WM_INDEX: u32 = WM_APP + 7;

pub const TIMER_SCREEN: usize = 1;
pub const TIMER_TICK: usize = 2;
pub const TIMER_HIDE: usize = 3;
pub const TIMER_PEEK: usize = 4;
// 5 : survol de l'île (island.rs)
pub const TIMER_CLOCK: usize = 6;
pub const TIMER_WINDOWS: usize = 7;
pub const TIMER_CARET: usize = 8;
pub const TIMER_LAYOUT: usize = 9;

/// identifiant du raccourci de la recherche (Alt+Espace)
pub const HOTKEY_SEARCH: i32 = 1;

#[derive(Debug, Clone, Copy)]
pub enum Event {
    Command(Command),
    TaskbarCreated,
    Foreground,
    /// une fenêtre est apparue ou a disparu : le Dock se met à jour un peu après
    Windows,
    Timer(usize),
    Mouse { hwnd: isize, x: i32, y: i32 },
    Leave { hwnd: isize },
    Down { hwnd: isize, x: i32, y: i32 },
    Click { hwnd: isize, x: i32, y: i32 },
    RClick { hwnd: isize, x: i32, y: i32 },
    Wheel { hwnd: isize, delta: i32 },
    Key { hwnd: isize, vk: u32 },
    Char { hwnd: isize, ch: u16 },
    /// la fenêtre a perdu le clavier (clic ailleurs) : menus et panneaux se ferment
    Deactivate { hwnd: isize },
    Hotkey(i32),
    AppBar { hwnd: isize, code: u32 },
    Power,
    Network,
    Radios,
    Index,
    Media,
    Volume { level: f32, muted: bool },
    AudioDevice,
    Display,
}

thread_local! {
    static EVENTS: RefCell<VecDeque<Event>> = const { RefCell::new(VecDeque::new()) };
    static TASKBAR_CREATED: std::cell::Cell<u32> = const { std::cell::Cell::new(0) };
    /// fenêtres listées dans le Dock : leur disparition le met à jour
    static KNOWN: RefCell<HashSet<isize>> = RefCell::new(HashSet::new());
}

/// Fenêtres que le Dock montre en ce moment.
pub fn set_known(list: impl Iterator<Item = isize>) {
    KNOWN.with(|k| {
        let mut k = k.borrow_mut();
        k.clear();
        k.extend(list);
    });
}

fn push(e: Event) {
    EVENTS.with(|q| q.borrow_mut().push_back(e));
}

fn pop() -> Option<Event> {
    EVENTS.with(|q| q.borrow_mut().pop_front())
}

/// Fenêtre que l'on peut passer d'un thread à l'autre (événements de la musique et du son).
#[derive(Clone, Copy)]
pub struct Poster(isize);

impl Poster {
    pub fn new(hwnd: HWND) -> Self {
        Poster(hwnd.0 as isize)
    }
    /// Pour les rappels de Windows qui ne passent qu'un pointeur (`raw`).
    pub fn from_raw(v: isize) -> Self {
        Poster(v)
    }
    pub fn raw(&self) -> isize {
        self.0
    }
    pub fn post(&self, msg: u32, w: usize, l: isize) {
        unsafe {
            let _ = PostMessageW(Some(HWND(self.0 as *mut _)), msg, WPARAM(w), LPARAM(l));
        }
    }
}

fn lo(l: LPARAM) -> i32 {
    (l.0 & 0xFFFF) as i16 as i32
}

fn hi(l: LPARAM) -> i32 {
    ((l.0 >> 16) & 0xFFFF) as i16 as i32
}

unsafe extern "system" fn wndproc(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    let h = hwnd.0 as isize;
    match msg {
        WM_COPYDATA => {
            let cds = unsafe { &*(lp.0 as *const COPYDATASTRUCT) };
            if cds.dwData == COPY_MAGIC && cds.cbData == 8 && !cds.lpData.is_null() {
                let v = unsafe { std::slice::from_raw_parts(cds.lpData as *const u32, 2) };
                if let Some(c) = Command::from_code(v[0] as usize, v[1]) {
                    push(Event::Command(c));
                }
            }
            return LRESULT(1);
        }
        WM_MOUSEACTIVATE => return LRESULT(MA_NOACTIVATE as isize),
        WM_MOUSEMOVE => push(Event::Mouse { hwnd: h, x: lo(lp), y: hi(lp) }),
        WM_MOUSELEAVE => push(Event::Leave { hwnd: h }),
        WM_LBUTTONDOWN => push(Event::Down { hwnd: h, x: lo(lp), y: hi(lp) }),
        WM_LBUTTONUP => push(Event::Click { hwnd: h, x: lo(lp), y: hi(lp) }),
        WM_RBUTTONUP => push(Event::RClick { hwnd: h, x: lo(lp), y: hi(lp) }),
        WM_MOUSEWHEEL => push(Event::Wheel { hwnd: h, delta: ((wp.0 >> 16) & 0xFFFF) as i16 as i32 }),
        WM_KEYDOWN => push(Event::Key { hwnd: h, vk: wp.0 as u32 }),
        WM_CHAR => push(Event::Char { hwnd: h, ch: wp.0 as u16 }),
        WM_ACTIVATE if (wp.0 & 0xFFFF) as u32 == WA_INACTIVE => push(Event::Deactivate { hwnd: h }),
        WM_HOTKEY => push(Event::Hotkey(wp.0 as i32)),
        WM_TIMER => push(Event::Timer(wp.0)),
        WM_MEDIA => push(Event::Media),
        WM_VOLUME => push(Event::Volume { level: wp.0 as f32 / 1000.0, muted: lp.0 != 0 }),
        WM_AUDIO_DEVICE => push(Event::AudioDevice),
        WM_APPBAR => push(Event::AppBar { hwnd: h, code: wp.0 as u32 }),
        WM_NETWORK => push(Event::Network),
        WM_RADIOS => push(Event::Radios),
        WM_INDEX => push(Event::Index),
        WM_POWERBROADCAST => {
            match wp.0 as u32 {
                PBT_POWERSETTINGCHANGE => push(Event::Power),
                // sortie de veille : l'heure, la batterie et les écrans ont pu changer
                PBT_APMRESUMEAUTOMATIC | PBT_APMRESUMESUSPEND => {
                    push(Event::Power);
                    push(Event::Display);
                }
                _ => {}
            }
            return LRESULT(1);
        }
        WM_DISPLAYCHANGE | WM_DPICHANGED => push(Event::Display),
        // barre des tâches déplacée ou masquée automatiquement : la zone de travail change
        WM_SETTINGCHANGE if wp.0 == SPI_SETWORKAREA.0 as usize => push(Event::Display),
        WM_ERASEBKGND => return LRESULT(1),
        WM_CLOSE => {
            unsafe { PostQuitMessage(0) };
            return LRESULT(0);
        }
        m if m != 0 && m == TASKBAR_CREATED.with(|c| c.get()) => push(Event::TaskbarCreated),
        _ => {}
    }
    unsafe { DefWindowProcW(hwnd, msg, wp, lp) }
}

/// Rappels de Windows sur les fenêtres des autres programmes (sans rien y injecter : ils arrivent dans la boucle).
unsafe extern "system" fn on_winevent(_hook: HWINEVENTHOOK, event: u32, hwnd: HWND, obj: i32, child: i32, _thread: u32, _time: u32) {
    if event == EVENT_SYSTEM_FOREGROUND {
        push(Event::Foreground);
        return;
    }
    if obj != OBJID_WINDOW.0 || child != CHILDID_SELF as i32 || hwnd.is_invalid() {
        return;
    }
    let known = KNOWN.with(|k| k.borrow().contains(&(hwnd.0 as isize)));
    let wanted = match event {
        EVENT_OBJECT_DESTROY | EVENT_OBJECT_HIDE | EVENT_OBJECT_CLOAKED => known,
        // nouvelle fenêtre principale d'une appli (pas une bulle d'aide ni un menu)
        _ => known || crate::apps::candidate(hwnd),
    };
    if wanted {
        push(Event::Windows);
    }
}

/// Premier plan, fenêtres montrées, cachées, détruites (et celles du Store, « masquées » par Windows).
fn hook_windows() -> Vec<HWINEVENTHOOK> {
    let ranges = [
        (EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND),
        (EVENT_OBJECT_DESTROY, EVENT_OBJECT_HIDE),
        (EVENT_OBJECT_CLOAKED, EVENT_OBJECT_UNCLOAKED),
    ];
    ranges
        .iter()
        .filter_map(|&(a, b)| {
            let h = unsafe { SetWinEventHook(a, b, None, Some(on_winevent), 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS) };
            (!h.is_invalid()).then_some(h)
        })
        .collect()
}

fn register() {
    unsafe {
        let instance = GetModuleHandleW(None).unwrap_or_default();
        for class in [HOST_CLASS, WIN_CLASS] {
            let wc = WNDCLASSEXW {
                cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
                lpfnWndProc: Some(wndproc),
                hInstance: instance.into(),
                hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
                lpszClassName: class,
                ..Default::default()
            };
            RegisterClassExW(&wc);
        }
    }
}

/// Fenêtre de Rago Shell (animation, île) : pas dans la barre des tâches ni Alt+Tab, au-dessus des autres, dessinée par
/// DirectComposition. `activate` : l'animation prend le clavier (Échap), l'île jamais.
pub fn window(x: i32, y: i32, w: i32, h: i32, activate: bool) -> windows::core::Result<HWND> {
    let mut ex = WS_EX_NOREDIRECTIONBITMAP | WS_EX_TOPMOST | WS_EX_TOOLWINDOW;
    if !activate {
        ex |= WS_EX_NOACTIVATE;
    }
    unsafe {
        CreateWindowExW(ex, WIN_CLASS, w!("Rago OS"), WS_POPUP, x, y, w, h, None, None, Some(GetModuleHandleW(None)?.into()), None)
    }
}

/// Envoie la commande à la copie qui tourne (elle vient peut-être de démarrer : jusqu'à 3 s pour trouver sa fenêtre).
fn forward(c: Command) {
    let (code, arg) = c.code();
    let data = [code as u32, arg];
    for _ in 0..30 {
        if let Ok(hwnd) = unsafe { FindWindowW(HOST_CLASS, PCWSTR::null()) } {
            let cds = COPYDATASTRUCT { dwData: COPY_MAGIC, cbData: 8, lpData: data.as_ptr() as *mut _ };
            unsafe {
                SendMessageTimeoutW(hwnd, WM_COPYDATA, WPARAM(0), LPARAM(&cds as *const _ as isize), SMTO_ABORTIFHUNG, 2000, None);
            }
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
}

/// Mode économie d'énergie (EcoQoS) et priorité basse : Windows garde Rago Shell sur les cœurs économes, à basse fréquence.
fn eco() {
    unsafe {
        let state = PROCESS_POWER_THROTTLING_STATE {
            Version: PROCESS_POWER_THROTTLING_CURRENT_VERSION,
            ControlMask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED,
            StateMask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED,
        };
        let _ = SetProcessInformation(GetCurrentProcess(), ProcessPowerThrottling, &state as *const _ as *const _, std::mem::size_of::<PROCESS_POWER_THROTTLING_STATE>() as u32);
        let _ = SetPriorityClass(GetCurrentProcess(), BELOW_NORMAL_PRIORITY_CLASS);
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// Arrête TranslucentTB (même session, sans droits particuliers) et le note pour l'app, qui remet ses réglages d'avant.
fn stop_translucenttb() {
    unsafe {
        let Ok(snap) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else { return };
        let mut e = PROCESSENTRY32W { dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32, ..Default::default() };
        let mut more = Process32FirstW(snap, &mut e).is_ok();
        while more {
            let n = e.szExeFile.iter().position(|&c| c == 0).unwrap_or(e.szExeFile.len());
            if String::from_utf16_lossy(&e.szExeFile[..n]).eq_ignore_ascii_case("TranslucentTB.exe") {
                if let Ok(p) = OpenProcess(PROCESS_TERMINATE, false, e.th32ProcessID) {
                    let _ = TerminateProcess(p, 1);
                    let _ = CloseHandle(p);
                }
            }
            more = Process32NextW(snap, &mut e).is_ok();
        }
        let _ = CloseHandle(snap);
    }
    let dir = config::dir();
    let _ = std::fs::create_dir_all(&dir);
    let _ = std::fs::write(dir.join("report.json"), format!("{{\"ttbStopped\":{}}}", now_ms()));
}

struct App {
    host: HWND,
    cfg: Config,
    dev: Option<gfx::Device>,
    boot: Option<boot::Boot>,
    island: Option<island::Island>,
    desk: Option<desk::Desk>,
    media: Option<media::Media>,
    volume: Option<volume::Volume>,
    /// musique, son et rappels des fenêtres : en marche tant que l'île ou le bureau sont là
    services: bool,
    hooks: Vec<HWINEVENTHOOK>,
    explorer_starts: Vec<Instant>,
    /// lancé pour l'aperçu seulement : quitte à la fin de l'animation
    preview_only: bool,
    quit: bool,
}

impl App {
    fn device(&mut self) -> Option<&gfx::Device> {
        if self.dev.is_none() {
            self.dev = gfx::Device::new().ok();
        }
        self.dev.as_ref()
    }

    fn start_boot(&mut self, mode: boot::Mode) {
        let fr = self.cfg.fr();
        if let Some(b) = self.device().and_then(|d| boot::Boot::new(d, mode, fr).ok()) {
            if let Some(i) = self.island.as_mut() {
                i.hide_all();
            }
            if let Some(d) = self.desk.as_mut() {
                d.on_screen(true, false);
            }
            self.boot = Some(b);
        }
    }

    /// Démarre ou arrête l'île et le bureau selon les options ; quitte s'il n'y a plus rien à faire.
    fn sync(&mut self) {
        let poster = Poster::new(self.host);
        if self.cfg.island && self.island.is_none() {
            let fr = self.cfg.fr();
            let host = self.host;
            if let Some(mut i) = self.device().and_then(|d| island::Island::new(d, host, fr).ok()) {
                if self.boot.is_some() {
                    i.hide_all();
                }
                self.island = Some(i);
            }
        }
        if !self.cfg.island {
            self.island = None;
        }
        let wants_desk = self.cfg.bar || self.cfg.dock || self.cfg.search;
        if wants_desk {
            let cfg = self.cfg.clone();
            let host = self.host;
            let booting = self.boot.is_some();
            match self.desk.as_mut() {
                Some(d) => d.configure(&cfg),
                None => {
                    if let Some(mut d) = self.device().and_then(|dev| desk::Desk::new(dev, host, &cfg).ok()) {
                        if booting {
                            d.on_screen(true, false);
                        }
                        self.desk = Some(d);
                    }
                }
            }
        } else {
            // sans le Dock, la barre des tâches de Windows reste (ou redevient) comme avant
            self.desk = None;
            taskbar::restore();
        }
        let zone = self.desk.as_ref().and_then(|d| d.island_zone());
        if let Some(i) = self.island.as_mut() {
            i.set_fr(self.cfg.fr());
            i.set_bar(zone);
        }
        let services = self.island.is_some() || self.desk.is_some();
        if services && !self.services {
            self.services = true;
            self.media = media::Media::start(poster);
            self.volume = volume::Volume::start(poster);
            self.hooks = hook_windows();
            unsafe { SetTimer(Some(self.host), TIMER_SCREEN, 2000, None) };
            self.after_services();
        }
        if !services && self.services {
            self.services = false;
            self.media = None;
            self.volume = None;
            for h in self.hooks.drain(..) {
                unsafe {
                    let _ = UnhookWinEvent(h);
                }
            }
            unsafe {
                let _ = KillTimer(Some(self.host), TIMER_SCREEN);
            }
        }
        let needed = self.cfg.island || wants_desk || self.cfg.ttb_guard;
        if self.boot.is_none() && (!needed || self.preview_only) {
            self.quit = true;
        }
    }

    /// Le bureau lit le son et la musique du moment.
    fn after_services(&mut self) {
        let level = self.volume.as_ref().and_then(|v| v.get());
        let snap = self.media.as_ref().map(|m| m.peek());
        if let Some(d) = self.desk.as_mut() {
            if let Some((l, m)) = level {
                d.on_volume(l, m);
            }
            if let Some(s) = snap {
                d.on_media(s);
            }
        }
    }

    fn command(&mut self, c: Command) {
        match c {
            Command::Quit => self.quit = true,
            Command::Timer(s) => {
                if let Some(i) = self.island.as_mut() {
                    i.set_timer(s);
                }
            }
            Command::Preview => {
                self.start_boot(boot::Mode::Preview);
            }
            Command::Logon | Command::Welcome | Command::Reload => {
                self.cfg = config::load();
                self.preview_only = false;
                if c == Command::Logon && self.cfg.boot {
                    self.start_boot(boot::Mode::Logon);
                }
                if c == Command::Welcome {
                    self.start_boot(boot::Mode::Welcome);
                }
                self.sync();
            }
        }
    }

    fn on_screen(&mut self, display_changed: bool) {
        // pendant l'animation de démarrage, l'île et le bureau attendent
        let busy = self.boot.is_some() || screen::busy();
        // la barre d'abord : l'île, montrée après, reste devant elle
        if let Some(d) = self.desk.as_mut() {
            d.on_screen(busy, display_changed);
        }
        if display_changed {
            let zone = self.desk.as_ref().and_then(|d| d.island_zone());
            if let Some(i) = self.island.as_mut() {
                i.set_bar(zone);
            }
        }
        if let Some(i) = self.island.as_mut() {
            i.on_screen(busy, display_changed);
            i.raise();
        }
    }

    fn handle(&mut self, e: Event) {
        match e {
            Event::Command(c) => self.command(c),
            Event::TaskbarCreated => {
                // Explorateur qui redémarre en boucle (3 fois en 2 minutes) avec la barre transparente : on la coupe
                let now = Instant::now();
                self.explorer_starts.retain(|t| now.duration_since(*t).as_secs() < 120);
                self.explorer_starts.push(now);
                if self.cfg.ttb_guard && self.explorer_starts.len() >= 3 {
                    stop_translucenttb();
                    self.explorer_starts.clear();
                }
                if let Some(d) = self.desk.as_mut() {
                    d.on_explorer();
                }
                if let Some(i) = self.island.as_ref() {
                    i.raise();
                }
            }
            Event::Key { vk: 0x1B, .. } if self.boot.is_some() => {
                if let Some(b) = self.boot.as_mut() {
                    b.skip();
                }
            }
            Event::Click { hwnd, .. } if self.boot.as_ref().is_some_and(|b| b.owns(hwnd)) => {
                if let Some(b) = self.boot.as_mut() {
                    b.skip();
                }
            }
            Event::Media => {
                if let Some(m) = self.media.as_ref() {
                    let snap = m.snapshot();
                    if let Some(i) = self.island.as_mut() {
                        i.on_media(snap.clone(), self.boot.is_none());
                    }
                    if let Some(d) = self.desk.as_mut() {
                        d.on_media(snap);
                    }
                }
            }
            Event::Volume { level, muted } => {
                // le centre de contrôle montre déjà le niveau : l'île ne s'ouvre pas en plus
                let quiet = self.desk.as_ref().is_some_and(|d| d.shows_volume());
                if let Some(i) = self.island.as_mut() {
                    i.on_volume(level, muted, self.boot.is_none() && !quiet);
                }
                if let Some(d) = self.desk.as_mut() {
                    d.on_volume(level, muted);
                }
            }
            Event::AudioDevice => {
                self.volume = volume::Volume::start(Poster::new(self.host));
                self.after_services();
            }
            // ABN_FULLSCREENAPP : une appli plein écran s'ouvre ou se ferme
            Event::AppBar { code: 2, .. } => self.on_screen(false),
            Event::Foreground | Event::Timer(TIMER_SCREEN) | Event::Display => {
                if let (Event::Foreground, Some(d)) = (e, self.desk.as_mut()) {
                    d.on_foreground();
                }
                self.on_screen(matches!(e, Event::Display));
            }
            other => {
                let used = match self.desk.as_mut() {
                    Some(d) => d.handle(other, self.island.as_mut(), self.media.as_ref(), self.volume.as_ref()),
                    None => false,
                };
                if !used {
                    let media = self.media.as_ref();
                    if let Some(i) = self.island.as_mut() {
                        i.on_event(other, media);
                    }
                }
            }
        }
    }

    /// Carte graphique perdue pour le bureau : tout est recréé sur une nouvelle.
    fn rebuild_desk(&mut self) {
        self.desk = None;
        self.dev = None;
        self.sync();
        self.after_services();
        self.on_screen(true);
    }
}

pub fn run(first: Command) {
    unsafe {
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    }
    // une seule copie par session ; les suivantes passent leur commande et quittent
    let mutex: Option<HANDLE> = unsafe { CreateMutexW(None, BOOL(1).into(), w!("Local\\RagoShell.Instance")).ok() };
    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        forward(first);
        return;
    }
    if first == Command::Quit {
        // plus rien ne tourne : si une copie s'était mal arrêtée, la barre des tâches revient
        taskbar::restore();
        return;
    }
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
    }
    register();
    TASKBAR_CREATED.with(|c| c.set(unsafe { RegisterWindowMessageW(w!("TaskbarCreated")) }));
    let host = match unsafe {
        CreateWindowExW(WS_EX_TOOLWINDOW, HOST_CLASS, w!("Rago Shell"), WS_POPUP, 0, 0, 0, 0, None, None, Some(GetModuleHandleW(None).unwrap_or_default().into()), None)
    } {
        Ok(h) => h,
        Err(_) => return,
    };
    let mut app = App {
        host,
        cfg: config::load(),
        dev: None,
        boot: None,
        island: None,
        desk: None,
        media: None,
        volume: None,
        services: false,
        hooks: Vec::new(),
        explorer_starts: Vec::new(),
        preview_only: first == Command::Preview,
        quit: false,
    };
    if first == Command::Preview {
        app.start_boot(boot::Mode::Preview);
    } else {
        app.command(first);
    }
    if app.boot.is_none() {
        eco();
    }
    let mut msg = MSG::default();
    'outer: loop {
        let animating = app.boot.is_some() || app.island.as_ref().is_some_and(|i| i.animating()) || app.desk.as_ref().is_some_and(|d| d.animating());
        if animating {
            while unsafe { PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE) }.as_bool() {
                if msg.message == WM_QUIT {
                    break 'outer;
                }
                unsafe {
                    let _ = TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }
            }
        } else {
            if !unsafe { GetMessageW(&mut msg, None, 0, 0) }.as_bool() {
                break;
            }
            unsafe {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
        while let Some(e) = pop() {
            app.handle(e);
        }
        if let Some(b) = app.boot.as_mut() {
            let shell_ready = unsafe { FindWindowW(w!("Shell_TrayWnd"), PCWSTR::null()) }.is_ok();
            if !b.frame(shell_ready) {
                app.boot = None;
                if let Some(d) = app.dev.as_ref() {
                    d.trim();
                }
                eco();
                if app.preview_only {
                    app.quit = true;
                } else {
                    app.sync();
                }
                // l'île et le bureau reprennent leur place, sauf pendant un jeu
                app.on_screen(false);
            }
        }
        if let Some(i) = app.island.as_mut() {
            i.frame();
        }
        if let Some(d) = app.desk.as_mut() {
            if let Err(e) = d.frame() {
                if gfx::lost(&e) {
                    app.rebuild_desk();
                }
            }
        }
        if app.quit {
            break;
        }
    }
    drop(app);
    if let Some(m) = mutex {
        unsafe {
            let _ = CloseHandle(m);
        }
    }
}
