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
    /// PresentMon arrêté ou impossible à lancer pour ce jeu (jeu, instant) : pas de relance en boucle
    failed: Mutex<Option<(u32, Instant)>>,
}

/// Délai avant de relancer PresentMon pour le même jeu.
const RETRY: Duration = Duration::from_secs(20);

impl Fps {
    pub fn available(resource_dir: &Path) -> bool {
        resource_dir.join(EXE).is_file()
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
    fn fps_from_frame_times() {
        assert_eq!(fps_of(&[]), None);
        let f = fps_of(&[4.0, 4.0, 4.0, 4.0]).unwrap();
        assert!((f - 250.0).abs() < 1e-9);
        let f = fps_of(&[16.0, 17.0, 17.0]).unwrap();
        assert!((f - 60.0).abs() < 0.01);
    }
}
