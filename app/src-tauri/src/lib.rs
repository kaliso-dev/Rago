mod account;
mod assets;
mod backup;
mod catalog;
mod history;
mod instance;
mod license;
mod minecraft;
mod repair;
mod reset;
mod runner;
mod seal;
mod shell;
mod stats;
mod system;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

use account::Account;
use backup::Ledger;
use history::History;
use license::License;
use reset::Reset;
use runner::{Context, RunItem, Runner};
use system::SystemInfo;

struct AppState {
    runner: Arc<Runner>,
    history: Arc<History>,
    ledger: Arc<Mutex<Ledger>>,
    license: Arc<License>,
    account: Arc<Account>,
    reset: Arc<Reset>,
    system: Arc<Mutex<Option<SystemInfo>>>,
    stats: stats::Sampler,
    resource_dir: PathBuf,
    data_dir: PathBuf,
    /// la réparation de ce lancement a supprimé une valeur (repair::at_startup) : l'interface le dit une fois
    repaired: AtomicBool,
    /// déconnexion lancée par ce processus (`license_sign_out`) : `Some` dès la demande, avec la remise une fois sa
    /// liste faite. Une seconde demande (double clic, interface rechargée) ne relance rien et retrouve celle en cours.
    signing_out: Mutex<Option<Option<SignOutStart>>>,
}

/// Déconnexion demandée et pas encore finie (`license_sign_out`), notée dans le dossier des données de cette app (le
/// jeton, lui, est commun à l'exe de test et au vrai) : une remise coupée (app tuée, PC éteint) reprend au lancement
/// suivant, avant la déconnexion. Effacée une fois le jeton effacé.
fn sign_out_marker(state: &AppState) -> PathBuf {
    state.data_dir.join("sign-out-pending")
}

fn probe_cached(cache: &Mutex<Option<SystemInfo>>, resource_dir: &std::path::Path, refresh: bool) -> SystemInfo {
    let mut guard = cache.lock().unwrap();
    if refresh || guard.is_none() {
        *guard = Some(system::probe(resource_dir));
    }
    guard.clone().unwrap()
}

impl AppState {
    fn system(&self, refresh: bool) -> SystemInfo {
        probe_cached(&self.system, &self.resource_dir, refresh)
    }

    /// `app` : fenêtre qui suit le lot (None : remise à zéro, rien à l'écran).
    fn context(&self, app: Option<AppHandle>, premium: Option<Arc<catalog::Bundle>>) -> Context {
        Context {
            app: app.map(|app| {
                Arc::new(move |event: &str, payload: serde_json::Value| {
                    let _ = app.emit(event, payload);
                }) as runner::Emit
            }),
            history: Arc::clone(&self.history),
            resource_dir: self.resource_dir.clone(),
            logs_dir: self.data_dir.join("logs"),
            run_dir: self.data_dir.join("run"),
            backup_dir: self.data_dir.join("backup"),
            adapter: self.system(false).adapter,
            ledger: Arc::clone(&self.ledger),
            premium,
            stop_when: None,
        }
    }
}

/// Fin de Premium sur ce PC (le serveur a dit que sa licence est arrêtée : abonnement terminé, remboursement, licence
/// coupée ; ou réglage Premium resté après une déconnexion) et des réglages Premium encore appliqués : ils sont remis en
/// arrière-plan, sans fenêtre ni bouton pour arrêter. Les réglages gratuits restent : le joueur garde le plan gratuit.
/// La déconnexion elle-même remet tous les réglages avant d'effacer le jeton (`license_sign_out`). L'interface n'en voit que la fin (`reset:done`). Rien n'est remis sur un doute
/// (`license::premium_ended`) : jeton expiré hors ligne, jeton effacé parce qu'il ne se lit plus, que sa signature ne
/// passe plus (clé changée) ou que le PC a changé, refus ambigu du serveur. Le joueur est seulement déconnecté. La
/// licence revient pendant la remise (reconnexion) : elle s'arrête après le réglage en cours, les suivants restent
/// appliqués.
fn reset_if_unlicensed(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        let state = app.state::<AppState>();
        if !state.license.ended() {
            return;
        }
        let ids = reset::targets(&state.ledger.lock().unwrap(), reset::Scope::Premium);
        if ids.is_empty() || !state.reset.begin() {
            return;
        }
        let lic = Arc::clone(&state.license);
        let ctx = Context { stop_when: Some(Arc::new(move || lic.status().state != "none")), ..state.context(None, None) };
        let (ok, failed) = Runner::default().run_now(&ctx, &reset::items(ids));
        let quit = state.reset.end();
        let _ = app.emit("reset:done", reset::Done { ok, failed });
        if quit {
            app.exit(0);
        }
    });
}

#[tauri::command]
async fn get_system_info(state: State<'_, AppState>, refresh: Option<bool>) -> Result<SystemInfo, String> {
    // la sonde lance PowerShell : elle tourne hors du thread de l'interface
    let cache = Arc::clone(&state.system);
    let resource_dir = state.resource_dir.clone();
    let refresh = refresh.unwrap_or(false);
    tauri::async_runtime::spawn_blocking(move || probe_cached(&cache, &resource_dir, refresh))
        .await
        .map_err(|e| e.to_string())
}

/// Garde dans le registre des réglages l'annulation de ceux qui n'en ont pas encore (appliqués avant 1.1.6, ou
/// avant l'arrivée de la clé) : elle reste utilisable après une déconnexion ou une fin de licence.
pub(crate) fn keep_undo(ledger: &Mutex<backup::Ledger>, bundle: Option<&catalog::Bundle>) {
    let mut l = ledger.lock().unwrap();
    if l.fill_undo(&|id, v| catalog::undo_of(id, v, bundle)) {
        l.save();
    }
}

#[tauri::command]
fn run_tweaks(app: AppHandle, state: State<'_, AppState>, items: Vec<RunItem>) -> Result<String, String> {
    if items.is_empty() {
        return Err("No tweak selected".into());
    }
    // déconnexion en cours : rien d'autre ne tourne avant que tous les réglages soient remis
    if sign_out_marker(&state).exists() {
        return Err("signing_out".into());
    }
    let premium = state.license.status().state == "active";
    // remettre l'état d'avant reste possible sans licence
    let applying = || items.iter().filter(|it| !it.undo);
    if let Some(it) = applying().find(|it| !catalog::allowed(&it.id, it.variant.as_deref(), premium)) {
        return Err(format!("premium_required:{}", it.id));
    }
    let needs_premium = applying().any(|it| !catalog::is_plain(&it.id, it.variant.as_deref()) && !runner::is_native(&it.id));
    // ouverts dès qu'une licence active a la clé : l'annulation des réglages Premium s'y trouve aussi
    let bundle = state.license.scripts_key().and_then(|key| catalog::premium(&key));
    if needs_premium && bundle.is_none() {
        return Err("premium_scripts_unavailable".into());
    }
    keep_undo(&state.ledger, bundle.as_deref());
    state.runner.start(state.context(Some(app), bundle), items)
}

/// Réglages appliqués, et ceux dont Windows a changé une valeur depuis.
#[tauri::command]
async fn get_applied(state: State<'_, AppState>) -> Result<Vec<backup::AppliedView>, String> {
    let ledger = Arc::clone(&state.ledger);
    let dir = state.data_dir.join("backup");
    let lic = Arc::clone(&state.license);
    tauri::async_runtime::spawn_blocking(move || {
        keep_undo(&ledger, lic.scripts_key().and_then(|key| catalog::premium(&key)).as_deref());
        let sys = backup::Sys::new(dir);
        let l = ledger.lock().unwrap();
        l.views(&|p| sys.read(p))
    })
    .await
    .map_err(|e| e.to_string())
}

/// « Tout annuler » (tableau de bord) : les réglages à remettre, dans l'ordre de la remise à zéro de la
/// désinstallation (le dernier appliqué en premier). L'interface les montre pour confirmation puis les lance comme
/// annulations : même moteur, même sauvegarde, même ordre.
#[tauri::command]
fn undo_all_plan(state: State<'_, AppState>) -> Vec<String> {
    reset::targets(&state.ledger.lock().unwrap(), reset::Scope::All)
}

/// Confirmation de déconnexion : les réglages que la déconnexion remettra, tous (Premium et gratuits), dans l'ordre de
/// la remise (même liste que `license_sign_out`). L'annulation des réglages Premium est d'abord gardée, tant que la
/// licence est là (comme `get_applied`).
#[tauri::command]
async fn sign_out_plan(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let ledger = Arc::clone(&state.ledger);
    let lic = Arc::clone(&state.license);
    tauri::async_runtime::spawn_blocking(move || {
        keep_undo(&ledger, lic.scripts_key().and_then(|key| catalog::premium(&key)).as_deref());
        let l = ledger.lock().unwrap();
        reset::targets(&l, reset::Scope::All)
    })
    .await
    .map_err(|e| e.to_string())
}

/// Vrai une seule fois, au lancement où la réparation a supprimé une valeur à 0 (RAG-67) : l'interface demande alors de
/// redémarrer le PC (« Redémarrer », pas « Arrêter » : avec le démarrage rapide de Windows, « Arrêter » garde le noyau
/// en mémoire et la valeur n'est relue qu'au redémarrage suivant). Rien n'est gardé sur disque : le message ne revient
/// pas aux lancements suivants, où il n'y a plus rien à réparer.
#[tauri::command]
fn take_repair_notice(state: State<'_, AppState>) -> bool {
    state.repaired.swap(false, Ordering::SeqCst)
}

#[tauri::command]
fn cancel_run(state: State<'_, AppState>) {
    state.runner.cancel();
}

#[tauri::command]
fn is_running(state: State<'_, AppState>) -> bool {
    state.runner.is_running()
}

#[tauri::command]
fn get_history(state: State<'_, AppState>) -> Vec<history::Entry> {
    state.history.all()
}

#[tauri::command]
fn clear_history(state: State<'_, AppState>) {
    state.history.clear();
}

/// Usage RAM, processeur et carte graphique en direct, demandé chaque seconde par le tableau de bord.
#[tauri::command]
fn live_stats(state: State<'_, AppState>) -> stats::LiveStats {
    state.stats.latest()
}

fn minecraft_dir(dir: Option<String>) -> Result<PathBuf, String> {
    dir.map(PathBuf::from)
        .or_else(|| std::env::var("APPDATA").ok().map(|a| PathBuf::from(a).join(".minecraft")))
        .ok_or_else(|| "Minecraft folder not set".to_string())
}

#[tauri::command]
fn minecraft_status(dir: Option<String>) -> Result<minecraft::Status, String> {
    Ok(minecraft::status(&minecraft_dir(dir)?))
}

#[tauri::command]
fn minecraft_restore(dir: Option<String>) -> Result<String, String> {
    minecraft::restore_latest(&minecraft_dir(dir)?)
}

#[tauri::command]
fn restart_pc() -> Result<(), String> {
    shell::hidden("shutdown.exe")
        .args(["/r", "/t", "5", "/c", "Rago Optimizer: restarting to apply your tweaks"])
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Gestionnaire des tâches de Windows, depuis l'utilisation en direct : voir quelle appli prend la RAM, le processeur
/// ou la carte graphique, et la fermer soi-même. Rago ne ferme aucun processus et ne vide pas la RAM de force.
#[tauri::command]
fn open_task_manager() -> Result<(), String> {
    std::process::Command::new("taskmgr.exe").spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Dossiers de l'app seulement : l'app tourne en administrateur, et explorer.exe lancé sur un chemin quelconque ouvrirait
/// aussi un programme.
#[tauri::command]
fn open_folder(state: State<'_, AppState>, kind: String) -> Result<(), String> {
    let path = match kind.as_str() {
        "logs" => state.data_dir.join("logs"),
        "resources" => state.resource_dir.clone(),
        "data" => state.data_dir.clone(),
        _ => return Err("Unknown folder".into()),
    };
    runner::ensure_dir(&path);
    std::process::Command::new("explorer.exe").arg(&path).spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn license_status(state: State<'_, AppState>) -> Result<license::Status, String> {
    let lic = Arc::clone(&state.license);
    tauri::async_runtime::spawn_blocking(move || lic.status()).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn license_login(state: State<'_, AppState>, email: String, password: String) -> Result<license::LoginResult, license::ApiError> {
    let lic = Arc::clone(&state.license);
    tauri::async_runtime::spawn_blocking(move || lic.login(email.trim(), &password))
        .await
        .map_err(|_| license::ApiError::from("server_error"))?
}

#[tauri::command]
async fn license_activate(state: State<'_, AppState>) -> Result<license::Status, license::ApiError> {
    let lic = Arc::clone(&state.license);
    tauri::async_runtime::spawn_blocking(move || lic.activate())
        .await
        .map_err(|_| license::ApiError::from("server_error"))?
}

#[tauri::command]
async fn license_refresh(app: AppHandle, state: State<'_, AppState>) -> Result<license::Status, license::ApiError> {
    let lic = Arc::clone(&state.license);
    let r = tauri::async_runtime::spawn_blocking(move || lic.refresh())
        .await
        .map_err(|_| license::ApiError::from("server_error"))?;
    // abonnement terminé, remboursement, licence révoquée : le jeton vient d'être effacé et la fin notée
    reset_if_unlicensed(&app);
    r
}

/// Remise de la déconnexion qui commence : l'interface montre ces réglages et suit le lot (`run:item`, `run:done`).
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SignOutStart {
    run_id: String,
    ids: Vec<String>,
}

/// Déconnexion (Paramètres) : tous les réglages appliqués sur ce PC, Premium et gratuits, sont d'abord remis comme
/// avant, puis le jeton est effacé. Rien ne l'arrête : le lot tourne hors de `state.runner` (`cancel_run` ne l'atteint
/// pas) et l'interface ne montre pas de bouton Stop. Tant que la licence est là, l'annulation des réglages Premium vient
/// des scripts de cette version.
///
/// La demande est notée sur disque avant de commencer (`sign_out_marker`) : fenêtre fermée, la remise continue
/// cachée et l'app quitte à la fin (`Reset::hold_exit`) ; app tuée ou PC éteint, l'interface la relance au lancement
/// suivant (`sign_out_pending`), et aucun lot ne part avant (`run_tweaks`). Une remise de fin de Premium en cours passe
/// d'abord. L'interface reçoit `signout:start` (réglages remis, dans l'ordre), suit le lot, puis `signout:done`.
/// `mc_dir` : dossier Minecraft choisi dans l'interface, où OptiFine est remis (sinon le dossier habituel).
#[tauri::command]
fn license_sign_out(app: AppHandle, state: State<'_, AppState>, mc_dir: Option<String>) -> Result<(), String> {
    let mut current = state.signing_out.lock().unwrap();
    if let Some(started) = current.as_ref() {
        // déjà en cours : l'interface (rechargée) reprend le suivi de la même remise
        if let Some(start) = started {
            let _ = app.emit("signout:start", start.clone());
        }
        return Ok(());
    }
    if state.runner.is_running() {
        return Err("An optimization is already running".into());
    }
    runner::ensure_dir(&state.data_dir);
    std::fs::write(sign_out_marker(&state), history::now_ms().to_string()).map_err(|e| format!("Couldn't start signing out: {e}"))?;
    *current = Some(None);
    drop(current);
    std::thread::spawn(move || {
        let state = app.state::<AppState>();
        while !state.reset.begin() {
            std::thread::sleep(std::time::Duration::from_millis(250));
        }
        let bundle = state.license.scripts_key().and_then(|key| catalog::premium(&key));
        keep_undo(&state.ledger, bundle.as_deref());
        let ids = reset::targets(&state.ledger.lock().unwrap(), reset::Scope::All);
        let (mut ok, mut failed) = (0, 0);
        if !ids.is_empty() {
            let run_id = format!("signout-{}", history::now_ms());
            let start = SignOutStart { run_id: run_id.clone(), ids: ids.clone() };
            *state.signing_out.lock().unwrap() = Some(Some(start.clone()));
            let _ = app.emit("signout:start", start);
            let ctx = state.context(Some(app.clone()), bundle);
            let mut items = reset::items(ids);
            for it in items.iter_mut().filter(|it| it.id == "mc_optifine") {
                it.params = mc_dir.as_ref().map(|dir| serde_json::json!({ "dir": dir }));
            }
            (ok, failed) = Runner::default().run_as(&ctx, &run_id, &items);
        }
        // un réglage qui n'a pas pu être remis reste noté appliqué : la remise de fin de Premium le reprend au lancement
        // suivant s'il est Premium, « Tout annuler » reste possible pour les autres
        state.license.sign_out();
        let _ = std::fs::remove_file(sign_out_marker(&state));
        *state.signing_out.lock().unwrap() = None;
        let quit = state.reset.end();
        let _ = app.emit("signout:done", reset::Done { ok, failed });
        if quit {
            app.exit(0);
        }
    });
    Ok(())
}

/// Déconnexion demandée et pas finie (app fermée de force pendant sa remise) : l'interface la relance au lancement.
#[tauri::command]
fn sign_out_pending(state: State<'_, AppState>) -> bool {
    sign_out_marker(&state).exists()
}

// ---------- compte : nom public, photo, avis ----------

async fn with_account<T: Send + 'static>(
    state: &AppState,
    f: impl FnOnce(&Account, &License) -> Result<T, license::ApiError> + Send + 'static,
) -> Result<T, license::ApiError> {
    let (acc, lic) = (Arc::clone(&state.account), Arc::clone(&state.license));
    tauri::async_runtime::spawn_blocking(move || f(&acc, &lic))
        .await
        .map_err(|_| license::ApiError::from("server_error"))?
}

#[tauri::command]
async fn account_me(state: State<'_, AppState>) -> Result<account::AccountState, license::ApiError> {
    with_account(&state, |acc, lic| acc.me(lic)).await
}

#[tauri::command]
async fn account_login(state: State<'_, AppState>, email: String, password: String) -> Result<account::AccountState, license::ApiError> {
    with_account(&state, move |acc, _| acc.login(email.trim(), &password)).await
}

#[tauri::command]
async fn account_sign_out(state: State<'_, AppState>) -> Result<(), license::ApiError> {
    with_account(&state, |acc, _| {
        acc.sign_out();
        Ok(())
    })
    .await
}

#[tauri::command]
async fn account_save_review(
    state: State<'_, AppState>,
    rating: u8,
    comment: String,
    name: Option<String>,
) -> Result<account::AccountState, license::ApiError> {
    with_account(&state, move |acc, lic| acc.save_review(lic, rating, &comment, name.as_deref())).await
}

#[tauri::command]
async fn account_set_name(state: State<'_, AppState>, name: String) -> Result<account::AccountState, license::ApiError> {
    with_account(&state, move |acc, lic| acc.set_name(lic, &name)).await
}

#[tauri::command]
async fn account_set_photo(state: State<'_, AppState>, data: String) -> Result<account::AccountState, license::ApiError> {
    with_account(&state, move |acc, lic| acc.set_photo(lic, &data)).await
}

#[tauri::command]
async fn account_delete_review(state: State<'_, AppState>) -> Result<account::AccountState, license::ApiError> {
    with_account(&state, |acc, lic| acc.delete_review(lic)).await
}

#[tauri::command]
async fn account_remove_photo(state: State<'_, AppState>) -> Result<account::AccountState, license::ApiError> {
    with_account(&state, |acc, lic| acc.remove_photo(lic)).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // une seule Rago Optimizer à la fois (instance.rs) : le verrou est gardé jusqu'à la fin du processus
    let uninstall = std::env::args_os().skip(1).any(|a| a == reset::UNINSTALL_ARG);
    let lock = instance::acquire(if uninstall { instance::UNINSTALL_WAIT } else { std::time::Duration::ZERO });
    if !lock.starts(uninstall) {
        // une autre fenêtre est ouverte : elle passe au premier plan, celle-ci ne charge rien
        instance::show_other();
        return;
    }
    // lancé par le désinstallateur : remise à zéro sans fenêtre, puis on quitte
    if uninstall {
        reset::uninstall();
        return;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let resource_dir = app
                .path()
                .resource_dir()
                .map(|d| d.join("resources"))
                .unwrap_or_else(|_| PathBuf::from("resources"));
            let data_dir = app.path().app_data_dir().unwrap_or_else(|_| std::env::temp_dir().join("RagoOptimizer"));
            runner::ensure_dir(&data_dir);
            // Les scripts sont écrits en clair dans run\ le temps que cmd.exe les exécute (Windows a besoin du
            // fichier pour les lancer), puis effacés aussitôt. Au cas où un arrêt brutal en aurait laissé un, on
            // vide le dossier au démarrage : aucune commande d'optimisation ne reste sur le disque.
            let _ = std::fs::remove_dir_all(data_dir.join("run"));
            if let Some(dir) = assets::fallback_root() {
                let _ = std::fs::remove_dir_all(dir);
            }
            let history = Arc::new(History::load(data_dir.join("history.json")));
            let (mut ledger, existed) = Ledger::load(data_dir.join("applied.json"));
            if !existed {
                // première version avec l'état des réglages : ceux déjà appliqués d'après l'historique
                ledger.import_history(&history.all());
                ledger.save();
            } else if ledger.needs_migration() {
                // fichier d'une version d'avant le chiffrement au repos : on le réécrit chiffré
                ledger.save();
            }
            // suppression des applis du Store lancée comme action ponctuelle par une version d'avant : notée
            // appliquée, pour pouvoir l'éteindre et récupérer les applis
            if ledger.import_former_actions(&history.all(), catalog::FORMER_ACTIONS) {
                ledger.save();
            }
            // ce qu'une version précédente a laissé et qui fait planter le PC (RAG-67), sans attendre le joueur
            let removed = repair::at_startup(&backup::Sys::new(data_dir.join("backup")), &mut ledger, &data_dir.join("logs"));
            app.manage(AppState {
                runner: Arc::new(Runner::default()),
                history,
                ledger: Arc::new(Mutex::new(ledger)),
                license: Arc::new(License::new()),
                account: Arc::new(Account::new()),
                reset: Arc::new(Reset::default()),
                system: Arc::new(Mutex::new(None)),
                stats: stats::Sampler::default(),
                resource_dir,
                data_dir,
                repaired: AtomicBool::new(!removed.is_empty()),
                signing_out: Mutex::new(None),
            });
            // fin de Premium notée depuis le dernier lancement, ou remise coupée en cours de route : elle reprend ici
            reset_if_unlicensed(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // remise à zéro en cours : la fenêtre se cache et l'app quitte quand la remise est finie
                if window.try_state::<AppState>().is_some_and(|s| s.reset.hold_exit()) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            run_tweaks,
            cancel_run,
            is_running,
            get_history,
            clear_history,
            get_applied,
            undo_all_plan,
            sign_out_plan,
            sign_out_pending,
            take_repair_notice,
            live_stats,
            open_task_manager,
            minecraft_status,
            minecraft_restore,
            restart_pc,
            open_folder,
            license_status,
            license_login,
            license_activate,
            license_refresh,
            license_sign_out,
            account_me,
            account_login,
            account_sign_out,
            account_save_review,
            account_delete_review,
            account_set_name,
            account_set_photo,
            account_remove_photo,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Rago Optimizer");
}
