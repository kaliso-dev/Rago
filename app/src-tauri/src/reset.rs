//! Remise à zéro des réglages, sans fenêtre ni bouton pour l'arrêter : tous les réglages appliqués quand la licence de
//! ce PC prend fin (déconnexion, abonnement terminé, remboursement, licence passée sur un autre PC), et à la
//! désinstallation (le désinstallateur lance l'exe avec `--reset-tweaks`, voir installer/hooks.nsh).
//!
//! La fin de licence est notée sur le disque (`Pending`) avant que la remise commence : fenêtre fermée, l'app finit la
//! remise cachée ; app tuée ou PC éteint, elle reprend au lancement suivant. Un réglage ne quitte applied.json qu'une
//! fois remis.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use crate::backup::{Applied, Ledger};
use crate::history::History;
use crate::license::License;
use crate::runner::{Context, RunItem, Runner};
use crate::{catalog, minecraft, system};

/// Argument passé par le désinstallateur.
pub const UNINSTALL_ARG: &str = "--reset-tweaks";
/// Identifiant de tauri.conf.json : nom du dossier des données dans %APPDATA%, comme app_data_dir() de Tauri. Lu par
/// build.rs : l'exe de test (gg.rago.optimizer.staging) remet ses propres réglages, jamais ceux du vrai.
pub const IDENTIFIER: &str = env!("RAGO_IDENTIFIER");

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Scope {
    /// fin de licence : tous les réglages, gratuits compris, que Rago Optimizer sait remettre tout seul
    LicenseEnd,
    /// seulement les réglages Premium de `LicenseEnd` : encore appliqués sans licence, ils disent que la licence a pris
    /// fin sans que ce soit noté (jeton effacé ou plus valable)
    Premium,
    /// désinstallation, « Tout annuler » : tous, même ceux qui n'ont pas d'annulation automatique
    All,
}

/// Réglages à remettre, le dernier appliqué en premier. Fin de licence : seulement ceux que Rago Optimizer sait remettre
/// (avec `bundle`, les scripts Premium encore ouverts au moment de la déconnexion). Les autres (aucune annulation
/// automatique, OptiFine sans copie à remettre) échoueraient à chaque fois : ils restent appliqués, annulables à la main
/// (Tout annuler, point de restauration).
pub fn targets(ledger: &Ledger, scope: Scope, bundle: Option<&catalog::Bundle>) -> Vec<String> {
    let mut ids: Vec<(&String, u64)> = ledger
        .tweaks
        .iter()
        .filter(|(id, a)| match scope {
            Scope::All => true,
            Scope::LicenseEnd => undoable(id, a, bundle),
            Scope::Premium => !catalog::is_free(id) && undoable(id, a, bundle),
        })
        .map(|(id, a)| (id, a.ts))
        .collect();
    ids.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(b.0)));
    ids.into_iter().map(|(id, _)| id.clone()).collect()
}

/// Dossier Minecraft où OptiFine a été appliqué : celui choisi dans l'interface (noté dans applied.json), sinon le
/// dossier habituel.
pub fn optifine_dir(a: Option<&Applied>) -> Option<PathBuf> {
    a.and_then(|a| a.dir.clone())
        .map(PathBuf::from)
        .or_else(|| std::env::var("APPDATA").ok().map(|d| PathBuf::from(d).join(".minecraft")))
}

/// Le moteur sait remettre ce réglage : sauvegarde de l'état d'avant, copie de l'annulation, annulation ou variante
/// de retour arrière (du plan gratuit, ou des scripts Premium de `bundle`).
fn undoable(id: &str, a: &Applied, bundle: Option<&catalog::Bundle>) -> bool {
    if id == "mc_optifine" {
        return optifine_dir(Some(a)).is_some_and(|d| minecraft::status(&d).backups > 0);
    }
    a.backup
        || a.undo.as_ref().is_some_and(|u| u.full.is_some())
        || catalog::undo_of(id, a.variant.as_deref(), bundle).is_some_and(|u| u.full.is_some())
        || catalog::revert_variant(id).is_some_and(|v| catalog::script(id, Some(&v), bundle).is_some())
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

/// Fin de licence pas encore remise, notée dans le dossier des données de cette app (l'exe de test a le sien) :
/// `reset-pending.json`. Écrite avant que le jeton soit effacé (déconnexion) ou dès que le serveur l'a refusé ; effacée
/// quand tout ce qui pouvait être remis l'a été, ou quand la licence revient.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pending {
    /// « signed_out », code du serveur (« revoked », « bound_to_other_device », « invalid_token »), ou « license_gone »
    pub why: String,
    pub at: u64,
}

impl Pending {
    pub fn new(why: &str) -> Self {
        Pending { why: why.into(), at: crate::history::now_ms() }
    }

    fn path(data_dir: &Path) -> PathBuf {
        data_dir.join("reset-pending.json")
    }

    /// Fichier présent mais illisible (coupé par une coupure de courant) : la remise est due quand même.
    pub fn load(data_dir: &Path) -> Option<Pending> {
        let bytes = fs::read(Self::path(data_dir)).ok()?;
        Some(serde_json::from_slice(&bytes).unwrap_or_else(|_| Pending { why: "unreadable".into(), at: 0 }))
    }

    /// Écrit à côté, sur le disque, puis remplace : une coupure de courant ne laisse pas un fichier vide.
    pub fn save(&self, data_dir: &Path) -> Result<(), String> {
        let _ = fs::create_dir_all(data_dir);
        let path = Self::path(data_dir);
        let tmp = path.with_extension("json.tmp");
        let json = serde_json::to_vec(self).map_err(|e| e.to_string())?;
        fs::File::create(&tmp)
            .and_then(|mut f| {
                use std::io::Write;
                f.write_all(&json)?;
                f.sync_all()
            })
            .and_then(|_| fs::rename(&tmp, &path))
            .map_err(|e| format!("Couldn't note the reset: {e}"))
    }

    pub fn remove(data_dir: &Path) {
        let _ = fs::remove_file(Self::path(data_dir));
    }
}

/// Fin de licence à remettre maintenant, d'après l'état de la licence (`License::status`). Licence active (reconnecté
/// entre-temps) : rien, et la fin notée est oubliée. Sinon la fin notée, ou une fin pas notée : plus de jeton valable
/// et des réglages Premium encore appliqués (jeton effacé à la main, copié depuis un autre PC, version d'avant). Un jeton
/// expiré hors ligne ne remet rien : le joueur paie peut-être encore, le serveur le dira au prochain rafraîchissement.
pub fn due(data_dir: &Path, license_state: &str, ledger: &Ledger) -> Option<Pending> {
    if license_state == "active" || license_state == "unconfigured" {
        Pending::remove(data_dir);
        return None;
    }
    if let Some(p) = Pending::load(data_dir) {
        return Some(p);
    }
    if license_state == "none" && !targets(ledger, Scope::Premium, None).is_empty() {
        let p = Pending::new("license_gone");
        let _ = p.save(data_dir);
        return Some(p);
    }
    None
}

#[derive(Default)]
struct Turn {
    running: bool,
    /// une demande est arrivée pendant la remise : un tour de plus avant de finir
    again: bool,
}

#[derive(Default)]
pub struct Reset {
    turn: Mutex<Turn>,
    /// fenêtre fermée pendant la remise : l'app reste cachée et quitte à la fin
    quit_after: AtomicBool,
    /// fin de licence notée (jeton effacé puis `Pending` écrit) contre sa lecture par la remise (`due`) : une remise
    /// qui lirait la licence encore active entre les deux oublierait la fin qui vient d'être notée
    note: Mutex<()>,
}

impl Reset {
    /// `f` sans croiser une fin de licence en train d'être notée (voir `note`).
    pub fn noting<T>(&self, f: impl FnOnce() -> T) -> T {
        let _n = self.note.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        f()
    }

    /// false si une remise tourne déjà : elle refait un tour pour cette demande avant de finir.
    pub fn begin(&self) -> bool {
        let mut t = self.turn.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if t.running {
            t.again = true;
            return false;
        }
        *t = Turn { running: true, again: false };
        true
    }

    /// Tour fini. None : une demande est arrivée entre-temps, refaire un tour. Sinon la remise est finie, et `true` si la
    /// fenêtre a été fermée entre-temps (l'app doit quitter).
    pub fn end(&self) -> Option<bool> {
        let mut t = self.turn.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if std::mem::take(&mut t.again) {
            return None;
        }
        t.running = false;
        Some(self.quit_after.swap(false, Ordering::SeqCst))
    }

    pub fn is_running(&self) -> bool {
        self.turn.lock().unwrap_or_else(std::sync::PoisonError::into_inner).running
    }

    /// Fenêtre fermée : true si l'app doit rester ouverte, cachée, jusqu'à la fin de la remise.
    pub fn hold_exit(&self) -> bool {
        let t = self.turn.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if !t.running {
            return false;
        }
        self.quit_after.store(true, Ordering::SeqCst);
        true
    }

    /// Fenêtre remontrée (Rago Optimizer relancée pendant la fin de la remise) : l'app ne quitte plus à la fin.
    pub fn keep_open(&self) {
        self.quit_after.store(false, Ordering::SeqCst);
    }
}

/// Désinstallation : remet tous les réglages appliqués sur ce PC, sans fenêtre. Le désinstallateur attend la fin
/// avant de retirer l'exe.
pub fn uninstall() {
    let data_dir = std::env::var("APPDATA")
        .map(|a| PathBuf::from(a).join(IDENTIFIER))
        .unwrap_or_else(|_| std::env::temp_dir().join("RagoOptimizer"));
    // comme au démarrage de l'app : aucun script ni fichier de l'app laissé en clair (avant, pendant le délai, à la fin)
    let clear_run = {
        let run_dir = data_dir.join("run");
        move || {
            let _ = std::fs::remove_dir_all(&run_dir);
            if let Some(dir) = crate::assets::fallback_root() {
                let _ = std::fs::remove_dir_all(dir);
            }
        }
    };
    clear_run();
    let (history, ledger) = load_for_uninstall(&data_dir);
    let ids = targets(&ledger, Scope::All, None);
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
        stop_when: None,
    };
    let runner = Arc::new(Runner::default());
    // un script bloqué ne doit jamais coincer la désinstallation : au bout du délai, le script en cours est arrêté
    // et le reste n'est pas remis (il reste dans applied.json, et le point de restauration reste possible)
    let watchdog = Arc::clone(&runner);
    let clear_late = clear_run.clone();
    std::thread::spawn(move || {
        std::thread::sleep(UNINSTALL_LIMIT);
        watchdog.cancel();
        std::thread::sleep(std::time::Duration::from_secs(30));
        clear_late();
        std::process::exit(2);
    });
    runner.run_now(&ctx, &items(ids));
    clear_run();
}

/// applied.json et l'historique comme l'app les voit à son lancement (lib.rs, setup) : réglages notés d'après
/// l'historique et réparations du lancement (repair::at_startup). Une version jamais
/// lancée avant d'être désinstallée garderait sinon un état d'avant à 0 pour CoalescingTimerInterval (PC passé par
/// l'ancien .bat) : la remise l'écrirait, écran bleu 0x7E au démarrage suivant, et plus d'app pour réparer (RAG-67).
fn load_for_uninstall(data_dir: &std::path::Path) -> (Arc<History>, Ledger) {
    let history = Arc::new(History::load(data_dir.join("history.json")));
    let (mut ledger, existed) = Ledger::load(data_dir.join("applied.json"));
    if !existed {
        // jamais lancée depuis 1.1.6 : les réglages appliqués d'après l'historique, comme au démarrage de l'app
        ledger.import_history(&history.all());
    }
    crate::repair::at_startup(&crate::backup::Sys::new(data_dir.join("backup")), &mut ledger, &data_dir.join("logs"));
    (history, ledger)
}

/// Durée maximale de la remise à la désinstallation. Une remise complète prend d'habitude une à cinq minutes.
pub const UNINSTALL_LIMIT: std::time::Duration = std::time::Duration::from_secs(15 * 60);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn license_end_puts_back_free_tweaks_too() {
        let mut l = Ledger::default();
        l.set_applied("win_gamemode", None, true, true, vec![], 1);
        l.set_applied("net_old", None, true, true, vec![], 2);
        l.set_applied("net_new", None, true, true, vec![], 3);
        assert!(catalog::is_free("win_gamemode"));
        assert_eq!(targets(&l, Scope::LicenseEnd, None), vec!["net_new", "net_old", "win_gamemode"], "le dernier appliqué en premier");
        assert_eq!(targets(&l, Scope::Premium, None), vec!["net_new", "net_old"]);
        assert_eq!(targets(&l, Scope::All, None), vec!["net_new", "net_old", "win_gamemode"]);
        assert!(items(targets(&l, Scope::All, None)).iter().all(|i| i.undo && i.variant.is_none()));
    }

    #[test]
    fn license_end_skips_what_cannot_be_put_back() {
        let mut l = Ledger::default();
        // appliqué avant 1.1.6, sans copie de son annulation : il échouerait à chaque fois
        l.set_applied("net_legacy", None, true, false, vec![], 1);
        l.set_applied("net_saved", None, true, true, vec![], 2);
        assert_eq!(targets(&l, Scope::LicenseEnd, None), vec!["net_saved"]);
        assert_eq!(targets(&l, Scope::All, None), vec!["net_saved", "net_legacy"], "Tout annuler et la désinstallation essaient tout");
        l.tweaks.get_mut("net_legacy").unwrap().undo = Some(crate::backup::Undo { full: Some("reg add x".into()), ..Default::default() });
        assert_eq!(targets(&l, Scope::LicenseEnd, None), vec!["net_saved", "net_legacy"], "copie de l'annulation gardée : il est remis");
    }

    /// Les 15 réglages sans annulation automatique (journal d'une déconnexion de la 1.1.13) ne sont pas lancés par la
    /// remise de fin de licence : ils n'y feraient qu'afficher une erreur. Ils restent appliqués (point de restauration).
    #[test]
    fn tweaks_without_automatic_undo_are_left_alone() {
        let mut l = Ledger::default();
        let mut checked = 0;
        for (n, id) in ["exp_iolatency", "in_driver", "amd_logging", "usb_msi", "pow_idle", "net_msi"].into_iter().enumerate() {
            l.set_applied(id, None, true, false, vec![], n as u64);
            if catalog::undo_of(id, None, None).is_some_and(|u| u.full.is_some()) || catalog::revert_variant(id).is_some() {
                continue;
            }
            assert!(targets(&l, Scope::LicenseEnd, None).iter().all(|t| t != id), "{id}");
            checked += 1;
        }
        assert!(checked >= 4, "{checked}");
    }

    /// OptiFine est remis dans le dossier où il a été appliqué, noté dans applied.json.
    #[test]
    fn optifine_is_put_back_where_it_was_applied() {
        let dir = std::env::temp_dir().join(format!("rago-test-mc-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let mut l = Ledger::default();
        l.set_applied("mc_optifine", None, true, true, vec![], 1);
        l.tweaks.get_mut("mc_optifine").unwrap().dir = Some(dir.to_string_lossy().into_owned());
        assert_eq!(optifine_dir(l.tweaks.get("mc_optifine")), Some(dir.clone()));
        assert!(targets(&l, Scope::LicenseEnd, None).is_empty(), "aucune copie d'optionsof.txt : rien à remettre");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("optionsof.txt"), "ofFastRender:true\n").unwrap();
        minecraft::apply(&dir, &std::collections::BTreeMap::from([("ofFastRender".to_string(), "false".to_string())]), 1).unwrap();
        assert_eq!(targets(&l, Scope::LicenseEnd, None), vec!["mc_optifine"]);
        let _ = fs::remove_dir_all(&dir);
    }

    /// La fin de licence notée survit à l'app tuée ; elle est oubliée quand la licence revient. Pas notée : seulement des
    /// réglages Premium encore appliqués sans jeton la font remettre (un joueur du plan gratuit garde les siens).
    #[test]
    fn license_end_is_noted_and_resumed() {
        let dir = std::env::temp_dir().join(format!("rago-test-pending-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let mut free = Ledger::default();
        free.set_applied("win_gamemode", None, true, true, vec![], 1);
        assert_eq!(due(&dir, "none", &free), None, "plan gratuit : ses réglages restent");
        assert_eq!(due(&dir, "expired", &Ledger::default()), None);

        Pending::new("signed_out").save(&dir).unwrap();
        assert_eq!(due(&dir, "none", &free).map(|p| p.why), Some("signed_out".into()), "reprise au lancement suivant");
        assert_eq!(due(&dir, "expired", &free).map(|p| p.why), Some("signed_out".into()));
        assert_eq!(due(&dir, "active", &free), None, "reconnecté : rien à remettre");
        assert_eq!(Pending::load(&dir), None, "et la fin notée est oubliée");

        let mut premium = Ledger::default();
        premium.set_applied("net_x", None, true, true, vec![], 1);
        assert_eq!(due(&dir, "expired", &premium), None, "jeton expiré hors ligne : le serveur le dira");
        assert_eq!(due(&dir, "none", &premium).map(|p| p.why), Some("license_gone".into()), "jeton disparu");
        assert!(Pending::load(&dir).is_some(), "notée aussi");

        fs::write(dir.join("reset-pending.json"), "{").unwrap();
        assert_eq!(due(&dir, "none", &free).map(|p| p.why), Some("unreadable".into()), "fichier coupé : la remise est due");
        Pending::remove(&dir);
        assert_eq!(Pending::load(&dir), None);
        let _ = fs::remove_dir_all(&dir);
    }

    /// Désinstallée sans avoir été lancée depuis la mise à jour : applied.json de 1.1.9 tel quel, état d'avant à 0 pour
    /// CoalescingTimerInterval (ancien .bat). La remise de la désinstallation ne doit pas réécrire ce 0 (RAG-67).
    #[test]
    fn uninstall_never_puts_the_crashing_zero_back() {
        use crate::backup::{Saved, SavedEntry};
        let dir = std::env::temp_dir().join(format!("rago-test-uninstall-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let zero = || Saved::Value { kind: 4, data: "00000000".into() };
        let mut old = Ledger::load(dir.join("applied.json")).0;
        let probe = crate::repair::timer_probes()[0].clone();
        old.saved.push((probe.id(), SavedEntry { probe: probe.clone(), before: zero(), after: Some(zero()) }));
        old.set_applied("pow_main", None, true, true, vec![probe.id()], 1);
        old.save();
        assert_eq!(Ledger::load(dir.join("applied.json")).0.saved[0].1.before, zero(), "fichier de 1.1.9");
        let (_, ledger) = load_for_uninstall(&dir);
        assert!(ledger.tweaks.contains_key("pow_main"));
        assert!(ledger.saved.iter().all(|(_, e)| !crate::repair::is_zero(&e.before)), "{:?}", ledger.saved);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn uninstaller_hook_skips_updates_and_is_bounded() {
        let hooks = include_str!("../installer/hooks.nsh");
        assert!(hooks.contains("$UpdateMode <> 1"), "pas pendant une mise à jour");
        assert!(hooks.contains("$EXEDIR != $INSTDIR"), "pas quand un installateur lance le désinstallateur en place");
        assert!(hooks.contains("ExecWait"));
        assert!(UNINSTALL_LIMIT.as_secs() <= 20 * 60, "la désinstallation ne doit jamais rester bloquée");
        // m3 : … sauf si le joueur fait effacer les données de l'app (applied.json, sauvegardes), même pendant une mise
        // à jour lancée par l'installateur. /UPDATE reste la condition extérieure : Tauri n'efface rien avec /UPDATE.
        let at = |s: &str| hooks.find(s).unwrap_or_else(|| panic!("« {s} » absent de hooks.nsh"));
        let (update, in_place, data) = (at("${If} $UpdateMode <> 1"), at("${If} $EXEDIR != $INSTDIR"), at("${OrIf} $DeleteAppDataCheckboxState = 1"));
        assert!(update < in_place && in_place < data && data < at("ExecWait"));
        assert_eq!(hooks.matches("ExecWait").count(), 1, "une seule remise");
        assert_eq!(hooks.matches("${If}").count(), hooks.matches("${EndIf}").count());
    }

    /// m3 : le crochet lit `$DeleteAppDataCheckboxState`, variable du modèle NSIS de Tauri. Vérifié dans la CLI installée
    /// par npm (node_modules ; en CI, `npm ci` passe avant les tests) : la variable existe sous ce nom, la page de
    /// confirmation la remplit en la quittant (un.ConfirmLeave), cette page passe avant celle qui lance la section
    /// Uninstall, et dans la section le crochet passe avant l'effacement des données. Une CLI qui changerait cela fait
    /// échouer ce test : revoir alors installer/hooks.nsh.
    #[test]
    fn delete_app_data_checkbox_is_read_before_the_hook() {
        let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../node_modules/@tauri-apps");
        let clis: Vec<PathBuf> = std::fs::read_dir(&dir)
            .into_iter()
            .flatten()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().starts_with("cli-"))
            .flat_map(|e| std::fs::read_dir(e.path()).into_iter().flatten().flatten())
            .map(|e| e.path())
            .filter(|p| p.extension().is_some_and(|x| x == "node"))
            .collect();
        if clis.is_empty() {
            eprintln!("CLI de Tauri absente de node_modules (npm ci pas lancé) : modèle NSIS non vérifié");
            return;
        }
        for cli in clis {
            let bin = std::fs::read(&cli).unwrap();
            let find = |hay: &[u8], pat: &str| hay.windows(pat.len()).position(|w| w == pat.as_bytes());
            let start = find(&bin, "Var DeleteAppDataCheckboxState")
                .unwrap_or_else(|| panic!("{} : variable absente du modèle NSIS, revoir installer/hooks.nsh", cli.display()));
            let nsi = &bin[start..(start + 64 * 1024).min(bin.len())];
            let at = |pat: &str| find(nsi, pat).unwrap_or_else(|| panic!("{} : « {pat} » absent du modèle NSIS", cli.display()));
            let order = [
                at("!define MUI_PAGE_CUSTOMFUNCTION_LEAVE un.ConfirmLeave"),
                at("${BM_GETCHECK} 0 0 $DeleteAppDataCheckboxState"),
                at("!insertmacro MUI_UNPAGE_CONFIRM"),
                at("!insertmacro MUI_UNPAGE_INSTFILES"),
                at("Section Uninstall"),
                at("!insertmacro NSIS_HOOK_PREUNINSTALL"),
                at("${If} $DeleteAppDataCheckboxState = 1"),
                at("RmDir /r \"$APPDATA\\${BUNDLEID}\""),
            ];
            assert!(order.windows(2).all(|w| w[0] < w[1]), "{} : {order:?}", cli.display());
        }
    }

    #[test]
    fn closing_the_window_waits_for_the_reset() {
        let r = Reset::default();
        assert!(!r.hold_exit(), "rien en cours : la fenêtre se ferme");
        assert!(r.begin());
        assert!(r.is_running());
        assert!(!r.begin(), "une seule remise à la fois");
        assert_eq!(r.end(), None, "une demande arrivée pendant la remise : un tour de plus");
        assert!(r.hold_exit(), "remise en cours : l'app reste, cachée");
        assert_eq!(r.end(), Some(true), "puis quitte à la fin");
        assert!(!r.is_running());
        assert!(r.begin());
        assert!(r.hold_exit());
        r.keep_open();
        assert_eq!(r.end(), Some(false), "fenêtre remontrée par un nouveau lancement : l'app reste ouverte");
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
