//! Mesure de latence vers un serveur de jeu, par temps de connexion TCP.
//!
//! Un ICMP « ping » demande des droits particuliers et beaucoup de serveurs Minecraft le
//! bloquent. Le temps d'établissement d'une connexion TCP sur le port du jeu (25565) mesure
//! un aller-retour réseau vers le vrai serveur, sans dépendre de la langue de ping.exe.

use serde::Serialize;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub host: String,
    pub ip: Option<String>,
    pub samples: Vec<f64>,
    pub avg: Option<f64>,
    pub min: Option<f64>,
    pub max: Option<f64>,
    /// écart moyen entre deux mesures consécutives, en ms
    pub jitter: Option<f64>,
    /// pourcentage de tentatives sans réponse
    pub loss: f64,
    pub error: Option<String>,
}

pub fn tcp_ping(host: &str, port: u16, count: u32, timeout_ms: u64) -> PingResult {
    let mut res = PingResult {
        host: host.to_string(),
        ip: None,
        samples: vec![],
        avg: None,
        min: None,
        max: None,
        jitter: None,
        loss: 100.0,
        error: None,
    };
    // résolution DNS faite une fois, hors mesure
    let addr: SocketAddr = match (host, port).to_socket_addrs() {
        Ok(addrs) => {
            let all: Vec<SocketAddr> = addrs.collect();
            match all.iter().find(|a| a.is_ipv4()).or(all.first()) {
                Some(a) => *a,
                None => {
                    res.error = Some("Adresse introuvable".into());
                    return res;
                }
            }
        }
        Err(e) => {
            res.error = Some(format!("Résolution DNS impossible : {e}"));
            return res;
        }
    };
    res.ip = Some(addr.ip().to_string());
    let timeout = Duration::from_millis(timeout_ms);
    let mut failures = 0;
    for i in 0..count {
        let start = Instant::now();
        match TcpStream::connect_timeout(&addr, timeout) {
            Ok(stream) => {
                let ms = start.elapsed().as_secs_f64() * 1000.0;
                drop(stream);
                res.samples.push((ms * 10.0).round() / 10.0);
            }
            Err(_) => failures += 1,
        }
        if i + 1 < count {
            std::thread::sleep(Duration::from_millis(120));
        }
    }
    res.loss = (failures as f64 / count.max(1) as f64 * 1000.0).round() / 10.0;
    if res.samples.is_empty() {
        res.error = Some("Le serveur ne répond pas".into());
        return res;
    }
    let s = &res.samples;
    let avg = s.iter().sum::<f64>() / s.len() as f64;
    res.avg = Some((avg * 10.0).round() / 10.0);
    res.min = s.iter().cloned().reduce(f64::min);
    res.max = s.iter().cloned().reduce(f64::max);
    if s.len() > 1 {
        let j = s.windows(2).map(|w| (w[1] - w[0]).abs()).sum::<f64>() / (s.len() - 1) as f64;
        res.jitter = Some((j * 10.0).round() / 10.0);
    } else {
        res.jitter = Some(0.0);
    }
    res
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    #[test]
    fn measures_local_listener() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || for _ in listener.incoming() {});
        let r = tcp_ping("127.0.0.1", port, 3, 500);
        assert_eq!(r.samples.len(), 3);
        assert_eq!(r.loss, 0.0);
        assert!(r.avg.unwrap() < 50.0);
    }

    #[test]
    fn reports_unreachable() {
        // port 1 fermé en local : refus immédiat
        let r = tcp_ping("127.0.0.1", 1, 2, 200);
        assert!(r.samples.is_empty());
        assert_eq!(r.loss, 100.0);
        assert!(r.error.is_some());
    }
}
