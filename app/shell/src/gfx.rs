//! Dessin des fenêtres de Rago Shell : Direct2D sur une chaîne d'échange DirectComposition à alpha prémultiplié. Le
//! GPU compose la fenêtre avec le bureau, transparence comprise, sans copie d'écran ni flou calculé par l'app.

use std::mem::ManuallyDrop;

use windows::core::{Interface, Result, HSTRING, PCWSTR};
use windows::Win32::Foundation::{HMODULE, HWND};
use windows::Win32::Graphics::Direct2D::Common::*;
use windows::Win32::Graphics::Direct2D::*;
use windows::Win32::Graphics::Direct3D::{D3D_DRIVER_TYPE_HARDWARE, D3D_DRIVER_TYPE_WARP};
use windows::Win32::Graphics::Direct3D11::{D3D11CreateDevice, ID3D11Device, D3D11_CREATE_DEVICE_BGRA_SUPPORT, D3D11_SDK_VERSION};
use windows::Win32::Graphics::DirectComposition::{DCompositionCreateDevice, IDCompositionDevice, IDCompositionTarget, IDCompositionVisual};
use windows::Win32::Graphics::DirectWrite::*;
use windows::Win32::Graphics::Dxgi::Common::*;
use windows::Win32::Graphics::Dxgi::*;
use windows_numerics::{Matrix3x2, Vector2};

use crate::logo;

pub fn rgba(hex: u32, a: f32) -> D2D1_COLOR_F {
    D2D1_COLOR_F {
        r: ((hex >> 16) & 0xFF) as f32 / 255.0,
        g: ((hex >> 8) & 0xFF) as f32 / 255.0,
        b: (hex & 0xFF) as f32 / 255.0,
        a,
    }
}

pub const RED: u32 = 0xFF3B30;
pub const RED_DEEP: u32 = 0xC9221A;
pub const INK: u32 = 0x070708;
pub const TEXT: u32 = 0xF5F5F6;
pub const TEXT2: u32 = 0xA1A1AA;
pub const TEXT3: u32 = 0x7C7C86;
/// teinte du verre (posée sur le flou de Windows)
pub const GLASS: u32 = 0x1C1C21;

pub fn rect(x: f32, y: f32, w: f32, h: f32) -> D2D_RECT_F {
    D2D_RECT_F { left: x, top: y, right: x + w, bottom: y + h }
}

/// Appareil graphique partagé par toutes les fenêtres (les copies partagent les mêmes objets).
#[derive(Clone)]
pub struct Device {
    pub d2d: ID2D1Factory1,
    pub dwrite: IDWriteFactory,
    pub dcomp: IDCompositionDevice,
    dxgi: IDXGIDevice,
    factory: IDXGIFactory2,
    d2d_device: ID2D1Device,
    _d3d: ID3D11Device,
    /// police de l'interface : Segoe UI Variable (Windows 11), sinon Segoe UI
    pub font: HSTRING,
}

impl Device {
    pub fn new() -> Result<Self> {
        unsafe {
            let mut d3d = None;
            let flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
            if D3D11CreateDevice(None, D3D_DRIVER_TYPE_HARDWARE, HMODULE::default(), flags, None, D3D11_SDK_VERSION, Some(&mut d3d), None, None).is_err() {
                D3D11CreateDevice(None, D3D_DRIVER_TYPE_WARP, HMODULE::default(), flags, None, D3D11_SDK_VERSION, Some(&mut d3d), None, None)?;
            }
            let d3d: ID3D11Device = d3d.expect("appareil D3D11");
            let dxgi: IDXGIDevice = d3d.cast()?;
            let factory: IDXGIFactory2 = CreateDXGIFactory2(DXGI_CREATE_FACTORY_FLAGS(0))?;
            let d2d: ID2D1Factory1 = D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, None)?;
            let d2d_device = d2d.CreateDevice(&dxgi)?;
            let dcomp: IDCompositionDevice = DCompositionCreateDevice(&dxgi)?;
            let dwrite: IDWriteFactory = DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED)?;
            let font = pick_font(&dwrite);
            Ok(Device { d2d, dwrite, dcomp, dxgi, factory, d2d_device, _d3d: d3d, font })
        }
    }

    pub fn text_format(&self, size: f32, weight: DWRITE_FONT_WEIGHT) -> Result<IDWriteTextFormat> {
        unsafe {
            let f = self.dwrite.CreateTextFormat(&self.font, None, weight, DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_STRETCH_NORMAL, size, &HSTRING::from("fr-fr"))?;
            f.SetWordWrapping(DWRITE_WORD_WRAPPING_NO_WRAP)?;
            f.SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER)?;
            let sign = self.dwrite.CreateEllipsisTrimmingSign(&f)?;
            let trimming = DWRITE_TRIMMING { granularity: DWRITE_TRIMMING_GRANULARITY_CHARACTER, delimiter: 0, delimiterCount: 0 };
            f.SetTrimming(&trimming, &sign)?;
            Ok(f)
        }
    }

    /// Largeur du texte posé avec ce format (pour centrer ou coller les éléments de la barre).
    pub fn measure(&self, s: &str, format: &IDWriteTextFormat) -> f32 {
        let w: Vec<u16> = s.encode_utf16().collect();
        unsafe {
            self.dwrite
                .CreateTextLayout(&w, format, 4000.0, 200.0)
                .and_then(|l| {
                    let mut m = DWRITE_TEXT_METRICS::default();
                    l.GetMetrics(&mut m).map(|_| m.widthIncludingTrailingWhitespace)
                })
                .unwrap_or(0.0)
        }
    }

    /// Rend au système la mémoire graphique gardée en réserve (après l'animation de démarrage).
    pub fn trim(&self) {
        if let Ok(d) = self.dxgi.cast::<IDXGIDevice3>() {
            unsafe { d.Trim() };
        }
    }

    /// Le R de Rago, cadre 164 × 180.
    pub fn mark(&self) -> Result<ID2D1PathGeometry1> {
        unsafe {
            let g = self.d2d.CreatePathGeometry()?;
            let sink = g.Open()?;
            let p = |i: usize| Vector2 { X: logo::MARK[i].0, Y: logo::MARK[i].1 };
            sink.BeginFigure(p(0), D2D1_FIGURE_BEGIN_FILLED);
            for i in 1..logo::MARK.len() {
                sink.AddLine(p(i));
            }
            sink.EndFigure(D2D1_FIGURE_END_CLOSED);
            sink.Close()?;
            Ok(g)
        }
    }

    /// Le mot « Rago OS » (hauteur des capitales = 1).
    pub fn word(&self) -> Result<ID2D1PathGeometry1> {
        unsafe {
            let g = self.d2d.CreatePathGeometry()?;
            let sink = g.Open()?;
            sink.SetFillMode(D2D1_FILL_MODE_WINDING);
            let v = |x: f32, y: f32| Vector2 { X: x, Y: y };
            let mut open = false;
            for op in logo::WORD {
                match *op {
                    logo::Op::Move(x, y) => {
                        if open {
                            sink.EndFigure(D2D1_FIGURE_END_CLOSED);
                        }
                        sink.BeginFigure(v(x, y), D2D1_FIGURE_BEGIN_FILLED);
                        open = true;
                    }
                    logo::Op::Line(x, y) => sink.AddLine(v(x, y)),
                    logo::Op::Quad(cx, cy, x, y) => sink.AddQuadraticBezier(&D2D1_QUADRATIC_BEZIER_SEGMENT { point1: v(cx, cy), point2: v(x, y) }),
                    logo::Op::Cubic(ax, ay, bx, by, x, y) => sink.AddBezier(&D2D1_BEZIER_SEGMENT { point1: v(ax, ay), point2: v(bx, by), point3: v(x, y) }),
                    logo::Op::Close => {
                        if open {
                            sink.EndFigure(D2D1_FIGURE_END_CLOSED);
                            open = false;
                        }
                    }
                }
            }
            if open {
                sink.EndFigure(D2D1_FIGURE_END_CLOSED);
            }
            sink.Close()?;
            Ok(g)
        }
    }
}

fn pick_font(dwrite: &IDWriteFactory) -> HSTRING {
    unsafe {
        let mut fonts = None;
        if dwrite.GetSystemFontCollection(&mut fonts, false).is_ok() {
            if let Some(fonts) = fonts {
                for name in ["Segoe UI Variable Text", "Segoe UI"] {
                    let (mut index, mut exists) = (0u32, windows::core::BOOL(0));
                    let h = HSTRING::from(name);
                    if fonts.FindFamilyName(PCWSTR(h.as_ptr()), &mut index, &mut exists).is_ok() && exists.as_bool() {
                        return h;
                    }
                }
            }
        }
        HSTRING::from("Segoe UI")
    }
}

/// Surface de dessin d'une fenêtre (WS_EX_NOREDIRECTIONBITMAP), en pixels logiques.
pub struct Surface {
    pub ctx: ID2D1DeviceContext,
    swap: IDXGISwapChain1,
    _target: IDCompositionTarget,
    _visual: IDCompositionVisual,
}

impl Surface {
    /// `w` × `h` : taille en pixels physiques.
    pub fn new(dev: &Device, hwnd: HWND, w: u32, h: u32, scale: f32) -> Result<Self> {
        unsafe {
            let desc = DXGI_SWAP_CHAIN_DESC1 {
                Width: w.max(1),
                Height: h.max(1),
                Format: DXGI_FORMAT_B8G8R8A8_UNORM,
                Stereo: false.into(),
                SampleDesc: DXGI_SAMPLE_DESC { Count: 1, Quality: 0 },
                BufferUsage: DXGI_USAGE_RENDER_TARGET_OUTPUT,
                BufferCount: 2,
                Scaling: DXGI_SCALING_STRETCH,
                SwapEffect: DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL,
                AlphaMode: DXGI_ALPHA_MODE_PREMULTIPLIED,
                Flags: 0,
            };
            let swap = dev.factory.CreateSwapChainForComposition(&dev.dxgi, &desc, None)?;
            let ctx = dev.d2d_device.CreateDeviceContext(D2D1_DEVICE_CONTEXT_OPTIONS_NONE)?;
            let surface: IDXGISurface = swap.GetBuffer(0)?;
            let props = D2D1_BITMAP_PROPERTIES1 {
                pixelFormat: D2D1_PIXEL_FORMAT { format: DXGI_FORMAT_B8G8R8A8_UNORM, alphaMode: D2D1_ALPHA_MODE_PREMULTIPLIED },
                dpiX: 96.0 * scale,
                dpiY: 96.0 * scale,
                bitmapOptions: D2D1_BITMAP_OPTIONS_TARGET | D2D1_BITMAP_OPTIONS_CANNOT_DRAW,
                colorContext: ManuallyDrop::new(None),
            };
            let bitmap = ctx.CreateBitmapFromDxgiSurface(&surface, Some(&props))?;
            ctx.SetTarget(&bitmap);
            ctx.SetDpi(96.0 * scale, 96.0 * scale);
            ctx.SetTextAntialiasMode(D2D1_TEXT_ANTIALIAS_MODE_GRAYSCALE);
            let target = dev.dcomp.CreateTargetForHwnd(hwnd, true)?;
            let visual = dev.dcomp.CreateVisual()?;
            visual.SetContent(&swap)?;
            target.SetRoot(&visual)?;
            dev.dcomp.Commit()?;
            Ok(Surface { ctx, swap, _target: target, _visual: visual })
        }
    }

    pub fn begin(&self) {
        unsafe {
            self.ctx.BeginDraw();
            self.ctx.SetTransform(&Matrix3x2::identity());
            self.ctx.Clear(Some(&rgba(0, 0.0)));
        }
    }

    /// Fin de l'image, affichée à la prochaine synchronisation de l'écran.
    pub fn end(&self) -> Result<()> {
        unsafe {
            self.ctx.EndDraw(None, None)?;
            self.swap.Present(1, DXGI_PRESENT(0)).ok()
        }
    }

    pub fn brush(&self, hex: u32, a: f32) -> Result<ID2D1SolidColorBrush> {
        unsafe { self.ctx.CreateSolidColorBrush(&rgba(hex, a), None) }
    }

    pub fn pill(&self, r: D2D_RECT_F, radius: f32, brush: &ID2D1Brush) {
        unsafe { self.ctx.FillRoundedRectangle(&D2D1_ROUNDED_RECT { rect: r, radiusX: radius, radiusY: radius }, brush) }
    }

    pub fn text(&self, s: &str, format: &IDWriteTextFormat, r: D2D_RECT_F, brush: &ID2D1Brush) {
        let w: Vec<u16> = s.encode_utf16().collect();
        unsafe { self.ctx.DrawText(&w, format, &r, brush, D2D1_DRAW_TEXT_OPTIONS_CLIP, DWRITE_MEASURING_MODE_NATURAL) }
    }

    pub fn transform(&self, m: Matrix3x2) {
        unsafe { self.ctx.SetTransform(&m) }
    }

    /// Nouvelle taille (pixels physiques) ou nouvelle échelle : mêmes tampons, redimensionnés.
    pub fn resize(&self, w: u32, h: u32, scale: f32) -> Result<()> {
        unsafe {
            self.ctx.SetTarget(None::<&ID2D1Image>);
            self.swap.ResizeBuffers(0, w.max(1), h.max(1), DXGI_FORMAT_UNKNOWN, DXGI_SWAP_CHAIN_FLAG(0))?;
            let surface: IDXGISurface = self.swap.GetBuffer(0)?;
            let props = D2D1_BITMAP_PROPERTIES1 {
                pixelFormat: D2D1_PIXEL_FORMAT { format: DXGI_FORMAT_B8G8R8A8_UNORM, alphaMode: D2D1_ALPHA_MODE_PREMULTIPLIED },
                dpiX: 96.0 * scale,
                dpiY: 96.0 * scale,
                bitmapOptions: D2D1_BITMAP_OPTIONS_TARGET | D2D1_BITMAP_OPTIONS_CANNOT_DRAW,
                colorContext: ManuallyDrop::new(None),
            };
            let bitmap = self.ctx.CreateBitmapFromDxgiSurface(&surface, Some(&props))?;
            self.ctx.SetTarget(&bitmap);
            self.ctx.SetDpi(96.0 * scale, 96.0 * scale);
            Ok(())
        }
    }

    pub fn outline(&self, r: D2D_RECT_F, radius: f32, brush: &ID2D1Brush, width: f32) {
        unsafe { self.ctx.DrawRoundedRectangle(&D2D1_ROUNDED_RECT { rect: r, radiusX: radius, radiusY: radius }, brush, width, None) }
    }

    pub fn line(&self, x0: f32, y0: f32, x1: f32, y1: f32, brush: &ID2D1Brush, width: f32) {
        unsafe { self.ctx.DrawLine(Vector2 { X: x0, Y: y0 }, Vector2 { X: x1, Y: y1 }, brush, width, None) }
    }

    pub fn dot(&self, cx: f32, cy: f32, r: f32, brush: &ID2D1Brush) {
        unsafe { self.ctx.FillEllipse(&D2D1_ELLIPSE { point: Vector2 { X: cx, Y: cy }, radiusX: r, radiusY: r }, brush) }
    }

    pub fn ring(&self, cx: f32, cy: f32, r: f32, brush: &ID2D1Brush, width: f32) {
        unsafe { self.ctx.DrawEllipse(&D2D1_ELLIPSE { point: Vector2 { X: cx, Y: cy }, radiusX: r, radiusY: r }, brush, width, None) }
    }

    /// Verre de Rago OS posé sur le flou de Windows : teinte sombre, reflet léger en haut et liseré clair.
    pub fn glass(&self, r: D2D_RECT_F, radius: f32, tint: f32) -> Result<()> {
        let fill = self.brush(GLASS, tint)?;
        self.pill(r, radius, &fill);
        unsafe {
            let stops = [
                D2D1_GRADIENT_STOP { position: 0.0, color: rgba(0xFFFFFF, 0.07) },
                D2D1_GRADIENT_STOP { position: 1.0, color: rgba(0xFFFFFF, 0.0) },
            ];
            let collection = ID2D1RenderTarget::CreateGradientStopCollection(&self.ctx, &stops, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP)?;
            let h = (r.bottom - r.top).min(48.0);
            let props = D2D1_LINEAR_GRADIENT_BRUSH_PROPERTIES { startPoint: Vector2 { X: 0.0, Y: r.top }, endPoint: Vector2 { X: 0.0, Y: r.top + h } };
            let sheen = self.ctx.CreateLinearGradientBrush(&props, None, &collection)?;
            self.pill(r, radius, &sheen);
        }
        let rim = self.brush(0xFFFFFF, 0.11)?;
        let inner = D2D_RECT_F { left: r.left + 0.5, top: r.top + 0.5, right: r.right - 0.5, bottom: r.bottom - 0.5 };
        self.outline(inner, (radius - 0.5).max(0.0), &rim, 1.0);
        Ok(())
    }
}

/// Carte graphique perdue (pilote mis à jour, mise en veille…) : tout est à recréer.
pub fn lost(e: &windows::core::Error) -> bool {
    let c = e.code();
    c == DXGI_ERROR_DEVICE_REMOVED || c == DXGI_ERROR_DEVICE_RESET || c == windows::Win32::Foundation::D2DERR_RECREATE_TARGET
}

/// Transformation qui pose une forme de `w` × `h` à la taille `scale`, centrée sur (`cx`, `cy`).
pub fn place(w: f32, h: f32, scale: f32, cx: f32, cy: f32) -> Matrix3x2 {
    Matrix3x2 { M11: scale, M12: 0.0, M21: 0.0, M22: scale, M31: cx - w * scale / 2.0, M32: cy - h * scale / 2.0 }
}

pub fn ease_out(t: f32) -> f32 {
    let t = t.clamp(0.0, 1.0);
    // cubic-bezier(.16,1,.3,1) de la marque, approché par une courbe exponentielle
    if t >= 1.0 {
        1.0
    } else {
        1.0 - 2f32.powf(-10.0 * t)
    }
}

pub fn ease_in_out(t: f32) -> f32 {
    let t = t.clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

pub fn span(t: f32, from: f32, to: f32) -> f32 {
    ((t - from) / (to - from)).clamp(0.0, 1.0)
}
