//! Dock de Rago OS, en bas de l'écran principal : toutes les applis, celles qu'on garde, celles qui sont ouvertes (un
//! point dessous), puis Téléchargements et la corbeille. Un clic ouvre, ramène ou réduit l'appli, un clic droit donne
//! ses fenêtres et ses choix. Il remplace la barre des tâches de Windows, cachée tant qu'il est là.

use std::collections::HashMap;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use windows::core::Result;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Direct2D::Common::D2D_RECT_F;
use windows::Win32::Graphics::Direct2D::D2D1_INTERPOLATION_MODE_HIGH_QUALITY_CUBIC;
use windows::Win32::Graphics::DirectWrite::{IDWriteTextFormat, DWRITE_FONT_WEIGHT_MEDIUM, DWRITE_TEXT_ALIGNMENT_CENTER};
use windows::Win32::UI::Shell::FOLDERID_Downloads;

use crate::appbar::{self, Edge};
use crate::apps::{self, Icons, Installed, Window, TRASH};
use crate::gfx::{self, ease_out, rect, span, Device};
use crate::icons::Pen;
use crate::menu::Item as MenuItem;
use crate::panel::{inside, Panel};
use crate::screen::Monitor;
use crate::{config, query};

const ICON: f32 = 46.0;
const SLOT: f32 = 56.0;
const PAD: f32 = 8.0;
const GAP: f32 = 14.0;
const PILL_H: f32 = 64.0;
const MARGIN: f32 = 6.0;
const RADIUS: f32 = 19.0;
/// bande réservée en bas de l'écran
pub const THICKNESS: f32 = PILL_H + MARGIN + 2.0;
const HOVER: f32 = 0.16;
const GROW: f32 = 0.12;

/// Appli gardée dans le Dock.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Pin {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub exe: Option<String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct Saved {
    pins: Vec<Pin>,
}

fn pins_file() -> std::path::PathBuf {
    config::dir().join("dock.json")
}

fn load_pins() -> Option<Vec<Pin>> {
    let b = std::fs::read(pins_file()).ok()?;
    serde_json::from_slice::<Saved>(&b).ok().map(|s| s.pins)
}

fn save_pins(pins: &[Pin]) {
    let dir = config::dir();
    let _ = std::fs::create_dir_all(&dir);
    if let Ok(b) = serde_json::to_vec_pretty(&Saved { pins: pins.to_vec() }) {
        let tmp = dir.join("dock.json.tmp");
        if std::fs::write(&tmp, b).is_ok() {
            let _ = std::fs::rename(&tmp, pins_file());
        }
    }
}

/// Premier lancement : l'Explorateur, le navigateur, les lanceurs de jeux et les applis des joueurs, s'ils sont là.
pub fn default_pins(index: &[Installed]) -> Vec<Pin> {
    let find = |names: &[&str]| index.iter().find(|a| names.iter().any(|n| a.folded == *n));
    let mut out = Vec::new();
    let mut push = |a: Option<&Installed>| {
        if let Some(a) = a {
            if !out.iter().any(|p: &Pin| p.id == a.id) {
                out.push(Pin { id: a.id.clone(), name: a.name.clone(), exe: a.exe.clone() });
            }
        }
    };
    push(index.iter().find(|a| a.id.eq_ignore_ascii_case("Microsoft.Windows.Explorer")).or_else(|| find(&["explorateur de fichiers", "file explorer"])));
    push(find(&["opera gx browser", "opera gx"]).or_else(|| find(&["google chrome"])).or_else(|| find(&["firefox", "mozilla firefox"])).or_else(|| find(&["brave"])).or_else(|| find(&["microsoft edge"])));
    for names in [
        &["steam"][..],
        &["epic games launcher"],
        &["battle.net"],
        &["riot client"],
        &["ea", "ea app"],
        &["ubisoft connect"],
        &["discord"],
        &["spotify"],
        &["rago optimizer"],
    ] {
        push(find(names));
    }
    push(index.iter().find(|a| a.id.to_ascii_lowercase().starts_with("windows.immersivecontrolpanel")).or_else(|| find(&["parametres", "settings"])));
    out
}

#[derive(Debug, Clone, PartialEq)]
enum Kind {
    Apps,
    Pinned(usize),
    Running,
    Downloads,
    Trash,
}

#[derive(Debug, Clone)]
struct Item {
    kind: Kind,
    name: String,
    icon: Option<String>,
    launch: Option<String>,
    exe: Option<String>,
    windows: Vec<Window>,
    /// position (pixels logiques depuis le bord gauche du Dock) : de là où il était vers là où il va
    from: f32,
    to: f32,
}

/// Ce que le Dock demande au bureau de faire après un clic.
#[derive(Debug, Clone)]
pub enum Action {
    Apps,
    Open(String),
    Menu(usize),
}

pub struct Dock {
    pub panel: Panel,
    tip: Option<Panel>,
    tip_for: Option<usize>,
    dev: Device,
    pins: Vec<Pin>,
    pins_loaded: bool,
    items: Vec<Item>,
    icons: Icons,
    names: HashMap<String, String>,
    hover: Option<usize>,
    hover_at: Instant,
    left_hover: Option<(usize, Instant)>,
    moved_at: Instant,
    launching: Vec<(String, Instant)>,
    foreground: Option<isize>,
    pub fr: bool,
    windows11: bool,
    monitor: Monitor,
    registered: bool,
    /// bande réservée auprès de Windows
    reserved: Option<RECT>,
    tip_text: IDWriteTextFormat,
    trash_checked: Instant,
    pill: D2D_RECT_F,
    pub dirty: bool,
}

impl Dock {
    pub fn new(dev: &Device, monitor: Monitor, fr: bool, windows11: bool) -> Result<Dock> {
        let s = monitor.scale;
        let t = (THICKNESS * s).round() as i32;
        let r = RECT { left: monitor.rect.left, top: monitor.rect.bottom - t, right: monitor.rect.right, bottom: monitor.rect.bottom };
        let panel = Panel::new(dev, r, s, false, windows11)?;
        let tip_text = dev.text_format(12.5, DWRITE_FONT_WEIGHT_MEDIUM)?;
        unsafe { tip_text.SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER)? };
        let loaded = load_pins();
        let mut dock = Dock {
            panel,
            tip: None,
            tip_for: None,
            dev: dev.clone(),
            pins: loaded.clone().unwrap_or_default(),
            pins_loaded: loaded.is_some(),
            items: Vec::new(),
            icons: Icons::new(),
            names: HashMap::new(),
            hover: None,
            hover_at: Instant::now(),
            left_hover: None,
            moved_at: Instant::now(),
            launching: Vec::new(),
            foreground: None,
            fr,
            windows11,
            monitor,
            registered: false,
            reserved: None,
            tip_text,
            trash_checked: Instant::now(),
            pill: rect(0.0, 0.0, 0.0, 0.0),
            dirty: true,
        };
        dock.registered = appbar::register(dock.panel.hwnd);
        dock.layout(monitor)?;
        dock.update(&[], &[], None);
        Ok(dock)
    }

    pub fn layout(&mut self, monitor: Monitor) -> Result<()> {
        self.monitor = monitor;
        let t = (THICKNESS * monitor.scale).round() as i32;
        let r = if self.registered {
            let r = appbar::place(self.panel.hwnd, Edge::Bottom, monitor.rect, t, self.reserved);
            self.reserved = Some(r);
            r
        } else {
            RECT { left: monitor.rect.left, top: monitor.rect.bottom - t, right: monitor.rect.right, bottom: monitor.rect.bottom }
        };
        self.panel.place(r, monitor.scale)?;
        self.icons.clear();
        self.relayout(false);
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
        self.hide_tip();
    }

    /// L'index des applis est prêt : au premier lancement, le Dock se garnit.
    pub fn on_index(&mut self, index: &[Installed]) {
        if !self.pins_loaded {
            self.pins = default_pins(index);
            self.pins_loaded = true;
            save_pins(&self.pins);
        }
        for a in index {
            self.names.entry(a.id.to_ascii_lowercase()).or_insert_with(|| a.name.clone());
            if let Some(e) = &a.exe {
                self.names.entry(e.clone()).or_insert_with(|| a.name.clone());
            }
        }
    }

    /// Fenêtres ouvertes (ou premier plan) changées.
    pub fn update(&mut self, windows: &[Window], index: &[Installed], foreground: Option<isize>) {
        if !index.is_empty() && self.names.is_empty() {
            self.on_index(index);
        }
        self.foreground = foreground;
        let old: Vec<(String, f32)> = self.items.iter().map(|i| (self.item_id(i), i.to)).collect();
        let previous_running: Vec<String> = self.items.iter().filter(|i| i.kind == Kind::Running).map(|i| self.item_id(i)).collect();
        let mut items = vec![Item { kind: Kind::Apps, name: if self.fr { "Applications".into() } else { "Apps".into() }, icon: None, launch: None, exe: None, windows: Vec::new(), from: 0.0, to: 0.0 }];
        let mut used = vec![false; windows.len()];
        for (pi, p) in self.pins.iter().enumerate() {
            let mut ws = Vec::new();
            for (wi, w) in windows.iter().enumerate() {
                if !used[wi] && w.key.matches(&p.id, p.exe.as_deref()) {
                    used[wi] = true;
                    ws.push(w.clone());
                }
            }
            let icon = if p.id.contains(":\\") || p.id.starts_with("::") { Some(p.id.clone()) } else { Some(format!("shell:AppsFolder\\{}", p.id)) };
            items.push(Item { kind: Kind::Pinned(pi), name: p.name.clone(), icon, launch: Some(p.id.clone()), exe: p.exe.clone(), windows: ws, from: 0.0, to: 0.0 });
        }
        // applis ouvertes non gardées : dans l'ordre où elles sont arrivées
        let mut running: Vec<(String, Item)> = Vec::new();
        for (wi, w) in windows.iter().enumerate() {
            if used[wi] {
                continue;
            }
            let id = w.key.id();
            if id.is_empty() {
                continue;
            }
            if let Some((_, it)) = running.iter_mut().find(|(k, _)| *k == id) {
                it.windows.push(w.clone());
                continue;
            }
            let name = self.name_for(w);
            running.push((id, Item { kind: Kind::Running, name, icon: w.key.icon_source(), launch: w.key.launch_id(), exe: w.key.exe.clone(), windows: vec![w.clone()], from: 0.0, to: 0.0 }));
        }
        running.sort_by_key(|(id, _)| previous_running.iter().position(|p| p == id).unwrap_or(usize::MAX));
        items.extend(running.into_iter().map(|(_, it)| it));
        let downloads = apps::known_folder(&FOLDERID_Downloads);
        items.push(Item {
            kind: Kind::Downloads,
            name: if self.fr { "Téléchargements".into() } else { "Downloads".into() },
            icon: downloads.clone(),
            launch: downloads,
            exe: None,
            windows: Vec::new(),
            from: 0.0,
            to: 0.0,
        });
        items.push(Item { kind: Kind::Trash, name: if self.fr { "Corbeille".into() } else { "Recycle Bin".into() }, icon: Some(TRASH.into()), launch: Some("shell:RecycleBinFolder".into()), exe: None, windows: Vec::new(), from: 0.0, to: 0.0 });
        // la corbeille change d'image quand elle se remplit
        if self.trash_checked.elapsed().as_secs() >= 10 {
            self.trash_checked = Instant::now();
            self.icons.forget(TRASH);
        }
        self.launching.retain(|(_, t)| t.elapsed().as_secs() < 6);
        self.launching.retain(|(id, _)| !items.iter().any(|i| i.launch.as_deref() == Some(id) && !i.windows.is_empty()));
        // mêmes icônes au même endroit : seules les fenêtres changent, la souris garde sa bulle
        let same = items.len() == old.len() && items.iter().zip(&old).all(|(it, (k, _))| self.item_id(it) == *k);
        if same {
            for (it, prev) in items.iter_mut().zip(&self.items) {
                it.from = prev.from;
                it.to = prev.to;
            }
            self.items = items;
            self.dirty = true;
            return;
        }
        // les icônes glissent de leur ancienne place
        for it in items.iter_mut() {
            let id = it.launch.clone().unwrap_or_else(|| it.name.clone());
            it.from = old.iter().find(|(k, _)| *k == id).map(|(_, x)| *x).unwrap_or(f32::NAN);
        }
        self.items = items;
        self.hover = None;
        self.hide_tip();
        self.relayout(true);
    }

    /// Fenêtre au premier plan (un clic sur son icône la réduit).
    pub fn set_foreground(&mut self, fg: Option<isize>) {
        self.foreground = fg;
    }

    /// Fenêtres que le Dock montre (pour savoir quand l'une d'elles disparaît).
    pub fn shown_windows(&self) -> impl Iterator<Item = isize> + '_ {
        self.items.iter().flat_map(|i| i.windows.iter().map(|w| w.hwnd))
    }

    fn item_id(&self, i: &Item) -> String {
        i.launch.clone().unwrap_or_else(|| i.name.clone())
    }

    fn name_for(&mut self, w: &Window) -> String {
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
                self.names.insert(e.clone(), d.clone());
                return d;
            }
        }
        w.title.clone()
    }

    /// Places des icônes et forme du Dock ; `animate` : elles glissent de leur ancienne place.
    fn relayout(&mut self, animate: bool) {
        let mut x = PAD;
        let mut last: Option<u8> = None;
        for it in self.items.iter_mut() {
            let group = match it.kind {
                Kind::Apps | Kind::Pinned(_) => 0u8,
                Kind::Running => 1,
                Kind::Downloads | Kind::Trash => 2,
            };
            if last.is_some_and(|l| l != group) {
                x += GAP;
            }
            last = Some(group);
            if !animate || it.from.is_nan() {
                it.from = x;
            }
            it.to = x;
            x += SLOT;
        }
        let w = x + PAD;
        let total = self.panel.width();
        let h = self.panel.height();
        let left = ((total - w) / 2.0).max(0.0).round();
        self.pill = rect(left, h - MARGIN - PILL_H, w, PILL_H);
        self.panel.shape(self.pill, RADIUS);
        self.moved_at = Instant::now();
        self.dirty = true;
    }

    fn slot_rect(&self, it: &Item) -> D2D_RECT_F {
        let t = ease_out(span(self.moved_at.elapsed().as_secs_f32(), 0.0, 0.32));
        let x = it.from + (it.to - it.from) * t;
        rect(self.pill.left + x, self.pill.top, SLOT, PILL_H)
    }

    fn at(&self, x: f32, y: f32) -> Option<usize> {
        if !inside(&self.pill, x, y) {
            return None;
        }
        self.items.iter().position(|it| inside(&self.slot_rect(it), x, y))
    }

    pub fn on_mouse(&mut self, x: i32, y: i32) {
        let (lx, ly) = self.panel.local(x, y);
        let h = self.at(lx, ly);
        if h != self.hover {
            if let Some(old) = self.hover {
                self.left_hover = Some((old, Instant::now()));
            }
            self.hover = h;
            self.hover_at = Instant::now();
            self.dirty = true;
            self.update_tip();
        }
    }

    pub fn on_leave(&mut self) {
        if let Some(old) = self.hover.take() {
            self.left_hover = Some((old, Instant::now()));
            self.dirty = true;
        }
        self.hide_tip();
    }

    fn hide_tip(&mut self) {
        if let Some(t) = self.tip.as_mut() {
            t.hide();
        }
        self.tip_for = None;
    }

    /// Bulle avec le nom de l'appli au-dessus de l'icône survolée.
    fn update_tip(&mut self) {
        let Some(i) = self.hover else {
            self.hide_tip();
            return;
        };
        if self.tip_for == Some(i) {
            return;
        }
        let name = self.items[i].name.clone();
        let s = self.panel.scale;
        let w = (self.dev.measure(&name, &self.tip_text) + 24.0).clamp(60.0, 360.0);
        let h = 26.0;
        let slot = self.slot_rect(&self.items[i]);
        let cx = self.panel.rect.left + (((slot.left + slot.right) / 2.0) * s) as i32;
        let top = self.panel.rect.top + ((self.pill.top - h - 8.0) * s) as i32;
        let (pw, ph) = ((w * s).round() as i32, (h * s).round() as i32);
        let left = (cx - pw / 2).clamp(self.monitor.rect.left + 4, self.monitor.rect.right - pw - 4);
        let r = RECT { left, top, right: left + pw, bottom: top + ph };
        if self.tip.is_none() {
            self.tip = Panel::new(&self.dev, r, s, false, self.windows11).ok();
        }
        let Some(tip) = self.tip.as_mut() else { return };
        if tip.place(r, s).is_err() {
            return;
        }
        tip.shape(rect(0.0, 0.0, w, h), h / 2.0);
        let surface = &tip.surface;
        surface.begin();
        let drawn = surface.glass(rect(0.0, 0.0, w, h), h / 2.0, 0.82).and_then(|_| {
            let white = surface.brush(gfx::TEXT, 1.0)?;
            surface.text(&name, &self.tip_text, rect(0.0, 0.0, w, h), &white);
            surface.end()
        });
        if drawn.is_ok() {
            tip.show();
            self.tip_for = Some(i);
        }
    }

    /// Clic sur une icône : l'appli s'ouvre, revient devant, passe à sa fenêtre suivante ou se réduit.
    pub fn on_click(&mut self, x: i32, y: i32) -> Option<Action> {
        let (lx, ly) = self.panel.local(x, y);
        let i = self.at(lx, ly)?;
        let it = self.items[i].clone();
        match it.kind {
            Kind::Apps => return Some(Action::Apps),
            Kind::Downloads | Kind::Trash => return it.launch.map(Action::Open),
            _ => {}
        }
        if it.windows.is_empty() {
            if let Some(id) = &it.launch {
                apps::launch(id);
                self.launching.push((id.clone(), Instant::now()));
                self.dirty = true;
            }
            return None;
        }
        let front = it.windows.iter().any(|w| Some(w.hwnd) == self.foreground);
        if front && it.windows.len() > 1 {
            // passe à la fenêtre la plus en arrière de l'appli
            if let Some(w) = it.windows.last() {
                apps::activate(w.hwnd);
            }
        } else if front {
            apps::minimize(it.windows[0].hwnd);
        } else {
            apps::activate(it.windows[0].hwnd);
        }
        None
    }

    /// Clic droit : le bureau ouvre le menu de cette icône (`menu_for`).
    pub fn on_rclick(&mut self, x: i32, y: i32) -> Option<Action> {
        let (lx, ly) = self.panel.local(x, y);
        let i = self.at(lx, ly)?;
        (self.items[i].kind != Kind::Apps).then_some(Action::Menu(i))
    }

    /// Centre de l'icône `i` en haut du Dock (pixels physiques de l'écran), pour y poser le menu.
    pub fn anchor(&self, i: usize) -> (i32, i32) {
        let s = self.panel.scale;
        let slot = self.slot_rect(&self.items[i]);
        (self.panel.rect.left + (((slot.left + slot.right) / 2.0) * s) as i32, self.panel.rect.top + (self.pill.top * s) as i32)
    }

    pub fn menu_for(&self, i: usize) -> Vec<MenuItem> {
        let it = &self.items[i];
        let fr = self.fr;
        let mut out = vec![MenuItem::header(it.name.clone())];
        match it.kind {
            Kind::Trash => {
                out.push(MenuItem::new(if fr { "Ouvrir" } else { "Open" }, 1));
                out.push(MenuItem::new(if fr { "Vider la corbeille" } else { "Empty Recycle Bin" }, 5).confirm(if fr { "Vider pour de bon ?" } else { "Empty for good?" }));
                return out;
            }
            Kind::Downloads => {
                out.push(MenuItem::new(if fr { "Ouvrir" } else { "Open" }, 1));
                return out;
            }
            _ => {}
        }
        for (k, w) in it.windows.iter().take(8).enumerate() {
            let title: String = w.title.chars().take(48).collect();
            out.push(MenuItem::new(title, 100 + k as u32).checked(Some(w.hwnd) == self.foreground));
        }
        if !it.windows.is_empty() {
            out.push(MenuItem::sep());
        }
        if it.launch.is_some() {
            out.push(MenuItem::new(if it.windows.is_empty() { if fr { "Ouvrir" } else { "Open" } } else if fr { "Nouvelle fenêtre" } else { "New window" }, 1));
        }
        match it.kind {
            Kind::Pinned(_) => out.push(MenuItem::new(if fr { "Retirer du Dock" } else { "Remove from Dock" }, 3)),
            _ if it.launch.is_some() => out.push(MenuItem::new(if fr { "Garder dans le Dock" } else { "Keep in Dock" }, 2)),
            _ => {}
        }
        if !it.windows.is_empty() {
            out.push(MenuItem::sep());
            let n = it.windows.len();
            let label = if n == 1 {
                (if fr { "Fermer la fenêtre" } else { "Close window" }).to_string()
            } else if fr {
                format!("Fermer les {n} fenêtres")
            } else {
                format!("Close {n} windows")
            };
            out.push(MenuItem::new(label, 4));
        }
        out
    }

    /// Choix fait dans le menu de l'icône `i`.
    pub fn on_menu(&mut self, i: usize, id: u32) {
        let Some(it) = self.items.get(i).cloned() else { return };
        match id {
            1 => {
                if let Some(l) = &it.launch {
                    match it.kind {
                        Kind::Downloads | Kind::Trash => apps::open(l),
                        _ => {
                            apps::launch(l);
                            self.launching.push((l.clone(), Instant::now()));
                        }
                    }
                }
            }
            2 => {
                if let Some(l) = &it.launch {
                    if !self.pins.iter().any(|p| p.id == *l) {
                        self.pins.push(Pin { id: l.clone(), name: it.name.clone(), exe: it.exe.clone() });
                        save_pins(&self.pins);
                    }
                }
            }
            3 => {
                if let Kind::Pinned(pi) = it.kind {
                    if pi < self.pins.len() {
                        self.pins.remove(pi);
                        save_pins(&self.pins);
                    }
                }
            }
            4 => {
                for w in &it.windows {
                    apps::close(w.hwnd);
                }
            }
            5 => unsafe {
                use windows::Win32::UI::Shell::{SHEmptyRecycleBinW, SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI};
                let _ = SHEmptyRecycleBinW(None, windows::core::PCWSTR::null(), SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI);
                self.icons.forget(TRASH);
                self.dirty = true;
            },
            k if k >= 100 => {
                if let Some(w) = it.windows.get((k - 100) as usize) {
                    apps::activate(w.hwnd);
                }
            }
            _ => {}
        }
    }

    /// Glissement des icônes, grossissement au survol, point qui pulse pendant un lancement.
    pub fn animating(&self) -> bool {
        self.panel.shown
            && (self.moved_at.elapsed().as_secs_f32() < 0.32
                || self.hover_at.elapsed().as_secs_f32() < HOVER
                || self.left_hover.is_some_and(|(_, t)| t.elapsed().as_secs_f32() < HOVER)
                || !self.launching.is_empty())
    }

    pub fn frame(&mut self) -> Result<()> {
        if !self.panel.shown {
            return Ok(());
        }
        let running = self.animating();
        if !running && !self.dirty {
            return Ok(());
        }
        self.dirty = false;
        if !self.launching.is_empty() {
            self.launching.retain(|(_, t)| t.elapsed().as_secs() < 6);
            self.dirty = true;
        }
        self.draw()
    }

    fn grow(&self, i: usize) -> f32 {
        if self.hover == Some(i) {
            return GROW * ease_out(span(self.hover_at.elapsed().as_secs_f32(), 0.0, HOVER));
        }
        match self.left_hover {
            Some((j, t)) if j == i => GROW * (1.0 - ease_out(span(t.elapsed().as_secs_f32(), 0.0, HOVER))),
            _ => 0.0,
        }
    }

    fn draw(&mut self) -> Result<()> {
        let dev = self.dev.clone();
        let scale = self.panel.scale;
        let px = (ICON * (1.0 + GROW) * scale).ceil() as u32;
        // icônes chargées avant de dessiner (le cache emprunte le Dock)
        let mut bitmaps = Vec::with_capacity(self.items.len());
        for it in &self.items {
            let b = it.icon.as_ref().and_then(|src| self.icons.get(&self.panel.surface.ctx, src, px));
            bitmaps.push(b);
        }
        let s = &self.panel.surface;
        s.begin();
        s.glass(self.pill, RADIUS, 0.50)?;
        let pen = Pen::new(s, &dev.d2d);
        let white = s.brush(gfx::TEXT, 1.0)?;
        let tile = s.brush(0xFFFFFF, 0.14)?;
        let sep = s.brush(0xFFFFFF, 0.16)?;
        let mut last_group: Option<u8> = None;
        for (i, it) in self.items.iter().enumerate() {
            let slot = self.slot_rect(it);
            let group = match it.kind {
                Kind::Apps | Kind::Pinned(_) => 0u8,
                Kind::Running => 1,
                Kind::Downloads | Kind::Trash => 2,
            };
            if last_group.is_some_and(|g| g != group) {
                let x = slot.left - GAP / 2.0;
                s.line(x, slot.top + 14.0, x, slot.bottom - 14.0, &sep, 1.0);
            }
            last_group = Some(group);
            let k = 1.0 + self.grow(i);
            let size = ICON * k;
            let (cx, cy) = ((slot.left + slot.right) / 2.0, slot.top + PILL_H / 2.0 - 2.0 - (k - 1.0) * 10.0);
            let r = rect(cx - size / 2.0, cy - size / 2.0, size, size);
            match (&it.kind, &bitmaps[i]) {
                (Kind::Apps, _) => {
                    s.pill(r, 12.0 * k, &tile);
                    pen.grid(cx, cy, k, &white);
                }
                (_, Some(b)) => unsafe { s.ctx.DrawBitmap(b, Some(&r), 1.0, D2D1_INTERPOLATION_MODE_HIGH_QUALITY_CUBIC, None, None) },
                (_, None) => {
                    // pas d'icône : la première lettre sur une tuile
                    s.pill(r, 12.0 * k, &tile);
                    let letter: String = query::fold(&it.name).chars().next().map(|c| c.to_uppercase().collect()).unwrap_or_default();
                    s.text(&letter, &self.tip_text, r, &white);
                }
            }
            // un point sous les applis ouvertes ; il pulse pendant un lancement
            let launching = it.launch.as_ref().and_then(|l| self.launching.iter().find(|(id, _)| id == l));
            if !it.windows.is_empty() || launching.is_some() {
                let a = match launching {
                    Some((_, t)) if it.windows.is_empty() => 0.35 + 0.65 * (t.elapsed().as_secs_f32() * 5.0).sin().abs(),
                    _ => 0.9,
                };
                let dot = s.brush(gfx::TEXT, a)?;
                s.dot(cx, slot.bottom - 5.0, 2.0, &dot);
            }
        }
        s.end()
    }
}

impl Drop for Dock {
    fn drop(&mut self) {
        if self.registered {
            appbar::remove(self.panel.hwnd);
        }
    }
}
