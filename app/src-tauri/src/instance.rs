//! Une seule Rago Optimizer à la fois dans la session Windows. Deux fenêtres ouvertes en même temps gardaient chacune
//! son applied.json en mémoire (le dernier enregistrement gagnait : les sauvegardes de l'autre étaient perdues) et
//! lançaient chacune sa remise de fin de Premium au démarrage.
//!
//! Verrou : un mutex nommé de Windows, `Local\<identifiant>.instance` (l'exe de test a le sien), pris au lancement et
//! gardé jusqu'à la fin du processus. Windows le rend dès que le processus se termine, même tué ou planté : un verrou
//! ne peut pas rester derrière une Rago Optimizer fermée.
//! - Fenêtre : une autre Rago Optimizer le tient. Sa fenêtre est ramenée au premier plan, et ce lancement s'arrête avant
//!   de charger quoi que ce soit. Rien de visible (fenêtre cachée pendant la fin d'une remise, ou remise de la
//!   désinstallation) : un message le dit.
//! - Désinstallation (`--reset-tweaks`) : le désinstallateur a déjà fermé l'app (CheckIfAppIsRunning dans
//!   installer/hooks.nsh). La remise attend le verrou au plus `UNINSTALL_WAIT`, puis passe quand même : la
//!   désinstallation ne doit jamais rester bloquée. Tenu pendant la remise, il empêche une fenêtre ouverte entre-temps
//!   de lancer ses propres lots.
//! - Verrou impossible à créer : l'app démarre comme avant (jamais bloquée par le verrou lui-même).

use std::time::Duration;

/// Attente maximale du verrou par la remise de la désinstallation.
pub const UNINSTALL_WAIT: Duration = Duration::from_secs(30);

#[cfg_attr(not(windows), allow(dead_code))]
pub enum Lock {
    /// verrou pris : à garder jusqu'à la fin du processus
    Mine(#[allow(dead_code)] Guard),
    /// une autre Rago Optimizer le tient
    Busy,
    /// verrou impossible à créer : l'app démarre comme avant
    Unavailable,
}

impl Lock {
    /// Ce lancement continue : toujours pour la remise de la désinstallation, sinon seulement si aucune autre Rago
    /// Optimizer ne tient le verrou.
    pub fn starts(&self, uninstall: bool) -> bool {
        uninstall || !matches!(self, Lock::Busy)
    }
}

pub struct Guard {
    #[cfg(windows)]
    handle: windows_sys::Win32::Foundation::HANDLE,
}

#[cfg(windows)]
impl Drop for Guard {
    fn drop(&mut self) {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::ReleaseMutex;
        unsafe {
            ReleaseMutex(self.handle);
            CloseHandle(self.handle);
        }
    }
}

/// Le verrou de cette app (identifiant de tauri.conf.json), attendu au plus `wait`.
pub fn acquire(wait: Duration) -> Lock {
    acquire_named(&format!("Local\\{}.instance", crate::reset::IDENTIFIER), wait)
}

#[cfg(windows)]
fn acquire_named(name: &str, wait: Duration) -> Lock {
    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ACCESS_DENIED, WAIT_ABANDONED, WAIT_OBJECT_0, WAIT_TIMEOUT};
    use windows_sys::Win32::System::Threading::{CreateMutexW, WaitForSingleObject};
    let name: Vec<u16> = name.encode_utf16().chain([0]).collect();
    let ms = wait.as_millis().min(u128::from(u32::MAX - 1)) as u32;
    unsafe {
        let handle = CreateMutexW(std::ptr::null(), 0, name.as_ptr());
        if handle.is_null() {
            // il existe, créé par un processus dont on ne peut pas l'ouvrir : une autre Rago Optimizer le tient
            return if GetLastError() == ERROR_ACCESS_DENIED { Lock::Busy } else { Lock::Unavailable };
        }
        match WaitForSingleObject(handle, ms) {
            // libre, ou laissé par une Rago Optimizer arrêtée net (tuée, plantée) : à nous
            WAIT_OBJECT_0 | WAIT_ABANDONED => Lock::Mine(Guard { handle }),
            WAIT_TIMEOUT => {
                CloseHandle(handle);
                Lock::Busy
            }
            _ => {
                CloseHandle(handle);
                Lock::Unavailable
            }
        }
    }
}

#[cfg(not(windows))]
fn acquire_named(_name: &str, _wait: Duration) -> Lock {
    Lock::Mine(Guard {})
}

/// Événement nommé par lequel un nouveau lancement demande à la Rago Optimizer ouverte de montrer sa fenêtre (cachée
/// pendant qu'elle finit une remise en arrière-plan).
#[cfg_attr(not(windows), allow(dead_code))]
fn show_event() -> String {
    format!("Local\\{}.show", crate::reset::IDENTIFIER)
}

/// Fenêtre de cette Rago Optimizer : `show` est appelé chaque fois qu'un nouveau lancement la demande (`show_other`).
#[cfg(windows)]
pub fn on_show_request(show: impl Fn() + Send + 'static) {
    use windows_sys::Win32::Foundation::WAIT_OBJECT_0;
    use windows_sys::Win32::System::Threading::{CreateEventW, WaitForSingleObject, INFINITE};
    let name: Vec<u16> = show_event().encode_utf16().chain([0]).collect();
    // remis à zéro par chaque attente satisfaite (auto-reset) : une demande, un affichage
    let handle = unsafe { CreateEventW(std::ptr::null(), 0, 0, name.as_ptr()) };
    if handle.is_null() {
        return;
    }
    let handle = handle as usize;
    std::thread::spawn(move || {
        while unsafe { WaitForSingleObject(handle as windows_sys::Win32::Foundation::HANDLE, INFINITE) } == WAIT_OBJECT_0 {
            show();
        }
    });
}

#[cfg(not(windows))]
pub fn on_show_request(_show: impl Fn() + Send + 'static) {}

/// Demande à la Rago Optimizer ouverte de montrer sa fenêtre. Faux si elle n'écoute pas (remise de la désinstallation).
#[cfg(windows)]
fn request_show() -> bool {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{OpenEventW, SetEvent, EVENT_MODIFY_STATE};
    use windows_sys::Win32::UI::WindowsAndMessaging::{AllowSetForegroundWindow, ASFW_ANY};
    let name: Vec<u16> = show_event().encode_utf16().chain([0]).collect();
    unsafe {
        let handle = OpenEventW(EVENT_MODIFY_STATE, 0, name.as_ptr());
        if handle.is_null() {
            return false;
        }
        // ce lancement vient du joueur : il laisse l'autre passer au premier plan
        AllowSetForegroundWindow(ASFW_ANY);
        let ok = SetEvent(handle) != 0;
        CloseHandle(handle);
        ok
    }
}

/// Une autre Rago Optimizer tient le verrou : sa fenêtre est ramenée au premier plan (restaurée si elle est réduite,
/// montrée si elle était cachée pendant la fin d'une remise). Rien de visible au bout de 3 secondes (remise de la
/// désinstallation, ou fenêtre pas encore créée) : un message le dit, en français et en anglais (l'interface n'est pas
/// chargée).
#[cfg(windows)]
pub fn show_other() {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        IsIconic, MessageBoxW, SetForegroundWindow, ShowWindow, MB_ICONINFORMATION, MB_OK, MB_SETFOREGROUND, MB_TOPMOST, SW_RESTORE,
    };
    request_show();
    for _ in 0..12 {
        if let Some(hwnd) = other_window() {
            unsafe {
                if IsIconic(hwnd) != 0 {
                    ShowWindow(hwnd, SW_RESTORE);
                }
                SetForegroundWindow(hwnd);
            }
            return;
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    let wide = |s: &str| s.encode_utf16().chain([0]).collect::<Vec<u16>>();
    let text = wide(BUSY_MESSAGE);
    let title = wide("Rago Optimizer");
    unsafe {
        MessageBoxW(std::ptr::null_mut(), text.as_ptr(), title.as_ptr(), MB_OK | MB_ICONINFORMATION | MB_SETFOREGROUND | MB_TOPMOST);
    }
}

#[cfg(not(windows))]
pub fn show_other() {}

#[cfg(windows)]
const BUSY_MESSAGE: &str = "Rago Optimizer est déjà ouvert, ou il finit de remettre des réglages de Windows en arrière-plan. \
Réessaie dans quelques minutes (redémarre ton PC si ça dure).\n\n\
Rago Optimizer is already open, or it's finishing putting Windows settings back in the background. \
Try again in a few minutes (restart your PC if it keeps happening).";

/// Fenêtre principale visible d'une autre Rago Optimizer : fenêtre de premier niveau, sans propriétaire, d'un autre
/// processus lancé depuis un exe du même nom.
#[cfg(windows)]
fn other_window() -> Option<windows_sys::Win32::Foundation::HWND> {
    use windows_sys::core::BOOL;
    use windows_sys::Win32::Foundation::{HWND, LPARAM};
    use windows_sys::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindow, GetWindowLongW, GetWindowThreadProcessId, IsWindowVisible, GWL_EXSTYLE, GW_OWNER, WS_EX_TOOLWINDOW};
    struct Search {
        exe: String,
        me: u32,
        found: HWND,
    }
    unsafe extern "system" fn each(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let s = &mut *(lparam as *mut Search);
        // fenêtre outil : la pastille de la barre en jeu (overlay.rs), pas la fenêtre de l'app
        if IsWindowVisible(hwnd) == 0 || !GetWindow(hwnd, GW_OWNER).is_null() || GetWindowLongW(hwnd, GWL_EXSTYLE) as u32 & WS_EX_TOOLWINDOW != 0 {
            return 1;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 || pid == s.me || exe_name(pid).as_deref() != Some(s.exe.as_str()) {
            return 1;
        }
        s.found = hwnd;
        0
    }
    let exe = std::env::current_exe().ok()?.file_name()?.to_string_lossy().to_lowercase();
    let mut s = Search { exe, me: std::process::id(), found: std::ptr::null_mut() };
    unsafe {
        EnumWindows(Some(each), &mut s as *mut Search as LPARAM);
    }
    (!s.found.is_null()).then_some(s.found)
}

/// Nom de l'exe d'un processus, en minuscules.
#[cfg(windows)]
fn exe_name(pid: u32) -> Option<String> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    unsafe {
        let p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if p.is_null() {
            return None;
        }
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(p, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len);
        CloseHandle(p);
        if ok == 0 {
            return None;
        }
        let path = String::from_utf16_lossy(&buf[..len as usize]);
        path.rsplit('\\').next().map(str::to_lowercase)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// La remise de la désinstallation n'est jamais bloquée par le verrou ; une fenêtre ne s'ouvre pas quand une autre
    /// Rago Optimizer le tient, et s'ouvre comme avant quand il ne peut pas être créé.
    #[test]
    fn only_a_second_window_is_stopped() {
        let busy = Lock::Busy;
        assert!(!busy.starts(false), "deuxième fenêtre");
        assert!(busy.starts(true), "remise de la désinstallation : jamais bloquée");
        assert!(Lock::Unavailable.starts(false));
        assert!(acquire_named("Local\\rago-test-starts", Duration::ZERO).starts(false));
        assert!(UNINSTALL_WAIT < crate::reset::UNINSTALL_LIMIT / 10);
    }

    /// Le mutex nommé de Windows : tenu par un fil, refusé à un autre ; rendu quand le premier le lâche, ou quand il
    /// s'arrête sans le lâcher (Rago Optimizer tuée).
    #[cfg(windows)]
    #[test]
    fn the_lock_is_held_then_given_back() {
        let name = format!("Local\\rago-test-instance-{}", std::process::id());
        let (n1, n2) = (name.clone(), name.clone());
        let (tx, rx) = std::sync::mpsc::channel();
        let (go_tx, go_rx) = std::sync::mpsc::channel::<()>();
        let holder = std::thread::spawn(move || {
            let lock = acquire_named(&n1, Duration::ZERO);
            assert!(matches!(lock, Lock::Mine(_)));
            tx.send(()).unwrap();
            go_rx.recv().unwrap();
            drop(lock);
        });
        rx.recv().unwrap();
        let other = std::thread::spawn(move || matches!(acquire_named(&n2, Duration::ZERO), Lock::Busy)).join().unwrap();
        assert!(other, "tenu par une autre fenêtre");
        go_tx.send(()).unwrap();
        holder.join().unwrap();
        let n3 = name.clone();
        assert!(std::thread::spawn(move || matches!(acquire_named(&n3, Duration::from_secs(5)), Lock::Mine(_))).join().unwrap());
        // arrêtée net sans le rendre : abandonné, donc pris par le suivant
        let n4 = name.clone();
        std::thread::spawn(move || std::mem::forget(acquire_named(&n4, Duration::ZERO))).join().unwrap();
        let n5 = name.clone();
        assert!(std::thread::spawn(move || matches!(acquire_named(&n5, Duration::from_secs(5)), Lock::Mine(_))).join().unwrap());
    }
}
