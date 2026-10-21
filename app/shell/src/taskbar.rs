//! Barre des tâches de Windows pendant que le Dock de Rago OS est allumé : masquée automatiquement (réglage de Windows,
//! pour que les fenêtres agrandies prennent sa place) et cachée. Le réglage d'origine est noté sur le disque avant tout
//! changement : si Rago Shell s'arrête mal, la copie suivante (ou l'app) le remet. Sans ce fichier, rien n'a été touché.

use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::{HWND, LPARAM};
use windows::Win32::UI::Shell::{SHAppBarMessage, ABM_GETSTATE, ABM_SETSTATE, ABS_ALWAYSONTOP, ABS_AUTOHIDE, APPBARDATA};
use windows::Win32::UI::WindowsAndMessaging::{FindWindowW, IsWindowVisible, ShowWindow, SW_HIDE, SW_SHOWNA};

use crate::config;

const SAVED: &str = "taskbar.json";

fn tray() -> Option<HWND> {
    unsafe { FindWindowW(w!("Shell_TrayWnd"), PCWSTR::null()) }.ok().filter(|h| !h.is_invalid())
}

fn data(hwnd: HWND) -> APPBARDATA {
    APPBARDATA { cbSize: std::mem::size_of::<APPBARDATA>() as u32, hWnd: hwnd, ..Default::default() }
}

fn get_state(hwnd: HWND) -> u32 {
    let mut d = data(hwnd);
    unsafe { SHAppBarMessage(ABM_GETSTATE, &mut d) as u32 }
}

fn set_state(hwnd: HWND, state: u32) {
    let mut d = data(hwnd);
    d.lParam = LPARAM(state as isize);
    unsafe {
        SHAppBarMessage(ABM_SETSTATE, &mut d);
    }
}

fn saved() -> Option<u32> {
    let text = std::fs::read_to_string(config::dir().join(SAVED)).ok()?;
    serde_json::from_str::<serde_json::Value>(&text).ok()?.get("state")?.as_u64().map(|v| v as u32)
}

fn save(state: u32) {
    let dir = config::dir();
    let _ = std::fs::create_dir_all(&dir);
    let _ = std::fs::write(dir.join(SAVED), format!("{{\"state\":{state}}}"));
}

#[derive(Default)]
pub struct Taskbar {
    hidden: bool,
    /// montrée un moment par le bouton de la barre de Rago OS (zone de notification, menu Démarrer)
    revealed: bool,
}

impl Taskbar {
    pub fn hide(&mut self) {
        let Some(t) = tray() else {
            self.hidden = true;
            return;
        };
        // le réglage d'avant n'est noté qu'une fois : après un arrêt brutal, c'est toujours celui d'origine
        if saved().is_none() {
            save(get_state(t));
        }
        set_state(t, ABS_AUTOHIDE | ABS_ALWAYSONTOP);
        unsafe {
            let _ = ShowWindow(t, SW_HIDE);
        }
        self.hidden = true;
        self.revealed = false;
    }

    /// Windows l'a remontrée (redémarrage de l'Explorateur, touche Windows, écran changé) : cachée de nouveau.
    pub fn enforce(&mut self) {
        if !self.hidden || self.revealed {
            return;
        }
        if let Some(t) = tray() {
            if unsafe { IsWindowVisible(t) }.as_bool() {
                set_state(t, ABS_AUTOHIDE | ABS_ALWAYSONTOP);
                unsafe {
                    let _ = ShowWindow(t, SW_HIDE);
                }
            }
        }
    }

    pub fn revealed(&self) -> bool {
        self.revealed
    }

    /// Bouton de la barre : la barre des tâches de Windows revient (sans masquage automatique) jusqu'au clic suivant.
    pub fn toggle_reveal(&mut self) {
        let Some(t) = tray() else { return };
        if self.revealed {
            self.revealed = false;
            self.hide();
        } else {
            self.revealed = true;
            set_state(t, ABS_ALWAYSONTOP);
            unsafe {
                let _ = ShowWindow(t, SW_SHOWNA);
            }
        }
    }

    pub fn restore(&mut self) {
        restore();
        self.hidden = false;
        self.revealed = false;
    }
}

/// Remet la barre des tâches comme avant Rago OS, si Rago Shell l'avait changée.
pub fn restore() {
    let Some(state) = saved() else { return };
    if let Some(t) = tray() {
        set_state(t, state);
        unsafe {
            let _ = ShowWindow(t, SW_SHOWNA);
        }
    }
    let _ = std::fs::remove_file(config::dir().join(SAVED));
}
