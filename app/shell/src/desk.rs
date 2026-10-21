//! Bureau de Rago OS : la barre en haut, le Dock en bas, la Recherche Rago, le centre de contrôle et les menus. Il
//! écoute Windows (fenêtres, réseau, batterie, son, musique) et ne redessine que ce qui change. Dès qu'un jeu ou une
//! appli plein écran est devant, tout se cache et le raccourci de la recherche est rendu au jeu.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use windows::core::Result;
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED};
use windows::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, TrackMouseEvent, UnregisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT, TME_LEAVE, TRACKMOUSEEVENT, VK_SPACE};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId, KillTimer, SetTimer};

use crate::apps::{self, Installed, Window};
use crate::bar::{Bar, Hit};
use crate::config::Config;
use crate::control::{self, Control, Tap};
use crate::dock::{Action, Dock};
use crate::gfx::Device;
use crate::host::{self, Event, Poster, HOTKEY_SEARCH, TIMER_CARET, TIMER_CLOCK, TIMER_LAYOUT, TIMER_WINDOWS, WM_INDEX};
use crate::island::Island;
use crate::media::{Media, Snapshot};
use crate::menu::{Anchor, Item, Menu};
use crate::screen::{self, Monitor};
use crate::search::{Act, Pick, Reply, Search};
use crate::status::{self, Battery, NetWatch, PowerWatch, Radios};
use crate::taskbar::Taskbar;
use crate::volume::Volume;
use crate::glass;

/// À qui est le menu ouvert.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Owner {
    Rago,
    App,
    Battery,
    Network,
    Clock,
    Dock(usize),
}

/// Appli Windows sans fenêtre de Rago OS qui gère les fonds d'écran : Rago Optimizer.
fn optimizer_exe() -> Option<std::path::PathBuf> {
    // Rago Shell est dans le dossier « resources » de Rago Optimizer
    let me = std::env::current_exe().ok()?;
    let exe = me.parent()?.parent()?.join("Rago Optimizer.exe");
    exe.is_file().then_some(exe)
}

pub struct Desk {
    dev: Device,
    host: HWND,
    fr: bool,
    windows11: bool,
    want_bar: bool,
    want_dock: bool,
    want_search: bool,
    island_on: bool,
    monitor: Monitor,
    bar: Option<Bar>,
    dock: Option<Dock>,
    search: Option<Search>,
    control: Option<Control>,
    menu: Option<(Menu, Owner)>,
    taskbar: Taskbar,
    index: Arc<Vec<Installed>>,
    index_at: Option<Instant>,
    indexing: bool,
    index_slot: Arc<Mutex<Option<Vec<Installed>>>>,
    names: HashMap<String, String>,
    windows: Vec<Window>,
    foreground: Option<Window>,
    _power: PowerWatch,
    _net: Option<NetWatch>,
    radios: Arc<Mutex<Radios>>,
    radios_known: bool,
    battery: Option<Battery>,
    level: f32,
    muted: bool,
    media: Snapshot,
    timer_on: bool,
    busy: bool,
    hotkey: bool,
    tracked: Vec<isize>,
}

impl Desk {
    pub fn new(dev: &Device, host: HWND, cfg: &Config) -> Result<Desk> {
        let poster = Poster::new(host);
        let mut desk = Desk {
            dev: dev.clone(),
            host,
            fr: cfg.fr(),
            windows11: glass::build() >= 22000,
            want_bar: false,
            want_dock: false,
            want_search: false,
            island_on: cfg.island,
            monitor: screen::primary(),
            bar: None,
            dock: None,
            search: None,
            control: None,
            menu: None,
            taskbar: Taskbar::default(),
            index: Arc::new(Vec::new()),
            index_at: None,
            indexing: false,
            index_slot: Arc::new(Mutex::new(None)),
            names: HashMap::new(),
            windows: Vec::new(),
            foreground: apps::foreground(),
            _power: PowerWatch::start(host),
            _net: NetWatch::start(poster),
            radios: Arc::new(Mutex::new(Radios::default())),
            radios_known: false,
            battery: status::battery(),
            level: 0.0,
            muted: false,
            media: Snapshot::default(),
            timer_on: false,
            busy: false,
            hotkey: false,
            tracked: Vec::new(),
        };
        status::radios(desk.radios.clone(), poster, None);
        desk.start_index();
        desk.windows = apps::windows();
        host::set_known(desk.windows.iter().map(|w| w.hwnd));
        desk.configure(cfg);
        desk.clock();
        Ok(desk)
    }

    /// Options changées dans l'app : la barre, le Dock et la recherche apparaissent ou s'en vont.
    pub fn configure(&mut self, cfg: &Config) {
        let fr = cfg.fr();
        let lang_changed = fr != self.fr;
        self.fr = fr;
        self.island_on = cfg.island;
        self.want_bar = cfg.bar;
        self.want_dock = cfg.dock;
        self.want_search = cfg.search;
        if lang_changed {
            self.close_popups();
            self.bar = None;
            self.dock = None;
        }
        if self.want_dock && self.dock.is_none() {
            if let Ok(mut d) = Dock::new(&self.dev, self.monitor, fr, self.windows11) {
                if !self.index.is_empty() {
                    d.on_index(&self.index);
                }
                d.update(&self.windows, &self.index, self.foreground.as_ref().map(|w| w.hwnd));
                if !self.busy {
                    d.show();
                }
                self.dock = Some(d);
                self.taskbar.hide();
            }
        }
        if !self.want_dock && self.dock.take().is_some() {
            self.taskbar.restore();
        }
        if self.want_bar && self.bar.is_none() {
            if let Ok(b) = Bar::new(&self.dev, self.monitor, fr, self.windows11) {
                self.bar = Some(b);
            }
        }
        if !self.want_bar {
            self.bar = None;
        }
        self.fill_bar();
        if let Some(b) = self.bar.as_mut() {
            if !self.busy {
                b.show();
            }
        }
        if !self.want_search {
            self.search = None;
        }
        self.sync_hotkey();
    }

    fn fill_bar(&mut self) {
        let app = self.foreground.as_ref().map(|w| self.name_of(w)).unwrap_or_default();
        let Some(b) = self.bar.as_mut() else { return };
        b.fr = self.fr;
        b.app = app;
        b.clock = status::clock(self.fr);
        b.battery = self.battery;
        b.net = status::network();
        b.level = self.level;
        b.muted = self.muted;
        b.taskbar_button = self.dock.is_some();
        b.taskbar_shown = self.taskbar.revealed();
        b.dirty = true;
    }

    /// Centre de la barre (pixels physiques), où la Dynamic Island s'ouvre ; None sans la barre.
    pub fn island_zone(&self) -> Option<RECT> {
        let b = self.bar.as_ref()?;
        let (x0, x1) = b.island_zone();
        Some(RECT { left: x0, top: b.panel.rect.top, right: x1, bottom: b.panel.rect.bottom })
    }

    fn sync_hotkey(&mut self) {
        let want = self.want_search && !self.busy;
        if want && !self.hotkey {
            unsafe {
                // Alt+Espace ; s'il est déjà pris (un autre lanceur), Ctrl+Alt+Espace
                self.hotkey = RegisterHotKey(Some(self.host), HOTKEY_SEARCH, MOD_ALT | MOD_NOREPEAT, VK_SPACE.0 as u32).is_ok()
                    || RegisterHotKey(Some(self.host), HOTKEY_SEARCH, MOD_ALT | MOD_CONTROL | MOD_NOREPEAT, VK_SPACE.0 as u32).is_ok();
            }
        }
        if !want && self.hotkey {
            unsafe {
                let _ = UnregisterHotKey(Some(self.host), HOTKEY_SEARCH);
            }
            self.hotkey = false;
        }
    }

    fn timer(&self, id: usize, ms: u32) {
        unsafe {
            SetTimer(Some(self.host), id, ms, None);
        }
    }

    fn stop_timer(&self, id: usize) {
        unsafe {
            let _ = KillTimer(Some(self.host), id);
        }
    }

    fn clock(&mut self) {
        if let Some(b) = self.bar.as_mut() {
            let c = status::clock(self.fr);
            if c != b.clock {
                b.clock = c;
                b.dirty = true;
            }
        }
        self.timer(TIMER_CLOCK, status::to_next_minute());
    }

    // ——— applis ———

    fn start_index(&mut self) {
        if self.indexing {
            return;
        }
        self.indexing = true;
        let slot = self.index_slot.clone();
        let poster = Poster::new(self.host);
        std::thread::spawn(move || {
            let hr = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
            let list = apps::installed();
            if hr.is_ok() {
                unsafe { CoUninitialize() };
            }
            if let Ok(mut s) = slot.lock() {
                *s = Some(list);
            }
            poster.post(WM_INDEX, 0, 0);
        });
    }

    fn on_index(&mut self) {
        self.indexing = false;
        let Some(list) = self.index_slot.lock().ok().and_then(|mut s| s.take()) else { return };
        self.index_at = Some(Instant::now());
        for a in &list {
            self.names.insert(a.id.to_ascii_lowercase(), a.name.clone());
            if let Some(e) = &a.exe {
                self.names.entry(e.clone()).or_insert_with(|| a.name.clone());
            }
        }
        self.index = Arc::new(list);
        if let Some(d) = self.dock.as_mut() {
            d.on_index(&self.index);
            d.update(&self.windows, &self.index, self.foreground.as_ref().map(|w| w.hwnd));
        }
        if let Some(s) = self.search.as_mut() {
            s.set_index(self.index.clone());
        }
        self.fill_bar();
    }

    fn name_of(&self, w: &Window) -> String {
        if let Some(a) = &w.key.aumid {
            if let Some(n) = self.names.get(&a.to_ascii_lowercase()) {
                return n.clone();
            }
        }
        if let Some(e) = &w.key.exe {
            if let Some(n) = self.names.get(e) {
                return n.clone();
            }
            if let Some(d) = apps::describe(e) {
                return d;
            }
        }
        w.title.clone()
    }

    fn refresh_windows(&mut self) {
        self.windows = apps::windows();
        let fg = self.foreground.as_ref().map(|w| w.hwnd);
        if let Some(d) = self.dock.as_mut() {
            d.update(&self.windows, &self.index, fg);
            host::set_known(d.shown_windows());
        } else {
            host::set_known(self.windows.iter().map(|w| w.hwnd));
        }
    }

    /// Premier plan changé : nom de l'appli dans la barre, et le Dock sait laquelle est devant.
    pub fn on_foreground(&mut self) {
        let h = unsafe { GetForegroundWindow() };
        let mut pid = 0u32;
        unsafe { GetWindowThreadProcessId(h, Some(&mut pid)) };
        if pid == std::process::id() {
            // un menu ou un panneau de Rago OS : l'appli d'avant reste
            return;
        }
        self.foreground = apps::foreground();
        if let Some(d) = self.dock.as_mut() {
            d.set_foreground(self.foreground.as_ref().map(|w| w.hwnd));
        }
        let app = self.foreground.as_ref().map(|w| self.name_of(w)).unwrap_or_default();
        if let Some(b) = self.bar.as_mut() {
            if b.app != app {
                b.app = app;
                b.dirty = true;
            }
        }
        // une nouvelle fenêtre arrive souvent au premier plan
        self.timer(TIMER_WINDOWS, 150);
        if self.dock.is_some() {
            self.taskbar.enforce();
        }
    }

    pub fn on_volume(&mut self, level: f32, muted: bool) {
        self.level = level;
        self.muted = muted;
        if let Some(b) = self.bar.as_mut() {
            b.level = level;
            b.muted = muted;
            b.dirty = true;
        }
        self.update_control();
    }

    pub fn on_media(&mut self, snap: Snapshot) {
        self.media = snap;
        self.update_control();
    }

    pub fn shows_volume(&self) -> bool {
        self.control.is_some()
    }

    fn control_state(&self) -> control::State {
        control::State {
            radios: self.radios_known.then(|| *self.radios.lock().unwrap()),
            level: self.level,
            muted: self.muted,
            media: self.media.clone(),
            island: self.island_on,
            timer_on: self.timer_on,
        }
    }

    fn update_control(&mut self) {
        let state = self.control_state();
        if let Some(c) = self.control.as_mut() {
            c.update(state);
        }
    }

    /// Explorateur redémarré : les barres d'application sont à réserver de nouveau, la barre des tâches à recacher.
    pub fn on_explorer(&mut self) {
        self.close_popups();
        self.bar = None;
        self.dock = None;
        let cfg = Config { bar: self.want_bar, dock: self.want_dock, search: self.want_search, island: self.island_on, lang: if self.fr { "fr".into() } else { "en".into() }, ..Default::default() };
        self.configure(&cfg);
    }

    /// Jeu ou appli plein écran devant (`busy`), écrans changés.
    pub fn on_screen(&mut self, busy: bool, display_changed: bool) {
        if display_changed {
            self.close_popups();
            self.relayout();
        }
        if busy != self.busy {
            self.busy = busy;
            if busy {
                self.close_popups();
                if let Some(b) = self.bar.as_mut() {
                    b.hide();
                }
                if let Some(d) = self.dock.as_mut() {
                    d.hide();
                }
            } else {
                self.fill_bar();
                if let Some(b) = self.bar.as_mut() {
                    b.show();
                }
                if let Some(d) = self.dock.as_mut() {
                    d.show();
                }
            }
            self.sync_hotkey();
        }
        if self.dock.is_some() {
            self.taskbar.enforce();
        }
    }

    fn relayout(&mut self) {
        self.monitor = screen::primary();
        let m = self.monitor;
        if let Some(b) = self.bar.as_mut() {
            let _ = b.layout(m);
        }
        if let Some(d) = self.dock.as_mut() {
            let _ = d.layout(m);
        }
    }

    // ——— menus et panneaux ———

    fn close_popups(&mut self) {
        self.menu = None;
        self.control = None;
        if self.search.take().is_some() {
            self.stop_timer(TIMER_CARET);
        }
        if let Some(b) = self.bar.as_mut() {
            if b.open.is_some() {
                b.open = None;
                b.dirty = true;
            }
        }
    }

    fn open_menu(&mut self, items: Vec<Item>, anchor: Anchor, owner: Owner, hit: Option<Hit>) {
        if let Ok(m) = Menu::open(&self.dev, items, anchor, self.windows11) {
            self.menu = Some((m, owner));
            if let Some(b) = self.bar.as_mut() {
                b.open = hit;
                b.dirty = true;
            }
        }
    }

    fn open_search(&mut self) {
        if self.busy {
            return;
        }
        self.close_popups();
        // nouvelles applis installées : la liste se relit en fond (toutes les 5 minutes au plus)
        if self.index_at.is_none_or(|t| t.elapsed().as_secs() > 300) {
            self.start_index();
        }
        if let Ok(s) = Search::open(&self.dev, self.monitor, self.index.clone(), self.fr, self.windows11) {
            self.search = Some(s);
            self.timer(TIMER_CARET, 530);
            if let Some(b) = self.bar.as_mut() {
                b.open = Some(Hit::Search);
                b.dirty = true;
            }
        }
    }

    fn open_control(&mut self, right: i32, bottom: i32, island: Option<&mut Island>, hit: Hit) {
        self.timer_on = island.as_ref().is_some_and(|i| i.timer_running());
        self.island_on = island.is_some();
        // l'état des radios peut avoir changé dans Windows
        status::radios(self.radios.clone(), Poster::new(self.host), None);
        let state = self.control_state();
        if let Ok(c) = Control::open(&self.dev, right, bottom, state, self.fr, self.windows11) {
            self.control = Some(c);
            if let Some(b) = self.bar.as_mut() {
                b.open = Some(hit);
                b.dirty = true;
            }
        }
    }

    fn rago_menu(&self) -> Vec<Item> {
        let fr = self.fr;
        let t = |a: &str, b: &str| if fr { a.to_string() } else { b.to_string() };
        vec![
            Item::new("Rago Optimizer", 10),
            Item::new(t("Applications", "Apps"), 11),
            Item::sep(),
            Item::new(t("Paramètres de Windows", "Windows Settings"), 12),
            Item::new(t("Gestionnaire des tâches", "Task Manager"), 13),
            Item::sep(),
            Item::new(t("Suspendre", "Sleep"), 20),
            Item::new(t("Redémarrer…", "Restart…"), 21).confirm(t("Redémarrer maintenant ?", "Restart now?")),
            Item::new(t("Éteindre…", "Shut Down…"), 22).confirm(t("Éteindre maintenant ?", "Shut down now?")),
            Item::sep(),
            Item::new(t("Verrouiller l'écran", "Lock Screen"), 30),
            Item::new(t("Se déconnecter…", "Sign Out…"), 31).confirm(t("Se déconnecter maintenant ?", "Sign out now?")),
        ]
    }

    fn app_menu(&self) -> Vec<Item> {
        let fr = self.fr;
        let t = |a: &str, b: &str| if fr { a.to_string() } else { b.to_string() };
        match &self.foreground {
            Some(w) => {
                let name = self.name_of(w);
                let n = self.windows.iter().filter(|o| o.key == w.key).count().max(1);
                let mut v = vec![Item::header(name.clone()), Item::new(t("Réduire", "Minimize"), 40), Item::new(t("Fermer la fenêtre", "Close Window"), 41)];
                if n > 1 {
                    v.push(Item::new(if fr { format!("Fermer les {n} fenêtres") } else { format!("Close {n} Windows") }, 42));
                }
                v.push(Item::sep());
                v.push(Item::new(t("Afficher le bureau", "Show Desktop"), 44));
                v
            }
            None => vec![
                Item::header(t("Bureau", "Desktop")),
                Item::new(t("Afficher le bureau", "Show Desktop"), 44),
                Item::new(t("Changer le fond d'écran…", "Change Wallpaper…"), 45),
                Item::sep(),
                Item::new(t("Écrans", "Displays"), 46),
                Item::new(t("Personnalisation", "Personalization"), 47),
            ],
        }
    }

    fn battery_menu(&self) -> Vec<Item> {
        let fr = self.fr;
        let t = |a: &str, b: &str| if fr { a.to_string() } else { b.to_string() };
        let head = match self.battery {
            Some(b) if fr => format!("Batterie : {}\u{202F}%{}", b.percent, if b.charging { ", en charge" } else { "" }),
            Some(b) => format!("Battery: {}%{}", b.percent, if b.charging { ", charging" } else { "" }),
            None => t("Batterie", "Battery"),
        };
        vec![Item::header(head), Item::new(t("Économiseur d'énergie", "Energy Saver"), 51), Item::new(t("Alimentation et batterie", "Power & Battery"), 50)]
    }

    fn network_menu(&self) -> Vec<Item> {
        let fr = self.fr;
        let t = |a: &str, b: &str| if fr { a.to_string() } else { b.to_string() };
        let head = match status::network() {
            status::Net::Wifi => t("Wi‑Fi connecté", "Wi‑Fi connected"),
            status::Net::Wired => t("Ethernet connecté", "Ethernet connected"),
            status::Net::Offline => t("Hors ligne", "Offline"),
        };
        let mut v = vec![Item::header(head)];
        let radios = *self.radios.lock().unwrap();
        if let Some(on) = radios.wifi {
            v.push(Item::new("Wi‑Fi", 60).checked(on));
        }
        v.push(Item::new(t("Réseaux Wi‑Fi…", "Wi‑Fi Networks…"), 61));
        v.push(Item::sep());
        v.push(Item::new(t("Paramètres réseau", "Network Settings"), 62));
        v
    }

    fn clock_menu(&self, island: bool, timer_on: bool) -> Vec<Item> {
        let fr = self.fr;
        let t = |a: &str, b: &str| if fr { a.to_string() } else { b.to_string() };
        let mut v = vec![Item::header(status::long_date(fr))];
        if island {
            for m in [5u32, 10, 25] {
                v.push(Item::new(if fr { format!("Minuteur {m} min") } else { format!("{m} min timer") }, 70 + m));
            }
            if timer_on {
                v.push(Item::new(t("Arrêter le minuteur", "Stop Timer"), 69));
            }
            v.push(Item::sep());
        }
        v.push(Item::new(t("Calendrier et notifications", "Calendar & Notifications"), 66));
        v.push(Item::new(t("Date et heure", "Date & Time"), 67));
        v
    }

    fn open_optimizer(&self) {
        if let Some(a) = self.index.iter().find(|a| a.folded == "rago optimizer") {
            apps::launch(&a.id);
        } else if let Some(exe) = optimizer_exe() {
            apps::open(&exe.to_string_lossy());
        }
    }

    fn act(&mut self, a: Act) {
        match a {
            Act::Lock => status::lock(),
            Act::Sleep => status::sleep(),
            Act::Restart => status::power_off(true),
            Act::PowerOff => status::power_off(false),
            Act::SignOut => status::sign_out(),
            Act::Desktop => status::win_key(b'D' as u16),
            Act::Capture => apps::open("ms-screenclip:"),
            Act::EmptyTrash => unsafe {
                use windows::Win32::UI::Shell::{SHEmptyRecycleBinW, SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI};
                let _ = SHEmptyRecycleBinW(None, windows::core::PCWSTR::null(), SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI);
            },
            Act::TaskManager => apps::open("taskmgr.exe"),
            Act::Optimizer => self.open_optimizer(),
            Act::Notifications => status::win_key(b'N' as u16),
        }
    }

    fn on_menu(&mut self, owner: Owner, id: u32, island: Option<&mut Island>) {
        if let Owner::Dock(i) = owner {
            if let Some(d) = self.dock.as_mut() {
                d.on_menu(i, id);
            }
            self.timer(TIMER_WINDOWS, 300);
            return;
        }
        match id {
            10 => self.open_optimizer(),
            11 => self.open_search(),
            12 => apps::open("ms-settings:"),
            13 => apps::open("taskmgr.exe"),
            20 => status::sleep(),
            21 => status::power_off(true),
            22 => status::power_off(false),
            30 => status::lock(),
            31 => status::sign_out(),
            40 => {
                if let Some(w) = &self.foreground {
                    apps::minimize(w.hwnd);
                }
            }
            41 => {
                if let Some(w) = &self.foreground {
                    apps::close(w.hwnd);
                }
            }
            42 => {
                if let Some(fg) = &self.foreground {
                    for w in self.windows.iter().filter(|w| w.key == fg.key) {
                        apps::close(w.hwnd);
                    }
                }
            }
            44 => status::win_key(b'D' as u16),
            45 => self.open_optimizer(),
            46 => apps::open("ms-settings:display"),
            47 => apps::open("ms-settings:personalization"),
            50 => apps::open("ms-settings:powersleep"),
            51 => apps::open("ms-settings:batterysaver"),
            60 => {
                let on = self.radios.lock().unwrap().wifi.unwrap_or(false);
                status::radios(self.radios.clone(), Poster::new(self.host), Some((false, !on)));
            }
            61 => apps::open("ms-availablenetworks:"),
            62 => apps::open("ms-settings:network"),
            66 => status::win_key(b'N' as u16),
            67 => apps::open("ms-settings:dateandtime"),
            69 => {
                if let Some(i) = island {
                    i.set_timer(0);
                }
            }
            m if (71..=95).contains(&m) => {
                if let Some(i) = island {
                    i.set_timer((m - 70) * 60);
                }
            }
            _ => {}
        }
    }

    fn on_bar_click(&mut self, x: i32, y: i32, island: Option<&mut Island>) {
        let Some(bar) = self.bar.as_ref() else { return };
        let Some((hit, left, right, bottom)) = bar.on_click(x, y) else {
            // centre de la barre : la Dynamic Island
            let in_zone = self.island_zone().is_some_and(|z| {
                let sx = bar.panel.rect.left + x;
                sx >= z.left && sx < z.right
            });
            self.close_popups();
            if in_zone {
                if let Some(i) = island {
                    i.open();
                }
            }
            return;
        };
        let same = bar.open == Some(hit);
        self.close_popups();
        if same {
            return;
        }
        let below = Anchor::Below { x: left, y: bottom };
        match hit {
            Hit::Rago => self.open_menu(self.rago_menu(), below, Owner::Rago, Some(hit)),
            Hit::App => self.open_menu(self.app_menu(), below, Owner::App, Some(hit)),
            Hit::Battery => self.open_menu(self.battery_menu(), below, Owner::Battery, Some(hit)),
            Hit::Network => self.open_menu(self.network_menu(), below, Owner::Network, Some(hit)),
            Hit::Clock => {
                let (on, running) = (island.is_some(), island.as_ref().is_some_and(|i| i.timer_running()));
                let items = self.clock_menu(on, running);
                self.open_menu(items, below, Owner::Clock, Some(hit));
            }
            Hit::Volume | Hit::Control => self.open_control(right, bottom, island, hit),
            Hit::Search => self.open_search(),
            Hit::Taskbar => {
                self.taskbar.toggle_reveal();
                if let Some(b) = self.bar.as_mut() {
                    b.taskbar_shown = self.taskbar.revealed();
                    b.dirty = true;
                }
            }
        }
    }

    fn on_pick(&mut self, pick: Pick, island: Option<&mut Island>) {
        self.close_popups();
        match pick {
            Pick::Launch(id) => apps::launch(&id),
            Pick::Open(t) => apps::open(&t),
            Pick::Act(a) => self.act(a),
            Pick::Copy(v) => status::copy(self.host, &v),
            Pick::Timer(s) => {
                if let Some(i) = island {
                    i.set_timer(s);
                }
            }
        }
    }

    fn on_tap(&mut self, tap: Tap, island: Option<&mut Island>, media: Option<&Media>, volume: Option<&Volume>) {
        match tap {
            Tap::Wifi(on) => status::radios(self.radios.clone(), Poster::new(self.host), Some((false, on))),
            Tap::Bluetooth(on) => status::radios(self.radios.clone(), Poster::new(self.host), Some((true, on))),
            Tap::Capture => {
                self.close_popups();
                apps::open("ms-screenclip:");
            }
            Tap::Desktop => {
                self.close_popups();
                status::win_key(b'D' as u16);
            }
            Tap::Lock => {
                self.close_popups();
                status::lock();
            }
            Tap::Settings => {
                self.close_popups();
                apps::open("ms-settings:");
            }
            Tap::Volume(l) => {
                if let Some(v) = volume {
                    v.set_level(l);
                }
            }
            Tap::Mute(m) => {
                if let Some(v) = volume {
                    v.set_mute(m);
                }
            }
            Tap::Timer(s) => {
                if let Some(i) = island {
                    i.set_timer(s);
                    self.timer_on = s > 0;
                }
                self.update_control();
            }
            Tap::Previous => {
                if let Some(m) = media {
                    m.previous();
                }
            }
            Tap::Toggle => {
                if let Some(m) = media {
                    m.toggle();
                }
            }
            Tap::Next => {
                if let Some(m) = media {
                    m.next();
                }
            }
            Tap::Close => self.close_popups(),
        }
    }

    fn track(&mut self, hwnd: isize) {
        if self.tracked.contains(&hwnd) {
            return;
        }
        let mut t = TRACKMOUSEEVENT { cbSize: std::mem::size_of::<TRACKMOUSEEVENT>() as u32, dwFlags: TME_LEAVE, hwndTrack: HWND(hwnd as *mut _), dwHoverTime: 0 };
        if unsafe { TrackMouseEvent(&mut t) }.is_ok() {
            self.tracked.push(hwnd);
        }
    }

    fn is_bar(&self, h: isize) -> bool {
        self.bar.as_ref().is_some_and(|b| b.panel.owns(h))
    }
    fn is_dock(&self, h: isize) -> bool {
        self.dock.as_ref().is_some_and(|d| d.panel.owns(h))
    }
    fn is_menu(&self, h: isize) -> bool {
        self.menu.as_ref().is_some_and(|(m, _)| m.panel.owns(h))
    }
    fn is_search(&self, h: isize) -> bool {
        self.search.as_ref().is_some_and(|s| s.panel.owns(h))
    }
    fn is_control(&self, h: isize) -> bool {
        self.control.as_ref().is_some_and(|c| c.panel.owns(h))
    }

    /// Événement pour le bureau ; faux s'il est pour quelqu'un d'autre (l'île).
    pub fn handle(&mut self, e: Event, mut island: Option<&mut Island>, media: Option<&Media>, volume: Option<&Volume>) -> bool {
        match e {
            Event::Windows => self.timer(TIMER_WINDOWS, 150),
            Event::Timer(TIMER_WINDOWS) => {
                self.stop_timer(TIMER_WINDOWS);
                self.refresh_windows();
            }
            Event::Timer(TIMER_CLOCK) => self.clock(),
            Event::Timer(TIMER_CARET) => {
                if let Some(s) = self.search.as_mut() {
                    s.blink();
                }
            }
            Event::Timer(TIMER_LAYOUT) => {
                self.stop_timer(TIMER_LAYOUT);
                self.relayout();
            }
            Event::Hotkey(HOTKEY_SEARCH) => {
                if self.search.is_some() {
                    self.close_popups();
                } else {
                    self.open_search();
                }
            }
            Event::Power => {
                self.battery = status::battery();
                if let Some(b) = self.bar.as_mut() {
                    b.battery = self.battery;
                    b.dirty = true;
                }
            }
            Event::Network => {
                let n = status::network();
                if let Some(b) = self.bar.as_mut() {
                    if b.net != n {
                        b.net = n;
                        b.dirty = true;
                    }
                }
            }
            Event::Radios => {
                self.radios_known = true;
                self.update_control();
            }
            Event::Index => self.on_index(),
            // ABN_POSCHANGED : une autre barre ou la barre des tâches a bougé
            Event::AppBar { hwnd, code: 1 } if self.is_bar(hwnd) || self.is_dock(hwnd) => self.timer(TIMER_LAYOUT, 120),
            Event::Mouse { hwnd, x, y } => {
                if self.is_bar(hwnd) {
                    self.track(hwnd);
                    let zone = self.bar.as_mut().is_some_and(|b| b.on_mouse(x, y));
                    if let Some(i) = island.as_mut() {
                        i.bar_hover(zone && self.menu.is_none() && self.control.is_none());
                    }
                } else if self.is_dock(hwnd) {
                    self.track(hwnd);
                    if let Some(d) = self.dock.as_mut() {
                        d.on_mouse(x, y);
                    }
                } else if self.is_menu(hwnd) {
                    self.track(hwnd);
                    if let Some((m, _)) = self.menu.as_mut() {
                        m.on_mouse(x, y);
                    }
                } else if self.is_control(hwnd) {
                    self.track(hwnd);
                    let tap = self.control.as_mut().and_then(|c| c.on_mouse(x, y));
                    if let Some(t) = tap {
                        self.on_tap(t, island, media, volume);
                    }
                } else if self.is_search(hwnd) {
                    if let Some(s) = self.search.as_mut() {
                        s.on_mouse(x, y);
                    }
                } else {
                    return false;
                }
            }
            Event::Leave { hwnd } => {
                self.tracked.retain(|h| *h != hwnd);
                if self.is_bar(hwnd) {
                    if let Some(b) = self.bar.as_mut() {
                        b.on_leave();
                    }
                    if let Some(i) = island.as_mut() {
                        i.bar_hover(false);
                    }
                } else if self.is_dock(hwnd) {
                    if let Some(d) = self.dock.as_mut() {
                        d.on_leave();
                    }
                } else if self.is_menu(hwnd) {
                    if let Some((m, _)) = self.menu.as_mut() {
                        m.on_leave();
                    }
                } else if self.is_control(hwnd) {
                    if let Some(c) = self.control.as_mut() {
                        c.on_leave();
                    }
                } else {
                    return false;
                }
            }
            Event::Down { hwnd, x, y } => {
                if self.is_control(hwnd) {
                    let tap = self.control.as_mut().and_then(|c| c.on_down(x, y));
                    if let Some(t) = tap {
                        self.on_tap(t, island, media, volume);
                    }
                } else {
                    return self.is_bar(hwnd) || self.is_dock(hwnd) || self.is_menu(hwnd) || self.is_search(hwnd);
                }
            }
            Event::Click { hwnd, x, y } => {
                if self.is_bar(hwnd) {
                    self.on_bar_click(x, y, island);
                } else if self.is_dock(hwnd) {
                    self.close_popups();
                    let action = self.dock.as_mut().and_then(|d| d.on_click(x, y));
                    match action {
                        Some(Action::Apps) => self.open_search(),
                        Some(Action::Open(t)) => apps::open(&t),
                        _ => {}
                    }
                } else if self.is_menu(hwnd) {
                    let chosen = self.menu.as_mut().and_then(|(m, owner)| m.on_click(x, y).map(|id| (*owner, id)));
                    if let Some((owner, id)) = chosen {
                        self.close_popups();
                        self.on_menu(owner, id, island);
                    }
                } else if self.is_search(hwnd) {
                    let reply = self.search.as_mut().map(|s| s.on_click(x, y));
                    self.on_reply(reply, island);
                } else if self.is_control(hwnd) {
                    let tap = self.control.as_mut().and_then(|c| c.on_click(x, y));
                    if let Some(t) = tap {
                        self.on_tap(t, island, media, volume);
                    }
                } else {
                    return false;
                }
            }
            Event::RClick { hwnd, x, y } => {
                if !self.is_dock(hwnd) {
                    return self.is_bar(hwnd) || self.is_menu(hwnd) || self.is_search(hwnd) || self.is_control(hwnd);
                }
                self.close_popups();
                // titres des fenêtres à jour pour le menu
                self.refresh_windows();
                let Some(d) = self.dock.as_mut() else { return true };
                if let Some(Action::Menu(i)) = d.on_rclick(x, y) {
                    let (cx, top) = d.anchor(i);
                    let items = d.menu_for(i);
                    self.open_menu(items, Anchor::Above { cx, y: top }, Owner::Dock(i), None);
                }
            }
            Event::Wheel { hwnd, delta } => {
                if self.search.is_some() && (self.is_search(hwnd) || !self.is_control(hwnd)) {
                    if let Some(s) = self.search.as_mut() {
                        s.on_wheel(delta);
                    }
                } else if self.control.is_some() {
                    let tap = self.control.as_mut().and_then(|c| c.on_wheel(delta));
                    if let Some(t) = tap {
                        self.on_tap(t, island, media, volume);
                    }
                } else {
                    return self.is_bar(hwnd) || self.is_dock(hwnd) || self.is_menu(hwnd);
                }
            }
            Event::Key { hwnd, vk } => {
                if self.is_menu(hwnd) {
                    if vk == 0x1B {
                        self.close_popups();
                        return true;
                    }
                    let chosen = self.menu.as_mut().and_then(|(m, owner)| m.on_key(vk).map(|id| (*owner, id)));
                    if let Some((owner, id)) = chosen {
                        self.close_popups();
                        self.on_menu(owner, id, island);
                    }
                } else if self.is_search(hwnd) {
                    let reply = self.search.as_mut().map(|s| s.on_key(vk));
                    self.on_reply(reply, island);
                } else if self.is_control(hwnd) {
                    let tap = self.control.as_mut().and_then(|c| c.on_key(vk));
                    if let Some(t) = tap {
                        self.on_tap(t, island, media, volume);
                    }
                } else {
                    return false;
                }
            }
            Event::Char { hwnd, ch } => {
                if !self.is_search(hwnd) {
                    return false;
                }
                if let Some(s) = self.search.as_mut() {
                    s.on_char(ch);
                }
            }
            // clic ailleurs : le menu ou le panneau se ferme (sauf pour un clic sur la barre, traité au clic)
            Event::Deactivate { hwnd } if self.is_menu(hwnd) || self.is_search(hwnd) || self.is_control(hwnd) => {
                if !self.cursor_on_bar() {
                    self.close_popups();
                }
            }
            _ => return false,
        }
        true
    }

    /// Le clic qui vient de retirer le clavier au panneau est sur la barre : c'est elle qui décide (fermer ou changer).
    fn cursor_on_bar(&self) -> bool {
        self.bar.as_ref().is_some_and(|b| b.panel.cursor().is_some())
    }

    fn on_reply(&mut self, reply: Option<Reply>, island: Option<&mut Island>) {
        match reply {
            Some(Reply::Close) => self.close_popups(),
            Some(Reply::Pick(p)) => self.on_pick(p, island),
            _ => {}
        }
    }

    pub fn animating(&self) -> bool {
        self.dock.as_ref().is_some_and(|d| d.animating())
    }

    pub fn frame(&mut self) -> Result<()> {
        if let Some(b) = self.bar.as_mut() {
            b.frame()?;
        }
        if let Some(d) = self.dock.as_mut() {
            d.frame()?;
        }
        if let Some((m, _)) = self.menu.as_mut() {
            m.frame()?;
        }
        if let Some(s) = self.search.as_mut() {
            s.frame()?;
        }
        if let Some(c) = self.control.as_mut() {
            c.frame()?;
        }
        Ok(())
    }
}

impl Drop for Desk {
    fn drop(&mut self) {
        for id in [TIMER_CLOCK, TIMER_WINDOWS, TIMER_CARET, TIMER_LAYOUT] {
            self.stop_timer(id);
        }
        if self.hotkey {
            unsafe {
                let _ = UnregisterHotKey(Some(self.host), HOTKEY_SEARCH);
            }
        }
        self.close_popups();
        self.bar = None;
        if self.dock.take().is_some() {
            self.taskbar.restore();
        }
    }
}
