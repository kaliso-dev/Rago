//! Résultats du test réseau envoyés au serveur (RAG-50, étape 0 du plan des proxys) : à chaque test, sans le demander
//! au joueur (choix de Sofiene du 29/10/2026, écrit dans la politique de confidentialité). Le serveur en déduit la
//! ville, la région, le pays et le fournisseur d'accès, puis oublie l'adresse IP : de quoi choisir où de futurs
//! serveurs Rago feraient baisser le ping. Ne part que les chiffres de chaque serveur, la version de l'app et un
//! identifiant anonyme du PC, différent de celui des mises à jour.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::nettest::Measure;

/// Ce PC d'un test à l'autre, sans rien révéler de l'empreinte de la licence ni de l'identifiant des mises à jour.
pub fn device_tag(seed: &str) -> String {
    Sha256::digest(format!("rago-net-v1|{seed}").as_bytes()).iter().take(12).map(|b| format!("{b:02x}")).collect()
}

/// Ce qui part : les chiffres de chaque serveur, sans la série des essais.
pub fn payload(version: &str, results: &[Measure]) -> Value {
    let results: Vec<Value> = results
        .iter()
        .map(|m| {
            json!({
                "id": m.id, "method": m.method, "ping": m.ping, "median": m.median, "best": m.best, "worst": m.worst,
                "jitter": m.jitter, "loss": m.loss, "samples": m.samples, "spikes": m.spikes, "error": m.error,
            })
        })
        .collect();
    json!({ "app": version, "results": results })
}

/// Hors ligne (aucun serveur trouvé), il n'y a rien à apprendre ni personne pour le recevoir.
fn worth_sending(results: &[Measure]) -> bool {
    results.iter().any(|m| m.error.as_deref() != Some("dns"))
}

/// Envoie en arrière-plan ; un échec (pas de réseau, serveur injoignable) ne se voit pas et ne retarde rien.
pub fn send(seed: &str, version: &str, results: &[Measure]) {
    let Some(base) = crate::license::API_BASE else {
        return;
    };
    if !worth_sending(results) {
        return;
    }
    let url = format!("{}/network/report", base.trim_end_matches('/'));
    let (tag, body) = (device_tag(seed), payload(version, results));
    std::thread::spawn(move || {
        if let Err(e) = crate::account::agent().post(&url).header("X-Rago-Device", tag.as_str()).send_json(&body) {
            eprintln!("[netshare] {e}");
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nettest::{summarize, Method};

    #[test]
    fn sends_the_figures_without_the_series() {
        let m = summarize("hypixel", &[Some(90.0), Some(92.0), None, Some(91.0)], Method::Mc);
        let body = payload("1.2.1", &[m]);
        assert_eq!(
            body,
            json!({ "app": "1.2.1", "results": [{
                "id": "hypixel", "method": "mc", "ping": 91.0, "median": 91.0, "best": 90.0, "worst": 92.0, "jitter": 1.5,
                "loss": 0.25, "samples": 4, "spikes": 0, "error": null,
            }] })
        );
    }

    #[test]
    fn device_tag_is_its_own() {
        let a = device_tag("abc");
        assert_eq!(a, device_tag("abc"));
        assert_eq!(a.len(), 24);
        assert_ne!(a, device_tag("abd"));
        assert_ne!(a, crate::update::device_tag("abc"));
    }

    #[test]
    fn nothing_to_send_offline() {
        let dns = |id: &str| summarize(id, &[], Method::Tcp);
        let mut offline = vec![dns("paris"), dns("london")];
        for m in &mut offline {
            m.error = Some("dns".into());
        }
        assert!(!worth_sending(&offline));
        assert!(!worth_sending(&[]));
        offline.push(summarize("internet", &[None, None], Method::Icmp));
        assert!(worth_sending(&offline));
    }
}
