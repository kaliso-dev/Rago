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

/// Variantes « retour arrière » (« id:variante ») marquées `revert` dans le catalogue : un joueur sans
/// licence, ou dont l'abonnement a pris fin, doit pouvoir remettre Windows comme avant.
static REVERTS: LazyLock<Vec<String>> = LazyLock::new(|| {
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("../../src/data/catalog.json")).expect("catalog.json invalide");
    let mut out = Vec::new();
    for m in catalog["modules"].as_array().into_iter().flatten() {
        for s in m["sections"].as_array().into_iter().flatten() {
            for t in s["tweaks"].as_array().into_iter().flatten() {
                for v in t["variants"].as_array().into_iter().flatten() {
                    if v["revert"] == true {
                        out.push(format!("{}:{}", t["id"].as_str().unwrap_or(""), v["id"].as_str().unwrap_or("")));
                    }
                }
            }
        }
    }
    out
});

/// Réglages au script identique (champ `twin` du catalogue) : id → id du premier de leur groupe.
static TWINS: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("../../src/data/catalog.json")).expect("catalog.json invalide");
    let mut out = HashMap::new();
    for m in catalog["modules"].as_array().into_iter().flatten() {
        for s in m["sections"].as_array().into_iter().flatten() {
            for t in s["tweaks"].as_array().into_iter().flatten() {
                if let (Some(id), Some(twin)) = (t["id"].as_str(), t["twin"].as_str()) {
                    out.insert(id.to_string(), twin.to_string());
                }
            }
        }
    }
    out
});

/// Nom anglais des réglages, pour les lignes du journal.
static NAMES_EN: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("../../src/data/catalog.json")).expect("catalog.json invalide");
    let mut out = HashMap::new();
    for m in catalog["modules"].as_array().into_iter().flatten() {
        for s in m["sections"].as_array().into_iter().flatten() {
            for t in s["tweaks"].as_array().into_iter().flatten() {
                if let (Some(id), Some(name)) = (t["id"].as_str(), t["name"]["en"].as_str()) {
                    out.insert(id.to_string(), name.to_string());
                }
            }
        }
    }
    out
});

/// Nom affiché d'un réglage (anglais), ou son identifiant s'il n'est pas au catalogue.
pub fn name_of(id: &str) -> &str {
    NAMES_EN.get(id).map(String::as_str).unwrap_or(id)
}

/// Premier réglage du groupe dont `id` partage exactement le script, s'il y en a un.
pub fn twin_of(id: &str) -> Option<&'static str> {
    TWINS.get(id).map(String::as_str)
}

/// Sans licence active, seuls les réglages du plan gratuit, les variantes de retour arrière et
/// l'installation de WMIC peuvent tourner.
pub fn allowed(id: &str, variant: Option<&str>, premium: bool) -> bool {
    premium
        || id == "__wmic"
        || FREE.iter().any(|f| f == id)
        || variant.is_some_and(|v| REVERTS.iter().any(|r| *r == format!("{id}:{v}")))
}

/// Scripts internes à l'app, qui ne viennent pas du .bat.
fn builtin(id: &str) -> Option<&'static str> {
    match id {
        // WMIC a été retiré de Windows 11 24H2 ; une partie des réglages du .bat s'en sert.
        "__wmic" => Some(
            "echo - Installing WMIC (Windows feature on demand)\r\n\
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
        assert!(SCRIPTS.len() > 200);
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
                for l in low.lines().filter(|l| !l.trim_start().starts_with("rem ") && !l.trim_start().starts_with("echo")) {
                    let heavy = l.contains("featuresettingsoverride")
                        || (l.contains("services\\bam\"") && l.contains("/d \"4\""))
                        || l.contains("set-processmitigation -system -disable")
                        || l.contains("image file execution options\\*")
                        || l.contains("hypervisorlaunchtype off")
                        || l.contains("disablerealtimemonitoring")
                        || l.contains("advfirewall reset")
                        || l.contains("clear-recyclebin")
                        || l.contains("disabledeletenotify 1")
                        || l.contains("disabledeletenotify ntfs 1")
                        || l.contains("\"enablesmartscreen\" /t reg_dword /d \"0\"")
                        || l.contains("\"noautoupdate\" /t reg_dword /d \"1\"")
                        || (l.contains("\\prefetch") && (l.starts_with("del ") || l.starts_with("forfiles")));
                    if heavy {
                        assert!(flagged.contains(id.as_str()), "{id} doit être Advanced avec avertissement : {l}");
                    }
                }
            }
        }
        assert!(SCRIPTS.values().flat_map(|v| v.values()).all(|s| !s.contains("USER_SID")));
    }

    /// Garde-fous de l'audit du 2026-10-05 sur l'ancien programme : ces lignes ne doivent pas revenir.
    #[test]
    fn dangerous_lines_stay_out() {
        let lines = |id: &str| -> Vec<String> {
            SCRIPTS[id].values().flat_map(|s| s.lines().map(str::to_lowercase).collect::<Vec<_>>()).collect()
        };
        assert!(!lines("dbl_edge").iter().any(|l| l.contains("edgewebview") || l.contains("edgeupdate")));
        for id in ["mem_profile", "mem_registry", "hitreg_suite"] {
            assert!(!lines(id).iter().any(|l| l.contains("featuresettingsoverride")), "{id}");
        }
        assert!(!lines("game_mode").iter().any(|l| l.contains("\\prefetch\\")));
        for id in ["win_background", "hitreg_suite"] {
            assert!(!lines(id).iter().any(|l| l.contains("services\\bam\"")), "{id}");
        }
        // date de dernier accès coupée, comme annoncé (choix de Sofiene, 2026-10-07) ; la variante hdd laisse Windows gérer (2)
        for (id, v) in [("sto_fsutil_v6", "_"), ("sto_fsutil2", "_"), ("sys_time", "_"), ("sto_fsutil", "ssd")] {
            let low = SCRIPTS[id][v].to_lowercase();
            assert!(low.contains("disablelastaccess 1") && !low.contains("disablelastaccess 0"), "{id}:{v}");
        }
        assert!(SCRIPTS["sto_fsutil"]["hdd"].to_lowercase().contains("disablelastaccess 2"));
        // TRIM laissé actif (choix de Sofiene, 2026-10-07)
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                let low = s.to_lowercase();
                assert!(!low.contains("disabledeletenotify 1") && !low.contains("disabledeletenotify ntfs 1"), "{id}:{v} coupe le TRIM");
            }
        }
    }

    /// Défauts relevés par la vérification du 2026-10-07 dans les scripts v6 : ils ne doivent pas revenir.
    #[test]
    fn v6_scripts_are_repaired() {
        let catalog = include_str!("../../src/data/catalog.json");
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                let low = s.to_lowercase();
                for l in low.lines() {
                    let t = l.trim();
                    assert!(!t.ends_with("do set \"str=%%i\" ("), "{id}:{v} boucle détachée : {l}");
                    assert!(!(t.contains("/v \"devicepriority\" /f") && t.starts_with("reg")) || t.starts_with("reg delete"), "{id}:{v} {l}");
                    assert!(!t.starts_with('/'), "{id}:{v} ligne orpheline : {l}");
                    assert!(!t.contains("c:\\users\\") || t.contains("%username%"), "{id}:{v} chemin de l'auteur : {l}");
                    assert!(!t.contains("{nic-id}") && !t.contains("c4accd00-2ba5") && !t.contains("122afb68-2ba4"), "{id}:{v} carte réseau de l'auteur : {l}");
                }
                assert!(!low.contains("messagebox") && !low.contains("risxn") && !low.contains("excusesfn"), "{id}:{v}");
                // une boîte ou un programme fenêtré bloque le script tant qu'on ne le ferme pas
                assert!(!low.contains("systempropertiesperformance.exe"), "{id}:{v}");
            }
            if SCRIPTS[id].values().any(|s| s.to_lowercase().contains("wmic")) && !id.starts_with("__") {
                let cat: serde_json::Value = serde_json::from_str(catalog).unwrap();
                let tw = cat["modules"].as_array().unwrap().iter()
                    .flat_map(|m| m["sections"].as_array().unwrap())
                    .flat_map(|s| s["tweaks"].as_array().unwrap())
                    .find(|t| t["id"] == id.as_str()).unwrap_or_else(|| panic!("{id} absent"));
                assert!(tw["requires"].as_array().is_some_and(|r| r.iter().any(|x| x == "wmic")), "{id} utilise WMIC sans le demander");
            }
        }
        // profils exclusifs : une seule valeur par variante
        for (v, s) in &SCRIPTS["sys_ram"] {
            assert_eq!(s.to_lowercase().matches("svchostsplitthresholdinkb").count(), 1, "sys_ram:{v}");
        }
        for (v, s) in &SCRIPTS["ping_packets"] {
            assert!(s.to_lowercase().matches("mtu=").count() <= 1, "ping_packets:{v}");
        }
        assert_eq!(SCRIPTS["ping_hitreg"].len(), 6);
        assert_eq!(SCRIPTS["ping_main"].len(), 4);
        // le RBW Mod remet ce que d'autres réglages coupent avant un screenshare
        let rbw = SCRIPTS["rbw_mode"]["on"].to_lowercase();
        assert!(rbw.contains("services\\bam\" /v \"start\" /t reg_dword /d \"1\""));
        assert!(rbw.contains("enableprefetcher\" /t reg_dword /d \"3\""));
        // BAM et le Prefetcher ne reviennent qu'au démarrage : l'app doit le demander
        let cat: serde_json::Value = serde_json::from_str(catalog).unwrap();
        let rbw = cat["modules"].as_array().unwrap().iter()
            .flat_map(|m| m["sections"].as_array().unwrap())
            .flat_map(|s| s["tweaks"].as_array().unwrap())
            .find(|t| t["id"] == "rbw_mode").expect("rbw_mode absent");
        let on = rbw["variants"].as_array().unwrap().iter().find(|v| v["id"] == "on").unwrap();
        let off = rbw["variants"].as_array().unwrap().iter().find(|v| v["id"] == "off").unwrap();
        assert_eq!((on["reboot"].as_bool(), off["reboot"].as_bool()), (Some(true), Some(false)));
        // scripts identiques sous deux noms : même niveau de risque, sinon la copie « safe » contourne l'avertissement
        let all: Vec<&serde_json::Value> = cat["modules"].as_array().unwrap().iter()
            .flat_map(|m| m["sections"].as_array().unwrap())
            .flat_map(|s| s["tweaks"].as_array().unwrap())
            .filter(|t| t.get("id").is_some()).collect();
        let twins: Vec<_> = all.iter().filter(|t| t.get("twin").is_some()).collect();
        assert_eq!(twin_of("pow_storage"), Some("pow_saving"));
        assert_eq!(twin_of("in_mouse"), None);
        assert_eq!(name_of("pow_saving"), "Drive idle power");
        assert_eq!(name_of("__unknown"), "__unknown");
        assert!(twins.len() >= 20, "{} réglages jumeaux", twins.len());
        for t in &twins {
            let first = all.iter().find(|o| o["id"] == t["twin"]).unwrap();
            assert_eq!(t["risk"], first["risk"], "{}", t["id"]);
            assert_eq!(SCRIPTS[t["id"].as_str().unwrap()].len(), SCRIPTS[first["id"].as_str().unwrap()].len());
        }
    }

    #[test]
    fn free_plan() {
        assert!(allowed("in_mouse", None, false) && allowed("rst_point", None, false) && allowed("__wmic", None, false));
        assert!(!allowed("gpu_nvidia", None, false) && !allowed("in_advanced", None, false));
        assert!(allowed("gpu_nvidia", None, true));
        // retours arrière ouverts en gratuit, pas les autres variantes
        assert!(allowed("game_mode", Some("off"), false) && !allowed("game_mode", Some("on"), false));
        assert!(allowed("ping_hitreg", Some("default"), false) && !allowed("ping_hitreg", Some("hypixel"), false));
        assert!(allowed("rbw_mode", Some("on"), false) && allowed("in_queue", Some("default"), false));
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
