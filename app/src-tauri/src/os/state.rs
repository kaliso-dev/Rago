//! État de Rago OS, gardé dans %APPDATA%\gg.rago.optimizer\os.json : ce que le joueur a choisi, ce qui a été retiré
//! ou posé hors du registre des réglages (applications du Store, actions natives), et le journal de l'opération en cours.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

use super::catalog::Native;
use super::engine::Appx;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JobKind {
    /// activation, ou changement de la sélection pendant que Rago OS est actif
    Apply,
    /// « Désactiver et tout restaurer », fin de Premium, désinstallation
    Restore,
}

/// Opération en cours, notée avant de commencer et mise à jour après chaque réglage : une opération coupée reprend
/// là où elle s'est arrêtée.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub kind: JobKind,
    /// réglages à appliquer, dans l'ordre
    #[serde(default)]
    pub apply: Vec<String>,
    /// réglages à remettre, dans l'ordre
    #[serde(default)]
    pub revert: Vec<String>,
    #[serde(default)]
    pub done: Vec<String>,
    pub started: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Failure {
    pub id: String,
    pub error: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OsState {
    #[serde(default)]
    pub active: bool,
    #[serde(default)]
    pub profile: Option<String>,
    /// réglages choisis par le joueur (profil + mode avancé)
    #[serde(default)]
    pub selection: Vec<String>,
    /// animation de démarrage, Dynamic Island, barre transparente
    #[serde(default)]
    pub features: BTreeMap<String, bool>,
    #[serde(default)]
    pub activated_at: Option<u64>,
    /// build de Windows à l'activation : une mise à jour majeure peut remettre des valeurs (vérification de dérive)
    #[serde(default)]
    pub build: u32,
    #[serde(default)]
    pub appx: BTreeMap<String, Appx>,
    #[serde(default)]
    pub natives: BTreeMap<Native, serde_json::Value>,
    #[serde(default)]
    pub job: Option<Job>,
    /// échecs de la dernière opération
    #[serde(default)]
    pub failed: Vec<Failure>,
    /// un redémarrage du PC reste à faire pour finir la dernière opération
    #[serde(default)]
    pub restart_pending: bool,
    /// quand ce redémarrage a été demandé (ms) : un démarrage du PC après lui l'a fait
    #[serde(default)]
    pub restart_marked: u64,
    /// point de restauration créé avant la première activation
    #[serde(default)]
    pub restore_point: Option<u64>,
    /// barre des tâches transparente : réglages de TranslucentTB d'avant (None : aucun fichier)
    #[serde(default)]
    pub translucenttb: Option<super::translucenttb::Saved>,
    #[serde(skip)]
    path: PathBuf,
}

impl OsState {
    pub fn load(path: PathBuf) -> Self {
        let mut s: OsState = fs::read(&path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        s.path = path;
        s
    }

    /// Écriture atomique (fichier temporaire puis renommage) : une coupure ne laisse jamais un état à moitié écrit.
    pub fn save(&self) {
        if self.path.as_os_str().is_empty() {
            return;
        }
        if let Some(dir) = self.path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        let tmp = self.path.with_extension("json.tmp");
        if let Ok(json) = serde_json::to_vec_pretty(self) {
            if fs::write(&tmp, json).is_ok() {
                let _ = fs::rename(&tmp, &self.path);
            }
        }
    }

    pub fn feature(&self, id: &str) -> bool {
        self.features.get(id).copied().unwrap_or_else(|| super::catalog::get().feature_default(id))
    }

    /// Plus rien de Rago OS sur ce PC : ni réglage, ni application retirée, ni action native, ni opération en cours.
    pub fn is_clean(&self, ledger: &crate::backup::Ledger) -> bool {
        self.appx.is_empty()
            && self.natives.is_empty()
            && self.job.is_none()
            && self.translucenttb.is_none()
            && !ledger.tweaks.keys().any(|id| super::engine::is_os(id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_survives_a_round_trip_and_a_missing_file() {
        let dir = std::env::temp_dir().join(format!("rago-os-state-{}", std::process::id()));
        let path = dir.join("os.json");
        let _ = fs::remove_dir_all(&dir);
        assert_eq!(OsState::load(path.clone()).active, false);
        let mut s = OsState::load(path.clone());
        s.active = true;
        s.natives.insert(Native::Wallpaper, serde_json::json!({ "x": 1 }));
        s.job = Some(Job { kind: JobKind::Apply, apply: vec!["a".into(), "b".into()], revert: vec![], done: vec!["a".into()], started: 1 });
        s.save();
        let back = OsState::load(path);
        assert!(back.active);
        assert_eq!(back.job.unwrap().done, vec!["a".to_string()]);
        assert_eq!(back.natives[&Native::Wallpaper]["x"], 1);
        let _ = fs::remove_dir_all(&dir);
    }
}
