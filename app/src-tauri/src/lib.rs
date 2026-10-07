mod catalog;
mod history;
mod license;
mod minecraft;
mod ping;
mod runner;
mod shell;
mod system;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

use history::History;
use license::License;
use runner::{Context, RunItem, Runner};
use system::SystemInfo;

struct AppState {
    runner: Arc<Runner>,
    history: Arc<History>,
    license: Arc<License>,
    system: Arc<Mutex<Option<SystemInfo>>>,
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

#[tauri::command]
fn run_tweaks(app: AppHandle, state: State<'_, AppState>, items: Vec<RunItem>) -> Result<String, String> {
    if items.is_empty() {
        return Err("No tweak selected".into());
    }
    let premium = state.license.status().state == "active";
    if let Some(it) = items.iter().find(|it| !catalog::allowed(&it.id, it.variant.as_deref(), premium)) {
        return Err(format!("premium_required:{}", it.id));
    }
    let adapter = state.system(false).adapter;
    let ctx = Context {
        app,
        history: Arc::clone(&state.history),
        resource_dir: state.resource_dir.clone(),
        logs_dir: state.data_dir.join("logs"),
        run_dir: state.data_dir.join("run"),
        adapter,
    };
    state.runner.start(ctx, items)
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

#[tauri::command]
async fn ping(host: String, port: Option<u16>, count: Option<u32>) -> Result<ping::PingResult, String> {
    let port = port.unwrap_or(25565);
    let count = count.unwrap_or(10).clamp(1, 50);
    tauri::async_runtime::spawn_blocking(move || ping::tcp_ping(&host, port, count, 1500))
        .await
        .map_err(|e| e.to_string())
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
            app.manage(AppState {
                runner: Arc::new(Runner::default()),
                history: Arc::new(History::load(data_dir.join("history.json"))),
                license: Arc::new(License::new()),
                system: Arc::new(Mutex::new(None)),
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
            ping,
            minecraft_status,
            minecraft_restore,
            restart_pc,
            open_folder,
            license_status,
            license_login,
            license_activate,
            license_refresh,
            license_sign_out,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Rago Optimizer");
}
