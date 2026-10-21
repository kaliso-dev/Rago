//! Recherche Rago (Alt+Espace, la loupe de la barre ou « Applications » dans le Dock) : un champ au centre de l'écran.
//! Vide, il montre toutes les applis en grille ; dès qu'on tape, les applis, les pages des Paramètres, les actions du
//! PC (verrouiller, éteindre…), les fichiers récents, un calcul ou un minuteur, et la recherche sur le web. Ce qu'on
//! lance le plus remonte en tête. Rien n'est envoyé nulle part tant qu'on ne choisit pas « Rechercher sur le web ».

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use windows::core::Result;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Direct2D::Common::D2D_RECT_F;
use windows::Win32::Graphics::Direct2D::D2D1_INTERPOLATION_MODE_HIGH_QUALITY_CUBIC;
use windows::Win32::Graphics::DirectWrite::*;

use crate::apps::{Icons, Installed, TRASH};
use crate::gfx::{self, rect, Device};
use crate::icons::Pen;
use crate::panel::{inside, Panel};
use crate::query::{self, SETTINGS};
use crate::screen::Monitor;
use crate::{config, status};

const W: f32 = 680.0;
const INPUT_H: f32 = 58.0;
const PAD: f32 = 8.0;
const ROW_H: f32 = 46.0;
const MAX_ROWS: usize = 8;
const COLS: usize = 7;
const CELL_H: f32 = 98.0;
const GRID_ROWS: usize = 4;
const RADIUS: f32 = 18.0;

/// Actions du PC qu'on peut taper.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Act {
    Lock,
    Sleep,
    Restart,
    PowerOff,
    SignOut,
    Desktop,
    Capture,
    EmptyTrash,
    TaskManager,
    Optimizer,
    Notifications,
}

struct ActDef {
    act: Act,
    fr: &'static str,
    en: &'static str,
    words: &'static str,
    /// demande d'appuyer deux fois sur Entrée
    danger: bool,
}

const ACTS: &[ActDef] = &[
    ActDef { act: Act::Lock, fr: "Verrouiller l'écran", en: "Lock screen", words: "verrouiller lock bloquer session", danger: false },
    ActDef { act: Act::Sleep, fr: "Mettre en veille", en: "Sleep", words: "veille sleep dormir suspendre", danger: false },
    ActDef { act: Act::Restart, fr: "Redémarrer", en: "Restart", words: "redemarrer restart reboot", danger: true },
    ActDef { act: Act::PowerOff, fr: "Éteindre", en: "Shut down", words: "eteindre arreter shutdown power off", danger: true },
    ActDef { act: Act::SignOut, fr: "Se déconnecter", en: "Sign out", words: "deconnecter logout sign out fermer session", danger: true },
    ActDef { act: Act::Desktop, fr: "Afficher le bureau", en: "Show desktop", words: "bureau desktop reduire tout", danger: false },
    ActDef { act: Act::Capture, fr: "Capture d'écran", en: "Screenshot", words: "capture screenshot ecran snip", danger: false },
    ActDef { act: Act::EmptyTrash, fr: "Vider la corbeille", en: "Empty Recycle Bin", words: "corbeille trash recycle vider", danger: true },
    ActDef { act: Act::TaskManager, fr: "Gestionnaire des tâches", en: "Task Manager", words: "taches task manager processus taskmgr", danger: false },
    ActDef { act: Act::Optimizer, fr: "Rago Optimizer", en: "Rago Optimizer", words: "rago optimiser optimizer jeux fps", danger: false },
    ActDef { act: Act::Notifications, fr: "Notifications et calendrier", en: "Notifications and calendar", words: "notifications calendrier calendar agenda", danger: false },
];

fn act_def(a: Act) -> &'static ActDef {
    ACTS.iter().find(|d| d.act == a).expect("action connue")
}

#[derive(Debug, Clone)]
enum Found {
    App { name: String, id: String },
    Setting { name: &'static str, uri: &'static str },
    Action(Act),
    Calc(String),
    Timer(u32),
    File { name: String, path: String },
    Web(String),
}

/// Ce que le bureau doit faire du choix.
#[derive(Debug, Clone)]
pub enum Pick {
    Launch(String),
    Open(String),
    Act(Act),
    Copy(String),
    Timer(u32),
}

pub enum Reply {
    Nothing,
    Close,
    Pick(Pick),
}

#[derive(Default, Serialize, Deserialize)]
struct Usage {
    counts: HashMap<String, u32>,
}

fn usage_file() -> PathBuf {
    config::dir().join("search.json")
}

fn load_usage() -> HashMap<String, u32> {
    std::fs::read(usage_file()).ok().and_then(|b| serde_json::from_slice::<Usage>(&b).ok()).map(|u| u.counts).unwrap_or_default()
}

fn save_usage(counts: &HashMap<String, u32>) {
    let _ = std::fs::create_dir_all(config::dir());
    if let Ok(b) = serde_json::to_vec(&Usage { counts: counts.clone() }) {
        let _ = std::fs::write(usage_file(), b);
    }
}

/// Raccourcis du dossier « Récents » de Windows, du plus récent au plus ancien.
fn recent_files() -> Vec<(String, String, String)> {
    let Ok(appdata) = std::env::var("APPDATA") else { return Vec::new() };
    let dir = PathBuf::from(appdata).join(r"Microsoft\Windows\Recent");
    let Ok(rd) = std::fs::read_dir(&dir) else { return Vec::new() };
    let mut list: Vec<(std::time::SystemTime, String, String)> = rd
        .flatten()
        .filter_map(|e| {
            let path = e.path();
            if !path.extension().is_some_and(|x| x.eq_ignore_ascii_case("lnk")) {
                return None;
            }
            let modified = e.metadata().and_then(|m| m.modified()).ok()?;
            let name = path.file_stem()?.to_string_lossy().to_string();
            Some((modified, name, path.to_string_lossy().to_string()))
        })
        .collect();
    list.sort_by_key(|e| std::cmp::Reverse(e.0));
    list.into_iter().take(80).map(|(_, name, path)| (query::fold(&name), name, path)).collect()
}

/// Adresse de recherche sur le web (caractères encodés pour l'URL).
fn web_url(q: &str) -> String {
    let mut out = String::from("https://www.google.com/search?q=");
    for b in q.trim().bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            b' ' => out.push('+'),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

struct Fonts {
    input: IDWriteTextFormat,
    name: IDWriteTextFormat,
    sub: IDWriteTextFormat,
    cell: IDWriteTextFormat,
    big: IDWriteTextFormat,
}

pub struct Search {
    pub panel: Panel,
    dev: Device,
    fr: bool,
    query: String,
    high: Option<u16>,
    index: Arc<Vec<Installed>>,
    recent: Vec<(String, String, String)>,
    results: Vec<Found>,
    selected: usize,
    scroll: usize,
    armed: Option<usize>,
    caret: bool,
    last_mouse: (i32, i32),
    icons: Icons,
    fonts: Fonts,
    counts: HashMap<String, u32>,
    dirty: bool,
}

impl Search {
    pub fn open(dev: &Device, monitor: Monitor, index: Arc<Vec<Installed>>, fr: bool, windows11: bool) -> Result<Search> {
        let s = monitor.scale;
        let (pw, ph) = ((W * s).round() as i32, (INPUT_H * s).round() as i32);
        let left = (monitor.rect.left + monitor.rect.right) / 2 - pw / 2;
        let top = monitor.rect.top + ((monitor.rect.bottom - monitor.rect.top) as f32 * 0.2) as i32;
        let panel = Panel::new(dev, RECT { left, top, right: left + pw, bottom: top + ph }, s, true, windows11)?;
        let fonts = Fonts {
            input: dev.text_format(20.0, DWRITE_FONT_WEIGHT_NORMAL)?,
            name: dev.text_format(14.5, DWRITE_FONT_WEIGHT_MEDIUM)?,
            sub: dev.text_format(12.0, DWRITE_FONT_WEIGHT_NORMAL)?,
            cell: dev.text_format(11.5, DWRITE_FONT_WEIGHT_NORMAL)?,
            big: dev.text_format(15.5, DWRITE_FONT_WEIGHT_SEMI_BOLD)?,
        };
        unsafe {
            fonts.sub.SetTextAlignment(DWRITE_TEXT_ALIGNMENT_TRAILING)?;
            fonts.cell.SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER)?;
        }
        let mut search = Search {
            panel,
            dev: dev.clone(),
            fr,
            query: String::new(),
            high: None,
            index,
            recent: recent_files(),
            results: Vec::new(),
            selected: 0,
            scroll: 0,
            armed: None,
            caret: true,
            last_mouse: (-1, -1),
            icons: Icons::new(),
            fonts,
            counts: load_usage(),
            dirty: true,
        };
        search.refresh()?;
        search.draw()?;
        search.panel.show();
        Ok(search)
    }

    /// Nouvelle liste des applis (prête après l'ouverture).
    pub fn set_index(&mut self, index: Arc<Vec<Installed>>) {
        self.index = index;
        let _ = self.refresh();
    }

    fn grid(&self) -> bool {
        self.query.trim().is_empty()
    }

    fn boost(&self, key: &str) -> u32 {
        self.counts.get(key).copied().unwrap_or(0).min(20) * 8
    }

    /// Applis de la grille : les plus lancées d'abord, puis par nom.
    fn all_apps(&self) -> Vec<Found> {
        let mut v: Vec<(u32, &Installed)> = self.index.iter().map(|a| (self.counts.get(&a.id).copied().unwrap_or(0), a)).collect();
        v.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.folded.cmp(&b.1.folded)));
        v.into_iter().map(|(_, a)| Found::App { name: a.name.clone(), id: a.id.clone() }).collect()
    }

    fn find(&self) -> Vec<Found> {
        let q = query::fold(self.query.trim());
        let fr = self.fr;
        let mut scored: Vec<(u32, Found)> = Vec::new();
        for a in self.index.iter() {
            if let Some(s) = query::score(&a.name, &q) {
                scored.push((s + self.boost(&a.id), Found::App { name: a.name.clone(), id: a.id.clone() }));
            }
        }
        for st in SETTINGS {
            if let Some(s) = st.score(fr, &q) {
                scored.push((s.saturating_sub(20) + self.boost(st.uri), Found::Setting { name: st.name(fr), uri: st.uri }));
            }
        }
        for d in ACTS {
            let own = query::score(if fr { d.fr } else { d.en }, &q);
            let words = query::score(d.words, &q).map(|s| s.min(760).saturating_sub(80));
            if let Some(s) = [own, words].into_iter().flatten().max() {
                scored.push((s.saturating_sub(10) + self.boost(d.en), Found::Action(d.act)));
            }
        }
        for (folded, name, path) in &self.recent {
            if let Some(s) = query::score(folded, &q).filter(|s| *s >= 560) {
                scored.push((s.saturating_sub(90), Found::File { name: name.clone(), path: path.clone() }));
            }
        }
        scored.sort_by_key(|e| std::cmp::Reverse(e.0));
        let mut out = Vec::new();
        if let Some(v) = query::calc(&self.query) {
            out.push(Found::Calc(query::number(v, fr)));
        }
        if let Some(secs) = query::timer(&self.query) {
            out.push(Found::Timer(secs));
        }
        let room = MAX_ROWS.saturating_sub(out.len() + 1);
        out.extend(scored.into_iter().take(room).map(|(_, f)| f));
        out.push(Found::Web(self.query.trim().to_string()));
        out
    }

    /// Résultats recalculés et fenêtre à la bonne hauteur.
    fn refresh(&mut self) -> Result<()> {
        self.results = if self.grid() { self.all_apps() } else { self.find() };
        self.selected = 0;
        self.scroll = 0;
        self.armed = None;
        self.dirty = true;
        let h = self.height();
        let s = self.panel.scale;
        let mut r = self.panel.rect;
        r.bottom = r.top + (h * s).round() as i32;
        if r != self.panel.rect {
            self.panel.place(r, s)?;
        }
        self.panel.shape(rect(0.0, 0.0, W, h), RADIUS);
        Ok(())
    }

    fn height(&self) -> f32 {
        if self.grid() {
            let rows = self.results.len().div_ceil(COLS).clamp(1, GRID_ROWS);
            INPUT_H + 1.0 + rows as f32 * CELL_H + PAD
        } else {
            let rows = self.results.len().min(MAX_ROWS);
            INPUT_H + 1.0 + 4.0 + rows as f32 * ROW_H + PAD
        }
    }

    fn visible(&self) -> usize {
        if self.grid() {
            GRID_ROWS * COLS
        } else {
            MAX_ROWS
        }
    }

    /// Rangée (liste) ou case (grille) sous le point, en pixels logiques.
    fn slots(&self) -> Vec<(D2D_RECT_F, usize)> {
        let mut out = Vec::new();
        if self.grid() {
            let cw = (W - 2.0 * PAD) / COLS as f32;
            let first = self.scroll * COLS;
            for (k, i) in (first..self.results.len()).take(self.visible()).enumerate() {
                let (row, col) = (k / COLS, k % COLS);
                out.push((rect(PAD + col as f32 * cw, INPUT_H + 1.0 + row as f32 * CELL_H, cw, CELL_H), i));
            }
        } else {
            for (k, i) in (self.scroll..self.results.len()).take(MAX_ROWS).enumerate() {
                out.push((rect(PAD, INPUT_H + 5.0 + k as f32 * ROW_H, W - 2.0 * PAD, ROW_H), i));
            }
        }
        out
    }

    fn keep_visible(&mut self) {
        if self.grid() {
            let row = self.selected / COLS;
            if row < self.scroll {
                self.scroll = row;
            } else if row >= self.scroll + GRID_ROWS {
                self.scroll = row + 1 - GRID_ROWS;
            }
        } else if self.selected < self.scroll {
            self.scroll = self.selected;
        } else if self.selected >= self.scroll + MAX_ROWS {
            self.scroll = self.selected + 1 - MAX_ROWS;
        }
    }

    fn select(&mut self, i: usize) {
        let i = i.min(self.results.len().saturating_sub(1));
        if i != self.selected {
            self.selected = i;
            self.armed = None;
            self.keep_visible();
            self.dirty = true;
        }
    }

    pub fn blink(&mut self) {
        self.caret = !self.caret;
        self.dirty = true;
    }

    fn edited(&mut self) {
        self.caret = true;
        let _ = self.refresh();
    }

    pub fn on_char(&mut self, ch: u16) {
        match ch {
            // Retour arrière
            0x08 => {
                if self.query.pop().is_some() {
                    self.edited();
                }
            }
            // Ctrl+Retour arrière : le dernier mot
            0x7F => {
                let t = self.query.trim_end().len();
                let cut = self.query[..t].rfind(' ').map_or(0, |i| i + 1);
                self.query.truncate(cut);
                self.edited();
            }
            // Ctrl+V
            0x16 => {
                if let Some(text) = status::paste(self.panel.hwnd) {
                    let line: String = text.lines().next().unwrap_or("").chars().filter(|c| !c.is_control()).take(200).collect();
                    self.query.push_str(&line);
                    self.edited();
                }
            }
            0xD800..=0xDBFF => self.high = Some(ch),
            0xDC00..=0xDFFF => {
                if let Some(h) = self.high.take() {
                    if let Some(c) = char::decode_utf16([h, ch]).next().and_then(|r| r.ok()) {
                        self.query.push(c);
                        self.edited();
                    }
                }
            }
            c if c >= 0x20 => {
                if let Some(c) = char::from_u32(c as u32) {
                    if self.query.chars().count() < 200 {
                        self.query.push(c);
                        self.edited();
                    }
                }
            }
            _ => {}
        }
    }

    pub fn on_key(&mut self, vk: u32) -> Reply {
        let n = self.results.len();
        let grid = self.grid();
        match vk {
            // Échap : vide le champ, puis ferme
            0x1B => {
                if self.query.is_empty() {
                    return Reply::Close;
                }
                self.query.clear();
                self.edited();
            }
            0x0D => return self.choose(self.selected),
            0x28 if n > 0 => self.select(if grid { (self.selected + COLS).min(n - 1) } else { (self.selected + 1) % n }),
            0x26 if n > 0 => self.select(if grid { self.selected.saturating_sub(COLS) } else { (self.selected + n - 1) % n }),
            0x27 if grid && n > 0 => self.select((self.selected + 1).min(n - 1)),
            0x25 if grid => self.select(self.selected.saturating_sub(1)),
            0x22 if n > 0 => self.select((self.selected + self.visible()).min(n - 1)),
            0x21 => self.select(self.selected.saturating_sub(self.visible())),
            _ => {}
        }
        Reply::Nothing
    }

    pub fn on_mouse(&mut self, x: i32, y: i32) {
        // la fenêtre qui change de taille sous une souris immobile envoie aussi des mouvements : on les ignore
        if (x, y) == self.last_mouse {
            return;
        }
        self.last_mouse = (x, y);
        let (lx, ly) = self.panel.local(x, y);
        if let Some((_, i)) = self.slots().into_iter().find(|(r, _)| inside(r, lx, ly)) {
            self.select(i);
        }
    }

    pub fn on_click(&mut self, x: i32, y: i32) -> Reply {
        let (lx, ly) = self.panel.local(x, y);
        match self.slots().into_iter().find(|(r, _)| inside(r, lx, ly)) {
            Some((_, i)) => self.choose(i),
            None => Reply::Nothing,
        }
    }

    pub fn on_wheel(&mut self, delta: i32) {
        let n = self.results.len();
        let per_row = if self.grid() { COLS } else { 1 };
        let rows = n.div_ceil(per_row);
        let visible_rows = if self.grid() { GRID_ROWS } else { MAX_ROWS };
        let max = rows.saturating_sub(visible_rows);
        let step = if delta < 0 { 1i32 } else { -1 };
        let next = (self.scroll as i32 + step).clamp(0, max as i32) as usize;
        if next != self.scroll {
            self.scroll = next;
            // la sélection reste dans ce qui est visible
            let first = self.scroll * per_row;
            let last = (first + self.visible()).min(n).saturating_sub(1);
            self.selected = self.selected.clamp(first, last.max(first));
            self.dirty = true;
        }
    }

    fn bump(&mut self, key: &str) {
        *self.counts.entry(key.to_string()).or_insert(0) += 1;
        save_usage(&self.counts);
    }

    fn choose(&mut self, i: usize) -> Reply {
        let Some(found) = self.results.get(i).cloned() else { return Reply::Nothing };
        let pick = match found {
            Found::App { id, .. } => {
                self.bump(&id);
                Pick::Launch(id)
            }
            Found::Setting { uri, .. } => {
                self.bump(uri);
                Pick::Open(uri.to_string())
            }
            Found::Action(a) => {
                let d = act_def(a);
                if d.danger && self.armed != Some(i) {
                    self.armed = Some(i);
                    self.selected = i;
                    self.dirty = true;
                    return Reply::Nothing;
                }
                self.bump(d.en);
                Pick::Act(a)
            }
            Found::Calc(v) => Pick::Copy(v),
            Found::Timer(s) => Pick::Timer(s),
            Found::File { path, .. } => Pick::Open(path),
            Found::Web(q) => Pick::Open(web_url(&q)),
        };
        Reply::Pick(pick)
    }

    pub fn frame(&mut self) -> Result<()> {
        if self.dirty {
            self.dirty = false;
            self.draw()?;
        }
        Ok(())
    }

    fn label(&self, f: &Found) -> (String, String) {
        let fr = self.fr;
        let t = |a: &str, b: &str| if fr { a.to_string() } else { b.to_string() };
        match f {
            Found::App { name, .. } => (name.clone(), t("Application", "App")),
            Found::Setting { name, .. } => (name.to_string(), t("Paramètres", "Settings")),
            Found::Action(a) => {
                let d = act_def(*a);
                (if fr { d.fr } else { d.en }.to_string(), if d.danger { t("Entrée deux fois", "Press Enter twice") } else { t("Action", "Action") })
            }
            Found::Calc(v) => (format!("= {v}"), t("Entrée : copier", "Enter: copy")),
            Found::Timer(s) => {
                let m = s / 60;
                let text = if *s < 60 {
                    format!("{s} s")
                } else if s % 60 == 0 {
                    format!("{m} min")
                } else {
                    format!("{m} min {} s", s % 60)
                };
                (if fr { format!("Minuteur de {text}") } else { format!("{text} timer") }, t("Dynamic Island", "Dynamic Island"))
            }
            Found::File { name, .. } => (name.clone(), t("Fichier récent", "Recent file")),
            Found::Web(q) => (if fr { format!("Rechercher « {q} » sur le web") } else { format!("Search the web for “{q}”") }, "Google".into()),
        }
    }

    fn icon_source(f: &Found) -> Option<String> {
        match f {
            Found::App { id, .. } => Some(if id.contains(":\\") || id.starts_with("::") { id.clone() } else { format!("shell:AppsFolder\\{id}") }),
            Found::File { path, .. } => Some(path.clone()),
            Found::Action(Act::EmptyTrash) => Some(TRASH.into()),
            Found::Action(Act::TaskManager) => Some(r"C:\Windows\System32\Taskmgr.exe".into()),
            _ => None,
        }
    }

    fn draw(&mut self) -> Result<()> {
        let dev = self.dev.clone();
        let scale = self.panel.scale;
        let grid = self.grid();
        let slots = self.slots();
        let icon_px = ((if grid { 52.0 } else { 30.0 }) * scale).ceil() as u32;
        let mut bitmaps = Vec::with_capacity(slots.len());
        for (_, i) in &slots {
            let src = Self::icon_source(&self.results[*i]);
            bitmaps.push(src.and_then(|s| self.icons.get(&self.panel.surface.ctx, &s, icon_px)));
        }
        let h = self.panel.height();
        let s = &self.panel.surface;
        s.begin();
        s.glass(rect(0.0, 0.0, W, h), RADIUS, 0.86)?;
        let pen = Pen::new(s, &dev.d2d);
        let white = s.brush(gfx::TEXT, 1.0)?;
        let grey = s.brush(gfx::TEXT2, 1.0)?;
        let faint = s.brush(gfx::TEXT3, 1.0)?;
        let tile = s.brush(0xFFFFFF, 0.12)?;
        let line = s.brush(0xFFFFFF, 0.08)?;

        // champ de recherche
        let cy = INPUT_H / 2.0;
        pen.search(26.0, cy, 1.25, &grey);
        let tx = 50.0;
        if self.query.is_empty() {
            let hint = if self.fr { "Rechercher des applis, réglages, fichiers, calculs…" } else { "Search apps, settings, files, maths…" };
            s.text(hint, &self.fonts.input, rect(tx, 0.0, W - tx - 20.0, INPUT_H), &faint);
        } else {
            s.text(&self.query, &self.fonts.input, rect(tx, 0.0, W - tx - 20.0, INPUT_H), &white);
        }
        if self.caret {
            let cx = (tx + dev.measure(&self.query, &self.fonts.input) + 1.0).min(W - 20.0);
            s.line(cx, cy - 11.0, cx, cy + 11.0, &white, 1.5);
        }
        s.line(0.0, INPUT_H + 0.5, W, INPUT_H + 0.5, &line, 1.0);

        if grid && self.results.is_empty() {
            let msg = if self.fr { "Chargement des applis…" } else { "Loading apps…" };
            s.text(msg, &self.fonts.cell, rect(0.0, INPUT_H + 1.0, W, CELL_H), &grey);
        }
        for (k, (r, i)) in slots.iter().enumerate() {
            let f = &self.results[*i];
            let selected = *i == self.selected;
            let armed = self.armed == Some(*i);
            if selected {
                let bg = if armed { s.brush(gfx::RED, 0.85)? } else { s.brush(0xFFFFFF, 0.13)? };
                s.pill(*r, if grid { 12.0 } else { 9.0 }, &bg);
            }
            let (name, sub) = self.label(f);
            if grid {
                let size = 52.0;
                let icon = rect((r.left + r.right) / 2.0 - size / 2.0, r.top + 10.0, size, size);
                match &bitmaps[k] {
                    Some(b) => unsafe { s.ctx.DrawBitmap(b, Some(&icon), 1.0, D2D1_INTERPOLATION_MODE_HIGH_QUALITY_CUBIC, None, None) },
                    None => {
                        s.pill(icon, 13.0, &tile);
                        let letter: String = name.chars().next().map(|c| c.to_uppercase().collect()).unwrap_or_default();
                        s.text(&letter, &self.fonts.cell, icon, &white);
                    }
                }
                s.text(&name, &self.fonts.cell, rect(r.left + 4.0, r.top + 66.0, r.right - r.left - 8.0, 22.0), &white);
                continue;
            }
            let icon = rect(r.left + 10.0, r.top + (ROW_H - 30.0) / 2.0, 30.0, 30.0);
            let (icx, icy) = ((icon.left + icon.right) / 2.0, (icon.top + icon.bottom) / 2.0);
            match (&bitmaps[k], f) {
                (Some(b), _) => unsafe { s.ctx.DrawBitmap(b, Some(&icon), 1.0, D2D1_INTERPOLATION_MODE_HIGH_QUALITY_CUBIC, None, None) },
                (None, Found::Calc(_)) => {
                    s.pill(icon, 8.0, &tile);
                    s.text("=", &self.fonts.big, icon, &white);
                }
                (None, other) => {
                    s.pill(icon, 8.0, &tile);
                    match other {
                        Found::Setting { .. } => pen.gear(icx, icy, 1.0, &white),
                        Found::Timer(_) => pen.timer(icx, icy, 1.0, &white),
                        Found::Web(_) => pen.search(icx + 1.0, icy + 1.0, 1.0, &white),
                        Found::Action(Act::Lock) | Found::Action(Act::SignOut) => pen.lock(icx, icy, 1.0, &white)?,
                        Found::Action(Act::Sleep) => pen.moon(icx, icy, 1.0, &white)?,
                        Found::Action(Act::Restart) | Found::Action(Act::PowerOff) => pen.power(icx, icy, 1.0, &white)?,
                        Found::Action(Act::Desktop) => pen.desktop(icx, icy, 1.0, &white),
                        Found::Action(Act::Capture) => pen.capture(icx, icy, 1.0, &white)?,
                        Found::Action(Act::Notifications) => pen.timer(icx, icy, 1.0, &white),
                        _ => pen.grid(icx, icy, 0.7, &white),
                    }
                }
            }
            let name = if armed {
                let d = if let Found::Action(a) = f { act_def(*a) } else { act_def(Act::PowerOff) };
                if self.fr {
                    format!("Appuyez encore sur Entrée : {}", d.fr.to_lowercase())
                } else {
                    format!("Press Enter again to {}", d.en.to_lowercase())
                }
            } else {
                name
            };
            let big = matches!(f, Found::Calc(_));
            s.text(&name, if big { &self.fonts.big } else { &self.fonts.name }, rect(r.left + 52.0, r.top, r.right - r.left - 200.0, ROW_H), &white);
            s.text(&sub, &self.fonts.sub, rect(r.right - 150.0, r.top, 138.0, ROW_H), if selected { &grey } else { &faint });
        }
        // barre de défilement discrète
        let per_row = if grid { COLS } else { 1 };
        let rows = self.results.len().div_ceil(per_row);
        let visible_rows = if grid { GRID_ROWS } else { MAX_ROWS };
        if rows > visible_rows {
            let track_top = INPUT_H + 8.0;
            let track_h = h - track_top - 10.0;
            let thumb_h = (track_h * visible_rows as f32 / rows as f32).max(24.0);
            let y = track_top + (track_h - thumb_h) * self.scroll as f32 / (rows - visible_rows) as f32;
            let thumb = s.brush(0xFFFFFF, 0.22)?;
            s.pill(rect(W - 6.0, y, 3.0, thumb_h), 1.5, &thumb);
        }
        s.end()
    }
}
