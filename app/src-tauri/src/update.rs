//! Mises à jour automatiques (RAG-24). L'app demande au serveur de licences s'il y a une version plus récente
//! (dès le lancement, puis toutes les 4 heures), la télécharge en arrière-plan et l'installe quand le joueur clique
//! « Redémarrer » ou ferme l'app. L'installateur est vérifié avec la clé publique de mise à jour (plugins > updater >
//! pubkey, mise par la CI avec la clé de signature) avant d'être lancé : sans elle (exe de développement, build sans
//! clé), l'app ne cherche pas de mise à jour.

use serde::Serialize;
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_updater::{Update, UpdaterExt};

const EVERY: Duration = Duration::from_secs(4 * 3600);
/// Après un échec (hors ligne, serveur coupé) : nouvel essai plus tôt.
const RETRY: Duration = Duration::from_secs(30 * 60);

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Ready {
    pub version: String,
    pub notes: Option<String>,
}

/// La mise à jour téléchargée (signature déjà vérifiée), en attente d'installation.
#[derive(Default)]
pub struct Updates {
    ready: Mutex<Option<(Update, Vec<u8>)>>,
    /// résultat de la dernière vérification, pour le rapport de support et Paramètres de l'exe de test
    last: Mutex<Option<String>>,
}

impl Updates {
    pub fn ready(&self) -> Option<Ready> {
        let guard = self.ready.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        guard.as_ref().map(|(u, _)| Ready { version: u.version.clone(), notes: u.body.clone().filter(|n| !n.trim().is_empty()) })
    }

    /// « <date> UTC: no update », « … 1.2.1 ready to install » ou « … error: <raison> » ; None avant la première.
    pub fn last_check(&self) -> Option<String> {
        self.last.lock().unwrap_or_else(std::sync::PoisonError::into_inner).clone()
    }

    fn note(&self, outcome: String) {
        let line = format!("{} UTC: {outcome}", crate::report::utc(crate::history::now_ms()));
        *self.last.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = Some(line);
    }

    /// Lance l'installateur (une barre de progression, sans question) et quitte l'app ; `restart` : elle se rouvre
    /// ensuite. Revient seulement en cas d'échec, la mise à jour reste alors en attente.
    pub fn install(&self, restart: bool) -> Result<(), String> {
        let guard = self.ready.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let Some((update, bytes)) = guard.as_ref() else {
            return Err("no_update".into());
        };
        update.clone().restart_after_install(restart).install(bytes).map_err(|e| e.to_string())
    }
}

/// Clé publique de mise à jour présente dans la configuration (la CI ne la met qu'avec la clé de signature).
pub fn enabled<R: Runtime>(app: &AppHandle<R>) -> bool {
    crate::license::API_BASE.is_some()
        && app
            .config()
            .plugins
            .0
            .get("updater")
            .and_then(|u| u.get("pubkey"))
            .and_then(|k| k.as_str())
            .is_some_and(|k| !k.trim().is_empty())
}

/// Adresse demandée par l'updater ; il remplace lui-même {{target}}, {{arch}} et {{current_version}}.
pub fn endpoint(api_base: &str) -> String {
    format!("{}/update/{{{{target}}}}/{{{{arch}}}}/{{{{current_version}}}}", api_base.trim_end_matches('/'))
}

/// Ce PC pour le déploiement progressif : toujours le même, sans rien révéler de l'empreinte de la licence.
pub fn device_tag(seed: &str) -> String {
    Sha256::digest(format!("rago-update-v1|{seed}").as_bytes()).iter().take(12).map(|b| format!("{b:02x}")).collect()
}

/// Boucle de fond : vérifie, télécharge, prévient l'interface (`update:ready`). Rien ne s'installe sans le joueur.
pub fn watch<R: Runtime>(app: AppHandle<R>, updates: std::sync::Arc<Updates>, device: impl Fn() -> String + Send + 'static) {
    if !enabled(&app) {
        updates.note("off, this build has no update key".into());
        return;
    }
    std::thread::spawn(move || {
        let tag = device_tag(&device());
        loop {
            let wait = match tauri::async_runtime::block_on(check(&app, &updates, &tag)) {
                Ok(true) => {
                    // téléchargée : plus rien à chercher jusqu'à l'installation
                    let version = updates.ready().map(|r| r.version).unwrap_or_default();
                    updates.note(format!("{version} ready to install"));
                    return;
                }
                Ok(false) => {
                    updates.note("no update".into());
                    EVERY
                }
                Err(e) => {
                    eprintln!("[update] {e}");
                    updates.note(format!("error: {e}"));
                    RETRY
                }
            };
            std::thread::sleep(wait);
        }
    });
}

async fn check<R: Runtime>(app: &AppHandle<R>, updates: &Updates, tag: &str) -> Result<bool, String> {
    let base = crate::license::API_BASE.ok_or("unconfigured")?;
    let url = endpoint(base).parse().map_err(|e| format!("{e}"))?;
    let updater = app
        .updater_builder()
        .endpoints(vec![url])
        .and_then(|b| b.header("X-Rago-Device", tag))
        .map_err(|e| e.to_string())?
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let Some(mut update) = updater.check().await.map_err(|e| format!("check: {}", causes(&e)))? else {
        return Ok(false);
    };
    // l'installateur pèse une dizaine de Mo : plus de temps qu'une simple question au serveur
    update.timeout = Some(Duration::from_secs(15 * 60));
    // download vérifie la signature : un fichier qui n'est pas signé par Rago s'arrête ici
    let bytes = update.download(|_, _| {}, || {}).await.map_err(|e| format!("download {}: {}", update.download_url, causes(&e)))?;
    let ready = Ready { version: update.version.clone(), notes: update.body.clone().filter(|n| !n.trim().is_empty()) };
    *updates.ready.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = Some((update, bytes));
    let _ = app.emit("update:ready", ready);
    Ok(true)
}

/// L'erreur et ses causes (« error sending request » seul ne dit pas si c'est le DNS, le certificat ou un délai).
fn causes(e: &dyn std::error::Error) -> String {
    let mut text = e.to_string();
    let mut source = e.source();
    while let Some(cause) = source {
        text.push_str(&format!(": {cause}"));
        source = cause.source();
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn endpoint_keeps_the_updater_variables() {
        assert_eq!(
            endpoint("https://account.ragohub.com/api/v1/"),
            "https://account.ragohub.com/api/v1/update/{{target}}/{{arch}}/{{current_version}}"
        );
    }

    #[test]
    fn device_tag_is_stable_and_opaque() {
        let a = device_tag("abc");
        assert_eq!(a, device_tag("abc"));
        assert_ne!(a, device_tag("abd"));
        assert_eq!(a.len(), 24);
        assert!(!a.contains("abc"));
    }

    #[test]
    fn nothing_waits_at_first() {
        let u = Updates::default();
        assert_eq!(u.ready(), None);
        assert_eq!(u.install(true), Err("no_update".into()));
        assert_eq!(u.last_check(), None);
    }

    #[test]
    fn last_check_is_dated() {
        let u = Updates::default();
        u.note("error: check: timed out".into());
        let last = u.last_check().unwrap();
        assert!(last.ends_with(" UTC: error: check: timed out"), "{last}");
    }

    #[test]
    fn causes_are_spelled_out() {
        #[derive(Debug)]
        struct Wrap(std::io::Error);
        impl std::fmt::Display for Wrap {
            fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                f.write_str("error sending request")
            }
        }
        impl std::error::Error for Wrap {
            fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
                Some(&self.0)
            }
        }
        assert_eq!(causes(&Wrap(std::io::Error::new(std::io::ErrorKind::TimedOut, "timed out"))), "error sending request: timed out");
    }
}
