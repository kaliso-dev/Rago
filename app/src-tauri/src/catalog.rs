//! Scripts batch des réglages, générés par tools/build_catalog.py et embarqués dans le binaire.

use std::collections::HashMap;
use std::sync::LazyLock;

type Scripts = HashMap<String, HashMap<String, String>>;

static SCRIPTS: LazyLock<Scripts> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../scripts/scripts.json")).expect("scripts.json invalide")
});

#[derive(serde::Deserialize)]
struct Free {
    tweaks: Vec<String>,
}

/// Réglages du plan gratuit, partagés avec l'interface (src/data/free.json).
static FREE: LazyLock<Vec<String>> = LazyLock::new(|| {
    serde_json::from_str::<Free>(include_str!("../../src/data/free.json")).expect("free.json invalide").tweaks
});

/// Sans licence active, seuls les réglages du plan gratuit (et l'installation de WMIC) peuvent tourner.
pub fn allowed(id: &str, premium: bool) -> bool {
    premium || id == "__wmic" || FREE.iter().any(|f| f == id)
}

/// Scripts internes à l'app, qui ne viennent pas du .bat.
fn builtin(id: &str) -> Option<&'static str> {
    match id {
        // WMIC a été retiré de Windows 11 24H2 ; une partie des réglages du .bat s'en sert.
        "__wmic" => Some(
            "echo - Installation de WMIC (fonctionnalité Windows à la demande)\r\n\
             DISM /Online /Add-Capability /CapabilityName:WMIC~~~~0.0.1.0 /NoRestart",
        ),
        _ => None,
    }
}

/// Script d'un réglage. `variant` vaut None pour un réglage sans variantes.
pub fn script(id: &str, variant: Option<&str>) -> Option<String> {
    if let Some(s) = builtin(id) {
        return Some(s.to_string());
    }
    let entry = SCRIPTS.get(id)?;
    match variant {
        Some(v) => entry.get(v).cloned(),
        None => entry.get("_").cloned().or_else(|| {
            if entry.len() == 1 {
                entry.values().next().cloned()
            } else {
                None
            }
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_script_is_non_empty_and_non_interactive() {
        assert!(SCRIPTS.len() > 50);
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                assert!(!s.trim().is_empty(), "{id}:{v} est vide");
                let low = s.to_lowercase();
                assert!(!low.contains("set /p input"), "{id}:{v} attend une saisie");
                assert!(!low.contains("full  pc  gamer"), "{id}:{v} contient un chemin de l'auteur");
                // le rechercher/remplacer « Disable » -> « Disabling » doit être corrigé partout
                let is_text = |l: &str| {
                    let l = l.trim_start().to_lowercase();
                    l.starts_with("echo") || l.starts_with("::") || l.starts_with("rem ")
                };
                for line in s.lines().filter(|l| !is_text(l)) {
                    assert!(!line.contains("Disabling") && !line.contains("Enabling"), "{id}:{v}: {line}");
                }
            }
        }
    }

    /// Garde-fous de l'audit du 2026-10-05, appliqués au catalogue de Sofiene (2026-10-06) :
    /// WebView2 n'est jamais supprimé (l'app en a besoin pour s'afficher), et les réglages qui coupent
    /// Spectre/Meltdown ou BAM sont marqués Advanced avec un avertissement affiché avant de lancer.
    #[test]
    fn dangerous_lines_are_flagged() {
        let catalog: serde_json::Value = serde_json::from_str(include_str!("../../src/data/catalog.json")).unwrap();
        let mut flagged = std::collections::HashSet::new();
        for m in catalog["modules"].as_array().unwrap() {
            for s in m["sections"].as_array().unwrap() {
                for t in s["tweaks"].as_array().unwrap() {
                    if t["risk"] == "advanced" && t.get("confirm").is_some() {
                        flagged.insert(t["id"].as_str().unwrap().to_string());
                    }
                }
            }
        }
        for (id, variants) in SCRIPTS.iter() {
            for s in variants.values() {
                let low = s.to_lowercase();
                assert!(!low.contains("edgewebview"), "{id} touche à WebView2");
                for l in low.lines().filter(|l| !l.trim_start().starts_with("rem ")) {
                    if l.contains("featuresettingsoverride") || l.contains("services\\bam\"") {
                        assert!(flagged.contains(id.as_str()), "{id} doit être Advanced avec avertissement : {l}");
                    }
                }
            }
        }
        assert!(SCRIPTS.values().flat_map(|v| v.values()).all(|s| !s.contains("USER_SID")));
    }

    #[test]
    fn free_plan() {
        assert!(allowed("in_mouse", false) && allowed("rst_point", false) && allowed("__wmic", false));
        assert!(!allowed("gpu_nvidia", false) && !allowed("in_advanced", false));
        assert!(allowed("gpu_nvidia", true));
        let catalog = include_str!("../../src/data/catalog.json");
        for id in FREE.iter() {
            assert!(catalog.contains(&format!("\"id\": \"{id}\"")), "{id} absent du catalogue");
        }
    }

    #[test]
    fn lookup() {
        assert!(script("ping_hitreg", Some("hypixel")).unwrap().contains("DefaultTTL"));
        assert!(script("ping_hitreg", None).is_none());
        assert!(script("in_queue", Some("ultra")).unwrap().contains("MouseDataQueueSize"));
        assert!(script("gpu_nvidia", None).unwrap().contains("%RAGO_RES%"));
        assert!(script("__wmic", None).is_some());
    }
}
