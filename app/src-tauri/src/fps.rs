//! FPS du jeu en cours (barre en jeu, RAG-82), mesurés par PresentMon (Intel, licence MIT), livré avec l'app dans
//! resources\ par la fabrication. Il lit les images que le jeu présente à l'écran (traces ETW de Windows) sans toucher
//! au jeu. Sans lui (exe de développement, téléchargement raté à la fabrication), les FPS restent « — ».

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub const EXE: &str = "PresentMon.exe";
/// Session ETW à notre nom : une session laissée par un arrêt brutal est reprise au lancement suivant.
const SESSION: &str = "RagoOptimizerFps";
/// Fenêtre de calcul : les FPS sur la dernière seconde.
const WINDOW: Duration = Duration::from_secs(1);
/// Sans image depuis ce délai (jeu en pause, réduit) : plus de valeur.
const STALE: Duration = Duration::from_secs(3);

/// Lit l'en-tête CSV de PresentMon : la colonne des millisecondes entre deux images (2.x : FrameTime, 1.x :
/// MsBetweenPresents).
pub fn frame_column(header: &str) -> Option<usize> {
    let cols: Vec<&str> = header.split(',').map(str::trim).collect();
    ["FrameTime", "MsBetweenPresents", "msBetweenPresents"].iter().find_map(|name| cols.iter().position(|c| c == name))
}

/// FPS sur les dernières images (ms entre deux images), None sans image.
pub fn fps_of(frames: &[f64]) -> Option<f64> {
    let total: f64 = frames.iter().sum();
    (total > 0.0).then(|| frames.len() as f64 * 1000.0 / total)
}

#[derive(Default)]
struct Shared {
    /// (instant de réception, ms depuis l'image précédente)
    frames: Vec<(Instant, f64)>,
    /// toute la partie, pour son résumé (analyse du PC, 1.3.0)
    all: Histogram,
}

/// Temps entre deux images de toute une partie, par tranches de 0,05 ms jusqu'à 200 ms : mémoire fixe, même
/// pour des heures de jeu à 500 FPS.
const STEP: f64 = 0.05;
const BUCKETS: usize = 4001;

#[derive(Clone)]
struct Histogram {
    counts: Vec<u32>,
    frames: u64,
    total_ms: f64,
    started: Option<std::time::SystemTime>,
}

impl Default for Histogram {
    fn default() -> Self {
        Histogram { counts: vec![0; BUCKETS], frames: 0, total_ms: 0.0, started: None }
    }
}

impl Histogram {
    fn add(&mut self, ms: f64) {
        self.started.get_or_insert_with(std::time::SystemTime::now);
        self.counts[((ms / STEP) as usize).min(BUCKETS - 1)] += 1;
        self.frames += 1;
        self.total_ms += ms;
    }

    /// Temps d'image sous lequel tombe la part `q` des images (0,5 : médiane ; 0,99 : pour le 1 % low).
    fn quantile(&self, q: f64) -> Option<f64> {
        let goal = (self.frames as f64 * q).ceil().max(1.0) as u64;
        let mut seen = 0u64;
        self.counts.iter().enumerate().find_map(|(i, c)| {
            seen += u64::from(*c);
            (seen >= goal).then(|| (i as f64 + 0.5) * STEP)
        })
    }

    /// Résumé d'une partie d'au moins une minute (sinon None : trop court pour vouloir dire quelque chose).
    fn summary(&self) -> Option<MatchSummary> {
        if self.frames < 600 || self.total_ms < 60_000.0 {
            return None;
        }
        let median = self.quantile(0.5)?;
        let p99 = self.quantile(0.99)?;
        // une saccade : une image plus de 2,5 fois plus longue que la normale de la partie, et au moins 20 ms
        let limit = (median * 2.5).max(20.0);
        let stutters: u64 = self.counts.iter().enumerate().filter(|(i, _)| (*i as f64) * STEP > limit).map(|(_, c)| u64::from(*c)).sum();
        let minutes = self.total_ms / 60_000.0;
        let at = self.started.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map_or(0, |d| d.as_millis() as u64);
        Some(MatchSummary {
            at,
            minutes: (minutes * 10.0).round() / 10.0,
            fps: (self.frames as f64 * 1000.0 / self.total_ms).round(),
            low1: (1000.0 / p99).round(),
            stutters_per_min: ((stutters as f64 / minutes) * 10.0).round() / 10.0,
        })
    }
}

/// Résumé de la dernière partie suivie par la barre en jeu : l'analyse du PC le montre, et l'avant/après le compare.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchSummary {
    /// début de la partie, en ms depuis 1970
    pub at: u64,
    pub minutes: f64,
    /// FPS moyen
    pub fps: f64,
    /// 1 % low : les FPS des 1 % d'images les plus lentes
    pub low1: f64,
    pub stutters_per_min: f64,
}

struct Tracker {
    pid: u32,
    child: Child,
    shared: Arc<Mutex<Shared>>,
}

impl Drop for Tracker {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[derive(Default)]
pub struct Fps {
    tracker: Mutex<Option<Tracker>>,
    /// fichier du résumé de la dernière partie (last-match.json dans les données de l'app)
    store: Mutex<Option<PathBuf>>,
    /// PresentMon arrêté ou impossible à lancer pour ce jeu (jeu, instant) : pas de relance en boucle
    failed: Mutex<Option<(u32, Instant)>>,
}

/// Délai avant de relancer PresentMon pour le même jeu.
const RETRY: Duration = Duration::from_secs(20);

impl Fps {
    pub fn available(resource_dir: &Path) -> bool {
        resource_dir.join(EXE).is_file()
    }

    /// Où garder le résumé de la dernière partie.
    pub fn keep_matches_in(&self, file: PathBuf) {
        *self.store.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = Some(file);
    }

    /// Résumé de la dernière partie d'au moins une minute (None : aucune encore).
    pub fn last_match(&self) -> Option<MatchSummary> {
        let file = self.store.lock().unwrap_or_else(std::sync::PoisonError::into_inner).clone()?;
        serde_json::from_slice(&std::fs::read(file).ok()?).ok()
    }

    /// La partie suivie s'arrête : son résumé remplace le précédent.
    fn finish(&self, tr: &Tracker) {
        let summary = tr.shared.lock().unwrap_or_else(std::sync::PoisonError::into_inner).all.summary();
        let file = self.store.lock().unwrap_or_else(std::sync::PoisonError::into_inner).clone();
        if let (Some(s), Some(f)) = (summary, file) {
            if let Ok(json) = serde_json::to_vec_pretty(&s) {
                let _ = std::fs::write(f, json);
            }
        }
    }

    /// Suit le jeu `pid` (None : arrête la mesure).
    pub fn follow(&self, resource_dir: &Path, pid: Option<u32>) {
        let mut t = self.tracker.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut failed = self.failed.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some(tr) = t.as_mut() {
            let dead = !matches!(tr.child.try_wait(), Ok(None));
            if dead {
                *failed = Some((tr.pid, Instant::now()));
            }
            if dead || Some(tr.pid) != pid {
                self.finish(tr);
                *t = None;
            }
        }
        let (None, Some(p)) = (t.as_ref(), pid) else { return };
        if failed.is_some_and(|(q, at)| q == p && at.elapsed() < RETRY) {
            return;
        }
        *t = start(&resource_dir.join(EXE), p);
        if t.is_none() {
            *failed = Some((p, Instant::now()));
        }
    }

    pub fn value(&self) -> Option<f64> {
        let t = self.tracker.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let shared = t.as_ref()?.shared.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let now = Instant::now();
        let last = shared.frames.last()?.0;
        if now.duration_since(last) > STALE {
            return None;
        }
        // PresentMon écrit par paquets : la dernière seconde reçue, pas la dernière seconde d'horloge
        let recent: Vec<f64> = shared.frames.iter().filter(|(at, _)| last.duration_since(*at) <= WINDOW).map(|(_, ms)| *ms).collect();
        fps_of(&recent)
    }
}

fn start(exe: &PathBuf, pid: u32) -> Option<Tracker> {
    if !exe.is_file() {
        return None;
    }
    let mut child = crate::shell::hidden(&exe.to_string_lossy())
        .args(["--process_id", &pid.to_string(), "--output_stdout", "--stop_existing_session", "--terminate_on_proc_exit"])
        .args(["--session_name", SESSION])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    let stdout = child.stdout.take()?;
    let shared = Arc::new(Mutex::new(Shared::default()));
    let out = Arc::clone(&shared);
    std::thread::Builder::new()
        .name("rago-fps".into())
        .spawn(move || {
            let mut column = None;
            for line in BufReader::new(stdout).lines() {
                let Ok(line) = line else { break };
                let Some(col) = column else {
                    column = frame_column(&line);
                    continue;
                };
                let Some(ms) = line.split(',').nth(col).and_then(|v| v.trim().parse::<f64>().ok()).filter(|v| *v > 0.0) else {
                    continue;
                };
                let mut s = out.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
                let now = Instant::now();
                s.frames.push((now, ms));
                s.all.add(ms);
                // quelques secondes gardées au plus
                if s.frames.len() > 4096 {
                    let cut = s.frames.len() - 2048;
                    s.frames.drain(..cut);
                }
            }
        })
        .ok()?;
    Some(Tracker { pid, child, shared })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_both_csv_formats() {
        assert_eq!(frame_column("Application,ProcessID,SwapChainAddress,PresentRuntime,CPUStartTime,FrameTime,CPUBusy"), Some(5));
        assert_eq!(frame_column("Application,ProcessID,TimeInSeconds,MsBetweenPresents,MsBetweenDisplayChange"), Some(3));
        assert_eq!(frame_column("error: unknown option"), None);
    }

    #[test]
    fn match_summary() {
        let mut h = Histogram::default();
        for _ in 0..30 {
            h.add(4.0);
        }
        assert_eq!(h.summary(), None, "trop court");
        let mut h = Histogram::default();
        // 2 minutes à 250 FPS, avec 1 % d'images à 10 ms et 24 saccades de 40 ms
        for i in 0..30_000 {
            h.add(if i % 100 == 0 { 10.0 } else { 4.0 });
        }
        for _ in 0..24 {
            h.add(40.0);
        }
        let s = h.summary().unwrap();
        assert!((s.fps - 246.0).abs() <= 2.0, "{}", s.fps);
        assert_eq!(s.low1, 100.0);
        assert!((s.stutters_per_min - 11.9).abs() < 0.3, "{}", s.stutters_per_min);
        assert_eq!(h.quantile(0.5), Some(4.025));
    }

    #[test]
    fn fps_from_frame_times() {
        assert_eq!(fps_of(&[]), None);
        let f = fps_of(&[4.0, 4.0, 4.0, 4.0]).unwrap();
        assert!((f - 250.0).abs() < 1e-9);
        let f = fps_of(&[16.0, 17.0, 17.0]).unwrap();
        assert!((f - 60.0).abs() < 0.01);
    }
}
