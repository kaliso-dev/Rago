//! Préréglages OptiFine. Le .bat ajoutait les lignes à la fin de optionsof.txt à chaque
//! passage (`echo ... >> optionsof.txt`), ce qui empilait des doublons. Ici le fichier est
//! relu, les clés sont remplacées à leur place, et une copie est gardée avant d'écrire.
//!
//! Copies : `optionsof.txt.rago-<horodatage>.bak` (le fichier du joueur) ou, quand il n'existait
//! pas, `optionsof.txt.rago-<horodatage>.none` (marqueur vide) : l'annulation supprime alors le
//! fichier créé par Rago au lieu d'échouer faute de copie.

use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

const FILE: &str = "optionsof.txt";
const BACKUP_PREFIX: &str = "optionsof.txt.rago-";
const NONE_SUFFIX: &str = ".none";
const KEEP_BACKUPS: usize = 5;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub dir_exists: bool,
    pub optifine_file: bool,
    pub backups: usize,
}

/// Copies et marqueurs de Rago, du plus ancien au plus récent (horodatages en ms, même longueur).
fn backups(dir: &Path) -> Vec<PathBuf> {
    let mut list: Vec<PathBuf> = fs::read_dir(dir)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| {
                    p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with(BACKUP_PREFIX))
                        .unwrap_or(false)
                })
                .collect()
        })
        .unwrap_or_default();
    list.sort();
    list
}

fn is_marker(p: &Path) -> bool {
    p.to_string_lossy().ends_with(NONE_SUFFIX)
}

/// Les vraies copies du fichier (sans les marqueurs d'absence).
fn copies(dir: &Path) -> Vec<PathBuf> {
    backups(dir).into_iter().filter(|p| !is_marker(p)).collect()
}

/// `undo` a de quoi remettre l'état d'avant : une copie du fichier du joueur ou un marqueur d'absence (fichier créé
/// par Rago, à supprimer). `Status::backups` ne compte que les copies (bouton « Restaurer ») : la remise de fin de
/// Premium doit regarder ceci, sinon OptiFine appliqué sans optionsof.txt d'origine resterait appliqué.
pub fn undoable(dir: &Path) -> bool {
    !backups(dir).is_empty()
}

pub fn status(dir: &Path) -> Status {
    Status {
        dir_exists: dir.is_dir(),
        optifine_file: dir.join(FILE).is_file(),
        backups: copies(dir).len(),
    }
}

/// Fusionne `values` dans optionsof.txt. `already_applied` : le réglage est déjà actif ; la copie
/// prise la première fois (fichier du joueur, ou marqueur d'absence) reste alors la plus récente,
/// sinon l'annulation remettrait le fichier écrit par Rago. Renvoie un message lisible pour le journal.
pub fn apply(dir: &Path, values: &BTreeMap<String, String>, stamp: u64, already_applied: bool) -> Result<String, String> {
    if !dir.is_dir() {
        return Err(format!("Minecraft folder not found: {}", dir.display()));
    }
    let path = dir.join(FILE);
    let existed = path.is_file();
    let existing = if existed {
        fs::read_to_string(&path).map_err(|e| format!("Couldn't read {FILE}: {e}"))?
    } else {
        String::new()
    };
    let keep_first = already_applied && !backups(dir).is_empty();
    let mut saved = String::new();
    if !keep_first {
        let backup = if existed {
            dir.join(format!("{BACKUP_PREFIX}{stamp}.bak"))
        } else {
            dir.join(format!("{BACKUP_PREFIX}{stamp}{NONE_SUFFIX}"))
        };
        fs::write(&backup, &existing).map_err(|e| format!("Couldn't back up the file: {e}"))?;
        if existed {
            saved = backup.file_name().unwrap().to_string_lossy().to_string();
        }
        let all = backups(dir);
        if all.len() > KEEP_BACKUPS {
            for old in &all[..all.len() - KEEP_BACKUPS] {
                let _ = fs::remove_file(old);
            }
        }
    }
    let merged = merge(&existing, values);
    fs::write(&path, merged).map_err(|e| format!("Couldn't write {FILE}: {e}"))?;
    Ok(if !existed {
        format!("{} OptiFine options written to a new {FILE}", values.len())
    } else if keep_first {
        format!("{} OptiFine options written, your first backup is kept", values.len())
    } else {
        format!("{} OptiFine options written, old file kept as {saved}", values.len())
    })
}

/// Bouton « Restaurer » : la copie la plus récente du fichier du joueur (les marqueurs sont ignorés).
pub fn restore_latest(dir: &Path) -> Result<String, String> {
    let latest = copies(dir).pop().ok_or("No Rago backup found")?;
    fs::copy(&latest, dir.join(FILE)).map_err(|e| e.to_string())?;
    Ok(format!("{FILE} restored from {}", latest.file_name().unwrap().to_string_lossy()))
}

/// Désactivation du réglage : remet l'état d'avant la première application. Si optionsof.txt
/// n'existait pas, le fichier créé par Rago est supprimé (OptiFine en refait un par défaut).
pub fn undo(dir: &Path) -> Result<String, String> {
    let latest = backups(dir).pop().ok_or("No Rago backup found")?;
    if is_marker(&latest) {
        let path = dir.join(FILE);
        if path.exists() {
            fs::remove_file(&path).map_err(|e| format!("Couldn't remove {FILE}: {e}"))?;
        }
        // marqueur consommé : il ne doit pas resservir à une annulation plus tard
        let _ = fs::remove_file(&latest);
        return Ok(format!("{FILE} removed: it didn't exist before Rago, OptiFine will recreate it with its defaults"));
    }
    restore_latest(dir)
}

fn merge(existing: &str, values: &BTreeMap<String, String>) -> String {
    let mut seen = std::collections::HashSet::new();
    let mut out: Vec<String> = Vec::new();
    for line in existing.lines() {
        let key = line.split_once(':').map(|(k, _)| k.trim().to_string());
        match key {
            Some(k) if values.contains_key(&k) => {
                // une seule occurrence par clé, même si l'ancien .bat en avait empilé plusieurs
                if seen.insert(k.clone()) {
                    out.push(format!("{k}:{}", values[&k]));
                }
            }
            _ => out.push(line.to_string()),
        }
    }
    for (k, v) in values {
        if !seen.contains(k) {
            out.push(format!("{k}:{v}"));
        }
    }
    let mut s = out.join("\n");
    s.push('\n');
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("rago-mc-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn fog(v: &str) -> BTreeMap<String, String> {
        let mut m = BTreeMap::new();
        m.insert("ofFogType".to_string(), v.to_string());
        m
    }

    #[test]
    fn merge_replaces_in_place_and_dedupes() {
        let existing = "ofFogType:1\nofAoLevel:1.0\nofFogType:2\nother:keep\n";
        let mut v = BTreeMap::new();
        v.insert("ofFogType".to_string(), "3".to_string());
        v.insert("ofNew".to_string(), "true".to_string());
        let out = merge(existing, &v);
        assert_eq!(out, "ofFogType:3\nofAoLevel:1.0\nother:keep\nofNew:true\n");
    }

    #[test]
    fn apply_keeps_backup() {
        let dir = temp("keep");
        fs::write(dir.join(FILE), "ofFogType:1\n").unwrap();
        apply(&dir, &fog("3"), 1, false).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:3\n");
        assert_eq!(status(&dir).backups, 1);
        undo(&dir).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:1\n");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn undo_removes_file_that_did_not_exist() {
        let dir = temp("none");
        apply(&dir, &fog("3"), 1000000000001, false).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:3\n");
        // le marqueur n'est pas une copie : le bouton Restaurer ne s'affiche pas pour lui
        assert_eq!(status(&dir).backups, 0);
        assert!(restore_latest(&dir).is_err());
        // mais l'annulation sait remettre l'état d'avant (remise de fin de Premium comprise)
        assert!(undoable(&dir));
        undo(&dir).unwrap();
        assert!(!dir.join(FILE).exists());
        // marqueur consommé
        assert!(backups(&dir).is_empty());
        assert!(!undoable(&dir));
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn reapply_keeps_first_backup() {
        let dir = temp("again");
        fs::write(dir.join(FILE), "ofFogType:1\n").unwrap();
        apply(&dir, &fog("3"), 1000000000001, false).unwrap();
        // deuxième passage du réglage déjà actif : pas de copie du fichier de Rago
        apply(&dir, &fog("2"), 1000000000002, true).unwrap();
        assert_eq!(status(&dir).backups, 1);
        undo(&dir).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:1\n");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn reapply_after_missing_file_still_removes_it() {
        let dir = temp("again-none");
        apply(&dir, &fog("3"), 1000000000001, false).unwrap();
        apply(&dir, &fog("2"), 1000000000002, true).unwrap();
        undo(&dir).unwrap();
        assert!(!dir.join(FILE).exists());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn manual_restore_skips_marker() {
        let dir = temp("manual");
        fs::write(dir.join(FILE), "ofFogType:1\n").unwrap();
        fs::write(dir.join(format!("{BACKUP_PREFIX}1000000000001.bak")), "ofFogType:0\n").unwrap();
        fs::write(dir.join(format!("{BACKUP_PREFIX}1000000000002{NONE_SUFFIX}")), "").unwrap();
        restore_latest(&dir).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:0\n");
        fs::remove_dir_all(&dir).unwrap();
    }
}
