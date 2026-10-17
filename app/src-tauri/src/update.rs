//! Mises à jour automatiques (RAG-24). L'app demande au serveur de licences s'il y a une version plus récente
//! (au lancement, puis toutes les 4 heures), la télécharge en arrière-plan et l'installe quand le joueur clique
//! « Redémarrer » ou ferme l'app. L'installateur est vérifié avec la clé publique de mise à jour (plugins > updater >
//! pubkey, mise par la CI avec la clé de signature) avant d'être lancé : sans elle (exe de développement, build sans
//! clé), l'app ne cherche pas de mise à jour.

use serde::Serialize;
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_updater::{Update, UpdaterExt};

/// Premier essai un peu après le lancement : l'app et la licence d'abord.
const FIRST_CHECK: Duration = Duration::from_secs(30);
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
}

impl Updates {
    pub fn ready(&self) -> Option<Ready> {
        let guard = self.ready.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        guard.as_ref().map(|(u, _)| Ready { version: u.version.clone(), notes: u.body.clone().filter(|n| !n.trim().is_empty()) })
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
        return;
    }
    std::thread::spawn(move || {
        std::thread::sleep(FIRST_CHECK);
        let tag = device_tag(&device());
        loop {
            let wait = match tauri::async_runtime::block_on(check(&app, &updates, &tag)) {
                Ok(true) => return, // téléchargée : plus rien à chercher jusqu'à l'installation
                Ok(false) => EVERY,
                Err(e) => {
                    eprintln!("[update] {e}");
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
    let Some(mut update) = updater.check().await.map_err(|e| e.to_string())? else {
        return Ok(false);
    };
    // l'installateur pèse une dizaine de Mo : plus de temps qu'une simple question au serveur
    update.timeout = Some(Duration::from_secs(15 * 60));
    // download vérifie la signature : un fichier qui n'est pas signé par Rago s'arrête ici
    let bytes = update.download(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    let ready = Ready { version: update.version.clone(), notes: update.body.clone().filter(|n| !n.trim().is_empty()) };
    *updates.ready.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = Some((update, bytes));
    let _ = app.emit("update:ready", ready);
    Ok(true)
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
    }
}
