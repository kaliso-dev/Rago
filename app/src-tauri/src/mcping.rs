//! Ping d'un serveur Minecraft comme le mesure la liste des serveurs du jeu : poignée de main, demande d'état, puis
//! ping / pong (protocole « Server List Ping »). La réponse vient du serveur lui-même (le proxy BungeeCord de Hypixel),
//! pas du relais réseau devant lui : Hypixel est derrière Cloudflare, un ping ICMP ou une ouverture de connexion TCP ne
//! mesure que l'aller-retour jusqu'au Cloudflare le plus proche (quelques ms), pas jusqu'au serveur où l'on joue.

use std::io::{Read, Write};
use std::net::{IpAddr, SocketAddr, TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};

/// Serveurs Minecraft connus : leur nom est envoyé dans la poignée de main quand le jeu est connecté à leur adresse
/// (certains réseaux ne répondent qu'à leur propre nom).
pub const KNOWN_HOSTS: &[&str] = &["mc.hypixel.net", "eu.minemen.club", "na.minemen.club", "as.minemen.club"];

/// Taille maximale acceptée pour la réponse d'état (description et icône du serveur).
const MAX_PACKET: usize = 1 << 20;

fn varint(mut v: u32, out: &mut Vec<u8>) {
    loop {
        if v & !0x7F == 0 {
            out.push(v as u8);
            return;
        }
        out.push((v as u8 & 0x7F) | 0x80);
        v >>= 7;
    }
}

fn read_varint(r: &mut impl Read) -> Option<u32> {
    let mut v = 0u32;
    for i in 0..5 {
        let mut b = [0u8; 1];
        r.read_exact(&mut b).ok()?;
        v |= u32::from(b[0] & 0x7F) << (7 * i);
        if b[0] & 0x80 == 0 {
            return Some(v);
        }
    }
    None
}

fn packet(id: u8, body: &[u8]) -> Vec<u8> {
    let mut p = Vec::with_capacity(body.len() + 6);
    varint(body.len() as u32 + 1, &mut p);
    p.push(id);
    p.extend_from_slice(body);
    p
}

/// Poignée de main (état suivant : statut) puis demande d'état, en un seul envoi.
pub fn hello(host: &str, port: u16) -> Vec<u8> {
    let mut body = Vec::with_capacity(host.len() + 8);
    // version du protocole : 47 (1.8), acceptée pour l'état par tous les serveurs
    varint(47, &mut body);
    varint(host.len() as u32, &mut body);
    body.extend_from_slice(host.as_bytes());
    body.extend_from_slice(&port.to_be_bytes());
    varint(1, &mut body);
    let mut out = packet(0x00, &body);
    out.extend_from_slice(&packet(0x00, &[]));
    out
}

/// Lit un paquet entier et renvoie son identifiant et son contenu.
fn read_packet(r: &mut impl Read) -> Option<(u32, Vec<u8>)> {
    let len = read_varint(r)? as usize;
    if len == 0 || len > MAX_PACKET {
        return None;
    }
    let mut buf = vec![0u8; len];
    r.read_exact(&mut buf).ok()?;
    let mut cur = std::io::Cursor::new(&buf);
    let id = read_varint(&mut cur)?;
    let at = cur.position() as usize;
    Some((id, buf[at..].to_vec()))
}

/// Aller-retour du ping / pong en ms, None si le serveur ne répond pas comme un serveur Minecraft.
pub fn ping(addr: SocketAddr, host: &str, timeout: Duration) -> Option<f64> {
    let mut s = TcpStream::connect_timeout(&addr, timeout).ok()?;
    s.set_read_timeout(Some(timeout)).ok()?;
    s.set_write_timeout(Some(timeout)).ok()?;
    let _ = s.set_nodelay(true);
    s.write_all(&hello(host, addr.port())).ok()?;
    let (id, _status) = read_packet(&mut s)?;
    if id != 0x00 {
        return None;
    }
    let payload = 0x5241_474F_u64.to_be_bytes();
    let t = Instant::now();
    s.write_all(&packet(0x01, &payload)).ok()?;
    let (id, body) = read_packet(&mut s)?;
    let ms = t.elapsed().as_secs_f64() * 1000.0;
    (id == 0x01 && body == payload).then_some(ms)
}

/// Nom à envoyer pour un serveur dont on ne connaît que l'adresse : celui d'un serveur connu à cette adresse, sinon
/// l'adresse elle-même.
pub fn host_for(ip: IpAddr) -> String {
    KNOWN_HOSTS
        .iter()
        .find(|h| (**h, 25565).to_socket_addrs().is_ok_and(|mut a| a.any(|a| a.ip() == ip)))
        .map_or_else(|| ip.to_string(), |h| (*h).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    #[test]
    fn varints_match_the_protocol() {
        let enc = |v| {
            let mut o = Vec::new();
            varint(v, &mut o);
            o
        };
        assert_eq!(enc(0), [0x00]);
        assert_eq!(enc(1), [0x01]);
        assert_eq!(enc(127), [0x7f]);
        assert_eq!(enc(128), [0x80, 0x01]);
        assert_eq!(enc(25565), [0xdd, 0xc7, 0x01]);
        assert_eq!(read_varint(&mut &[0xdd, 0xc7, 0x01][..]), Some(25565));
        // poignée de main : longueur, id 0, protocole 47, nom, port 25565, état 1 ; puis demande d'état
        let h = hello("mc.hypixel.net", 25565);
        assert_eq!(&h[..3], &[20, 0x00, 47]);
        assert_eq!(&h[h.len() - 5..], &[0x63, 0xdd, 0x01, 0x01, 0x00]);
    }

    /// Un faux serveur Minecraft local : répond à l'état puis renvoie le pong.
    #[test]
    fn measures_the_ping_pong() {
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = l.local_addr().unwrap();
        std::thread::spawn(move || {
            let (mut c, _) = l.accept().unwrap();
            let (id, _) = read_packet(&mut c).unwrap();
            assert_eq!(id, 0x00);
            let (id, _) = read_packet(&mut c).unwrap();
            assert_eq!(id, 0x00);
            let json = br#"{"version":{"name":"1.8.9","protocol":47},"players":{"max":1,"online":0},"description":"Rago"}"#;
            let mut body = Vec::new();
            varint(json.len() as u32, &mut body);
            body.extend_from_slice(json);
            c.write_all(&packet(0x00, &body)).unwrap();
            let (id, payload) = read_packet(&mut c).unwrap();
            assert_eq!(id, 0x01);
            std::thread::sleep(Duration::from_millis(30));
            c.write_all(&packet(0x01, &payload)).unwrap();
        });
        let ms = ping(addr, "127.0.0.1", Duration::from_secs(2)).expect("pong");
        assert!((25.0..1000.0).contains(&ms), "{ms}");
    }

    #[test]
    fn not_a_minecraft_server() {
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = l.local_addr().unwrap();
        std::thread::spawn(move || {
            let (mut c, _) = l.accept().unwrap();
            let _ = c.write_all(b"HTTP/1.1 400 Bad Request\r\n\r\n");
        });
        assert_eq!(ping(addr, "127.0.0.1", Duration::from_millis(800)), None);
        assert_eq!(host_for("127.0.0.1".parse().unwrap()), "127.0.0.1");
    }
}
