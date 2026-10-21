//! Pictogrammes de Rago OS, dessinés au trait (aucune image) : ils restent nets à toutes les échelles d'écran.

use windows::core::Result;
use windows::Win32::Graphics::Direct2D::Common::*;
use windows::Win32::Graphics::Direct2D::*;
use windows_numerics::Vector2;

use crate::gfx::{rect, Surface};

fn v(x: f32, y: f32) -> Vector2 {
    Vector2 { X: x, Y: y }
}

pub struct Pen<'a> {
    pub s: &'a Surface,
    pub d2d: &'a ID2D1Factory1,
    round: Option<ID2D1StrokeStyle>,
}

impl<'a> Pen<'a> {
    pub fn new(s: &'a Surface, d2d: &'a ID2D1Factory1) -> Pen<'a> {
        let props = D2D1_STROKE_STYLE_PROPERTIES {
            startCap: D2D1_CAP_STYLE_ROUND,
            endCap: D2D1_CAP_STYLE_ROUND,
            dashCap: D2D1_CAP_STYLE_ROUND,
            lineJoin: D2D1_LINE_JOIN_ROUND,
            miterLimit: 1.0,
            dashStyle: D2D1_DASH_STYLE_SOLID,
            dashOffset: 0.0,
        };
        let round = unsafe { ID2D1Factory::CreateStrokeStyle(d2d, &props, None) }.ok();
        Pen { s, d2d, round }
    }

    fn line(&self, a: (f32, f32), b: (f32, f32), brush: &ID2D1Brush, w: f32) {
        unsafe { self.s.ctx.DrawLine(v(a.0, a.1), v(b.0, b.1), brush, w, self.round.as_ref()) }
    }

    fn path(&self, pts: &[(f32, f32)], closed: bool) -> Result<ID2D1PathGeometry1> {
        unsafe {
            let g = self.d2d.CreatePathGeometry()?;
            let sink = g.Open()?;
            sink.BeginFigure(v(pts[0].0, pts[0].1), if closed { D2D1_FIGURE_BEGIN_FILLED } else { D2D1_FIGURE_BEGIN_HOLLOW });
            for p in &pts[1..] {
                sink.AddLine(v(p.0, p.1));
            }
            sink.EndFigure(if closed { D2D1_FIGURE_END_CLOSED } else { D2D1_FIGURE_END_OPEN });
            sink.Close()?;
            Ok(g)
        }
    }

    fn stroke(&self, pts: &[(f32, f32)], brush: &ID2D1Brush, w: f32) -> Result<()> {
        let g = self.path(pts, false)?;
        unsafe { self.s.ctx.DrawGeometry(&g, brush, w, self.round.as_ref()) };
        Ok(())
    }

    fn fill(&self, pts: &[(f32, f32)], brush: &ID2D1Brush) -> Result<()> {
        let g = self.path(pts, true)?;
        unsafe { self.s.ctx.FillGeometry(&g, brush, None) };
        Ok(())
    }

    /// Arc de cercle de centre (cx, cy), de l'angle `a0` à `a1` (radians, 0 à droite, sens horaire à l'écran).
    #[allow(clippy::too_many_arguments)]
    fn arc(&self, cx: f32, cy: f32, r: f32, a0: f32, a1: f32, brush: &ID2D1Brush, w: f32) -> Result<()> {
        unsafe {
            let g = self.d2d.CreatePathGeometry()?;
            let sink = g.Open()?;
            sink.BeginFigure(v(cx + r * a0.cos(), cy + r * a0.sin()), D2D1_FIGURE_BEGIN_HOLLOW);
            sink.AddArc(&D2D1_ARC_SEGMENT {
                point: v(cx + r * a1.cos(), cy + r * a1.sin()),
                size: D2D_SIZE_F { width: r, height: r },
                rotationAngle: 0.0,
                sweepDirection: D2D1_SWEEP_DIRECTION_CLOCKWISE,
                arcSize: if (a1 - a0).abs() > std::f32::consts::PI { D2D1_ARC_SIZE_LARGE } else { D2D1_ARC_SIZE_SMALL },
            });
            sink.EndFigure(D2D1_FIGURE_END_OPEN);
            sink.Close()?;
            self.s.ctx.DrawGeometry(&g, brush, w, self.round.as_ref());
            Ok(())
        }
    }

    /// Loupe.
    pub fn search(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        self.s.ring(cx - 1.5 * k, cy - 1.5 * k, 4.6 * k, b, 1.6 * k);
        self.line((cx + 1.9 * k, cy + 1.9 * k), (cx + 5.5 * k, cy + 5.5 * k), b, 1.8 * k);
    }

    /// Centre de contrôle : deux interrupteurs.
    pub fn control(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        let (w, h) = (13.0 * k, 5.0 * k);
        self.s.outline(rect(cx - w / 2.0, cy - 6.0 * k, w, h), h / 2.0, b, 1.3 * k);
        self.s.dot(cx + w / 2.0 - h / 2.0, cy - 6.0 * k + h / 2.0, 1.6 * k, b);
        self.s.outline(rect(cx - w / 2.0, cy + 1.0 * k, w, h), h / 2.0, b, 1.3 * k);
        self.s.dot(cx - w / 2.0 + h / 2.0, cy + 1.0 * k + h / 2.0, 1.6 * k, b);
    }

    /// Wi‑Fi : trois ondes et un point ; `on` faux : barré.
    pub fn wifi(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush, dim: &ID2D1Brush, on: bool) -> Result<()> {
        let base = cy + 5.0 * k;
        let (a0, a1) = (-std::f32::consts::PI * 0.78, -std::f32::consts::PI * 0.22);
        for (i, r) in [3.6f32, 7.0, 10.4].into_iter().enumerate() {
            let brush = if on || i == 0 { b } else { dim };
            self.arc(cx, base, r * k, a0, a1, brush, 1.6 * k)?;
        }
        self.s.dot(cx, base, 1.2 * k, b);
        if !on {
            self.line((cx - 7.0 * k, cy - 5.0 * k), (cx + 7.0 * k, cy + 6.0 * k), b, 1.4 * k);
        }
        Ok(())
    }

    /// Réseau par câble : trois cases reliées.
    pub fn wired(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        let s = 4.2 * k;
        self.s.outline(rect(cx - s / 2.0, cy - 6.5 * k, s, s), 1.0 * k, b, 1.3 * k);
        self.s.outline(rect(cx - 6.5 * k - s / 2.0, cy + 2.5 * k, s, s), 1.0 * k, b, 1.3 * k);
        self.s.outline(rect(cx + 6.5 * k - s / 2.0, cy + 2.5 * k, s, s), 1.0 * k, b, 1.3 * k);
        self.line((cx, cy - 2.3 * k), (cx, cy), b, 1.3 * k);
        self.line((cx - 6.5 * k, cy), (cx + 6.5 * k, cy), b, 1.3 * k);
        self.line((cx - 6.5 * k, cy), (cx - 6.5 * k, cy + 2.5 * k), b, 1.3 * k);
        self.line((cx + 6.5 * k, cy), (cx + 6.5 * k, cy + 2.5 * k), b, 1.3 * k);
    }

    /// Pas de réseau : globe barré.
    pub fn offline(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        self.s.ring(cx, cy, 6.0 * k, b, 1.3 * k);
        self.line((cx - 6.0 * k, cy), (cx + 6.0 * k, cy), b, 1.1 * k);
        self.line((cx - 5.0 * k, cy + 5.0 * k), (cx + 5.0 * k, cy - 5.0 * k), b, 1.4 * k);
    }

    /// Batterie remplie à `pct` %, éclair si elle charge.
    #[allow(clippy::too_many_arguments)]
    pub fn battery(&self, x: f32, cy: f32, k: f32, pct: u8, charging: bool, b: &ID2D1Brush, fill: &ID2D1Brush) -> Result<()> {
        let (w, h) = (22.0 * k, 11.0 * k);
        let r = rect(x, cy - h / 2.0, w, h);
        self.s.outline(r, 3.0 * k, b, 1.2 * k);
        self.s.pill(rect(x + w + 1.2 * k, cy - 2.2 * k, 1.8 * k, 4.4 * k), 0.9 * k, b);
        let inner = (w - 4.0 * k) * (pct as f32 / 100.0).clamp(0.04, 1.0);
        self.s.pill(rect(x + 2.0 * k, cy - h / 2.0 + 2.0 * k, inner, h - 4.0 * k), 1.6 * k, fill);
        if charging {
            let (bx, by) = (x + w / 2.0, cy);
            self.fill(&[(bx + 1.2 * k, by - 4.6 * k), (bx - 2.6 * k, by + 0.6 * k), (bx - 0.2 * k, by + 0.6 * k), (bx - 1.2 * k, by + 4.6 * k), (bx + 2.6 * k, by - 0.6 * k), (bx + 0.2 * k, by - 0.6 * k)], b)?;
        }
        Ok(())
    }

    /// Haut-parleur avec une, deux ou trois ondes selon le volume ; barré s'il est coupé.
    pub fn speaker(&self, x: f32, cy: f32, k: f32, level: f32, muted: bool, b: &ID2D1Brush) -> Result<()> {
        self.fill(&[(x, cy - 2.6 * k), (x + 3.2 * k, cy - 2.6 * k), (x + 7.0 * k, cy - 6.0 * k), (x + 7.0 * k, cy + 6.0 * k), (x + 3.2 * k, cy + 2.6 * k), (x, cy + 2.6 * k)], b)?;
        if muted {
            self.line((x + 10.0 * k, cy - 3.0 * k), (x + 16.0 * k, cy + 3.0 * k), b, 1.5 * k);
            self.line((x + 16.0 * k, cy - 3.0 * k), (x + 10.0 * k, cy + 3.0 * k), b, 1.5 * k);
            return Ok(());
        }
        let waves = if level <= 0.001 { 0 } else if level < 0.34 { 1 } else if level < 0.67 { 2 } else { 3 };
        for i in 0..waves {
            let r = (3.6 + i as f32 * 3.0) * k;
            self.arc(x + 7.4 * k, cy, r, -0.85, 0.85, b, 1.4 * k)?;
        }
        Ok(())
    }

    /// Chevron vers le haut (barre des tâches de Windows) ou vers le bas.
    pub fn chevron(&self, cx: f32, cy: f32, k: f32, up: bool, b: &ID2D1Brush) -> Result<()> {
        let d = if up { 1.0 } else { -1.0 };
        self.stroke(&[(cx - 5.0 * k, cy + 2.5 * k * d), (cx, cy - 2.5 * k * d), (cx + 5.0 * k, cy + 2.5 * k * d)], b, 1.6 * k)
    }

    /// Grille de neuf points : toutes les applis.
    pub fn grid(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        for i in 0..3 {
            for j in 0..3 {
                let (x, y) = (cx + (i as f32 - 1.0) * 7.5 * k, cy + (j as f32 - 1.0) * 7.5 * k);
                self.s.pill(rect(x - 2.6 * k, y - 2.6 * k, 5.2 * k, 5.2 * k), 1.6 * k, b);
            }
        }
    }

    pub fn lock(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) -> Result<()> {
        self.s.pill(rect(cx - 5.5 * k, cy - 1.0 * k, 11.0 * k, 8.0 * k), 2.0 * k, b);
        self.arc(cx, cy - 2.0 * k, 3.6 * k, std::f32::consts::PI, 2.0 * std::f32::consts::PI, b, 1.5 * k)?;
        self.line((cx - 3.6 * k, cy - 2.0 * k), (cx - 3.6 * k, cy - 0.5 * k), b, 1.5 * k);
        self.line((cx + 3.6 * k, cy - 2.0 * k), (cx + 3.6 * k, cy - 0.5 * k), b, 1.5 * k);
        Ok(())
    }

    /// Capture : coins de cadre.
    pub fn capture(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) -> Result<()> {
        let (w, h, c) = (7.0 * k, 5.5 * k, 3.0 * k);
        for (sx, sy) in [(-1.0f32, -1.0f32), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)] {
            let (x, y) = (cx + sx * w, cy + sy * h);
            self.stroke(&[(x, y - sy * c), (x, y), (x - sx * c, y)], b, 1.5 * k)?;
        }
        self.s.dot(cx, cy, 1.8 * k, b);
        Ok(())
    }

    /// Bureau : un écran et son pied.
    pub fn desktop(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        self.s.outline(rect(cx - 7.0 * k, cy - 5.5 * k, 14.0 * k, 9.5 * k), 1.6 * k, b, 1.4 * k);
        self.line((cx - 3.0 * k, cy + 6.5 * k), (cx + 3.0 * k, cy + 6.5 * k), b, 1.4 * k);
    }

    /// Roue dentée simplifiée : paramètres.
    pub fn gear(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        for i in 0..8 {
            let a = i as f32 * std::f32::consts::PI / 4.0;
            self.line((cx + 4.2 * k * a.cos(), cy + 4.2 * k * a.sin()), (cx + 7.0 * k * a.cos(), cy + 7.0 * k * a.sin()), b, 2.2 * k);
        }
        self.s.ring(cx, cy, 4.4 * k, b, 1.6 * k);
        self.s.dot(cx, cy, 1.6 * k, b);
    }

    /// Bluetooth (la rune, au trait).
    pub fn bluetooth(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) -> Result<()> {
        self.stroke(&[(cx - 4.0 * k, cy - 3.6 * k), (cx + 4.0 * k, cy + 3.6 * k), (cx, cy + 7.2 * k), (cx, cy - 7.2 * k), (cx + 4.0 * k, cy - 3.6 * k), (cx - 4.0 * k, cy + 3.6 * k)], b, 1.5 * k)
    }

    /// Minuteur : cadran et aiguille.
    pub fn timer(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        self.s.ring(cx, cy + 1.0 * k, 6.5 * k, b, 1.5 * k);
        self.line((cx, cy + 1.0 * k), (cx, cy - 2.6 * k), b, 1.5 * k);
        self.line((cx - 2.0 * k, cy - 7.5 * k), (cx + 2.0 * k, cy - 7.5 * k), b, 1.5 * k);
    }

    /// Lune : veille.
    pub fn moon(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) -> Result<()> {
        self.arc(cx, cy, 6.5 * k, -1.9, 2.4, b, 1.6 * k)?;
        self.arc(cx + 3.6 * k, cy - 2.4 * k, 5.0 * k, 2.4, 4.4, b, 1.6 * k)
    }

    /// Marche/arrêt : cercle ouvert et trait.
    pub fn power(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) -> Result<()> {
        self.arc(cx, cy + 0.8 * k, 6.2 * k, -std::f32::consts::FRAC_PI_2 + 0.75, -std::f32::consts::FRAC_PI_2 - 0.75 + 2.0 * std::f32::consts::PI, b, 1.6 * k)?;
        self.line((cx, cy - 7.0 * k), (cx, cy - 0.5 * k), b, 1.6 * k);
        Ok(())
    }

    /// Lecture.
    pub fn play(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) -> Result<()> {
        self.fill(&[(cx - 4.0 * k, cy - 6.0 * k), (cx + 6.0 * k, cy), (cx - 4.0 * k, cy + 6.0 * k)], b)
    }

    pub fn pause(&self, cx: f32, cy: f32, k: f32, b: &ID2D1Brush) {
        self.s.pill(rect(cx - 5.0 * k, cy - 6.0 * k, 3.6 * k, 12.0 * k), 1.0 * k, b);
        self.s.pill(rect(cx + 1.4 * k, cy - 6.0 * k, 3.6 * k, 12.0 * k), 1.0 * k, b);
    }

    /// Morceau suivant (`forward`) ou précédent : deux triangles.
    pub fn skip(&self, cx: f32, cy: f32, k: f32, forward: bool, b: &ID2D1Brush) -> Result<()> {
        let d = if forward { 1.0 } else { -1.0 };
        for off in [-4.5f32, 3.5] {
            let x = cx + off * k * d;
            self.fill(&[(x - 4.0 * k * d, cy - 5.0 * k), (x + 4.0 * k * d, cy), (x - 4.0 * k * d, cy + 5.0 * k)], b)?;
        }
        Ok(())
    }
}
