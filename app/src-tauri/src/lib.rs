mod account;
mod backup;
mod catalog;
mod history;
mod license;
mod minecraft;
mod runner;
mod seal;
mod shell;
mod stats;
mod system;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

use account::Account;
use backup::Ledger;
use history::History;
use license::License;
use runner::{Context, RunItem, Runner};
use system::SystemInfo;

struct AppState {
    runner: Arc<Runner>,
    history: Arc<History>,
    ledger: Arc<Mutex<Ledger>>,
    license: Arc<License>,
    account: Arc<Account>,
    system: Arc<Mutex<Option<SystemInfo>>>,
    stats: stats::Sampler,
    resource_dir: PathBuf,
    data_dir: PathBuf,
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
fn keep_undo(ledger: &Mutex<backup::Ledger>, bundle: Option<&catalog::Bundle>) {
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
    let adapter = state.system(false).adapter;
    let ctx = Context {
        app,
        history: Arc::clone(&state.history),
        resource_dir: state.resource_dir.clone(),
        logs_dir: state.data_dir.join("logs"),
        run_dir: state.data_dir.join("run"),
        backup_dir: state.data_dir.join("backup"),
        adapter,
        ledger: Arc::clone(&state.ledger),
        premium: bundle,
    };
    state.runner.start(ctx, items)
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

#[tauri::command]
fn open_folder(state: State<'_, AppState>, kind: String) -> Result<(), String> {
    let path = match kind.as_str() {
        "logs" => state.data_dir.join("logs"),
        "resources" => state.resource_dir.clone(),
        "data" => state.data_dir.clone(),
        other => PathBuf::from(other),
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
async fn license_refresh(state: State<'_, AppState>) -> Result<license::Status, license::ApiError> {
    let lic = Arc::clone(&state.license);
    tauri::async_runtime::spawn_blocking(move || lic.refresh())
        .await
        .map_err(|_| license::ApiError::from("server_error"))?
}

#[tauri::command]
fn license_sign_out(state: State<'_, AppState>) {
    state.license.sign_out();
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
            let history = Arc::new(History::load(data_dir.join("history.json")));
            let (mut ledger, existed) = Ledger::load(data_dir.join("applied.json"));
            if !existed {
                // première version avec l'état des réglages : ceux déjà appliqués d'après l'historique
                ledger.import_history(&history.all());
                ledger.save();
            }
            app.manage(AppState {
                runner: Arc::new(Runner::default()),
                history,
                ledger: Arc::new(Mutex::new(ledger)),
                license: Arc::new(License::new()),
                account: Arc::new(Account::new()),
                system: Arc::new(Mutex::new(None)),
                stats: stats::Sampler::default(),
                resource_dir,
                data_dir,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            run_tweaks,
            cancel_run,
            is_running,
            get_history,
            clear_history,
            get_applied,
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
