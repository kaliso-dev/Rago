//! Menus de Rago OS (menu Rago de la barre, menu de l'appli, clic droit dans le Dock) : verre, coins arrondis, une
//! ligne en surbrillance sous la souris ou au clavier. Il prend le clavier en s'ouvrant et se ferme dès qu'on clique
//! ailleurs. Les choix « dangereux » (éteindre…) demandent un second clic.

use windows::core::Result;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Direct2D::Common::D2D_RECT_F;
use windows::Win32::Graphics::DirectWrite::{IDWriteTextFormat, DWRITE_FONT_WEIGHT_NORMAL, DWRITE_FONT_WEIGHT_SEMI_BOLD};

use crate::gfx::{self, rect, Device};
use crate::panel::{inside, Panel};
use crate::screen;

const PAD: f32 = 6.0;
const ROW: f32 = 28.0;
const SEP: f32 = 11.0;
const RADIUS: f32 = 10.0;

#[derive(Debug, Clone)]
pub struct Item {
    pub label: String,
    /// identifiant rendu au clic ; 0 : séparateur
    pub id: u32,
    pub enabled: bool,
    /// demande un second clic (« Éteindre ? »)
    pub confirm: Option<String>,
    /// titre grisé, en gras (nom de l'appli en tête du menu du Dock)
    pub header: bool,
    pub check: bool,
}

impl Item {
    pub fn new(label: impl Into<String>, id: u32) -> Item {
        Item { label: label.into(), id, enabled: true, confirm: None, header: false, check: false }
    }
    pub fn sep() -> Item {
        Item { label: String::new(), id: 0, enabled: false, confirm: None, header: false, check: false }
    }
    pub fn header(label: impl Into<String>) -> Item {
        Item { label: label.into(), id: 0, enabled: false, confirm: None, header: true, check: false }
    }
    pub fn confirm(mut self, label: impl Into<String>) -> Item {
        self.confirm = Some(label.into());
        self
    }
    pub fn checked(mut self, on: bool) -> Item {
        self.check = on;
        self
    }
    fn is_sep(&self) -> bool {
        self.id == 0 && !self.header
    }
    fn height(&self) -> f32 {
        if self.is_sep() {
            SEP
        } else {
            ROW
        }
    }
}

/// Où le menu s'ouvre : sous un point (barre) ou au-dessus (Dock), en pixels physiques.
#[derive(Debug, Clone, Copy)]
pub enum Anchor {
    Below { x: i32, y: i32 },
    Above { cx: i32, y: i32 },
}

pub struct Menu {
    pub panel: Panel,
    items: Vec<Item>,
    hover: Option<usize>,
    /// choix qui attend son second clic
    armed: Option<usize>,
    text: IDWriteTextFormat,
    header: IDWriteTextFormat,
    dirty: bool,
}

impl Menu {
    pub fn open(dev: &Device, items: Vec<Item>, anchor: Anchor, windows11: bool) -> Result<Menu> {
        let text = dev.text_format(13.0, DWRITE_FONT_WEIGHT_NORMAL)?;
        let header = dev.text_format(12.0, DWRITE_FONT_WEIGHT_SEMI_BOLD)?;
        // largeur : le plus long libellé (et sa version « confirmer »)
        let mut w: f32 = 200.0;
        for it in &items {
            for label in std::iter::once(&it.label).chain(it.confirm.iter()) {
                w = w.max(dev.measure(label, &text) + 2.0 * PAD + 44.0);
            }
        }
        let w = w.min(420.0).ceil();
        let h = (items.iter().map(Item::height).sum::<f32>() + 2.0 * PAD).ceil();
        let (ax, ay) = match anchor {
            Anchor::Below { x, y } => (x, y),
            Anchor::Above { cx, y } => (cx, y),
        };
        let m = screen::monitor_at(ax, ay);
        let s = m.scale;
        let (pw, ph) = ((w * s).round() as i32, (h * s).round() as i32);
        let (mut x, y) = match anchor {
            Anchor::Below { x, y } => (x, y + (4.0 * s) as i32),
            Anchor::Above { cx, y } => (cx - pw / 2, y - ph - (8.0 * s) as i32),
        };
        x = x.clamp(m.rect.left + (6.0 * s) as i32, m.rect.right - pw - (6.0 * s) as i32);
        let panel = Panel::new(dev, RECT { left: x, top: y, right: x + pw, bottom: y + ph }, s, true, windows11)?;
        panel.shape(rect(0.0, 0.0, w, h), RADIUS);
        let mut menu = Menu { panel, items, hover: None, armed: None, text, header, dirty: true };
        menu.draw()?;
        menu.panel.show();
        Ok(menu)
    }

    fn rows(&self) -> Vec<(D2D_RECT_F, usize)> {
        let w = self.panel.width();
        let mut y = PAD;
        let mut out = Vec::new();
        for (i, it) in self.items.iter().enumerate() {
            let h = it.height();
            out.push((rect(PAD, y, w - 2.0 * PAD, h), i));
            y += h;
        }
        out
    }

    fn at(&self, x: f32, y: f32) -> Option<usize> {
        self.rows().into_iter().find(|(r, i)| inside(r, x, y) && self.items[*i].enabled && self.items[*i].id != 0).map(|(_, i)| i)
    }

    pub fn on_mouse(&mut self, x: i32, y: i32) {
        let (lx, ly) = self.panel.local(x, y);
        let h = self.at(lx, ly);
        if h != self.hover {
            self.hover = h;
            self.dirty = true;
        }
    }

    pub fn on_leave(&mut self) {
        if self.hover.is_some() {
            self.hover = None;
            self.dirty = true;
        }
    }

    /// Clic : l'identifiant choisi (None : rien, ou premier clic d'un choix à confirmer).
    pub fn on_click(&mut self, x: i32, y: i32) -> Option<u32> {
        let (lx, ly) = self.panel.local(x, y);
        let i = self.at(lx, ly)?;
        self.choose(i)
    }

    fn choose(&mut self, i: usize) -> Option<u32> {
        if self.items[i].confirm.is_some() && self.armed != Some(i) {
            self.armed = Some(i);
            self.dirty = true;
            return None;
        }
        Some(self.items[i].id)
    }

    /// Flèches, Entrée ; renvoie le choix fait au clavier.
    pub fn on_key(&mut self, vk: u32) -> Option<u32> {
        let usable: Vec<usize> = (0..self.items.len()).filter(|&i| self.items[i].enabled && self.items[i].id != 0).collect();
        if usable.is_empty() {
            return None;
        }
        let pos = self.hover.and_then(|h| usable.iter().position(|&i| i == h));
        match vk {
            0x28 => self.hover = Some(usable[pos.map_or(0, |p| (p + 1) % usable.len())]),
            0x26 => self.hover = Some(usable[pos.map_or(usable.len() - 1, |p| (p + usable.len() - 1) % usable.len())]),
            0x0D => return self.hover.and_then(|h| self.choose(h)),
            _ => return None,
        }
        self.dirty = true;
        None
    }

    pub fn frame(&mut self) -> Result<()> {
        if self.dirty {
            self.dirty = false;
            self.draw()?;
        }
        Ok(())
    }

    fn draw(&self) -> Result<()> {
        let s = &self.panel.surface;
        let (w, h) = (self.panel.width(), self.panel.height());
        s.begin();
        s.glass(rect(0.0, 0.0, w, h), RADIUS, 0.80)?;
        let white = s.brush(gfx::TEXT, 1.0)?;
        let grey = s.brush(gfx::TEXT3, 1.0)?;
        let red = s.brush(gfx::RED, 1.0)?;
        let line = s.brush(0xFFFFFF, 0.10)?;
        for (r, i) in self.rows() {
            let it = &self.items[i];
            if it.is_sep() {
                let cy = (r.top + r.bottom) / 2.0;
                s.line(r.left + 8.0, cy, r.right - 8.0, cy, &line, 1.0);
                continue;
            }
            let armed = self.armed == Some(i);
            if self.hover == Some(i) || armed {
                let bg = if armed { s.brush(gfx::RED, 0.85)? } else { s.brush(0xFFFFFF, 0.13)? };
                s.pill(r, 6.0, &bg);
            }
            if it.check {
                s.dot(r.left + 12.0, (r.top + r.bottom) / 2.0, 3.0, &white);
            }
            let label = if armed { it.confirm.as_deref().unwrap_or(&it.label) } else { &it.label };
            let (fmt, brush) = if it.header {
                (&self.header, &grey)
            } else if !it.enabled {
                (&self.text, &grey)
            } else if armed {
                (&self.text, &white)
            } else if it.confirm.is_some() && self.hover == Some(i) {
                (&self.text, &red)
            } else {
                (&self.text, &white)
            };
            s.text(label, fmt, rect(r.left + 24.0, r.top, r.right - r.left - 32.0, r.bottom - r.top), brush);
        }
        s.end()
    }
}
