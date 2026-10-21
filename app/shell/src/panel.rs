//! Fenêtre de Rago OS en verre (barre, Dock, menus, recherche, centre de contrôle) : une fenêtre composée par
//! DirectComposition, floutée par Windows, dessinée seulement quand son contenu change.

use windows::core::Result;
use windows::Win32::Foundation::{HWND, POINT, RECT};
use windows::Win32::Graphics::Direct2D::Common::D2D_RECT_F;
use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
use windows::Win32::UI::Input::KeyboardAndMouse::SetFocus;
use windows::Win32::UI::WindowsAndMessaging::*;

use crate::gfx::{Device, Surface};
use crate::{glass, host};

pub struct Panel {
    pub hwnd: HWND,
    pub surface: Surface,
    pub scale: f32,
    /// position et taille en pixels physiques
    pub rect: RECT,
    pub shown: bool,
    activate: bool,
}

impl Panel {
    /// `activate` : la fenêtre prend le clavier (recherche, menus) et se ferme quand on clique ailleurs.
    pub fn new(dev: &Device, rect: RECT, scale: f32, activate: bool, windows11: bool) -> Result<Panel> {
        let (w, h) = (rect.right - rect.left, rect.bottom - rect.top);
        let hwnd = host::window(rect.left, rect.top, w.max(1), h.max(1), activate)?;
        glass::prepare(hwnd);
        glass::blur(hwnd, windows11);
        let surface = match Surface::new(dev, hwnd, w.max(1) as u32, h.max(1) as u32, scale) {
            Ok(s) => s,
            Err(e) => {
                unsafe {
                    let _ = DestroyWindow(hwnd);
                }
                return Err(e);
            }
        };
        Ok(Panel { hwnd, surface, scale, rect, shown: false, activate })
    }

    /// Taille en pixels logiques.
    pub fn width(&self) -> f32 {
        (self.rect.right - self.rect.left) as f32 / self.scale
    }

    pub fn height(&self) -> f32 {
        (self.rect.bottom - self.rect.top) as f32 / self.scale
    }

    /// Déplacée ou redimensionnée (pixels physiques).
    pub fn place(&mut self, rect: RECT, scale: f32) -> Result<()> {
        let (w, h) = (rect.right - rect.left, rect.bottom - rect.top);
        let (ow, oh) = (self.rect.right - self.rect.left, self.rect.bottom - self.rect.top);
        if w != ow || h != oh || scale != self.scale {
            self.surface.resize(w.max(1) as u32, h.max(1) as u32, scale)?;
        }
        if rect != self.rect {
            unsafe {
                let _ = SetWindowPos(self.hwnd, None, rect.left, rect.top, w.max(1), h.max(1), SWP_NOACTIVATE | SWP_NOZORDER);
            }
        }
        self.rect = rect;
        self.scale = scale;
        Ok(())
    }

    pub fn show(&mut self) {
        unsafe {
            let _ = SetWindowPos(self.hwnd, Some(HWND_TOPMOST), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
            if self.activate {
                // le clic ou le raccourci qui l'ouvre vient d'arriver à Rago Shell : Windows le laisse prendre le clavier.
                // Sinon, le fil de la fenêtre au premier plan partage un instant son clavier avec le nôtre.
                if !SetForegroundWindow(self.hwnd).as_bool() {
                    let fg = GetWindowThreadProcessId(GetForegroundWindow(), None);
                    let me = GetCurrentThreadId();
                    if fg != 0 && fg != me && AttachThreadInput(me, fg, true).as_bool() {
                        let _ = SetForegroundWindow(self.hwnd);
                        let _ = AttachThreadInput(me, fg, false);
                    }
                }
                let _ = SetFocus(Some(self.hwnd));
            }
        }
        self.shown = true;
    }

    pub fn hide(&mut self) {
        if self.shown {
            unsafe {
                let _ = ShowWindow(self.hwnd, SW_HIDE);
            }
            self.shown = false;
        }
    }

    /// Ne garde visible (et cliquable) que ce rectangle arrondi, en pixels logiques.
    pub fn shape(&self, r: D2D_RECT_F, radius: f32) {
        let s = self.scale;
        let (x, y) = ((r.left * s).floor() as i32, (r.top * s).floor() as i32);
        let (w, h) = (((r.right - r.left) * s).ceil() as i32, ((r.bottom - r.top) * s).ceil() as i32);
        glass::shape(self.hwnd, x, y, w, h, (radius * s).round() as i32);
    }

    pub fn owns(&self, hwnd: isize) -> bool {
        self.hwnd.0 as isize == hwnd
    }

    /// Point de la fenêtre (pixels physiques reçus par la fenêtre) en pixels logiques.
    pub fn local(&self, x: i32, y: i32) -> (f32, f32) {
        (x as f32 / self.scale, y as f32 / self.scale)
    }

    /// Souris au-dessus de la fenêtre, en pixels logiques de la fenêtre ; None si elle est ailleurs.
    pub fn cursor(&self) -> Option<(f32, f32)> {
        let mut p = POINT::default();
        unsafe { GetCursorPos(&mut p) }.ok()?;
        let r = self.rect;
        (p.x >= r.left && p.x < r.right && p.y >= r.top && p.y < r.bottom).then(|| ((p.x - r.left) as f32 / self.scale, (p.y - r.top) as f32 / self.scale))
    }
}

impl Drop for Panel {
    fn drop(&mut self) {
        unsafe {
            let _ = DestroyWindow(self.hwnd);
        }
    }
}

pub fn inside(r: &D2D_RECT_F, x: f32, y: f32) -> bool {
    x >= r.left && x < r.right && y >= r.top && y < r.bottom
}
