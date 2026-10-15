//! Fichiers Premium fournis avec l'app : le plan d'alimentation Rago Low Latency (LowLatency.pow) et le profil NVIDIA
//! (extremelatencylow.nip). Comme les scripts, ils sont chiffrés dans l'exe (build.rs, clé hors ligne de seal.rs) et ne
//! sont plus installés en clair dans le dossier de l'app. Le script qui en importe un l'écrit en clair dans run\ le
//! temps de son exécution seulement (`stage`), puis il est effacé ; run\ est aussi vidé au démarrage.

use std::borrow::Cow;
use std::fs;
use std::path::{Path, PathBuf};

pub const NAMES: [&str; 2] = ["LowLatency.pow", "extremelatencylow.nip"];

static SEALED: [(&str, &[u8]); 2] = [
    ("LowLatency.pow", include_bytes!(concat!(env!("OUT_DIR"), "/LowLatency.pow.sealed"))),
    ("extremelatencylow.nip", include_bytes!(concat!(env!("OUT_DIR"), "/extremelatencylow.nip.sealed"))),
];

/// Contenu en clair d'un de ces fichiers.
pub fn bytes(name: &str) -> Option<Vec<u8>> {
    let (_, sealed) = SEALED.iter().find(|(n, _)| *n == name)?;
    crate::seal::open(&crate::seal::offline_key(env!("CARGO_PKG_VERSION")), sealed)
}

/// Dossier de run\ où un script trouve ces fichiers, effacé dès qu'il ne sert plus (fin du script, même ratée).
pub struct Staged(Option<PathBuf>);

impl Staged {
    pub fn dir(&self) -> Option<&Path> {
        self.0.as_deref()
    }
}

impl Drop for Staged {
    fn drop(&mut self) {
        if let Some(dir) = &self.0 {
            let _ = fs::remove_dir_all(dir);
        }
    }
}

/// Écrit dans un dossier de `run_dir` ceux de ces fichiers que les lignes données ouvrent (`%RAGO_RES%\<nom>`, comme
/// les .bat d'origine). Renvoie ce dossier et les lignes, où ces chemins deviennent `%RAGO_SEC%\<nom>` : le moteur met
/// ce dossier dans RAGO_SEC pour le script. Sans fichier utilisé : rien n'est écrit, les lignes restent telles quelles.
pub fn stage<'a>(run_dir: &Path, script: &'a str) -> Result<(Staged, Cow<'a, str>), String> {
    let refs: Vec<(&str, String)> =
        NAMES.iter().map(|n| (*n, format!("%RAGO_RES%\\{n}"))).filter(|(_, r)| script.contains(r.as_str())).collect();
    if refs.is_empty() {
        return Ok((Staged(None), Cow::Borrowed(script)));
    }
    let dir = run_dir.join(format!("res-{}-{}", std::process::id(), crate::history::now_ms()));
    fs::create_dir_all(&dir).map_err(|e| format!("Couldn't prepare the app files: {e}"))?;
    let staged = Staged(Some(dir.clone()));
    let mut out = script.to_string();
    for (name, r) in refs {
        let bytes = bytes(name).ok_or_else(|| format!("{name} is missing from the app"))?;
        fs::write(dir.join(name), bytes).map_err(|e| format!("Couldn't prepare {name}: {e}"))?;
        out = out.replace(&r, &format!("%RAGO_SEC%\\{name}"));
    }
    Ok((staged, Cow::Owned(out)))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Les fichiers sont dans l'exe, chiffrés : le paquet ne contient pas leur clair, et ils se rouvrent à l'identique.
    #[test]
    fn assets_are_sealed_and_open_back() {
        let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("assets");
        for (name, sealed) in SEALED.iter() {
            let plain = fs::read(dir.join(name)).unwrap();
            assert_eq!(bytes(name).as_deref(), Some(plain.as_slice()), "{name}");
            let probe = &plain[plain.len() / 2..plain.len() / 2 + 32];
            assert!(!sealed.windows(probe.len()).any(|w| w == probe), "{name} lisible dans l'exe");
        }
        // plus installés en clair avec l'app (tauri.conf.json : bundle > resources = resources/*)
        let res = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources");
        assert!(NAMES.iter().all(|n| !res.join(n).exists()));
    }

    #[test]
    fn stage_writes_only_what_the_script_opens_and_cleans_up() {
        let run = std::env::temp_dir().join(format!("rago-assets-{}", std::process::id()));
        let (s, body) = stage(&run, "echo rien").unwrap();
        assert!(s.dir().is_none() && body == "echo rien");
        let script = "powercfg -import \"%RAGO_RES%\\LowLatency.pow\" x\r\n\"%RAGO_RES%\\nvidiaProfileInspector.exe\" x";
        let (s, body) = stage(&run, script).unwrap();
        let dir = s.dir().unwrap().to_path_buf();
        assert!(dir.join("LowLatency.pow").is_file() && !dir.join("extremelatencylow.nip").exists());
        assert!(body.contains("\"%RAGO_SEC%\\LowLatency.pow\"") && body.contains("%RAGO_RES%\\nvidiaProfileInspector.exe"));
        drop(s);
        assert!(!dir.exists(), "effacé à la fin du script");
        let _ = fs::remove_dir_all(&run);
    }

    /// Chaque script qui ouvre un de ces fichiers l'écrit exactement `%RAGO_RES%\<nom>` : sinon `stage` ne le verrait pas
    /// et le script ne trouverait plus le fichier.
    #[test]
    fn every_script_opens_them_by_the_staged_path() {
        let scripts: std::collections::BTreeMap<String, std::collections::BTreeMap<String, String>> =
            serde_json::from_str(include_str!("../scripts/scripts.json")).unwrap();
        let mut seen = 0;
        for (id, variants) in &scripts {
            for (v, body) in variants {
                for n in NAMES {
                    let any = body.to_lowercase().matches(&n.to_lowercase()).count();
                    let exact = body.matches(&format!("%RAGO_RES%\\{n}")).count();
                    assert_eq!(any, exact, "{id}:{v} ouvre {n} autrement que par %RAGO_RES%\\{n}");
                    seen += exact;
                }
            }
        }
        assert!(seen >= 3, "pow_plan, gpu_nvidia et nv_general importent ces fichiers");
    }
}
