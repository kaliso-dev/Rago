//! Avec qui le jeu échange ses paquets (barre en jeu, ping des jeux en UDP comme PUBG, Valorant ou CS2).
//!
//! Windows ne garde pas l'adresse d'en face des sockets UDP : seul le journal d'événements du noyau
//! (Microsoft-Windows-Kernel-Network, ETW) la donne, paquet par paquet, avec le processus. Une session temps réel le
//! lit tant que la barre ou la pastille suit un jeu (droits administrateur : l'app les a), et s'arrête toute seule
//! quand plus personne ne demande. Rien n'est envoyé ni modifié : on compte les paquets reçus par adresse.
//!
//! Le serveur de jeu est l'adresse publique dont le jeu reçoit le plus de paquets en ce moment (il en envoie des
//! dizaines par seconde pendant une partie), hors web, DNS et découverte du réseau local.

// hors Windows (tests), seul le décompte sert
#![cfg_attr(not(windows), allow(dead_code))]

use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Proto {
    Tcp,
    Udp,
}

/// Correspondant du jeu : adresse, port et paquets reçus sur les dernières secondes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Peer {
    pub proto: Proto,
    pub ip: Ipv4Addr,
    pub port: u16,
    pub rx: u32,
}

/// Fenêtre de comptage : deux tranches de 2 s.
const SLICE: Duration = Duration::from_secs(2);
/// Moins de paquets que ça en 4 s : pas une partie en cours (menu, salon, chat vocal muet).
const MIN_RX: u32 = 12;
/// Ports qui ne sont jamais le serveur de jeu : DNS, NTP, web et QUIC, découverte du réseau local.
const NOT_GAME: &[u16] = &[53, 67, 68, 80, 123, 137, 138, 443, 1900, 3702, 5353, 5355, 8080];

#[derive(Default)]
struct Count {
    now: u32,
    prev: u32,
}

#[derive(Default)]
pub struct Flows {
    pid: u32,
    slice: Option<Instant>,
    map: HashMap<(Proto, Ipv4Addr, u16), Count>,
}

impl Flows {
    /// Les tranches avancent avec le temps : au-delà de deux, tout est remis à zéro.
    fn rotate(&mut self, at: Instant) {
        let Some(start) = self.slice else {
            self.slice = Some(at);
            return;
        };
        let gone = at.saturating_duration_since(start).as_millis() / SLICE.as_millis();
        if gone == 0 {
            return;
        }
        for c in self.map.values_mut() {
            c.prev = if gone == 1 { c.now } else { 0 };
            c.now = 0;
        }
        self.map.retain(|_, c| c.prev > 0);
        self.slice = Some(start + SLICE * gone as u32);
    }

    /// Suit un autre processus : les comptes repartent de zéro.
    pub fn follow(&mut self, pid: u32) {
        if self.pid != pid {
            *self = Flows { pid, ..Flows::default() };
        }
    }

    pub fn record(&mut self, pid: u32, proto: Proto, ip: Ipv4Addr, port: u16, received: bool, at: Instant) {
        if pid != self.pid || pid == 0 || !received {
            return;
        }
        self.rotate(at);
        self.map.entry((proto, ip, port)).or_default().now += 1;
    }

    /// Le serveur de jeu en ce moment, s'il y en a un.
    pub fn top(&mut self, at: Instant) -> Option<Peer> {
        self.rotate(at);
        self.map
            .iter()
            .filter(|((_, ip, port), _)| crate::icmp::public(*ip) && !NOT_GAME.contains(port))
            .map(|(&(proto, ip, port), c)| Peer { proto, ip, port, rx: c.now + c.prev })
            .filter(|p| p.rx >= MIN_RX)
            // à égalité, l'UDP d'abord : c'est lui qui porte la partie
            .max_by_key(|p| (p.rx, p.proto == Proto::Udp))
    }
}

/// Champs communs des événements TCP/UDP IPv4 du noyau : PID, taille, adresse d'en face, adresse locale, port d'en
/// face, port local (adresses et ports dans l'ordre du réseau). None : événement trop court.
pub fn parse(data: &[u8]) -> Option<(u32, Ipv4Addr, u16)> {
    let d = data.get(..20)?;
    let pid = u32::from_le_bytes([d[0], d[1], d[2], d[3]]);
    let ip = Ipv4Addr::new(d[8], d[9], d[10], d[11]);
    let port = u16::from_be_bytes([d[16], d[17]]);
    Some((pid, ip, port))
}

/// Identifiants des événements suivis : (protocole, reçu).
pub fn kind(event_id: u16) -> Option<(Proto, bool)> {
    match event_id {
        10 => Some((Proto::Tcp, false)),
        11 => Some((Proto::Tcp, true)),
        42 => Some((Proto::Udp, false)),
        43 => Some((Proto::Udp, true)),
        _ => None,
    }
}

#[cfg(windows)]
mod etw {
    use super::{kind, parse, Flows};
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, Instant};
    use windows_sys::core::GUID;
    use windows_sys::Win32::System::Diagnostics::Etw::{
        CloseTrace, ControlTraceW, EnableTraceEx2, OpenTraceW, ProcessTrace, StartTraceW, CONTROLTRACE_HANDLE, EVENT_CONTROL_CODE_ENABLE_PROVIDER,
        EVENT_RECORD, EVENT_TRACE_CONTROL_STOP, EVENT_TRACE_LOGFILEW, EVENT_TRACE_PROPERTIES, EVENT_TRACE_REAL_TIME_MODE, PROCESS_TRACE_MODE_EVENT_RECORD,
        PROCESS_TRACE_MODE_REAL_TIME, TRACE_LEVEL_INFORMATION, WNODE_FLAG_TRACED_GUID,
    };

    /// Microsoft-Windows-Kernel-Network
    const PROVIDER: GUID = GUID::from_u128(0x7dd42a49_5329_4832_8dfd_43d979153a88);
    const NAME: &str = "Rago-GamePing";
    /// Plus personne ne demande depuis tout ce temps : la session s'arrête.
    const IDLE: Duration = Duration::from_secs(30);

    pub struct Session {
        pub flows: Mutex<Flows>,
        /// processus suivi, lu sans verrou pour chaque paquet de la machine
        pid: AtomicU32,
        running: AtomicBool,
        last_use: Mutex<Option<Instant>>,
        /// échec au démarrage (pas les droits, Windows trop ancien) : on ne réessaie pas à chaque tour
        failed: AtomicBool,
    }

    pub fn session() -> &'static Session {
        static S: OnceLock<Session> = OnceLock::new();
        S.get_or_init(|| Session { flows: Mutex::default(), pid: AtomicU32::new(0), running: AtomicBool::new(false), last_use: Mutex::new(None), failed: AtomicBool::new(false) })
    }

    unsafe extern "system" fn on_event(rec: *mut EVENT_RECORD) {
        let r = &*rec;
        let Some((proto, received)) = kind(r.EventHeader.EventDescriptor.Id) else { return };
        if r.UserData.is_null() || r.UserDataLength < 20 {
            return;
        }
        let data = std::slice::from_raw_parts(r.UserData as *const u8, r.UserDataLength as usize);
        let Some((pid, ip, port)) = parse(data) else { return };
        if pid != session().pid.load(Ordering::Relaxed) {
            return;
        }
        let mut f = session().flows.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        f.record(pid, proto, ip, port, received, Instant::now());
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    /// Propriétés d'une session temps réel à ce nom (le nom est copié derrière la structure).
    fn properties() -> Vec<u64> {
        let name = wide(NAME);
        let size = std::mem::size_of::<EVENT_TRACE_PROPERTIES>() + name.len() * 2;
        let mut buf = vec![0u64; size.div_ceil(8)];
        let p = buf.as_mut_ptr().cast::<EVENT_TRACE_PROPERTIES>();
        unsafe {
            (*p).Wnode.BufferSize = size as u32;
            (*p).Wnode.Flags = WNODE_FLAG_TRACED_GUID;
            // horloge QPC
            (*p).Wnode.ClientContext = 1;
            (*p).LogFileMode = EVENT_TRACE_REAL_TIME_MODE;
            (*p).FlushTimer = 1;
            (*p).BufferSize = 64;
            (*p).LoggerNameOffset = std::mem::size_of::<EVENT_TRACE_PROPERTIES>() as u32;
        }
        buf
    }

    fn stop_named() {
        let name = wide(NAME);
        let mut props = properties();
        unsafe {
            ControlTraceW(CONTROLTRACE_HANDLE { Value: 0 }, name.as_ptr(), props.as_mut_ptr().cast(), EVENT_TRACE_CONTROL_STOP);
        }
    }

    fn start() -> bool {
        let name = wide(NAME);
        let mut handle = CONTROLTRACE_HANDLE { Value: 0 };
        let mut props = properties();
        let mut rc = unsafe { StartTraceW(&mut handle, name.as_ptr(), props.as_mut_ptr().cast()) };
        if rc == 183 {
            // ERROR_ALREADY_EXISTS : restée d'un lancement précédent (app fermée de force)
            stop_named();
            props = properties();
            rc = unsafe { StartTraceW(&mut handle, name.as_ptr(), props.as_mut_ptr().cast()) };
        }
        if rc != 0 {
            eprintln!("[flows] StartTrace {rc}");
            return false;
        }
        let rc = unsafe { EnableTraceEx2(handle, &PROVIDER, EVENT_CONTROL_CODE_ENABLE_PROVIDER, TRACE_LEVEL_INFORMATION as u8, u64::MAX, 0, 0, std::ptr::null()) };
        if rc != 0 {
            eprintln!("[flows] EnableTrace {rc}");
            stop_named();
            return false;
        }
        std::thread::Builder::new()
            .name("rago-flows".into())
            .spawn(|| {
                let mut name = wide(NAME);
                let mut log: EVENT_TRACE_LOGFILEW = unsafe { std::mem::zeroed() };
                log.LoggerName = name.as_mut_ptr();
                log.Anonymous1.ProcessTraceMode = PROCESS_TRACE_MODE_REAL_TIME | PROCESS_TRACE_MODE_EVENT_RECORD;
                log.Anonymous2.EventRecordCallback = Some(on_event);
                let h = unsafe { OpenTraceW(&mut log) };
                if h.Value != u64::MAX {
                    // rend la main quand la session s'arrête
                    unsafe {
                        ProcessTrace(&h, 1, std::ptr::null(), std::ptr::null());
                        CloseTrace(h);
                    }
                }
                session().running.store(false, Ordering::SeqCst);
            })
            .is_ok()
    }

    impl Session {
        /// Le jeu `pid` est suivi : la session démarre si besoin, et repart de zéro pour un autre jeu.
        pub fn follow(&self, pid: u32) -> bool {
            *self.last_use.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = Some(Instant::now());
            self.pid.store(pid, Ordering::Relaxed);
            self.flows.lock().unwrap_or_else(std::sync::PoisonError::into_inner).follow(pid);
            if self.running.load(Ordering::SeqCst) {
                return true;
            }
            if self.failed.load(Ordering::SeqCst) {
                return false;
            }
            if !start() {
                self.failed.store(true, Ordering::SeqCst);
                return false;
            }
            self.running.store(true, Ordering::SeqCst);
            // arrêt quand plus personne ne demande
            let _ = std::thread::Builder::new().name("rago-flows-idle".into()).spawn(|| loop {
                std::thread::sleep(Duration::from_secs(5));
                let s = session();
                if !s.running.load(Ordering::SeqCst) {
                    return;
                }
                let idle = s.last_use.lock().unwrap_or_else(std::sync::PoisonError::into_inner).is_none_or(|t| t.elapsed() >= IDLE);
                if idle {
                    stop_named();
                    return;
                }
            });
            true
        }

        pub fn stop(&self) {
            if self.running.load(Ordering::SeqCst) {
                stop_named();
            }
        }
    }
}

/// Ce que le journal du noyau montre du jeu.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Seen {
    /// journal illisible (pas les droits, Windows trop ancien)
    Off,
    /// pas de partie en cours : menu, salon, hors ligne
    Nothing,
    Server(Peer),
}

/// Le serveur de jeu du processus `pid` en ce moment.
#[cfg(windows)]
pub fn server(pid: u32) -> Seen {
    let s = etw::session();
    if !s.follow(pid) {
        return Seen::Off;
    }
    match s.flows.lock().unwrap_or_else(std::sync::PoisonError::into_inner).top(Instant::now()) {
        Some(p) => Seen::Server(p),
        None => Seen::Nothing,
    }
}

/// Fin de l'app : la session du noyau ne doit pas lui survivre.
#[cfg(windows)]
pub fn shutdown() {
    etw::session().stop();
}

#[cfg(not(windows))]
pub fn server(_pid: u32) -> Seen {
    Seen::Off
}
#[cfg(not(windows))]
pub fn shutdown() {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_kernel_network_events() {
        // PID 4242, 120 octets, de 52.58.1.2:7086 vers 192.168.1.20:51000
        let mut d = Vec::new();
        d.extend_from_slice(&4242u32.to_le_bytes());
        d.extend_from_slice(&120u32.to_le_bytes());
        d.extend_from_slice(&[52, 58, 1, 2]);
        d.extend_from_slice(&[192, 168, 1, 20]);
        d.extend_from_slice(&7086u16.to_be_bytes());
        d.extend_from_slice(&51000u16.to_be_bytes());
        d.extend_from_slice(&[0; 12]);
        assert_eq!(parse(&d), Some((4242, Ipv4Addr::new(52, 58, 1, 2), 7086)));
        assert_eq!(parse(&d[..19]), None);
        assert_eq!(kind(43), Some((Proto::Udp, true)));
        assert_eq!(kind(10), Some((Proto::Tcp, false)));
        assert_eq!(kind(12), None);
    }

    #[test]
    fn the_busiest_public_peer_is_the_game_server() {
        let t0 = Instant::now();
        let mut f = Flows::default();
        f.follow(7);
        let server = Ipv4Addr::new(52, 58, 1, 2);
        let voice = Ipv4Addr::new(104, 17, 3, 4);
        let lobby = Ipv4Addr::new(13, 32, 1, 1);
        for i in 0..60 {
            let at = t0 + Duration::from_millis(i * 30);
            f.record(7, Proto::Udp, server, 7086, true, at);
            f.record(7, Proto::Udp, server, 7086, false, at);
            if i % 3 == 0 {
                f.record(7, Proto::Udp, voice, 3478, true, at);
                f.record(7, Proto::Tcp, lobby, 443, true, at);
            }
            // autre processus, réseau local : ignorés
            f.record(8, Proto::Udp, Ipv4Addr::new(1, 2, 3, 4), 9000, true, at);
            f.record(7, Proto::Udp, Ipv4Addr::new(192, 168, 1, 1), 1900, true, at);
        }
        let top = f.top(t0 + Duration::from_millis(1900)).unwrap();
        assert_eq!((top.proto, top.ip, top.port, top.rx), (Proto::Udp, server, 7086, 60));
        // 4 s sans paquet : plus de partie
        assert_eq!(f.top(t0 + Duration::from_secs(7)), None);
        // un autre jeu repart de zéro
        f.record(7, Proto::Udp, server, 7086, true, t0 + Duration::from_secs(8));
        f.follow(9);
        assert_eq!(f.top(t0 + Duration::from_secs(8)), None);
    }

    #[test]
    fn too_few_packets_is_not_a_match() {
        let t0 = Instant::now();
        let mut f = Flows::default();
        f.follow(7);
        for i in 0..5 {
            f.record(7, Proto::Udp, Ipv4Addr::new(52, 58, 1, 2), 7086, true, t0 + Duration::from_millis(i * 100));
        }
        assert_eq!(f.top(t0 + Duration::from_secs(1)), None);
    }
}
