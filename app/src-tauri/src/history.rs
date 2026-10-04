//! Historique des réglages appliqués, gardé dans %APPDATA%\gg.rago.hub\history.json.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

const MAX_ENTRIES: usize = 1000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub variant: Option<String>,
    /// millisecondes depuis l'epoch Unix
    pub ts: u64,
    pub ok: bool,
    pub code: Option<i32>,
    pub duration_ms: u64,
}

pub struct History {
    path: PathBuf,
    entries: Mutex<Vec<Entry>>,
}

impl History {
    pub fn load(path: PathBuf) -> Self {
        let entries = fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Self { path, entries: Mutex::new(entries) }
    }

    pub fn push(&self, e: Entry) {
        let mut entries = self.entries.lock().unwrap();
        entries.push(e);
        let len = entries.len();
        if len > MAX_ENTRIES {
            entries.drain(0..len - MAX_ENTRIES);
        }
        self.save(&entries);
    }

    pub fn all(&self) -> Vec<Entry> {
        self.entries.lock().unwrap().clone()
    }

    pub fn clear(&self) {
        let mut entries = self.entries.lock().unwrap();
        entries.clear();
        self.save(&entries);
    }

    fn save(&self, entries: &[Entry]) {
        if let Some(dir) = self.path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        if let Ok(json) = serde_json::to_string(entries) {
            let _ = fs::write(&self.path, json);
        }
    }
}

pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
