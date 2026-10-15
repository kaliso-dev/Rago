//! Exécution des réglages : un lot à la fois, dans un thread, avec le journal envoyé à
//! l'interface ligne par ligne.
//!
//! Chaque script batch est écrit dans le dossier de données de l'app (sous-dossier run, hors de
//! %TEMP% : beaucoup de réglages vident %TEMP% et tuaient leur propre script) puis lancé par `cmd.exe /d /c`, sans
//! fenêtre, entrée standard fermée (un `pause` oublié ne bloque donc jamais).

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::Instant;
use tauri::{AppHandle, Emitter};

use crate::backup::{self, Ledger, Probe, Sys};
use crate::history::{now_ms, Entry, History};
use crate::{catalog, minecraft, shell};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunItem {
    pub id: String,
    pub variant: Option<String>,
    /// Données propres aux réglages natifs (valeurs OptiFine, dossier Minecraft)
    #[serde(default)]
    pub params: Option<serde_json::Value>,
    /// réglage décoché : remettre l'état d'avant
    #[serde(default)]
    pub undo: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ItemEvent<'a> {
    run_id: &'a str,
    index: usize,
    id: &'a str,
    variant: Option<&'a str>,
    status: &'a str,
    code: Option<i32>,
    duration_ms: Option<u64>,
    message: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogEvent<'a> {
    run_id: &'a str,
    id: &'a str,
    line: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DoneEvent<'a> {
    run_id: &'a str,
    ok: usize,
    failed: usize,
    /// pas lancés : le point de restauration n'a pas pu être créé
    skipped: usize,
    restore_failed: bool,
    cancelled: bool,
    log_file: String,
}

/// Un seul lot à la fois sur Windows : un lot lancé depuis l'interface attend la fin d'une remise à zéro en cours.
static EXCLUSIVE: Mutex<()> = Mutex::new(());

fn exclusive() -> MutexGuard<'static, ()> {
    EXCLUSIVE.lock().unwrap_or_else(PoisonError::into_inner)
}

#[derive(Default)]
pub struct Runner {
    running: AtomicBool,
    cancel: AtomicBool,
    child: Mutex<Option<u32>>,
}

pub struct Context {
    /// fenêtre qui suit le lot ; None pour la remise à zéro (fin de Premium, désinstallation), qui ne montre rien
    pub app: Option<AppHandle>,
    pub history: Arc<History>,
    pub resource_dir: PathBuf,
    pub logs_dir: PathBuf,
    pub run_dir: PathBuf,
    pub backup_dir: PathBuf,
    pub adapter: Option<String>,
    pub ledger: Arc<Mutex<Ledger>>,
    /// scripts Premium ouverts avec la clé de la licence (None sans licence)
    pub premium: Option<Arc<catalog::Bundle>>,
    /// remise à zéro : vrai quand elle n'a plus lieu d'être (licence revenue). Lu entre deux réglages, jamais au
    /// milieu d'un script : un réglage commencé est toujours remis en entier.
    pub stop_when: Option<Arc<dyn Fn() -> bool + Send + Sync>>,
}

impl Context {
    fn emit<S: Serialize + Clone>(&self, event: &str, payload: S) {
        if let Some(app) = &self.app {
            let _ = app.emit(event, payload);
        }
    }
}

impl Runner {
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn cancel(&self) {
        self.cancel.store(true, Ordering::SeqCst);
        if let Some(pid) = *self.child.lock().unwrap() {
            let _ = shell::hidden("taskkill.exe").args(["/PID", &pid.to_string(), "/T", "/F"]).status();
        }
    }

    /// Lance le lot dans un thread. Renvoie l'identifiant du lot.
    pub fn start(self: &Arc<Self>, ctx: Context, items: Vec<RunItem>) -> Result<String, String> {
        if self.running.swap(true, Ordering::SeqCst) {
            return Err("An optimization is already running".into());
        }
        self.cancel.store(false, Ordering::SeqCst);
        let run_id = format!("run-{}", now_ms());
        let me = Arc::clone(self);
        let rid = run_id.clone();
        std::thread::spawn(move || {
            let _one = exclusive();
            me.run(&ctx, &rid, &items);
            me.running.store(false, Ordering::SeqCst);
        });
        Ok(run_id)
    }

    /// Lance le lot sur le thread appelant, sans interface (remise à zéro). Renvoie (réussis, ratés).
    pub fn run_now(&self, ctx: &Context, items: &[RunItem]) -> (usize, usize) {
        let _one = exclusive();
        self.run(ctx, &format!("reset-{}", now_ms()), items)
    }

    fn run(&self, ctx: &Context, run_id: &str, items: &[RunItem]) -> (usize, usize) {
        let _ = fs::create_dir_all(&ctx.logs_dir);
        let log_path = ctx.logs_dir.join(format!("{run_id}.log"));
        let log = Mutex::new(OpenOptions::new().create(true).append(true).open(&log_path).ok());
        let write_log = |line: &str| {
            if let Some(f) = log.lock().unwrap().as_mut() {
                let _ = writeln!(f, "{line}");
            }
        };
        let (mut ok, mut failed) = (0, 0);
        let sys = Sys::new(ctx.backup_dir.clone());
        // réglages jumeaux (même script) cochés ensemble : le script tourne une fois, le résultat vaut pour tous
        let mut twins_done: HashMap<String, TwinRun> = HashMap::new();
        // point de restauration demandé (case cochée, comme en 1.1.6) : s'il échoue, rien de ce qui suit n'est appliqué.
        // Les annulations tournent quand même : elles remettent l'état d'avant, c'est le sens sûr.
        let (mut restore_failed, mut skipped) = (false, 0);
        for (index, item) in items.iter().enumerate() {
            if self.cancel.load(Ordering::SeqCst) {
                break;
            }
            if ctx.stop_when.as_ref().is_some_and(|stop| stop()) {
                write_log(&format!("==== stopped before {}: no longer needed", item.id));
                break;
            }
            let applied = ctx.ledger.lock().unwrap().tweaks.contains_key(&item.id);
            if item.undo && !applied {
                // décoché, mais déjà remis entre-temps par la remise à zéro : plus rien à annuler
                write_log(&format!("==== undo {}: already put back", item.id));
                let variant = item.variant.as_deref();
                ctx.emit("run:item", ItemEvent { run_id, index, id: &item.id, variant, status: "ok", code: Some(0), duration_ms: Some(0), message: None });
                ok += 1;
                continue;
            }
            // RBW Mod « Désactivé » de cette version : il n'a posé que les valeurs de Windows, il n'y a rien à défaire. Le
            // défaire sans clic sur « Activé » (décoché, Tout annuler, déconnexion, fin de Premium, désinstallation) ne
            // lance rien : ni les 6 étapes d'« Activé », ni son verdict (« post a screenshot on Discord »), que le joueur
            // n'a pas demandés. Noté comme une annulation : la ligne garde « Désactivé depuis… », ce qui reste vrai.
            if item.undo && catalog::revert_runs_script(&item.id) {
                let entry = ctx.ledger.lock().unwrap().tweaks.get(&item.id).cloned();
                if let Some(entry) = entry.filter(|a| !a.backup && a.windows_values) {
                    let variant = entry.variant.as_deref().or(item.variant.as_deref());
                    ctx.emit("run:item", ItemEvent { run_id, index, id: &item.id, variant, status: "running", code: None, duration_ms: None, message: None });
                    write_log(&format!("==== undo {}{}", item.id, variant.map(|v| format!(":{v}")).unwrap_or_default()));
                    let line = "- Off already put the Windows values back: nothing to undo".to_string();
                    write_log(&line);
                    ctx.emit("run:log", LogEvent { run_id, id: &item.id, line });
                    {
                        let mut l = ctx.ledger.lock().unwrap();
                        l.release(&item.id);
                        l.save();
                    }
                    ctx.emit("run:item", ItemEvent { run_id, index, id: &item.id, variant, status: "ok", code: Some(0), duration_ms: Some(0), message: None });
                    ctx.history.push(Entry {
                        id: item.id.clone(),
                        variant: variant.map(str::to_string),
                        ts: now_ms(),
                        ok: true,
                        code: Some(0),
                        duration_ms: 0,
                        undo: true,
                    });
                    ok += 1;
                    continue;
                }
            }
            // RBW Mod : revenir en arrière autrement (« Activé » après « Désactivé » ; entrée d'une version d'avant :
            // sauvegarde de 1.1.9, ou ancien « Désactivé » noté d'après l'historique, qui passait des services en manuel),
            // c'est lancer « Activé » en entier, jamais la sauvegarde d'avant « Désactivé », qui ne démarrait aucun service
            // (catalog::revert_runs_script). Lancé et noté dans l'historique comme « Activé » : l'interface affiche
            // « Activé depuis… »
            let as_script;
            let converted = catalog::revert_runs_script(&item.id)
                && (item.undo || (applied && catalog::is_revert(&item.id, item.variant.as_deref())));
            let item = if converted {
                as_script = RunItem { variant: catalog::revert_variant(&item.id), undo: false, ..item.clone() };
                &as_script
            } else {
                item
            };
            let variant = item.variant.as_deref();
            let emit_item = |status: &str, code: Option<i32>, duration: Option<u64>, message: Option<String>| {
                ctx.emit("run:item", ItemEvent { run_id, index, id: &item.id, variant, status, code, duration_ms: duration, message });
            };
            // décoché, ou variante de retour arrière d'un réglage appliqué : retour à l'état d'avant
            let undo = item.undo || (applied && catalog::is_revert(&item.id, variant) && !catalog::revert_runs_script(&item.id));
            // un retour arrière converti tourne lui aussi sans point de restauration, comme avant (c'était une annulation)
            if restore_failed && !undo && !converted && changes_windows(&item.id) {
                write_log(&format!("==== skipped {} (no restore point)", item.id));
                emit_item("skipped", None, None, None);
                skipped += 1;
                continue;
            }
            emit_item("running", None, None, None);
            write_log(&format!(
                "==== {}{}{}",
                if undo { "undo " } else { "" },
                item.id,
                variant.map(|v| format!(":{v}")).unwrap_or_default()
            ));
            let started = Instant::now();
            let emit_line = |line: String| {
                write_log(&line);
                ctx.emit("run:log", LogEvent { run_id, id: &item.id, line });
            };
            let twin_key = (!undo).then(|| catalog::twin_of(&item.id).map(|t| format!("{t}:{}", variant.unwrap_or("")))).flatten();
            let (success, code, message) = if undo {
                let r = self.undo_item(ctx, &sys, item, &emit_line);
                match r {
                    Ok((code, msg)) => (code == 0, Some(code), msg),
                    Err(e) => (false, None, Some(e)),
                }
            } else {
                match twin_key.as_ref().and_then(|k| twins_done.get(k)) {
                    Some(t) => {
                        let name = catalog::name_of(&t.first);
                        emit_line(if t.ok {
                            format!("- Same commands as {name}, applied above: not run again")
                        } else {
                            format!("- Same commands as {name}, which failed above: not run again")
                        });
                        if let Some(p) = &t.probes {
                            let mut l = ctx.ledger.lock().unwrap();
                            l.set_applied(&item.id, item.variant.clone(), t.ok, true, p.clone(), now_ms());
                            l.fill_undo(&|i, v| catalog::undo_of(i, v, ctx.premium.as_deref()));
                            l.save();
                        }
                        (t.ok, t.code, t.message.clone())
                    }
                    None => {
                        // ce que le script va modifier, relevé avant de le lancer
                        let switch = catalog::is_switch(&item.id) && !catalog::is_revert(&item.id, variant);
                        // RBW Mod : rien à sauvegarder, son retour arrière lance « Activé » ; un relevé retiendrait les
                        // valeurs d'autres réglages et cacherait ce qu'il leur change (badge « Changé par Windows »)
                        let keep = switch && !catalog::revert_runs_script(&item.id);
                        let probes = if keep { self.snapshot(ctx, &sys, item, &emit_line) } else { None };
                        let result = self.run_item(ctx, item, &emit_line);
                        let cancelled = self.cancel.load(Ordering::SeqCst);
                        let r = match result {
                            Ok((code, msg)) => (code == 0 && !cancelled, Some(code), msg),
                            Err(e) => (false, None, Some(e)),
                        };
                        let ids = probes.map(|probes| {
                            sys.forget_active();
                            let mut l = ctx.ledger.lock().unwrap();
                            for p in probes.iter().filter(|p| matches!(p, Probe::Reg { .. })) {
                                l.set_after(&p.id(), sys.read(p));
                            }
                            let ids: Vec<String> = probes.iter().map(Probe::id).collect();
                            l.set_applied(&item.id, item.variant.clone(), r.0, true, ids.clone(), now_ms());
                            l.fill_undo(&|i, v| catalog::undo_of(i, v, ctx.premium.as_deref()));
                            l.save();
                            ids
                        });
                        if switch && ids.is_none() {
                            // réglage natif (OptiFine) : il garde sa propre sauvegarde ; RBW Mod « Désactivé » : aucune (le
                            // relevé d'une version précédente est oublié, il ne retient plus les valeurs d'autres réglages)
                            let mut l = ctx.ledger.lock().unwrap();
                            if catalog::revert_runs_script(&item.id) {
                                l.release(&item.id);
                            }
                            l.set_applied(&item.id, item.variant.clone(), r.0, item.id == "mc_optifine", Vec::new(), now_ms());
                            if catalog::revert_runs_script(&item.id) {
                                // « Désactivé » ne pose que des valeurs de Windows, même lancé à moitié : rien à défaire
                                if let Some(a) = l.tweaks.get_mut(&item.id) {
                                    a.windows_values = true;
                                }
                            }
                            l.save();
                        } else if catalog::revert_runs_script(&item.id) {
                            // RBW Mod « Activé » : il n'est plus « appliqué » (« Désactivé » l'était)
                            let mut l = ctx.ledger.lock().unwrap();
                            l.release(&item.id);
                            l.save();
                        }
                        if let Some(k) = twin_key {
                            twins_done.insert(
                                k,
                                TwinRun { ok: r.0, code: r.1, message: r.2.clone(), first: item.id.clone(), probes: ids },
                            );
                        }
                        r
                    }
                }
            };
            let duration = started.elapsed().as_millis() as u64;
            if let Some(m) = &message {
                write_log(m);
            }
            emit_item(if success { "ok" } else { "error" }, code, Some(duration), message);
            if !item.id.starts_with("__") {
                ctx.history.push(Entry {
                    id: item.id.clone(),
                    variant: item.variant.clone(),
                    ts: now_ms(),
                    ok: success,
                    code,
                    duration_ms: duration,
                    undo,
                });
            }
            if success {
                ok += 1
            } else {
                failed += 1;
                if item.id == "rst_point" {
                    restore_failed = true;
                    write_log("! No restore point: the tweaks after it are not run");
                }
            }
        }
        let cancelled = self.cancel.load(Ordering::SeqCst);
        ctx.emit(
            "run:done",
            DoneEvent { run_id, ok, failed, skipped, restore_failed, cancelled, log_file: log_path.to_string_lossy().to_string() },
        );
        (ok, failed)
    }

    /// Lance le relevé du réglage et garde l'état actuel de ce qu'il va modifier, s'il n'est pas déjà gardé.
    fn snapshot(&self, ctx: &Context, sys: &Sys, item: &RunItem, emit: &dyn Fn(String)) -> Option<Vec<Probe>> {
        let variant = item.variant.as_deref();
        let script = catalog::probe(&item.id, variant, ctx.premium.as_deref())?;
        let probes = if script.contains("@@RAGO") {
            let path = write_script(&ctx.run_dir, &format!("{}-probe", item.id), variant, &script).ok()?;
            let mut cmd = shell::hidden("cmd.exe");
            cmd.args(["/d", "/c"]).arg(&path);
            cmd.env("RAGO_RES", &ctx.resource_dir);
            cmd.env("adapter_name", ctx.adapter.clone().unwrap_or_default());
            cmd.current_dir(&ctx.run_dir);
            cmd.stdin(Stdio::null());
            let out = cmd.output().ok();
            let _ = fs::remove_file(&path);
            backup::parse_markers(&decode(&out?.stdout))
        } else {
            Vec::new()
        };
        let missing: Vec<&Probe> = {
            let l = ctx.ledger.lock().unwrap();
            probes.iter().filter(|p| !l.has(&p.id())).collect()
        };
        // lu hors du verrou : bcdedit et powercfg prennent un moment
        let read: Vec<(Probe, backup::Saved)> = missing.into_iter().map(|p| (p.clone(), sys.read(p))).collect();
        {
            let mut l = ctx.ledger.lock().unwrap();
            for (p, saved) in read.iter().cloned() {
                l.record_before(p, saved);
            }
            l.save();
        }
        if !probes.is_empty() {
            emit(format!("- Saved how {} settings were before, to put them back if you turn this off", probes.len()));
        }
        Some(probes)
    }

    /// Remet l'état d'avant : la sauvegarde si elle existe, puis ce qu'elle ne couvre pas (netsh, PowerShell…)
    /// avec les valeurs de Windows. Sans sauvegarde : la variante de retour arrière ou les valeurs de Windows.
    fn undo_item(&self, ctx: &Context, sys: &Sys, item: &RunItem, emit: &dyn Fn(String)) -> Result<(i32, Option<String>), String> {
        let id = item.id.as_str();
        let entry = ctx.ledger.lock().unwrap().tweaks.get(id).cloned();
        let variant = entry.as_ref().and_then(|e| e.variant.clone()).or_else(|| item.variant.clone());
        // annulation de cette version, sinon la copie gardée quand le réglage a été appliqué (scripts Premium
        // fermés après une déconnexion ou une fin de licence)
        let undo = catalog::undo_of(id, variant.as_deref(), ctx.premium.as_deref())
            .or_else(|| entry.as_ref().and_then(|e| e.undo.clone()));
        if id == "mc_optifine" {
            let dir = item
                .params
                .as_ref()
                .and_then(|p| p.get("dir"))
                .and_then(|d| d.as_str())
                .map(PathBuf::from)
                .or_else(|| std::env::var("APPDATA").ok().map(|a| PathBuf::from(a).join(".minecraft")))
                .ok_or("Minecraft folder not set")?;
            let msg = minecraft::restore_latest(&dir)?;
            emit(format!("- {msg}"));
            let mut l = ctx.ledger.lock().unwrap();
            l.release(id);
            l.save();
            return Ok((0, None));
        }
        if entry.as_ref().is_some_and(|e| e.backup) {
            // retiré d'applied.json seulement une fois remis : une remise coupée reprend au lancement suivant
            let back = ctx.ledger.lock().unwrap().releasable(id);
            let (rest, rest_first) = undo.map(|u| (u.rest, u.rest_avant)).unwrap_or_default();
            let put_back = || -> Result<(i32, Option<String>), String> {
                let mut code = 0;
                let run_rest = |code: &mut i32| -> Result<(), String> {
                    if let Some(rest) = &rest {
                        emit("- Putting back the Windows values for the network and system commands".into());
                        *code = self.run_batch(ctx, &format!("{id}-undo"), None, rest, emit)?.0;
                    }
                    Ok(())
                };
                // plans d'alimentation supprimés : recréés avant que la sauvegarde réactive celui d'avant
                if rest_first {
                    run_rest(&mut code)?;
                }
                emit(format!("- Putting back {} settings as they were before this tweak", back.len()));
                let mut errors = 0;
                for e in &back {
                    if let Err(err) = sys.restore(&e.probe, &e.before) {
                        errors += 1;
                        emit(format!("! {}: {err}", describe(&e.probe)));
                    }
                }
                if !rest_first {
                    run_rest(&mut code)?;
                }
                if errors > 0 {
                    return Ok((if code == 0 { 1 } else { code }, Some(format!("{errors} settings couldn't be put back"))));
                }
                Ok((code, None))
            };
            let r = put_back();
            // arrêté en route (bouton Arrêter, délai de la désinstallation) : le réglage reste appliqué, la prochaine
            // annulation reprend tout depuis la sauvegarde
            if !self.cancel.load(Ordering::SeqCst) {
                let mut l = ctx.ledger.lock().unwrap();
                l.release(id);
                l.save();
            }
            return r;
        }
        // pas de sauvegarde (appliqué avant 1.1.6, ou par l'ancien .bat) : valeurs de Windows
        let script = undo.and_then(|u| u.full).or_else(|| {
            catalog::revert_variant(id).and_then(|v| catalog::script(id, Some(&v), None))
        });
        let Some(script) = script else {
            return Err("This tweak can't be undone automatically yet. Use the restore point in the Restore module.".into());
        };
        emit("- Putting back the Windows default values".into());
        let r = self.run_batch(ctx, &format!("{id}-undo"), None, &script, emit)?;
        if !self.cancel.load(Ordering::SeqCst) {
            let mut l = ctx.ledger.lock().unwrap();
            l.release(id);
            l.save();
        }
        Ok(r)
    }

    fn run_batch(&self, ctx: &Context, name: &str, variant: Option<&str>, script: &str, emit: &dyn Fn(String)) -> Result<(i32, Option<String>), String> {
        let path = write_script(&ctx.run_dir, name, variant, script)?;
        let mut cmd = shell::hidden("cmd.exe");
        cmd.args(["/d", "/c"]).arg(&path);
        cmd.env("RAGO_RES", &ctx.resource_dir);
        cmd.env("adapter_name", ctx.adapter.clone().unwrap_or_default());
        cmd.current_dir(&ctx.run_dir);
        let res = self.stream(cmd, emit);
        let _ = fs::remove_file(&path);
        res
    }

    /// Exécute un réglage. Ok((code de sortie, message éventuel)).
    fn run_item(&self, ctx: &Context, item: &RunItem, emit: &dyn Fn(String)) -> Result<(i32, Option<String>), String> {
        match item.id.as_str() {
            "mc_optifine" => {
                let params = item.params.as_ref().ok_or("Missing OptiFine settings")?;
                let dir = params
                    .get("dir")
                    .and_then(|d| d.as_str())
                    .map(PathBuf::from)
                    .or_else(|| std::env::var("APPDATA").ok().map(|a| PathBuf::from(a).join(".minecraft")))
                    .ok_or("Minecraft folder not set")?;
                let values: BTreeMap<String, String> = params
                    .get("values")
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .ok_or("Missing OptiFine values")?;
                emit(format!("- Folder: {}", dir.display()));
                let msg = minecraft::apply(&dir, &values, now_ms())?;
                emit(format!("- {msg}"));
                Ok((0, None))
            }
            "nv_profile" => {
                let exe = ctx.resource_dir.join("nvidiaProfileInspector.exe");
                let nip = ctx.resource_dir.join("extremelatencylow.nip");
                if !exe.exists() || !nip.exists() {
                    return Err("NVIDIA Profile Inspector or the .nip profile is missing from the app folder".into());
                }
                emit("- Importing the extremelatencylow.nip profile into the NVIDIA driver".into());
                let mut cmd = shell::hidden(&exe.to_string_lossy());
                cmd.arg(&nip).arg("-silentImport");
                self.stream(cmd, emit)
            }
            "rst_point" => {
                emit("- Turning on System Restore for the Windows drive".into());
                let mut cmd = shell::hidden("powershell.exe");
                cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", RESTORE_POINT_PS]);
                self.stream(cmd, emit)
            }
            id => {
                let script = catalog::script(id, item.variant.as_deref(), ctx.premium.as_deref())
                    .ok_or_else(|| format!("Unknown tweak: {id}"))?;
                self.run_batch(ctx, id, item.variant.as_deref(), &script, emit)
            }
        }
    }

    /// Lance la commande, relaie stdout et stderr ligne par ligne, attend la fin.
    fn stream(&self, mut cmd: Command, emit: &dyn Fn(String)) -> Result<(i32, Option<String>), String> {
        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
        let mut child: Child = cmd.spawn().map_err(|e| format!("Couldn't start: {e}"))?;
        *self.child.lock().unwrap() = Some(child.id());
        let stderr = child.stderr.take();
        let (tx, rx) = std::sync::mpsc::channel::<String>();
        let tx2 = tx.clone();
        let err_thread = stderr.map(|s| std::thread::spawn(move || pump(s, tx2)));
        let stdout = child.stdout.take();
        let out_thread = stdout.map(|s| std::thread::spawn(move || pump(s, tx)));
        for line in rx {
            emit(line);
        }
        if let Some(t) = out_thread {
            let _ = t.join();
        }
        if let Some(t) = err_thread {
            let _ = t.join();
        }
        let status = child.wait().map_err(|e| e.to_string())?;
        *self.child.lock().unwrap() = None;
        Ok((status.code().unwrap_or(-1), None))
    }
}

struct TwinRun {
    ok: bool,
    code: Option<i32>,
    message: Option<String>,
    /// réglage lancé pour le groupe
    first: String,
    probes: Option<Vec<String>>,
}

/// Élément remis, pour le journal.
fn describe(p: &Probe) -> String {
    match p {
        Probe::Reg { key, name } => format!("{key}\\{name}"),
        Probe::RegKey { key } | Probe::RegVals { key } | Probe::RegTree { key } => key.clone(),
        Probe::Bcd { name, .. } => format!("boot setting {name}"),
        Probe::Task { path } => format!("task {path}"),
        Probe::Pwr { setting, .. } => format!("power setting {setting}"),
        Probe::PwrActive => "power plan".into(),
        Probe::Hib => "hibernation".into(),
    }
}

fn pump<R: Read>(r: R, tx: std::sync::mpsc::Sender<String>) {
    let mut reader = BufReader::new(r);
    let mut buf = Vec::new();
    loop {
        buf.clear();
        match reader.read_until(b'\n', &mut buf) {
            Ok(0) | Err(_) => break,
            Ok(_) => {
                let line = decode(&buf);
                let line = line.trim_end_matches(['\r', '\n']).to_string();
                if !line.trim().is_empty() && tx.send(line).is_err() {
                    break;
                }
            }
        }
    }
}

/// Les outils Windows écrivent en UTF-8 après `chcp 65001`, mais certains gardent la page
/// OEM 850. On tente l'UTF-8, sinon on décode en CP850 pour garder les accents lisibles.
fn decode(bytes: &[u8]) -> String {
    match std::str::from_utf8(bytes) {
        Ok(s) => s.to_string(),
        Err(_) => bytes.iter().map(|&b| cp850(b)).collect(),
    }
}

fn cp850(b: u8) -> char {
    const HIGH: &str = "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´\u{ad}±‗¾¶§÷¸°¨·¹³²■\u{a0}";
    if b < 0x80 {
        b as char
    } else {
        HIGH.chars().nth((b - 0x80) as usize).unwrap_or('?')
    }
}

const PREAMBLE: &str = "@echo off\r\nchcp 65001 >nul\r\nsetlocal EnableExtensions EnableDelayedExpansion\r\n";

fn write_script(dir: &Path, id: &str, variant: Option<&str>, body: &str) -> Result<PathBuf, String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let name = format!("{}{}-{}.cmd", id, variant.map(|v| format!("-{v}")).unwrap_or_default(), now_ms());
    let path = dir.join(sanitize(&name));
    let body = body.replace("\r\n", "\n").replace('\n', "\r\n");
    let content = format!("{PREAMBLE}{body}\r\nexit /b 0\r\n");
    fs::write(&path, content).map_err(|e| format!("Couldn't write the script: {e}"))?;
    Ok(path)
}

fn sanitize(s: &str) -> String {
    s.chars().map(|c| if c.is_ascii_alphanumeric() || "-_.".contains(c) { c } else { '_' }).collect()
}

const RESTORE_POINT_PS: &str = r#"$ErrorActionPreference = 'Stop'
try { Enable-ComputerRestore -Drive "$env:SystemDrive\" } catch { Write-Output "- System Restore already on or locked" }
New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore' -Name 'SystemRestorePointCreationFrequency' -Value 0 -PropertyType DWord -Force | Out-Null
Write-Output "- Creating the Rago Optimizer restore point"
Checkpoint-Computer -Description 'Rago Optimizer' -RestorePointType 'MODIFY_SETTINGS'
Write-Output "- Restore point created"
"#;

/// Ce qui modifie Windows ou les fichiers, donc attend le point de restauration quand il est demandé (tout sauf le
/// point lui-même et les deux actions qui ouvrent une fenêtre de Windows).
pub fn changes_windows(id: &str) -> bool {
    !matches!(id, "rst_point" | "rst_open" | "app_settings")
}

/// Réglages lancés par le moteur lui-même, sans script.
pub fn is_native(id: &str) -> bool {
    matches!(id, "mc_optifine" | "nv_profile" | "rst_point")
}

pub fn ensure_dir(p: &Path) {
    let _ = fs::create_dir_all(p);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_cp850_fallback() {
        assert_eq!(decode("déjà".as_bytes()), "déjà");
        assert_eq!(decode(&[0x82, b't', 0x82]), "été");
    }

    #[test]
    fn script_file_uses_crlf_and_preamble() {
        let dir = std::env::temp_dir().join("rago-test-run");
        let p = write_script(&dir, "test", Some("a b"), "echo 1\necho 2").unwrap();
        let s = fs::read_to_string(&p).unwrap();
        assert!(s.starts_with("@echo off\r\n"));
        assert!(s.contains("echo 1\r\necho 2\r\nexit /b 0\r\n"));
        assert!(p.file_name().unwrap().to_str().unwrap().starts_with("test-a_b-"));
        fs::remove_file(p).unwrap();
    }

    fn test_ctx(name: &str, stop_when: Option<Arc<dyn Fn() -> bool + Send + Sync>>) -> Context {
        let dir = std::env::temp_dir().join(format!("rago-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let mut ledger = Ledger::default();
        ledger.set_applied("net_a", None, true, true, vec![], 1);
        ledger.set_applied("net_b", None, true, true, vec![], 2);
        Context {
            app: None,
            history: Arc::new(History::load(dir.join("history.json"))),
            resource_dir: dir.join("resources"),
            logs_dir: dir.join("logs"),
            run_dir: dir.join("run"),
            backup_dir: dir.join("backup"),
            adapter: None,
            ledger: Arc::new(Mutex::new(ledger)),
            premium: None,
            stop_when,
        }
    }

    fn undo(id: &str) -> RunItem {
        RunItem { id: id.into(), variant: None, params: None, undo: true }
    }

    #[test]
    fn reset_stops_when_the_license_comes_back() {
        let ctx = test_ctx("stop", Some(Arc::new(|| true)));
        let (ok, failed) = Runner::default().run_now(&ctx, &[undo("net_b"), undo("net_a")]);
        assert_eq!((ok, failed), (0, 0), "rien n'est lancé");
        assert_eq!(ctx.ledger.lock().unwrap().tweaks.len(), 2, "les réglages restent appliqués");
        assert!(ctx.history.all().is_empty());
    }

    #[test]
    fn reset_puts_back_and_releases_each_tweak() {
        let ctx = test_ctx("release", None);
        let (ok, failed) = Runner::default().run_now(&ctx, &[undo("net_b"), undo("net_a"), undo("net_a")]);
        assert_eq!((ok, failed), (3, 0), "le second net_a est déjà remis : rien à faire");
        assert!(ctx.ledger.lock().unwrap().tweaks.is_empty());
        assert_eq!(ctx.history.all().len(), 2);
    }

    /// M1 (revue du 2026-10-13) : défaire le RBW Mod « Désactivé » de cette version (décoché, Tout annuler, déconnexion,
    /// fin de Premium, désinstallation) ne lance rien, il avait déjà remis les valeurs de Windows. « Activé » ne tourne
    /// que sur un clic, ou pour une entrée d'une version d'avant. Sous Linux, lancer un script échoue (pas de cmd.exe) :
    /// un lot réussi prouve que rien n'a été lancé.
    #[test]
    fn rbw_off_is_forgotten_without_running_on() {
        let ctx = test_ctx("rbw", None);
        let rbw = |variant: &str, undo: bool| RunItem { id: "rbw_mode".into(), variant: Some(variant.into()), params: None, undo };
        let runner = Runner::default();
        // « Désactivé » : noté appliqué sans sauvegarde, avec « valeurs de Windows » (même raté ici, faute de script)
        runner.run_now(&ctx, &[rbw("off", false)]);
        {
            let l = ctx.ledger.lock().unwrap();
            let a = &l.tweaks["rbw_mode"];
            assert!(!a.backup && a.windows_values && a.variant.as_deref() == Some("off"));
            assert!(l.views(&|_| backup::Saved::Unknown).iter().any(|v| v.id == "rbw_mode" && v.windows_values));
        }
        // défait sans clic (remise à zéro : variante inconnue) : rien n'est lancé, l'entrée part, l'historique dit « annulé »
        let (ok, failed) = runner.run_now(&ctx, &reset_item("rbw_mode"));
        assert_eq!((ok, failed), (1, 0), "aucun script lancé");
        assert!(!ctx.ledger.lock().unwrap().tweaks.contains_key("rbw_mode"));
        let last = ctx.history.all().into_iter().max_by_key(|e| e.ts).unwrap();
        assert!(last.id == "rbw_mode" && last.undo && last.ok && last.variant.as_deref() == Some("off"), "{last:?}");
        let log = fs::read_dir(&ctx.logs_dir).unwrap().filter_map(|e| fs::read_to_string(e.ok()?.path()).ok()).collect::<String>();
        assert!(log.contains("nothing to undo"), "{log}");

        // clic sur « Activé » alors que « Désactivé » est appliqué : « Activé » est lancé (ici il échoue, faute de cmd.exe)
        ctx.ledger.lock().unwrap().tweaks.insert("rbw_mode".into(), backup::Applied { variant: Some("off".into()), windows_values: true, ..Default::default() });
        let (_, failed) = runner.run_now(&ctx, &[rbw("on", false)]);
        assert_eq!(failed, 1, "« Activé » a été lancé");
        let last = ctx.history.all().into_iter().max_by_key(|e| e.ts).unwrap();
        assert!(last.variant.as_deref() == Some("on") && !last.undo, "{last:?}");

        // entrées d'une version d'avant : sauvegarde de 1.1.9, ou ancien « Désactivé » noté d'après l'historique (il passait
        // des services en manuel) : leur retour arrière lance toujours « Activé »
        for backup in [true, false] {
            ctx.ledger.lock().unwrap().tweaks.insert("rbw_mode".into(), backup::Applied { variant: Some("off".into()), backup, ..Default::default() });
            let (_, failed) = runner.run_now(&ctx, &[rbw("off", true)]);
            assert_eq!(failed, 1, "backup={backup} : « Activé » a été lancé");
            let last = ctx.history.all().into_iter().max_by_key(|e| e.ts).unwrap();
            assert!(last.variant.as_deref() == Some("on") && !last.undo, "backup={backup} : {last:?}");
        }
        // une entrée d'avant n'a jamais « valeurs de Windows » (champ absent du fichier)
        let old: backup::Applied = serde_json::from_str(r#"{"variant":"off","ts":1,"ok":true,"backup":false}"#).unwrap();
        assert!(!old.windows_values);
    }

    fn reset_item(id: &str) -> Vec<RunItem> {
        crate::reset::items(vec![id.to_string()])
    }

    #[test]
    fn stopped_undo_keeps_the_tweak_applied() {
        let ctx = test_ctx("cancel", None);
        let runner = Runner::default();
        runner.cancel();
        let sys = Sys::new(ctx.backup_dir.clone());
        assert!(runner.undo_item(&ctx, &sys, &undo("net_a"), &|_| {}).is_ok());
        assert!(ctx.ledger.lock().unwrap().tweaks.contains_key("net_a"), "arrêté en route : à remettre de nouveau");
    }
}
