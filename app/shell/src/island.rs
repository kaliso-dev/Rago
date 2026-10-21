//! Dynamic Island de Rago OS : une pastille noire en haut de l'écran, cachée au repos. Elle s'ouvre un instant quand la
//! musique change ou que le volume bouge, garde le minuteur sous les yeux, et s'agrandit au survol (pochette et
//! lecture, ou heure et minuteurs). Cachée dès qu'un jeu ou une appli plein écran est devant. Elle ne dessine que
//! pendant ses animations ; le reste du temps, elle n'existe pas pour le GPU.

use std::sync::Arc;
use std::time::{Duration, Instant};

use windows::core::{w, Result, HRESULT, PCWSTR};
use windows::Win32::Foundation::{COLORREF, D2DERR_RECREATE_TARGET, HWND, POINT, RECT};
use windows::Win32::Globalization::{GetTimeFormatEx, TIME_NOSECONDS};
use windows::Win32::Graphics::Direct2D::Common::*;
use windows::Win32::Graphics::Direct2D::*;
use windows::Win32::Graphics::DirectWrite::*;
use windows::Win32::Graphics::Dxgi::{DXGI_ERROR_DEVICE_REMOVED, DXGI_ERROR_DEVICE_RESET};
use windows::Win32::Graphics::Gdi::{CreateRectRgn, SetWindowRgn};
use windows::Win32::Graphics::Imaging::*;
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER};
use windows::Win32::System::Diagnostics::Debug::MessageBeep;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::SystemInformation::GetLocalTime;
use windows::Win32::UI::Input::KeyboardAndMouse::{TrackMouseEvent, TME_LEAVE, TRACKMOUSEEVENT};
use windows::Win32::UI::Shell::SHCreateMemStream;
use windows::Win32::UI::WindowsAndMessaging::*;
use windows_numerics::{Matrix3x2, Vector2};

use crate::gfx::{self, ease_out, rect, span, Device, Surface};
use crate::host::{self, Event, TIMER_HIDE, TIMER_PEEK, TIMER_TICK};
use crate::media::{Media, Snapshot};
use crate::screen;

/// survol de la zone en haut de l'écran : l'île s'ouvre si la souris y reste un instant
const TIMER_DWELL: usize = 5;

/// Fenêtre de l'île, en pixels logiques : la pastille est centrée en haut, avec la place de son ombre autour.
const TOP: f32 = 8.0;
const SIDE: f32 = 14.0;
const MAX_W: f32 = 420.0;
const MAX_H: f32 = 92.0;
const CW: f32 = MAX_W + 2.0 * SIDE;
const CH: f32 = TOP + MAX_H + SIDE;
/// la fenêtre ne prend la souris que sur la pastille et son ombre
const PAD: f32 = 8.0;
const HOT_W: f32 = 180.0;

/// Durées : animations en secondes, affichages en millisecondes.
const MORPH: f32 = 0.42;
const CLOSE: f32 = 0.24;
const FADE: (f32, f32) = (0.08, 0.28);
const PEEK_MEDIA: u32 = 3200;
const PEEK_VOLUME: u32 = 1600;
const PEEK_DONE: u32 = 6000;
const LINGER: u32 = 650;
const DWELL: u32 = 180;
const DWELL_BAR: u32 = 320;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum View {
    Hidden,
    /// minuteur en cours
    Mini,
    /// nouveau morceau, lecture ou pause
    Media,
    Volume,
    /// minuteur terminé
    Done,
    /// grande au survol
    Open,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Action {
    Previous,
    Toggle,
    Next,
    Timer(u32),
    Stop,
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct Geo {
    w: f32,
    h: f32,
    a: f32,
}

const GONE: Geo = Geo { w: 110.0, h: 28.0, a: 0.0 };

/// Ressort léger : la pastille dépasse un peu sa taille puis se pose (0 → 1).
fn spring(p: f32) -> f32 {
    if p >= 1.0 {
        1.0
    } else {
        1.0 - (-7.0 * p).exp() * (9.0 * p).cos()
    }
}

struct Anim {
    from: Geo,
    to: Geo,
    start: Instant,
    dur: f32,
}

impl Anim {
    fn elapsed(&self) -> f32 {
        self.start.elapsed().as_secs_f32()
    }

    fn running(&self) -> bool {
        self.elapsed() < self.dur
    }

    fn now(&self) -> Geo {
        let t = span(self.elapsed(), 0.0, self.dur);
        let k = if self.to.a > self.from.a || self.to.a >= 1.0 { spring(t) } else { ease_out(t) };
        let ka = ease_out(span(self.elapsed(), 0.0, self.dur * 0.6));
        Geo {
            w: (self.from.w + (self.to.w - self.from.w) * k).max(1.0),
            h: (self.from.h + (self.to.h - self.from.h) * k).max(1.0),
            a: (self.from.a + (self.to.a - self.from.a) * ka).clamp(0.0, 1.0),
        }
    }
}

/// Pastille de taille `w` × `h`, posée en haut au centre de la fenêtre.
fn pill(w: f32, h: f32) -> D2D_RECT_F {
    rect(CW / 2.0 - w / 2.0, TOP, w, h)
}

fn inside(r: &D2D_RECT_F, x: f32, y: f32) -> bool {
    x >= r.left && x < r.right && y >= r.top && y < r.bottom
}

fn circle(cx: f32, cy: f32, r: f32) -> D2D_RECT_F {
    D2D_RECT_F { left: cx - r, top: cy - r, right: cx + r, bottom: cy + r }
}

fn lost(e: &windows::core::Error) -> bool {
    let c: HRESULT = e.code();
    c == DXGI_ERROR_DEVICE_REMOVED || c == DXGI_ERROR_DEVICE_RESET || c == D2DERR_RECREATE_TARGET
}

fn countdown(secs: u64) -> String {
    let (h, m, s) = (secs / 3600, secs / 60 % 60, secs % 60);
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m}:{s:02}")
    }
}

/// Heure au format de Windows (comme l'horloge de la barre des tâches) et date dans la langue de l'app.
fn clock(fr: bool) -> (String, String) {
    let t = unsafe { GetLocalTime() };
    let mut buf = [0u16; 32];
    let n = unsafe { GetTimeFormatEx(PCWSTR::null(), TIME_NOSECONDS, Some(&t), PCWSTR::null(), Some(&mut buf)) };
    let time = if n > 1 { String::from_utf16_lossy(&buf[..n as usize - 1]) } else { format!("{}:{:02}", t.wHour, t.wMinute) };
    let (dow, day, month) = (t.wDayOfWeek as usize % 7, t.wDay, (t.wMonth as usize).clamp(1, 12) - 1);
    let date = if fr {
        const D: [&str; 7] = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
        const M: [&str; 12] = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
        format!("{} {} {}", D[dow], day, M[month])
    } else {
        const D: [&str; 7] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const M: [&str; 12] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        format!("{}, {} {}", D[dow], M[month], day)
    };
    (time, date)
}

struct Fonts {
    title: IDWriteTextFormat,
    title_big: IDWriteTextFormat,
    sub: IDWriteTextFormat,
    small: IDWriteTextFormat,
    clock: IDWriteTextFormat,
    center: IDWriteTextFormat,
    chip: IDWriteTextFormat,
    right: IDWriteTextFormat,
}

impl Fonts {
    fn new(dev: &Device) -> Result<Fonts> {
        let semi = DWRITE_FONT_WEIGHT_SEMI_BOLD;
        let aligned = |size: f32, weight, align| -> Result<IDWriteTextFormat> {
            let f = dev.text_format(size, weight)?;
            unsafe { f.SetTextAlignment(align)? };
            Ok(f)
        };
        Ok(Fonts {
            title: dev.text_format(13.0, semi)?,
            title_big: dev.text_format(14.5, semi)?,
            sub: dev.text_format(12.0, DWRITE_FONT_WEIGHT_NORMAL)?,
            small: dev.text_format(11.5, semi)?,
            clock: dev.text_format(27.0, semi)?,
            center: aligned(13.0, semi, DWRITE_TEXT_ALIGNMENT_CENTER)?,
            chip: aligned(12.0, semi, DWRITE_TEXT_ALIGNMENT_CENTER)?,
            right: aligned(12.5, semi, DWRITE_TEXT_ALIGNMENT_TRAILING)?,
        })
    }
}

struct Win {
    hwnd: HWND,
    surface: Surface,
    scale: f32,
    left: i32,
    top: i32,
}

pub struct Island {
    dev: Device,
    host: HWND,
    fr: bool,
    win: Option<Win>,
    /// zone de survol de 2 pixels en haut de l'écran (fenêtre presque transparente)
    hot: HWND,
    hot_rect: RECT,
    hot_on: bool,
    /// la barre de Rago OS est là : l'île sort de son centre, qui remplace la zone de survol
    bar: Option<RECT>,
    fonts: Fonts,
    wic: Option<IWICImagingFactory>,
    media: Snapshot,
    art: Option<ID2D1Bitmap1>,
    level: f32,
    muted: bool,
    timer_end: Option<Instant>,
    view: View,
    /// vue dont le contenu est dessiné : la dernière visible pendant la fermeture
    content: View,
    since: Instant,
    anim: Anim,
    hovered: bool,
    hover: Option<(f32, f32)>,
    hot_tracked: bool,
    dwell: bool,
    busy: bool,
    shown: bool,
    settled: bool,
    dirty: bool,
}

impl Island {
    pub fn new(dev: &Device, host: HWND, fr: bool) -> Result<Island> {
        let hot = unsafe {
            let hwnd = CreateWindowExW(
                WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
                host::WIN_CLASS,
                w!(""),
                WS_POPUP,
                0,
                0,
                1,
                1,
                None,
                None,
                Some(GetModuleHandleW(None)?.into()),
                None,
            )?;
            // transparente à 1/255 : invisible, mais la souris la voit
            SetLayeredWindowAttributes(hwnd, COLORREF(0), 1, LWA_ALPHA)?;
            hwnd
        };
        let wic: Option<IWICImagingFactory> = unsafe { CoCreateInstance(&CLSID_WICImagingFactory, None, CLSCTX_INPROC_SERVER).ok() };
        let mut island = Island {
            dev: dev.clone(),
            host,
            fr,
            win: None,
            hot,
            hot_rect: RECT::default(),
            hot_on: false,
            bar: None,
            fonts: Fonts::new(dev)?,
            wic,
            media: Snapshot::default(),
            art: None,
            level: 0.0,
            muted: false,
            timer_end: None,
            view: View::Hidden,
            content: View::Hidden,
            since: Instant::now(),
            anim: Anim { from: GONE, to: GONE, start: Instant::now(), dur: 0.0 },
            hovered: false,
            hover: None,
            hot_tracked: false,
            dwell: false,
            busy: false,
            shown: false,
            settled: true,
            dirty: false,
        };
        island.layout()?;
        island.update_hot();
        Ok(island)
    }

    // ——— place à l'écran ———

    /// Fenêtre en haut au centre de l'écran principal ; recréée si l'écran ou sa mise à l'échelle change.
    fn layout(&mut self) -> Result<()> {
        let m = screen::primary();
        let scale = m.scale;
        let cx = (m.work.left + m.work.right) / 2;
        let (pw, ph) = ((CW * scale).round() as i32, (CH * scale).round() as i32);
        // sous la barre de Rago OS, l'île part du haut de l'écran et passe par-dessus la barre
        let top = if self.bar.is_some() { m.rect.top } else { m.work.top };
        let (left, top) = (cx - pw / 2, top);
        let same = self.win.as_ref().is_some_and(|w| w.scale == scale && w.left == left && w.top == top);
        if !same {
            if let Some(old) = self.win.take() {
                unsafe {
                    let _ = DestroyWindow(old.hwnd);
                }
            }
            let hwnd = host::window(left, top, pw, ph, false)?;
            let surface = Surface::new(&self.dev, hwnd, pw as u32, ph as u32, scale)?;
            self.win = Some(Win { hwnd, surface, scale, left, top });
            self.shown = false;
            if self.view != View::Hidden {
                self.settled = false;
                self.show_window();
            }
        }
        let hw = (HOT_W * scale).round() as i32;
        self.hot_rect = self.bar.unwrap_or(RECT { left: cx - hw / 2, top: m.work.top, right: cx + hw / 2, bottom: m.work.top + 2 });
        let r = self.hot_rect;
        unsafe {
            let _ = SetWindowPos(self.hot, Some(HWND_TOPMOST), r.left, r.top, r.right - r.left, r.bottom - r.top, SWP_NOACTIVATE);
        }
        Ok(())
    }

    /// La zone de survol n'existe que là où elle ne prend les clics de personne (voir `screen::top_free`).
    fn update_hot(&mut self) {
        let r = self.hot_rect;
        let on = self.bar.is_none() && !self.busy && screen::top_free((r.left + r.right) / 2, r.top);
        if on != self.hot_on {
            self.hot_on = on;
            unsafe {
                let _ = ShowWindow(self.hot, if on { SW_SHOWNOACTIVATE } else { SW_HIDE });
            }
            if !on {
                self.stop_timer(TIMER_DWELL);
                self.dwell = false;
            }
        }
    }

    fn show_window(&mut self) {
        if self.shown {
            return;
        }
        let _ = self.draw();
        if let Some(w) = &self.win {
            unsafe {
                let _ = SetWindowPos(w.hwnd, Some(HWND_TOPMOST), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
            }
            self.shown = true;
        }
    }

    /// Remet l'île devant la barre, quand celle-ci vient d'être (re)montrée.
    pub fn raise(&self) {
        if let (true, Some(w)) = (self.shown, &self.win) {
            unsafe {
                let _ = SetWindowPos(w.hwnd, Some(HWND_TOPMOST), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
            }
        }
    }

    /// La fenêtre ne prend la souris que sur ces pastilles (et leur ombre).
    fn region(&self, rects: &[D2D_RECT_F]) {
        let Some(w) = &self.win else { return };
        let (mut l, mut t, mut r, mut b) = (f32::MAX, f32::MAX, f32::MIN, f32::MIN);
        for x in rects {
            l = l.min(x.left);
            t = t.min(x.top);
            r = r.max(x.right);
            b = b.max(x.bottom);
        }
        let s = w.scale;
        unsafe {
            let rgn = CreateRectRgn(((l - PAD) * s).floor() as i32, ((t - PAD).max(0.0) * s).floor() as i32, ((r + PAD) * s).ceil() as i32, ((b + PAD + 2.0) * s).ceil() as i32);
            SetWindowRgn(w.hwnd, Some(rgn), true);
        }
    }

    fn timer(&self, id: usize, ms: u32) {
        unsafe { SetTimer(Some(self.host), id, ms, None) };
    }

    fn stop_timer(&self, id: usize) {
        unsafe {
            let _ = KillTimer(Some(self.host), id);
        }
    }

    // ——— états ———

    fn geo(&self, view: View) -> Geo {
        let (w, h) = match view {
            View::Hidden => return GONE,
            View::Mini => (136.0, 36.0),
            View::Media => (340.0, 44.0),
            View::Volume => (280.0, 44.0),
            View::Done => (280.0, 44.0),
            View::Open if self.media.present => (MAX_W, MAX_H),
            View::Open => (340.0, 76.0),
        };
        Geo { w, h, a: 1.0 }
    }

    /// Ce que montre l'île quand rien ne se passe : le minuteur s'il tourne, sinon rien.
    fn base(&self) -> View {
        if self.timer_end.is_some() {
            View::Mini
        } else {
            View::Hidden
        }
    }

    fn go(&mut self, view: View) {
        let view = if self.busy { View::Hidden } else { view };
        let to = self.geo(view);
        if view == self.view && self.anim.to == to {
            return;
        }
        if view == View::Hidden && !self.shown {
            self.view = View::Hidden;
            return;
        }
        let from = if self.shown { self.anim.now() } else { GONE };
        if view != View::Hidden && view != self.view {
            self.content = view;
            self.since = Instant::now();
        }
        if view == View::Open && self.view != View::Open {
            // l'heure reste juste pendant que l'île est ouverte, qui se referme quand la souris s'en va
            self.timer(TIMER_TICK, 1000);
            self.timer(TIMER_HIDE, LINGER);
        }
        self.view = view;
        self.anim = Anim { from, to, start: Instant::now(), dur: if view == View::Hidden { CLOSE } else { MORPH } };
        self.settled = false;
        self.region(&[pill(from.w, from.h), pill(to.w, to.h)]);
        if view != View::Hidden {
            self.show_window();
        }
    }

    fn hide_now(&mut self) {
        self.view = View::Hidden;
        self.anim = Anim { from: GONE, to: GONE, start: Instant::now(), dur: 0.0 };
        self.settled = true;
        self.hovered = false;
        self.hover = None;
        if let Some(w) = &self.win {
            unsafe {
                let _ = ShowWindow(w.hwnd, SW_HIDE);
            }
        }
        self.shown = false;
        for id in [TIMER_PEEK, TIMER_HIDE, TIMER_DWELL] {
            self.stop_timer(id);
        }
        self.dwell = false;
    }

    fn peek(&mut self, view: View, ms: u32) {
        self.go(view);
        if self.view == view {
            self.timer(TIMER_PEEK, ms);
        }
    }

    // ——— appelé par la boucle ———

    /// Pendant l'animation de démarrage : rien n'apparaît jusqu'au prochain `on_screen`.
    pub fn hide_all(&mut self) {
        self.busy = true;
        self.hide_now();
        self.update_hot();
    }

    /// Barre de Rago OS allumée (`zone` : son centre, en pixels physiques) ou éteinte.
    pub fn set_bar(&mut self, zone: Option<RECT>) {
        if zone != self.bar {
            self.bar = zone;
            if let Err(e) = self.layout() {
                if lost(&e) {
                    let _ = self.rebuild();
                }
            }
            self.update_hot();
        }
    }

    /// Souris dans le centre de la barre (`inside`) ou sortie de là : comme la zone de survol.
    pub fn bar_hover(&mut self, inside: bool) {
        if inside {
            self.hot_enter();
        } else if self.hot_tracked {
            self.hot_leave();
        }
    }

    /// Un minuteur tourne (le centre de contrôle propose alors de l'arrêter).
    pub fn timer_running(&self) -> bool {
        self.timer_end.is_some()
    }

    /// Clic au centre de la barre.
    pub fn open(&mut self) {
        if !self.busy {
            self.go(View::Open);
        }
    }

    fn hot_enter(&mut self) {
        self.hot_tracked = true;
        if !self.dwell && self.view != View::Open && !self.busy {
            self.dwell = true;
            // dans la barre, la souris passe souvent par le centre : il faut s'y arrêter un peu plus
            self.timer(TIMER_DWELL, if self.bar.is_some() { DWELL_BAR } else { DWELL });
        }
    }

    fn hot_leave(&mut self) {
        self.hot_tracked = false;
        if self.dwell {
            self.dwell = false;
            self.stop_timer(TIMER_DWELL);
        }
        if self.view == View::Open && !self.hovered {
            self.timer(TIMER_HIDE, LINGER);
        }
    }

    pub fn set_fr(&mut self, fr: bool) {
        if fr != self.fr {
            self.fr = fr;
            self.dirty = true;
        }
    }

    pub fn set_timer(&mut self, secs: u32) {
        if secs == 0 {
            self.timer_end = None;
            if self.view != View::Open {
                self.stop_timer(TIMER_TICK);
            }
        } else {
            self.timer_end = Some(Instant::now() + Duration::from_secs(secs as u64));
            self.timer(TIMER_TICK, 1000);
        }
        match self.view {
            View::Open | View::Done => self.dirty = true,
            View::Hidden | View::Mini => {
                let b = self.base();
                self.go(b);
            }
            _ => {}
        }
    }

    pub fn on_media(&mut self, snap: Snapshot, allowed: bool) {
        let same_art = match (&snap.art, &self.media.art) {
            (Some(a), Some(b)) => Arc::ptr_eq(a, b),
            (None, None) => true,
            _ => false,
        };
        if !same_art {
            self.art = snap.art.as_deref().and_then(|bytes| self.decode(bytes));
        }
        let changed = snap.changed;
        self.media = snap;
        match self.view {
            View::Open => {
                // la taille dépend de la musique (pochette ou heure)
                self.go(View::Open);
                self.dirty = true;
            }
            View::Media if !self.media.present => {
                let b = self.base();
                self.go(b);
            }
            View::Media => {
                self.dirty = true;
                if changed {
                    self.timer(TIMER_PEEK, PEEK_MEDIA);
                }
            }
            _ if allowed && changed && self.media.present => self.peek(View::Media, PEEK_MEDIA),
            _ => {}
        }
    }

    pub fn on_volume(&mut self, level: f32, muted: bool, allowed: bool) {
        self.level = level.clamp(0.0, 1.0);
        self.muted = muted;
        match self.view {
            View::Open => {}
            View::Volume => {
                self.dirty = true;
                self.timer(TIMER_PEEK, PEEK_VOLUME);
            }
            _ if allowed => self.peek(View::Volume, PEEK_VOLUME),
            _ => {}
        }
    }

    /// Premier plan, écrans ou toutes les 2 s : jeu devant, écran changé, zone de survol libre ou non.
    pub fn on_screen(&mut self, busy: bool, display_changed: bool) {
        if display_changed {
            if let Err(e) = self.layout() {
                if lost(&e) {
                    let _ = self.rebuild();
                }
            }
        }
        if busy != self.busy {
            self.busy = busy;
            if busy {
                self.hide_now();
            } else {
                let b = self.base();
                self.go(b);
            }
        }
        self.update_hot();
    }

    pub fn on_event(&mut self, e: Event, media: Option<&Media>) {
        let island = self.win.as_ref().map(|w| w.hwnd.0 as isize);
        let hot = self.hot.0 as isize;
        let scale = self.win.as_ref().map_or(1.0, |w| w.scale);
        match e {
            Event::Mouse { hwnd, x, y } if Some(hwnd) == island => {
                if !self.hovered {
                    self.hovered = true;
                    self.track(hwnd);
                }
                self.hover = Some((x as f32 / scale, y as f32 / scale));
                self.dirty = true;
                if matches!(self.view, View::Mini | View::Media | View::Volume | View::Done) {
                    self.stop_timer(TIMER_PEEK);
                    self.go(View::Open);
                }
            }
            Event::Mouse { hwnd, .. } if hwnd == hot => {
                if !self.hot_tracked {
                    self.track(hwnd);
                }
                self.hot_enter();
            }
            Event::Leave { hwnd } if Some(hwnd) == island => {
                self.hovered = false;
                self.hover = None;
                self.dirty = true;
                if self.view == View::Open {
                    self.timer(TIMER_HIDE, LINGER);
                }
            }
            Event::Leave { hwnd } if hwnd == hot => self.hot_leave(),
            Event::Click { hwnd, x, y } if Some(hwnd) == island => {
                if self.view != View::Open {
                    self.go(View::Open);
                    return;
                }
                let (lx, ly) = (x as f32 / scale, y as f32 / scale);
                let g = self.geo(View::Open);
                let hit = self.controls(View::Open, pill(g.w, g.h)).into_iter().find(|(r, _)| inside(r, lx, ly)).map(|(_, a)| a);
                match (hit, media) {
                    (Some(Action::Previous), Some(m)) => m.previous(),
                    (Some(Action::Toggle), Some(m)) => m.toggle(),
                    (Some(Action::Next), Some(m)) => m.next(),
                    (Some(Action::Timer(s)), _) => self.set_timer(s),
                    (Some(Action::Stop), _) => self.set_timer(0),
                    _ => {}
                }
            }
            Event::Click { hwnd, .. } if hwnd == hot => self.go(View::Open),
            Event::Timer(TIMER_DWELL) => {
                self.stop_timer(TIMER_DWELL);
                self.dwell = false;
                let mut p = POINT::default();
                let r = self.hot_rect;
                if unsafe { GetCursorPos(&mut p) }.is_ok() && p.x >= r.left && p.x < r.right && p.y >= r.top - 1 && p.y < r.bottom + 1 {
                    self.go(View::Open);
                }
            }
            Event::Timer(TIMER_HIDE) => {
                // tant que la souris est sur l'île ouverte, on revérifie (au cas où sa sortie n'a pas été signalée)
                if self.view != View::Open || !self.cursor_on_island() {
                    self.stop_timer(TIMER_HIDE);
                    let b = self.base();
                    self.go(b);
                }
            }
            Event::Timer(TIMER_PEEK) => {
                self.stop_timer(TIMER_PEEK);
                if self.view != View::Open && !self.hovered {
                    let b = self.base();
                    self.go(b);
                }
            }
            Event::Timer(TIMER_TICK) => self.tick(),
            _ => {}
        }
    }

    fn track(&self, hwnd: isize) {
        let mut t = TRACKMOUSEEVENT { cbSize: std::mem::size_of::<TRACKMOUSEEVENT>() as u32, dwFlags: TME_LEAVE, hwndTrack: HWND(hwnd as *mut _), dwHoverTime: 0 };
        unsafe {
            let _ = TrackMouseEvent(&mut t);
        }
    }

    fn cursor_on_island(&self) -> bool {
        let Some(w) = &self.win else { return false };
        let mut p = POINT::default();
        if unsafe { GetCursorPos(&mut p) }.is_err() {
            return false;
        }
        let (x, y) = ((p.x - w.left) as f32 / w.scale, (p.y - w.top) as f32 / w.scale);
        let g = self.geo(self.view);
        let r = pill(g.w, g.h);
        x >= r.left - 4.0 && x < r.right + 4.0 && y >= 0.0 && y < r.bottom + 4.0
    }

    fn tick(&mut self) {
        match self.timer_end {
            Some(end) if Instant::now() >= end => {
                self.timer_end = None;
                unsafe {
                    let _ = MessageBeep(MB_ICONASTERISK);
                }
                if self.view != View::Open {
                    self.stop_timer(TIMER_TICK);
                    self.peek(View::Done, PEEK_DONE);
                } else {
                    self.dirty = true;
                }
            }
            Some(_) => self.dirty |= matches!(self.view, View::Mini | View::Open),
            None if self.view == View::Open => self.dirty = true,
            None => self.stop_timer(TIMER_TICK),
        }
    }

    pub fn animating(&self) -> bool {
        self.shown && (self.anim.running() || (self.view != View::Hidden && self.since.elapsed().as_secs_f32() < FADE.1))
    }

    pub fn frame(&mut self) {
        if !self.shown {
            return;
        }
        let running = self.animating();
        if !running && self.settled && !self.dirty {
            return;
        }
        self.dirty = false;
        if let Err(e) = self.draw() {
            if lost(&e) {
                let _ = self.rebuild();
                return;
            }
        }
        if !running && !self.settled {
            self.settled = true;
            if self.view == View::Hidden {
                if let Some(w) = &self.win {
                    unsafe {
                        let _ = ShowWindow(w.hwnd, SW_HIDE);
                    }
                }
                self.shown = false;
            } else {
                let g = self.geo(self.view);
                self.region(&[pill(g.w, g.h)]);
            }
        }
    }

    /// Carte graphique réinitialisée (pilote mis à jour…) : tout est recréé.
    fn rebuild(&mut self) -> Result<()> {
        self.dev = Device::new()?;
        if let Some(old) = self.win.take() {
            unsafe {
                let _ = DestroyWindow(old.hwnd);
            }
        }
        self.shown = false;
        self.art = self.media.art.clone().and_then(|bytes| self.decode(&bytes));
        self.layout()
    }

    /// Pochette décodée et réduite à 128 px (le reste de l'image n'est jamais gardé).
    fn decode(&self, bytes: &[u8]) -> Option<ID2D1Bitmap1> {
        let wic = self.wic.as_ref()?;
        let ctx = &self.win.as_ref()?.surface.ctx;
        unsafe {
            let stream = SHCreateMemStream(Some(bytes))?;
            let decoder = wic.CreateDecoderFromStream(&stream, std::ptr::null(), WICDecodeMetadataCacheOnDemand).ok()?;
            let frame = decoder.GetFrame(0).ok()?;
            let (mut w, mut h) = (0u32, 0u32);
            frame.GetSize(&mut w, &mut h).ok()?;
            if w == 0 || h == 0 {
                return None;
            }
            let k = (128.0 / w.max(h) as f32).min(1.0);
            let (tw, th) = (((w as f32 * k).round() as u32).max(1), ((h as f32 * k).round() as u32).max(1));
            let scaler = wic.CreateBitmapScaler().ok()?;
            scaler.Initialize(&frame, tw, th, WICBitmapInterpolationModeFant).ok()?;
            let converter = wic.CreateFormatConverter().ok()?;
            converter.Initialize(&scaler, &GUID_WICPixelFormat32bppPBGRA, WICBitmapDitherTypeNone, None, 0.0, WICBitmapPaletteTypeMedianCut).ok()?;
            ctx.CreateBitmapFromWicBitmap(&converter, None).ok()
        }
    }

    // ——— dessin ———

    /// Boutons de la vue posée dans `r` (mêmes rectangles pour le dessin et les clics).
    fn controls(&self, view: View, r: D2D_RECT_F) -> Vec<(D2D_RECT_F, Action)> {
        let cy = (r.top + r.bottom) / 2.0;
        let mut out = Vec::new();
        if view != View::Open {
            return out;
        }
        if self.media.present {
            for (a, dx) in [(Action::Previous, 116.0), (Action::Toggle, 76.0), (Action::Next, 36.0)] {
                out.push((circle(r.right - dx, cy, 17.0), a));
            }
            if self.timer_end.is_some() {
                out.push((rect(r.left + 90.0, r.top + 60.0, 110.0, 18.0), Action::Stop));
            }
        } else if self.timer_end.is_some() {
            out.push((rect(r.right - 16.0 - 132.0, cy - 14.0, 132.0, 28.0), Action::Stop));
        } else {
            let (cw, gap) = (54.0, 6.0);
            for (i, min) in [5u32, 15, 25].into_iter().enumerate() {
                let x = r.right - 16.0 - (3 - i) as f32 * cw - (2 - i) as f32 * gap;
                out.push((rect(x, cy - 14.0, cw, 28.0), Action::Timer(min * 60)));
            }
        }
        out
    }

    fn draw(&mut self) -> Result<()> {
        let Some(win) = &self.win else { return Ok(()) };
        let s = &win.surface;
        let g = self.anim.now();
        s.begin();
        if g.a > 0.002 {
            let r = pill(g.w, g.h);
            let radius = (g.h / 2.0).min(26.0);
            // ombre douce : quelques contours de plus en plus larges et légers
            for (k, a) in [(7.0, 0.035), (4.5, 0.06), (2.0, 0.10)] {
                let b = s.brush(0x000000, a * g.a)?;
                let o = D2D_RECT_F { left: r.left - k, top: r.top - k * 0.6, right: r.right + k, bottom: r.bottom + k * 1.2 };
                s.pill(o, radius + k, &b);
            }
            let fill = s.brush(0x000000, 0.94 * g.a)?;
            s.pill(r, radius, &fill);
            let rim = s.brush(gfx::TEXT, 0.09 * g.a)?;
            unsafe {
                let inner = D2D_RECT_F { left: r.left + 0.5, top: r.top + 0.5, right: r.right - 0.5, bottom: r.bottom - 0.5 };
                s.ctx.DrawRoundedRectangle(&D2D1_ROUNDED_RECT { rect: inner, radiusX: radius - 0.5, radiusY: radius - 0.5 }, &rim, 1.0, None);
            }
            let c = if self.view == View::Hidden { g.a } else { ease_out(span(self.since.elapsed().as_secs_f32(), FADE.0, FADE.1)) * g.a };
            if c > 0.002 {
                // le contenu est posé à sa taille finale au centre de la pastille, et coupé à sa forme pendant le morphing
                let target = self.geo(self.content);
                let (cx, cy) = ((r.left + r.right) / 2.0, (r.top + r.bottom) / 2.0);
                let content = rect(cx - target.w / 2.0, cy - target.h / 2.0, target.w, target.h);
                unsafe { s.ctx.PushAxisAlignedClip(&r, D2D1_ANTIALIAS_MODE_PER_PRIMITIVE) };
                let res = self.draw_view(s, self.content, content, c);
                unsafe { s.ctx.PopAxisAlignedClip() };
                res?;
            }
        }
        s.end()
    }

    fn draw_view(&self, s: &Surface, view: View, r: D2D_RECT_F, a: f32) -> Result<()> {
        let f = &self.fonts;
        let cy = (r.top + r.bottom) / 2.0;
        let white = s.brush(gfx::TEXT, a)?;
        let grey = s.brush(gfx::TEXT2, a)?;
        let red = s.brush(gfx::RED, a)?;
        let remaining = self.timer_end.map(|e| e.saturating_duration_since(Instant::now()).as_secs_f32().ceil() as u64);
        match view {
            View::Hidden => {}
            View::Mini => {
                self.dot(s, r.left + 18.0, cy, 4.0, &red);
                s.text(&countdown(remaining.unwrap_or(0)), &f.center, rect(r.left + 28.0, r.top, r.right - r.left - 40.0, r.bottom - r.top), &white);
            }
            View::Media => {
                self.art(s, rect(r.left + 8.0, r.top + 8.0, 28.0, 28.0), 7.0, a)?;
                let tw = r.right - r.left - 46.0 - 44.0;
                if self.media.artist.is_empty() {
                    s.text(&self.media.title, &f.title, rect(r.left + 46.0, r.top, tw, r.bottom - r.top), &white);
                } else {
                    s.text(&self.media.title, &f.title, rect(r.left + 46.0, r.top + 5.0, tw, 18.0), &white);
                    s.text(&self.media.artist, &f.sub, rect(r.left + 46.0, r.top + 22.0, tw, 16.0), &grey);
                }
                if self.media.playing {
                    self.bars(s, r.right - 26.0, cy, &red);
                } else {
                    self.pause(s, r.right - 26.0, cy, 0.8, &grey);
                }
            }
            View::Volume => {
                self.speaker(s, r.left + 16.0, cy, a)?;
                let (x0, x1) = (r.left + 46.0, r.right - 62.0);
                let track = s.brush(gfx::TEXT, 0.14 * a)?;
                s.pill(rect(x0, cy - 2.0, x1 - x0, 4.0), 2.0, &track);
                let level = if self.muted { 0.0 } else { self.level };
                if level > 0.0 {
                    s.pill(rect(x0, cy - 2.0, ((x1 - x0) * level).max(4.0), 4.0), 2.0, &red);
                }
                let pct = (self.level * 100.0).round() as u32;
                let label = if self.muted { (if self.fr { "Muet" } else { "Muted" }).to_string() } else if self.fr { format!("{pct}\u{202F}%") } else { format!("{pct}%") };
                s.text(&label, &f.right, rect(r.right - 60.0, r.top, 44.0, r.bottom - r.top), &white);
            }
            View::Done => {
                let ring = s.brush(gfx::RED, 0.3 * a)?;
                self.dot(s, r.left + 24.0, cy, 9.0, &ring);
                self.dot(s, r.left + 24.0, cy, 4.5, &red);
                let text = if self.fr { "Minuteur terminé" } else { "Timer finished" };
                s.text(text, &f.title, rect(r.left + 44.0, r.top, r.right - r.left - 58.0, r.bottom - r.top), &white);
            }
            View::Open if self.media.present => {
                self.art(s, rect(r.left + 16.0, r.top + 16.0, 60.0, 60.0), 12.0, a)?;
                let (tx, tw) = (r.left + 90.0, r.right - r.left - 90.0 - 142.0);
                let top = if self.timer_end.is_some() { r.top + 16.0 } else { r.top + 24.0 };
                s.text(&self.media.title, &f.title_big, rect(tx, top, tw, 22.0), &white);
                s.text(&self.media.artist, &f.sub, rect(tx, top + 22.0, tw, 18.0), &grey);
                let hover = self.hover;
                for (b, action) in self.controls(view, r) {
                    let (bx, by) = ((b.left + b.right) / 2.0, (b.top + b.bottom) / 2.0);
                    if action != Action::Stop && hover.is_some_and(|(x, y)| inside(&b, x, y)) {
                        let h = s.brush(gfx::TEXT, 0.10 * a)?;
                        self.dot(s, bx, by, 17.0, &h);
                    }
                    match action {
                        Action::Previous => self.skip(s, bx, by, false, &white)?,
                        Action::Next => self.skip(s, bx, by, true, &white)?,
                        Action::Toggle if self.media.playing => self.pause(s, bx, by, 1.0, &white),
                        Action::Toggle => self.play(s, bx, by, &white)?,
                        Action::Stop => {
                            let label = format!("{} {}", if self.fr { "Minuteur" } else { "Timer" }, countdown(remaining.unwrap_or(0)));
                            let brush = if hover.is_some_and(|(x, y)| inside(&b, x, y)) { &white } else { &red };
                            s.text(&label, &f.small, b, brush);
                        }
                        _ => {}
                    }
                }
            }
            View::Open => {
                let (time, date) = clock(self.fr);
                s.text(&time, &f.clock, rect(r.left + 20.0, r.top + 10.0, 150.0, 36.0), &white);
                s.text(&date, &f.sub, rect(r.left + 21.0, r.top + 46.0, 124.0, 18.0), &grey);
                for (b, action) in self.controls(view, r) {
                    let hovered = self.hover.is_some_and(|(x, y)| inside(&b, x, y));
                    let (bg, label) = match action {
                        Action::Stop => (
                            s.brush(gfx::RED, if hovered { 0.32 } else { 0.2 } * a)?,
                            format!("{} · {}", if self.fr { "Arrêter" } else { "Stop" }, countdown(remaining.unwrap_or(0))),
                        ),
                        Action::Timer(secs) => (s.brush(gfx::TEXT, if hovered { 0.16 } else { 0.08 } * a)?, format!("{} min", secs / 60)),
                        _ => continue,
                    };
                    s.pill(b, 14.0, &bg);
                    s.text(&label, &f.chip, b, &white);
                }
            }
        }
        Ok(())
    }

    fn dot(&self, s: &Surface, cx: f32, cy: f32, r: f32, b: &ID2D1Brush) {
        unsafe { s.ctx.FillEllipse(&D2D1_ELLIPSE { point: Vector2 { X: cx, Y: cy }, radiusX: r, radiusY: r }, b) };
    }

    fn poly(&self, pts: &[(f32, f32)]) -> Result<ID2D1PathGeometry1> {
        unsafe {
            let g = self.dev.d2d.CreatePathGeometry()?;
            let sink = g.Open()?;
            sink.BeginFigure(Vector2 { X: pts[0].0, Y: pts[0].1 }, D2D1_FIGURE_BEGIN_FILLED);
            for p in &pts[1..] {
                sink.AddLine(Vector2 { X: p.0, Y: p.1 });
            }
            sink.EndFigure(D2D1_FIGURE_END_CLOSED);
            sink.Close()?;
            Ok(g)
        }
    }

    fn play(&self, s: &Surface, cx: f32, cy: f32, b: &ID2D1Brush) -> Result<()> {
        let g = self.poly(&[(cx - 5.0, cy - 7.5), (cx + 8.0, cy), (cx - 5.0, cy + 7.5)])?;
        unsafe { s.ctx.FillGeometry(&g, b, None) };
        Ok(())
    }

    fn pause(&self, s: &Surface, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        let (w, h) = (4.0 * k, 15.0 * k);
        s.pill(rect(cx - 1.5 * k - w, cy - h / 2.0, w, h), 1.5 * k, b);
        s.pill(rect(cx + 1.5 * k, cy - h / 2.0, w, h), 1.5 * k, b);
    }

    fn skip(&self, s: &Surface, cx: f32, cy: f32, forward: bool, b: &ID2D1Brush) -> Result<()> {
        let d = if forward { 1.0 } else { -1.0 };
        let g = self.poly(&[(cx - 6.0 * d, cy - 6.5), (cx + 4.0 * d, cy), (cx - 6.0 * d, cy + 6.5)])?;
        unsafe { s.ctx.FillGeometry(&g, b, None) };
        let x = if forward { cx + 4.0 } else { cx - 6.5 };
        s.pill(rect(x, cy - 6.5, 2.5, 13.0), 1.0, b);
        Ok(())
    }

    /// Égaliseur figé : trois barres rouges, rien n'est animé pendant la lecture.
    fn bars(&self, s: &Surface, cx: f32, cy: f32, b: &ID2D1Brush) {
        for (i, h) in [9.0, 15.0, 11.0].into_iter().enumerate() {
            let x = cx - 7.0 + i as f32 * 5.5;
            s.pill(rect(x, cy + 7.5 - h, 3.0, h), 1.5, b);
        }
    }

    fn speaker(&self, s: &Surface, x: f32, cy: f32, a: f32) -> Result<()> {
        let white = s.brush(gfx::TEXT, a)?;
        let g = self.poly(&[(x, cy - 3.5), (x + 4.0, cy - 3.5), (x + 9.0, cy - 8.0), (x + 9.0, cy + 8.0), (x + 4.0, cy + 3.5), (x, cy + 3.5)])?;
        unsafe { s.ctx.FillGeometry(&g, &white, None) };
        if self.muted {
            let red = s.brush(gfx::RED, a)?;
            unsafe {
                s.ctx.DrawLine(Vector2 { X: x + 13.0, Y: cy - 4.0 }, Vector2 { X: x + 21.0, Y: cy + 4.0 }, &red, 1.8, None);
                s.ctx.DrawLine(Vector2 { X: x + 21.0, Y: cy - 4.0 }, Vector2 { X: x + 13.0, Y: cy + 4.0 }, &red, 1.8, None);
            }
            return Ok(());
        }
        // ondes : une, deux ou trois selon le niveau
        let waves = if self.level <= 0.0 { 0 } else if self.level < 0.34 { 1 } else if self.level < 0.67 { 2 } else { 3 };
        for i in 0..waves {
            let r = 4.5 + i as f32 * 3.8;
            unsafe {
                let geo = self.dev.d2d.CreatePathGeometry()?;
                let sink = geo.Open()?;
                let (sin, cos) = (0.75f32.sin(), 0.75f32.cos());
                sink.BeginFigure(Vector2 { X: x + 10.0 + r * cos, Y: cy - r * sin }, D2D1_FIGURE_BEGIN_HOLLOW);
                sink.AddArc(&D2D1_ARC_SEGMENT {
                    point: Vector2 { X: x + 10.0 + r * cos, Y: cy + r * sin },
                    size: D2D_SIZE_F { width: r, height: r },
                    rotationAngle: 0.0,
                    sweepDirection: D2D1_SWEEP_DIRECTION_CLOCKWISE,
                    arcSize: D2D1_ARC_SIZE_SMALL,
                });
                sink.EndFigure(D2D1_FIGURE_END_OPEN);
                sink.Close()?;
                s.ctx.DrawGeometry(&geo, &white, 1.6, None);
            }
        }
        Ok(())
    }

    /// Pochette arrondie, en couvrant le cadre ; une note rouge s'il n'y en a pas.
    fn art(&self, s: &Surface, r: D2D_RECT_F, radius: f32, a: f32) -> Result<()> {
        if let Some(bmp) = &self.art {
            unsafe {
                let size = bmp.GetSize();
                let (rw, rh) = (r.right - r.left, r.bottom - r.top);
                let k = (rw / size.width.max(1.0)).max(rh / size.height.max(1.0));
                let m = Matrix3x2 { M11: k, M12: 0.0, M21: 0.0, M22: k, M31: r.left + (rw - size.width * k) / 2.0, M32: r.top + (rh - size.height * k) / 2.0 };
                let props = D2D1_BITMAP_BRUSH_PROPERTIES1 { extendModeX: D2D1_EXTEND_MODE_CLAMP, extendModeY: D2D1_EXTEND_MODE_CLAMP, interpolationMode: D2D1_INTERPOLATION_MODE_LINEAR };
                let brush = s.ctx.CreateBitmapBrush(bmp, Some(&props), Some(&D2D1_BRUSH_PROPERTIES { opacity: a, transform: m }))?;
                s.pill(r, radius, &brush);
            }
        } else {
            let bg = s.brush(gfx::TEXT, 0.08 * a)?;
            s.pill(r, radius, &bg);
            let red = s.brush(gfx::RED, a)?;
            let (cx, cy) = ((r.left + r.right) / 2.0, (r.top + r.bottom) / 2.0);
            let k = (r.right - r.left) / 28.0;
            self.dot(s, cx - 2.0 * k, cy + 4.0 * k, 3.2 * k, &red);
            s.pill(rect(cx + 0.2 * k, cy - 6.5 * k, 1.6 * k, 11.0 * k), 0.8 * k, &red);
        }
        Ok(())
    }
}

impl Drop for Island {
    fn drop(&mut self) {
        for id in [TIMER_TICK, TIMER_PEEK, TIMER_HIDE, TIMER_DWELL] {
            self.stop_timer(id);
        }
        unsafe {
            if let Some(w) = self.win.take() {
                let _ = DestroyWindow(w.hwnd);
            }
            let _ = DestroyWindow(self.hot);
        }
    }
}
