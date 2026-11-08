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
//! Protocole 2 (08/11) : à chaque connexion du jeu, une clé X25519 jetable ; la sortie répond avec la sienne et tout le
//! reste est chiffré et signé (ChaCha20-Poly1305), jeton et handshake compris. Chaque trajet a son compteur (le nonce)
//! et sa fenêtre anti-rejeu. Paquets de secours : pour 4 paquets, un XOR qui répare une perte sans renvoi.
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
const VERSION: u8 = 2;
const T_OPEN: u8 = 1;
const T_OPEN_OK: u8 = 2;
const T_DATA: u8 = 3;
const T_ACK: u8 = 4;
const T_PING: u8 = 5;
const T_PONG: u8 = 6;
const T_CLOSE: u8 = 7;
const T_FWD: u8 = 8;
/// réponse de la sortie à un AUTH sans jeton valable (chiffrée)
const T_REFUSE: u8 = 9;
/// réponse de la sortie à l'OPEN : sa clé publique X25519 (en clair)
const T_HELLO: u8 = 10;
/// clé publique du joueur (en clair), puis cible et jeton (chiffrés)
const T_AUTH: u8 = 11;
/// paquet de secours : XOR d'un groupe de paquets DATA
const T_FEC: u8 = 12;
/// trajet (u8), compteur (u64) devant chaque paquet chiffré ; étiquette Poly1305 à la fin
const SEAL_HEAD: usize = 9;
const TAG: usize = 16;
/// premier numéro (u32), nombre (u8), horodatage (u32), longueurs XOR (u16)
const FEC_HEAD: usize = 11;
/// un paquet de secours pour 4 paquets du jeu ; un groupe incomplet (au moins 2) part après 15 ms
const FEC_K: usize = 4;
const FEC_WAIT_MS: i64 = 15;
/// compteurs retenus par trajet pour refuser un paquet rejoué (16 × 64 bits)
const REPLAY_WORDS: usize = 16;
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

/// Identifiant de session : 16 octets aléatoires du système.
fn new_sid() -> [u8; 16] {
    let mut sid = [0u8; 16];
    if getrandom::getrandom(&mut sid).is_err() {
        // jamais vu : le hasard du système manque ; l'heure fine suffit à rendre l'identifiant unique
        let n = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
        sid.copy_from_slice(&n.to_le_bytes());
    }
    sid
}

// --- chiffrement du tunnel ------------------------------------------------------------------------------------------

/// Fenêtre anti-rejeu d'un trajet : le plus haut compteur reçu et les 1 024 précédents (bit i = haut - i).
#[derive(Clone)]
struct Replay {
    high: Option<u64>,
    bits: [u64; REPLAY_WORDS],
}

impl Replay {
    const SIZE: u64 = (REPLAY_WORDS * 64) as u64;

    fn new() -> Self {
        Replay { high: None, bits: [0; REPLAY_WORDS] }
    }

    fn bit(&self, i: u64) -> bool {
        self.bits[(i / 64) as usize] >> (i % 64) & 1 == 1
    }

    /// Déjà vu ou trop vieux ?
    fn rejects(&self, n: u64) -> bool {
        match self.high {
            None => false,
            Some(h) if n > h => false,
            Some(h) => h - n >= Self::SIZE || self.bit(h - n),
        }
    }

    fn mark(&mut self, n: u64) {
        match self.high {
            Some(h) if n <= h => {
                let i = h - n;
                self.bits[(i / 64) as usize] |= 1 << (i % 64);
            }
            _ => {
                let d = self.high.map_or(Self::SIZE, |h| n - h);
                if d >= Self::SIZE {
                    self.bits = [0; REPLAY_WORDS];
                } else {
                    // décale toute la fenêtre de d bits vers les anciens
                    let (words, shift) = ((d / 64) as usize, (d % 64) as u32);
                    for w in (0..REPLAY_WORDS).rev() {
                        let lo = if w >= words { self.bits[w - words] } else { 0 };
                        let carry = if shift > 0 && w > words { self.bits[w - words - 1] >> (64 - shift) } else { 0 };
                        self.bits[w] = if shift > 0 { lo << shift | carry } else { lo };
                    }
                }
                self.bits[0] |= 1;
                self.high = Some(n);
            }
        }
    }
}

/// Un sens du tunnel : ChaCha20-Poly1305, un compteur par trajet (jamais deux fois le même nonce), une fenêtre
/// anti-rejeu par trajet (une copie arrivée tard par un trajet lent n'est pas un rejeu).
struct Dir {
    aead: chacha20poly1305::ChaCha20Poly1305,
    sent: [u64; 16],
    seen: [Replay; 16],
}

impl Dir {
    fn new(key: &[u8]) -> Self {
        use chacha20poly1305::KeyInit;
        Dir {
            aead: chacha20poly1305::ChaCha20Poly1305::new(chacha20poly1305::Key::from_slice(key)),
            sent: [0; 16],
            seen: std::array::from_fn(|_| Replay::new()),
        }
    }

    fn nonce(head: &[u8]) -> chacha20poly1305::Nonce {
        let mut n = [0u8; 12];
        n[3..].copy_from_slice(head);
        n.into()
    }

    /// `aad` : ce qui précède (en-tête, et clé publique pour l'AUTH) ; renvoie trajet, compteur, chiffré + étiquette.
    fn seal(&mut self, path: usize, aad: &[u8], plain: &[u8]) -> Vec<u8> {
        use chacha20poly1305::aead::{Aead, Payload};
        let p = path % 16;
        let n = self.sent[p];
        self.sent[p] += 1;
        let mut head = [0u8; SEAL_HEAD];
        head[0] = p as u8;
        head[1..].copy_from_slice(&n.to_be_bytes());
        let mut full_aad = aad.to_vec();
        full_aad.extend_from_slice(&head);
        let ct = self.aead.encrypt(&Self::nonce(&head), Payload { msg: plain, aad: &full_aad }).unwrap_or_default();
        let mut out = Vec::with_capacity(SEAL_HEAD + ct.len());
        out.extend_from_slice(&head);
        out.extend_from_slice(&ct);
        out
    }

    /// Texte clair, ou None (trop court, modifié, forgé ou rejoué).
    fn open(&mut self, aad: &[u8], body: &[u8]) -> Option<Vec<u8>> {
        use chacha20poly1305::aead::{Aead, Payload};
        if body.len() < SEAL_HEAD + TAG || body[0] >= 16 {
            return None;
        }
        let p = body[0] as usize;
        let n = u64::from_be_bytes(body[1..SEAL_HEAD].try_into().ok()?);
        if self.seen[p].rejects(n) {
            return None;
        }
        let mut full_aad = aad.to_vec();
        full_aad.extend_from_slice(&body[..SEAL_HEAD]);
        let plain = self.aead.decrypt(&Self::nonce(&body[..SEAL_HEAD]), Payload { msg: &body[SEAL_HEAD..], aad: &full_aad }).ok()?;
        self.seen[p].mark(n);
        Some(plain)
    }
}

/// Clés de la session (joueur -> sortie, sortie -> joueur), tirées de l'échange X25519 ; None si la clé reçue est
/// invalide (échange sans contribution).
fn session_keys(secret: x25519_dalek::EphemeralSecret, ours: &[u8; 32], exit_pub: &[u8; 32], sid: &[u8; 16]) -> Option<(Dir, Dir)> {
    let shared = secret.diffie_hellman(&x25519_dalek::PublicKey::from(*exit_pub));
    if !shared.was_contributory() {
        return None;
    }
    let mut info = b"rago-route 2".to_vec();
    info.extend_from_slice(ours);
    info.extend_from_slice(exit_pub);
    let mut k = [0u8; 64];
    hkdf::Hkdf::<sha2::Sha256>::new(Some(sid), shared.as_bytes()).expand(&info, &mut k).ok()?;
    Some((Dir::new(&k[..32]), Dir::new(&k[32..])))
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
    /// paquets neufs pas encore couverts par un paquet de secours : numéro du premier, heure, données
    fec_group: Vec<Vec<u8>>,
    fec_first: u32,
    fec_start: u32,
    /// paquets de secours prêts à partir (corps T_FEC)
    fec_out: Vec<Vec<u8>>,
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
            fec_group: Vec::new(),
            fec_first: 0,
            fec_start: t,
            fec_out: Vec::new(),
        }
    }

    /// Paquet de secours : XOR des paquets du groupe (et de leurs longueurs) ; l'autre bout répare tout seul un paquet
    /// manquant du groupe. Un paquet seul n'en a pas (le renvoi rapide suffit).
    fn make_fec(&mut self) {
        let group = std::mem::take(&mut self.fec_group);
        if group.len() < 2 {
            return;
        }
        let size = group.iter().map(|d| d.len()).max().unwrap_or(0);
        let mut x = vec![0u8; size];
        let mut lens = 0u16;
        for d in &group {
            lens ^= d.len() as u16;
            for (a, b) in x.iter_mut().zip(d) {
                *a ^= b;
            }
        }
        let mut body = Vec::with_capacity(FEC_HEAD + size);
        body.extend_from_slice(&self.fec_first.to_be_bytes());
        body.push(group.len() as u8);
        body.extend_from_slice(&now_ms().to_be_bytes());
        body.extend_from_slice(&lens.to_be_bytes());
        body.extend_from_slice(&x);
        self.tokens -= (size + 40) as f64;
        self.fec_out.push(body);
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
            if self.fec_group.is_empty() {
                self.fec_first = num;
                self.fec_start = now_ms();
            }
            self.fec_group.push(chunk.clone());
            self.send(num, chunk, 1, out);
            self.next += 1;
            if self.fec_group.len() >= FEC_K {
                self.make_fec();
            }
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
        if !self.fec_group.is_empty() && diff_ms(now_ms(), self.fec_start) >= FEC_WAIT_MS {
            self.make_fec();
        }
    }
}

/// Remet les paquets dans l'ordre, ignore les doublons et prépare les confirmations (`Recepteur` du prototype).
struct Receiver_ {
    expected: u32,
    buffer: BTreeMap<u32, Vec<u8>>,
    /// derniers paquets reçus (pour les paquets de secours)
    recent: BTreeMap<u32, Vec<u8>>,
    /// paquets refaits avec un paquet de secours
    repaired: u64,
}

impl Receiver_ {
    fn new() -> Self {
        Receiver_ { expected: 0, buffer: BTreeMap::new(), recent: BTreeMap::new(), repaired: 0 }
    }

    /// Paquet de secours : refait le paquet du groupe s'il en manque exactement un. Renvoie (réparé ?, octets à livrer).
    fn on_fec(&mut self, body: &[u8]) -> (bool, Vec<Vec<u8>>) {
        if body.len() < FEC_HEAD {
            return (false, Vec::new());
        }
        let first = be32(body, 0);
        let count = body[4] as u32;
        let mut lens = be16(body, 9) as usize;
        let mut x = body[FEC_HEAD..].to_vec();
        let missing: Vec<u32> = (0..count).map(|i| first.wrapping_add(i)).filter(|n| !self.recent.contains_key(n)).collect();
        if missing.len() != 1 || missing[0] < self.expected {
            return (false, Vec::new());
        }
        for i in 0..count {
            let n = first.wrapping_add(i);
            if n == missing[0] {
                continue;
            }
            let d = &self.recent[&n];
            if d.len() > x.len() {
                return (false, Vec::new());
            }
            lens ^= d.len();
            for (a, b) in x.iter_mut().zip(d) {
                *a ^= b;
            }
        }
        if lens == 0 || lens > x.len() {
            return (false, Vec::new());
        }
        x.truncate(lens);
        let (new, out) = self.on_data(missing[0], &x);
        if new {
            self.repaired += 1;
        }
        (new, out)
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
        self.recent.insert(num, data.to_vec());
        if self.recent.len() > 512 {
            let keep = self.recent.split_off(&(num.saturating_sub(256)));
            self.recent = keep;
        }
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
    /// paquets perdus par tous les trajets et refaits avec un paquet de secours
    pub repaired: u64,
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
    /// clé X25519 jetable de cette connexion (consommée au HELLO de la sortie) et sa partie publique
    secret: Option<x25519_dalek::EphemeralSecret>,
    public: [u8; 32],
    /// joueur -> sortie et sortie -> joueur, connus après le HELLO
    tx: Option<Dir>,
    rx: Option<Dir>,
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
    repaired_done: u64,
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

    /// Chiffré pour chaque trajet (chaque trajet a ses compteurs). Rien tant que la sortie n'a pas répondu.
    fn send_all(&mut self, kind: u8, sid: &[u8; 16], body: &[u8]) {
        for i in 0..self.paths.len() {
            if let Some(p) = self.seal(kind, sid, i, body) {
                self.send_on(i, &p);
            }
        }
    }

    fn seal(&mut self, kind: u8, sid: &[u8; 16], path: usize, body: &[u8]) -> Option<Vec<u8>> {
        let tx = self.sessions.get_mut(sid)?.tx.as_mut()?;
        let mut p = packet(kind, sid, &[]);
        let sealed = tx.seal(path, &p, body);
        p.extend_from_slice(&sealed);
        Some(p)
    }

    /// Ouverture : OPEN (clé publique, en clair) tant que la sortie n'a pas répondu, puis AUTH (cible et jeton chiffrés).
    fn send_open(&mut self, sid: &[u8; 16]) {
        let Some(s) = self.sessions.get_mut(sid) else { return };
        let public = s.public;
        if s.tx.is_none() {
            let p = packet(T_OPEN, sid, &public);
            for i in 0..self.paths.len() {
                self.send_on(i, &p);
            }
            return;
        }
        let mut plain = vec![s.target];
        plain.extend_from_slice(token().lock().map(|t| t.clone()).unwrap_or_default().as_bytes());
        for i in 0..self.paths.len() {
            let Some(tx) = self.sessions.get_mut(sid).and_then(|s| s.tx.as_mut()) else { return };
            let mut p = packet(T_AUTH, sid, &public);
            let sealed = tx.seal(i, &p, &plain);
            p.extend_from_slice(&sealed);
            self.send_on(i, &p);
        }
    }

    fn flush(&mut self, sid: &[u8; 16], out: Vec<Vec<u8>>) {
        for body in out {
            self.send_all(T_DATA, sid, &body);
        }
        let fec = self.sessions.get_mut(sid).map(|s| std::mem::take(&mut s.sender.fec_out)).unwrap_or_default();
        for body in fec {
            self.send_all(T_FEC, sid, &body);
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
                let secret = x25519_dalek::EphemeralSecret::random();
                let public = *x25519_dalek::PublicKey::from(&secret).as_bytes();
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
                        secret: Some(secret),
                        public,
                        tx: None,
                        rx: None,
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
        let Some((kind, sid, raw)) = read_header(data) else { return };
        let Some(s) = self.sessions.get_mut(&sid) else { return };
        if kind == T_HELLO {
            // clé publique de la sortie : clés de la session, puis tout de suite la cible et le jeton (chiffrés)
            if s.tx.is_some() || raw.len() < 32 {
                return;
            }
            let Some(secret) = s.secret.take() else { return };
            let mut exit_pub = [0u8; 32];
            exit_pub.copy_from_slice(&raw[..32]);
            let Some((tx, rx)) = session_keys(secret, &s.public, &exit_pub, &sid) else { return };
            s.tx = Some(tx);
            s.rx = Some(rx);
            s.last_open = Some(Instant::now());
            self.send_open(&sid);
            return;
        }
        if matches!(kind, T_OPEN | T_AUTH | T_FWD) {
            return;
        }
        let Some(rx) = s.rx.as_mut() else { return };
        // l'en-tête est signé avec le reste : un paquet modifié, forgé ou rejoué est ignoré
        let Some(plain) = rx.open(&data[..HEADER], raw) else { return };
        let body = &plain[..];
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
                s.exit_resends = resends;
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
            T_FEC if body.len() >= FEC_HEAD => {
                let (new, deliver) = s.receiver.on_fec(body);
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
                if new {
                    let ack = s.receiver.ack(be32(body, 5));
                    self.send_all(T_ACK, &sid, &ack);
                }
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
            self.repaired_done += s.receiver.repaired;
        }
    }

    fn tick(&mut self, frozen: bool) {
        let sids: Vec<[u8; 16]> = self.sessions.keys().copied().collect();
        for sid in sids {
            let Some(s) = self.sessions.get_mut(&sid) else { continue };
            if !s.open {
                if s.last_open.map_or(true, |t| t.elapsed() > Duration::from_millis(200)) {
                    s.last_open = Some(Instant::now());
                    self.send_open(&sid);
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
            if let Some(p) = self.seal(T_PING, &sid, i, &b) {
                self.send_on(i, &p);
            }
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
            repaired: self.repaired_done + self.sessions.values().map(|s| s.receiver.repaired).sum::<u64>(),
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
        repaired_done: 0,
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
    fn sealed_packets_refuse_replay_and_tampering() {
        let mut a = Dir::new(&[1u8; 32]);
        let mut b = Dir::new(&[1u8; 32]);
        let head = packet(T_DATA, &[0u8; 16], &[]);
        let p0 = a.seal(0, &head, b"bonjour");
        let p1 = a.seal(1, &head, b"salut");
        assert_eq!(b.open(&head, &p1).as_deref(), Some(&b"salut"[..]));
        assert_eq!(b.open(&head, &p0).as_deref(), Some(&b"bonjour"[..])); // autre trajet, arrivé après : accepté
        assert!(b.open(&head, &p0).is_none()); // rejoué
        let mut bad = a.seal(0, &head, b"x");
        *bad.last_mut().unwrap() ^= 1;
        assert!(b.open(&head, &bad).is_none()); // modifié
        let other = packet(T_ACK, &[0u8; 16], &[]);
        assert!(b.open(&other, &a.seal(0, &head, b"y")).is_none()); // en-tête changé
    }

    #[test]
    fn replay_window_slides() {
        let mut w = Replay::new();
        for n in [5u64, 3, 70, 1100] {
            assert!(!w.rejects(n));
            w.mark(n);
            assert!(w.rejects(n));
        }
        assert!(w.rejects(5)); // trop vieux (plus de 1 024 derrière)
        assert!(!w.rejects(1099));
        w.mark(1099);
        assert!(w.rejects(1099));
        // décalages qui traversent les mots de 64 bits
        for n in [1150u64, 1290, 1500] {
            w.mark(n);
        }
        for n in [1099u64, 1100, 1150, 1290, 1500] {
            assert!(w.rejects(n), "{n}");
        }
        for n in [1101u64, 1149, 1151, 1289, 1499] {
            assert!(!w.rejects(n), "{n}");
        }
    }

    #[test]
    fn fec_repairs_one_lost_packet() {
        let mut s = Sender_::new(1e9);
        let mut out = Vec::new();
        let data: Vec<u8> = (0..4000u32).map(|i| (i * 7 % 251) as u8).collect();
        s.push(&data, &mut out);
        assert_eq!(out.len(), 4);
        assert_eq!(s.fec_out.len(), 1);
        let mut r = Receiver_::new();
        let mut got = Vec::new();
        for (k, body) in out.iter().enumerate() {
            if k == 2 {
                continue; // perdu
            }
            got.extend(r.on_data(be32(body, 0), &body[DATA_LEN..]).1.concat());
        }
        let (new, deliver) = r.on_fec(&s.fec_out[0]);
        assert!(new);
        got.extend(deliver.concat());
        assert_eq!(got, data);
        assert_eq!(r.repaired, 1);
    }

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
