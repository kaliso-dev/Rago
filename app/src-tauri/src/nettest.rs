//! Test réseau (RAG-50, étape 0) : ping, gigue et perte de paquets vers les serveurs où l'on joue, mesurés depuis ce
//! PC. Rien n'est changé sur le PC.
//!
//! Mesure, plusieurs fois par serveur :
//! - serveurs Minecraft : ping / pong du protocole du jeu, comme sa liste des serveurs (mcping.rs). Hypixel est derrière
//!   Cloudflare : l'ouverture d'une connexion ne mesurerait que le trajet jusqu'au Cloudflare le plus proche ;
//! - régions et Internet : temps d'ouverture d'une connexion TCP (aller-retour SYN / SYN-ACK). Ces serveurs ne répondent
//!   pas toujours au ping ICMP, ils répondent tous sur leur port.

use serde::Serialize;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};

/// Serveurs testés : identifiant (noms et descriptions dans l'interface), hôte, port. Seuls ceux-là peuvent être
/// mesurés.
pub const TARGETS: &[(&str, &str, u16)] = &[
    ("hypixel", "mc.hypixel.net", 25565),
    ("minemen", "eu.minemen.club", 25565),
    ("paris", "dynamodb.eu-west-3.amazonaws.com", 443),
    ("frankfurt", "dynamodb.eu-central-1.amazonaws.com", 443),
    ("london", "dynamodb.eu-west-2.amazonaws.com", 443),
    ("stockholm", "dynamodb.eu-north-1.amazonaws.com", 443),
    ("madrid", "dynamodb.eu-south-2.amazonaws.com", 443),
    ("virginia", "dynamodb.us-east-1.amazonaws.com", 443),
    ("internet", "one.one.one.one", 443),
];

const SAMPLES: u32 = 10;
const TIMEOUT: Duration = Duration::from_millis(1500);
const GAP: Duration = Duration::from_millis(120);
/// Port des serveurs Minecraft : mesurés avec le ping du jeu, une connexion par mesure. Moins d'essais et plus
/// espacés : les proxys Minecraft refusent les connexions trop rapprochées d'une même adresse.
const MINECRAFT: u16 = 25565;
const MC_SAMPLES: u32 = 5;
const MC_GAP: Duration = Duration::from_millis(1000);

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Measure {
    pub id: String,
    /// médiane des allers-retours réussis, en ms
    pub ping: Option<f64>,
    pub best: Option<f64>,
    /// écart moyen entre deux mesures successives, en ms
    pub jitter: Option<f64>,
    /// part des essais sans réponse, de 0 à 1
    pub loss: f64,
    pub samples: u32,
    /// "dns" : serveur introuvable (pas de réseau, ou serveur renommé)
    pub error: Option<String>,
}

/// Chiffres d'une série d'essais (None : pas de réponse).
pub fn summarize(id: &str, rtts: &[Option<f64>]) -> Measure {
    let ok: Vec<f64> = rtts.iter().flatten().copied().collect();
    let samples = rtts.len() as u32;
    let loss = if samples == 0 { 1.0 } else { 1.0 - ok.len() as f64 / f64::from(samples) };
    let mut sorted = ok.clone();
    sorted.sort_by(f64::total_cmp);
    let ping = (!sorted.is_empty()).then(|| {
        let n = sorted.len();
        if n % 2 == 1 {
            sorted[n / 2]
        } else {
            (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0
        }
    });
    let jitter = (ok.len() >= 2).then(|| ok.windows(2).map(|w| (w[1] - w[0]).abs()).sum::<f64>() / (ok.len() - 1) as f64);
    let round = |v: f64| (v * 10.0).round() / 10.0;
    Measure {
        id: id.into(),
        ping: ping.map(round),
        best: sorted.first().copied().map(round),
        jitter: jitter.map(round),
        loss: (loss * 1000.0).round() / 1000.0,
        samples,
        error: ok.is_empty().then(|| "timeout".into()),
    }
}

/// IPv4 d'abord : la plupart des serveurs de jeu n'ont pas d'IPv6, et le chemin peut différer.
fn resolve(host: &str, port: u16) -> Option<SocketAddr> {
    let addrs: Vec<SocketAddr> = (host, port).to_socket_addrs().ok()?.collect();
    addrs.iter().find(|a| a.is_ipv4()).or(addrs.first()).copied()
}

pub fn measure(id: &str) -> Measure {
    let Some((_, host, port)) = TARGETS.iter().find(|(t, _, _)| *t == id) else {
        return Measure { id: id.into(), ping: None, best: None, jitter: None, loss: 1.0, samples: 0, error: Some("unknown".into()) };
    };
    let Some(addr) = resolve(host, *port) else {
        return Measure { id: id.into(), ping: None, best: None, jitter: None, loss: 1.0, samples: 0, error: Some("dns".into()) };
    };
    let (samples, gap) = if *port == MINECRAFT { (MC_SAMPLES, MC_GAP) } else { (SAMPLES, GAP) };
    let mut rtts = Vec::with_capacity(samples as usize);
    for i in 0..samples {
        if i > 0 {
            std::thread::sleep(gap);
        }
        if *port == MINECRAFT {
            rtts.push(crate::mcping::ping(addr, host, TIMEOUT * 2));
            continue;
        }
        let t = Instant::now();
        let r = TcpStream::connect_timeout(&addr, TIMEOUT);
        let ms = t.elapsed().as_secs_f64() * 1000.0;
        // refus net (port fermé) : le serveur a répondu, l'aller-retour compte
        let answered = match &r {
            Ok(_) => true,
            Err(e) => e.kind() == std::io::ErrorKind::ConnectionRefused,
        };
        rtts.push(answered.then_some(ms));
        drop(r);
    }
    summarize(id, &rtts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sums_up_a_series() {
        let m = summarize("x", &[Some(20.0), Some(22.0), None, Some(18.0), Some(24.0)]);
        assert_eq!(m.ping, Some(21.0));
        assert_eq!(m.best, Some(18.0));
        // |22-20| + |18-22| + |24-18| = 12, sur 3 écarts
        assert_eq!(m.jitter, Some(4.0));
        assert_eq!(m.loss, 0.2);
        assert_eq!(m.error, None);
        let dead = summarize("y", &[None, None]);
        assert_eq!((dead.ping, dead.loss, dead.error.as_deref()), (None, 1.0, Some("timeout")));
    }

    #[test]
    fn only_known_servers() {
        assert_eq!(measure("example.com").error.as_deref(), Some("unknown"));
        assert!(TARGETS.iter().all(|(id, host, port)| !id.is_empty() && host.contains('.') && *port > 0));
    }
}
