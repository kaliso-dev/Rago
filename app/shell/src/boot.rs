//! Animation de démarrage de Rago OS. À l'ouverture de session, elle couvre le bureau pendant que Windows le charge
//! (barre des tâches, icônes, applis au démarrage), puis le dévoile : le R de Rago apparaît avec la signature « Pulse »
//! de la marque (ondes rondes qui partent du R), le mot « Rago OS », une ligne de chargement, puis tout s'efface en
//! avançant vers le joueur. Un clic ou Échap passe. Dessinée par le GPU, environ 3 secondes, puis tout est libéré.

use std::time::Instant;

use windows::core::Result;
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Direct2D::Common::{D2D1_GRADIENT_STOP, D2D_RECT_F};
use windows::Win32::Graphics::Direct2D::*;
use windows::Win32::Graphics::DirectWrite::{DWRITE_FONT_WEIGHT_NORMAL, DWRITE_TEXT_ALIGNMENT_CENTER};
use windows::Win32::UI::WindowsAndMessaging::{DestroyWindow, SetForegroundWindow, ShowWindow, SW_SHOW};
use windows_numerics::{Matrix3x2, Vector2};

use crate::gfx::{self, ease_in_out, ease_out, rgba, span, Device, Surface};
use crate::logo;
use crate::screen;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Logon,
    Welcome,
    Preview,
}

struct Win {
    hwnd: HWND,
    surface: Surface,
    /// taille en pixels logiques
    w: f32,
    h: f32,
    primary: bool,
}

pub struct Boot {
    mode: Mode,
    wins: Vec<Win>,
    start: Instant,
    mark: ID2D1PathGeometry1,
    word: ID2D1PathGeometry1,
    tagline: Option<(String, windows::Win32::Graphics::DirectWrite::IDWriteTextFormat)>,
    /// instant (s) où le bureau est prêt : la ligne se remplit puis la sortie commence
    ready: Option<f32>,
    skipped: bool,
}

/// Durées en secondes.
const FILL: f32 = 0.35;
const OUTRO: f32 = 0.75;
/// à l'ouverture de session : jamais plus longtemps, même si l'Explorateur tarde
const MAX_WAIT: f32 = 9.0;

impl Boot {
    pub fn new(dev: &Device, mode: Mode, fr: bool) -> Result<Boot> {
        let mut wins = Vec::new();
        for m in screen::monitors() {
            let (pw, ph) = (m.rect.right - m.rect.left, m.rect.bottom - m.rect.top);
            let hwnd = crate::host::window(m.rect.left, m.rect.top, pw, ph, true)?;
            let surface = Surface::new(dev, hwnd, pw as u32, ph as u32, m.scale)?;
            let win = Win { hwnd, surface, w: pw as f32 / m.scale, h: ph as f32 / m.scale, primary: m.primary };
            wins.push(win);
        }
        let tagline = match mode {
            Mode::Logon => None,
            Mode::Welcome => Some(if fr { "Ton PC est prêt." } else { "Your PC is ready." }),
            Mode::Preview => Some("Every millisecond counts."),
        };
        let tagline = match tagline {
            Some(t) => {
                let f = dev.text_format(15.0, DWRITE_FONT_WEIGHT_NORMAL)?;
                unsafe { f.SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER)? };
                Some((t.to_string(), f))
            }
            None => None,
        };
        let boot = Boot { mode, wins, start: Instant::now(), mark: dev.mark()?, word: dev.word()?, tagline, ready: None, skipped: false };
        // première image avant d'afficher : jamais de fenêtre vide
        boot.draw_all(0.0);
        for w in &boot.wins {
            unsafe {
                let _ = ShowWindow(w.hwnd, SW_SHOW);
            }
        }
        if let Some(w) = boot.wins.iter().find(|w| w.primary) {
            unsafe {
                let _ = SetForegroundWindow(w.hwnd);
            }
        }
        Ok(boot)
    }

    pub fn owns(&self, hwnd: isize) -> bool {
        self.wins.iter().any(|w| w.hwnd.0 as isize == hwnd)
    }

    pub fn skip(&mut self) {
        if !self.skipped {
            self.skipped = true;
            let t = self.start.elapsed().as_secs_f32();
            if self.ready.is_none_or(|r| r > t) {
                self.ready = Some(t);
            }
        }
    }

    /// Une image. false : l'animation est finie (fenêtres fermées).
    pub fn frame(&mut self, shell_ready: bool) -> bool {
        let t = self.start.elapsed().as_secs_f32();
        if self.ready.is_none() {
            let due = match self.mode {
                // le bureau est là (barre des tâches créée) et l'animation a eu le temps de se poser
                Mode::Logon => (shell_ready && t >= 2.6) || t >= MAX_WAIT,
                Mode::Welcome => t >= 3.0,
                Mode::Preview => t >= 2.8,
            };
            if due {
                self.ready = Some(t);
            }
        }
        if let Some(r) = self.ready {
            let fill = if self.skipped { 0.0 } else { FILL };
            if t > r + fill + OUTRO {
                return false;
            }
        }
        self.draw_all(t);
        true
    }

    fn draw_all(&self, t: f32) {
        for w in &self.wins {
            let _ = self.draw(w, t);
        }
    }

    fn draw(&self, win: &Win, t: f32) -> Result<()> {
        let s = &win.surface;
        let (w, h) = (win.w, win.h);
        let fill_time = if self.skipped { 0.0 } else { FILL };
        // sortie : 0 → 1
        let out = self.ready.map_or(0.0, |r| ease_in_out(span(t, r + fill_time, r + fill_time + if self.skipped { 0.45 } else { OUTRO })));
        // fond : opaque tout de suite à l'ouverture de session (le bureau qui se charge reste caché), en fondu sinon
        let bg = if self.mode == Mode::Logon { 1.0 } else { ease_out(span(t, 0.0, 0.3)) } * (1.0 - out);
        s.begin();
        unsafe {
            let ink = s.brush(gfx::INK, bg)?;
            s.ctx.FillRectangle(&gfx::rect(0.0, 0.0, w, h), &ink);
        }
        let unit = w.min(h);
        let mark_h = (unit * 0.11).clamp(64.0, 180.0);
        let (cx, cy) = (w / 2.0, h / 2.0 - mark_h * 0.42);
        // lueur rouge derrière le R, qui respire doucement pendant l'attente
        let glow = ease_out(span(t, 0.1, 1.2)) * bg * (1.0 + 0.06 * (t * std::f32::consts::TAU / 3.0).sin());
        if glow > 0.001 {
            let stops = [
                D2D1_GRADIENT_STOP { position: 0.0, color: rgba(gfx::RED, 0.20 * glow) },
                D2D1_GRADIENT_STOP { position: 0.45, color: rgba(gfx::RED_DEEP, 0.07 * glow) },
                D2D1_GRADIENT_STOP { position: 1.0, color: rgba(gfx::RED, 0.0) },
            ];
            unsafe {
                let coll = ID2D1RenderTarget::CreateGradientStopCollection(&s.ctx, &stops, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP)?;
                let r = unit * if win.primary { 0.55 } else { 0.4 };
                let props = D2D1_RADIAL_GRADIENT_BRUSH_PROPERTIES {
                    center: Vector2 { X: cx, Y: if win.primary { cy } else { h / 2.0 } },
                    gradientOriginOffset: Vector2 { X: 0.0, Y: 0.0 },
                    radiusX: r,
                    radiusY: r,
                };
                let brush = s.ctx.CreateRadialGradientBrush(&props, None, &coll)?;
                s.ctx.FillRectangle(&gfx::rect(0.0, 0.0, w, h), &brush);
            }
        }
        if win.primary {
            self.draw_content(s, t, cx, cy, mark_h, out)?;
        }
        s.end()
    }

    fn draw_content(&self, s: &Surface, t: f32, cx: f32, cy: f32, mark_h: f32, out: f32) -> Result<()> {
        let fade = 1.0 - out;
        // ondes « Pulse » : trois cercles rouges qui partent du R et s'effacent (1600 ms en boucle)
        let pulse_end = self.ready.unwrap_or(f32::MAX);
        for k in 0..3 {
            let born = 0.55 + k as f32 * 0.53;
            if t < born {
                continue;
            }
            let cycle = (t - born) / 1.6;
            // plus de nouvelle onde après la fin de l'attente : la dernière finit sa course
            if born + cycle.floor() * 1.6 > pulse_end {
                continue;
            }
            let p = cycle.fract();
            let radius = mark_h * (0.62 + p * 1.9);
            let a = (1.0 - p).powi(2) * 0.55 * fade;
            unsafe {
                let b = s.brush(gfx::RED, a)?;
                let e = D2D1_ELLIPSE { point: Vector2 { X: cx, Y: cy }, radiusX: radius, radiusY: radius };
                s.ctx.DrawEllipse(&e, &b, 2.0, None);
            }
        }
        // le R : arrive en grandissant, repart en avançant
        let grow = 0.84 + 0.16 * ease_out(span(t, 0.12, 0.9));
        let zoom = 1.0 + 0.08 * out;
        let k = mark_h / logo::MARK_H * grow * zoom;
        let a_mark = ease_out(span(t, 0.12, 0.6)) * fade;
        s.transform(gfx::place(logo::MARK_W, logo::MARK_H, k, cx, cy));
        unsafe {
            let red = s.brush(gfx::RED, a_mark)?;
            s.ctx.FillGeometry(&self.mark, &red, None);
        }
        // « Rago OS » qui monte en apparaissant
        let cap = mark_h * 0.30 * zoom;
        let rise = 14.0 * (1.0 - ease_out(span(t, 0.7, 1.3)));
        let top = cy + mark_h * zoom / 2.0 + mark_h * 0.36 + rise;
        let a_word = ease_out(span(t, 0.7, 1.3)) * fade;
        s.transform(gfx::place(logo::WORD_W, 1.0, cap, cx, top + cap / 2.0));
        unsafe {
            let white = s.brush(gfx::TEXT, a_word)?;
            s.ctx.FillGeometry(&self.word, &white, None);
        }
        s.transform(Matrix3x2::identity());
        let mut y = top + cap + mark_h * 0.34;
        if let Some((text, format)) = &self.tagline {
            let a = ease_out(span(t, 1.2, 1.7)) * fade;
            let b = s.brush(gfx::TEXT3, a)?;
            s.text(text, format, D2D_RECT_F { left: cx - 300.0, top: y - 4.0, right: cx + 300.0, bottom: y + 20.0 }, &b);
            y += 34.0;
        }
        if self.mode != Mode::Preview {
            // ligne de chargement : un trait rouge qui va et vient, puis se remplit quand le bureau est prêt
            let (lw, lh) = (140.0, 3.0);
            let a = ease_out(span(t, 1.0, 1.4)) * fade;
            let track = s.brush(gfx::TEXT, 0.08 * a)?;
            let red = s.brush(gfx::RED, a)?;
            let x0 = cx - lw / 2.0;
            s.pill(gfx::rect(x0, y, lw, lh), lh / 2.0, &track);
            let seg = 46.0;
            let swing = ((t * 2.2).sin() + 1.0) / 2.0;
            let (mut sx, mut sw) = (x0 + swing * (lw - seg), seg);
            if let Some(r) = self.ready {
                let f = ease_out(span(t, r, r + FILL));
                sx += (x0 - sx) * f;
                sw += (lw - sw) * f;
            }
            s.pill(gfx::rect(sx, y, sw, lh), lh / 2.0, &red);
        }
        Ok(())
    }
}

impl Drop for Boot {
    fn drop(&mut self) {
        for w in &self.wins {
            unsafe {
                let _ = DestroyWindow(w.hwnd);
            }
        }
    }
}
