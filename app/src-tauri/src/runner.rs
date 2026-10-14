//! Exécution des réglages : un lot à la fois, dans un thread, avec le journal envoyé à
//! l'interface ligne par ligne.
//!
//! Chaque script batch est écrit dans le dossier de données de l'app (sous-dossier run, hors de
//! %TEMP% : beaucoup de réglages vident %TEMP% et tuaient leur propre script) puis lancé par `cmd.exe /d /c .\nom.cmd`
//! depuis ce dossier (script_command), sans fenêtre, entrée standard fermée (un `pause` oublié ne bloque donc jamais).

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::Instant;

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

/// Envoi d'un événement à la fenêtre (lib.rs le relie à `AppHandle::emit`). Jamais `AppHandle` ici : les tests lancent
/// des lots, et sous Windows leur programme ne démarre plus s'il contient le code des fenêtres de Tauri (une fonction
/// de comctl32 v6 qu'il ne trouve pas sans le manifeste de l'app : STATUS_ENTRYPOINT_NOT_FOUND).
pub type Emit = Arc<dyn Fn(&str, serde_json::Value) + Send + Sync>;

pub struct Context {
    /// fenêtre qui suit le lot ; None pour la remise à zéro (fin de Premium, désinstallation), qui ne montre rien
    pub app: Option<Emit>,
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
    fn emit<S: Serialize>(&self, event: &str, payload: S) {
        if let Some(app) = &self.app {
            if let Ok(payload) = serde_json::to_value(payload) {
                app(event, payload);
            }
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
                        let snap = if keep { self.snapshot(ctx, &sys, item, &emit_line) } else { None };
                        let result = self.run_item(ctx, item, &emit_line);
                        let cancelled = self.cancel.load(Ordering::SeqCst);
                        let r = match result {
                            Ok((code, msg)) => (code == 0 && !cancelled, Some(code), msg),
                            Err(e) => (false, None, Some(e)),
                        };
                        let ids = snap.map(|(probes, pre)| {
                            sys.forget_active();
                            // valeurs posées par l'app : registre (dérive) et états (seul ce que l'app a changé revient)
                            let after: Vec<(Probe, backup::Saved)> = probes
                                .iter()
                                .filter(|p| matches!(p, Probe::Reg { .. } | Probe::State { .. }))
                                .map(|p| (p.clone(), sys.read(p)))
                                .collect();
                            let mut l = ctx.ledger.lock().unwrap();
                            for (p, now) in after {
                                match pre.get(&p.id()) {
                                    Some(before_run) => l.merge_state_after(&p.id(), before_run, &now),
                                    None => l.set_after(&p.id(), now),
                                }
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
                        } else if catalog::revert_runs_script(&item.id) && r.0 {
                            // RBW Mod « Activé » allé au bout : il n'est plus « appliqué » (« Désactivé » l'était). Arrêté
                            // ou pas démarré (r.0 faux : le script finit toujours par exit /b 0), « Désactivé » reste noté :
                            // la ligne ne dit pas « Activé depuis… », et la remise de fin de Premium le retentera
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
    /// Renvoie aussi, pour les états déjà gardés par un autre réglage, leur valeur juste avant ce script.
    fn snapshot(&self, ctx: &Context, sys: &Sys, item: &RunItem, emit: &dyn Fn(String)) -> Option<(Vec<Probe>, HashMap<String, backup::Saved>)> {
        let variant = item.variant.as_deref();
        // profil NVIDIA importé par l'app elle-même : réglages du profil de base lus par NVAPI
        let script = if item.id == "nv_profile" {
            "echo @@RAGO state \"nvbase\"".to_string()
        } else {
            catalog::probe(&item.id, variant, ctx.premium.as_deref())?
        };
        let mut probes = if item.id == "nv_profile" {
            backup::parse_markers(&script)
        } else if script.contains("@@RAGO") {
            let path = write_script(&ctx.run_dir, &format!("{}-probe", item.id), variant, &script).ok()?;
            let out = script_command(ctx, &path).ok().and_then(|mut cmd| cmd.output().ok());
            let _ = fs::remove_file(&path);
            backup::parse_markers(&decode(&out?.stdout))
        } else {
            Vec::new()
        };
        let (missing, shared): (Vec<Probe>, Vec<Probe>) = {
            let l = ctx.ledger.lock().unwrap();
            // réglage déjà appliqué par une version sans ce relevé d'état : ce qu'on lirait maintenant est déjà son
            // effet. Il garde l'ancien retour (rest, valeurs de Windows) pour cet état.
            if let Some(a) = l.tweaks.get(&item.id) {
                probes.retain(|p| !matches!(p, Probe::State { .. } | Probe::Untouched { .. }) || a.probes.contains(&p.id()));
            }
            // état que ce script ne change pas : seulement noté pour rest, rien à lire ni à garder
            probes.iter().filter(|p| !matches!(p, Probe::Untouched { .. })).cloned().partition(|p| !l.has(&p.id()))
        };
        // lu hors du verrou : bcdedit, powercfg et PowerShell prennent un moment
        let read: Vec<(Probe, backup::Saved)> = missing.into_iter().map(|p| { let s = sys.read(&p); (p, s) }).collect();
        // états déjà gardés par un autre réglage : leur valeur juste avant ce script (voir Ledger::merge_state_after)
        let pre: HashMap<String, backup::Saved> = shared
            .iter()
            .filter(|p| matches!(p, Probe::State { .. }))
            .map(|p| (p.id(), sys.read(p)))
            .collect();
        {
            let mut l = ctx.ledger.lock().unwrap();
            for (p, saved) in read.iter().cloned() {
                l.record_before(p, saved);
            }
            l.save();
        }
        let saved = probes.iter().filter(|p| !matches!(p, Probe::Untouched { .. })).count();
        if saved > 0 {
            emit(format!("- Saved how {saved} settings were before, to put them back if you turn this off"));
        }
        Some((probes, pre))
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
            let msg = minecraft::undo(&dir)?;
            emit(format!("- {msg}"));
            let mut l = ctx.ledger.lock().unwrap();
            l.release(id);
            l.save();
            return Ok((0, None));
        }
        // valeurs qu'un autre réglage encore appliqué modifie aussi : full, et rest pour la compression mémoire
        // (RAGO_HELD_…), les laissent telles quelles. Sauf le RBW Mod « Désactivé » : il ne pose que des valeurs de
        // Windows (celles que full remet) et ne garde rien pour les autres, comme il ne relève rien (RAG-69)
        let held = {
            let others = others_writes(&ctx.ledger.lock().unwrap(), id, ctx.premium.as_deref());
            held_env(undo.as_ref().map(|u| u.writes.as_slice()).unwrap_or_default(), &others)
        };
        if let Some(entry) = entry.as_ref().filter(|e| e.backup) {
            // retiré d'applied.json seulement une fois remis : une remise coupée reprend au lancement suivant
            let (back, env) = {
                let l = ctx.ledger.lock().unwrap();
                // états relevés avant d'appliquer (remis au plus près par la sauvegarde) : rest ne les touche pas
                let mut env = state_env(&entry.probes, &l.saved);
                env.extend(held.iter().cloned());
                (l.releasable(id), env)
            };
            let (rest, rest_first) = undo.map(|u| (u.rest, u.rest_avant)).unwrap_or_default();
            let put_back = || -> Result<(i32, Option<String>), String> {
                let mut code = 0;
                let run_rest = |code: &mut i32| -> Result<(), String> {
                    if let Some(rest) = &rest {
                        emit("- Putting back the Windows values for the network and system commands".into());
                        *code = self.run_batch(ctx, &format!("{id}-undo"), None, rest, &env, emit)?.0;
                    }
                    Ok(())
                };
                emit(format!("- Putting back {} settings as they were before this tweak", back.len()));
                let mut errors = 0;
                let mut restore = |e: &backup::SavedEntry| {
                    if e.before == backup::Saved::Unknown {
                        // relevé illisible (pas de pilote NVIDIA, PowerShell bloqué…) : rien de sûr à remettre
                        emit(format!("- {}: couldn't be read before this tweak, left as it is", describe(&e.probe)));
                        return;
                    }
                    if let Err(err) = sys.restore_entry(e) {
                        errors += 1;
                        emit(format!("! {}: {err}", describe(&e.probe)));
                    }
                };
                // plans d'alimentation exportés : réimportés d'abord, rest ne les recrée alors pas avec les valeurs de
                // Windows ; puis rest (rest_avant) avant que la sauvegarde réactive le plan d'avant
                back.iter().filter(|e| matches!(e.probe, Probe::Plan { .. })).for_each(&mut restore);
                if rest_first {
                    run_rest(&mut code)?;
                }
                back.iter()
                    .filter(|e| !matches!(e.probe, Probe::Plan { .. } | Probe::State { .. } | Probe::Appx { .. }))
                    .for_each(&mut restore);
                // états en dernier : services (SysMain) et registre déjà remis
                back.iter().filter(|e| matches!(e.probe, Probe::State { .. })).for_each(&mut restore);
                // applis du Store : remises ensemble à la fin, dans un seul PowerShell
                let (mut exact, mut patterns) = (Vec::new(), Vec::new());
                for e in &back {
                    match (&e.probe, &e.before) {
                        (Probe::Appx { .. }, backup::Saved::Apps { packages }) => exact.extend(packages.iter().cloned()),
                        // relevé illisible : les applis de ce nom que Windows garde encore
                        (Probe::Appx { name }, _) => patterns.push(name.clone()),
                        _ => {}
                    }
                }
                // appliqué avant le relevé des applis (version d'avant) : celles de la liste du réglage
                if !entry.probes.iter().any(|p| p.starts_with("appx|")) {
                    patterns.extend(unclaimed_apps(ctx, id));
                }
                let apps_error = self.put_back_apps(sys, &exact, &patterns, emit);
                if !rest_first {
                    run_rest(&mut code)?;
                }
                if errors > 0 {
                    return Ok((if code == 0 { 1 } else { code }, Some(format!("{errors} settings couldn't be put back"))));
                }
                if let Some(e) = apps_error {
                    return Ok((if code == 0 { 1 } else { code }, Some(e)));
                }
                Ok((code, None))
            };
            let r = put_back();
            // arrêté en route (bouton Arrêter, délai de la désinstallation), ou rest pas lancé (script pas écrit, cmd.exe
            // pas démarré : avec rest_avant, rien n'a encore été remis) : le réglage reste appliqué, la prochaine
            // annulation reprend tout depuis la sauvegarde
            if r.is_ok() && !self.cancel.load(Ordering::SeqCst) {
                let mut l = ctx.ledger.lock().unwrap();
                l.release(id);
                l.save();
            }
            return r;
        }
        // pas de sauvegarde (appliqué avant 1.1.6, ou par l'ancien .bat) : valeurs de Windows, sauf celles qu'un autre
        // réglage encore appliqué modifie aussi (held)
        let script = undo.and_then(|u| u.full).or_else(|| {
            catalog::revert_variant(id).and_then(|v| catalog::script(id, Some(&v), None))
        });
        // applis du Store de la liste du réglage (ancienne action ponctuelle, ou appliqué avant le relevé des applis)
        if script.is_none() && catalog::apps_of(id).is_empty() {
            if id == "nv_profile" {
                return Err("This NVIDIA profile was imported by an older version, before its settings were saved. \
                            Use \"Restore\" on the Base Profile in NVIDIA Profile Inspector, or the restore point."
                    .into());
            }
            return Err("This tweak can't be undone automatically yet. Use the restore point in the Restore module.".into());
        }
        let apps = unclaimed_apps(ctx, id);
        if apps.len() < catalog::apps_of(id).len() {
            emit("- Some of its Microsoft Store apps stay removed: another tweak that is still on removes them too".into());
        }
        let mut r = (0, None);
        if let Some(script) = script {
            emit("- Putting back the Windows default values".into());
            if !held.is_empty() {
                emit(format!("- Keeping {} settings that another applied tweak also changes", held.len()));
            }
            r = self.run_batch(ctx, &format!("{id}-undo"), None, &script, &held, emit)?;
        }
        if let Some(e) = self.put_back_apps(sys, &[], &apps, emit) {
            r = (if r.0 == 0 { 1 } else { r.0 }, Some(e));
        }
        if !self.cancel.load(Ordering::SeqCst) {
            let mut l = ctx.ledger.lock().unwrap();
            l.release(id);
            l.save();
        }
        Ok(r)
    }

    /// Réenregistre les applis du Store désinstallées par le réglage. Renvoie l'erreur à afficher s'il en manque.
    fn put_back_apps(&self, sys: &Sys, exact: &[backup::AppxPkg], patterns: &[String], emit: &dyn Fn(String)) -> Option<String> {
        if exact.is_empty() && patterns.is_empty() {
            return None;
        }
        emit("- Putting back the Microsoft Store apps this tweak removed (no download needed)".into());
        match sys.put_back_apps(exact, patterns) {
            Ok(r) => {
                for name in &r.back {
                    emit(format!("- Put back {name}"));
                }
                if r.back.is_empty() && r.missing.is_empty() {
                    emit("- Nothing to put back: these apps are already installed".into());
                }
                r.error().inspect(|e| emit(format!("! {e}")))
            }
            Err(e) => {
                emit(format!("! {e}"));
                Some(e)
            }
        }
    }

    fn run_batch(
        &self,
        ctx: &Context,
        name: &str,
        variant: Option<&str>,
        script: &str,
        env: &[(String, String)],
        emit: &dyn Fn(String),
    ) -> Result<(i32, Option<String>), String> {
        let path = write_script(&ctx.run_dir, name, variant, script)?;
        let res = batch_command(ctx, &path, env).and_then(|cmd| self.stream(cmd, emit));
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
                let already = ctx.ledger.lock().unwrap().tweaks.contains_key("mc_optifine");
                let msg = minecraft::apply(&dir, &values, now_ms(), already)?;
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
                self.run_batch(ctx, id, item.variant.as_deref(), &script, &[], emit)
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

/// Applis du Store de la liste du réglage qu'aucun autre réglage encore appliqué ne désinstalle aussi : elles peuvent
/// revenir quand on éteint celui-ci.
fn unclaimed_apps(ctx: &Context, id: &str) -> Vec<String> {
    let l = ctx.ledger.lock().unwrap();
    let others: std::collections::HashSet<String> = l
        .tweaks
        .keys()
        .filter(|t| t.as_str() != id)
        .flat_map(|t| catalog::apps_of(t).iter().map(|a| a.to_lowercase()))
        .collect();
    catalog::apps_of(id).iter().filter(|a| !others.contains(&a.to_lowercase())).cloned().collect()
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
        Probe::Plan { guid } => format!("deleted power plan {guid}"),
        Probe::State { name } => match name.as_str() {
            "mmagent" => "memory compression and app prelaunch".into(),
            "maxpwage" => "maximum password age".into(),
            "smb" => "file sharing (SMB) settings".into(),
            "nic" => "network adapter properties".into(),
            "pnppower" => "\"Allow the computer to turn off this device\" boxes".into(),
            "nvbase" => "NVIDIA global 3D settings".into(),
            other => other.to_string(),
        },
        Probe::Appx { name } => format!("Microsoft Store apps {name}"),
        Probe::Untouched { name } => format!("{name} (not changed by this tweak)"),
        Probe::Other => "setting saved by a newer version".into(),
    }
}

/// Variables d'environnement de `rest` : RAGO_STATE_<NOM> pour chaque état relevé avant d'appliquer le réglage
/// (la sauvegarde le remet au plus près, rest ne doit plus le remettre aux valeurs de Windows), et pour chaque état
/// que le script appliqué ne changeait pas (`untouched|…` : rien à remettre).
pub fn state_env(probes: &[String], saved: &[(String, backup::SavedEntry)]) -> Vec<(String, String)> {
    let read = probes.iter().filter_map(|p| p.strip_prefix("state|")).filter(|name| {
        saved.iter().any(|(id, e)| id == &format!("state|{name}") && matches!(e.before, backup::Saved::State { .. }))
    });
    let untouched = probes.iter().filter_map(|p| p.strip_prefix("untouched|"));
    read.chain(untouched).map(|name| (format!("RAGO_STATE_{}", name.to_uppercase()), "1".to_string())).collect()
}

/// Fonctions de la gestion mémoire (Get-MMAgent) partagées entre réglages (build_catalog_v6.mmagent_ids).
const MM_FLAGS: [&str; 5] = ["memorycompression", "pagecombining", "applicationprelaunch", "operationapi", "applicationlaunchprefetching"];

/// Étiquette `writes` d'un élément partagé (build_catalog_v6.held_tag) : 10 chiffres hexadécimaux de son SHA-256.
pub fn held_tag(id: &str) -> String {
    use sha2::{Digest, Sha256};
    backup::hex(&Sha256::digest(id.as_bytes())[..5])
}

/// Étiquettes qu'un autre réglage encore appliqué garde : celles de undo.json (`writes`, valeurs que ses scripts
/// modifient, toutes versions confondues), sauf la gestion mémoire quand son relevé dit que le script qui a tourné
/// n'y touchait pas (`untouched|mmagent`, hitreg_suite) : sinon décocher « Profil mémoire » laisserait la compression
/// coupée, et décocher ensuite la suite ne la remettrait pas non plus.
pub fn holds(a: &backup::Applied, writes: Vec<String>) -> Vec<String> {
    if !a.probes.iter().any(|p| p == "untouched|mmagent") {
        return writes;
    }
    let mm: Vec<String> = MM_FLAGS.iter().map(|f| held_tag(&format!("mmagent|{f}"))).collect();
    writes.into_iter().filter(|t| !mm.contains(t)).collect()
}

/// Étiquettes `writes` des autres réglages encore appliqués (voir `holds`). Le RBW Mod n'en garde aucune : il ne pose
/// que des valeurs de Windows, celles que full remet, et ne relève rien (RAG-69).
pub fn others_writes(l: &Ledger, id: &str, premium: Option<&catalog::Bundle>) -> Vec<Vec<String>> {
    l.tweaks
        .iter()
        .filter(|(t, _)| t.as_str() != id && !catalog::revert_runs_script(t))
        .filter_map(|(t, a)| {
            let u = catalog::undo_of(t, a.variant.as_deref(), premium).or_else(|| a.undo.clone())?;
            Some(holds(a, u.writes))
        })
        .collect()
}

/// Variables d'environnement de `full` et de `rest` : RAGO_HELD_<étiquette> pour chaque valeur que ce réglage modifie
/// et qu'un autre réglage encore appliqué modifie aussi (`writes` de undo.json) : l'annulation la laisse telle quelle.
pub fn held_env(mine: &[String], others: &[Vec<String>]) -> Vec<(String, String)> {
    let theirs: std::collections::HashSet<&String> = others.iter().flatten().collect();
    mine.iter().filter(|t| theirs.contains(t)).map(|t| (format!("RAGO_HELD_{t}"), "1".to_string())).collect()
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

/// cmd.exe qui lance un script écrit par write_script (relevé ou réglage), depuis son dossier. Sur la ligne de commande,
/// seulement `.\nom.cmd` : le dossier run est dans %APPDATA%, et un `&`, `(`, `)` ou `^` dans le nom du compte coupait
/// `cmd /d /c C:\Users\…\run\x.cmd` (sans espace, le chemin n'a pas de guillemets ; avec, cmd /c les retire dès qu'il y
/// voit un de ces caractères) : chaque réglage échouait. Le nom n'a que des lettres, chiffres, `-`, `_` et `.`
/// (sanitize), rien que cmd interprète, et `.\` le trouve dans le dossier courant même quand
/// NoDefaultCurrentDirectoryInExePath est posé. Le dossier passe par CreateProcess (dossier courant), jamais par la ligne
/// de commande.
fn script_command(ctx: &Context, path: &Path) -> Result<Command, String> {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty() && n.chars().all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c)))
        .ok_or_else(|| format!("Unexpected script name: {}", path.display()))?;
    let dir = path.parent().ok_or("Script without a folder")?;
    let mut cmd = shell::hidden("cmd.exe");
    cmd.args(["/d", "/c"]).arg(format!(".\\{name}"));
    cmd.env("RAGO_RES", &ctx.resource_dir);
    cmd.env("adapter_name", ctx.adapter.clone().unwrap_or_default());
    cmd.current_dir(dir);
    Ok(cmd)
}

/// script_command, plus les variables RAGO_STATE_<NOM> et RAGO_HELD_<étiquette> de ce lancement (state_env, held_env) :
/// elles passent par l'environnement du processus, jamais par la ligne de commande ; le script, et le PowerShell qu'il
/// lance, les lisent telles quelles.
fn batch_command(ctx: &Context, path: &Path, env: &[(String, String)]) -> Result<Command, String> {
    let mut cmd = script_command(ctx, path)?;
    // variables laissées par un lancement précédent de l'app : seules celles de cette annulation comptent
    for k in inherited_rago_vars(std::env::vars_os()) {
        cmd.env_remove(k);
    }
    cmd.envs(env.iter().map(|(k, v)| (k, v)));
    Ok(cmd)
}

/// Noms des variables RAGO_STATE_… et RAGO_HELD_… héritées, sans tenir compte de la casse (comme Windows et cmd). Lus
/// avec vars_os : vars() panique dès qu'une variable du PC n'est pas de l'Unicode valide, et l'exe release s'arrête net
/// (panic = "abort") à chaque réglage lancé.
fn inherited_rago_vars(vars: impl Iterator<Item = (std::ffi::OsString, std::ffi::OsString)>) -> Vec<std::ffi::OsString> {
    vars.map(|(k, _)| k)
        .filter(|k| {
            let k = k.to_string_lossy().to_ascii_uppercase();
            k.starts_with("RAGO_STATE_") || k.starts_with("RAGO_HELD_")
        })
        .collect()
}

fn sanitize(s: &str) -> String {
    s.chars().map(|c| if c.is_ascii_alphanumeric() || "-_.".contains(c) { c } else { '_' }).collect()
}

/// Windows ne crée qu'un point de restauration par 24 h : la limite (SystemRestorePointCreationFrequency) est levée le
/// temps de créer celui de Rago, puis remise telle qu'elle était, même si la création échoue (avant 1.1.9 elle restait
/// à 0 pour toujours, RAG-60). Un 0 déjà là est remis à 0 : « Latence avancée » (in_advanced) l'écrit exprès, et
/// le retirer ferait afficher « Changé par Windows » sur ce réglage.
const RESTORE_POINT_PS: &str = r#"$ErrorActionPreference = 'Stop'
try { Enable-ComputerRestore -Drive "$env:SystemDrive\" } catch { Write-Output "- System Restore already on or locked" }
$key = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore'
$name = 'SystemRestorePointCreationFrequency'
$old = (Get-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue).$name
New-ItemProperty -Path $key -Name $name -Value 0 -PropertyType DWord -Force | Out-Null
try {
    Write-Output "- Creating the Rago Optimizer restore point"
    Checkpoint-Computer -Description 'Rago Optimizer' -RestorePointType 'MODIFY_SETTINGS'
    Write-Output "- Restore point created"
} finally {
    if ($null -eq $old) { Remove-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue }
    else { Set-ItemProperty -Path $key -Name $name -Value $old }
}
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

    #[test]
    fn rest_skips_only_states_saved_for_this_tweak() {
        use backup::{Saved, SavedEntry};
        let entry = |name: &str, before: Saved| {
            (format!("state|{name}"), SavedEntry { probe: Probe::State { name: name.into() }, before, after: None })
        };
        let saved = vec![
            entry("mmagent", Saved::State { values: Default::default() }),
            // relevé illisible : rest garde la valeur de Windows
            entry("nic", Saved::Unknown),
            entry("smb", Saved::State { values: Default::default() }),
        ];
        // réglage appliqué par une version sans ce relevé : pas de state|smb dans ses éléments
        let probes = vec!["state|mmagent".to_string(), "state|nic".to_string(), "reg|hklm\\a|b".to_string()];
        assert_eq!(state_env(&probes, &saved), vec![("RAGO_STATE_MMAGENT".to_string(), "1".to_string())]);
        assert!(state_env(&[], &saved).is_empty());
        // état que le script appliqué ne changeait pas (hitreg_suite et la compression mémoire) : rien de gardé, rest
        // saute quand même sa commande
        let probes = vec!["untouched|maxpwage".to_string()];
        assert_eq!(state_env(&probes, &saved), vec![("RAGO_STATE_MAXPWAGE".to_string(), "1".to_string())]);
    }

    /// Étiquettes de la gestion mémoire : les mêmes que tools/build_catalog_v6.py ; un réglage dont le script ne
    /// touchait pas la compression (untouched|mmagent) ne la garde pas pour les autres.
    #[test]
    fn memory_tags_follow_what_the_applied_script_did() {
        let comp = held_tag("mmagent|memorycompression");
        assert_eq!(comp, "e86e22276a");
        assert_eq!(held_tag("mmagent|pagecombining"), "82b2f0cc3a");
        let writes = vec![comp.clone(), "0123456789".to_string()];
        let applied = |probes: &[&str], backup: bool| backup::Applied {
            ok: true,
            backup,
            probes: probes.iter().map(|p| p.to_string()).collect(),
            ..Default::default()
        };
        assert_eq!(holds(&applied(&["untouched|mmagent", "reg|hklm\\a|b"], true), writes.clone()), vec!["0123456789".to_string()]);
        assert_eq!(holds(&applied(&["state|mmagent"], true), writes.clone()), writes);
        // sans sauvegarde (1.1.5 ou avant) ou avec une sauvegarde sans relevé d'état (1.1.6 à 1.1.8) : tout est gardé
        assert_eq!(holds(&applied(&[], false), writes.clone()), writes);
        assert_eq!(holds(&applied(&["reg|hklm\\a|b"], true), writes.clone()), writes);
    }

    /// Le RBW Mod « Désactivé » (valeurs de Windows seulement) ne garde rien pour les autres réglages (RAG-69).
    #[test]
    fn rbw_mode_holds_nothing_for_other_tweaks() {
        let mut l = Ledger::default();
        let with = |writes: &[&str]| backup::Applied {
            ok: true,
            undo: Some(backup::Undo { writes: writes.iter().map(|w| w.to_string()).collect(), ..Default::default() }),
            ..Default::default()
        };
        l.tweaks.insert("rbw_mode".into(), backup::Applied { variant: Some("off".into()), ..with(&["aaaaaaaaaa"]) });
        l.tweaks.insert("zz_other".into(), with(&["bbbbbbbbbb"]));
        assert_eq!(others_writes(&l, "zz_undone", None), vec![vec!["bbbbbbbbbb".to_string()]]);
        assert!(others_writes(&l, "zz_other", None).is_empty());
    }

    /// Un état seulement noté (`untouched`) ne fait pas du réglage un copropriétaire : décocher l'autre réglage qui
    /// l'a vraiment changé le remet tout de suite.
    #[test]
    fn untouched_state_does_not_hold_the_saved_state() {
        use backup::{Applied, Ledger, Saved};
        let mut l = Ledger::default();
        l.record_before(Probe::State { name: "mmagent".into() }, Saved::State { values: Default::default() });
        let applied = |probes: &[&str]| Applied { ok: true, backup: true, probes: probes.iter().map(|p| p.to_string()).collect(), ..Default::default() };
        l.tweaks.insert("sys_ram".into(), applied(&["state|mmagent"]));
        l.tweaks.insert("hitreg_suite".into(), applied(&["untouched|mmagent"]));
        let back = l.release("sys_ram");
        assert_eq!(back.len(), 1);
        assert_eq!(back[0].probe, Probe::State { name: "mmagent".into() });
        assert!(l.release("hitreg_suite").is_empty());
    }

    #[test]
    fn full_keeps_values_other_applied_tweaks_change() {
        let mine = vec!["aaaaaaaaaa".to_string(), "bbbbbbbbbb".to_string()];
        let others = vec![vec!["bbbbbbbbbb".to_string(), "cccccccccc".to_string()], vec![]];
        assert_eq!(held_env(&mine, &others), vec![("RAGO_HELD_bbbbbbbbbb".to_string(), "1".to_string())]);
        assert!(held_env(&mine, &[]).is_empty());
        assert!(held_env(&[], &others).is_empty());
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

    /// Chemin sous un fichier : rien ne peut s'y écrire, sous Windows comme ailleurs. Un test qui passe par un vrai
    /// réglage ne le lance donc jamais sur le PC qui fait tourner les tests (cargo test tourne aussi sur la CI Windows).
    fn unwritable(ctx: &Context, name: &str) -> PathBuf {
        let file = ctx.logs_dir.parent().unwrap().join(format!("{name}-is-a-file"));
        fs::create_dir_all(file.parent().unwrap()).unwrap();
        fs::write(&file, "x").unwrap();
        file.join(name)
    }

    /// Dossier run d'un compte « O'Brien & Co (x) ^1 %TEMP% !y! » : tout ce que cmd ou PowerShell pourrait lire.
    fn odd_ctx(name: &str) -> Context {
        let mut ctx = test_ctx(name, None);
        ctx.run_dir = ctx.run_dir.join("O'Brien & Co (x) ^1 %TEMP% !y!");
        ctx
    }

    /// Le dossier run (dans %APPDATA%, donc le nom du compte) n'entre jamais dans la ligne de commande de cmd : seulement
    /// `.\nom.cmd`, le dossier en dossier courant (revue du 2026-10-13, « Lancement des scripts »).
    #[test]
    fn scripts_start_by_name_from_their_folder() {
        let ctx = odd_ctx("launch");
        for (id, variant) in [("net_a", Some("on")), ("net_a-probe", None), ("O'Brien&(x)^", Some("a b"))] {
            let path = write_script(&ctx.run_dir, id, variant, "echo ok").unwrap();
            let name = path.file_name().unwrap().to_str().unwrap().to_string();
            assert!(name.chars().all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c)), "{name}");
            let cmd = script_command(&ctx, &path).unwrap();
            assert_eq!(cmd.get_program(), "cmd.exe");
            let args: Vec<String> = cmd.get_args().map(|a| a.to_string_lossy().into_owned()).collect();
            assert_eq!(args, ["/d".to_string(), "/c".to_string(), format!(".\\{name}")]);
            assert_eq!(cmd.get_current_dir(), Some(ctx.run_dir.as_path()));
            let envs: Vec<String> = cmd.get_envs().map(|(k, _)| k.to_string_lossy().into_owned()).collect();
            assert!(envs.contains(&"RAGO_RES".to_string()) && envs.contains(&"adapter_name".to_string()), "{envs:?}");
            fs::remove_file(path).unwrap();
        }
        // un nom que cmd lirait n'est jamais lancé
        assert!(script_command(&ctx, &ctx.run_dir.join("a&b.cmd")).is_err());
        assert!(script_command(&ctx, Path::new("")).is_err());
        let _ = fs::remove_dir_all(ctx.run_dir.parent().unwrap().parent().unwrap());
    }

    /// Sur Windows (CI) : le script se lance vraiment depuis ce dossier (`.\nom.cmd` n'est cherché que là).
    #[cfg(windows)]
    #[test]
    fn scripts_run_from_a_folder_with_special_characters() {
        let ctx = odd_ctx("launch-win");
        let path = write_script(&ctx.run_dir, "probe", None, "echo ok-%~nx0").unwrap();
        let name = path.file_name().unwrap().to_str().unwrap().to_string();
        let out = script_command(&ctx, &path).unwrap().output().unwrap();
        let text = decode(&out.stdout);
        let _ = fs::remove_dir_all(ctx.run_dir.parent().unwrap().parent().unwrap());
        assert!(out.status.success(), "{text}\n{}", decode(&out.stderr));
        assert!(text.lines().any(|l| l.trim() == format!("ok-{name}")), "{text}");
    }

    /// Retour arrière : les RAGO_STATE_… et RAGO_HELD_… de state_env et held_env partent avec le lancement `.\nom.cmd`
    /// (environnement du processus), le dossier et la ligne de commande restant ceux de script_command.
    #[test]
    fn undo_variables_go_with_the_script() {
        let ctx = odd_ctx("launch-env");
        let path = write_script(&ctx.run_dir, "net_a", Some("rest"), "echo ok").unwrap();
        let name = path.file_name().unwrap().to_str().unwrap().to_string();
        let env = vec![
            ("RAGO_STATE_MMAGENT".to_string(), "1".to_string()),
            ("RAGO_HELD_bbbbbbbbbb".to_string(), "1".to_string()),
        ];
        let cmd = batch_command(&ctx, &path, &env).unwrap();
        let args: Vec<String> = cmd.get_args().map(|a| a.to_string_lossy().into_owned()).collect();
        assert_eq!(args, ["/d".to_string(), "/c".to_string(), format!(".\\{name}")]);
        assert_eq!(cmd.get_current_dir(), Some(ctx.run_dir.as_path()));
        let envs: Vec<(String, Option<String>)> = cmd
            .get_envs()
            .map(|(k, v)| (k.to_string_lossy().into_owned(), v.map(|v| v.to_string_lossy().into_owned())))
            .collect();
        for (k, v) in &env {
            assert!(envs.contains(&(k.clone(), Some(v.clone()))), "{k} : {envs:?}");
        }
        assert!(envs.iter().any(|(k, v)| k == "RAGO_RES" && v.is_some()), "{envs:?}");
        // aucune autre variable RAGO_STATE_/RAGO_HELD_ n'est posée
        let rago = envs.iter().filter(|(k, v)| v.is_some() && (k.starts_with("RAGO_STATE_") || k.starts_with("RAGO_HELD_")));
        assert_eq!(rago.count(), 2, "{envs:?}");
        let _ = fs::remove_dir_all(ctx.run_dir.parent().unwrap().parent().unwrap());
    }

    /// Une variable du PC qui n'est pas de l'Unicode valide ne fait pas planter le lancement (vars() paniquait), et une
    /// RAGO_HELD_ héritée dans une autre casse est retirée elle aussi.
    #[test]
    fn inherited_variables_survive_invalid_unicode() {
        use std::ffi::OsString;
        #[cfg(windows)]
        let bad = {
            use std::os::windows::ffi::OsStringExt;
            OsString::from_wide(&[0x0041, 0xD800])
        };
        #[cfg(unix)]
        let bad = {
            use std::os::unix::ffi::OsStringExt;
            OsString::from_vec(vec![0x41, 0xFF])
        };
        assert!(bad.to_str().is_none(), "pas de l'Unicode valide");
        let vars = vec![
            (bad.clone(), OsString::from("1")),
            (OsString::from("PATH"), bad.clone()),
            (OsString::from("RAGO_STATE_MMAGENT"), bad.clone()),
            (OsString::from("Rago_Held_aaaaaaaaaa"), OsString::from("1")),
            (OsString::from("RAGO_RES"), OsString::from("x")),
        ];
        let names = inherited_rago_vars(vars.into_iter());
        assert_eq!(names, [OsString::from("RAGO_STATE_MMAGENT"), OsString::from("Rago_Held_aaaaaaaaaa")]);
    }

    /// Sur Windows (CI) : le script lancé par `.\nom.cmd` voit ces variables, et le PowerShell qu'il lance aussi.
    #[cfg(windows)]
    #[test]
    fn undo_variables_reach_the_script_and_powershell() {
        let ctx = odd_ctx("launch-env-win");
        let script = "if defined RAGO_HELD_bbbbbbbbbb (echo held-%RAGO_HELD_bbbbbbbbbb%) else (echo free)\r\n\
                      powershell -NoProfile -Command \"Write-Output ('ps-' + $env:RAGO_STATE_MMAGENT)\"";
        let path = write_script(&ctx.run_dir, "net_a", Some("rest"), script).unwrap();
        let env = vec![
            ("RAGO_STATE_MMAGENT".to_string(), "1".to_string()),
            ("RAGO_HELD_bbbbbbbbbb".to_string(), "1".to_string()),
        ];
        let out = batch_command(&ctx, &path, &env).unwrap().output().unwrap();
        let text = decode(&out.stdout);
        let _ = fs::remove_dir_all(ctx.run_dir.parent().unwrap().parent().unwrap());
        assert!(out.status.success(), "{text}\n{}", decode(&out.stderr));
        assert!(text.lines().any(|l| l.trim() == "held-1"), "{text}");
        assert!(text.lines().any(|l| l.trim() == "ps-1"), "{text}");
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

    /// m4 (revue finale du moteur) : la confirmation de déconnexion annonce `reset_plan`, la liste de la remise de fin de
    /// Premium, et non plus tous les réglages Premium appliqués. Le nombre annoncé est celui que la remise remet : un
    /// réglage appliqué avant 1.1.6 sans copie de son annulation reste appliqué, et n'est plus compté.
    #[test]
    fn sign_out_count_is_what_the_reset_puts_back() {
        let ctx = test_ctx("plan", None);
        {
            let mut l = ctx.ledger.lock().unwrap();
            l.set_applied("net_legacy", None, true, false, vec![], 3);
            l.set_applied("win_gamemode", None, true, true, vec![], 4);
        }
        let plan = crate::reset::targets(&ctx.ledger.lock().unwrap(), crate::reset::Scope::Premium);
        let premium_applied = ctx.ledger.lock().unwrap().tweaks.keys().filter(|id| !catalog::is_free(id)).count();
        assert_eq!((premium_applied, plan.len()), (3, 2), "l'ancien message comptait aussi net_legacy");
        let before = ctx.ledger.lock().unwrap().tweaks.len();
        assert_eq!(Runner::default().run_now(&ctx, &crate::reset::items(plan.clone())), (plan.len(), 0));
        let l = ctx.ledger.lock().unwrap();
        assert_eq!(before - l.tweaks.len(), plan.len(), "annoncés = remis");
        assert!(l.tweaks.contains_key("net_legacy") && l.tweaks.contains_key("win_gamemode"));
    }

    /// RAG-65 : suppression d'applis lancée par une version d'avant (action ponctuelle, notée d'après l'historique,
    /// sans sauvegarde ni script d'annulation) : l'annulation remet les applis de sa liste, sans licence.
    #[test]
    fn former_app_removal_is_undone_without_backup_or_license() {
        let ctx = test_ctx("apps", None);
        {
            let mut l = ctx.ledger.lock().unwrap();
            l.set_applied("app_remove", None, true, false, vec![], 3);
            l.set_applied("dbl_cortana", None, true, false, vec![], 4);
            l.set_applied("win_services", None, true, false, vec![], 5);
        }
        assert!(catalog::undo_of("app_remove", None, None).is_none(), "pas de script d'annulation");
        assert_eq!(unclaimed_apps(&ctx, "app_remove"), catalog::apps_of("app_remove").to_vec());
        // Cortana : win_services, encore appliqué, la retire aussi
        assert!(unclaimed_apps(&ctx, "dbl_cortana").is_empty());
        assert_eq!(unclaimed_apps(&ctx, "win_services"), vec!["Microsoft.Windows.Ai.Copilot.Provider".to_string()]);
        let lines = Mutex::new(Vec::new());
        // Windows : le script des applis ne peut pas s'écrire, rien n'est réenregistré sur le PC qui lance les tests
        // (ailleurs, Sys ne lance rien)
        let sys = Sys::new(unwritable(&ctx, "backup"));
        let r = Runner::default().undo_item(&ctx, &sys, &undo("app_remove"), &|l| lines.lock().unwrap().push(l));
        if cfg!(windows) {
            assert!(matches!(&r, Ok((1, Some(e))) if e.contains("app restore script")), "{r:?}");
        } else {
            assert_eq!(r, Ok((0, None)));
        }
        assert!(!ctx.ledger.lock().unwrap().tweaks.contains_key("app_remove"));
        assert!(lines.lock().unwrap().iter().any(|l| l.contains("Putting back the Microsoft Store apps")));
        // jumeau encore appliqué : ses applis attendent qu'il soit éteint aussi, sans erreur
        ctx.ledger.lock().unwrap().set_applied("app_remove", None, true, false, vec![], 6);
        ctx.ledger.lock().unwrap().set_applied("win_apps", None, true, false, vec![], 7);
        lines.lock().unwrap().clear();
        let r = Runner::default().undo_item(&ctx, &sys, &undo("app_remove"), &|l| lines.lock().unwrap().push(l));
        assert_eq!(r, Ok((0, None)));
        assert!(lines.lock().unwrap().iter().any(|l| l.contains("stay removed")));
        assert!(!lines.lock().unwrap().iter().any(|l| l.contains("Putting back the Microsoft Store apps")));
    }

    /// M1 (revue du 2026-10-13) : défaire le RBW Mod « Désactivé » de cette version (décoché, Tout annuler, déconnexion,
    /// fin de Premium, désinstallation) ne lance rien, il avait déjà remis les valeurs de Windows. « Activé » ne tourne
    /// que sur un clic, ou pour une entrée d'une version d'avant. Le dossier run ne peut pas être créé : aucun script ne
    /// peut être lancé, sous Windows (CI) comme ailleurs. Un lot réussi prouve donc que rien n'a été tenté, et le vrai
    /// « Activé » ne tourne jamais sur le PC qui lance les tests.
    #[test]
    fn rbw_off_is_forgotten_without_running_on() {
        let mut ctx = test_ctx("rbw", None);
        ctx.run_dir = unwritable(&ctx, "run");
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

    /// m2 (revue finale du moteur) : « Activé » lancé pour revenir de « Désactivé » qui n'a pas tourné (dossier run
    /// impossible à créer ici ; ailleurs : arrêté, cmd.exe qui ne démarre pas) laisse « Désactivé » noté. Avant, l'entrée
    /// partait quand même : la ligne disait « Activé depuis… » et la remise de fin de Premium ne le retentait plus. Vrai
    /// pour les deux chemins qui lancent « Activé » : la conversion d'une annulation (entrée d'une version d'avant :
    /// décochée, Tout annuler, remise à zéro) et le clic sur « Activé ». Le chemin M1 (« Désactivé » de cette version
    /// défait sans clic) ne lance rien et libère toujours l'entrée.
    #[test]
    fn rbw_on_that_did_not_run_keeps_off_applied() {
        let mut ctx = test_ctx("rbw-on-fails", None);
        ctx.run_dir = unwritable(&ctx, "run");
        let runner = Runner::default();
        let rbw = |variant: &str, undo: bool| vec![RunItem { id: "rbw_mode".into(), variant: Some(variant.into()), params: None, undo }];
        let off = |backup: bool, windows_values: bool| backup::Applied { variant: Some("off".into()), ok: true, backup, windows_values, ts: 1, ..Default::default() };
        let cases: [(&str, backup::Applied, Vec<RunItem>); 4] = [
            ("conversion : remise à zéro d'une sauvegarde de 1.1.9", off(true, false), reset_item("rbw_mode")),
            ("conversion : ancien « Désactivé » noté d'après l'historique, décoché ou Tout annuler", off(false, false), rbw("off", true)),
            ("clic sur « Activé », « Désactivé » de cette version appliqué", off(false, true), rbw("on", false)),
            ("clic sur « Activé », sauvegarde de 1.1.9", off(true, false), rbw("on", false)),
        ];
        for (case, entry, items) in cases {
            ctx.ledger.lock().unwrap().tweaks.insert("rbw_mode".into(), entry.clone());
            let (ok, failed) = runner.run_now(&ctx, &items);
            assert_eq!((ok, failed), (0, 1), "{case} : « Activé » tenté, et raté");
            let last = ctx.history.all().into_iter().max_by_key(|e| e.ts).unwrap();
            assert!(last.variant.as_deref() == Some("on") && !last.undo && !last.ok, "{case} : {last:?}");
            let l = ctx.ledger.lock().unwrap();
            let kept = l.tweaks.get("rbw_mode").unwrap_or_else(|| panic!("{case} : entrée retirée sans que « Activé » ait tourné"));
            assert_eq!(kept.variant.as_deref(), Some("off"), "{case}");
            assert_eq!((kept.backup, kept.windows_values), (entry.backup, entry.windows_values), "{case}");
        }
        // le chemin M1, lui, ne lance rien et libère l'entrée
        ctx.ledger.lock().unwrap().tweaks.insert("rbw_mode".into(), off(false, true));
        assert_eq!(runner.run_now(&ctx, &reset_item("rbw_mode")), (1, 0));
        assert!(!ctx.ledger.lock().unwrap().tweaks.contains_key("rbw_mode"));
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

    /// rest pas lancé (dossier run impossible à créer, cmd.exe qui ne démarre pas) : avec rest_avant, rien n'a été
    /// remis. Le réglage et sa sauvegarde restent, la prochaine annulation remet tout (avant : sauvegarde jetée).
    #[test]
    fn undo_that_could_not_start_keeps_the_backup() {
        use backup::{Applied, Saved, Undo};
        let mut ctx = test_ctx("rest-fails", None);
        // write_script échoue, sous Windows comme ailleurs
        ctx.run_dir = unwritable(&ctx, "run");
        let probe = Probe::Reg { key: "HKLM\\SOFTWARE\\RagoTest".into(), name: "v".into() };
        {
            let mut l = ctx.ledger.lock().unwrap();
            l.record_before(probe.clone(), Saved::Absent { created: None });
            l.tweaks.insert(
                "zz_plan".into(),
                Applied {
                    ok: true,
                    backup: true,
                    probes: vec![probe.id()],
                    undo: Some(Undo { rest: Some("echo rest".into()), rest_avant: true, ..Default::default() }),
                    ..Default::default()
                },
            );
        }
        let sys = Sys::new(ctx.backup_dir.clone());
        assert!(Runner::default().undo_item(&ctx, &sys, &undo("zz_plan"), &|_| {}).is_err());
        let l = ctx.ledger.lock().unwrap();
        assert!(l.tweaks.contains_key("zz_plan"), "toujours appliqué");
        assert!(l.has(&probe.id()), "sauvegarde gardée");
        drop(l);
        let _ = fs::remove_dir_all(ctx.backup_dir.parent().unwrap());
    }

    /// RAG-60 : la limite d'un point de restauration par 24 h n'est levée que le temps de créer celui de Rago.
    #[test]
    fn restore_point_puts_the_frequency_back() {
        let ps = RESTORE_POINT_PS;
        let set0 = ps.find("-Value 0 -PropertyType DWord").expect("limite levée");
        let point = ps.find("Checkpoint-Computer").unwrap();
        let fin = ps.find("} finally {").expect("remise même en cas d'échec");
        assert!(set0 < point && point < fin);
        assert!(ps.contains("$old = (Get-ItemProperty"), "valeur d'avant relevée");
        let after = &ps[fin..];
        assert!(after.contains("Remove-ItemProperty -Path $key -Name $name"));
        assert!(after.contains("Set-ItemProperty -Path $key -Name $name -Value $old"));
        // la valeur d'avant est remise telle quelle, 0 compris (in_advanced écrit 0 : pas de faux « Changé par Windows »)
        assert!(after.contains("if ($null -eq $old) {") && !after.contains("-eq 0"));
    }
}
