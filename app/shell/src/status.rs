//! État du PC pour la barre et le centre de contrôle (heure, batterie, réseau, Wi‑Fi et Bluetooth) et actions du
//! système (verrouiller, veille, éteindre, capture…). Tout est prévenu par Windows : la batterie et le réseau envoient
//! un message quand ils changent, l'heure se relit une fois par minute.

use std::sync::{Arc, Mutex};

use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::{HANDLE, HGLOBAL, HWND};
use windows::Win32::Globalization::{GetTimeFormatEx, TIME_NOSECONDS};
use windows::Win32::NetworkManagement::IpHelper::*;
use windows::Win32::NetworkManagement::Ndis::IfOperStatusUp;
use windows::Win32::Networking::WinSock::AF_UNSPEC;
use windows::Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, GetClipboardData, OpenClipboard, SetClipboardData};
use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};
use windows::Win32::System::Ole::CF_UNICODETEXT;
use windows::Win32::System::Power::{GetSystemPowerStatus, RegisterPowerSettingNotification, SetSuspendState, UnregisterPowerSettingNotification, HPOWERNOTIFY, SYSTEM_POWER_STATUS};
use windows::Win32::System::Shutdown::{ExitWindowsEx, LockWorkStation, EWX_LOGOFF, SHTDN_REASON_NONE};
use windows::Win32::System::SystemInformation::GetLocalTime;
use windows::Win32::System::SystemServices::{GUID_ACDC_POWER_SOURCE, GUID_BATTERY_PERCENTAGE_REMAINING};
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::{DEVICE_NOTIFY_WINDOW_HANDLE, SW_HIDE};

use crate::host::{Poster, WM_NETWORK, WM_RADIOS};

/// « mar. 21 oct.  17:42 » ou « Tue Oct 21  5:42 PM » ; l'heure suit le format de Windows.
pub fn clock(fr: bool) -> String {
    let t = unsafe { GetLocalTime() };
    let mut buf = [0u16; 32];
    let n = unsafe { GetTimeFormatEx(PCWSTR::null(), TIME_NOSECONDS, Some(&t), PCWSTR::null(), Some(&mut buf)) };
    let time = if n > 1 { String::from_utf16_lossy(&buf[..n as usize - 1]) } else { format!("{}:{:02}", t.wHour, t.wMinute) };
    let (dow, day, month) = (t.wDayOfWeek as usize % 7, t.wDay, (t.wMonth as usize).clamp(1, 12) - 1);
    if fr {
        const D: [&str; 7] = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
        const M: [&str; 12] = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
        format!("{} {} {}   {}", D[dow], day, M[month], time)
    } else {
        const D: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const M: [&str; 12] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        format!("{} {} {}   {}", D[dow], M[month], day, time)
    }
}

/// « mardi 21 octobre 2026 » ou « Tuesday, October 21, 2026 » (en tête du menu de l'heure).
pub fn long_date(fr: bool) -> String {
    let t = unsafe { GetLocalTime() };
    let (dow, day, month, year) = (t.wDayOfWeek as usize % 7, t.wDay, (t.wMonth as usize).clamp(1, 12) - 1, t.wYear);
    if fr {
        const D: [&str; 7] = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
        const M: [&str; 12] = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
        format!("{} {} {} {}", D[dow], day, M[month], year)
    } else {
        const D: [&str; 7] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const M: [&str; 12] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        format!("{}, {} {}, {}", D[dow], M[month], day, year)
    }
}

/// Millisecondes jusqu'à la prochaine minute (l'horloge se réveille une fois par minute).
pub fn to_next_minute() -> u32 {
    let t = unsafe { GetLocalTime() };
    let ms = 60_000u32.saturating_sub(t.wSecond as u32 * 1000 + t.wMilliseconds as u32);
    ms.clamp(200, 60_000) + 50
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Battery {
    pub percent: u8,
    pub charging: bool,
}

/// Batterie du portable ; None sur un PC fixe.
pub fn battery() -> Option<Battery> {
    let mut s = SYSTEM_POWER_STATUS::default();
    unsafe { GetSystemPowerStatus(&mut s) }.ok()?;
    // 128 : pas de batterie, 255 : inconnu
    if s.BatteryFlag & 128 != 0 || s.BatteryFlag == 255 || s.BatteryLifePercent > 100 {
        return None;
    }
    Some(Battery { percent: s.BatteryLifePercent, charging: s.ACLineStatus == 1 })
}

/// Messages de Windows quand la batterie ou le secteur changent.
pub struct PowerWatch(Vec<HPOWERNOTIFY>);

impl PowerWatch {
    pub fn start(hwnd: HWND) -> PowerWatch {
        let mut v = Vec::new();
        for g in [GUID_BATTERY_PERCENTAGE_REMAINING, GUID_ACDC_POWER_SOURCE] {
            if let Ok(h) = unsafe { RegisterPowerSettingNotification(HANDLE(hwnd.0), &g, DEVICE_NOTIFY_WINDOW_HANDLE) } {
                v.push(h);
            }
        }
        PowerWatch(v)
    }
}

impl Drop for PowerWatch {
    fn drop(&mut self) {
        for h in self.0.drain(..) {
            unsafe {
                let _ = UnregisterPowerSettingNotification(h);
            }
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Net {
    #[default]
    Offline,
    Wifi,
    Wired,
}

/// Connexion active : une carte réseau en marche avec une passerelle (Wi‑Fi avant câble si les deux).
pub fn network() -> Net {
    unsafe {
        let mut size = 16 * 1024u32;
        let mut buf: Vec<u64> = vec![0; size as usize / 8];
        let mut r = GetAdaptersAddresses(AF_UNSPEC.0 as u32, GAA_FLAG_INCLUDE_GATEWAYS | GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER, None, Some(buf.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH), &mut size);
        if r == 111 {
            // ERROR_BUFFER_OVERFLOW : la taille demandée est dans `size`
            buf = vec![0; size as usize / 8 + 1];
            r = GetAdaptersAddresses(AF_UNSPEC.0 as u32, GAA_FLAG_INCLUDE_GATEWAYS | GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER, None, Some(buf.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH), &mut size);
        }
        if r != 0 {
            return Net::Offline;
        }
        let (mut wifi, mut wired) = (false, false);
        let mut p = buf.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
        while !p.is_null() {
            let a = &*p;
            if a.OperStatus == IfOperStatusUp && !a.FirstGatewayAddress.is_null() {
                match a.IfType {
                    IF_TYPE_IEEE80211 => wifi = true,
                    IF_TYPE_ETHERNET_CSMACD => wired = true,
                    _ => {}
                }
            }
            p = a.Next;
        }
        if wifi {
            Net::Wifi
        } else if wired {
            Net::Wired
        } else {
            Net::Offline
        }
    }
}

/// Prévient Rago Shell quand une carte réseau change (Wi‑Fi connecté, câble débranché…).
pub struct NetWatch(HANDLE);

unsafe extern "system" fn on_net(ctx: *const core::ffi::c_void, _row: *const MIB_IPINTERFACE_ROW, _kind: MIB_NOTIFICATION_TYPE) {
    let poster = Poster::from_raw(ctx as isize);
    poster.post(WM_NETWORK, 0, 0);
}

impl NetWatch {
    pub fn start(poster: Poster) -> Option<NetWatch> {
        let mut h = HANDLE::default();
        let r = unsafe { NotifyIpInterfaceChange(AF_UNSPEC, Some(on_net), Some(poster.raw() as *const _), false, &mut h) };
        (r.0 == 0).then_some(NetWatch(h))
    }
}

impl Drop for NetWatch {
    fn drop(&mut self) {
        unsafe {
            let _ = CancelMibChangeNotify2(self.0);
        }
    }
}

// ——— Wi‑Fi et Bluetooth (radios de Windows) ———

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Radios {
    /// None : pas de radio de ce type sur le PC
    pub wifi: Option<bool>,
    pub bluetooth: Option<bool>,
}

/// Lit (et change si `set` le demande) l'état des radios dans un fil à part : les API de Windows sont asynchrones.
pub fn radios(shared: Arc<Mutex<Radios>>, poster: Poster, set: Option<(bool, bool)>) {
    std::thread::spawn(move || {
        use windows::Devices::Radios::{Radio, RadioKind, RadioState};
        use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_MULTITHREADED};
        let hr = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        let read = || -> windows::core::Result<Radios> {
            let list = Radio::GetRadiosAsync()?.join()?;
            let mut out = Radios::default();
            for r in list {
                let kind = r.Kind()?;
                if let Some((bt, on)) = set {
                    let targeted = if bt { kind == RadioKind::Bluetooth } else { kind == RadioKind::WiFi };
                    if targeted {
                        let _ = r.SetStateAsync(if on { RadioState::On } else { RadioState::Off })?.join();
                    }
                }
                let on = r.State()? == RadioState::On;
                if kind == RadioKind::WiFi {
                    out.wifi = Some(out.wifi.unwrap_or(false) || on);
                } else if kind == RadioKind::Bluetooth {
                    out.bluetooth = Some(out.bluetooth.unwrap_or(false) || on);
                }
            }
            Ok(out)
        };
        if let Ok(r) = read() {
            if let Ok(mut s) = shared.lock() {
                *s = r;
            }
            poster.post(WM_RADIOS, 0, 0);
        }
        if hr.is_ok() {
            unsafe { CoUninitialize() };
        }
    });
}

// ——— actions du système ———

pub fn lock() {
    unsafe {
        let _ = LockWorkStation();
    }
}

pub fn sleep() {
    unsafe {
        let _ = SetSuspendState(false, false, false);
    }
}

pub fn sign_out() {
    unsafe {
        let _ = ExitWindowsEx(EWX_LOGOFF, SHTDN_REASON_NONE);
    }
}

/// Redémarrer ou éteindre, comme le menu Démarrer (les applis ouvertes sont prévenues par Windows).
pub fn power_off(restart: bool) {
    let args = if restart { w!("/r /t 0") } else { w!("/s /t 0") };
    unsafe {
        ShellExecuteW(None, w!("open"), w!("shutdown.exe"), args, PCWSTR::null(), SW_HIDE);
    }
}

/// Raccourci de Windows tapé pour l'utilisateur (Win+D : bureau, Win+N : notifications, Win+A : réglages rapides).
pub fn win_key(key: u16) {
    let k = |vk: u16, up: bool| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: VIRTUAL_KEY(vk), wScan: 0, dwFlags: if up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) }, time: 0, dwExtraInfo: 0 } },
    };
    let inputs = [k(VK_LWIN.0, false), k(key, false), k(key, true), k(VK_LWIN.0, true)];
    unsafe {
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

// ——— presse-papiers ———

pub fn paste(owner: HWND) -> Option<String> {
    unsafe {
        OpenClipboard(Some(owner)).ok()?;
        let text = GetClipboardData(CF_UNICODETEXT.0 as u32).ok().and_then(|h| {
            let g = HGLOBAL(h.0);
            let p = GlobalLock(g) as *const u16;
            if p.is_null() {
                return None;
            }
            let mut n = 0usize;
            while *p.add(n) != 0 && n < 4096 {
                n += 1;
            }
            let s = String::from_utf16_lossy(std::slice::from_raw_parts(p, n));
            let _ = GlobalUnlock(g);
            Some(s)
        });
        let _ = CloseClipboard();
        text
    }
}

pub fn copy(owner: HWND, text: &str) {
    let w: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        if OpenClipboard(Some(owner)).is_err() {
            return;
        }
        let _ = EmptyClipboard();
        if let Ok(g) = GlobalAlloc(GMEM_MOVEABLE, w.len() * 2) {
            let p = GlobalLock(g) as *mut u16;
            if !p.is_null() {
                std::ptr::copy_nonoverlapping(w.as_ptr(), p, w.len());
                let _ = GlobalUnlock(g);
                let _ = SetClipboardData(CF_UNICODETEXT.0 as u32, Some(HANDLE(g.0)));
            }
        }
        let _ = CloseClipboard();
    }
}
