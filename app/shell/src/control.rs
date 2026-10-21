//! Centre de contrôle de Rago OS, sous l'icône à droite de la barre : Wi‑Fi et Bluetooth, capture, bureau, verrouillage,
//! paramètres, le son (curseur), un minuteur dans la Dynamic Island et la musique en cours. Il ne fait que demander
//! les changements à Windows, par ses API publiques ; le bureau les applique (`Tap`).

use windows::core::Result;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Direct2D::Common::D2D_RECT_F;
use windows::Win32::Graphics::DirectWrite::*;
use windows::Win32::UI::Input::KeyboardAndMouse::{ReleaseCapture, SetCapture};

use crate::gfx::{self, rect, Device};
use crate::icons::Pen;
use crate::media::Snapshot;
use crate::panel::{inside, Panel};
use crate::screen;
use crate::status::Radios;

const W: f32 = 320.0;
const PAD: f32 = 12.0;
const GAP: f32 = 8.0;
const RADIUS: f32 = 16.0;
const TIMERS: [u32; 4] = [60, 300, 600, 1500];

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Tap {
    Wifi(bool),
    Bluetooth(bool),
    Capture,
    Desktop,
    Lock,
    Settings,
    Volume(f32),
    Mute(bool),
    Timer(u32),
    Previous,
    Toggle,
    Next,
    Close,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Zone {
    Wifi,
    Bluetooth,
    Capture,
    Desktop,
    Lock,
    Settings,
    Speaker,
    Slider,
    Timer(u32),
    Stop,
    Previous,
    Toggle,
    Next,
}

pub struct Control {
    pub panel: Panel,
    dev: Device,
    fr: bool,
    pub radios: Option<Radios>,
    level: f32,
    muted: bool,
    media: Snapshot,
    /// la Dynamic Island est là (sinon pas de minuteur)
    island: bool,
    timer_on: bool,
    hover: Option<Zone>,
    dragging: bool,
    zones: Vec<(D2D_RECT_F, Zone)>,
    title: IDWriteTextFormat,
    small: IDWriteTextFormat,
    center: IDWriteTextFormat,
    dirty: bool,
}

pub struct State {
    pub radios: Option<Radios>,
    pub level: f32,
    pub muted: bool,
    pub media: Snapshot,
    pub island: bool,
    pub timer_on: bool,
}

impl Control {
    /// Ouvert sous la barre, son bord droit sous `right` (pixels physiques de l'écran), en haut à `top`.
    pub fn open(dev: &Device, right: i32, top: i32, state: State, fr: bool, windows11: bool) -> Result<Control> {
        let m = screen::monitor_at(right - 1, top);
        let s = m.scale;
        let title = dev.text_format(13.0, DWRITE_FONT_WEIGHT_SEMI_BOLD)?;
        let small = dev.text_format(11.5, DWRITE_FONT_WEIGHT_NORMAL)?;
        let center = dev.text_format(11.0, DWRITE_FONT_WEIGHT_NORMAL)?;
        unsafe { center.SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER)? };
        let mut c = Control {
            panel: Panel::new(dev, RECT { left: 0, top: 0, right: 1, bottom: 1 }, s, true, windows11)?,
            dev: dev.clone(),
            fr,
            radios: state.radios,
            level: state.level,
            muted: state.muted,
            media: state.media,
            island: state.island,
            timer_on: state.timer_on,
            hover: None,
            dragging: false,
            zones: Vec::new(),
            title,
            small,
            center,
            dirty: true,
        };
        let h = c.height();
        let (pw, ph) = ((W * s).round() as i32, (h * s).round() as i32);
        let gap = (6.0 * s) as i32;
        let left = (right - pw).clamp(m.rect.left + gap, m.rect.right - pw - gap);
        c.panel.place(RECT { left, top: top + gap, right: left + pw, bottom: top + gap + ph }, s)?;
        c.panel.shape(rect(0.0, 0.0, W, h), RADIUS);
        c.draw()?;
        c.panel.show();
        Ok(c)
    }

    fn height(&self) -> f32 {
        let mut y = PAD + 60.0 + GAP + 64.0 + GAP + 58.0;
        if self.island {
            y += GAP + 62.0;
        }
        if self.media.present {
            y += GAP + 58.0;
        }
        y + PAD
    }

    /// Nouvel état (son, musique, radios) : redessiné, et agrandi si la musique apparaît.
    pub fn update(&mut self, state: State) {
        let resize = state.media.present != self.media.present || state.island != self.island;
        self.radios = state.radios.or(self.radios);
        if !self.dragging {
            self.level = state.level;
        }
        self.muted = state.muted;
        self.media = state.media;
        self.island = state.island;
        self.timer_on = state.timer_on;
        if resize {
            let h = self.height();
            let s = self.panel.scale;
            let mut r = self.panel.rect;
            r.bottom = r.top + (h * s).round() as i32;
            if self.panel.place(r, s).is_ok() {
                self.panel.shape(rect(0.0, 0.0, W, h), RADIUS);
            }
        }
        self.dirty = true;
    }

    fn zone_at(&self, x: f32, y: f32) -> Option<Zone> {
        self.zones.iter().find(|(r, _)| inside(r, x, y)).map(|(_, z)| *z)
    }

    fn slider_level(&self, x: f32) -> f32 {
        let track = self.zones.iter().find(|(_, z)| *z == Zone::Slider).map(|(r, _)| *r);
        match track {
            Some(r) => ((x - r.left - 9.0) / (r.right - r.left - 18.0)).clamp(0.0, 1.0),
            None => self.level,
        }
    }

    pub fn on_mouse(&mut self, x: i32, y: i32) -> Option<Tap> {
        let (lx, ly) = self.panel.local(x, y);
        if self.dragging {
            let l = self.slider_level(lx);
            if (l - self.level).abs() > 0.004 {
                self.level = l;
                self.dirty = true;
                return Some(Tap::Volume(l));
            }
            return None;
        }
        let z = self.zone_at(lx, ly);
        if z != self.hover {
            self.hover = z;
            self.dirty = true;
        }
        None
    }

    pub fn on_leave(&mut self) {
        if self.hover.is_some() && !self.dragging {
            self.hover = None;
            self.dirty = true;
        }
    }

    pub fn on_down(&mut self, x: i32, y: i32) -> Option<Tap> {
        let (lx, ly) = self.panel.local(x, y);
        if self.zone_at(lx, ly) != Some(Zone::Slider) {
            return None;
        }
        self.dragging = true;
        unsafe {
            SetCapture(self.panel.hwnd);
        }
        self.level = self.slider_level(lx);
        self.dirty = true;
        Some(Tap::Volume(self.level))
    }

    pub fn on_click(&mut self, x: i32, y: i32) -> Option<Tap> {
        if self.dragging {
            self.dragging = false;
            unsafe {
                let _ = ReleaseCapture();
            }
            return None;
        }
        let (lx, ly) = self.panel.local(x, y);
        let on = |v: Option<bool>| v.unwrap_or(false);
        Some(match self.zone_at(lx, ly)? {
            Zone::Wifi => {
                let r = self.radios?;
                r.wifi?;
                Tap::Wifi(!on(r.wifi))
            }
            Zone::Bluetooth => {
                let r = self.radios?;
                r.bluetooth?;
                Tap::Bluetooth(!on(r.bluetooth))
            }
            Zone::Capture => Tap::Capture,
            Zone::Desktop => Tap::Desktop,
            Zone::Lock => Tap::Lock,
            Zone::Settings => Tap::Settings,
            Zone::Speaker => Tap::Mute(!self.muted),
            Zone::Slider => return None,
            Zone::Timer(s) => Tap::Timer(s),
            Zone::Stop => Tap::Timer(0),
            Zone::Previous => Tap::Previous,
            Zone::Toggle => Tap::Toggle,
            Zone::Next => Tap::Next,
        })
    }

    pub fn on_wheel(&mut self, delta: i32) -> Option<Tap> {
        let l = (self.level + if delta > 0 { 0.05 } else { -0.05 }).clamp(0.0, 1.0);
        if (l - self.level).abs() < 0.001 {
            return None;
        }
        self.level = l;
        self.dirty = true;
        Some(Tap::Volume(l))
    }

    pub fn on_key(&mut self, vk: u32) -> Option<Tap> {
        match vk {
            0x1B => Some(Tap::Close),
            0x26 | 0x27 => self.on_wheel(1),
            0x28 | 0x25 => self.on_wheel(-1),
            _ => None,
        }
    }

    pub fn frame(&mut self) -> Result<()> {
        if self.dirty {
            self.dirty = false;
            self.draw()?;
        }
        Ok(())
    }

    fn draw(&mut self) -> Result<()> {
        let dev = self.dev.clone();
        let fr = self.fr;
        let h = self.height();
        let s = &self.panel.surface;
        s.begin();
        s.glass(rect(0.0, 0.0, W, h), RADIUS, 0.84)?;
        let pen = Pen::new(s, &dev.d2d);
        let white = s.brush(gfx::TEXT, 1.0)?;
        let grey = s.brush(gfx::TEXT2, 1.0)?;
        let ink = s.brush(gfx::INK, 1.0)?;
        let card = s.brush(0xFFFFFF, 0.08)?;
        let card_hover = s.brush(0xFFFFFF, 0.14)?;
        let mut zones: Vec<(D2D_RECT_F, Zone)> = Vec::new();
        let hover = self.hover;
        let bg = |z: Zone| if hover == Some(z) { &card_hover } else { &card };

        // Wi‑Fi et Bluetooth
        let tw = (W - 2.0 * PAD - GAP) / 2.0;
        let mut y = PAD;
        for (i, zone) in [Zone::Wifi, Zone::Bluetooth].into_iter().enumerate() {
            let r = rect(PAD + i as f32 * (tw + GAP), y, tw, 60.0);
            zones.push((r, zone));
            s.pill(r, 14.0, bg(zone));
            let state = self.radios.map(|r| if zone == Zone::Wifi { r.wifi } else { r.bluetooth });
            let on = state.flatten().unwrap_or(false);
            let (cx, cy) = (r.left + 28.0, r.top + 30.0);
            let circle = if on { s.brush(gfx::TEXT, 1.0)? } else { s.brush(0xFFFFFF, 0.16)? };
            s.dot(cx, cy, 16.0, &circle);
            let glyph = if on { &ink } else { &white };
            if zone == Zone::Wifi {
                pen.wifi(cx, cy - 1.0, 0.9, glyph, glyph, true)?;
            } else {
                pen.bluetooth(cx, cy, 0.95, glyph)?;
            }
            let name = if zone == Zone::Wifi { "Wi‑Fi" } else { "Bluetooth" };
            let sub = match state {
                None => "…",
                Some(None) => {
                    if fr {
                        "Absent"
                    } else {
                        "Not available"
                    }
                }
                Some(Some(true)) => {
                    if fr {
                        "Activé"
                    } else {
                        "On"
                    }
                }
                Some(Some(false)) => {
                    if fr {
                        "Désactivé"
                    } else {
                        "Off"
                    }
                }
            };
            s.text(name, &self.title, rect(r.left + 52.0, r.top + 11.0, r.right - r.left - 58.0, 20.0), &white);
            s.text(sub, &self.small, rect(r.left + 52.0, r.top + 30.0, r.right - r.left - 58.0, 18.0), &grey);
        }
        y += 60.0 + GAP;

        // raccourcis
        let sw = (W - 2.0 * PAD - 3.0 * GAP) / 4.0;
        let shortcuts = [
            (Zone::Capture, "Capture"),
            (Zone::Desktop, if fr { "Bureau" } else { "Desktop" }),
            (Zone::Lock, if fr { "Verrouiller" } else { "Lock" }),
            (Zone::Settings, if fr { "Réglages" } else { "Settings" }),
        ];
        for (i, (zone, label)) in shortcuts.into_iter().enumerate() {
            let r = rect(PAD + i as f32 * (sw + GAP), y, sw, 64.0);
            zones.push((r, zone));
            s.pill(r, 14.0, bg(zone));
            let (cx, cy) = ((r.left + r.right) / 2.0, r.top + 24.0);
            match zone {
                Zone::Capture => pen.capture(cx, cy, 1.15, &white)?,
                Zone::Desktop => pen.desktop(cx, cy, 1.15, &white),
                Zone::Lock => pen.lock(cx, cy, 1.15, &white)?,
                _ => pen.gear(cx, cy, 1.05, &white),
            }
            s.text(label, &self.center, rect(r.left + 2.0, r.top + 42.0, r.right - r.left - 4.0, 16.0), &grey);
        }
        y += 64.0 + GAP;

        // son
        let r = rect(PAD, y, W - 2.0 * PAD, 58.0);
        s.pill(r, 14.0, &card);
        s.text(if fr { "Son" } else { "Sound" }, &self.title, rect(r.left + 14.0, r.top + 6.0, 120.0, 20.0), &white);
        let pct = format!("{} %", (self.level * 100.0).round() as u32);
        let pct = if fr { pct.replace(' ', "\u{202F}") } else { pct.replace(' ', "") };
        let shown = if self.muted { (if fr { "Coupé" } else { "Muted" }).to_string() } else { pct };
        s.text(&shown, &self.small, rect(r.right - 70.0, r.top + 6.0, 56.0, 20.0), &grey);
        let speaker = rect(r.left + 6.0, r.top + 26.0, 30.0, 28.0);
        zones.push((speaker, Zone::Speaker));
        if hover == Some(Zone::Speaker) {
            s.pill(speaker, 8.0, &card_hover);
        }
        pen.speaker(speaker.left + 6.0, speaker.top + 14.0, 0.85, self.level, self.muted, &white)?;
        let track = rect(r.left + 40.0, r.top + 30.0, r.right - r.left - 54.0, 20.0);
        zones.push((track, Zone::Slider));
        let (tx0, tx1, ty) = (track.left + 9.0, track.right - 9.0, (track.top + track.bottom) / 2.0);
        let rail = s.brush(0xFFFFFF, 0.18)?;
        s.pill(rect(tx0, ty - 3.0, tx1 - tx0, 6.0), 3.0, &rail);
        let level = if self.muted { 0.0 } else { self.level };
        let kx = tx0 + (tx1 - tx0) * level;
        s.pill(rect(tx0, ty - 3.0, kx - tx0, 6.0), 3.0, &white);
        let shadow = s.brush(0x000000, 0.25)?;
        s.dot(kx, ty + 1.0, 9.5, &shadow);
        s.dot(kx, ty, 9.0, &white);
        y += 58.0 + GAP;

        // minuteur de la Dynamic Island
        if self.island {
            let r = rect(PAD, y, W - 2.0 * PAD, 62.0);
            s.pill(r, 14.0, &card);
            pen.timer(r.left + 20.0, r.top + 16.0, 0.8, &white);
            s.text(if fr { "Minuteur" } else { "Timer" }, &self.title, rect(r.left + 34.0, r.top + 6.0, 160.0, 20.0), &white);
            let cy = r.top + 44.0;
            if self.timer_on {
                s.text(if fr { "En cours dans la Dynamic Island" } else { "Running in the Dynamic Island" }, &self.small, rect(r.left + 14.0, cy - 9.0, 190.0, 18.0), &grey);
                let chip = rect(r.right - 84.0, cy - 11.0, 72.0, 22.0);
                zones.push((chip, Zone::Stop));
                let red = s.brush(gfx::RED, if hover == Some(Zone::Stop) { 1.0 } else { 0.85 })?;
                s.pill(chip, 11.0, &red);
                s.text(if fr { "Arrêter" } else { "Stop" }, &self.center, chip, &white);
            } else {
                let cw = (r.right - r.left - 28.0 - 3.0 * 6.0) / 4.0;
                for (i, secs) in TIMERS.into_iter().enumerate() {
                    let chip = rect(r.left + 14.0 + i as f32 * (cw + 6.0), cy - 11.0, cw, 22.0);
                    zones.push((chip, Zone::Timer(secs)));
                    let b = s.brush(0xFFFFFF, if hover == Some(Zone::Timer(secs)) { 0.24 } else { 0.13 })?;
                    s.pill(chip, 11.0, &b);
                    s.text(&format!("{} min", secs / 60), &self.center, chip, &white);
                }
            }
            y += 62.0 + GAP;
        }

        // musique en cours
        if self.media.present {
            let r = rect(PAD, y, W - 2.0 * PAD, 58.0);
            s.pill(r, 14.0, &card);
            let text_w = r.right - r.left - 130.0;
            let title = if self.media.title.is_empty() { (if fr { "Lecture en cours" } else { "Now playing" }).to_string() } else { self.media.title.clone() };
            s.text(&title, &self.title, rect(r.left + 14.0, r.top + 9.0, text_w, 20.0), &white);
            s.text(&self.media.artist, &self.small, rect(r.left + 14.0, r.top + 29.0, text_w, 18.0), &grey);
            let buttons = [(Zone::Previous, r.right - 98.0), (Zone::Toggle, r.right - 62.0), (Zone::Next, r.right - 26.0)];
            for (zone, cx) in buttons {
                let b = rect(cx - 16.0, r.top + 13.0, 32.0, 32.0);
                zones.push((b, zone));
                if hover == Some(zone) {
                    s.pill(b, 16.0, &card_hover);
                }
                let cy = r.top + 29.0;
                match zone {
                    Zone::Previous => pen.skip(cx, cy, 0.8, false, &white)?,
                    Zone::Next => pen.skip(cx, cy, 0.8, true, &white)?,
                    _ if self.media.playing => pen.pause(cx, cy, 0.95, &white),
                    _ => pen.play(cx + 1.0, cy, 0.95, &white)?,
                }
            }
        }
        let done = s.end();
        self.zones = zones;
        done
    }
}

impl Drop for Control {
    fn drop(&mut self) {
        if self.dragging {
            unsafe {
                let _ = ReleaseCapture();
            }
        }
    }
}
