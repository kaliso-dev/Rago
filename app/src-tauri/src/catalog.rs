//! Scripts batch des réglages, générés par tools/build_catalog.py et embarqués dans le binaire.

use std::collections::HashMap;
use std::sync::LazyLock;

type Scripts = HashMap<String, HashMap<String, String>>;

static SCRIPTS: LazyLock<Scripts> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../scripts/scripts.json")).expect("scripts.json invalide")
});

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
        assert!(SCRIPTS.len() > 150);
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

    #[test]
    fn lookup() {
        assert!(script("net_nagle", None).unwrap().contains("TCPNoDelay"));
        assert!(script("net_profile", Some("qos")).unwrap().contains("javaw.exe"));
        assert!(script("net_profile", None).is_none());
        assert!(script("__wmic", None).is_some());
    }
}
