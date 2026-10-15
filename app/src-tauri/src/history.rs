//! Historique des réglages appliqués, gardé dans %APPDATA%\gg.rago.optimizer\history.json.
//!
//! Chiffré au repos depuis 1.1.14, en deux couches :
//! - dessous, le chiffrement authentifié de l'app (`seal`, clé `seal::history_key`, nonce aléatoire à chaque écriture) ;
//! - dessus, DPAPI de Windows avec un secret propre à l'app (`vault::protect`) : le fichier ne s'ouvre que sur ce PC,
//!   avec ce compte Windows, et par Rago Optimizer.
//!
//! Ouvert dans un éditeur, le fichier n'est que des octets illisibles ; modifié, il ne se relit plus (étiquette
//! d'authentification). Un fichier en clair d'une version d'avant est relu puis réécrit chiffré au lancement. Un fichier
//! illisible est mis de côté (`history.json.bad-<horodatage>`) au lieu d'être écrasé.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use crate::license::vault;
use crate::seal;

const MAX_ENTRIES: usize = 1000;

/// En-tête du fichier chiffré par l'app puis par DPAPI (cas normal).
const SEALED: &[u8] = b"RAGO-HISTORY-2\0";
/// En-tête du fichier chiffré par l'app seulement : DPAPI a refusé (profil Windows abîmé). Réécrit avec DPAPI dès que
/// possible.
const SEALED_APP: &[u8] = b"RAGO-HISTORY-2A\0";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub variant: Option<String>,
    /// millisecondes depuis l'epoch Unix
    pub ts: u64,
    pub ok: bool,
    pub code: Option<i32>,
    pub duration_ms: u64,
    /// retour à l'état d'avant (réglage décoché)
    #[serde(default)]
    pub undo: bool,
}

pub struct History {
    path: PathBuf,
    entries: Mutex<Vec<Entry>>,
    /// le fichier sur disque n'a pu être ni lu ni mis de côté (verrouillé) : rien ne doit l'écraser
    unread: Mutex<bool>,
}

/// Nonce de 16 octets : aléatoire (générateur de Windows) ; sinon dérivé de l'heure, du processus, d'un compteur et du
/// contenu, jamais deux fois le même.
fn nonce(plain: &[u8]) -> [u8; 16] {
    if let Some(n) = vault::random::<16>() {
        return n;
    }
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    let digest = Sha256::new()
        .chain_update(t.to_le_bytes())
        .chain_update(std::process::id().to_le_bytes())
        .chain_update(COUNTER.fetch_add(1, Ordering::SeqCst).to_le_bytes())
        .chain_update(plain)
        .finalize();
    digest[..16].try_into().unwrap()
}

/// Contenu chiffré de history.json (voir le haut du fichier). `dpapi` : la couche de Windows (`vault::protect`),
/// None si elle refuse.
fn encode(json: &[u8], dpapi: impl Fn(&[u8]) -> Option<Vec<u8>>) -> Vec<u8> {
    let inner = seal::seal(&seal::history_key(), &nonce(json), json);
    match dpapi(&inner) {
        Some(outer) => [SEALED, &outer].concat(),
        None => [SEALED_APP, &inner].concat(),
    }
}

/// Entrées de history.json, et s'il est à réécrire (en clair d'une version d'avant, ou sans la couche DPAPI).
fn decode(bytes: &[u8]) -> Result<(Vec<Entry>, bool), String> {
    let (json, rewrite) = if let Some(outer) = bytes.strip_prefix(SEALED) {
        let inner = vault::unprotect(outer, &seal::history_entropy()).ok_or("Windows couldn't decrypt it")?;
        (seal::open(&seal::history_key(), &inner).ok_or("modified or damaged")?, false)
    } else if let Some(inner) = bytes.strip_prefix(SEALED_APP) {
        (seal::open(&seal::history_key(), inner).ok_or("modified or damaged")?, true)
    } else {
        // version d'avant 1.1.14 : JSON en clair
        (bytes.to_vec(), true)
    };
    let entries = serde_json::from_slice(&json).map_err(|e| format!("unreadable ({e})"))?;
    Ok((entries, rewrite))
}

impl History {
    pub fn load(path: PathBuf) -> Self {
        let read = || match fs::read(&path) {
            Ok(bytes) => Ok(Some(bytes)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.to_string()),
        };
        // verrou passager (antivirus, sauvegarde) : quelques essais avant de conclure qu'il ne se lit pas
        let mut got = read();
        for _ in 0..3 {
            if got.is_ok() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(200));
            got = read();
        }
        let h = Self { path, entries: Mutex::new(Vec::new()), unread: Mutex::new(false) };
        let why = match got {
            Ok(None) => return h,
            Ok(Some(bytes)) => match decode(&bytes) {
                Ok((entries, rewrite)) => {
                    // en clair (version d'avant) ou sans DPAPI : réécrit chiffré tout de suite
                    if rewrite {
                        h.save(&entries);
                    }
                    *h.entries.lock().unwrap() = entries;
                    return h;
                }
                Err(e) => e,
            },
            Err(e) => format!("couldn't be read ({e})"),
        };
        if !h.set_aside(&why) {
            *h.unread.lock().unwrap() = true;
        }
        h
    }

    /// Met history.json de côté sous `history.json.bad-<horodatage>`, avec une ligne dans logs\repairs.log. Faux s'il
    /// est encore là sous son nom.
    fn set_aside(&self, why: &str) -> bool {
        let ts = now_ms();
        let name = self.path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "history.json".into());
        let aside = self.path.with_file_name(format!("{name}.bad-{ts}"));
        let moved = fs::rename(&self.path, &aside).is_ok() || !self.path.exists();
        if let Some(logs) = self.path.parent().map(|d| d.join("logs")) {
            let _ = fs::create_dir_all(&logs);
            if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(logs.join("repairs.log")) {
                use std::io::Write;
                let _ = if moved {
                    writeln!(f, "{ts} {name} {why}: kept as {}, a new one is started", aside.display())
                } else {
                    writeln!(f, "{ts} {name} {why}, and couldn't be set aside: left untouched, this launch's history isn't saved")
                };
            }
        }
        moved
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

    /// Chiffré, écrit à côté, sur le disque (sync_all), puis remplace : une coupure de courant ne laisse ni un fichier
    /// coupé ni un fichier vide sous le bon nom.
    fn save(&self, entries: &[Entry]) {
        if let Some(dir) = self.path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        {
            // fichier d'avant illisible et encore en place (verrou) : jamais écrasé ; mis de côté dès que possible
            let mut unread = self.unread.lock().unwrap();
            if *unread {
                if !self.set_aside("couldn't be read at launch") {
                    return;
                }
                *unread = false;
            }
        }
        let Ok(json) = serde_json::to_vec(entries) else { return };
        let bytes = encode(&json, |inner| vault::protect(inner, &seal::history_entropy()));
        let tmp = self.path.with_extension("json.tmp");
        let written = fs::File::create(&tmp).and_then(|mut f| {
            use std::io::Write;
            f.write_all(&bytes)?;
            f.sync_all()
        });
        if written.is_ok() {
            let _ = fs::rename(&tmp, &self.path);
        }
    }
}

pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(id: &str, ts: u64) -> Entry {
        Entry { id: id.into(), variant: Some("on".into()), ts, ok: true, code: Some(0), duration_ms: 12, undo: false }
    }

    fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rago-history-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    /// Ni les réglages ni leurs variantes ne se lisent dans le fichier ; il se relit à l'identique.
    #[test]
    fn history_is_encrypted_at_rest() {
        let d = dir("sealed");
        let h = History::load(d.join("history.json"));
        h.push(entry("win_gamemode", 1));
        h.push(entry("net_nagle", 2));
        let raw = fs::read(d.join("history.json")).unwrap();
        assert!(raw.starts_with(SEALED), "chiffré par l'app puis par DPAPI");
        for clear in [&b"win_gamemode"[..], b"net_nagle", b"variant", b"\"on\""] {
            assert!(!raw.windows(clear.len()).any(|w| w == clear), "{} en clair", String::from_utf8_lossy(clear));
        }
        let back = History::load(d.join("history.json"));
        assert_eq!(back.all(), vec![entry("win_gamemode", 1), entry("net_nagle", 2)]);
        assert!(!d.join("history.json.tmp").exists());
        let _ = fs::remove_dir_all(&d);
    }

    /// Deux écritures du même historique ne donnent pas le même fichier (nonce neuf à chaque fois).
    #[test]
    fn each_write_uses_a_new_nonce() {
        let json = serde_json::to_vec(&vec![entry("in_mouse", 1)]).unwrap();
        let (a, b) = (encode(&json, |_| None), encode(&json, |_| None));
        assert_ne!(a, b);
        assert_eq!(decode(&a).unwrap(), (vec![entry("in_mouse", 1)], true), "sans DPAPI : relu, puis à réécrire");
    }

    /// Fichier en clair d'une version d'avant : relu, puis réécrit chiffré dès le chargement.
    #[test]
    fn plaintext_history_is_migrated() {
        let d = dir("legacy");
        let old = vec![entry("win_visual", 5)];
        fs::write(d.join("history.json"), serde_json::to_string(&old).unwrap()).unwrap();
        let h = History::load(d.join("history.json"));
        assert_eq!(h.all(), old);
        let raw = fs::read(d.join("history.json")).unwrap();
        assert!(raw.starts_with(SEALED) && !raw.windows(10).any(|w| w == b"win_visual"), "réécrit chiffré");
        assert_eq!(History::load(d.join("history.json")).all(), old);
        let _ = fs::remove_dir_all(&d);
    }

    /// Fichier modifié à la main ou abîmé : jamais relu de travers ni écrasé, mis de côté, et un historique neuf commence.
    #[test]
    fn tampered_history_is_set_aside() {
        let d = dir("tampered");
        let h = History::load(d.join("history.json"));
        h.push(entry("pow_plan", 1));
        let mut raw = fs::read(d.join("history.json")).unwrap();
        let n = raw.len() - 3;
        raw[n] ^= 0x40;
        fs::write(d.join("history.json"), &raw).unwrap();
        let h = History::load(d.join("history.json"));
        assert!(h.all().is_empty());
        let aside: Vec<_> = fs::read_dir(&d).unwrap().flatten().filter(|e| e.file_name().to_string_lossy().starts_with("history.json.bad-")).collect();
        assert_eq!(aside.len(), 1, "gardé pour le support");
        assert_eq!(fs::read(aside[0].path()).unwrap(), raw);
        assert!(fs::read_to_string(d.join("logs").join("repairs.log")).unwrap().contains("history.json"));
        h.push(entry("pow_plan", 2));
        assert_eq!(History::load(d.join("history.json")).all(), vec![entry("pow_plan", 2)]);
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn history_keys_are_distinct() {
        assert_ne!(seal::history_key(), seal::ledger_key());
        assert_ne!(seal::history_key(), seal::history_entropy());
    }
}
