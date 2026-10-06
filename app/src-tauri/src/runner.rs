//! Exécution des réglages : un lot à la fois, dans un thread, avec le journal envoyé à
//! l'interface ligne par ligne.
//!
//! Chaque script batch est écrit dans %TEMP%\RagoOptimizer puis lancé par `cmd.exe /d /c`, sans
//! fenêtre, entrée standard fermée (un `pause` oublié ne bloque donc jamais).

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter};

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
    pub adapter: Option<String>,
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
            return Err("Une optimisation est déjà en cours".into());
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
            emit_item("running", None, None, None);
            write_log(&format!("==== {}{}", item.id, variant.map(|v| format!(":{v}")).unwrap_or_default()));
            let started = Instant::now();
            let emit_line = |line: String| {
                write_log(&line);
                let _ = ctx.app.emit("run:log", LogEvent { run_id, id: &item.id, line });
            };
            let result = self.run_item(ctx, item, &emit_line);
            let duration = started.elapsed().as_millis() as u64;
            let cancelled = self.cancel.load(Ordering::SeqCst);
            let (success, code, message) = match result {
                Ok((code, msg)) => (code == 0 && !cancelled, Some(code), msg),
                Err(e) => (false, None, Some(e)),
            };
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
                });
            }
            if success {
                ok += 1
            } else {
                failed += 1
            }
        }
        let cancelled = self.cancel.load(Ordering::SeqCst);
        let _ = ctx.app.emit(
            "run:done",
            DoneEvent { run_id, ok, failed, cancelled, log_file: log_path.to_string_lossy().to_string() },
        );
    }

    /// Exécute un réglage. Ok((code de sortie, message éventuel)).
    fn run_item(&self, ctx: &Context, item: &RunItem, emit: &dyn Fn(String)) -> Result<(i32, Option<String>), String> {
        match item.id.as_str() {
            "mc_optifine" => {
                let params = item.params.as_ref().ok_or("Paramètres OptiFine manquants")?;
                let dir = params
                    .get("dir")
                    .and_then(|d| d.as_str())
                    .map(PathBuf::from)
                    .or_else(|| std::env::var("APPDATA").ok().map(|a| PathBuf::from(a).join(".minecraft")))
                    .ok_or("Dossier Minecraft inconnu")?;
                let values: BTreeMap<String, String> = params
                    .get("values")
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .ok_or("Valeurs OptiFine manquantes")?;
                emit(format!("- Dossier : {}", dir.display()));
                let msg = minecraft::apply(&dir, &values, now_ms())?;
                emit(format!("- {msg}"));
                Ok((0, None))
            }
            "nv_profile" => {
                let exe = ctx.resource_dir.join("nvidiaProfileInspector.exe");
                let nip = ctx.resource_dir.join("extremelatencylow.nip");
                if !exe.exists() || !nip.exists() {
                    return Err("NVIDIA Profile Inspector ou le profil .nip est absent du dossier de l'app".into());
                }
                emit("- Import du profil extremelatencylow.nip dans le pilote NVIDIA".into());
                let mut cmd = shell::hidden(&exe.to_string_lossy());
                cmd.arg(&nip).arg("-silentImport");
                self.stream(cmd, emit)
            }
            "rst_point" => {
                emit("- Activation de la restauration système sur le disque Windows".into());
                let mut cmd = shell::hidden("powershell.exe");
                cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", RESTORE_POINT_PS]);
                self.stream(cmd, emit)
            }
            id => {
                let script = catalog::script(id, item.variant.as_deref())
                    .ok_or_else(|| format!("Réglage inconnu : {id}"))?;
                let path = write_script(id, item.variant.as_deref(), &script)?;
                let mut cmd = shell::hidden("cmd.exe");
                cmd.args(["/d", "/c"]).arg(&path);
                cmd.env("RAGO_RES", &ctx.resource_dir);
                cmd.env("adapter_name", ctx.adapter.clone().unwrap_or_default());
                cmd.current_dir(std::env::temp_dir());
                let res = self.stream(cmd, emit);
                let _ = fs::remove_file(&path);
                res
            }
        }
    }

    /// Lance la commande, relaie stdout et stderr ligne par ligne, attend la fin.
    fn stream(&self, mut cmd: Command, emit: &dyn Fn(String)) -> Result<(i32, Option<String>), String> {
        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
        let mut child: Child = cmd.spawn().map_err(|e| format!("Lancement impossible : {e}"))?;
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

fn write_script(id: &str, variant: Option<&str>, body: &str) -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("RagoOptimizer");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let name = format!("{}{}-{}.cmd", id, variant.map(|v| format!("-{v}")).unwrap_or_default(), now_ms());
    let path = dir.join(sanitize(&name));
    let body = body.replace("\r\n", "\n").replace('\n', "\r\n");
    let content = format!("{PREAMBLE}{body}\r\nexit /b 0\r\n");
    fs::write(&path, content).map_err(|e| format!("Écriture du script impossible : {e}"))?;
    Ok(path)
}

fn sanitize(s: &str) -> String {
    s.chars().map(|c| if c.is_ascii_alphanumeric() || "-_.".contains(c) { c } else { '_' }).collect()
}

const RESTORE_POINT_PS: &str = r#"$ErrorActionPreference = 'Stop'
try { Enable-ComputerRestore -Drive "$env:SystemDrive\" } catch { Write-Output "- Restauration déjà active ou non modifiable" }
New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore' -Name 'SystemRestorePointCreationFrequency' -Value 0 -PropertyType DWord -Force | Out-Null
Write-Output "- Création du point de restauration Rago Optimizer"
Checkpoint-Computer -Description 'Rago Optimizer' -RestorePointType 'MODIFY_SETTINGS'
Write-Output "- Point de restauration créé"
"#;

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
        let p = write_script("test", Some("a b"), "echo 1\necho 2").unwrap();
        let s = fs::read_to_string(&p).unwrap();
        assert!(s.starts_with("@echo off\r\n"));
        assert!(s.contains("echo 1\r\necho 2\r\nexit /b 0\r\n"));
        assert!(p.file_name().unwrap().to_str().unwrap().starts_with("test-a_b-"));
        fs::remove_file(p).unwrap();
    }
}
