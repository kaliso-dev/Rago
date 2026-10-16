//! Préréglages OptiFine. Le .bat ajoutait les lignes à la fin de optionsof.txt à chaque
//! passage (`echo ... >> optionsof.txt`), ce qui empilait des doublons. Ici le fichier est
//! relu, les clés sont remplacées à leur place, et une copie est gardée avant d'écrire.

use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

const FILE: &str = "optionsof.txt";
const BACKUP_PREFIX: &str = "optionsof.txt.rago-";
const KEEP_BACKUPS: usize = 5;
/// copie d'un dossier qui n'avait pas de optionsof.txt
const NONE: &str = ".none";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub dir_exists: bool,
    pub optifine_file: bool,
    pub backups: usize,
}

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

pub fn status(dir: &Path) -> Status {
    Status {
        dir_exists: dir.is_dir(),
        optifine_file: dir.join(FILE).is_file(),
        backups: backups(dir).len(),
    }
}

/// Fusionne `values` dans optionsof.txt. Une copie du fichier est gardée avant d'écrire, sauf quand le réglage est déjà
/// appliqué dans ce dossier (`keep`) : la copie d'avant la première fois reste celle à remettre, une nouvelle copie
/// garderait les valeurs de Rago. Pas de fichier avant : la copie est un fichier vide en `.none`, et la remise supprime
/// optionsof.txt. Renvoie un message lisible pour le journal.
pub fn apply(dir: &Path, values: &BTreeMap<String, String>, stamp: u64, keep: bool) -> Result<String, String> {
    if !dir.is_dir() {
        return Err(format!("Minecraft folder not found: {}", dir.display()));
    }
    let path = dir.join(FILE);
    let existed = path.is_file();
    // illisible : rien n'est écrit, plutôt que de le remplacer sans copie
    let existing = if existed { fs::read_to_string(&path).map_err(|e| format!("Couldn't read {FILE}: {e}"))? } else { String::new() };
    let kept = keep && !backups(dir).is_empty();
    let mut saved = String::new();
    if !kept {
        let backup = dir.join(format!("{BACKUP_PREFIX}{stamp}{}", if existed { ".bak" } else { NONE }));
        fs::write(&backup, &existing).map_err(|e| format!("Couldn't back up the file: {e}"))?;
        saved = backup.file_name().unwrap().to_string_lossy().to_string();
        let all = backups(dir);
        if all.len() > KEEP_BACKUPS {
            for old in &all[..all.len() - KEEP_BACKUPS] {
                let _ = fs::remove_file(old);
            }
        }
    }
    let merged = merge(&existing, values);
    fs::write(&path, merged).map_err(|e| format!("Couldn't write {FILE}: {e}"))?;
    Ok(if kept {
        format!("{} OptiFine options written, the copy from before Rago is kept", values.len())
    } else if existed {
        format!("{} OptiFine options written, old file kept as {saved}", values.len())
    } else {
        format!("{} OptiFine options written to a new {FILE}", values.len())
    })
}

/// Remet la copie la plus récente. Une copie `.none` : il n'y avait pas de fichier avant Rago, il est supprimé.
pub fn restore_latest(dir: &Path) -> Result<String, String> {
    let latest = backups(dir).pop().ok_or("No Rago backup found")?;
    let name = latest.file_name().unwrap().to_string_lossy().to_string();
    if name.ends_with(NONE) {
        return match fs::remove_file(dir.join(FILE)) {
            Ok(()) => Ok(format!("{FILE} removed: there was none before Rago")),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(format!("No {FILE} to remove")),
            Err(e) => Err(e.to_string()),
        };
    }
    fs::copy(&latest, dir.join(FILE)).map_err(|e| e.to_string())?;
    Ok(format!("{FILE} restored from {name}"))
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
        let dir = std::env::temp_dir().join(format!("rago-mc-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(FILE), "ofFogType:1\n").unwrap();
        let mut v = BTreeMap::new();
        v.insert("ofFogType".to_string(), "3".to_string());
        apply(&dir, &v, 1, false).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:3\n");
        assert_eq!(status(&dir).backups, 1);
        restore_latest(&dir).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:1\n");
        fs::remove_dir_all(&dir).unwrap();
    }

    /// Appliqué deux fois (une autre variante) puis remis : le fichier d'avant Rago, pas la variante d'avant. Sans
    /// fichier avant : il est supprimé.
    #[test]
    fn put_back_as_before_rago() {
        let dir = std::env::temp_dir().join(format!("rago-mc-twice-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let v = |x: &str| BTreeMap::from([("ofFogType".to_string(), x.to_string())]);
        fs::write(dir.join(FILE), "ofFogType:1\n").unwrap();
        apply(&dir, &v("2"), 1, false).unwrap();
        apply(&dir, &v("3"), 2, true).unwrap();
        assert_eq!(status(&dir).backups, 1, "pas de copie des valeurs de Rago");
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:3\n");
        restore_latest(&dir).unwrap();
        assert_eq!(fs::read_to_string(dir.join(FILE)).unwrap(), "ofFogType:1\n");

        fs::remove_dir_all(&dir).unwrap();
        fs::create_dir_all(&dir).unwrap();
        apply(&dir, &v("2"), 3, false).unwrap();
        assert_eq!(status(&dir).backups, 1, "une copie « pas de fichier » : la fin de licence sait le remettre");
        assert!(restore_latest(&dir).unwrap().contains("removed"));
        assert!(!dir.join(FILE).exists());
        // déjà appliqué sans aucune copie (version d'avant, pas de fichier) : une copie est prise quand même
        fs::write(dir.join(FILE), "ofFogType:2\n").unwrap();
        fs::remove_file(backups(&dir).pop().unwrap()).unwrap();
        apply(&dir, &v("3"), 4, true).unwrap();
        assert_eq!(status(&dir).backups, 1);
        fs::remove_dir_all(&dir).unwrap();
    }
}
