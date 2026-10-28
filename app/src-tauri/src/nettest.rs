//! Test réseau (RAG-50, étape 0) : ping, gigue et perte de paquets vers les serveurs où l'on joue, mesurés depuis ce
//! PC. Rien n'est changé sur le PC.
//!
//! Mesure, 40 fois par serveur en 10 s (8 fois pour Minecraft) : moyenne, médiane, meilleur et pire, gigue, paquets
//! perdus et à-coups, chaque essai envoyé à l'interface pendant le test :
//! - serveurs Minecraft : ping / pong du protocole du jeu, comme sa liste des serveurs (mcping.rs). Hypixel est derrière
//!   Cloudflare : l'ouverture d'une connexion ne mesurerait que le trajet jusqu'au Cloudflare le plus proche ;
//! - Internet (Cloudflare) : écho ICMP, comme la commande ping ;
//! - régions : temps d'ouverture d'une connexion TCP (aller-retour SYN / SYN-ACK). Ces serveurs ne répondent pas au ping
//!   ICMP, ils répondent tous sur leur port.

use serde::Serialize;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};

use crate::icmp::Reply;

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

/// Assez d'essais pour une vraie moyenne et un taux de pertes qui veut dire quelque chose : 40 en 10 s.
const SAMPLES: u32 = 40;
const TIMEOUT: Duration = Duration::from_millis(1500);
const GAP: Duration = Duration::from_millis(250);
/// Port des serveurs Minecraft : mesurés avec le ping du jeu, une connexion par mesure. Moins d'essais et plus
/// espacés : les proxys Minecraft (BungeeCord, Velocity) refusent plus de 3 connexions en 4 s d'une même adresse, et
/// un refus se lirait comme un paquet perdu.
const MINECRAFT: u16 = 25565;
const MC_SAMPLES: u32 = 8;
const MC_GAP: Duration = Duration::from_millis(1400);

/// Comment le serveur est mesuré.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Method {
    /// ping / pong du protocole de Minecraft
    Mc,
    /// ouverture d'une connexion TCP
    Tcp,
    /// écho ICMP, comme la commande ping
    Icmp,
}

/// Un essai, envoyé à l'interface dès qu'il est fait (`nettest:sample`) : la courbe se dessine pendant le test.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    pub id: String,
    pub i: u32,
    pub n: u32,
    pub ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Measure {
    pub id: String,
    /// moyenne des allers-retours réussis, en ms
    pub ping: Option<f64>,
    pub median: Option<f64>,
    pub best: Option<f64>,
    pub worst: Option<f64>,
    /// écart moyen entre deux mesures successives, en ms
    pub jitter: Option<f64>,
    /// part des essais perdus, de 0 à 1
    pub loss: f64,
    pub lost: u32,
    pub samples: u32,
    /// mesures nettement au-dessus de la médiane (à-coups)
    pub spikes: u32,
    /// chaque essai dans l'ordre, None : perdu
    pub series: Vec<Option<f64>>,
    pub method: Method,
    /// "dns" : serveur introuvable (pas de réseau, ou serveur renommé)
    pub error: Option<String>,
}

fn median_of(sorted: &[f64]) -> Option<f64> {
    let n = sorted.len();
    (n > 0).then(|| if n % 2 == 1 { sorted[n / 2] } else { (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0 })
}

/// Chiffres d'une série d'essais (None : pas de réponse).
///
/// En TCP (connexion, ping de Minecraft), un paquet perdu n'est pas une absence de réponse : Windows le renvoie après
/// son délai de renvoi, et l'essai revient avec des centaines de ms en plus. Ces essais-là comptent comme perdus, sans
/// fausser la moyenne.
pub fn summarize(id: &str, rtts: &[Option<f64>], method: Method) -> Measure {
    let mut sorted: Vec<f64> = rtts.iter().flatten().copied().collect();
    sorted.sort_by(f64::total_cmp);
    let med = median_of(&sorted);
    let resent = |v: f64| method != Method::Icmp && med.is_some_and(|m| v >= 2.0 * m && v >= m + 200.0);
    let series: Vec<Option<f64>> = rtts.iter().map(|r| r.filter(|v| !resent(*v))).collect();
    let ok: Vec<f64> = series.iter().flatten().copied().collect();
    let samples = rtts.len() as u32;
    let lost = samples - ok.len() as u32;
    let loss = if samples == 0 { 1.0 } else { f64::from(lost) / f64::from(samples) };
    let mut sorted = ok.clone();
    sorted.sort_by(f64::total_cmp);
    let med = median_of(&sorted);
    let avg = (!ok.is_empty()).then(|| ok.iter().sum::<f64>() / ok.len() as f64);
    let jitter = (ok.len() >= 2).then(|| ok.windows(2).map(|w| (w[1] - w[0]).abs()).sum::<f64>() / (ok.len() - 1) as f64);
    let spikes = med.map_or(0, |m| ok.iter().filter(|v| **v > m + (m * 0.5).max(15.0)).count() as u32);
    let round = |v: f64| (v * 10.0).round() / 10.0;
    Measure {
        id: id.into(),
        ping: avg.map(round),
        median: med.map(round),
        best: sorted.first().copied().map(round),
        worst: sorted.last().copied().map(round),
        jitter: jitter.map(round),
        loss: (loss * 1000.0).round() / 1000.0,
        lost,
        samples,
        spikes,
        series: series.into_iter().map(|v| v.map(round)).collect(),
        method,
        error: ok.is_empty().then(|| "timeout".into()),
    }
}

fn failed(id: &str, error: &str) -> Measure {
    Measure {
        id: id.into(),
        ping: None,
        median: None,
        best: None,
        worst: None,
        jitter: None,
        loss: 1.0,
        lost: 0,
        samples: 0,
        spikes: 0,
        series: Vec::new(),
        method: Method::Tcp,
        error: Some(error.into()),
    }
}

/// IPv4 d'abord : la plupart des serveurs de jeu n'ont pas d'IPv6, et le chemin peut différer.
fn resolve(host: &str, port: u16) -> Option<SocketAddr> {
    let addrs: Vec<SocketAddr> = (host, port).to_socket_addrs().ok()?.collect();
    addrs.iter().find(|a| a.is_ipv4()).or(addrs.first()).copied()
}

fn tcp(addr: SocketAddr) -> Option<f64> {
    let t = Instant::now();
    let r = TcpStream::connect_timeout(&addr, TIMEOUT);
    let ms = t.elapsed().as_secs_f64() * 1000.0;
    // refus net (port fermé) : le serveur a répondu, l'aller-retour compte
    let answered = match &r {
        Ok(_) => true,
        Err(e) => e.kind() == std::io::ErrorKind::ConnectionRefused,
    };
    answered.then_some(ms)
}

/// Mesure un serveur ; `on_sample` reçoit chaque essai dès qu'il est fait.
pub fn measure(id: &str, on_sample: &dyn Fn(Sample)) -> Measure {
    let Some((_, host, port)) = TARGETS.iter().find(|(t, _, _)| *t == id) else {
        return failed(id, "unknown");
    };
    let Some(addr) = resolve(host, *port) else {
        return failed(id, "dns");
    };
    // Internet (Cloudflare) répond à l'écho : un vrai ping, chaque paquet perdu se voit. Sinon, la connexion.
    let pinger = match addr.ip() {
        std::net::IpAddr::V4(ip) if id == "internet" => crate::icmp::Pinger::new().filter(|p| matches!(p.send(ip, None, TIMEOUT), Reply::Echo(_))).map(|p| (p, ip)),
        _ => None,
    };
    let method = if *port == MINECRAFT {
        Method::Mc
    } else if pinger.is_some() {
        Method::Icmp
    } else {
        Method::Tcp
    };
    let (samples, gap) = if method == Method::Mc { (MC_SAMPLES, MC_GAP) } else { (SAMPLES, GAP) };
    let mut rtts = Vec::with_capacity(samples as usize);
    for i in 0..samples {
        if i > 0 {
            std::thread::sleep(gap);
        }
        let ms = match (&pinger, method) {
            (_, Method::Mc) => crate::mcping::ping(addr, host, TIMEOUT * 2),
            (Some((p, ip)), _) => match p.send(*ip, None, TIMEOUT) {
                Reply::Echo(ms) => Some(ms),
                _ => None,
            },
            _ => tcp(addr),
        };
        rtts.push(ms);
        on_sample(Sample { id: id.into(), i, n: samples, ms: ms.map(|v| (v * 10.0).round() / 10.0) });
    }
    summarize(id, &rtts, method)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sums_up_a_series() {
        let m = summarize("x", &[Some(20.0), Some(22.0), None, Some(18.0), Some(24.0)], Method::Icmp);
        assert_eq!(m.ping, Some(21.0));
        assert_eq!(m.median, Some(21.0));
        assert_eq!((m.best, m.worst), (Some(18.0), Some(24.0)));
        // |22-20| + |18-22| + |24-18| = 12, sur 3 écarts
        assert_eq!(m.jitter, Some(4.0));
        assert_eq!((m.loss, m.lost, m.samples), (0.2, 1, 5));
        assert_eq!(m.series, vec![Some(20.0), Some(22.0), None, Some(18.0), Some(24.0)]);
        assert_eq!(m.error, None);
        let dead = summarize("y", &[None, None], Method::Tcp);
        assert_eq!((dead.ping, dead.loss, dead.error.as_deref()), (None, 1.0, Some("timeout")));
    }

    #[test]
    fn a_resent_packet_counts_as_lost() {
        // 4e essai : SYN perdu puis renvoyé une seconde plus tard
        let rtts = [Some(20.0), Some(21.0), Some(19.0), Some(1020.0), Some(22.0), Some(20.0), Some(48.0), Some(20.0)];
        let m = summarize("x", &rtts, Method::Tcp);
        assert_eq!((m.lost, m.loss), (1, 0.125));
        assert_eq!(m.series[3], None);
        assert_eq!(m.worst, Some(48.0));
        // 48 ms : un à-coup, pas une perte
        assert_eq!(m.spikes, 1);
        assert_eq!(m.ping, Some(24.3));
        // en ICMP, un écho lent reste une mesure
        assert_eq!(summarize("x", &rtts, Method::Icmp).lost, 0);
    }

    #[test]
    fn only_known_servers() {
        assert_eq!(measure("example.com", &|_| {}).error.as_deref(), Some("unknown"));
        assert!(TARGETS.iter().all(|(id, host, port)| !id.is_empty() && host.contains('.') && *port > 0));
    }
}
