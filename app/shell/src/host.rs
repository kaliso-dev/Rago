//! Boucle de Rago Shell : une seule copie par session, une fenêtre cachée qui reçoit les commandes de l'app et les
//! événements de Windows. Les fenêtres ne font que noter leurs événements ; ils sont traités ici, hors de la procédure
//! de fenêtre. Sans animation en cours, la boucle dort dans GetMessage : zéro image dessinée, zéro réveil inutile.

use std::cell::RefCell;
use std::collections::VecDeque;
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
use crate::{boot, gfx, island, media, screen, volume};

pub const HOST_CLASS: PCWSTR = w!("RagoShell.Host");
pub const WIN_CLASS: PCWSTR = w!("RagoShell.Window");
/// marque des messages WM_COPYDATA de Rago Shell
const COPY_MAGIC: usize = 0x5241_474F;

/// (dans Win32::UI::Controls, que Rago Shell n'utilise pas par ailleurs)
const WM_MOUSELEAVE: u32 = 0x02A3;

pub const WM_MEDIA: u32 = WM_APP + 1;
pub const WM_VOLUME: u32 = WM_APP + 2;
pub const WM_AUDIO_DEVICE: u32 = WM_APP + 3;

pub const TIMER_SCREEN: usize = 1;
pub const TIMER_TICK: usize = 2;
pub const TIMER_HIDE: usize = 3;
pub const TIMER_PEEK: usize = 4;

#[derive(Debug, Clone, Copy)]
pub enum Event {
    Command(Command),
    TaskbarCreated,
    Foreground,
    Timer(usize),
    Mouse { hwnd: isize, x: i32, y: i32 },
    Leave { hwnd: isize },
    Click { hwnd: isize, x: i32, y: i32 },
    Key(u32),
    Media,
    Volume { level: f32, muted: bool },
    AudioDevice,
    Display,
}

thread_local! {
    static EVENTS: RefCell<VecDeque<Event>> = const { RefCell::new(VecDeque::new()) };
    static TASKBAR_CREATED: std::cell::Cell<u32> = const { std::cell::Cell::new(0) };
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
        WM_LBUTTONUP => push(Event::Click { hwnd: h, x: lo(lp), y: hi(lp) }),
        WM_KEYDOWN => push(Event::Key(wp.0 as u32)),
        WM_TIMER => push(Event::Timer(wp.0)),
        WM_MEDIA => push(Event::Media),
        WM_VOLUME => push(Event::Volume { level: wp.0 as f32 / 1000.0, muted: lp.0 != 0 }),
        WM_AUDIO_DEVICE => push(Event::AudioDevice),
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

unsafe extern "system" fn on_foreground(_hook: HWINEVENTHOOK, _event: u32, _hwnd: HWND, _obj: i32, _child: i32, _thread: u32, _time: u32) {
    push(Event::Foreground);
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
    media: Option<media::Media>,
    volume: Option<volume::Volume>,
    hook: Option<HWINEVENTHOOK>,
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
            self.boot = Some(b);
        }
    }

    /// Démarre ou arrête l'île selon les options ; quitte s'il n'y a plus rien à faire.
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
                self.media = media::Media::start(poster);
                self.volume = volume::Volume::start(poster);
                self.hook = unsafe {
                    let h = SetWinEventHook(EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND, None, Some(on_foreground), 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS);
                    (!h.is_invalid()).then_some(h)
                };
                unsafe { SetTimer(Some(self.host), TIMER_SCREEN, 2000, None) };
            }
        }
        if !self.cfg.island && self.island.is_some() {
            self.island = None;
            self.media = None;
            self.volume = None;
            if let Some(h) = self.hook.take() {
                unsafe {
                    let _ = UnhookWinEvent(h);
                }
            }
            unsafe {
                let _ = KillTimer(Some(self.host), TIMER_SCREEN);
            }
        }
        if let Some(i) = self.island.as_mut() {
            i.set_fr(self.cfg.fr());
        }
        let needed = self.cfg.island || self.cfg.ttb_guard;
        if self.boot.is_none() && (!needed || self.preview_only) {
            self.quit = true;
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
            }
            Event::Key(0x1B) => {
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
                if let (Some(i), Some(m)) = (self.island.as_mut(), self.media.as_ref()) {
                    i.on_media(m.snapshot(), self.boot.is_none());
                }
            }
            Event::Volume { level, muted } => {
                if let Some(i) = self.island.as_mut() {
                    i.on_volume(level, muted, self.boot.is_none());
                }
            }
            Event::AudioDevice => {
                self.volume = volume::Volume::start(Poster::new(self.host));
            }
            Event::Foreground | Event::Timer(TIMER_SCREEN) | Event::Display => {
                // pendant l'animation de démarrage, l'île attend
                let busy = self.boot.is_some() || screen::busy();
                if let Some(i) = self.island.as_mut() {
                    i.on_screen(busy, matches!(e, Event::Display));
                }
            }
            other => {
                let media = self.media.as_ref();
                if let Some(i) = self.island.as_mut() {
                    i.on_event(other, media);
                }
            }
        }
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
        media: None,
        volume: None,
        hook: None,
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
        let animating = app.boot.is_some() || app.island.as_ref().is_some_and(|i| i.animating());
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
                // l'île reprend sa place, sauf pendant un jeu
                let busy = screen::busy();
                if let Some(i) = app.island.as_mut() {
                    i.on_screen(busy, false);
                }
                if app.preview_only {
                    app.quit = true;
                } else {
                    app.sync();
                }
            }
        }
        if let Some(i) = app.island.as_mut() {
            i.frame();
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
