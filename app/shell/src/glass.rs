//! Verre des fenêtres de Rago OS. Le flou est calculé par le compositeur de Windows (DWM), sur le GPU, derrière nos
//! fenêtres : Rago Shell ne copie jamais l'écran. Les barres et menus de Rago OS ne prennent pas le focus ; or les
//! fonds Mica et Acrylique officiels (DWMWA_SYSTEMBACKDROP_TYPE) deviennent une couleur unie dès qu'une fenêtre est
//! inactive. Le flou passe donc par la politique d'accent de la composition, celle qu'utilisent la barre des tâches et
//! les menus de Windows, avec un repli sans flou (la teinte seule) si elle n'existe pas.

use std::ffi::c_void;

use windows::core::{s, w};
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Dwm::{
    DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_COLOR_NONE, DWMWA_USE_IMMERSIVE_DARK_MODE, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND,
};
use windows::Win32::Graphics::Gdi::{CreateRoundRectRgn, SetWindowRgn};
use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
use windows::Win32::System::Registry::{RegGetValueW, HKEY_LOCAL_MACHINE, RRF_RT_REG_SZ};

#[repr(C)]
struct Accent {
    state: u32,
    flags: u32,
    /// teinte ABGR (acrylique seulement)
    color: u32,
    animation: u32,
}

#[repr(C)]
struct Composition {
    attribute: u32,
    data: *mut c_void,
    size: usize,
}

type SetComposition = unsafe extern "system" fn(HWND, *mut Composition) -> i32;

const WCA_ACCENT_POLICY: u32 = 19;
const ACCENT_ENABLE_BLURBEHIND: u32 = 3;
const ACCENT_ENABLE_ACRYLICBLURBEHIND: u32 = 4;

/// Numéro de build de Windows (22000 : Windows 11).
pub fn build() -> u32 {
    let mut buf = [0u16; 16];
    let mut size = (buf.len() * 2) as u32;
    let ok = unsafe {
        RegGetValueW(
            HKEY_LOCAL_MACHINE,
            w!(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion"),
            w!("CurrentBuildNumber"),
            RRF_RT_REG_SZ,
            None,
            Some(buf.as_mut_ptr() as *mut c_void),
            Some(&mut size),
        )
    };
    if ok.is_err() {
        return 0;
    }
    let n = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..n]).trim().parse().unwrap_or(0)
}

/// Fenêtre sombre, sans les coins ni le liseré que Windows 11 ajoute : sa forme est la nôtre (`shape`).
pub fn prepare(hwnd: HWND) {
    unsafe {
        let on: i32 = 1;
        let _ = DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, &on as *const _ as *const c_void, 4);
        let square = DWMWCP_DONOTROUND;
        let _ = DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, &square as *const _ as *const c_void, 4);
        let none = DWMWA_COLOR_NONE;
        let _ = DwmSetWindowAttribute(hwnd, DWMWA_BORDER_COLOR, &none as *const _ as *const c_void, 4);
    }
}

/// Flou de Windows derrière la fenêtre : acrylique sous Windows 11, flou simple sous Windows 10 (l'acrylique y ralentit
/// les fenêtres qui bougent). Faux si Windows ne le propose pas : la teinte de Rago OS reste, sans flou.
pub fn blur(hwnd: HWND, windows11: bool) -> bool {
    unsafe {
        let Ok(user32) = GetModuleHandleW(w!("user32.dll")) else { return false };
        let Some(f) = GetProcAddress(user32, s!("SetWindowCompositionAttribute")) else { return false };
        let set: SetComposition = std::mem::transmute::<unsafe extern "system" fn() -> isize, SetComposition>(f);
        let mut accent = if windows11 {
            // teinte presque transparente : la couleur vient du dessin de Rago OS par-dessus
            Accent { state: ACCENT_ENABLE_ACRYLICBLURBEHIND, flags: 0, color: 0x0A16_1414, animation: 0 }
        } else {
            Accent { state: ACCENT_ENABLE_BLURBEHIND, flags: 0, color: 0, animation: 0 }
        };
        let mut data = Composition { attribute: WCA_ACCENT_POLICY, data: &mut accent as *mut _ as *mut c_void, size: std::mem::size_of::<Accent>() };
        set(hwnd, &mut data) != 0
    }
}

/// Forme de la fenêtre, en pixels physiques depuis son coin : un rectangle arrondi. Le flou, le dessin et la souris
/// s'y limitent.
pub fn shape(hwnd: HWND, x: i32, y: i32, w: i32, h: i32, radius: i32) {
    unsafe {
        let d = (radius * 2).max(0);
        let rgn = CreateRoundRectRgn(x, y, x + w + 1, y + h + 1, d, d);
        SetWindowRgn(hwnd, Some(rgn), true);
    }
}
