mod account;
mod assets;
mod background;
mod backup;
mod catalog;
mod flows;
mod fps;
mod gameping;
mod games;
mod icmp;
mod icon;
mod history;
mod instance;
mod license;
mod mcping;
mod memory;
mod minecraft;
mod netopt;
mod netshare;
mod nettest;
mod overlay;
mod rbw;
mod reg;
mod repair;
mod report;
mod reset;
mod runner;
mod seal;
mod session;
mod shell;
mod stats;
mod system;
mod tools;
mod update;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

use account::Account;
use background::Background;
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
    library: Arc<games::Library>,
    updates: Arc<update::Updates>,
    resource_dir: PathBuf,
    data_dir: PathBuf,
    /// la réparation de ce lancement a supprimé une valeur (repair::at_startup) : l'interface le dit une fois
    repaired: AtomicBool,
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

/// Fin de la licence sur ce PC (déconnexion, abonnement terminé, remboursement, licence passée sur un autre PC) : tous
/// les réglages appliqués que Rago Optimizer sait remettre, gratuits compris, sont remis comme avant en arrière-plan,
/// sans fenêtre de suivi ni bouton pour arrêter. L'interface n'en voit que la fin (`reset:done`, petit message en bas à
/// droite). Fenêtre fermée pendant la remise : l'app reste ouverte, cachée, et quitte à la fin (`Reset::hold_exit`) ;
/// app tuée ou PC éteint : la fin de licence est notée (`reset::Pending`), la remise reprend au lancement suivant. La
/// licence revient pendant la remise (reconnexion) : elle s'arrête après le réglage en cours, les suivants restent
/// appliqués. `bundle` : scripts Premium encore ouverts au moment de la déconnexion (leur annulation est la plus juste).
fn reset_after_license(app: &AppHandle, bundle: Option<Arc<catalog::Bundle>>) {
    let app = app.clone();
    std::thread::spawn(move || {
        let state = app.state::<AppState>();
        let due = || state.reset.noting(|| reset::due(&state.data_dir, state.license.status().state, &state.ledger.lock().unwrap()));
        // rien à remettre (cas de chaque lancement) : les lots ne sont pas bloqués, même le temps de vérifier
        if due().is_none() && !state.reset.is_running() {
            return;
        }
        // une remise tourne déjà : elle refait un tour pour cette demande
        if !state.reset.begin() {
            return;
        }
        let (mut ok, mut failed) = (0, 0);
        // chaque réglage n'est essayé qu'une fois par remise : un échec reste noté appliqué, sans boucler
        let mut tried = std::collections::HashSet::new();
        let quit = loop {
            if due().is_some() {
                let ids: Vec<String> = reset::targets(&state.ledger.lock().unwrap(), reset::Scope::LicenseEnd, bundle.as_deref())
                    .into_iter()
                    .filter(|id| !tried.contains(id))
                    .collect();
                if !ids.is_empty() {
                    tried.extend(ids.iter().cloned());
                    let lic = Arc::clone(&state.license);
                    let ctx = Context { stop_when: Some(Arc::new(move || lic.status().state == "active")), ..state.context(None, bundle.clone()) };
                    let (o, f) = Runner::default().run_now(&ctx, &reset::items(ids));
                    (ok, failed) = (ok + o, failed + f);
                    continue;
                }
                // Network Optimizer appliqué par Rago : ses valeurs d'avant reviennent aussi
                match netopt::put_back(&state.data_dir, &state.data_dir.join("run")) {
                    Some(true) => ok += 1,
                    Some(false) => failed += 1,
                    None => {}
                }
                // tout ce qui pouvait être remis l'a été
                reset::Pending::remove(&state.data_dir);
            }
            if let Some(quit) = state.reset.end() {
                break quit;
            }
        };
        if ok + failed > 0 {
            let _ = app.emit("reset:done", reset::Done { ok, failed });
        }
        // fenêtre fermée pendant la remise et pas remontrée depuis : l'app avait été quittée
        let visible = app.get_webview_window("main").and_then(|w| w.is_visible().ok()).unwrap_or(false);
        if quit && !visible {
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
    // remise de fin de licence en cours (rien à l'écran) : un lot attendrait sa fin sans rien afficher
    if state.reset.is_running() {
        return Err("reset_running".into());
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
    reset::targets(&state.ledger.lock().unwrap(), reset::Scope::All, None)
}

/// Déconnexion : les réglages que la remise de fin de licence remettra, pour la confirmation de l'interface.
#[tauri::command]
async fn sign_out_plan(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let (ledger, lic) = (Arc::clone(&state.ledger), Arc::clone(&state.license));
    tauri::async_runtime::spawn_blocking(move || {
        let bundle = lic.scripts_key().and_then(|key| catalog::premium(&key));
        keep_undo(&ledger, bundle.as_deref());
        let l = ledger.lock().unwrap();
        reset::targets(&l, reset::Scope::LicenseEnd, bundle.as_deref())
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

/// « Nettoyer » sous la RAM (tableau de bord) : cache de Windows vidé, et applis en arrière-plan réduites si l'option
/// des paramètres est cochée. Les dossiers des jeux de la bibliothèque ne sont jamais touchés.
#[tauri::command]
async fn clean_ram(state: State<'_, AppState>, trim: bool) -> Result<memory::Cleaned, String> {
    let keep = state.library.install_dirs();
    tauri::async_runtime::spawn_blocking(move || memory::clean(trim, &keep)).await.map_err(|e| e.to_string())?
}

/// Test réseau (nettest.rs) : les serveurs demandés mesurés en même temps ; chaque essai est envoyé à l'interface
/// (`nettest:sample`), puis chaque serveur (`nettest:measure`) dès qu'il a fini. Les chiffres partent ensuite au
/// serveur, pour choisir où placer de futurs proxys (netshare.rs).
#[tauri::command]
async fn net_test(app: AppHandle, state: State<'_, AppState>, ids: Vec<String>) -> Result<Vec<nettest::Measure>, String> {
    let ids: Vec<String> = ids.into_iter().filter(|id| nettest::TARGETS.iter().any(|(t, _, _)| t == id)).take(16).collect();
    let version = app.package_info().version.to_string();
    let license = Arc::clone(&state.license);
    tauri::async_runtime::spawn_blocking(move || {
        let results: Vec<nettest::Measure> = std::thread::scope(|s| {
            let jobs: Vec<_> = ids
                .iter()
                .map(|id| {
                    let app = app.clone();
                    s.spawn(move || {
                        let m = nettest::measure(id, &|sample| {
                            let _ = app.emit("nettest:sample", &sample);
                        });
                        let _ = app.emit("nettest:measure", &m);
                        m
                    })
                })
                .collect();
            jobs.into_iter().filter_map(|j| j.join().ok()).collect()
        });
        let device = license.device();
        netshare::send(device.fingerprint.machine_guid.as_deref().unwrap_or(&device.name), &version, &results);
        results
    })
    .await
    .map_err(|e| e.to_string())
}

// ---------- Network Optimizer (netopt.rs)

#[tauri::command]
fn netopt_state(state: State<'_, AppState>) -> netopt::State {
    netopt::state(&state.data_dir)
}

/// Une action du Network Optimizer : appliquer (Premium), remettre la sauvegarde ou les valeurs de Windows, un test.
/// Les lignes du moteur arrivent pendant ce temps (`netopt:line`) ; la fin revient ici.
#[tauri::command]
async fn netopt_run(
    app: AppHandle,
    state: State<'_, AppState>,
    action: String,
    options: Option<netopt::Options>,
) -> Result<netopt::Outcome, String> {
    let action = netopt::Action::parse(&action).ok_or("unknown action")?;
    if action.changes() && (state.reset.is_running() || state.runner.is_running()) {
        return Err("busy".into());
    }
    let bundle = if action == netopt::Action::Apply {
        if state.license.status().state != "active" {
            return Err("premium_required:netopt".into());
        }
        Some(state.license.scripts_key().and_then(|key| catalog::premium(&key)).ok_or("premium_scripts_unavailable")?)
    } else {
        None
    };
    let options = options.unwrap_or_default().sanitized();
    let (data_dir, run_dir) = (state.data_dir.clone(), state.data_dir.join("run"));
    let (cache, resource_dir) = (Arc::clone(&state.system), state.resource_dir.clone());
    tauri::async_runtime::spawn_blocking(move || {
        // Compétitif : jamais Performances élevées sur un Ryzen X3D à deux CCD (comme pendant une partie, session.rs)
        let x3d = action == netopt::Action::Apply && session::dual_ccd_x3d(&probe_cached(&cache, &resource_dir, false).cpu_name);
        netopt::run(&data_dir, &run_dir, action, &options, bundle.as_deref(), x3d, &|line| {
            let _ = app.emit("netopt:line", &line);
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------- bibliothèque de jeux (games.rs)

#[tauri::command]
async fn games_list(state: State<'_, AppState>, refresh: bool) -> Result<Vec<games::Game>, String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.list(refresh)).await.map_err(|e| e.to_string())
}

/// Image officielle d'un jeu (data: URL), téléchargée une fois puis gardée dans art\.
#[tauri::command]
async fn game_art(state: State<'_, AppState>, id: String) -> Result<Option<String>, String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.art(&id)).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn game_launch(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.launch(&id)).await.map_err(|e| e.to_string())?
}

/// Launchers installés (Steam, Epic Games, Lunar Client…).
#[tauri::command]
async fn launchers_list(state: State<'_, AppState>, refresh: bool) -> Result<Vec<games::Launcher>, String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.launchers(refresh)).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn launcher_launch(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.launch_launcher(&id)).await.map_err(|e| e.to_string())?
}

/// Icône du launcher (data: URL), tirée de son exe une fois puis gardée dans art\.
#[tauri::command]
async fn launcher_icon(state: State<'_, AppState>, id: String) -> Result<Option<String>, String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.launcher_icon(&id)).await.map_err(|e| e.to_string())
}

/// Logos des jeux des presets installés (icône de leur exe, data: URL), par clé de jeu.
#[tauri::command]
async fn preset_icons(state: State<'_, AppState>) -> Result<std::collections::HashMap<String, String>, String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.preset_icons()).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn game_add(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.add(&path)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn game_remove(state: State<'_, AppState>, id: String) {
    state.library.remove(&id);
}

#[tauri::command]
async fn games_unhide(state: State<'_, AppState>) -> Result<(), String> {
    let lib = Arc::clone(&state.library);
    tauri::async_runtime::spawn_blocking(move || lib.unhide_all()).await.map_err(|e| e.to_string())
}

/// Gestionnaire des tâches de Windows, depuis l'utilisation en direct : voir quelle appli prend la RAM, le processeur
/// ou la carte graphique, et la fermer soi-même. Rago ne ferme aucun processus (« Nettoyer » vide seulement le cache
/// de Windows, voir memory.rs).
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

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// Exe de test (identifiant fusionné par la CI depuis tauri.staging.conf.json) ou vrai Rago Optimizer.
fn server_name() -> &'static str {
    if env!("RAGO_IDENTIFIER").ends_with(".staging") {
        "staging"
    } else {
        "production"
    }
}

/// Rapport pour le support (page « Partage et support ») : écrit dans reports\, ce qui identifie le joueur masqué. Rien
/// n'est envoyé : le joueur le joint lui-même à son ticket.
#[tauri::command]
async fn support_report(state: State<'_, AppState>, parts: report::Parts) -> Result<report::Report, String> {
    let sys = state.system.lock().unwrap().clone();
    let (ledger, history, lic, data_dir) = (Arc::clone(&state.ledger), Arc::clone(&state.history), Arc::clone(&state.license), state.data_dir.clone());
    let update = state.updates.last_check().unwrap_or_else(|| "not checked yet".into());
    tauri::async_runtime::spawn_blocking(move || {
        let applied = {
            let backups = backup::Sys::new(data_dir.join("backup"));
            let l = ledger.lock().unwrap();
            l.views(&|p| backups.read(p))
        };
        // l'offre seulement : ni l'e-mail ni la clé ne sont lus
        let license = match lic.status().state {
            "active" => "Premium",
            "expired" => "Premium, to renew",
            _ => "Free",
        };
        let now = now_ms();
        let input = report::Input {
            version: env!("CARGO_PKG_VERSION"),
            server: server_name(),
            license,
            update: &update,
            sys: sys.as_ref(),
            applied: &applied,
            history: &history.all(),
            logs_dir: &data_dir.join("logs"),
        };
        let text = report::build(&input, parts, now);
        let env = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
        // nom du compte, et celui du dossier de profil (différent pour un compte Microsoft)
        let users: Vec<String> = [env("USERNAME"), env("USERPROFILE").and_then(|p| PathBuf::from(p).file_name().map(|n| n.to_string_lossy().into_owned()))]
            .into_iter()
            .flatten()
            .collect();
        let hosts: Vec<String> = [env("COMPUTERNAME"), sys.as_ref().map(|s| s.hostname.clone())].into_iter().flatten().collect();
        let text = report::mask(&text, &users, &hosts);
        report::write(&data_dir.join("reports"), &text, now)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Montre un rapport dans l'Explorateur, sélectionné. Seulement un fichier de reports\ (nom écrit par report::write).
#[tauri::command]
fn show_report(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let ok_name = name.starts_with("rago-report-") && name.ends_with(".txt") && !name.contains(['/', '\\', ':']) && !name.contains("..");
    let path = state.data_dir.join("reports").join(&name);
    if !ok_name || !path.is_file() {
        return Err("Unknown report".into());
    }
    std::process::Command::new("explorer.exe").arg(format!("/select,{}", path.display())).spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Fichier de preset partagé (.rago) : le code RAGO1-… en texte, 64 Ko au plus.
const PRESET_FILE_MAX: u64 = 64 * 1024;

fn preset_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    if !p.extension().is_some_and(|e| e.eq_ignore_ascii_case("rago")) {
        return Err("Not a .rago file".into());
    }
    Ok(p)
}

#[tauri::command]
fn save_preset_file(path: String, code: String) -> Result<(), String> {
    let p = preset_path(&path)?;
    if !code.starts_with("RAGO") || code.len() as u64 > PRESET_FILE_MAX {
        return Err("Not a preset code".into());
    }
    std::fs::write(p, code).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_preset_file(path: String) -> Result<String, String> {
    let p = preset_path(&path)?;
    let len = std::fs::metadata(&p).map_err(|e| e.to_string())?.len();
    if len > PRESET_FILE_MAX {
        return Err("File too large".into());
    }
    let bytes = std::fs::read(&p).map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&bytes).trim_start_matches('\u{feff}').trim().to_string())
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
    let (lic, ledger, data_dir) = (Arc::clone(&state.license), Arc::clone(&state.ledger), state.data_dir.clone());
    let resets = Arc::clone(&state.reset);
    let (r, bundle) = tauri::async_runtime::spawn_blocking(move || {
        // scripts Premium ouverts tant que la licence est là : si le serveur la refuse, leur annulation sert à la remise
        let bundle = lic.scripts_key().and_then(|key| catalog::premium(&key));
        keep_undo(&ledger, bundle.as_deref());
        let r = resets.noting(|| {
            let r = lic.refresh();
            // abonnement terminé, remboursement, licence révoquée ou passée sur un autre PC : le jeton vient d'être
            // effacé, la remise est notée avant de commencer
            if let Err(e) = &r {
                if e.drops_token() {
                    let _ = reset::Pending::new(&e.code).save(&data_dir);
                }
            }
            r
        });
        (r, bundle)
    })
    .await
    .map_err(|_| license::ApiError::from("server_error"))?;
    if r.as_ref().is_err_and(|e| e.drops_token()) {
        reset_after_license(&app, bundle);
    }
    r
}

/// Déconnexion : effacée tout de suite (l'interface repasse en gratuit), puis tous les réglages sont remis en
/// arrière-plan (`reset_after_license`). Avant d'effacer le jeton : l'annulation de chaque réglage est gardée dans
/// applied.json, et la remise est notée, pour qu'elle reprenne au lancement suivant si l'app est tuée.
#[tauri::command]
async fn license_sign_out(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let (lic, ledger, data_dir) = (Arc::clone(&state.license), Arc::clone(&state.ledger), state.data_dir.clone());
    let resets = Arc::clone(&state.reset);
    let bundle = tauri::async_runtime::spawn_blocking(move || {
        let bundle = lic.scripts_key().and_then(|key| catalog::premium(&key));
        keep_undo(&ledger, bundle.as_deref());
        resets.noting(|| {
            let _ = reset::Pending::new("signed_out").save(&data_dir);
            lic.sign_out();
        });
        bundle
    })
    .await
    .map_err(|e| e.to_string())?;
    reset_after_license(&app, bundle);
    Ok(())
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

/// Mise à jour téléchargée et vérifiée, prête à installer (null : rien en attente).
#[tauri::command]
fn update_ready(state: State<'_, AppState>) -> Option<update::Ready> {
    state.updates.ready()
}

/// Résultat de la dernière recherche de mise à jour (null : pas encore faite), affiché dans Paramètres de l'exe de test.
#[tauri::command]
fn update_status(state: State<'_, AppState>) -> Option<String> {
    state.updates.last_check()
}

/// Installe la mise à jour et rouvre l'app. Pas pendant un lot ni une remise : la fenêtre se fermerait au milieu.
#[tauri::command]
fn update_install(state: State<'_, AppState>) -> Result<(), String> {
    if state.runner.is_running() || state.reset.is_running() {
        return Err("busy".into());
    }
    state.updates.install(true)
}

/// « Quitter » (icône près de l'horloge) : comme une fermeture, sans le mode arrière-plan.
fn quit(app: &AppHandle) {
    if let Some(state) = app.try_state::<AppState>() {
        if state.reset.hold_exit() {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.hide();
            }
            return;
        }
        if state.updates.ready().is_some() && !state.runner.is_running() {
            let _ = state.updates.install(false);
        }
    }
    app.exit(0);
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct BackgroundState {
    prefs: background::Prefs,
    /// la tâche de lancement avec Windows existe
    autostart: bool,
    shortcut_taken: bool,
    fps_available: bool,
}

fn background_state(app: &AppHandle) -> BackgroundState {
    let bg = app.state::<Arc<Background>>();
    let info = app.state::<Arc<overlay::Overlay>>().info();
    BackgroundState {
        prefs: bg.prefs(),
        autostart: background::autostart_exists(&app.package_info().name),
        shortcut_taken: info.shortcut_taken,
        fps_available: info.fps_available,
    }
}

#[tauri::command]
async fn background_get(app: AppHandle) -> Result<BackgroundState, String> {
    tauri::async_runtime::spawn_blocking(move || background_state(&app)).await.map_err(|e| e.to_string())
}

/// Enregistre les réglages du mode arrière-plan et de la barre en jeu, et les applique (icône, tâche planifiée).
#[tauri::command]
async fn background_set(app: AppHandle, prefs: background::Prefs) -> Result<BackgroundState, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut prefs = prefs;
        prefs.shortcut = prefs.shortcut.trim().to_string();
        if prefs.shortcut.parse::<tauri_plugin_global_shortcut::Shortcut>().is_err() {
            return Err("shortcut".to_string());
        }
        prefs.lang = if prefs.lang == "en" { "en".into() } else { "fr".into() };
        let bg = Arc::clone(&app.state::<Arc<Background>>());
        let name = app.package_info().name.clone();
        let old = bg.prefs();
        prefs.autostart_chosen = old.autostart_chosen || prefs.autostart != old.autostart;
        // options « pendant la partie » : réglées à part (session_set_prefs), jamais écrasées par une copie plus ancienne
        (prefs.game_gpu, prefs.game_power, prefs.game_checks) = (old.game_gpu, old.game_power, old.game_checks);
        if prefs.autostart != old.autostart || prefs.autostart != background::autostart_exists(&name) {
            let temp = app.state::<AppState>().data_dir.clone();
            background::set_autostart(&name, prefs.autostart, &temp).map_err(|e| format!("autostart:{e}"))?;
        }
        bg.save(prefs.clone());
        background::sync_tray(&app, prefs.keeps_running() || bg.started_hidden, &prefs.lang, quit);
        Ok(background_state(&app))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Pendant une partie : mode d'alimentation, carte graphique et vérifications (session.rs).
#[tauri::command]
async fn session_state(session: State<'_, Arc<session::Session>>) -> Result<session::State, String> {
    let session = Arc::clone(&session);
    tauri::async_runtime::spawn_blocking(move || session.state()).await.map_err(|e| e.to_string())
}

/// Options « pendant la partie » des paramètres ; prises en compte au prochain passage (4 secondes au plus).
#[tauri::command]
fn session_set_prefs(bg: State<'_, Arc<Background>>, gpu: bool, power: bool, checks: bool) -> background::Prefs {
    let prefs = background::Prefs { game_gpu: gpu, game_power: power, game_checks: checks, ..bg.prefs() };
    bg.save(prefs.clone());
    prefs
}

/// État de ce que lit le vérificateur de Ranked Bedwars (affiché sous RBW Mod).
#[tauri::command]
async fn rbw_status() -> Result<Vec<rbw::Check>, String> {
    tauri::async_runtime::spawn_blocking(rbw::status).await.map_err(|e| e.to_string())
}

/// Page Outils : place prise par chaque zone du nettoyage.
#[tauri::command]
async fn tools_scan() -> Result<Vec<tools::Area>, String> {
    tauri::async_runtime::spawn_blocking(tools::scan).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn tools_clean(areas: Vec<String>) -> Result<tools::Cleaned, String> {
    tauri::async_runtime::spawn_blocking(move || tools::clean_areas(&areas)).await.map_err(|e| e.to_string())
}

/// Applis préinstallées ou sponsorisées présentes sur ce PC.
#[tauri::command]
async fn tools_apps() -> Result<Vec<tools::App>, String> {
    tauri::async_runtime::spawn_blocking(tools::apps).await.map_err(|e| e.to_string())
}

/// Désinstallation (gratuite depuis la 1.2.2) ; renvoie les applis encore là.
#[tauri::command]
async fn tools_remove_apps(ids: Vec<String>) -> Result<Vec<tools::App>, String> {
    tauri::async_runtime::spawn_blocking(move || tools::remove_apps(&ids)).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn tools_drivers() -> Result<tools::Drivers, String> {
    tauri::async_runtime::spawn_blocking(tools::drivers).await.map_err(|e| e.to_string())
}

/// Mises à jour facultatives de Windows Update (pilotes proposés par Windows).
#[tauri::command]
fn tools_windows_update() -> Result<(), String> {
    std::process::Command::new("explorer.exe").arg("ms-settings:windowsupdate-optionalupdates").spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn overlay_info(overlay: State<'_, Arc<overlay::Overlay>>) -> overlay::Info {
    overlay.info()
}

#[tauri::command]
fn overlay_live(overlay: State<'_, Arc<overlay::Overlay>>) -> overlay::Live {
    overlay.live()
}

#[tauri::command]
fn overlay_close(app: AppHandle, overlay: State<'_, Arc<overlay::Overlay>>) {
    overlay.close(&app, true);
}

#[tauri::command]
fn overlay_set_pin(bg: State<'_, Arc<Background>>, pin: bool) {
    bg.save(background::Prefs { pin, ..bg.prefs() });
}

/// Depuis la barre en jeu : ferme la barre et ouvre l'app, sur une page (`premium` : l'offre Premium).
#[tauri::command]
fn overlay_open_app(app: AppHandle, overlay: State<'_, Arc<overlay::Overlay>>, page: Option<String>) {
    overlay.close(&app, false);
    background::show_main(&app);
    if let Some(page) = page {
        let _ = app.emit_to("main", "app:goto", page);
    }
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        overlay::on_shortcut(app);
                    }
                })
                .build(),
        )
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
            // ce qu'une version précédente a laissé et qui fait planter le PC (RAG-67), sans attendre le joueur
            let removed = repair::at_startup(&backup::Sys::new(data_dir.join("backup")), &mut ledger, &data_dir.join("logs"));
            let library = Arc::new(games::Library::new(&data_dir));
            // mode arrière-plan et barre en jeu (RAG-82) : lancée avec Windows, la fenêtre reste cachée près de l'horloge
            let started_hidden = std::env::args_os().any(|a| a == background::BACKGROUND_ARG);
            let background = Arc::new(Background::load(&data_dir, started_hidden));
            let session = Arc::new(session::Session::new(&data_dir));
            // jeux lancés : la dernière partie de chacun est notée, l'interface suit ceux en cours, et l'app fait ce
            // qu'elle doit pendant la partie (session.rs)
            {
                let (library, background, session, handle) = (Arc::clone(&library), Arc::clone(&background), Arc::clone(&session), app.handle().clone());
                std::thread::spawn(move || {
                    library.list(false);
                    loop {
                        let procs = games::process_paths();
                        if let Some(running) = library.poll(&procs) {
                            let _ = handle.emit("games:running", running);
                        }
                        let mut exes = library.game_exes(&procs);
                        exes.extend(procs.iter().filter(|p| session::minecraft_exe(p)).cloned());
                        let playing = library.playing() || !exes.is_empty();
                        if let Some(state) = session.tick(playing, &exes, &procs, &background.prefs()) {
                            let _ = handle.emit("games:session", state);
                        }
                        std::thread::sleep(std::time::Duration::from_secs(4));
                    }
                });
            }
            let prefs = background.prefs();
            background::sync_tray(app.handle(), prefs.keeps_running() || started_hidden, &prefs.lang, quit);
            // lancement avec Windows d'office (tant que le joueur ne l'a pas coupé) : la tâche est créée au premier lancement
            if prefs.autostart && !cfg!(debug_assertions) {
                let (name, temp) = (app.package_info().name.clone(), data_dir.clone());
                std::thread::spawn(move || {
                    if !background::autostart_exists(&name) {
                        let _ = background::set_autostart(&name, true, &temp).map_err(|e| eprintln!("[autostart] {e}"));
                    }
                });
            }
            let overlay = Arc::new(overlay::Overlay::new(resource_dir.clone(), data_dir.clone(), Arc::clone(&library), Arc::clone(&background)));
            overlay::watch(app.handle().clone(), Arc::clone(&overlay));
            app.manage(background);
            app.manage(overlay);
            app.manage(session);
            if !started_hidden {
                background::show_main(app.handle());
            }
            // mise à jour de l'app : cherchée et téléchargée en arrière-plan, installée quand le joueur le décide
            let (license, updates) = (Arc::new(License::new()), Arc::new(update::Updates::default()));
            {
                let license = Arc::clone(&license);
                update::watch(app.handle().clone(), Arc::clone(&updates), move || {
                    let d = license.device();
                    d.fingerprint.machine_guid.clone().unwrap_or_else(|| d.name.clone())
                });
            }
            app.manage(AppState {
                runner: Arc::new(Runner::default()),
                history,
                ledger: Arc::new(Mutex::new(ledger)),
                license,
                account: Arc::new(Account::new()),
                reset: Arc::new(Reset::default()),
                system: Arc::new(Mutex::new(None)),
                stats: stats::Sampler::default(),
                library,
                updates,
                resource_dir,
                data_dir,
                repaired: AtomicBool::new(!removed.is_empty()),
            });
            // Rago Optimizer relancée pendant qu'elle finit une remise, fenêtre cachée : la fenêtre revient
            let handle = app.handle().clone();
            instance::on_show_request(move || {
                if let Some(state) = handle.try_state::<AppState>() {
                    state.reset.keep_open();
                }
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            });
            // fin de licence depuis le dernier lancement, ou remise coupée en cours de route : elle reprend ici
            reset_after_license(app.handle(), None);
            Ok(())
        })
        .on_window_event(|window, event| {
            // barre en jeu : jamais fermée (Alt+F4), seulement cachée ; un clic dans le jeu la ferme
            if window.label() == overlay::LABEL {
                let ov = window.try_state::<Arc<overlay::Overlay>>();
                match event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        if let Some(ov) = ov {
                            ov.close(window.app_handle(), true);
                        }
                    }
                    tauri::WindowEvent::Focused(false) => {
                        if let Some(ov) = ov {
                            ov.on_blur(window.app_handle());
                        }
                    }
                    _ => {}
                }
                return;
            }
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // remise en cours : la fenêtre se cache, la remise continue et l'app quitte quand elle est finie
                    if window.try_state::<AppState>().is_some_and(|s| s.reset.hold_exit()) {
                        api.prevent_close();
                        let _ = window.hide();
                    } else if window.try_state::<Arc<Background>>().is_some_and(|b| b.hides_on_close()) {
                        // mode arrière-plan : Rago reste près de l'horloge
                        api.prevent_close();
                        let _ = window.hide();
                    } else if let Some(state) = window.try_state::<AppState>() {
                        // mise à jour téléchargée : elle s'installe à la fermeture, sans rouvrir l'app (pas pendant un lot)
                        if state.updates.ready().is_some() && !state.runner.is_running() {
                            let _ = state.updates.install(false);
                        }
                    }
                }
                // fenêtre principale fermée : l'app quitte, même si la barre en jeu (cachée) existe encore
                tauri::WindowEvent::Destroyed => window.app_handle().exit(0),
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            rbw_status,
            tools_scan,
            tools_clean,
            tools_apps,
            tools_remove_apps,
            tools_drivers,
            tools_windows_update,
            run_tweaks,
            cancel_run,
            is_running,
            get_history,
            clear_history,
            get_applied,
            undo_all_plan,
            sign_out_plan,
            take_repair_notice,
            live_stats,
            clean_ram,
            net_test,
            games_list,
            game_art,
            game_launch,
            launchers_list,
            launcher_launch,
            launcher_icon,
            preset_icons,
            netopt_state,
            netopt_run,
            game_add,
            game_remove,
            games_unhide,
            update_ready,
            update_status,
            update_install,
            background_get,
            background_set,
            session_state,
            session_set_prefs,
            overlay_info,
            overlay_live,
            overlay_close,
            overlay_set_pin,
            overlay_open_app,
            open_task_manager,
            minecraft_status,
            minecraft_restore,
            restart_pc,
            open_folder,
            support_report,
            show_report,
            save_preset_file,
            read_preset_file,
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
        .build(tauri::generate_context!())
        .expect("erreur au lancement de Rago Optimizer")
        .run(|_, event| {
            // la session du journal réseau (ping des jeux) ne survit pas à l'app
            if let tauri::RunEvent::Exit = event {
                flows::shutdown();
            }
        });
}
