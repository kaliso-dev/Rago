//! Ping ICMP de Windows (écho, comme la commande ping), sans droits particuliers : le test réseau vers 1.1.1.1 et le
//! ping des jeux qui parlent à leur serveur en UDP (gameping.rs).
//!
//! Beaucoup de serveurs de jeu ne répondent pas à l'écho. `last_hop` cherche alors, comme tracert, le dernier routeur
//! qui répond sur le chemin : celui du centre de données, à une ou deux millisecondes du serveur.

// hors Windows (tests), pas d'écho : seul `public` sert
#![cfg_attr(not(windows), allow(dead_code))]

use std::net::Ipv4Addr;
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Reply {
    /// le serveur a répondu, aller-retour en ms
    Echo(f64),
    /// un routeur du chemin a répondu (durée de vie épuisée chez lui), aller-retour en ms
    Hop(Ipv4Addr, f64),
    Lost,
}

/// Adresse joignable sur Internet : ni la machine, ni le réseau de la maison, ni une adresse de groupe.
pub fn public(ip: Ipv4Addr) -> bool {
    let [a, b, ..] = ip.octets();
    !(ip.is_private()
        || ip.is_loopback()
        || ip.is_link_local()
        || ip.is_multicast()
        || ip.is_broadcast()
        || ip.is_unspecified()
        || ip.is_documentation()
        // réseau partagé des opérateurs (CGNAT)
        || (a == 100 && (64..128).contains(&b))
        || a >= 240)
}

#[cfg(windows)]
pub struct Pinger(windows_sys::Win32::Foundation::HANDLE);

// le handle d'IcmpCreateFile s'utilise depuis n'importe quel fil
#[cfg(windows)]
unsafe impl Send for Pinger {}

#[cfg(windows)]
impl Pinger {
    pub fn new() -> Option<Pinger> {
        use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
        let h = unsafe { windows_sys::Win32::NetworkManagement::IpHelper::IcmpCreateFile() };
        (!h.is_null() && h != INVALID_HANDLE_VALUE).then_some(Pinger(h))
    }

    /// Un écho vers `ip`. `ttl` : nombre de routeurs que le paquet peut traverser (None : celui de Windows).
    pub fn send(&self, ip: Ipv4Addr, ttl: Option<u8>, timeout: Duration) -> Reply {
        use windows_sys::Win32::NetworkManagement::IpHelper::{IcmpSendEcho, ICMP_ECHO_REPLY, IP_OPTION_INFORMATION, IP_SUCCESS, IP_TTL_EXPIRED_TRANSIT};
        let payload = [0x52u8; 32];
        // réponse, données renvoyées et place pour un message d'erreur ICMP
        let mut buf = [0u64; 64];
        let opts = IP_OPTION_INFORMATION { Ttl: ttl.unwrap_or(128), ..Default::default() };
        unsafe {
            IcmpSendEcho(
                self.0,
                u32::from_ne_bytes(ip.octets()),
                payload.as_ptr().cast(),
                payload.len() as u16,
                if ttl.is_some() { &opts } else { std::ptr::null() },
                buf.as_mut_ptr().cast(),
                std::mem::size_of_val(&buf) as u32,
                timeout.as_millis().clamp(1, 5000) as u32,
            );
        }
        // lue même quand l'appel renvoie 0 : selon la version de Windows, une durée de vie épuisée passe par là
        let r = unsafe { std::ptr::read_unaligned(buf.as_ptr().cast::<ICMP_ECHO_REPLY>()) };
        let from = Ipv4Addr::from(r.Address.to_ne_bytes());
        let ms = f64::from(r.RoundTripTime);
        match r.Status {
            IP_SUCCESS if r.Address != 0 && from == ip => Reply::Echo(ms),
            IP_TTL_EXPIRED_TRANSIT if r.Address != 0 => Reply::Hop(from, ms),
            _ => Reply::Lost,
        }
    }
}

#[cfg(windows)]
impl Drop for Pinger {
    fn drop(&mut self) {
        unsafe {
            windows_sys::Win32::NetworkManagement::IpHelper::IcmpCloseHandle(self.0);
        }
    }
}

#[cfg(not(windows))]
pub struct Pinger;

#[cfg(not(windows))]
impl Pinger {
    pub fn new() -> Option<Pinger> {
        None
    }
    pub fn send(&self, _ip: Ipv4Addr, _ttl: Option<u8>, _timeout: Duration) -> Reply {
        Reply::Lost
    }
}

/// Dernier point du chemin vers `ip` qui répond à l'écho : le serveur lui-même, sinon le dernier routeur public avant
/// lui. None : rien ne répond au-delà de la maison et de l'opérateur.
pub fn last_hop(p: &Pinger, ip: Ipv4Addr) -> Option<Ipv4Addr> {
    let mut last = None;
    let mut silent = 0;
    for ttl in 1..=30u8 {
        match p.send(ip, Some(ttl), Duration::from_millis(700)) {
            Reply::Echo(_) => return Some(ip),
            Reply::Hop(hop, _) => {
                silent = 0;
                if public(hop) {
                    last = Some(hop);
                }
            }
            Reply::Lost => {
                silent += 1;
                // le reste du chemin ne répond plus : le serveur filtre l'écho, ses routeurs aussi
                if silent >= 4 && last.is_some() {
                    break;
                }
            }
        }
    }
    // le serveur répond au dernier essai sans durée de vie limitée
    if matches!(p.send(ip, None, Duration::from_millis(900)), Reply::Echo(_)) {
        return Some(ip);
    }
    last
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_internet_addresses() {
        assert!(public(Ipv4Addr::new(1, 1, 1, 1)));
        assert!(public(Ipv4Addr::new(52, 58, 1, 2)));
        assert!(!public(Ipv4Addr::new(192, 168, 1, 1)));
        assert!(!public(Ipv4Addr::new(10, 0, 0, 1)));
        assert!(!public(Ipv4Addr::new(100, 72, 3, 1)));
        assert!(!public(Ipv4Addr::new(127, 0, 0, 1)));
        assert!(!public(Ipv4Addr::new(239, 255, 255, 250)));
        assert!(!public(Ipv4Addr::new(255, 255, 255, 255)));
    }
}
