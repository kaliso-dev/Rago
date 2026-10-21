//! Ping du jeu en cours (barre en jeu, RAG-82).
//! - Minecraft Java : ping / pong du protocole du jeu vers le serveur où il est connecté, toutes les 3 s, comme sa liste
//!   des serveurs (mcping.rs). C'est le ping que le serveur affiche : Hypixel est derrière Cloudflare, et l'aller-retour
//!   TCP ne va que jusqu'au Cloudflare le plus proche.
//! - Autres jeux en TCP : temps d'aller-retour de leur connexion au serveur, tel que Windows le mesure déjà pour cette
//!   connexion (statistiques TCP étendues). Aucun paquet n'est envoyé au serveur.
//! Les jeux qui parlent au serveur en UDP (Valorant, CS2, Fortnite) n'ont pas de connexion à suivre : pas de valeur.

use std::net::{Ipv4Addr, SocketAddr};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Connexion TCP établie d'un processus : adresses et ports tels que Windows les donne (ports en ordre réseau).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Conn {
    pub local: u32,
    pub local_port: u32,
    pub remote: u32,
    pub remote_port: u32,
}

impl Conn {
    pub fn remote_ip(&self) -> Ipv4Addr {
        Ipv4Addr::from(u32::from_be(self.remote))
    }
    pub fn port(&self) -> u16 {
        u16::from_be(self.remote_port as u16)
    }
    pub fn server(&self) -> SocketAddr {
        SocketAddr::new(self.remote_ip().into(), self.port())
    }
}

/// La connexion au serveur de jeu parmi celles du processus : ni la machine elle-même, ni le web (80, 443 : comptes,
/// skins, launcher), le port de Minecraft d'abord, la plus ancienne gardée tant qu'elle existe.
pub fn pick(conns: &[Conn], current: Option<Conn>) -> Option<Conn> {
    if let Some(c) = current.filter(|c| conns.contains(c)) {
        return Some(c);
    }
    let game = |c: &&Conn| {
        let ip = c.remote_ip();
        !ip.is_loopback() && !ip.is_unspecified() && !matches!(c.port(), 80 | 443 | 8080)
    };
    let found = conns.iter().filter(game);
    found.clone().find(|c| c.port() == 25565).or_else(|| found.clone().next()).copied()
}

/// Mesures Minecraft : un fil à la fois, la dernière valeur gardée pour l'affichage.
#[derive(Default)]
struct Mc {
    conn: Option<Conn>,
    host: Option<String>,
    value: Option<u32>,
    at: Option<Instant>,
    busy: bool,
    /// échecs d'affilée : le serveur ne répond pas au ping du jeu, on revient à l'aller-retour TCP
    fails: u8,
}

const MC_EVERY: Duration = Duration::from_secs(3);
const MC_TIMEOUT: Duration = Duration::from_secs(2);

#[cfg(windows)]
mod win {
    use super::Conn;
    use windows_sys::Win32::NetworkManagement::IpHelper::{
        GetExtendedTcpTable, GetPerTcpConnectionEStats, SetPerTcpConnectionEStats, TcpConnectionEstatsPath, MIB_TCPROW_LH,
        MIB_TCPROW_OWNER_PID, MIB_TCP_STATE_ESTAB, TCP_ESTATS_PATH_ROD_v0, TCP_ESTATS_PATH_RW_v0, TCP_TABLE_OWNER_PID_CONNECTIONS,
    };
    use windows_sys::Win32::Networking::WinSock::AF_INET;

    /// Connexions TCP (IPv4) établies du processus.
    pub fn connections(pid: u32) -> Vec<Conn> {
        let mut size = 0u32;
        unsafe {
            GetExtendedTcpTable(std::ptr::null_mut(), &mut size, 0, AF_INET as u32, TCP_TABLE_OWNER_PID_CONNECTIONS, 0);
        }
        if size == 0 {
            return Vec::new();
        }
        // la table peut grandir entre les deux appels : un peu de marge
        let mut buf = vec![0u64; (size as usize + 1024) / 8 + 1];
        let mut len = (buf.len() * 8) as u32;
        let rc = unsafe {
            GetExtendedTcpTable(buf.as_mut_ptr().cast(), &mut len, 0, AF_INET as u32, TCP_TABLE_OWNER_PID_CONNECTIONS, 0)
        };
        if rc != 0 {
            return Vec::new();
        }
        let base = buf.as_ptr().cast::<u8>();
        let n = unsafe { *base.cast::<u32>() } as usize;
        let rows = unsafe { base.add(4).cast::<MIB_TCPROW_OWNER_PID>() };
        let max = (len as usize).saturating_sub(4) / std::mem::size_of::<MIB_TCPROW_OWNER_PID>();
        (0..n.min(max))
            .map(|i| unsafe { std::ptr::read_unaligned(rows.add(i)) })
            .filter(|r| r.dwOwningPid == pid && r.dwState == MIB_TCP_STATE_ESTAB as u32)
            .map(|r| Conn { local: r.dwLocalAddr, local_port: r.dwLocalPort, remote: r.dwRemoteAddr, remote_port: r.dwRemotePort })
            .collect()
    }

    fn row(c: &Conn) -> MIB_TCPROW_LH {
        let mut r = MIB_TCPROW_LH::default();
        r.Anonymous.dwState = MIB_TCP_STATE_ESTAB as u32;
        r.dwLocalAddr = c.local;
        r.dwLocalPort = c.local_port;
        r.dwRemoteAddr = c.remote;
        r.dwRemotePort = c.remote_port;
        r
    }

    /// Active la mesure de Windows sur cette connexion (droits administrateur : l'app les a).
    pub fn watch(c: &Conn) -> bool {
        let rw = TCP_ESTATS_PATH_RW_v0 { EnableCollection: true };
        let rc = unsafe {
            SetPerTcpConnectionEStats(
                &row(c),
                TcpConnectionEstatsPath,
                (&rw as *const TCP_ESTATS_PATH_RW_v0).cast(),
                0,
                std::mem::size_of::<TCP_ESTATS_PATH_RW_v0>() as u32,
                0,
            )
        };
        rc == 0
    }

    /// Aller-retour lissé de la connexion, en ms (None tant que Windows n'a rien mesuré).
    pub fn rtt(c: &Conn) -> Option<u32> {
        let mut rod = TCP_ESTATS_PATH_ROD_v0::default();
        let rc = unsafe {
            GetPerTcpConnectionEStats(
                &row(c),
                TcpConnectionEstatsPath,
                std::ptr::null_mut(),
                0,
                0,
                std::ptr::null_mut(),
                0,
                0,
                (&mut rod as *mut TCP_ESTATS_PATH_ROD_v0).cast(),
                0,
                std::mem::size_of::<TCP_ESTATS_PATH_ROD_v0>() as u32,
            )
        };
        // u32::MAX : pas encore d'échantillon
        (rc == 0 && rod.CountRtt > 0 && rod.SmoothedRtt != u32::MAX).then_some(rod.SmoothedRtt)
    }
}

/// Suit la connexion au serveur du jeu d'un processus.
#[derive(Default)]
pub struct GamePing {
    pid: Option<u32>,
    conn: Option<Conn>,
    mc: Arc<Mutex<Mc>>,
}

impl GamePing {
    /// Ping en ms du jeu `pid`, None s'il n'a pas de connexion TCP à un serveur (jeu en UDP, menu, hors ligne).
    /// `minecraft` : Minecraft Java, mesuré avec le ping du jeu.
    #[cfg(windows)]
    pub fn read(&mut self, pid: u32, minecraft: bool) -> Option<u32> {
        if self.pid != Some(pid) {
            *self = GamePing { pid: Some(pid), ..GamePing::default() };
        }
        let next = pick(&win::connections(pid), self.conn);
        if next != self.conn {
            self.conn = next.filter(|c| minecraft || win::watch(c));
        }
        let conn = self.conn?;
        if minecraft {
            if let Some(v) = self.minecraft(conn) {
                return v;
            }
            // pas un serveur Minecraft classique : l'aller-retour TCP, faute de mieux
            win::watch(&conn);
        }
        win::rtt(&conn)
    }

    #[cfg(not(windows))]
    pub fn read(&mut self, _pid: u32, _minecraft: bool) -> Option<u32> {
        let _ = (self.pid, self.conn);
        None
    }

    /// Dernier ping du jeu mesuré sur `conn` (une mesure lancée en fond toutes les 3 s). None : le serveur ne répond
    /// pas au ping du jeu, Some(None) : pas encore de valeur.
    #[cfg_attr(not(windows), allow(dead_code))]
    fn minecraft(&self, conn: Conn) -> Option<Option<u32>> {
        let mut mc = self.mc.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if mc.conn != Some(conn) {
            *mc = Mc { conn: Some(conn), ..Mc::default() };
        }
        if mc.fails >= 3 && mc.value.is_none() {
            return None;
        }
        if !mc.busy && mc.at.is_none_or(|t| t.elapsed() >= MC_EVERY) {
            mc.busy = true;
            mc.at = Some(Instant::now());
            let (shared, host) = (Arc::clone(&self.mc), mc.host.clone());
            std::thread::spawn(move || {
                let host = host.unwrap_or_else(|| crate::mcping::host_for(conn.server().ip()));
                let ms = crate::mcping::ping(conn.server(), &host, MC_TIMEOUT);
                let mut mc = shared.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
                mc.busy = false;
                if mc.conn != Some(conn) {
                    return;
                }
                mc.host = Some(host);
                match ms {
                    Some(ms) => {
                        mc.value = Some(ms.round() as u32);
                        mc.fails = 0;
                    }
                    None => {
                        mc.fails = mc.fails.saturating_add(1);
                        // une mesure perdue garde la valeur précédente, trois d'affilée l'effacent
                        if mc.fails >= 3 {
                            mc.value = None;
                        }
                    }
                }
            });
        }
        Some(mc.value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conn(ip: [u8; 4], port: u16) -> Conn {
        Conn { local: u32::from(Ipv4Addr::new(192, 168, 1, 2)).to_be(), local_port: 50000, remote: u32::from(Ipv4Addr::from(ip)).to_be(), remote_port: u32::from(port.to_be()) }
    }

    #[test]
    fn picks_the_game_server() {
        let web = conn([104, 16, 1, 1], 443);
        let local = conn([127, 0, 0, 1], 25565);
        let hypixel = conn([172, 65, 1, 2], 25565);
        assert_eq!(hypixel.port(), 25565);
        assert_eq!(pick(&[web, local, hypixel], None), Some(hypixel));
        assert_eq!(pick(&[web, local], None), None);
        // la connexion suivie reste la même tant qu'elle existe
        let other = conn([51, 1, 2, 3], 25566);
        assert_eq!(pick(&[other, hypixel], Some(hypixel)), Some(hypixel));
        assert_eq!(pick(&[other], Some(hypixel)), Some(other));
        // le port de Minecraft passe devant une autre connexion du launcher
        assert_eq!(pick(&[other, hypixel], None), Some(hypixel));
        assert_eq!(hypixel.server().to_string(), "172.65.1.2:25565");
    }

    /// Le ping de Minecraft vient d'un fil à part : pas de valeur au premier appel, puis celle du serveur.
    #[test]
    fn minecraft_ping_comes_from_the_game_protocol() {
        use std::io::{Read, Write};
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        std::thread::spawn(move || {
            for c in l.incoming().take(4) {
                let mut c = c.unwrap();
                let mut buf = [0u8; 256];
                let n = c.read(&mut buf).unwrap();
                assert!(n > 4);
                // état : {"a":1}, puis pong
                c.write_all(&[9, 0x00, 7, b'{', b'"', b'a', b'"', b':', b'1', b'}']).unwrap();
                let n = c.read(&mut buf).unwrap();
                c.write_all(&buf[..n]).unwrap();
            }
        });
        let local = conn([127, 0, 0, 1], port);
        let gp = GamePing::default();
        assert_eq!(gp.minecraft(local), Some(None));
        let mut v = None;
        for _ in 0..50 {
            std::thread::sleep(Duration::from_millis(40));
            if let Some(Some(ms)) = gp.minecraft(local) {
                v = Some(ms);
                break;
            }
        }
        assert!(v.is_some_and(|ms| ms < 1000), "{v:?}");
    }
}
