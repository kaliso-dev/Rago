//! Écrans, mise à l'échelle et détection d'un jeu ou d'une appli plein écran.

use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, POINT, RECT};
use windows::Win32::Graphics::Gdi::{EnumDisplayMonitors, GetMonitorInfoW, MonitorFromPoint, MonitorFromWindow, HDC, HMONITOR, MONITORINFO, MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTOPRIMARY};
use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
use windows::Win32::UI::Shell::{SHQueryUserNotificationState, QUNS_BUSY, QUNS_PRESENTATION_MODE, QUNS_RUNNING_D3D_FULL_SCREEN};
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
use windows::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetForegroundWindow, MONITORINFOF_PRIMARY, GetShellWindow, GetTopWindow, GetWindow, GetWindowLongW, GetWindowRect, GetWindowThreadProcessId, IsIconic,
    IsWindowVisible, GWL_EXSTYLE, GW_HWNDNEXT, WS_EX_TRANSPARENT,
};

#[derive(Debug, Clone, Copy)]
pub struct Monitor {
    /// en pixels physiques
    pub rect: RECT,
    /// sans la barre des tâches
    pub work: RECT,
    pub scale: f32,
    pub primary: bool,
}

fn scale_of(m: HMONITOR) -> f32 {
    let (mut x, mut y) = (96u32, 96u32);
    unsafe {
        let _ = GetDpiForMonitor(m, MDT_EFFECTIVE_DPI, &mut x, &mut y);
    }
    x.max(96) as f32 / 96.0
}

fn info(m: HMONITOR) -> Option<Monitor> {
    let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
    unsafe { GetMonitorInfoW(m, &mut mi) }.as_bool().then(|| Monitor { rect: mi.rcMonitor, work: mi.rcWork, scale: scale_of(m), primary: mi.dwFlags & MONITORINFOF_PRIMARY != 0 })
}

pub fn monitors() -> Vec<Monitor> {
    unsafe extern "system" fn each(m: HMONITOR, _dc: HDC, _r: *mut RECT, data: LPARAM) -> BOOL {
        let list = unsafe { &mut *(data.0 as *mut Vec<Monitor>) };
        if let Some(i) = info(m) {
            list.push(i);
        }
        true.into()
    }
    let mut list: Vec<Monitor> = Vec::new();
    unsafe {
        let _ = EnumDisplayMonitors(None, None, Some(each), LPARAM(&mut list as *mut _ as isize));
    }
    if list.is_empty() {
        list.push(primary());
    }
    list
}

pub fn primary() -> Monitor {
    let m = unsafe { MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY) };
    let r = RECT { left: 0, top: 0, right: 1920, bottom: 1080 };
    info(m).unwrap_or(Monitor { rect: r, work: r, scale: 1.0, primary: true })
}

/// Écran sous ce point (pixels physiques), ou le plus proche.
pub fn monitor_at(x: i32, y: i32) -> Monitor {
    let m = unsafe { MonitorFromPoint(POINT { x, y }, MONITOR_DEFAULTTONEAREST) };
    info(m).unwrap_or_else(primary)
}

fn class(hwnd: HWND) -> String {
    let mut buf = [0u16; 64];
    let n = unsafe { GetClassNameW(hwnd, &mut buf) } as usize;
    String::from_utf16_lossy(&buf[..n.min(buf.len())])
}

/// Un jeu, une vidéo ou une présentation occupe l'écran : rien de Rago Shell ne doit apparaître.
pub fn busy() -> bool {
    if let Ok(state) = unsafe { SHQueryUserNotificationState() } {
        if state == QUNS_BUSY || state == QUNS_RUNNING_D3D_FULL_SCREEN || state == QUNS_PRESENTATION_MODE {
            return true;
        }
    }
    // plein écran fenêtré (« sans bordure ») : la fenêtre au premier plan couvre tout son écran
    unsafe {
        let fg = GetForegroundWindow();
        if fg.is_invalid() || fg == GetShellWindow() {
            return false;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(fg, Some(&mut pid));
        if pid == std::process::id() {
            return false;
        }
        if desktop_like(fg) {
            return false;
        }
        let mut r = RECT::default();
        if GetWindowRect(fg, &mut r).is_err() {
            return false;
        }
        let Some(m) = info(MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST)) else { return false };
        r.left <= m.rect.left && r.top <= m.rect.top && r.right >= m.rect.right && r.bottom >= m.rect.bottom
    }
}

fn desktop_like(hwnd: HWND) -> bool {
    matches!(class(hwnd).as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd")
}

/// Sous ce point (en haut de l'écran), il n'y a que le bureau : la zone de survol de l'île peut s'y mettre sans prendre
/// les clics d'une fenêtre (onglets d'un navigateur agrandi, barre de titre…). Les fenêtres de Rago Shell, cachées ou
/// traversables par la souris (calques des jeux, de Discord…) sont ignorées.
pub fn top_free(x: i32, y: i32) -> bool {
    unsafe {
        let me = std::process::id();
        let mut next = GetTopWindow(None);
        while let Ok(h) = next {
            next = GetWindow(h, GW_HWNDNEXT);
            if !IsWindowVisible(h).as_bool() || IsIconic(h).as_bool() {
                continue;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(h, Some(&mut pid));
            if pid == me || (GetWindowLongW(h, GWL_EXSTYLE) as u32 & WS_EX_TRANSPARENT.0) != 0 {
                continue;
            }
            let mut cloaked = 0u32;
            if DwmGetWindowAttribute(h, DWMWA_CLOAKED, &mut cloaked as *mut _ as *mut _, 4).is_ok() && cloaked != 0 {
                continue;
            }
            let mut r = RECT::default();
            if GetWindowRect(h, &mut r).is_err() || !(r.left <= x && x < r.right && r.top <= y && y < r.bottom) {
                continue;
            }
            return desktop_like(h);
        }
        true
    }
}
