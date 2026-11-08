//! Rago Route : le tunnel anti-lag pour Minecraft, côté PC du joueur (Sofiene, 07/11/2026 : « OK let's go »).
//!
//! Port en Rust du client du prototype `proxy/rago-route.py`, avec le même protocole : il parle aux mêmes sorties Rago
//! (Vultr Paris) et au même relais (Vultr Frankfurt), sans rien changer sur les serveurs. Le jeu se connecte à
//! `localhost` (Hypixel) ou `localhost:25566` (Minemen) ; chaque paquet part par tous les trajets à la fois (direct
//! vers la sortie, et par le relais), la première copie arrivée gagne, les pertes sont renvoyées sans attendre un
//! délai (renvoi rapide sur l'horodatage renvoyé par l'autre bout), et la sortie garde la connexion au serveur 60 s
//! quand le PC ne répond plus (coupure du Wi-Fi). La sortie réécrit elle-même le nom du serveur dans le handshake.
//!
//! Le jeu n'est jamais modifié : Rago Route ne fait que transporter les octets (chiffrés par Minecraft après la
//! connexion). Rien n'est stocké ni envoyé ailleurs que vers les serveurs Rago.
//!
//! Fils : un fil moteur (toutes les décisions, toutes les 5 ms ou à chaque paquet), un fil de lecture par trajet UDP,
//! un par port local d'écoute et un par connexion du jeu. Ils parlent au moteur par un seul canal : pas de verrou dans
//! le chemin des paquets. L'état affiché par l'app est recopié deux fois par seconde.

use serde::Serialize;
use std::collections::{BTreeMap, HashMap, VecDeque};
use std::io::{ErrorKind, Read, Write};
use std::net::{Ipv4Addr, Shutdown, SocketAddrV4, TcpListener, TcpStream, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

// --- protocole (identique à proxy/rago-route.py) ------------------------------------------------------------------

const MAGIC: &[u8; 2] = b"RR";
const VERSION: u8 = 1;
const T_OPEN: u8 = 1;
const T_OPEN_OK: u8 = 2;
const T_DATA: u8 = 3;
const T_ACK: u8 = 4;
const T_PING: u8 = 5;
const T_PONG: u8 = 6;
const T_CLOSE: u8 = 7;
const T_FWD: u8 = 8;
/// réponse de la sortie à un OPEN sans jeton valable (sorties du 08/11 et après)
const T_REFUSE: u8 = 9;
/// magie (2), version (1), type (1), session (16)
const HEADER: usize = 20;
/// numéro (u32), horodatage d'envoi en ms (u32)
const DATA_LEN: usize = 8;
/// tout reçu avant ce numéro (u32), les 64 suivants (bits), horodatage renvoyé (u32)
const ACK_LEN: usize = 16;
/// horodatage (u32), numéro du trajet (u8)
const PING_LEN: usize = 5;
/// après le PING renvoyé : ping Minecraft de la sortie (u16), retard de la sortie (u16), renvois de la sortie (u32)
const PONG_INFOS_LEN: usize = 8;
/// octets du jeu par paquet (tient sous la MTU, même en 4G)
const MAX_CHUNK: usize = 1150;
/// paquets en vol au maximum
const WINDOW: usize = 2048;
/// paquets renvoyés à la fois quand plus rien ne revient
const MAX_PROBES: usize = 2;
const TICK: Duration = Duration::from_millis(5);
/// au-delà (ms), le programme a été figé : on ne déclare pas de pertes ce tour-là
const FROZEN_MS: f64 = 20.0;
/// Port UDP des sorties et relais Rago.
pub const ROUTE_PORT: u16 = 25600;
/// Ports locaux où le jeu se connecte, et serveur visé (index connu de la sortie : 0 Hypixel, 1 Minemen).
pub const LOCAL_PORTS: [(u16, u8); 2] = [(25565, 0), (25566, 1)];

/// Sortie Rago de Paris (ville où les joueurs français entrent chez Cloudflare, devant Hypixel).
pub const EXIT_PARIS: SocketAddrV4 = SocketAddrV4::new(Ipv4Addr::new(217, 69, 12, 94), ROUTE_PORT);
/// Relais Rago de Frankfurt : un deuxième trajet, par un autre chemin, vers la même sortie.
pub const RELAY_FRANKFURT: SocketAddrV4 = SocketAddrV4::new(Ipv4Addr::new(209, 250, 233, 192), ROUTE_PORT);

fn epoch() -> Instant {
    static E: OnceLock<Instant> = OnceLock::new();
    *E.get_or_init(Instant::now)
}

/// Horodatage en ms sur 32 bits (comme `maintenant_ms` du prototype).
fn now_ms() -> u32 {
    epoch().elapsed().as_millis() as u32
}

/// a - b sur des horodatages de 32 bits.
fn diff_ms(a: u32, b: u32) -> i64 {
    a.wrapping_sub(b) as i32 as i64
}

fn packet(kind: u8, sid: &[u8; 16], body: &[u8]) -> Vec<u8> {
    let mut p = Vec::with_capacity(HEADER + body.len());
    p.extend_from_slice(MAGIC);
    p.push(VERSION);
    p.push(kind);
    p.extend_from_slice(sid);
    p.extend_from_slice(body);
    p
}

fn read_header(data: &[u8]) -> Option<(u8, [u8; 16], &[u8])> {
    if data.len() < HEADER || &data[..2] != MAGIC || data[2] != VERSION {
        return None;
    }
    let mut sid = [0u8; 16];
    sid.copy_from_slice(&data[4..20]);
    Some((data[3], sid, &data[HEADER..]))
}

fn be32(b: &[u8], at: usize) -> u32 {
    u32::from_be_bytes([b[at], b[at + 1], b[at + 2], b[at + 3]])
}

fn be16(b: &[u8], at: usize) -> u16 {
    u16::from_be_bytes([b[at], b[at + 1]])
}

/// Identifiant de session : 16 octets imprévisibles (heure fine, processus, compteur, adresse en mémoire, hachés).
fn new_sid() -> [u8; 16] {
    use sha2::{Digest, Sha256};
    use std::sync::atomic::AtomicU64;
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let mut h = Sha256::new();
    let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    h.update(nanos.to_le_bytes());
    h.update(std::process::id().to_le_bytes());
    h.update(COUNTER.fetch_add(1, Ordering::Relaxed).to_le_bytes());
    let local = 0u8;
    h.update((&local as *const u8 as usize).to_le_bytes());
    h.update(epoch().elapsed().as_nanos().to_le_bytes());
    let d = h.finalize();
    let mut sid = [0u8; 16];
    sid.copy_from_slice(&d[..16]);
    sid
}

/// Petit tirage pseudo-aléatoire (pertes simulées des tests seulement).
struct Rng(u64);
impl Rng {
    fn next(&mut self) -> f64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 >> 11) as f64 / (1u64 << 53) as f64
    }
}

// --- flux fiable sur UDP ------------------------------------------------------------------------------------------

struct InFlight {
    data: Vec<u8>,
    sent: u32,
    sends: u32,
}

/// Découpe un flux d'octets en paquets numérotés et les renvoie jusqu'à confirmation (`Emetteur` du prototype).
struct Sender_ {
    waiting: VecDeque<u8>,
    next: u32,
    in_flight: BTreeMap<u32, InFlight>,
    /// heure d'envoi du paquet arrivé le plus récent (renvoyée dans les confirmations)
    marker: Option<u32>,
    /// plus grand numéro confirmé parmi les paquets jamais renvoyés
    highest_first: Option<u32>,
    last_ts_measured: Option<u32>,
    last_progress: u32,
    last_probe: u32,
    srtt: Option<f64>,
    rttvar: f64,
    resends_timeout: u64,
    resends_fast: u64,
    rate: f64,
    tokens: f64,
    last_refill: Instant,
}

impl Sender_ {
    fn new(rate_bytes_s: f64) -> Self {
        let t = now_ms();
        Sender_ {
            waiting: VecDeque::new(),
            next: 0,
            in_flight: BTreeMap::new(),
            marker: None,
            highest_first: None,
            last_ts_measured: None,
            last_progress: t,
            last_probe: t,
            srtt: None,
            rttvar: 0.0,
            resends_timeout: 0,
            resends_fast: 0,
            rate: rate_bytes_s,
            tokens: 64.0 * 1024.0,
            last_refill: Instant::now(),
        }
    }

    fn resends(&self) -> u64 {
        self.resends_timeout + self.resends_fast
    }

    fn refill(&mut self) {
        let t = Instant::now();
        self.tokens = (self.tokens + t.duration_since(self.last_refill).as_secs_f64() * self.rate).min(256.0 * 1024.0);
        self.last_refill = t;
    }

    fn is_empty(&self) -> bool {
        self.waiting.is_empty() && self.in_flight.is_empty()
    }

    fn rto(&self, sends: u32) -> f64 {
        let base = match self.srtt {
            None => 200.0,
            Some(s) => (s + 30.0).max(s * 1.5).max(s + 4.0 * self.rttvar),
        };
        (base * 2f64.powi(sends.saturating_sub(1) as i32)).min(1000.0)
    }

    /// Envoie un paquet : `out` reçoit le corps DATA (numéro, heure, octets) à faire partir par tous les trajets.
    fn send(&mut self, num: u32, data: Vec<u8>, sends: u32, out: &mut Vec<Vec<u8>>) {
        let t = now_ms();
        let mut body = Vec::with_capacity(DATA_LEN + data.len());
        body.extend_from_slice(&num.to_be_bytes());
        body.extend_from_slice(&t.to_be_bytes());
        body.extend_from_slice(&data);
        out.push(body);
        self.tokens -= (data.len() + 40) as f64;
        self.in_flight.insert(num, InFlight { data, sent: t, sends });
    }

    fn send_new(&mut self, out: &mut Vec<Vec<u8>>) {
        while !self.waiting.is_empty() && self.in_flight.len() < WINDOW && self.tokens > 0.0 {
            let n = self.waiting.len().min(MAX_CHUNK);
            let chunk: Vec<u8> = self.waiting.drain(..n).collect();
            let num = self.next;
            self.send(num, chunk, 1, out);
            self.next += 1;
        }
    }

    /// Octets du jeu : envoyés tout de suite (sans attendre le prochain tick).
    fn push(&mut self, data: &[u8], out: &mut Vec<Vec<u8>>) {
        self.waiting.extend(data);
        self.refill();
        self.send_new(out);
    }

    fn on_ack(&mut self, cumul: u32, bits: u64, ts_echo: u32) {
        let mut confirmed: Vec<u32> = self.in_flight.range(..cumul).map(|(n, _)| *n).collect();
        if bits != 0 {
            for i in 0..64u32 {
                let n = cumul.wrapping_add(1 + i);
                if bits >> i & 1 == 1 && self.in_flight.contains_key(&n) {
                    confirmed.push(n);
                }
            }
        }
        if !confirmed.is_empty() {
            self.last_progress = now_ms();
        }
        for n in confirmed {
            if let Some(p) = self.in_flight.remove(&n) {
                if p.sends == 1 {
                    self.highest_first = Some(self.highest_first.map_or(n, |h| h.max(n)));
                }
            }
        }
        // l'horodatage renvoyé est celui d'un paquet qui vient d'arriver : tout ce qui est parti avant lui et n'est
        // toujours pas confirmé est sans doute perdu (y compris un paquet déjà renvoyé)
        if self.marker.map_or(true, |m| diff_ms(ts_echo, m) > 0) {
            self.marker = Some(ts_echo);
        }
        // aller-retour : seulement la première confirmation qui renvoie un horodatage donné
        if let Some(last) = self.last_ts_measured {
            if diff_ms(ts_echo, last) <= 0 {
                return;
            }
        }
        self.last_ts_measured = Some(ts_echo);
        let sample = diff_ms(now_ms(), ts_echo);
        if (0..5000).contains(&sample) {
            let s = sample as f64;
            match self.srtt {
                None => {
                    self.srtt = Some(s);
                    self.rttvar = s / 2.0;
                }
                Some(srtt) => {
                    self.rttvar = 0.75 * self.rttvar + 0.25 * (srtt - s).abs();
                    self.srtt = Some(0.875 * srtt + 0.125 * s);
                }
            }
        }
    }

    /// Le réseau revient après une coupure : renvoie tout de suite les plus anciens paquets.
    fn restart(&mut self, out: &mut Vec<Vec<u8>>) {
        let nums: Vec<u32> = self.in_flight.keys().take(MAX_PROBES).copied().collect();
        for n in nums {
            if let Some(p) = self.in_flight.remove(&n) {
                self.resends_timeout += 1;
                self.send(n, p.data, p.sends, out);
            }
        }
        self.last_probe = now_ms();
    }

    /// frozen : le programme sort d'un blocage ; on attend un tour avant de déclarer des pertes.
    fn tick(&mut self, frozen: bool, out: &mut Vec<Vec<u8>>) {
        self.refill();
        if !self.in_flight.is_empty() && !frozen {
            let now = now_ms();
            let srtt = self.srtt.unwrap_or(200.0);
            let fast_after = srtt + (srtt / 4.0).max(5.0); // marge pour l'écart entre les trajets
            let base = self.rto(1);
            let quiet = diff_ms(now, self.last_progress).min(diff_ms(now, self.last_probe)) as f64;
            let mut todo: Vec<(u32, bool)> = Vec::new();
            let mut probes = 0;
            for (&n, p) in &self.in_flight {
                let age = diff_ms(now, p.sent) as f64;
                let overtaken = (p.sends == 1 && self.highest_first.is_some_and(|h| n < h))
                    || self.marker.is_some_and(|m| diff_ms(m, p.sent) > 0);
                if age > fast_after && overtaken {
                    todo.push((n, true)); // un paquet parti après lui est déjà arrivé
                } else if probes < MAX_PROBES && age.min(quiet) > (base * (1u64 << (p.sends - 1).min(10)) as f64).min(1000.0) {
                    // rien ne revient : on ne renvoie que les plus anciens, pour sonder
                    todo.push((n, false));
                    probes += 1;
                }
            }
            if probes > 0 {
                self.last_probe = now;
            }
            for (n, fast) in todo {
                if self.tokens <= 0.0 {
                    break;
                }
                if let Some(p) = self.in_flight.remove(&n) {
                    if fast {
                        self.resends_fast += 1;
                    } else {
                        self.resends_timeout += 1;
                    }
                    self.send(n, p.data, p.sends + 1, out);
                }
            }
        }
        self.send_new(out);
    }
}

/// Remet les paquets dans l'ordre, ignore les doublons et prépare les confirmations (`Recepteur` du prototype).
struct Receiver_ {
    expected: u32,
    buffer: BTreeMap<u32, Vec<u8>>,
}

impl Receiver_ {
    fn new() -> Self {
        Receiver_ { expected: 0, buffer: BTreeMap::new() }
    }

    /// Renvoie (nouveau ?, octets à livrer au jeu dans l'ordre).
    fn on_data(&mut self, num: u32, data: &[u8]) -> (bool, Vec<Vec<u8>>) {
        if num < self.expected || self.buffer.contains_key(&num) {
            return (false, Vec::new());
        }
        if num - self.expected > (WINDOW * 2) as u32 {
            return (false, Vec::new());
        }
        self.buffer.insert(num, data.to_vec());
        let mut out = Vec::new();
        while let Some(d) = self.buffer.remove(&self.expected) {
            out.push(d);
            self.expected += 1;
        }
        (true, out)
    }

    fn ack(&self, ts: u32) -> Vec<u8> {
        let mut bits = 0u64;
        if !self.buffer.is_empty() {
            for i in 0..64u32 {
                if self.buffer.contains_key(&(self.expected + 1 + i)) {
                    bits |= 1 << i;
                }
            }
        }
        let mut b = Vec::with_capacity(ACK_LEN);
        b.extend_from_slice(&self.expected.to_be_bytes());
        b.extend_from_slice(&bits.to_be_bytes());
        b.extend_from_slice(&ts.to_be_bytes());
        b
    }
}

/// Mesure de combien le moteur se réveille en retard (PC chargé, mise en veille…).
struct Clock {
    before: Instant,
    start: Instant,
    skipped: bool,
    max_shown: f64,
    current: f64,
    previous: f64,
}

impl Clock {
    fn new() -> Self {
        let t = Instant::now();
        Clock { before: t, start: t, skipped: false, max_shown: 0.0, current: 0.0, previous: 0.0 }
    }

    /// À chaque tick : figé = le moteur sort d'un blocage (jamais deux tours de suite).
    fn beat(&mut self) -> bool {
        let t = Instant::now();
        let late = (t.duration_since(self.before).as_secs_f64() * 1000.0 - TICK.as_secs_f64() * 1000.0).max(0.0);
        self.before = t;
        if t.duration_since(self.start) > Duration::from_secs(1) {
            self.previous = self.current;
            self.current = 0.0;
            self.start = t;
        }
        self.current = self.current.max(late);
        self.max_shown = self.max_shown.max(late);
        let frozen = late > FROZEN_MS && !self.skipped;
        self.skipped = frozen;
        frozen
    }
}

// --- moteur ---------------------------------------------------------------------------------------------------------

/// Réglages d'un lancement.
#[derive(Clone, Debug)]
pub struct Config {
    /// sortie Rago (la ville d'entrée Cloudflare du joueur)
    pub exit: SocketAddrV4,
    /// relais Rago : chacun ajoute un trajet vers la même sortie
    pub relays: Vec<SocketAddrV4>,
    /// sans trajet direct vers la sortie (tests)
    pub no_direct: bool,
    /// débit maximum par connexion du jeu, octets par seconde
    pub rate: f64,
    /// adresse locale d'écoute du jeu (127.0.0.1) et décalage des ports (tests : 25565 déjà pris)
    pub port_offset: u16,
    /// pertes simulées par trajet, de 0 à 1 (tests seulement)
    pub test_loss: Vec<f64>,
    /// coupure simulée de tous les trajets : (début après le lancement, durée) (tests seulement)
    pub test_cut: Option<(Duration, Duration)>,
}

/// Jeton Rago Route du serveur de licences (comptes Premium, valable 6 h), envoyé à la sortie à chaque nouvelle
/// connexion du jeu. L'app le renouvelle pendant que Rago Route tourne.
fn token() -> &'static Mutex<String> {
    static T: OnceLock<Mutex<String>> = OnceLock::new();
    T.get_or_init(|| Mutex::new(String::new()))
}

/// Un nouveau jeton : les prochaines connexions du jeu l'utilisent, et l'accès refusé est oublié.
pub fn set_token(t: &str) {
    if let Ok(mut g) = token().lock() {
        *g = t.to_string();
    }
    REFUSED.store(false, Ordering::Relaxed);
}

/// La sortie a refusé le jeton (expiré, ou plus de Premium).
static REFUSED: AtomicBool = AtomicBool::new(false);

impl Default for Config {
    fn default() -> Self {
        Config { exit: EXIT_PARIS, relays: vec![RELAY_FRANKFURT], no_direct: false, rate: 30.0 * 125_000.0, port_offset: 0, test_loss: Vec::new(), test_cut: None }
    }
}

/// Un trajet, vu par l'app.
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathView {
    /// "direct" ou "relay"
    pub kind: String,
    /// ville du serveur par lequel passe le trajet (Paris pour le direct)
    pub via: String,
    pub rtt_ms: Option<f64>,
    pub alive: bool,
    /// paquets du serveur de jeu qui ne sont pas arrivés par ce trajet (%)
    pub loss_pct: f64,
    /// part des paquets arrivés par ce trajet avant les autres (%)
    pub first_pct: f64,
    pub mb: f64,
}

/// État de Rago Route pour l'app (recopié deux fois par seconde).
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub running: bool,
    pub error: Option<String>,
    /// le jeu est connecté par Rago Route
    pub playing: bool,
    pub paths: Vec<PathView>,
    /// paquets perdus par le meilleur trajet et rattrapés par un autre
    pub saved: u64,
    /// paquets reçus du serveur de jeu (sans les doublons)
    pub packets: u64,
    pub resends_here: u64,
    pub resends_exit: u64,
    /// ping Minecraft mesuré par la sortie elle-même (ms)
    pub exit_ping_ms: Option<u32>,
    /// pire retard récent du moteur ici et sur la sortie (ms)
    pub lag_here_ms: f64,
    pub lag_exit_ms: f64,
    /// ports où le jeu se connecte : localhost (Hypixel), localhost:25566 (Minemen)
    pub ports: Vec<u16>,
}

struct Path {
    kind: &'static str,
    via: String,
    dest: SocketAddrV4,
    through_relay: bool,
    sock: UdpSocket,
    loss: f64,
    rtt: Option<f64>,
    last_pong: Option<Instant>,
    firsts: u64,
    misses: u64,
    bytes: u64,
}

impl Path {
    fn alive(&self) -> bool {
        self.last_pong.is_some_and(|t| t.elapsed() < Duration::from_secs(2))
    }
}

struct Session {
    sid: [u8; 16],
    target: u8,
    conn: u64,
    stream: TcpStream,
    open: bool,
    sender: Sender_,
    receiver: Receiver_,
    game_ended: bool,
    last_open: Option<Instant>,
    last_dup_ack: Option<Instant>,
    /// numéro reçu -> (trajets qui l'ont apporté, heure d'arrivée), dans l'ordre d'arrivée
    arrivals: HashMap<u32, u32>,
    arrival_order: VecDeque<(u32, Instant)>,
    last_count: Instant,
    uniques: u64,
    exit_resends: u64,
}

enum Event {
    Udp(usize, Vec<u8>),
    Accept(TcpStream, u8),
    Game(u64, Vec<u8>),
    GameEnd(u64),
}

struct Engine {
    cfg: Config,
    paths: Vec<Path>,
    sessions: HashMap<[u8; 16], Session>,
    by_conn: HashMap<u64, [u8; 16]>,
    next_conn: u64,
    tx: Sender<Event>,
    stop: Arc<AtomicBool>,
    clock: Clock,
    rng: Rng,
    exit_ping: Option<u32>,
    lag_exit_max: f64,
    saved: u64,
    packets: u64,
    resends_here_done: u64,
    resends_exit_done: u64,
    started: Instant,
}

fn bind_udp() -> std::io::Result<UdpSocket> {
    let s = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0))?;
    #[cfg(windows)]
    win::big_buffers(&s);
    Ok(s)
}

impl Engine {
    fn cut(&self) -> bool {
        self.cfg.test_cut.is_some_and(|(from, len)| {
            let t = self.started.elapsed();
            t >= from && t < from + len
        })
    }

    fn send_on(&mut self, i: usize, p: &[u8]) {
        let path = &self.paths[i];
        if (path.loss > 0.0 && self.rng.next() < path.loss) || self.cut() {
            return;
        }
        let r = if path.through_relay {
            let mut fwd = Vec::with_capacity(6 + p.len());
            fwd.extend_from_slice(&self.cfg.exit.ip().octets());
            fwd.extend_from_slice(&self.cfg.exit.port().to_be_bytes());
            fwd.extend_from_slice(p);
            path.sock.send_to(&packet(T_FWD, &[0u8; 16], &fwd), path.dest)
        } else {
            path.sock.send_to(p, path.dest)
        };
        let _ = r; // réseau coupé sur ce trajet : les autres prennent le relais
    }

    fn send_all(&mut self, kind: u8, sid: &[u8; 16], body: &[u8]) {
        let p = packet(kind, sid, body);
        for i in 0..self.paths.len() {
            self.send_on(i, &p);
        }
    }

    fn flush(&mut self, sid: &[u8; 16], out: Vec<Vec<u8>>) {
        for body in out {
            self.send_all(T_DATA, sid, &body);
        }
    }

    fn best_path(&self) -> Option<usize> {
        (0..self.paths.len())
            .filter(|&i| self.paths[i].alive() && self.paths[i].rtt.is_some())
            .min_by(|&a, &b| self.paths[a].rtt.partial_cmp(&self.paths[b].rtt).unwrap_or(std::cmp::Ordering::Equal))
    }

    fn on_event(&mut self, ev: Event) {
        match ev {
            Event::Udp(i, data) => self.on_udp(i, &data),
            Event::Accept(stream, target) => {
                let conn = self.next_conn;
                self.next_conn += 1;
                let _ = stream.set_nodelay(true);
                let _ = stream.set_write_timeout(Some(Duration::from_secs(3)));
                let Ok(reader) = stream.try_clone() else { return };
                let tx = self.tx.clone();
                let stop = self.stop.clone();
                thread::Builder::new()
                    .name("rago-route-jeu".into())
                    .spawn(move || read_game(reader, conn, tx, stop))
                    .ok();
                let sid = new_sid();
                self.by_conn.insert(conn, sid);
                self.sessions.insert(
                    sid,
                    Session {
                        sid,
                        target,
                        conn,
                        stream,
                        open: false,
                        sender: Sender_::new(self.cfg.rate),
                        receiver: Receiver_::new(),
                        game_ended: false,
                        last_open: None,
                        last_dup_ack: None,
                        arrivals: HashMap::new(),
                        arrival_order: VecDeque::new(),
                        last_count: Instant::now(),
                        uniques: 0,
                        exit_resends: 0,
                    },
                );
            }
            Event::Game(conn, data) => {
                let Some(sid) = self.by_conn.get(&conn).copied() else { return };
                let Some(s) = self.sessions.get_mut(&sid) else { return };
                let mut out = Vec::new();
                if s.open {
                    s.sender.push(&data, &mut out);
                } else {
                    s.sender.waiting.extend(&data);
                }
                self.flush(&sid, out);
            }
            Event::GameEnd(conn) => {
                if let Some(s) = self.by_conn.get(&conn).and_then(|sid| self.sessions.get_mut(sid)) {
                    s.game_ended = true;
                }
            }
        }
    }

    fn on_udp(&mut self, i: usize, data: &[u8]) {
        if (self.paths[i].loss > 0.0 && self.rng.next() < self.paths[i].loss) || self.cut() {
            return;
        }
        self.paths[i].bytes += data.len() as u64;
        let Some((kind, sid, body)) = read_header(data) else { return };
        if kind == T_PONG {
            if body.len() < PING_LEN {
                return;
            }
            let ts = be32(body, 0);
            if body.len() >= PING_LEN + 2 {
                let p = be16(body, PING_LEN);
                self.exit_ping = (p > 0).then_some(p as u32);
            }
            if body.len() >= PING_LEN + PONG_INFOS_LEN {
                let lag = be16(body, PING_LEN + 2) as f64;
                let resends = be32(body, PING_LEN + 4) as u64;
                self.lag_exit_max = self.lag_exit_max.max(lag);
                if let Some(s) = self.sessions.get_mut(&sid) {
                    s.exit_resends = resends;
                }
            }
            let rtt = diff_ms(now_ms(), ts);
            if (0..5000).contains(&rtt) {
                let all_down = self.best_path().is_none();
                let p = &mut self.paths[i];
                p.rtt = Some(p.rtt.map_or(rtt as f64, |r| 0.8 * r + 0.2 * rtt as f64));
                p.last_pong = Some(Instant::now());
                if all_down {
                    // le réseau revient après une coupure
                    let sids: Vec<[u8; 16]> = self.sessions.keys().copied().collect();
                    for sid in sids {
                        let mut out = Vec::new();
                        if let Some(s) = self.sessions.get_mut(&sid) {
                            s.sender.restart(&mut out);
                        }
                        self.flush(&sid, out);
                    }
                }
            }
            return;
        }
        let Some(s) = self.sessions.get_mut(&sid) else { return };
        match kind {
            T_OPEN_OK => {
                if !s.open {
                    s.open = true;
                    let mut out = Vec::new();
                    s.sender.refill();
                    s.sender.send_new(&mut out);
                    self.flush(&sid, out);
                }
            }
            T_DATA if body.len() >= DATA_LEN => {
                let num = be32(body, 0);
                let ts = be32(body, 4);
                let (new, deliver) = s.receiver.on_data(num, &body[DATA_LEN..]);
                if new {
                    self.paths[i].firsts += 1;
                    s.arrivals.insert(num, 1 << i);
                    s.arrival_order.push_back((num, Instant::now()));
                } else if let Some(mask) = s.arrivals.get_mut(&num) {
                    *mask |= 1 << i;
                }
                let mut broken = false;
                for d in deliver {
                    if s.stream.write_all(&d).is_err() {
                        broken = true;
                        break;
                    }
                }
                if broken {
                    s.game_ended = true;
                    let _ = s.stream.shutdown(Shutdown::Both);
                }
                let now = Instant::now();
                if new || s.last_dup_ack.map_or(true, |t| now.duration_since(t) > Duration::from_millis(20)) {
                    s.last_dup_ack = Some(now);
                    let ack = s.receiver.ack(ts);
                    self.send_all(T_ACK, &sid, &ack);
                }
            }
            T_ACK if body.len() >= ACK_LEN => {
                let cumul = be32(body, 0);
                let bits = u64::from_be_bytes(body[4..12].try_into().unwrap_or([0; 8]));
                let ts = be32(body, 12);
                s.sender.on_ack(cumul, bits, ts);
            }
            T_CLOSE => self.close(&sid),
            T_REFUSE if !s.open => {
                // le jeu voit la connexion se fermer ; l'app affiche pourquoi
                REFUSED.store(true, Ordering::Relaxed);
                self.close(&sid);
            }
            _ => {}
        }
    }

    /// Toutes les 100 ms : pour les paquets arrivés il y a plus d'1 s, regarde par quels trajets ils sont venus.
    /// all : à la fin de la session, compte aussi les paquets arrivés il y a moins d'1 s.
    fn count(&mut self, sid: &[u8; 16], all: bool) {
        let best = self.best_path();
        let Some(s) = self.sessions.get_mut(sid) else { return };
        if !all && s.last_count.elapsed() < Duration::from_millis(100) {
            return;
        }
        s.last_count = Instant::now();
        while let Some(&(num, t)) = s.arrival_order.front() {
            if !all && t.elapsed() <= Duration::from_secs(1) {
                break;
            }
            s.arrival_order.pop_front();
            let mask = s.arrivals.remove(&num).unwrap_or(0);
            s.uniques += 1;
            self.packets += 1;
            for (j, p) in self.paths.iter_mut().enumerate() {
                if mask >> j & 1 == 0 {
                    p.misses += 1;
                }
            }
            if let Some(b) = best {
                if mask >> b & 1 == 0 {
                    self.saved += 1; // perdu par le meilleur trajet, rattrapé par un autre
                }
            }
        }
    }

    fn close(&mut self, sid: &[u8; 16]) {
        self.count(sid, true);
        if let Some(s) = self.sessions.remove(sid) {
            let _ = s.stream.shutdown(Shutdown::Both);
            self.by_conn.remove(&s.conn);
            self.resends_here_done += s.sender.resends();
            self.resends_exit_done += s.exit_resends;
        }
    }

    fn tick(&mut self, frozen: bool) {
        let sids: Vec<[u8; 16]> = self.sessions.keys().copied().collect();
        for sid in sids {
            let Some(s) = self.sessions.get_mut(&sid) else { continue };
            if !s.open {
                if s.last_open.map_or(true, |t| t.elapsed() > Duration::from_millis(200)) {
                    s.last_open = Some(Instant::now());
                    let mut body = vec![s.target];
                    body.extend_from_slice(token().lock().map(|t| t.clone()).unwrap_or_default().as_bytes());
                    self.send_all(T_OPEN, &sid, &body);
                }
                continue;
            }
            let mut out = Vec::new();
            s.sender.tick(frozen, &mut out);
            let done = s.game_ended && s.sender.is_empty();
            self.flush(&sid, out);
            self.count(&sid, false);
            if done {
                for _ in 0..3 {
                    self.send_all(T_CLOSE, &sid, &[]);
                }
                self.close(&sid);
            }
        }
    }

    /// Deux pings par seconde ; tous les 50 ms quand plus aucun trajet ne répond, pour repartir dès que le réseau
    /// revient (la réponse relance les renvois ici, et le premier paquet relance ceux de la sortie).
    fn ping_every(&self) -> Duration {
        if self.best_path().is_none() {
            Duration::from_millis(50)
        } else {
            Duration::from_millis(500)
        }
    }

    fn ping(&mut self) {
        // la partie en cours : la session qui a reçu le plus de paquets
        let Some(sid) = self.sessions.values().max_by_key(|s| s.uniques).map(|s| s.sid) else { return };
        for i in 0..self.paths.len() {
            let mut b = Vec::with_capacity(PING_LEN);
            b.extend_from_slice(&now_ms().to_be_bytes());
            b.push(i as u8);
            let p = packet(T_PING, &sid, &b);
            self.send_on(i, &p);
        }
    }

    fn view(&mut self) -> Status {
        let firsts: u64 = self.paths.iter().map(|p| p.firsts).sum::<u64>().max(1);
        let total = self.packets.max(1);
        let paths = self
            .paths
            .iter()
            .map(|p| PathView {
                kind: p.kind.into(),
                via: p.via.clone(),
                rtt_ms: p.rtt.filter(|_| p.alive()).map(|r| (r * 10.0).round() / 10.0),
                alive: p.alive(),
                loss_pct: 100.0 * p.misses as f64 / total as f64,
                first_pct: 100.0 * p.firsts as f64 / firsts as f64,
                mb: p.bytes as f64 / 1e6,
            })
            .collect();
        let st = Status {
            running: true,
            error: REFUSED.load(Ordering::Relaxed).then(|| "token".into()),
            playing: self.sessions.values().any(|s| s.open),
            paths,
            saved: self.saved,
            packets: self.packets,
            resends_here: self.resends_here_done + self.sessions.values().map(|s| s.sender.resends()).sum::<u64>(),
            resends_exit: self.resends_exit_done + self.sessions.values().map(|s| s.exit_resends).sum::<u64>(),
            exit_ping_ms: self.exit_ping,
            lag_here_ms: self.clock.max_shown,
            lag_exit_ms: self.lag_exit_max,
            ports: LOCAL_PORTS.iter().map(|(p, _)| p + self.cfg.port_offset).collect(),
        };
        self.clock.max_shown = 0.0;
        self.lag_exit_max = 0.0;
        st
    }

    fn run(mut self, rx: Receiver<Event>, status: Arc<Mutex<Status>>) {
        let mut next_tick = Instant::now() + TICK;
        let mut last_ping = Instant::now() - Duration::from_secs(1);
        let mut last_view = Instant::now();
        let mut last_lag = Instant::now();
        let mut lag_window = 0.0f64;
        while !self.stop.load(Ordering::Relaxed) {
            let wait = next_tick.saturating_duration_since(Instant::now());
            match rx.recv_timeout(wait) {
                Ok(ev) => {
                    self.on_event(ev);
                    for _ in 0..1000 {
                        match rx.try_recv() {
                            Ok(ev) => self.on_event(ev),
                            Err(_) => break,
                        }
                    }
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
            if Instant::now() < next_tick {
                continue;
            }
            let frozen = self.clock.beat();
            next_tick = Instant::now() + TICK;
            self.tick(frozen);
            if last_ping.elapsed() >= self.ping_every() && !self.sessions.is_empty() {
                last_ping = Instant::now();
                self.ping();
            }
            if last_view.elapsed() >= Duration::from_millis(500) {
                last_view = Instant::now();
                // retard affiché : le pire des 5 dernières secondes, pour qu'un pic reste visible
                if last_lag.elapsed() >= Duration::from_secs(5) {
                    last_lag = Instant::now();
                    lag_window = 0.0;
                }
                let mut v = self.view();
                lag_window = lag_window.max(v.lag_here_ms);
                v.lag_here_ms = lag_window.round();
                if let Ok(mut s) = status.lock() {
                    *s = v;
                }
            }
        }
        let sids: Vec<[u8; 16]> = self.sessions.keys().copied().collect();
        for sid in sids {
            for _ in 0..3 {
                self.send_all(T_CLOSE, &sid, &[]);
            }
            self.close(&sid);
        }
    }
}

fn read_game(mut stream: TcpStream, conn: u64, tx: Sender<Event>, stop: Arc<AtomicBool>) {
    let mut buf = vec![0u8; 65536];
    while !stop.load(Ordering::Relaxed) {
        match stream.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                if tx.send(Event::Game(conn, buf[..n].to_vec())).is_err() {
                    return;
                }
            }
            Err(e) if e.kind() == ErrorKind::Interrupted => continue,
            Err(_) => break,
        }
    }
    let _ = tx.send(Event::GameEnd(conn));
}

fn read_udp(sock: UdpSocket, i: usize, tx: Sender<Event>, stop: Arc<AtomicBool>) {
    let _ = sock.set_read_timeout(Some(Duration::from_millis(250)));
    let mut buf = vec![0u8; 4096];
    while !stop.load(Ordering::Relaxed) {
        match sock.recv_from(&mut buf) {
            Ok((n, _)) => {
                if tx.send(Event::Udp(i, buf[..n].to_vec())).is_err() {
                    return;
                }
            }
            // délai, ou erreur remontée par le système (sous Windows, « port injoignable » d'un envoi précédent) :
            // on continue d'écouter
            Err(_) => {}
        }
    }
}

fn accept_loop(listener: TcpListener, target: u8, tx: Sender<Event>, stop: Arc<AtomicBool>) {
    let _ = listener.set_nonblocking(true);
    while !stop.load(Ordering::Relaxed) {
        match listener.accept() {
            Ok((s, _)) => {
                let _ = s.set_nonblocking(false);
                if tx.send(Event::Accept(s, target)).is_err() {
                    return;
                }
            }
            Err(e) if e.kind() == ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(15)),
            Err(_) => thread::sleep(Duration::from_millis(100)),
        }
    }
}

/// Un lancement de Rago Route : s'arrête avec `stop`.
pub struct Running {
    stop: Arc<AtomicBool>,
    status: Arc<Mutex<Status>>,
    engine: Option<JoinHandle<()>>,
    helpers: Vec<JoinHandle<()>>,
}

impl Running {
    pub fn status(&self) -> Status {
        self.status.lock().map(|s| s.clone()).unwrap_or_default()
    }

    pub fn stop(mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(h) = self.engine.take() {
            let _ = h.join();
        }
        for h in self.helpers.drain(..) {
            let _ = h.join();
        }
        #[cfg(windows)]
        win::fine_timer(false);
    }
}

/// Démarre Rago Route : ouvre les ports locaux du jeu et les trajets vers la sortie.
pub fn start(cfg: Config) -> Result<Running, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let (tx, rx) = channel();
    let mut listeners = Vec::new();
    for (port, target) in LOCAL_PORTS {
        let port = port + cfg.port_offset;
        let l = TcpListener::bind((Ipv4Addr::LOCALHOST, port)).map_err(|e| {
            if e.kind() == ErrorKind::AddrInUse {
                format!("port:{port}")
            } else {
                format!("listen:{port}:{e}")
            }
        })?;
        listeners.push((l, target));
    }
    let mut specs: Vec<(&'static str, String, SocketAddrV4)> = Vec::new();
    if !cfg.no_direct {
        specs.push(("direct", city(cfg.exit), cfg.exit));
    }
    for r in &cfg.relays {
        specs.push(("relay", city(*r), *r));
    }
    let mut paths = Vec::new();
    let mut helpers = Vec::new();
    for (i, (kind, via, dest)) in specs.into_iter().enumerate() {
        let sock = bind_udp().map_err(|e| format!("udp:{e}"))?;
        let reader = sock.try_clone().map_err(|e| format!("udp:{e}"))?;
        let (tx2, stop2) = (tx.clone(), stop.clone());
        helpers.push(thread::Builder::new().name("rago-route-udp".into()).spawn(move || read_udp(reader, i, tx2, stop2)).map_err(|e| e.to_string())?);
        paths.push(Path {
            kind,
            via,
            dest,
            through_relay: dest != cfg.exit,
            sock,
            loss: cfg.test_loss.get(i).copied().unwrap_or(0.0),
            rtt: None,
            last_pong: None,
            firsts: 0,
            misses: 0,
            bytes: 0,
        });
    }
    if paths.is_empty() {
        return Err("no path".into());
    }
    for (l, target) in listeners {
        let (tx2, stop2) = (tx.clone(), stop.clone());
        helpers.push(thread::Builder::new().name("rago-route-local".into()).spawn(move || accept_loop(l, target, tx2, stop2)).map_err(|e| e.to_string())?);
    }
    let status = Arc::new(Mutex::new(Status {
        running: true,
        ports: LOCAL_PORTS.iter().map(|(p, _)| p + cfg.port_offset).collect(),
        ..Default::default()
    }));
    #[cfg(windows)]
    win::fine_timer(true);
    let engine = Engine {
        paths,
        sessions: HashMap::new(),
        by_conn: HashMap::new(),
        next_conn: 0,
        tx,
        stop: stop.clone(),
        clock: Clock::new(),
        rng: Rng(0x9E37_79B9_7F4A_7C15 ^ now_ms() as u64),
        exit_ping: None,
        lag_exit_max: 0.0,
        saved: 0,
        packets: 0,
        resends_here_done: 0,
        resends_exit_done: 0,
        started: Instant::now(),
        cfg,
    };
    let st = status.clone();
    let handle = thread::Builder::new().name("rago-route".into()).spawn(move || engine.run(rx, st)).map_err(|e| e.to_string())?;
    Ok(Running { stop, status, engine: Some(handle), helpers })
}

/// Ville d'un serveur Rago connu (affichage).
fn city(a: SocketAddrV4) -> String {
    match *a.ip() {
        ip if ip == *EXIT_PARIS.ip() => "Paris".into(),
        ip if ip == *RELAY_FRANKFURT.ip() => "Frankfurt".into(),
        ip => ip.to_string(),
    }
}

// --- Rago Route dans l'app : un seul lancement à la fois ---------------------------------------------------------

fn slot() -> &'static Mutex<Option<Running>> {
    static S: OnceLock<Mutex<Option<Running>>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(None))
}

/// Allume Rago Route avec les serveurs Rago et le jeton du compte (sans effet s'il tourne déjà, sauf le jeton).
pub fn turn_on(token: &str) -> Result<Status, String> {
    set_token(token);
    let mut s = slot().lock().map_err(|_| "lock")?;
    if s.is_none() {
        *s = Some(start(Config::default())?);
    }
    Ok(s.as_ref().map(|r| r.status()).unwrap_or_default())
}

pub fn turn_off() {
    let r = slot().lock().ok().and_then(|mut s| s.take());
    if let Some(r) = r {
        r.stop();
    }
}

pub fn current() -> Status {
    slot().lock().ok().and_then(|s| s.as_ref().map(|r| r.status())).unwrap_or_default()
}

#[cfg(windows)]
mod win {
    use std::net::UdpSocket;
    use std::os::windows::io::AsRawSocket;
    use windows_sys::Win32::Networking::WinSock::{setsockopt, SOL_SOCKET, SO_RCVBUF, SO_SNDBUF};

    /// Tampons d'1 Mo : une rafale (chargement des chunks) ne déborde pas pendant que le moteur est occupé.
    pub fn big_buffers(s: &UdpSocket) {
        let v: i32 = 1 << 20;
        for opt in [SO_RCVBUF, SO_SNDBUF] {
            unsafe {
                setsockopt(s.as_raw_socket() as usize, SOL_SOCKET, opt, &v as *const i32 as *const u8, 4);
            }
        }
    }

    /// Minuterie Windows à 1 ms tant que Rago Route tourne (sinon les ticks de 5 ms durent 15,6 ms).
    pub fn fine_timer(on: bool) {
        use windows_sys::Win32::Media::{timeBeginPeriod, timeEndPeriod};
        unsafe {
            if on {
                timeBeginPeriod(1);
            } else {
                timeEndPeriod(1);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn header_roundtrip() {
        let sid = [7u8; 16];
        let p = packet(T_DATA, &sid, b"abc");
        let (k, s, body) = read_header(&p).unwrap();
        assert_eq!((k, s, body), (T_DATA, sid, &b"abc"[..]));
        assert!(read_header(b"XX\x01\x03").is_none());
    }

    #[test]
    fn receiver_orders_and_acks() {
        let mut r = Receiver_::new();
        assert_eq!(r.on_data(1, b"b").1.len(), 0);
        let (new, out) = r.on_data(0, b"a");
        assert!(new);
        assert_eq!(out, vec![b"a".to_vec(), b"b".to_vec()]);
        assert!(!r.on_data(0, b"a").0);
        r.on_data(3, b"d");
        let ack = r.ack(42);
        assert_eq!(be32(&ack, 0), 2);
        assert_eq!(u64::from_be_bytes(ack[4..12].try_into().unwrap()), 1); // 3 = cumul + 1 + 0
        assert_eq!(be32(&ack, 12), 42);
    }

    #[test]
    fn sender_chunks_and_confirms() {
        let mut s = Sender_::new(1e9);
        let mut out = Vec::new();
        s.push(&vec![1u8; MAX_CHUNK * 2 + 10], &mut out);
        assert_eq!(out.len(), 3);
        assert_eq!(be32(&out[2], 0), 2);
        let ts = be32(&out[0], 4);
        s.on_ack(1, 0b1, ts); // 0 confirmé (cumul), 2 confirmé (bit 0 = cumul + 1)
        assert_eq!(s.in_flight.keys().copied().collect::<Vec<_>>(), vec![1]);
        s.on_ack(3, 0, ts);
        assert!(s.is_empty());
    }

    #[test]
    fn sender_fast_resend_when_overtaken() {
        let mut s = Sender_::new(1e9);
        s.srtt = Some(1.0);
        let mut out = Vec::new();
        s.push(&[0u8; 10], &mut out);
        // le paquet 0 a « 50 ms » : un paquet parti après lui est confirmé (highest_first = 1)
        s.in_flight.get_mut(&0).unwrap().sent = now_ms().wrapping_sub(50);
        s.push(&[0u8; 10], &mut out);
        s.on_ack(0, 0b1, now_ms()); // confirme 1 seulement
        out.clear();
        s.tick(false, &mut out);
        assert_eq!(out.len(), 1);
        assert_eq!(be32(&out[0], 0), 0);
        assert_eq!(s.resends_fast, 1);
    }

    #[test]
    fn diff_wraps() {
        assert_eq!(diff_ms(5, u32::MAX - 4), 10);
        assert_eq!(diff_ms(u32::MAX - 4, 5), -10);
    }
}
