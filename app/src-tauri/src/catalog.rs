//! Scripts batch des réglages, générés par tools/build_catalog.py et embarqués dans le binaire.
//!
//! Les scripts du plan gratuit et les variantes de retour arrière sont en clair ; ceux des réglages Premium
//! sont chiffrés (voir seal.rs) et ne s'ouvrent qu'avec la clé que le serveur donne à une licence active.

use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex};

type Scripts = HashMap<String, HashMap<String, String>>;

#[derive(serde::Deserialize, Default)]
pub struct Bundle {
    #[serde(default)]
    scripts: Scripts,
    #[serde(default)]
    probes: Scripts,
    /// annulation (scripts/undo.json) : chiffrée elle aussi pour les réglages Premium
    #[serde(default)]
    undo: HashMap<String, HashMap<String, Undo>>,
}

/// Scripts en clair, préparés par build.rs (embed_scripts.rs).
static PLAIN: LazyLock<Bundle> = LazyLock::new(|| {
    serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/scripts.plain.json"))).expect("scripts.plain.json invalide")
});
static SEALED: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/scripts.sealed"));
/// Scripts Premium déchiffrés, gardés en mémoire avec la clé qui les a ouverts.
static OPENED: Mutex<Option<([u8; 32], Arc<Bundle>)>> = Mutex::new(None);

/// Ouvre les scripts Premium avec la clé reçue du serveur. None : clé absente ou fausse (version différente).
pub fn premium(key: &[u8; 32]) -> Option<Arc<Bundle>> {
    let mut opened = OPENED.lock().unwrap();
    if let Some((k, b)) = opened.as_ref() {
        if k == key {
            return Some(Arc::clone(b));
        }
    }
    let plain = crate::seal::open(key, SEALED)?;
    let bundle: Arc<Bundle> = Arc::new(serde_json::from_slice(&plain).ok()?);
    *opened = Some((*key, Arc::clone(&bundle)));
    Some(bundle)
}

/// Tous les scripts, en clair, pour les tests seulement : l'exe n'embarque pas ce fichier.
#[cfg(test)]
static SCRIPTS: LazyLock<Scripts> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../scripts/scripts.json")).expect("scripts.json invalide")
});

pub use crate::backup::Undo;

/// Annulation du réglage (voir backup::Undo) : en clair pour le plan gratuit, dans les scripts Premium sinon.
pub fn undo_of(id: &str, variant: Option<&str>, premium: Option<&Bundle>) -> Option<Undo> {
    PLAIN.undo.get(id).or_else(|| premium?.undo.get(id)).and_then(|e| pick(e, variant)).cloned()
}

fn pick<'a, T>(entry: &'a HashMap<String, T>, variant: Option<&str>) -> Option<&'a T> {
    match variant {
        Some(v) => entry.get(v).or_else(|| entry.get("_")),
        None => entry.get("_"),
    }
}

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

/// Type de chaque réglage du catalogue : "tweak" (interrupteur, qu'on peut annuler) ou "action" (ponctuel).
static KINDS: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("../../src/data/catalog.json")).expect("catalog.json invalide");
    let mut out = HashMap::new();
    for m in catalog["modules"].as_array().into_iter().flatten() {
        for s in m["sections"].as_array().into_iter().flatten() {
            for t in s["tweaks"].as_array().into_iter().flatten() {
                if let (Some(id), Some(kind)) = (t["id"].as_str(), t["kind"].as_str()) {
                    out.insert(id.to_string(), kind.to_string());
                }
            }
        }
    }
    out
});

/// Réglage qu'on allume et qu'on annule (pas une action ponctuelle ni un script interne).
pub fn is_switch(id: &str) -> bool {
    KINDS.get(id).is_some_and(|k| k == "tweak")
}

#[cfg(test)]
pub fn is_free(id: &str) -> bool {
    FREE.iter().any(|f| f == id)
}

/// Variante de retour arrière (« Default », RBW Mod « On »…) : l'appliquer revient à annuler le réglage.
pub fn is_revert(id: &str, variant: Option<&str>) -> bool {
    variant.is_some_and(|v| REVERTS.iter().any(|r| *r == format!("{id}:{v}")))
}

pub fn revert_variant(id: &str) -> Option<String> {
    REVERTS.iter().find_map(|r| r.strip_prefix(&format!("{id}:")).map(str::to_string))
}

/// Script en clair (plan gratuit, retour arrière), sans licence.
pub fn is_plain(id: &str, variant: Option<&str>) -> bool {
    builtin(id).is_some() || PLAIN.scripts.get(id).and_then(|e| pick(e, variant)).is_some()
}

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

/// Nom anglais des réglages, pour les lignes du journal (réglages retirés compris : leur annulation y passe).
static NAMES_EN: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("../../src/data/catalog.json")).expect("catalog.json invalide");
    let mut out = HashMap::new();
    let retired = catalog["retired"].as_array().into_iter().flatten();
    for t in catalog["modules"].as_array().into_iter().flatten()
        .flat_map(|m| m["sections"].as_array().into_iter().flatten())
        .flat_map(|s| s["tweaks"].as_array().into_iter().flatten())
        .chain(retired)
    {
        if let (Some(id), Some(name)) = (t["id"].as_str(), t["name"]["en"].as_str()) {
            out.insert(id.to_string(), name.to_string());
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

/// Script d'un réglage. `variant` vaut None pour un réglage sans variantes. Les scripts Premium demandent
/// le paquet ouvert avec la clé de la licence.
pub fn script(id: &str, variant: Option<&str>, premium: Option<&Bundle>) -> Option<String> {
    if let Some(s) = builtin(id) {
        return Some(s.to_string());
    }
    PLAIN
        .scripts
        .get(id)
        .and_then(|e| pick(e, variant))
        .or_else(|| premium.and_then(|b| b.scripts.get(id)).and_then(|e| pick(e, variant)))
        .cloned()
}

/// Relevé du réglage (tools/probes.py) : ce que son script va modifier.
pub fn probe(id: &str, variant: Option<&str>, premium: Option<&Bundle>) -> Option<String> {
    PLAIN
        .probes
        .get(id)
        .and_then(|e| pick(e, variant))
        .or_else(|| premium.and_then(|b| b.probes.get(id)).and_then(|e| pick(e, variant)))
        .cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; 32] {
        crate::seal::version_key(crate::seal::TEST_SECRET, option_env!("RAGO_APP_VERSION").unwrap_or(env!("CARGO_PKG_VERSION")))
    }

    /// Les scripts Premium ne sont pas en clair dans l'exe et ne s'ouvrent qu'avec la clé de la version.
    #[test]
    fn premium_scripts_are_sealed() {
        let bundle = premium(&test_key()).expect("le paquet s'ouvre avec la clé de test");
        assert!(premium(&crate::seal::version_key(crate::seal::TEST_SECRET, "0.0.0")).is_none());
        let plain_text = include_str!(concat!(env!("OUT_DIR"), "/scripts.plain.json"));
        let mut sealed_n = 0;
        for (id, variants) in SCRIPTS.iter() {
            for (v, body) in variants {
                let open = is_free(id) || is_revert(id, Some(v));
                let in_plain = PLAIN.scripts.get(id).and_then(|e| e.get(v));
                let in_sealed = bundle.scripts.get(id).and_then(|e| e.get(v));
                assert_eq!(in_plain.is_some(), open, "{id}:{v}");
                assert_eq!(in_plain.or(in_sealed), Some(body), "{id}:{v} doit se retrouver à l'identique");
                assert!(PLAIN.probes.get(id).and_then(|e| e.get(v)).or(bundle.probes.get(id).and_then(|e| e.get(v))).is_some(), "{id}:{v} sans relevé");
                if !open {
                    sealed_n += 1;
                    assert!(!PLAIN.probes.contains_key(id), "relevé Premium en clair : {id}");
                    // une ligne propre à ce script ne doit apparaître nulle part en clair
                    if let Some(line) = body.lines().map(str::trim).filter(|l| l.len() > 60).find(|l| {
                        !SCRIPTS.iter().any(|(i, vs)| (is_free(i) || REVERTS.iter().any(|r| r.starts_with(&format!("{i}:")))) && vs.values().any(|b| b.contains(*l)))
                    }) {
                        let json_line = serde_json::to_string(line).unwrap();
                        assert!(!plain_text.contains(json_line.trim_matches('"')), "{id}:{v} en clair : {line}");
                        assert!(!SEALED.windows(line.len()).any(|w| w == line.as_bytes()), "{id}:{v} lisible dans le paquet chiffré");
                    }
                }
            }
        }
        assert!(sealed_n > 150, "{sealed_n} scripts chiffrés");
        assert!(script("in_mouse", None, None).is_some(), "plan gratuit sans licence");
        assert!(script("net_nagle", None, None).is_none(), "Premium sans licence");
        assert!(script("net_nagle", None, Some(&bundle)).is_some());
        // réglages ajoutés en 1.1.6 : Premium, et chaque valeur touchée est relevée avant d'appliquer
        for id in ["win_ai", "win_autoplay"] {
            assert!(script(id, None, None).is_none(), "{id} sans licence");
            let p = probe(id, None, Some(&bundle)).expect(id);
            assert_eq!(p.matches("@@RAGO reg ").count(), script(id, None, Some(&bundle)).unwrap().matches("reg add").count(), "{id}");
        }
        assert!(script("ping_hitreg", Some("default"), None).is_some(), "retour arrière sans licence");
        // annulation : chiffrée avec les scripts Premium, en clair pour le plan gratuit
        assert!(undo_of("net_nagle", None, None).is_none(), "annulation Premium lisible sans licence");
        assert!(undo_of("net_nagle", None, Some(&bundle)).and_then(|u| u.full).is_some());
        assert!(undo_of("win_gamedvr", None, None).and_then(|u| u.full).is_some(), "annulation du plan gratuit");
        assert!(undo_of("pow_ultimate", None, Some(&bundle)).is_some_and(|u| u.rest_avant && u.rest.is_some()));
        let reg_lines = |u: &Undo| u.full.iter().chain(u.rest.iter()).flat_map(|s| s.lines()).filter(|l| l.trim().len() > 60).map(str::trim).map(String::from).collect::<Vec<_>>();
        for (id, vs) in bundle.undo.iter() {
            for u in vs.values() {
                for l in reg_lines(u) {
                    let free_too = PLAIN.undo.values().flat_map(|e| e.values()).any(|f| reg_lines(f).contains(&l));
                    if !free_too {
                        let json_line = serde_json::to_string(&l).unwrap();
                        assert!(!plain_text.contains(json_line.trim_matches('"')), "annulation {id} en clair : {l}");
                    }
                }
            }
        }
    }

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
        assert!(SCRIPTS["sto_ntfs"]["_"].to_lowercase().contains("disabledeletenotify 0"), "sto_ntfs rallume le TRIM");
        // audit du 2026-10-07 : RBW Mod désactivé remet ces services en automatique, comme Windows
        let off = SCRIPTS["rbw_mode"]["off"].to_lowercase();
        for svc in ["eventlog", "schedule", "dps", "sysmain", "pcasvc"] {
            assert!(!off.contains(&format!("sc config {svc} start= demand")), "rbw_mode:off met {svc} en manuel");
        }
        assert!(off.contains("sc config eventlog start= auto"));
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                let low = s.to_lowercase();
                // UAC coupé entièrement : le Minecraft Launcher et les applis du Store ne s'ouvrent plus
                assert!(!low.lines().any(|l| l.contains("enablelua") && l.contains("/d \"0\"")), "{id}:{v} EnableLUA 0");
                // wmic n'est plus installé par défaut (Windows 11 24H2)
                assert!(!low.contains("wmic "), "{id}:{v} utilise wmic");
            }
        }
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

    /// Aucun réglage Safe ne coupe le MPO ni la préemption du GPU (tools/safety.py, 2026-10-10) : ces changements
    /// restent dans des réglages Advanced. Les valeurs « Preemption » de pri_game sont sous Image File Execution
    /// Options, que Windows ignore pour ces noms.
    #[test]
    fn safe_tweaks_keep_mpo_and_preemption() {
        let catalog: serde_json::Value = serde_json::from_str(include_str!("../../src/data/catalog.json")).unwrap();
        let all: Vec<&serde_json::Value> = catalog["modules"].as_array().unwrap().iter()
            .flat_map(|m| m["sections"].as_array().unwrap())
            .flat_map(|s| s["tweaks"].as_array().unwrap())
            .filter(|t| t.get("id").is_some()).collect();
        for t in all.iter().filter(|t| t["risk"] == "safe") {
            let id = t["id"].as_str().unwrap();
            for (v, s) in SCRIPTS.get(id).into_iter().flatten() {
                for l in s.lines().map(|l| l.trim().to_lowercase()).filter(|l| !l.starts_with("echo") && !l.starts_with("rem ") && !l.starts_with("::")) {
                    let display = l.contains("\"overlaytestmode\" /t reg_dword /d \"5\"")
                        || (l.contains("preemption") && !l.contains("image file execution options"));
                    assert!(!display, "{id}:{v} : {l}");
                }
            }
        }
        for id in ["nv_preemption", "nv_advanced", "amd_advanced"] {
            assert!(all.iter().any(|t| t["id"] == id && t["risk"] == "advanced"), "{id}");
        }
    }

    /// Réglages retirés (tools/safety.py, 2026-10-08) : ni script ni relevé, absents du catalogue et des profils, mais
    /// leur annulation reste là pour les PC où une version précédente les a appliqués. Les lignes risquées qu'ils
    /// portaient ne se retrouvent plus dans aucun autre script.
    #[test]
    fn retired_tweaks_cannot_run() {
        let bundle = premium(&test_key()).unwrap();
        let catalog: serde_json::Value = serde_json::from_str(include_str!("../../src/data/catalog.json")).unwrap();
        let retired: Vec<&str> = catalog["retired"].as_array().unwrap().iter().map(|r| r["id"].as_str().unwrap()).collect();
        assert_eq!(retired.len(), 16);
        let listed: Vec<&str> = catalog["modules"].as_array().unwrap().iter()
            .flat_map(|m| m["sections"].as_array().unwrap())
            .flat_map(|s| s["tweaks"].as_array().unwrap())
            .filter_map(|t| t["id"].as_str().or(t["ref"].as_str()))
            .chain(catalog["presets"].as_array().unwrap().iter()
                .flat_map(|p| p["tweaks"].as_array().unwrap())
                .map(|e| e.as_str().unwrap().split(':').next().unwrap()))
            .collect();
        for id in &retired {
            assert!(!SCRIPTS.contains_key(*id), "{id} a encore un script");
            assert!(!PLAIN.scripts.contains_key(*id) && !bundle.scripts.contains_key(*id), "{id} embarqué");
            assert!(!PLAIN.probes.contains_key(*id) && !bundle.probes.contains_key(*id), "{id} relevé");
            assert!(script(id, None, Some(&bundle)).is_none() && script(id, Some("off"), Some(&bundle)).is_none(), "{id}");
            assert!(!listed.contains(id), "{id} encore au catalogue ou dans un profil");
            assert_ne!(name_of(id), *id, "{id} sans nom pour le journal");
        }
        for id in ["win_mitigations", "nv_tdr", "dbl_xbox", "win_smartscreen", "exp_bios"] {
            assert!(undo_of(id, None, Some(&bundle)).is_some_and(|u| u.full.is_some() || u.rest.is_some()), "annulation de {id}");
        }
        assert!(undo_of("win_coreiso", Some("off"), Some(&bundle)).is_some(), "annulation de win_coreiso:off");
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                for l in s.lines().map(|l| l.trim().to_lowercase()).filter(|l| !l.starts_with("echo") && !l.starts_with("rem ")) {
                    let risky = l.contains("featuresettingsoverride")
                        || l.contains("set-processmitigation -system -disable")
                        || l.contains("hypervisorlaunchtype off")
                        || l.contains("disablerealtimemonitoring\" /t reg_dword /d \"1")
                        || l.contains("advfirewall reset")
                        || l.contains("clear-recyclebin")
                        || l.contains("\"enablesmartscreen\" /t reg_dword /d \"0\"")
                        || l.contains("\"noautoupdate\" /t reg_dword /d \"1\"")
                        || (l.contains("\"enablelua\"") && l.contains("/d \"0\""))
                        || l.contains("\"consentpromptbehavioradmin\" /t reg_dword /d \"0\"")
                        || l.contains("\"tdrlevel\"")
                        || l.contains("\"enableprefetcher\" /t reg_dword /d \"0\"")
                        || l.contains("services\\bam\" /v \"start\" /t reg_dword /d \"4\"")
                        || (l.contains("hypervisorenforcedcodeintegrity") && l.contains("/d \"0\""))
                        || l.contains("nx alwaysoff")
                        || l.contains("disableelamdrivers yes");
                    assert!(!risky, "{id}:{v} : {l}");
                }
            }
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
        let b = premium(&test_key()).unwrap();
        assert!(script("ping_hitreg", Some("hypixel"), Some(&b)).unwrap().contains("DefaultTTL"));
        assert!(script("ping_hitreg", None, Some(&b)).is_none());
        assert!(script("in_queue", Some("ultra"), Some(&b)).unwrap().contains("MouseDataQueueSize"));
        assert!(script("gpu_nvidia", None, Some(&b)).unwrap().contains("%RAGO_RES%"));
        assert!(script("__wmic", None, None).is_some());
        assert!(probe("net_nagle", None, Some(&b)).unwrap().contains("@@RAGO reg"));
        assert!(is_switch("net_nagle") && !is_switch("rst_point") && !is_switch("__wmic"));
        assert_eq!(revert_variant("ping_hitreg").as_deref(), Some("default"));
    }

    const RAGO_PLAN: &str = "7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4";
    /// Corrigés à l'import du plan Rago (sous-groupe, réglage, valeur branché) : repos processeur actif, mot de passe
    /// au réveil, bouton d'alimentation qui éteint le PC.
    const RAGO_PLAN_FIXES: [(&str, &str, u32); 3] = [
        ("54533251-82be-4824-96c1-47b60b740d00", "5d76a2ca-e8c0-402f-a133-2158492d58ad", 0),
        ("fea3413e-7e05-4911-9a71-700331f1c294", "0e796bdb-100d-47d6-a2d5-f7d2daa51f51", 1),
        ("4f971e89-eebd-4455-a8de-9e59040e7347", "7648efa3-dd9c-4e3e-b566-50f929386280", 3),
    ];

    /// Plan Rago Low Latency (LowLatency.pow, 2026-10-10) : le fichier arrive avec le repos processeur coupé, sans mot
    /// de passe au réveil et un bouton d'alimentation sans effet. Le script les remet, puis renomme et active le plan.
    #[test]
    fn rago_power_plan_is_corrected_on_import() {
        assert!(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/LowLatency.pow").is_file());
        let s = SCRIPTS["pow_plan"]["_"].to_lowercase();
        for (sub, setting, value) in RAGO_PLAN_FIXES {
            assert!(s.contains(&format!("powercfg -setacvalueindex {RAGO_PLAN} {sub} {setting} {value}")), "{setting}");
        }
        assert!(s.contains(&format!("powercfg -changename {RAGO_PLAN} \"rago low latency\"")));
        assert!(s.find("-setactive").unwrap() > s.rfind("-setacvalueindex").unwrap(), "activé après les corrections");
    }

    /// Le vrai fichier passé à powercfg (CI Windows, administrateur) sous un GUID de test : rien n'est activé, le plan
    /// est supprimé à la fin.
    #[cfg(windows)]
    #[test]
    fn rago_power_plan_imports_on_windows() {
        if !crate::shell::is_elevated() {
            // sur la CI (administrateur), un test sauté ne prouverait rien
            assert!(std::env::var_os("CI").is_none(), "CI sans droits administrateur : le plan n'a pas été importé");
            eprintln!("powercfg -import demande les droits administrateur : test sauté");
            return;
        }
        const TEST_PLAN: &str = "7c4e2a51-3b9d-4f7e-9a62-00000000c0de";
        struct Cleanup;
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = crate::shell::hidden("powercfg.exe").args(["-delete", TEST_PLAN]).output();
            }
        }
        let _cleanup = Cleanup;
        let powercfg = |args: &[&str]| {
            let o = crate::shell::hidden("powercfg.exe").args(args).output().unwrap();
            (o.status.success(), format!("{}{}", String::from_utf8_lossy(&o.stdout), String::from_utf8_lossy(&o.stderr)))
        };
        let res = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources");
        let line = SCRIPTS["pow_plan"]["_"].lines().find(|l| l.contains("powercfg -import")).unwrap().replace(RAGO_PLAN, TEST_PLAN);
        for cmd in line.split(" & ").filter(|c| !c.contains("-setactive")) {
            let cmd = cmd.replace("%RAGO_RES%", &res.to_string_lossy());
            // arguments séparés par des espaces, "…" gardés entiers
            let args: Vec<&str> = cmd.split('"').enumerate().flat_map(|(i, p)| if i % 2 == 1 { vec![p] } else { p.split_whitespace().collect() }).collect();
            assert_eq!(args[0], "powercfg");
            let (ok, out) = powercfg(&args[1..]);
            assert!(ok, "{cmd}\n{out}");
        }
        let (_, list) = powercfg(&["/list"]);
        assert!(list.contains(TEST_PLAN) && list.contains("(Rago Low Latency)"), "{list}");
        let ac = |sub: &str, setting: &str| {
            ["/q", "/qh"].into_iter().find_map(|q| crate::backup::parse_pwr(&powercfg(&[q, TEST_PLAN, sub, setting]).1).0)
        };
        for (sub, setting, value) in RAGO_PLAN_FIXES {
            assert_eq!(ac(sub, setting), Some(value), "{setting}");
        }
        // une valeur du fichier : écran jamais éteint branché (le plan Performances élevées l'éteint après 15 min)
        assert_eq!(ac("7516b95f-f776-4464-8c53-06167f40cc99", "3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e"), Some(0));
    }
}
