//! Barre d'application de Windows (comme la barre des tâches) : la barre de Rago OS en haut et le Dock en bas
//! réservent leur bande de l'écran, les fenêtres agrandies s'arrêtent avant. Windows prévient quand une appli passe en
//! plein écran : elles se cachent.

use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::Shell::{SHAppBarMessage, ABE_BOTTOM, ABE_TOP, ABM_NEW, ABM_QUERYPOS, ABM_REMOVE, ABM_SETPOS, ABM_WINDOWPOSCHANGED, APPBARDATA};

use crate::host::WM_APPBAR;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Edge {
    Top,
    Bottom,
}

fn data(hwnd: HWND) -> APPBARDATA {
    APPBARDATA { cbSize: std::mem::size_of::<APPBARDATA>() as u32, hWnd: hwnd, uCallbackMessage: WM_APPBAR, ..Default::default() }
}

pub fn register(hwnd: HWND) -> bool {
    let mut d = data(hwnd);
    unsafe { SHAppBarMessage(ABM_NEW, &mut d) != 0 }
}

pub fn remove(hwnd: HWND) {
    let mut d = data(hwnd);
    unsafe {
        SHAppBarMessage(ABM_REMOVE, &mut d);
    }
}

/// Réserve `thickness` pixels physiques au bord de l'écran `screen` ; renvoie la bande accordée par Windows. Si elle
/// est déjà réservée telle quelle (`reserved`), Windows n'est pas prévenu de nouveau : chaque réservation prévient les
/// autres barres du même bord, qui se replacent à leur tour.
pub fn place(hwnd: HWND, edge: Edge, screen: RECT, thickness: i32, reserved: Option<RECT>) -> RECT {
    let mut d = data(hwnd);
    d.uEdge = if edge == Edge::Top { ABE_TOP } else { ABE_BOTTOM };
    d.rc = screen;
    let fit = |r: &mut RECT| match edge {
        Edge::Top => r.bottom = r.top + thickness,
        Edge::Bottom => r.top = r.bottom - thickness,
    };
    fit(&mut d.rc);
    unsafe {
        SHAppBarMessage(ABM_QUERYPOS, &mut d);
    }
    fit(&mut d.rc);
    if reserved == Some(d.rc) {
        return d.rc;
    }
    unsafe {
        SHAppBarMessage(ABM_SETPOS, &mut d);
        SHAppBarMessage(ABM_WINDOWPOSCHANGED, &mut d);
    }
    d.rc
}
