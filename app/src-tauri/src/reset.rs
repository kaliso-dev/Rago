//! Remise à zéro des réglages, sans fenêtre ni bouton pour l'arrêter : les réglages Premium quand ce PC n'a plus de
//! licence (abonnement terminé, remboursement, déconnexion), tous les réglages à la désinstallation (le
//! désinstallateur lance l'exe avec `--reset-tweaks`, voir installer/hooks.nsh).
//!
//! Un réglage ne quitte applied.json qu'une fois remis : une remise coupée (app fermée de force, PC éteint) reprend au
//! lancement suivant.

use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use crate::backup::Ledger;
use crate::history::History;
use crate::license::License;
use crate::runner::{Context, RunItem, Runner};
use crate::{catalog, system};

/// Argument passé par le désinstallateur.
pub const UNINSTALL_ARG: &str = "--reset-tweaks";
/// Identifiant de tauri.conf.json : nom du dossier des données dans %APPDATA%, comme app_data_dir() de Tauri.
pub const IDENTIFIER: &str = "gg.rago.optimizer";

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Scope {
    /// fin de Premium : les réglages gratuits restent
    Premium,
    /// désinstallation
    All,
}

/// Réglages à remettre, le dernier appliqué en premier.
pub fn targets(ledger: &Ledger, scope: Scope) -> Vec<String> {
    let mut ids: Vec<(&String, u64)> = ledger
        .tweaks
        .iter()
        .filter(|(id, _)| scope == Scope::All || !catalog::is_free(id))
        .map(|(id, a)| (id, a.ts))
        .collect();
    ids.sort_by(|a, b| b.1.cmp(&a.1));
    ids.into_iter().map(|(id, _)| id.clone()).collect()
}

pub fn items(ids: Vec<String>) -> Vec<RunItem> {
    ids.into_iter().map(|id| RunItem { id, variant: None, params: None, undo: true }).collect()
}

/// Fin d'une remise, envoyée à l'interface (`reset:done`) pour le petit message « Tweaks have been reset ».
#[derive(Clone, Serialize)]
pub struct Done {
    pub ok: usize,
    pub failed: usize,
}

#[derive(Default)]
pub struct Reset {
    running: AtomicBool,
    /// fenêtre fermée pendant la remise : l'app reste cachée et quitte à la fin
    quit_after: AtomicBool,
}

impl Reset {
    /// false si une remise tourne déjà.
    pub fn begin(&self) -> bool {
        !self.running.swap(true, Ordering::SeqCst)
    }

    /// Remise finie : true si la fenêtre a été fermée entre-temps et que l'app doit quitter.
    pub fn end(&self) -> bool {
        self.running.store(false, Ordering::SeqCst);
        self.quit_after.load(Ordering::SeqCst)
    }

    /// Fenêtre fermée : true si l'app doit rester ouverte, cachée, jusqu'à la fin de la remise.
    pub fn hold_exit(&self) -> bool {
        if !self.running.load(Ordering::SeqCst) {
            return false;
        }
        self.quit_after.store(true, Ordering::SeqCst);
        // finie entre-temps : end() n'a peut-être pas vu la demande, l'app se ferme normalement
        self.running.load(Ordering::SeqCst)
    }
}

/// Désinstallation : remet tous les réglages appliqués sur ce PC, sans fenêtre. Le désinstallateur attend la fin
/// avant de retirer l'exe.
pub fn uninstall() {
    let data_dir = std::env::var("APPDATA")
        .map(|a| PathBuf::from(a).join(IDENTIFIER))
        .unwrap_or_else(|_| std::env::temp_dir().join("RagoOptimizer"));
    let history = Arc::new(History::load(data_dir.join("history.json")));
    let (mut ledger, existed) = Ledger::load(data_dir.join("applied.json"));
    if !existed {
        // jamais lancée depuis 1.1.6 : les réglages appliqués d'après l'historique, comme au démarrage de l'app
        ledger.import_history(&history.all());
    }
    let ids = targets(&ledger, Scope::All);
    if ids.is_empty() {
        return;
    }
    let resource_dir = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|d| d.join("resources")))
        .unwrap_or_else(|| PathBuf::from("resources"));
    // licence encore active : l'annulation des réglages Premium vient des scripts de cette version, sinon de la
    // copie gardée dans applied.json
    let premium = License::new().scripts_key().and_then(|key| catalog::premium(&key));
    let ledger = Arc::new(Mutex::new(ledger));
    crate::keep_undo(&ledger, premium.as_deref());
    let ctx = Context {
        app: None,
        history,
        adapter: system::probe(&resource_dir).adapter,
        resource_dir,
        logs_dir: data_dir.join("logs"),
        run_dir: data_dir.join("run"),
        backup_dir: data_dir.join("backup"),
        ledger,
        premium,
    };
    Runner::default().run_now(&ctx, &items(ids));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn premium_scope_keeps_free_tweaks() {
        let mut l = Ledger::default();
        l.set_applied("win_gamemode", None, true, true, vec![], 1);
        l.set_applied("net_old", None, true, true, vec![], 2);
        l.set_applied("net_new", None, true, true, vec![], 3);
        assert!(catalog::is_free("win_gamemode"));
        assert_eq!(targets(&l, Scope::Premium), vec!["net_new", "net_old"], "le dernier appliqué en premier");
        assert_eq!(targets(&l, Scope::All), vec!["net_new", "net_old", "win_gamemode"]);
        assert!(items(targets(&l, Scope::All)).iter().all(|i| i.undo && i.variant.is_none()));
    }

    #[test]
    fn closing_the_window_waits_for_the_reset() {
        let r = Reset::default();
        assert!(!r.hold_exit(), "rien en cours : la fenêtre se ferme");
        assert!(r.begin());
        assert!(!r.begin(), "une seule remise à la fois");
        assert!(r.hold_exit(), "remise en cours : l'app reste, cachée");
        assert!(r.end(), "puis quitte à la fin");
    }

    #[test]
    fn data_dir_and_uninstaller_match_the_app() {
        let conf: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        assert_eq!(conf["identifier"], IDENTIFIER);
        let hooks = conf["bundle"]["windows"]["nsis"]["installerHooks"].as_str().unwrap();
        assert_eq!(hooks, "installer/hooks.nsh");
        assert!(include_str!("../installer/hooks.nsh").contains(UNINSTALL_ARG));
    }
}
