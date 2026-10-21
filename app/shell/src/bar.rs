//! Barre de Rago OS, en haut de l'écran principal, comme celle d'un Mac : le menu Rago, le nom de l'appli au premier
//! plan, la Dynamic Island au centre, puis l'état du PC et l'heure. Elle ne se redessine que quand l'un d'eux change
//! (une fois par minute pour l'heure).

use windows::core::Result;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Direct2D::Common::D2D_RECT_F;
use windows::Win32::Graphics::Direct2D::ID2D1PathGeometry1;
use windows::Win32::Graphics::DirectWrite::*;

use crate::appbar::{self, Edge};
use crate::gfx::{self, place, rect, Device};
use crate::icons::Pen;
use crate::panel::{inside, Panel};
use crate::screen::Monitor;
use crate::status::{Battery, Net};

/// Hauteur de la barre, en pixels logiques.
pub const HEIGHT: f32 = 28.0;
/// zone du centre où la souris ouvre la Dynamic Island
const ISLAND_W: f32 = 200.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Hit {
    Rago,
    App,
    Taskbar,
    Battery,
    Network,
    Volume,
    Search,
    Control,
    Clock,
}

pub struct Bar {
    pub panel: Panel,
    dev: Device,
    mark: ID2D1PathGeometry1,
    bold: IDWriteTextFormat,
    text: IDWriteTextFormat,
    pub fr: bool,
    pub app: String,
    pub clock: String,
    pub battery: Option<Battery>,
    pub net: Net,
    pub level: f32,
    pub muted: bool,
    /// le Dock remplace la barre des tâches : un bouton la fait revenir un moment
    pub taskbar_button: bool,
    pub taskbar_shown: bool,
    /// élément dont le menu ou le panneau est ouvert
    pub open: Option<Hit>,
    hover: Option<Hit>,
    hits: Vec<(D2D_RECT_F, Hit)>,
    monitor: Monitor,
    registered: bool,
    /// bande réservée auprès de Windows
    reserved: Option<RECT>,
    pub dirty: bool,
}

impl Bar {
    pub fn new(dev: &Device, monitor: Monitor, fr: bool, windows11: bool) -> Result<Bar> {
        let s = monitor.scale;
        let thickness = (HEIGHT * s).round() as i32;
        let r = RECT { left: monitor.rect.left, top: monitor.rect.top, right: monitor.rect.right, bottom: monitor.rect.top + thickness };
        let panel = Panel::new(dev, r, s, false, windows11)?;
        let bold = dev.text_format(13.0, DWRITE_FONT_WEIGHT_SEMI_BOLD)?;
        let text = dev.text_format(13.0, DWRITE_FONT_WEIGHT_MEDIUM)?;
        let mut bar = Bar {
            panel,
            dev: dev.clone(),
            mark: dev.mark()?,
            bold,
            text,
            fr,
            app: String::new(),
            clock: String::new(),
            battery: None,
            net: Net::Offline,
            level: 0.0,
            muted: false,
            taskbar_button: false,
            taskbar_shown: false,
            open: None,
            hover: None,
            hits: Vec::new(),
            monitor,
            registered: false,
            reserved: None,
            dirty: true,
        };
        bar.registered = appbar::register(bar.panel.hwnd);
        bar.layout(monitor)?;
        Ok(bar)
    }

    /// Bande réservée en haut de l'écran (écran ou échelle changés, barre des tâches déplacée).
    pub fn layout(&mut self, monitor: Monitor) -> Result<()> {
        self.monitor = monitor;
        let thickness = (HEIGHT * monitor.scale).round() as i32;
        let r = if self.registered {
            let r = appbar::place(self.panel.hwnd, Edge::Top, monitor.rect, thickness, self.reserved);
            self.reserved = Some(r);
            r
        } else {
            RECT { left: monitor.rect.left, top: monitor.rect.top, right: monitor.rect.right, bottom: monitor.rect.top + thickness }
        };
        self.panel.place(r, monitor.scale)?;
        self.dirty = true;
        Ok(())
    }

    pub fn show(&mut self) {
        if !self.panel.shown {
            let _ = self.draw();
            self.panel.show();
        }
    }

    pub fn hide(&mut self) {
        self.panel.hide();
    }

    /// Zone de la Dynamic Island, en pixels physiques de l'écran (x de début, x de fin).
    pub fn island_zone(&self) -> (i32, i32) {
        let s = self.panel.scale;
        let cx = (self.panel.rect.left + self.panel.rect.right) / 2;
        let half = (ISLAND_W * s / 2.0) as i32;
        (cx - half, cx + half)
    }

    /// Souris sur la barre : renvoie vrai si elle est dans la zone de l'île.
    pub fn on_mouse(&mut self, x: i32, y: i32) -> bool {
        let (lx, ly) = self.panel.local(x, y);
        let h = self.hits.iter().find(|(r, _)| inside(r, lx, ly)).map(|(_, h)| *h);
        if h != self.hover {
            self.hover = h;
            self.dirty = true;
        }
        let w = self.panel.width();
        (lx - w / 2.0).abs() < ISLAND_W / 2.0
    }

    pub fn on_leave(&mut self) {
        if self.hover.is_some() {
            self.hover = None;
            self.dirty = true;
        }
    }

    /// Élément cliqué et le coin bas-gauche de son rectangle (pixels physiques de l'écran) pour y ouvrir un menu.
    pub fn on_click(&self, x: i32, y: i32) -> Option<(Hit, i32, i32, i32)> {
        let (lx, ly) = self.panel.local(x, y);
        let (r, h) = self.hits.iter().find(|(r, _)| inside(r, lx, ly))?;
        let s = self.panel.scale;
        let p = self.panel.rect;
        Some((*h, p.left + (r.left * s) as i32, p.left + (r.right * s) as i32, p.bottom))
    }

    pub fn frame(&mut self) -> Result<()> {
        if self.dirty && self.panel.shown {
            self.dirty = false;
            self.draw()?;
        }
        Ok(())
    }

    fn draw(&mut self) -> Result<()> {
        let dev = self.dev.clone();
        let s = &self.panel.surface;
        let (w, h) = (self.panel.width(), self.panel.height());
        let cy = h / 2.0;
        s.begin();
        let fill = s.brush(gfx::GLASS, 0.62)?;
        s.pill(rect(0.0, 0.0, w, h), 0.0, &fill);
        let line = s.brush(0xFFFFFF, 0.07)?;
        s.line(0.0, h - 0.5, w, h - 0.5, &line, 1.0);
        let white = s.brush(gfx::TEXT, 1.0)?;
        let dim = s.brush(gfx::TEXT, 0.35)?;
        let pen = Pen::new(s, &dev.d2d);
        let mut hits: Vec<(D2D_RECT_F, Hit)> = Vec::new();

        // à gauche : le R de Rago, puis l'appli au premier plan
        let rago = rect(8.0, 3.0, 32.0, h - 6.0);
        hits.push((rago, Hit::Rago));
        let app_name = if self.app.is_empty() { (if self.fr { "Bureau" } else { "Desktop" }).to_string() } else { self.app.clone() };
        let app_w = dev.measure(&app_name, &self.bold).min(w * 0.3) + 18.0;
        let app = rect(44.0, 3.0, app_w, h - 6.0);
        hits.push((app, Hit::App));

        // à droite, de l'heure vers le centre
        let mut x = w - 8.0;
        let mut right = |width: f32, hit: Hit, hits: &mut Vec<(D2D_RECT_F, Hit)>| -> D2D_RECT_F {
            x -= width;
            let r = rect(x, 3.0, width, h - 6.0);
            hits.push((r, hit));
            x -= 2.0;
            r
        };
        let clock_w = dev.measure(&self.clock, &self.text) + 18.0;
        let clock = right(clock_w, Hit::Clock, &mut hits);
        let control = right(32.0, Hit::Control, &mut hits);
        let search = right(32.0, Hit::Search, &mut hits);
        let volume = right(32.0, Hit::Volume, &mut hits);
        let network = right(32.0, Hit::Network, &mut hits);
        let battery = self.battery.map(|_| right(64.0, Hit::Battery, &mut hits));
        let taskbar = self.taskbar_button.then(|| right(30.0, Hit::Taskbar, &mut hits));

        // surbrillance sous la souris, et de l'élément dont le menu est ouvert
        for (r, hit) in &hits {
            let a = if self.open == Some(*hit) {
                0.20
            } else if self.hover == Some(*hit) {
                0.12
            } else {
                continue;
            };
            let b = s.brush(0xFFFFFF, a)?;
            s.pill(*r, 6.0, &b);
        }

        // R de Rago (cadre 164 × 180), à la hauteur du texte
        let k = 13.5 / 180.0;
        s.transform(place(164.0, 180.0, k, (rago.left + rago.right) / 2.0, cy));
        unsafe { s.ctx.FillGeometry(&self.mark, &white, None) };
        s.transform(windows_numerics::Matrix3x2::identity());
        s.text(&app_name, &self.bold, rect(app.left + 9.0, 0.0, app.right - app.left - 18.0, h), &white);

        s.text(&self.clock, &self.text, rect(clock.left + 9.0, 0.0, clock.right - clock.left - 9.0, h), &white);
        let mid = |r: &D2D_RECT_F| (r.left + r.right) / 2.0;
        pen.control(mid(&control), cy, 1.0, &white);
        pen.search(mid(&search), cy, 1.0, &white);
        pen.speaker(mid(&volume) - 8.0, cy, 1.0, self.level, self.muted, &white)?;
        match self.net {
            Net::Wifi => pen.wifi(mid(&network), cy, 1.0, &white, &dim, true)?,
            Net::Wired => pen.wired(mid(&network), cy, 1.0, &white),
            Net::Offline => pen.offline(mid(&network), cy, 1.0, &white),
        }
        if let (Some(r), Some(b)) = (battery, self.battery) {
            let pct = if self.fr { format!("{}\u{202F}%", b.percent) } else { format!("{}%", b.percent) };
            let tw = dev.measure(&pct, &self.text);
            s.text(&pct, &self.text, rect(r.left + 6.0, 0.0, tw + 2.0, h), &white);
            let low = b.percent <= 20 && !b.charging;
            let level = if low { s.brush(gfx::RED, 1.0)? } else { s.brush(gfx::TEXT, 1.0)? };
            pen.battery(r.left + 10.0 + tw, cy, 0.95, b.percent, b.charging, &white, &level)?;
        }
        if let Some(r) = taskbar {
            pen.chevron(mid(&r), cy, 1.0, !self.taskbar_shown, &white)?;
        }
        let done = s.end();
        self.hits = hits;
        done
    }
}

impl Drop for Bar {
    fn drop(&mut self) {
        if self.registered {
            appbar::remove(self.panel.hwnd);
        }
    }
}
