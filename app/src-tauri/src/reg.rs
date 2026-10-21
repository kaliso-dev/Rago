//! Lecture du registre (bibliothèque de jeux, launchers, état des services du RBW Mod). Vue 64 bits, lecture seule.
#![cfg(windows)]

use windows_sys::Win32::Foundation::ERROR_SUCCESS;
use windows_sys::Win32::System::Registry::*;

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub struct Key(HKEY);
impl Drop for Key {
    fn drop(&mut self) {
        unsafe { RegCloseKey(self.0) };
    }
}

pub fn open(path: &str) -> Option<Key> {
    let (root, sub) = path.split_once('\\')?;
    let h = match root {
        "HKLM" => HKEY_LOCAL_MACHINE,
        "HKCU" => HKEY_CURRENT_USER,
        _ => return None,
    };
    let mut out: HKEY = std::ptr::null_mut();
    let r = unsafe { RegOpenKeyExW(h, wide(sub).as_ptr(), 0, KEY_READ | KEY_WOW64_64KEY, &mut out) };
    (r == ERROR_SUCCESS).then_some(Key(out))
}

pub fn subkeys(path: &str) -> Vec<String> {
    let Some(k) = open(path) else { return Vec::new() };
    let mut out = Vec::new();
    for i in 0.. {
        let mut name = [0u16; 256];
        let mut len = name.len() as u32;
        let r = unsafe {
            RegEnumKeyExW(k.0, i, name.as_mut_ptr(), &mut len, std::ptr::null(), std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut())
        };
        if r != ERROR_SUCCESS {
            break;
        }
        out.push(String::from_utf16_lossy(&name[..len as usize]));
    }
    out
}

pub fn string(path: &str, name: &str) -> Option<String> {
    let k = open(path)?;
    let n = wide(name);
    let (mut kind, mut len) = (0u32, 0u32);
    if unsafe { RegQueryValueExW(k.0, n.as_ptr(), std::ptr::null(), &mut kind, std::ptr::null_mut(), &mut len) } != ERROR_SUCCESS {
        return None;
    }
    if kind != REG_SZ && kind != REG_EXPAND_SZ {
        return None;
    }
    let mut buf = vec![0u16; (len as usize).div_ceil(2) + 1];
    if unsafe { RegQueryValueExW(k.0, n.as_ptr(), std::ptr::null(), &mut kind, buf.as_mut_ptr().cast(), &mut len) } != ERROR_SUCCESS {
        return None;
    }
    let s = String::from_utf16_lossy(&buf[..(len as usize / 2)]);
    let s = s.trim_end_matches('\0').trim().to_string();
    (!s.is_empty()).then_some(s)
}

/// Valeur DWORD, None si elle n'existe pas (ou n'est pas un DWORD).
pub fn dword(path: &str, name: &str) -> Option<u32> {
    let k = open(path)?;
    let n = wide(name);
    let (mut kind, mut v, mut len) = (0u32, 0u32, 4u32);
    let r = unsafe { RegQueryValueExW(k.0, n.as_ptr(), std::ptr::null(), &mut kind, (&mut v as *mut u32).cast(), &mut len) };
    (r == ERROR_SUCCESS && kind == REG_DWORD && len == 4).then_some(v)
}

pub fn exists(path: &str) -> bool {
    open(path).is_some()
}
