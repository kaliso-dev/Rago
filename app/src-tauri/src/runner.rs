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
use std::sync::{Arc, Mutex};
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

#[derive(Default)]
pub struct Runner {
    running: AtomicBool,
    cancel: AtomicBool,
    child: Mutex<Option<u32>>,
}

pub struct Context {
    pub app: AppHandle,
    pub history: Arc<History>,
    pub resource_dir: PathBuf,
    pub logs_dir: PathBuf,
    pub run_dir: PathBuf,
    pub backup_dir: PathBuf,
    pub adapter: Option<String>,
    pub ledger: Arc<Mutex<Ledger>>,
    /// scripts Premium ouverts avec la clé de la licence (None sans licence)
    pub premium: Option<Arc<catalog::Bundle>>,
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
            me.run(&ctx, &rid, &items);
            me.running.store(false, Ordering::SeqCst);
        });
        Ok(run_id)
    }

    fn run(&self, ctx: &Context, run_id: &str, items: &[RunItem]) {
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
            let variant = item.variant.as_deref();
            let emit_item = |status: &str, code: Option<i32>, duration: Option<u64>, message: Option<String>| {
                let _ = ctx.app.emit(
                    "run:item",
                    ItemEvent { run_id, index, id: &item.id, variant, status, code, duration_ms: duration, message },
                );
            };
            let applied = ctx.ledger.lock().unwrap().tweaks.contains_key(&item.id);
            // décoché, ou variante de retour arrière d'un réglage appliqué : retour à l'état d'avant
            let undo = item.undo || (applied && catalog::is_revert(&item.id, variant));
            if restore_failed && !undo && changes_windows(&item.id) {
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
                let _ = ctx.app.emit("run:log", LogEvent { run_id, id: &item.id, line });
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
                        let probes = if switch { self.snapshot(ctx, &sys, item, &emit_line) } else { None };
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
                            // réglage natif (OptiFine) : il garde sa propre sauvegarde
                            let mut l = ctx.ledger.lock().unwrap();
                            l.set_applied(&item.id, item.variant.clone(), r.0, item.id == "mc_optifine", Vec::new(), now_ms());
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
        let _ = ctx.app.emit(
            "run:done",
            DoneEvent { run_id, ok, failed, skipped, restore_failed, cancelled, log_file: log_path.to_string_lossy().to_string() },
        );
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
            let back = {
                let mut l = ctx.ledger.lock().unwrap();
                let back = l.release(id);
                l.save();
                back
            };
            let (rest, rest_first) = undo.map(|u| (u.rest, u.rest_avant)).unwrap_or_default();
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
            return Ok((code, None));
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
        let mut l = ctx.ledger.lock().unwrap();
        l.release(id);
        l.save();
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

/// Windows ne crée qu'un point de restauration par 24 h : la limite (SystemRestorePointCreationFrequency) est levée le
/// temps de créer celui de Rago, puis remise, même si la création échoue. Avant 1.1.9 elle restait à 0 pour toujours
/// (RAG-60) : une valeur 0 trouvée ici est donc retirée, ce qui rend la limite de Windows.
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
    if ($null -eq $old -or $old -eq 0) { Remove-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue }
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
        // la valeur 0 laissée par les versions d'avant 1.1.9 est retirée, pas remise
        assert!(after.contains("$old -eq 0"));
    }
}
