//! Scripts batch des réglages, générés par tools/build_catalog.py et embarqués dans le binaire.
//!
//! Tous les scripts sont chiffrés dans l'exe (voir seal.rs) : aucune commande n'y est en clair. Ceux du plan
//! gratuit et les variantes de retour arrière s'ouvrent avec une clé reconstruite dans le binaire (ils doivent
//! tourner sans licence) ; ceux des réglages Premium ne s'ouvrent qu'avec la clé que le serveur donne à une
//! licence active.

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

/// Scripts du plan gratuit et de retour arrière, préparés par build.rs (embed_scripts.rs). Chiffrés eux aussi,
/// avec une clé reconstruite dans le binaire : ils doivent tourner sans licence, donc on les ouvre au démarrage.
static PLAIN_SEALED: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/scripts.plain.sealed"));
static PLAIN: LazyLock<Bundle> = LazyLock::new(|| {
    let key = crate::seal::offline_key(env!("CARGO_PKG_VERSION"));
    let plain = crate::seal::open(&key, PLAIN_SEALED).expect("scripts.plain.sealed illisible");
    serde_json::from_slice(&plain).expect("scripts.plain.sealed invalide")
});
/// Scripts Premium, chiffrés avec la clé de la version (restée sur le serveur de licences).
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

/// Réglage du plan gratuit : il reste appliqué quand Premium prend fin.
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

/// Réglage dont le retour arrière lance toujours le script de sa variante `revert`, jamais la sauvegarde : RBW Mod
/// « Activé » doit démarrer les services que lit le screenshare et remettre ce que d'autres réglages coupent. La
/// sauvegarde prise avant « Désactivé » ne fait que réécrire le registre (aucun service démarré) et recouperait les
/// services qu'un autre réglage avait coupés. Exception (runner.rs) : défaire le « Désactivé » de cette version
/// (Applied::windows_values) ne lance rien, il n'a posé que les valeurs de Windows.
pub fn revert_runs_script(id: &str) -> bool {
    id == "rbw_mode"
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

/// Applis du Store que chaque réglage désinstalle (champ `apps` du catalogue, tools/probes.py) : noms de paquet avec
/// jokers, comme dans `Get-AppxPackage`. En clair, scripts Premium fermés ou pas : l'annulation sans relevé s'en sert.
static APPS: LazyLock<HashMap<String, Vec<String>>> = LazyLock::new(|| {
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("../../src/data/catalog.json")).expect("catalog.json invalide");
    let mut out = HashMap::new();
    for t in catalog["modules"].as_array().into_iter().flatten()
        .flat_map(|m| m["sections"].as_array().into_iter().flatten())
        .flat_map(|s| s["tweaks"].as_array().into_iter().flatten())
    {
        if let (Some(id), Some(apps)) = (t["id"].as_str(), t["apps"].as_array()) {
            out.insert(id.to_string(), apps.iter().filter_map(|a| a.as_str().map(str::to_string)).collect());
        }
    }
    out
});

/// Applis du Store que le réglage désinstalle (vide pour les autres).
pub fn apps_of(id: &str) -> &'static [String] {
    APPS.get(id).map(Vec::as_slice).unwrap_or(&[])
}

/// Anciennes actions ponctuelles devenues des cases (RAG-65, 2026-10-13) : lancées par une version d'avant, elles
/// sont notées appliquées d'après l'historique pour qu'on puisse les éteindre et récupérer les applis du Store.
pub const FORMER_ACTIONS: &[&str] = &["app_remove", "win_apps"];

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

    /// Aucun script (gratuit ou Premium) n'est en clair dans l'exe : les deux paquets embarqués ne contiennent que
    /// du chiffré, et chacun ne s'ouvre qu'avec sa clé (hors ligne pour le gratuit, version pour le Premium).
    #[test]
    fn scripts_are_sealed() {
        let bundle = premium(&test_key()).expect("le paquet Premium s'ouvre avec la clé de test");
        assert!(premium(&crate::seal::version_key(crate::seal::TEST_SECRET, "0.0.0")).is_none());
        // le paquet gratuit est chiffré, et ne s'ouvre qu'avec la clé hors ligne de cette version
        assert!(crate::seal::open(&crate::seal::offline_key(env!("CARGO_PKG_VERSION")), PLAIN_SEALED).is_some());
        assert!(crate::seal::open(&crate::seal::offline_key("0.0.0"), PLAIN_SEALED).is_none());
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
                    assert!(!PLAIN.probes.contains_key(id), "relevé Premium dans le paquet gratuit : {id}");
                }
                // une ligne de ce script ne doit se lire en clair dans aucun des deux paquets embarqués
                if let Some(line) = body.lines().map(str::trim).find(|l| l.len() > 60) {
                    assert!(!PLAIN_SEALED.windows(line.len()).any(|w| w == line.as_bytes()), "{id}:{v} lisible dans scripts.plain.sealed");
                    assert!(!SEALED.windows(line.len()).any(|w| w == line.as_bytes()), "{id}:{v} lisible dans scripts.sealed");
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
        // annulation : dans le paquet Premium pour les réglages Premium, dans le paquet gratuit sinon ; les deux chiffrés
        assert!(undo_of("net_nagle", None, None).is_none(), "annulation Premium lisible sans licence");
        assert!(undo_of("net_nagle", None, Some(&bundle)).and_then(|u| u.full).is_some());
        assert!(undo_of("win_gamedvr", None, None).and_then(|u| u.full).is_some(), "annulation du plan gratuit");
        assert!(undo_of("pow_ultimate", None, Some(&bundle)).is_some_and(|u| u.rest_avant && u.rest.is_some()));
        let first_long = |u: &Undo| u.full.iter().chain(u.rest.iter()).flat_map(|s| s.lines()).map(str::trim).find(|l| l.len() > 60).map(String::from);
        for (id, vs) in bundle.undo.iter() {
            for u in vs.values() {
                if let Some(l) = first_long(u) {
                    assert!(!PLAIN_SEALED.windows(l.len()).any(|w| w == l.as_bytes()), "annulation {id} lisible dans scripts.plain.sealed : {l}");
                    assert!(!SEALED.windows(l.len()).any(|w| w == l.as_bytes()), "annulation {id} lisible dans scripts.sealed : {l}");
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
                    assert!(!t.contains("c:\\users\\") || t.contains("!username!"), "{id}:{v} chemin de l'auteur : {l}");
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
        assert!(rbw.contains("bam = 1;") && rbw.contains("set-start $name $services[$name]"));
        assert!(rbw.contains("foreach ($v in 'enableprefetcher', 'enablesuperfetch') { if ((reg $pf $v) -ne 3) { set-itemproperty -path $pf -name $v -value 3"));
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

    /// Retour arrière (RAG-60, 2026-10-13) : l'annulation ne remet que ce que l'app a changé. Les commandes qui
    /// posent la valeur de Windows sans savoir ce que le joueur avait (rest) ne tournent que sans relevé de l'état,
    /// et full laisse les valeurs qu'un autre réglage encore appliqué modifie (étiquettes `writes`).
    #[test]
    fn undo_puts_back_only_what_the_app_changed() {
        let bundle = premium(&test_key()).unwrap();
        let undo: Vec<(&String, &String, &Undo)> =
            PLAIN.undo.iter().chain(bundle.undo.iter()).flat_map(|(id, vs)| vs.iter().map(move |(v, u)| (id, v, u))).collect();
        assert!(undo.len() > 150, "{} annulations", undo.len());
        let probe_of = |id: &str, v: &str| {
            PLAIN.probes.get(id).or(bundle.probes.get(id)).and_then(|e| pick(e, Some(v))).cloned().unwrap_or_default()
        };
        const BLIND: [(&str, &str); 9] = [
            ("enable-mmagent", "mmagent"),
            ("disable-mmagent", "mmagent"),
            ("/maxpwage", "maxpwage"),
            ("reset-netadapteradvancedproperty", "nic"),
            ("set-netadapterpowermanagement", "nic"),
            ("enable-netadapterlso", "nic"),
            ("mspower_deviceenable", "pnppower"),
            ("set-smbclientconfiguration", "smb"),
            ("set-smbserverconfiguration", "smb"),
        ];
        let (mut guarded, mut held) = (0, 0);
        for (id, v, u) in &undo {
            let full = u.full.as_deref().unwrap_or("").to_lowercase();
            let rest = u.rest.as_deref().unwrap_or("").to_lowercase();
            // rest tourne aussi après une sauvegarde de cette version : il ne lance que ce que les scripts appliqués
            // depuis 1.1.6 lancent (l'audit de sécurité n'est plus touché que par win_audit, que full remet)
            assert!(!rest.contains("auditpol") || id.as_str() == "win_audit", "{id}:{v} touche à l'audit de sécurité");
            for s in [&full, &rest] {
                assert!(!s.contains("disable-computerrestore"), "{id}:{v} coupe la protection système des autres disques");
                for l in s.lines() {
                    assert!(!(l.contains("sfio priority") && l.contains("reg_dword")), "{id}:{v} SFIO Priority en DWORD : {l}");
                    // clés des cartes graphiques (Control\Class\{4d36e968…}\0000…) : seulement des valeurs, jamais la clé
                    if l.contains("reg delete") && l.contains("control\\class\\{4d36e968") {
                        assert!(l.contains(" /v "), "{id}:{v} supprime la clé de la carte graphique : {l}");
                    }
                }
            }
            for l in rest.lines() {
                for (cmd, state) in BLIND {
                    if l.contains(cmd) {
                        assert!(l.contains(&format!("if not defined rago_state_{state} ")), "{id}:{v} rest sans garde : {l}");
                    }
                }
            }
            let probe = probe_of(id, v);
            for part in rest.split("rago_state_").skip(1) {
                let name: String = part.chars().take_while(|c| c.is_ascii_alphanumeric()).collect();
                assert!(crate::backup::STATES.contains(&name.as_str()), "{id}:{v} état inconnu {name}");
                // relevé de l'état, ou « untouched » : le script d'aujourd'hui ne le change plus (hitreg_suite)
                assert!(
                    probe.contains(&format!("@@RAGO state \"{name}\"")) || probe.contains(&format!("@@RAGO untouched \"{name}\"")),
                    "{id}:{v} garde {name} sans relevé"
                );
                guarded += 1;
            }
            for s in [u.full.as_deref().unwrap_or(""), u.rest.as_deref().unwrap_or("")] {
                for part in s.split("RAGO_HELD_").skip(1) {
                    let tag: String = part.chars().take_while(|c| c.is_ascii_hexdigit()).collect();
                    assert!(tag.len() == 10 && u.writes.contains(&tag), "{id}:{v} garde {tag} hors de writes");
                    held += 1;
                }
            }
            // compression mémoire : coupée aussi par d'autres réglages, jamais rallumée sans garde
            for l in full.lines().chain(rest.lines()) {
                let calls = l.matches("enable-mmagent -memorycompression").count();
                let tag = crate::runner::held_tag("mmagent|memorycompression");
                let guarded_calls = l.matches(&format!("rago_held_{tag}) {{ enable-mmagent -memorycompression")).count();
                assert_eq!(calls, guarded_calls, "{id}:{v} rallume la compression sans garde : {l}");
            }
        }
        assert!(guarded > 10 && held > 1000, "{guarded} gardes d'état, {held} gardes de valeurs partagées");
        // une valeur partagée n'est gardée que si un autre réglage l'écrit aussi
        let mut owners: HashMap<&String, std::collections::HashSet<&String>> = HashMap::new();
        for (id, _, u) in &undo {
            for t in &u.writes {
                owners.entry(t).or_default().insert(*id);
            }
        }
        for (id, v, u) in &undo {
            for t in &u.writes {
                assert!(owners[t].len() > 1, "{id}:{v} étiquette {t} propre à ce réglage");
            }
        }
    }

    /// Sans relevé, full remet aussi les valeurs écrites dans la carte visée (« for %%G in (!rago_gpu!) », 1.1.9), pas
    /// seulement celles de « …\0000 » des anciens scripts : sur un portable à deux cartes, la carte NVIDIA est souvent
    /// « …\0001 ». La garde RAGO_HELD est celle de la même valeur dans « …\0000 ».
    #[test]
    fn gpu_undo_follows_the_targeted_card() {
        let undo: serde_json::Value = serde_json::from_str(include_str!("../scripts/undo.json")).unwrap();
        let gpu0 = "class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000\" /v \"";
        for id in ["nv_accel", "nv_contig", "nv_kboost", "gpu_nvidia", "amd_general", "gpu_amd"] {
            let full = undo[id]["_"]["full"].as_str().unwrap().to_lowercase();
            let script = SCRIPTS[id]["_"].to_lowercase();
            let looped: Vec<&str> = script
                .lines()
                .filter(|l| l.contains(" in (!rago_gpu!) do reg.exe add "))
                .filter_map(|l| l.split(" /v \"").nth(1)?.split('"').next())
                .collect();
            let mut n = 0;
            for name in full.lines().filter_map(|l| l.split(gpu0).nth(1)?.split('"').next()) {
                if !looped.contains(&name) {
                    continue;
                }
                let card = full.lines().find(|l| {
                    l.contains(" in (!rago_gpu!) do ") && l.contains("reg delete \"%%") && l.contains(&format!("/v \"{name}\""))
                });
                let card = card.unwrap_or_else(|| panic!("{id} : {name} remis seulement dans …\\0000"));
                let fixed = full.lines().find(|l| l.contains(&format!("{gpu0}{name}\""))).unwrap();
                let tag = |l: &str| l.split("rago_held_").nth(1).map(|t| t[..10].to_string());
                assert_eq!(tag(card), tag(fixed), "{id} : {name} gardé autrement dans …\\0000 et dans la carte");
                n += 1;
            }
            assert!(n > 0, "{id}");
            // les cartes du fabricant sont cherchées avant la première boucle
            let find = full.find("set \"rago_gpu=\"").unwrap_or_else(|| panic!("{id}"));
            assert!(find < full.find(" in (!rago_gpu!) do ").unwrap(), "{id}");
        }
    }

    /// Priorité par jeu : les vrais exécutables (RAG-60) ; réparation : sfc après DISM.
    #[test]
    fn per_game_priority_targets_real_executables() {
        for (v, s) in &SCRIPTS["pri_game"] {
            let low = s.to_lowercase();
            assert!(!low.contains(".exe.exe") && !low.contains("%%i.exe"), "pri_game:{v}");
            assert!(!low.contains("valorantclient") && !low.contains("(fortniteclient-win64)"), "pri_game:{v}");
        }
        assert!(SCRIPTS["pri_game"]["valorant"].contains("VALORANT-Win64-Shipping.exe"));
        assert!(SCRIPTS["pri_game"]["fortnite"].contains("in (FortniteClient-Win64-Shipping.exe)"));
        assert!(SCRIPTS["pri_game"]["apex"].contains("r5apex_dx12.exe"));
        assert!(SCRIPTS["pri_game"]["gta"].contains("GTA5_Enhanced.exe"));
        let repair = SCRIPTS["cln_repair"]["_"].to_lowercase();
        assert!(repair.find("/restorehealth").unwrap() < repair.find("sfc.exe /scannow").unwrap());
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

    /// Cohérence 1.1.9 (tools/coherence.py ; RAG-60 §4-§5, RAG-27, audit du 2026-10-07) : scripts qui visaient la
    /// mauvaise carte, valeurs fausses, lignes contradictoires ou sans effet. Ces défauts ne doivent pas revenir.
    #[test]
    fn scripts_target_the_right_hardware_and_do_what_they_say() {
        let probes: Scripts = serde_json::from_str(include_str!("../scripts/probes.json")).unwrap();
        let undo: serde_json::Value = serde_json::from_str(include_str!("../scripts/undo.json")).unwrap();
        let low = |id: &str, v: &str| SCRIPTS[id][v].to_lowercase();
        // carte graphique : plus de « …\0000 » en dur, chaque écriture passe par les cartes du bon fabricant
        let gpu0 = "class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000";
        for (id, ven) in [("nv_accel", "10de"), ("nv_contig", "10de"), ("nv_kboost", "10de"), ("gpu_nvidia", "10de"),
                          ("amd_general", "1002"), ("amd_power", "1002"), ("amd_memsleep", "1002"), ("amd_delag", "1002"),
                          ("gpu_amd", "1002")] {
            let s = low(id, "_");
            assert!(!s.contains(gpu0) && !s.contains("regpath_amd"), "{id} écrit dans la première carte venue");
            assert!(s.contains("/v matchingdeviceid 2^>nul ^| findstr /i \"ven_") && s.contains(&format!("\"ven_{ven}\"")), "{id}");
            assert!(s.lines().any(|l| l.starts_with("for %%") && l.contains(" in (!rago_gpu!) do reg")), "{id}");
            assert!(s.is_ascii(), "{id} : texte parasite");
            // le relevé suit les mêmes cartes, et rien n'est relevé sur la clé 0000 en dur
            let p = probes[id]["_"].to_lowercase();
            assert!(p.contains("in (!rago_gpu!) do echo @@rago reg") && !p.contains(gpu0), "{id} relevé");
        }
        assert!(!low("gpu_nvidia", "_").contains("%w%-"), "gpu_nvidia : boucles qui écrivaient dans Class\\-");
        // mode MSI : seulement sur les cartes du fabricant
        for (id, ven) in [("nv_msi", "10de"), ("gpu_nvidia", "10de"), ("gpu_amd", "1002")] {
            for l in low(id, "_").lines().filter(|l| l.contains("win32_videocontroller")) {
                assert!(l.contains(&format!("findstr /i \"ven_{ven}\"")), "{id} : {l}");
            }
        }
        // valeurs
        assert!(low("nv_kboost", "_").contains("\"perflevelsrc\" /t reg_dword /d \"8738\""));
        assert!(!low("amd_power", "_").contains("clockgating\" /t reg_dword /d \"1\""));
        assert!(low("pow_windows", "_").contains("energyestimationenabled /t reg_dword /d 0 "));
        assert!(low("dbl_cortana", "_").contains("\"disablewebsearch\" /t reg_dword /d \"1\""));
        // Actualités et centres d'intérêt : la stratégie est sous Policies\Microsoft\Dsh ; sans relevé, l'annulation retire
        // aussi la valeur que les anciens scripts posaient sous Policies\Microsoft (finitions du 2026-10-13 : sys_registry)
        for id in ["win_services", "win_feed", "sys_registry"] {
            assert!(low(id, "_").contains("policies\\microsoft\\dsh\" /v \"allownewsandinterests\""), "{id}");
            assert!(probes[id]["_"].to_lowercase().contains("policies\\microsoft\\dsh\" \"allownewsandinterests\""), "{id} relevé");
            let full = undo[id]["_"]["full"].as_str().unwrap().to_lowercase();
            for key in ["policies\\microsoft\" /v \"allownewsandinterests\" /f", "policies\\microsoft\\dsh\" /v \"allownewsandinterests\" /f"] {
                assert!(full.contains(key), "{id} annulation : {key}");
            }
        }
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                assert!(!s.to_lowercase().contains("\\microsoftd\\"), "{id}:{v}");
                assert!(!s.to_lowercase().contains("policies\\microsoft\" /v \"allownewsandinterests\""), "{id}:{v}");
            }
        }
        // réseau : netsh refusés par Windows 10 et 11, propriétés de carte par leur nom anglais, QoS hors domaine
        let netsh_ok = ["autotuninglevel", "rss", "rsc", "ecncapability", "timestamps", "nonsackrttresiliency", "fastopen",
                        "fastopenfallback", "hystart", "prr", "pacingprofile", "dca", "initialrto", "maxsynretransmissions"];
        for (id, v) in [("ping_packets", "hitreg"), ("ping_packets", "knockback"), ("net_profile", "hitreg"),
                        ("net_profile", "knockback"), ("net_advanced", "_"), ("in_windows", "_")] {
            for l in low(id, v).lines() {
                let t = l.trim().replace("netsh interface ", "netsh int ");
                if let Some(rest) = t.strip_prefix("netsh int tcp set global ") {
                    let param = rest.split(['=', ' ']).next().unwrap();
                    assert!(netsh_ok.contains(&param), "{id}:{v} : {l}");
                }
            }
        }
        assert!(!low("net_advanced", "_").contains("\"sackopts\" /t reg_dword /d \"0\""));
        for v in SCRIPTS["ping_main"].keys() {
            assert!(!low("ping_main", v).contains("-displayname"), "ping_main:{v} vise un nom anglais");
        }
        assert!(low("ping_main", "config3").contains("-registrykeyword '*flowcontrol'"));
        let rest = undo["ping_main"]["config3"]["rest"].as_str().unwrap().to_lowercase();
        assert!(rest.contains("reset-netadapteradvancedproperty") && rest.contains("'*flowcontrol'"), "annulation de config3");
        for id in ["ping_packets", "net_profile"] {
            let s = low(id, "qos");
            assert!(s.contains("tcpip\\qos\" /v \"do not use nla\" /t reg_sz /d \"1\""), "{id}:qos");
            assert!(s.contains("\"dscp value\" /t reg_sz /d \"46\"") && s.contains("\"throttle rate\" /t reg_sz /d \"-1\""), "{id}:qos");
        }
        // épinglage sur le processeur n°2 : seulement s'il existe, mais l'annulation retire toujours les valeurs
        for (id, v) in [("net_affinity", "_"), ("in_adapter", "_"), ("ping_main", "config4"), ("ping_advanced", "_")] {
            let s = low(id, v);
            let pins: Vec<&str> = s.lines().filter(|l| l.contains("\"assignmentsetoverride\"") || l.contains("/v \"devicepolicy\"")).collect();
            assert_eq!(pins.len(), 2, "{id}:{v}");
            assert!(pins.iter().all(|l| l.starts_with("if %number_of_processors% geq 4 ")), "{id}:{v}");
            let full = undo[id][v]["full"].as_str().unwrap().to_lowercase();
            assert!(full.contains("/v \"assignmentsetoverride\" /f") && !full.contains("number_of_processors"), "{id}:{v} annulation");
            assert!(s.contains("if %number_of_processors% lss 4 echo - fewer than 4 logical processors"), "{id}:{v} message");
        }
        // aucun autre script n'épingle la carte réseau sans cette garde (ping_advanced l'a reçue aux finitions du 2026-10-13)
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                for l in s.to_lowercase().lines().filter(|l| l.contains("\"assignmentsetoverride\" /t reg_binary")) {
                    assert!(l.starts_with("if %number_of_processors% geq 4 "), "{id}:{v} : {l}");
                }
            }
        }
        // packs : plus de lignes contraires à un autre réglage ou défaites plus bas
        for (v, s) in &SCRIPTS["hitreg_suite"] {
            let s = s.to_lowercase();
            for bad in ["disable-scheduledtask", "disable-mmagent", "autogamemode", "\"hibernateenabled\"",
                        "\"alwayson\" /t reg_dword /d \"1\"", "\"disabletaskoffload\" /t reg_dword /d \"1\""] {
                assert!(!s.contains(bad), "hitreg_suite:{v} : {bad}");
            }
            assert!(s.contains("schtasks /change /tn \"\\microsoft\\windows\\application experience\\microsoft compatibility appraiser\" /disable"));
        }
        assert!(!low("in_advanced", "_").contains("autogamemode") && !low("in_advanced", "_").contains("\"hibernateenabled\""));
        assert!(!low("win_gamedvr", "_").contains("fsebehaviormode\" /t reg_dword /d \"1\""));
        assert!(!low("exp_io", "_").contains("ntoskrnl.exe") && !low("exp_io", "_").contains("wow6432node"));
        // Plein écran garde Auto HDR et les autres réglages graphiques de Windows 11
        let fs = low("win_fullscreen", "_");
        assert!(fs.contains("/d \"!rago_dx!vrroptimizeenable=0;swapeffectupgradeenable=1;\""));
        assert!(!fs.contains("/d \"vrroptimizeenable=0;"));
        // redémarrage annoncé
        let cat: serde_json::Value = serde_json::from_str(include_str!("../../src/data/catalog.json")).unwrap();
        let tw = |id: &str| cat["modules"].as_array().unwrap().iter()
            .flat_map(|m| m["sections"].as_array().unwrap())
            .flat_map(|s| s["tweaks"].as_array().unwrap())
            .find(|t| t["id"] == id).unwrap_or_else(|| panic!("{id} absent")).clone();
        for id in ["net_ipv6", "in_mouse", "in_keyboard", "net_profile"] {
            assert_eq!(tw(id)["reboot"], true, "{id}");
        }
        // fonctionnalités de Windows : jamais de question « redémarrer maintenant ? » pendant un réglage (le moteur ne
        // répond à rien) ; le redémarrage est annoncé par le badge (exp_smb, finitions du 2026-10-13)
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                for l in s.to_lowercase().lines().filter(|l| l.contains("-windowsoptionalfeature")) {
                    assert!(l.contains("-norestart"), "{id}:{v} : {l}");
                }
            }
        }
        assert_eq!(low("exp_smb", "_").matches("disable-windowsoptionalfeature -online -featurename smb1protocol").count(), 3);
        assert_eq!(tw("exp_smb")["reboot"], true);
        let np = tw("net_profile");
        let reboot = |v: &str| np["variants"].as_array().unwrap().iter().find(|x| x["id"] == v).unwrap()["reboot"].clone();
        assert_eq!((reboot("hitreg"), reboot("knockback"), reboot("qos")), (false.into(), true.into(), true.into()));
        assert_eq!(name_of("mem_superfetch"), "Disable Superfetch (legacy setting)");
    }

    /// Réglages retirés (tools/safety.py, 2026-10-08) : ni script ni relevé, absents du catalogue et des profils, mais
    /// leur annulation reste là pour les PC où une version précédente les a appliqués. Les lignes risquées qu'ils
    /// portaient ne se retrouvent plus dans aucun autre script.
    #[test]
    fn retired_tweaks_cannot_run() {
        let bundle = premium(&test_key()).unwrap();
        let catalog: serde_json::Value = serde_json::from_str(include_str!("../../src/data/catalog.json")).unwrap();
        let retired: Vec<&str> = catalog["retired"].as_array().unwrap().iter().map(|r| r["id"].as_str().unwrap()).collect();
        assert_eq!(retired.len(), 17);
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

    /// RAG-67 (2026-10-13) : `CoalescingTimerInterval` à 0 sous `HKLM\SYSTEM\CurrentControlSet\Control` fait planter
    /// Windows (écran bleu 0x7E, division par zéro) quelques minutes après le démarrage. Plus aucun script ni relevé ne
    /// l'écrit (tools/safety.py DROP_EVERYWHERE) ; les annulations la suppriment encore pour les PC où une version
    /// précédente l'a posée, aucune ne la remet, et chaque clé qu'elles nettoient est aussi réparée au lancement
    /// (repair::TIMER_KEYS). Celle des fichiers de jeu (Image File Execution Options) n'est pas concernée.
    #[test]
    fn kernel_timer_value_stays_out() {
        let bundle = premium(&test_key()).unwrap();
        let probes: Scripts = serde_json::from_str(include_str!("../scripts/probes.json")).unwrap();
        let kernel = |l: &str| {
            let l = l.to_lowercase();
            l.contains("coalescingtimerinterval") && l.contains("\\control")
        };
        for (id, variants) in SCRIPTS.iter().chain(probes.iter()) {
            for (v, s) in variants {
                for l in s.lines().map(str::trim).filter(|l| !l.to_lowercase().starts_with("echo")) {
                    assert!(!kernel(l), "{id}:{v} écrit encore la valeur : {l}");
                }
            }
        }
        let keys: std::collections::HashSet<String> = crate::repair::TIMER_KEYS.iter().map(|k| k.to_lowercase()).collect();
        for (id, v) in [
            ("pow_main", None),
            ("pow_timer", None),
            ("pow_throttling", None),
            ("gpu_nvidia", None),
            ("gpu_amd", None),
            ("gpu_general", None),
            ("amd_advanced", None),
            ("hitreg_suite", Some("good")),
            ("hitreg_suite", Some("laptop")),
        ] {
            let full = undo_of(id, v, Some(&bundle)).and_then(|u| u.full).unwrap_or_default();
            let deleted: Vec<&str> = full.lines().map(str::trim).filter(|l| kernel(l)).collect();
            assert!(!deleted.is_empty(), "{id} : l'annulation ne supprime plus la valeur posée avant");
            for l in deleted {
                assert!(l.to_lowercase().starts_with("reg delete"), "{id} : {l}");
                let key = l.split('"').nth(1).unwrap().to_lowercase().replace("hkey_local_machine", "hklm");
                assert!(keys.contains(&key), "{id} : {key} n'est pas réparée au lancement (repair::TIMER_KEYS)");
            }
        }
        for (id, variants) in bundle.undo.iter().chain(PLAIN.undo.iter()) {
            for (v, u) in variants {
                for l in u.full.iter().chain(u.rest.iter()).flat_map(|s| s.lines()).map(str::trim) {
                    assert!(!kernel(l) || l.to_lowercase().starts_with("reg delete"), "annulation {id}:{v} : {l}");
                }
            }
        }
    }

    /// RAG-66 (2026-10-13) : vider les dossiers temporaires bute toujours sur des fichiers ouverts, arrêter le spouleur
    /// déjà arrêté répond une erreur, taskkill annonce son succès : ces messages, sans échec réel, affolaient les joueurs
    /// dans le journal. Ces commandes-là se taisent (tools/build_catalog_v6.py QUIET), le dossier temporaire est
    /// toujours entre guillemets (un espace dans le chemin faisait effacer le premier morceau), garde `if defined`
    /// comprise (tools/paths.py).
    #[test]
    fn temp_cleaning_stays_quiet() {
        let silent = |l: &str| l.contains("2>&1") || l.contains("2>nul");
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                for l in s.lines().map(|l| l.trim().to_lowercase()).filter(|l| !l.starts_with("echo") && !l.starts_with("::")) {
                    let bare: String = l.split('"').step_by(2).collect();
                    for t in ["%temp%", "%tmp%", "!temp!", "!tmp!"] {
                        assert!(!bare.contains(t), "{id}:{v} : {t} sans guillemets : {l}");
                    }
                    // « if defined temp del … » : la commande qui suit les gardes
                    let mut cmd = l.as_str();
                    while let Some(rest) = cmd.strip_prefix("if defined ") {
                        cmd = rest.split_once(' ').map_or("", |(_, c)| c);
                    }
                    if ["game_mode", "in_windows", "sto_general", "cln_temp"].contains(&id.as_str())
                        && (cmd.starts_with("del ") || cmd.starts_with("forfiles") || l.contains("rd /s") || l.contains("rmdir"))
                    {
                        assert!(silent(&l), "{id}:{v} : {l}");
                    }
                }
            }
        }
        let on = &SCRIPTS["game_mode"]["on"];
        let stop: Vec<&str> = on.lines().filter(|l| l.to_lowercase().contains("net stop spooler")).collect();
        assert_eq!(stop.len(), 1);
        assert!(stop[0].to_lowercase().starts_with("sc query spooler | find \"running\" >nul && "), "{}", stop[0]);
        for v in ["on", "off"] {
            let kill: Vec<&str> = SCRIPTS["game_mode"][v].lines().filter(|l| l.contains("taskkill")).collect();
            assert!(!kill.is_empty() && kill.iter().all(|l| l.trim_end().ends_with(">nul")), "game_mode:{v}");
        }
    }

    /// Finitions du 2026-10-13 : gpu_nvidia et nv_debloat suppriment 28 dossiers d'un ancien installeur NVIDIA
    /// (C:\NVIDIA\<composant>), absents sur presque tous les PC : « Le fichier spécifié est introuvable. » 28 fois dans le
    /// journal. rd ne se lance que si le dossier existe (tools/build_catalog_v6.py QUIET), sans cacher ses vraies erreurs.
    #[test]
    fn nvidia_leftovers_are_removed_quietly() {
        for id in ["gpu_nvidia", "nv_debloat"] {
            let s = &SCRIPTS[id]["_"];
            let rd: Vec<&str> = s.lines().filter(|l| l.to_lowercase().contains("rd /s /q \"c:\\nvidia\\")).collect();
            assert_eq!(rd.len(), 28, "{id}");
            for l in rd {
                let path = l.split_once(" rd /s /q ").map(|(_, p)| p).unwrap_or("");
                assert_eq!(l, format!("if exist {path} rd /s /q {path}"), "{id}");
                assert!(!l.contains("nul"), "{id} : une vraie erreur de rd doit rester visible : {l}");
            }
        }
    }

    /// Lignes qui empêchent cmd.exe de lire un bloc entre parenthèses (RAG-68, 2026-10-13) : cmd lit tout le bloc avant
    /// de l'exécuter et, sur une erreur, s'arrête net (« ) was unexpected at this time. ») : le reste du script ne tourne
    /// pas et le réglage échoue. Renvoie « ligne : problème » pour chaque défaut. Lecture simplifiée de cmd : parenthèses
    /// hors guillemets et hors `^`, commentaires `::`/`rem` et `echo` à part (une `)` dans un echo ferme quand même le bloc).
    fn block_errors(script: &str) -> Vec<String> {
        #[derive(Clone, Copy, PartialEq)]
        enum Kind {
            Label,
            Rem,
            Echo,
            Cmd,
        }
        fn kind(t: &str) -> Kind {
            let low = t.to_lowercase();
            let after = |w: &str| low.strip_prefix(w).map(|r| r.chars().next());
            if t.starts_with(':') {
                Kind::Label
            } else if matches!(after("rem"), Some(None) | Some(Some(' ' | '\t'))) {
                Kind::Rem
            } else if matches!(after("echo"), Some(None) | Some(Some(' ' | '\t' | '.' | '(' | ':' | '/'))) {
                Kind::Echo
            } else {
                Kind::Cmd
            }
        }
        // parenthèses hors guillemets et hors ^, dans l'ordre ; et le texte hors guillemets
        fn scan(t: &str) -> (Vec<i32>, String) {
            let (mut out, mut bare, mut quoted, mut chars) = (Vec::new(), String::new(), false, t.chars());
            while let Some(c) = chars.next() {
                match c {
                    '"' => {
                        quoted = !quoted;
                        bare.push('x');
                    }
                    '^' if !quoted => {
                        chars.next();
                        bare.push('x');
                    }
                    '(' if !quoted => {
                        out.push(1);
                        bare.push('(');
                    }
                    ')' if !quoted => {
                        out.push(-1);
                        bare.push(')');
                    }
                    _ if quoted => {}
                    c => bare.push(c),
                }
            }
            (out, bare)
        }
        let mut errors = Vec::new();
        let mut depth = 0i32;
        // dernière ligne non vide : sa nature, et si elle se termine en ouvrant un bloc
        let mut prev: Option<(Kind, bool)> = None;
        for (n, line) in script.lines().enumerate() {
            let t = line.trim().trim_start_matches('@').trim();
            if t.is_empty() {
                continue;
            }
            let k = kind(t);
            let (parens, bare) = scan(t);
            let mut opens = false;
            match k {
                Kind::Label => {
                    if depth > 0 && prev.is_some_and(|(p, _)| p == Kind::Label) {
                        errors.push(format!("{}: deux commentaires :: de suite dans un bloc", n + 1));
                    }
                }
                Kind::Rem => {}
                Kind::Echo => {
                    if depth > 0 && parens.contains(&-1) {
                        errors.push(format!("{}: une ) dans un echo ferme le bloc : {t}", n + 1));
                    }
                }
                Kind::Cmd => {
                    if t.starts_with(')') {
                        match prev {
                            Some((Kind::Cmd, true)) => errors.push(format!("{}: bloc vide, « ( » puis « ) »", n + 1)),
                            Some((Kind::Label, _)) if depth > 0 => {
                                errors.push(format!("{}: commentaire :: juste avant la « ) » du bloc", n + 1))
                            }
                            _ => {}
                        }
                    }
                    // « ( ) » sur une seule ligne
                    let compact: String = bare.chars().filter(|c| !c.is_whitespace()).collect();
                    if compact.contains("()") {
                        errors.push(format!("{}: bloc vide sur la ligne : {t}", n + 1));
                    }
                    for p in parens {
                        depth += p;
                        if depth < 0 {
                            errors.push(format!("{}: « ) » sans bloc ouvert : {t}", n + 1));
                            depth = 0;
                        }
                    }
                    opens = bare.trim_end().ends_with('(');
                }
            }
            prev = Some((k, opens));
        }
        if depth != 0 {
            errors.push(format!("{depth} bloc(s) jamais fermé(s)"));
        }
        errors
    }

    #[test]
    fn block_checker_sees_what_cmd_refuses() {
        // RAG-68 : boucle du mode MSI dont les lignes ont été retirées
        let rag68 = "for /f %%i in ('powershell -Command \"(Get-CimInstance x).PNPDeviceID\"') do set \"str=%%i\" & (\r\n)\r\necho ok";
        assert_eq!(block_errors(rag68).len(), 1, "{:?}", block_errors(rag68));
        assert_eq!(block_errors("if defined x (\r\nver >nul\r\n) else (\r\n)").len(), 1);
        assert_eq!(block_errors("for %%a in (1) do ( )").len(), 1);
        assert_eq!(block_errors("if x==y (\r\necho a (b)\r\n)").len(), 1, "la ) de l'echo ferme le bloc");
        assert_eq!(block_errors("(\r\n:: a\r\n)").len(), 1);
        assert_eq!(block_errors("(\r\n:: a\r\n:: b\r\nver >nul\r\n)").len(), 1);
        assert_eq!(block_errors("for /f %%a in ('x') do (\r\nreg add \"HKLM\\A (x86)\" /f\r\n").len(), 1, "jamais fermé");
        // correct : guillemets, ^, echo hors bloc, ) else (, commentaire suivi d'une commande dans un bloc
        let ok = "for /f \"delims=\" %%a in ('powershell -Command \"(Get-CimInstance x).NetConnectionID\"') do (\r\n\
                  \x20 :: carte\r\n  for /f \"delims=\" %%b in (\"%%a\") do (\r\n    set \"n=%%b\"\r\n  )\r\n)\r\n\
                  if defined n (\r\n  ver >nul\r\n) else (\r\n  echo pas de carte\r\n)\r\necho (fin)\r\nfind \"^)\" x";
        assert!(block_errors(ok).is_empty(), "{:?}", block_errors(ok));
    }

    /// Tous les scripts que le moteur lance (réglages, relevés, annulations) se lisent jusqu'au bout dans cmd.exe.
    #[test]
    fn every_script_has_well_formed_blocks() {
        let probes: Scripts = serde_json::from_str(include_str!("../scripts/probes.json")).unwrap();
        let undo: HashMap<String, HashMap<String, Undo>> = serde_json::from_str(include_str!("../scripts/undo.json")).unwrap();
        let mut bad = Vec::new();
        let mut check = |what: String, s: &str| bad.extend(block_errors(s).into_iter().map(|e| format!("{what} {e}")));
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                check(format!("{id}:{v}"), s);
            }
        }
        for (id, variants) in &probes {
            for (v, s) in variants {
                check(format!("relevé {id}:{v}"), s);
            }
        }
        for (id, variants) in &undo {
            for (v, u) in variants {
                for (part, s) in [("full", &u.full), ("rest", &u.rest)] {
                    if let Some(s) = s {
                        check(format!("annulation {id}:{v} {part}"), s);
                    }
                }
            }
        }
        assert!(bad.is_empty(), "{} défauts :\n{}", bad.len(), bad.join("\n"));
    }

    /// Le texte entre guillemets remplacé par des x, octet par octet (mêmes positions).
    fn masked_line(l: &str) -> String {
        let mut quoted = false;
        let b: Vec<u8> = l
            .bytes()
            .map(|c| {
                if c == b'"' {
                    quoted = !quoted;
                    c
                } else if quoted {
                    b'x'
                } else {
                    c
                }
            })
            .collect();
        String::from_utf8(b).unwrap()
    }

    /// Variables `%NOM%` (mark `%` ; les `%%` restent : variable de boucle ou `%` écrit tel quel) ou `!NOM!` (mark `!`)
    /// d'une ligne, en majuscules, dans l'ordre (comme PERCENT et BANG de tools/paths.py).
    fn var_refs(l: &str, mark: u8) -> Vec<String> {
        let name = |c: u8, first: bool| c.is_ascii_alphabetic() || c == b'_' || (!first && (c.is_ascii_digit() || b"()#$.-".contains(&c)));
        let b = l.as_bytes();
        let (mut out, mut i) = (Vec::new(), 0);
        while i < b.len() {
            if b[i] != mark {
                i += 1;
                continue;
            }
            if mark == b'%' && b.get(i + 1) == Some(&b'%') {
                i += 2;
                continue;
            }
            let mut j = i + 1;
            while j < b.len() && name(b[j], j == i + 1) {
                j += 1;
            }
            if j > i + 1 && b.get(j) == Some(&mark) {
                out.push(l[i + 1..j].to_ascii_uppercase());
                i = j + 1;
            } else {
                i += 1;
            }
        }
        out
    }

    /// Défauts des commandes qui suppriment ou prennent possession de fichiers (del, erase, rd, rmdir, forfiles,
    /// takeown, icacls) dans un script que le moteur lance après `setlocal EnableDelayedExpansion` (runner.rs,
    /// PREAMBLE). Revue du 2026-10-13, P1/P2 ; tools/paths.py vérifie les mêmes règles à la génération :
    /// - chemin `%VAR%`, sur la ligne ou sur une ligne qui ouvre son bloc : cmd le remplace avant de lire la ligne, puis
    ///   retire ses `!` (« Jean! ») ou remplace le texte entre deux `!` : la commande vise un autre dossier ;
    /// - `!VAR!` sans `if defined VAR` devant (sur la ligne ou sur une ligne qui ouvre son bloc) : vide, `"!temp!\*"`
    ///   vise la racine du disque ;
    /// - variable de boucle (`%%d`) avec le développement retardé actif : elle est remplacée avant les `!…!`, un dossier
    ///   nommé `!SystemRoot!` deviendrait `C:\Windows` ;
    /// - `!…!` après `setlocal DisableDelayedExpansion` : il ne serait plus remplacé ;
    /// - variable hors guillemets : un espace dans le chemin le couperait en deux.
    /// Le texte d'un echo (jusqu'au premier `&` ou `|`) et les commentaires ne lancent rien.
    fn deletion_errors(script: &str) -> Vec<String> {
        use std::collections::BTreeSet;
        const ACTIONS: [&str; 7] = ["del", "erase", "rd", "rmdir", "forfiles", "takeown", "icacls"];
        const DDE_OFF: &str = "setlocal disabledelayedexpansion";
        fn kind(l: &str) -> char {
            let t = l.trim().trim_start_matches('@').trim().to_ascii_lowercase();
            let after = |w: &str| t.strip_prefix(w).map(|r| r.bytes().next());
            if t.starts_with(':') {
                ':'
            } else if matches!(after("rem"), Some(None)) || matches!(after("rem"), Some(Some(c)) if c.is_ascii_whitespace()) {
                'r'
            } else if matches!(after("echo"), Some(None))
                || matches!(after("echo"), Some(Some(c)) if c.is_ascii_whitespace() || b".(:/".contains(&c))
            {
                'e'
            } else {
                'c'
            }
        }
        fn first_action(l: &str) -> Option<usize> {
            let k = kind(l);
            if k == ':' || k == 'r' {
                return None;
            }
            let bare = masked_line(l).to_ascii_lowercase();
            let b = bare.as_bytes();
            let start = if k == 'e' { bare.find(['&', '|'])? } else { 0 };
            for i in start..b.len() {
                if i > 0 && !(b[i - 1].is_ascii_whitespace() || b"&|(@".contains(&b[i - 1])) {
                    continue;
                }
                for w in ACTIONS {
                    if b[i..].starts_with(w.as_bytes()) {
                        let mut k = i + w.len();
                        if b[k..].starts_with(b".exe") {
                            k += 4;
                        }
                        if k == b.len() || b[k].is_ascii_whitespace() {
                            return Some(i);
                        }
                    }
                }
            }
            None
        }
        // `if [/i] defined NOM` (pas `if not defined`)
        fn guards(l: &str) -> BTreeSet<String> {
            fn spaces(b: &[u8], k: &mut usize) -> bool {
                let start = *k;
                while *k < b.len() && b[*k].is_ascii_whitespace() {
                    *k += 1;
                }
                *k > start
            }
            let low = l.to_ascii_lowercase();
            let b = low.as_bytes();
            let mut out = BTreeSet::new();
            for s in (0..b.len()).filter(|&s| b[s..].starts_with(b"if")) {
                if s > 0 && (b[s - 1].is_ascii_alphanumeric() || b[s - 1] == b'_') {
                    continue;
                }
                let mut k = s + 2;
                if !spaces(b, &mut k) {
                    continue;
                }
                if b[k..].starts_with(b"/i") {
                    let mut k2 = k + 2;
                    if spaces(b, &mut k2) {
                        k = k2;
                    }
                }
                if !b[k..].starts_with(b"defined") {
                    continue;
                }
                k += 7;
                if !spaces(b, &mut k) {
                    continue;
                }
                let start = k;
                while k < b.len() && !b[k].is_ascii_whitespace() && !b"\"()&|".contains(&b[k]) {
                    k += 1;
                }
                if k > start {
                    out.insert(low[start..k].to_ascii_uppercase());
                }
            }
            out
        }
        // +1 / -1 par parenthèse hors guillemets et hors ^, sur une ligne de commande (comme block_errors)
        fn parens(l: &str) -> Vec<i32> {
            if kind(l) != 'c' {
                return Vec::new();
            }
            let (mut out, mut quoted, mut it) = (Vec::new(), false, l.bytes());
            while let Some(c) = it.next() {
                match c {
                    b'"' => quoted = !quoted,
                    b'^' if !quoted => {
                        it.next();
                    }
                    b'(' if !quoted => out.push(1),
                    b')' if !quoted => out.push(-1),
                    _ => {}
                }
            }
            out
        }
        let for_var = |s: &str| s.as_bytes().windows(3).any(|w| w[0] == b'%' && w[1] == b'%' && (w[2] == b'~' || w[2].is_ascii_alphabetic()));
        let mut errors = Vec::new();
        // par parenthèse ouverte : variables %…%, variables !…! et gardes de sa ligne et des blocs au-dessus
        let mut stack: Vec<(BTreeSet<String>, BTreeSet<String>, BTreeSet<String>)> = Vec::new();
        // développement retardé : PREAMBLE, puis les lignes setlocal / endlocal entières
        let mut dde = vec![true];
        for (n, l) in script.lines().enumerate() {
            let t = l.trim();
            let low = t.trim_start_matches('@').trim().to_ascii_lowercase();
            let word = |w: &str| low.strip_prefix(w).is_some_and(|r| r.bytes().next().is_none_or(|c| !(c.is_ascii_alphanumeric() || c == b'_')));
            if word("setlocal") && !low.contains('&') {
                let top = *dde.last().unwrap();
                dde.push(if low.contains("disabledelayedexpansion") {
                    false
                } else if low.contains("enabledelayedexpansion") {
                    true
                } else {
                    top
                });
            } else if word("endlocal") && !low.contains('&') && dde.len() > 1 {
                dde.pop();
            }
            let (pct, bang, gd) = stack.last().cloned().unwrap_or_default();
            let line_pct: BTreeSet<String> = var_refs(l, b'%').into_iter().collect();
            let line_bang: BTreeSet<String> = var_refs(l, b'!').into_iter().collect();
            if let Some(pos) = first_action(l) {
                let on = *dde.last().unwrap();
                let all: Vec<String> = pct.union(&line_pct).cloned().collect();
                if !all.is_empty() {
                    errors.push(format!("{}: suppression sur %{}% : {t}", n + 1, all.join("%, %")));
                }
                let before = guards(&l[..pos]);
                let need: Vec<String> = bang.union(&line_bang).filter(|v| !gd.contains(*v) && !before.contains(*v)).cloned().collect();
                if !need.is_empty() {
                    errors.push(format!("{}: suppression sans if defined {} : {t}", n + 1, need.join(", ")));
                }
                let off = l.to_ascii_lowercase().find(DDE_OFF);
                if for_var(&l[pos..]) && on && !off.is_some_and(|o| o < pos) {
                    errors.push(format!("{}: variable de boucle avec le développement retardé actif : {t}", n + 1));
                }
                if (!on && l.contains('!')) || off.is_some_and(|o| l[o..].contains('!')) {
                    errors.push(format!("{}: !…! qui ne serait plus développé : {t}", n + 1));
                }
                let bare = masked_line(l);
                if !var_refs(&bare, b'!').is_empty() || !var_refs(&bare, b'%').is_empty() {
                    errors.push(format!("{}: variable hors guillemets : {t}", n + 1));
                }
            }
            let here = (
                pct.union(&line_pct).cloned().collect(),
                bang.union(&line_bang).cloned().collect(),
                gd.union(&guards(l)).cloned().collect(),
            );
            for p in parens(l) {
                if p > 0 {
                    stack.push(Clone::clone(&here));
                } else {
                    stack.pop();
                }
            }
        }
        errors
    }

    #[test]
    fn deletion_checker_sees_bad_paths() {
        let bad = [
            ("del /s /f /q \"%temp%\\*\" >nul 2>&1", "suppression sur %TEMP%"),
            ("rd /s /q \"%SystemRoot%\\Temp\"", "suppression sur %SYSTEMROOT%"),
            ("forfiles -p \"%LOCALAPPDATA%\\Temp\" -s -m *.* /C \"cmd /c del @path\" >nul 2>&1", "suppression sur %LOCALAPPDATA%"),
            ("echo - Cleaning & del /q \"%temp%\\x\"", "suppression sur %TEMP%"),
            // la boucle qui ouvre le bloc lit %PROFILES_DIR%
            ("for /d %%U in (\"%PROFILES_DIR%\\*\") do (\r\n  setlocal DisableDelayedExpansion\r\n  del /q \"%%U\\x\"\r\n  endlocal\r\n)",
             "suppression sur %PROFILES_DIR%"),
            ("del /s /f /q \"!temp!\\*\" >nul 2>&1", "sans if defined TEMP"),
            ("if not defined temp del \"!temp!\\x\"", "sans if defined TEMP"),
            ("for /d %%U in (\"!PROFILES_DIR!\\*\") do (\r\n  setlocal DisableDelayedExpansion\r\n  del /q \"%%U\\x\"\r\n  endlocal\r\n)",
             "sans if defined PROFILES_DIR"),
            ("if defined temp for /d %%d in (\"!temp!\\*\") do rd /s /q \"%%d\" >nul 2>&1", "variable de boucle"),
            ("if defined PROFILES_DIR for /d %%U in (\"!PROFILES_DIR!\\*\") do (\r\n  del /q \"%%U\\x\"\r\n)", "variable de boucle"),
            // cln_temp avant la revue : un dossier « !SystemRoot! » dans C:\Windows\Temp devenait rmdir "C:\Windows"
            ("cd /d \"C:\\Windows\\Temp\" && for /F \"delims=\" %%i in ('dir /b') do (rmdir \"%%i\" /s/q 2>nul || del \"%%i\" /s/q 2>nul)",
             "variable de boucle"),
            ("if defined temp for /d %%d in (\"!temp!\\*\") do (setlocal DisableDelayedExpansion & rd /s /q \"!temp!\\%%d\" & endlocal)",
             "ne serait plus développé"),
            ("if defined temp del /s /f /q !temp!\\* >nul 2>&1", "hors guillemets"),
        ];
        for (s, why) in bad {
            let e = deletion_errors(s);
            assert!(e.len() == 1 && e[0].contains(why), "{s}\n{e:?}");
        }
        let good = [
            "if defined temp del /s /f /q \"!temp!\\*\" >nul 2>&1",
            "if defined temp for /d %%d in (\"!temp!\\*\") do (setlocal DisableDelayedExpansion & rd /s /q \"%%d\" >nul 2>&1 & endlocal)",
            "if defined PROFILES_DIR for /d %%U in (\"!PROFILES_DIR!\\*\") do (\r\n  setlocal DisableDelayedExpansion\r\n  if exist \"%%U\\T\" (\r\n    \
             del /q \"%%U\\T\\*.*\"\r\n    for /d %%D in (\"%%U\\T\\*\") do rd /s /q \"%%D\"\r\n  )\r\n  endlocal\r\n)",
            "if defined LOCALAPPDATA if exist \"!LOCALAPPDATA!\\Temp\" (\r\n    cd /d \"!LOCALAPPDATA!\\Temp\" && for /F \"delims=\" %%i in ('dir /b') do \
             (setlocal DisableDelayedExpansion & (rmdir \"%%i\" /s/q 2>nul || del \"%%i\" /s/q 2>nul) & endlocal)\r\n)",
            "rd /s /q \"C:\\Nvidia\\PhysX\"",
            "reg delete \"HKCU\\Software\\%x%\" /f",
            "echo - DEL Sata controllers %x%",
            ":: del \"%temp%\\*\"",
        ];
        for s in good {
            assert!(deletion_errors(s).is_empty(), "{s}\n{:?}", deletion_errors(s));
        }
    }

    /// Rien de ce que lance le moteur (réglages, relevés, annulations) ne supprime sur un chemin `%VAR%`, sur un
    /// `!VAR!` sans garde ni sur une variable de boucle avec le développement retardé actif (deletion_errors), et
    /// aucune variable de chemin n'y est plus écrite `%VAR%` (revue du 2026-10-13, P1/P2, tools/paths.py).
    #[test]
    fn deletions_never_use_a_percent_path() {
        const PATH_VARS: [&str; 16] = [
            "TEMP", "TMP", "LOCALAPPDATA", "APPDATA", "USERPROFILE", "PROGRAMDATA", "ALLUSERSPROFILE", "PUBLIC", "SYSTEMROOT", "WINDIR",
            "SYSTEMDRIVE", "HOMEDRIVE", "HOMEPATH", "USERNAME", "ONEDRIVE", "PROFILES_DIR",
        ];
        let probes: Scripts = serde_json::from_str(include_str!("../scripts/probes.json")).unwrap();
        let undo: HashMap<String, HashMap<String, Undo>> = serde_json::from_str(include_str!("../scripts/undo.json")).unwrap();
        let mut bad = Vec::new();
        let mut check = |what: String, s: &str| {
            bad.extend(deletion_errors(s).into_iter().map(|e| format!("{what} {e}")));
            for l in s.lines() {
                if let Some(v) = var_refs(l, b'%').into_iter().find(|v| PATH_VARS.contains(&v.as_str())) {
                    bad.push(format!("{what} %{v}% au lieu de !{v}! : {}", l.trim()));
                }
            }
        };
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                check(format!("{id}:{v}"), s);
            }
        }
        for (id, variants) in &probes {
            for (v, s) in variants {
                check(format!("relevé {id}:{v}"), s);
            }
        }
        for (id, variants) in &undo {
            for (v, u) in variants {
                for (part, s) in [("full", &u.full), ("rest", &u.rest)] {
                    if let Some(s) = s {
                        check(format!("annulation {id}:{v} {part}"), s);
                    }
                }
            }
        }
        assert!(bad.is_empty(), "{} défauts :\n{}", bad.len(), bad.join("\n"));
        // ce que tools/paths.py a écrit
        let on = &SCRIPTS["game_mode"]["on"];
        assert!(on.lines().any(|l| l == "if defined temp del /s /f /q \"!temp!\\*\" >nul 2>&1"), "{on}");
        assert!(
            on.lines().any(|l| l
                == "if defined temp for /d %%d in (\"!temp!\\*\") do (setlocal DisableDelayedExpansion & rd /s /q \"%%d\" >nul 2>&1 & endlocal)"),
            "{on}"
        );
        let cln = &SCRIPTS["cln_temp"]["_"];
        assert!(cln.lines().any(|l| l == "if defined LOCALAPPDATA if exist \"!LOCALAPPDATA!\\Temp\" ("), "{cln}");
        assert_eq!(cln.matches("\" && for /F \"delims=\" %%i in ('dir /b') do (setlocal DisableDelayedExpansion & (rmdir \"%%i\"").count(), 2, "{cln}");
        let sto = &SCRIPTS["sto_general"]["_"];
        assert_eq!(sto.lines().filter(|l| l.trim() == "setlocal DisableDelayedExpansion").count(), 3, "{sto}");
        assert_eq!(sto.lines().filter(|l| l.starts_with("if defined PROFILES_DIR for /d %%U in (\"!PROFILES_DIR!\\*\") do (")).count(), 3, "{sto}");
    }

    /// Variables que Windows ou le moteur posent avant le script (runner.rs : RAGO_RES, adapter_name), comme ENV_VARS
    /// de tools/expansion.py.
    const ENV_VARS: [&str; 26] = [
        "TEMP", "TMP", "LOCALAPPDATA", "APPDATA", "USERPROFILE", "PROGRAMDATA", "ALLUSERSPROFILE", "PUBLIC", "SYSTEMROOT", "WINDIR",
        "SYSTEMDRIVE", "HOMEDRIVE", "HOMEPATH", "USERNAME", "ONEDRIVE", "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432",
        "COMMONPROGRAMFILES", "COMMONPROGRAMFILES(X86)", "PROFILES_DIR", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE",
        "COMPUTERNAME", "RAGO_RES", "ADAPTER_NAME",
    ];

    /// `!` écrits tels quels dans les commandes qu'un script lance avec le développement retardé (runner.rs, PREAMBLE).
    /// Juste avant d'exécuter une commande, cmd remplace chaque `!NOM!` par la variable (vide si elle n'existe pas) et
    /// retire un `!` resté seul, entre guillemets aussi : `…_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel`
    /// devenait une autre clé (finitions du 2026-10-13, tools/expansion.py vérifie la même règle à la génération).
    /// Acceptés : `!NOM!` d'une variable que le script pose (`set NOM=`, `set "NOM=`, `set /a NOM+=`), que Windows ou le
    /// moteur posent ; la suite d'une ligne après `setlocal DisableDelayedExpansion`, et les lignes entre
    /// `setlocal DisableDelayedExpansion` et `endlocal` ; le texte d'un echo (jusqu'au premier `&` ou `|` hors
    /// guillemets), sauf `echo @@RAGO` (relevé lu par le moteur) ; les commentaires.
    fn bang_errors(script: &str) -> Vec<String> {
        use std::collections::BTreeSet;
        const DDE_OFF: &str = "setlocal disabledelayedexpansion";
        fn name_char(c: u8, first: bool) -> bool {
            c.is_ascii_alphabetic() || c == b'_' || (!first && (c.is_ascii_digit() || b"#$.()-".contains(&c)))
        }
        fn spaces(b: &[u8], k: &mut usize) -> bool {
            let start = *k;
            while *k < b.len() && b[*k].is_ascii_whitespace() {
                *k += 1;
            }
            *k > start
        }
        // noms posés par le script (comme SET_NAME de tools/expansion.py)
        let mut known: BTreeSet<String> = ENV_VARS.iter().map(|v| v.to_string()).collect();
        let low = script.to_ascii_lowercase();
        let b = low.as_bytes();
        for s in (0..b.len()).filter(|&s| b[s..].starts_with(b"set")) {
            if s > 0 && !(b[s - 1].is_ascii_whitespace() || b"&|(@\"".contains(&b[s - 1])) {
                continue;
            }
            let mut k = s + 3;
            if !spaces(b, &mut k) {
                continue;
            }
            if b[k..].starts_with(b"/a") || b[k..].starts_with(b"/p") {
                let mut k2 = k + 2;
                if spaces(b, &mut k2) {
                    k = k2;
                }
            }
            if b.get(k) == Some(&b'"') {
                k += 1;
            }
            if !b.get(k).is_some_and(|&c| name_char(c, true)) {
                continue;
            }
            // nom le plus court suivi de `[espaces][-+*/]=`
            let mut e = k + 1;
            loop {
                let mut r = e;
                while r < b.len() && b[r].is_ascii_whitespace() {
                    r += 1;
                }
                if r < b.len() && b"-+*/".contains(&b[r]) && b.get(r + 1) == Some(&b'=') {
                    r += 1;
                }
                if b.get(r) == Some(&b'=') {
                    known.insert(low[k..e].to_ascii_uppercase());
                    break;
                }
                if e < b.len() && name_char(b[e], false) {
                    e += 1;
                } else {
                    break;
                }
            }
        }
        let mut errors = Vec::new();
        let mut dde = vec![true];
        for (n, l) in script.lines().enumerate() {
            let t = l.trim();
            let low = t.trim_start_matches('@').trim().to_ascii_lowercase();
            let word = |w: &str| low.strip_prefix(w).is_some_and(|r| r.bytes().next().is_none_or(|c| !(c.is_ascii_alphanumeric() || c == b'_')));
            if word("setlocal") && !low.contains('&') {
                let top = *dde.last().unwrap();
                dde.push(if low.contains("disabledelayedexpansion") {
                    false
                } else if low.contains("enabledelayedexpansion") {
                    true
                } else {
                    top
                });
            } else if word("endlocal") && !low.contains('&') && dde.len() > 1 {
                dde.pop();
            }
            if !*dde.last().unwrap() || t.is_empty() {
                continue;
            }
            let after = |w: &str| low.strip_prefix(w).map(|r| r.bytes().next());
            let start = if low.starts_with(':') || matches!(after("rem"), Some(None)) || matches!(after("rem"), Some(Some(c)) if c.is_ascii_whitespace()) {
                continue;
            } else if matches!(after("echo"), Some(None)) || matches!(after("echo"), Some(Some(c)) if c.is_ascii_whitespace() || b".(:/".contains(&c)) {
                let marker = low.strip_prefix("echo @@rago").is_some_and(|r| r.bytes().next().is_none_or(|c| !(c.is_ascii_alphanumeric() || c == b'_')));
                if marker {
                    0
                } else {
                    match masked_line(l).find(['&', '|']) {
                        Some(p) => p,
                        None => continue,
                    }
                }
            } else {
                0
            };
            let off = l.to_ascii_lowercase().find(DDE_OFF);
            let lb = l.as_bytes();
            let next = |from: usize| (from..lb.len()).find(|&i| lb[i] == b'!');
            let mut i = next(start);
            while let Some(a) = i {
                let (pos, why) = match next(a + 1) {
                    None => (a, "! seul".to_string()),
                    Some(z) => {
                        let name = l[a + 1..z].split(':').next().unwrap();
                        let nb = name.as_bytes();
                        let var = !nb.is_empty()
                            && nb.iter().enumerate().all(|(k, &c)| name_char(c, k == 0))
                            && known.contains(&name.to_ascii_uppercase());
                        i = next(z + 1);
                        if var {
                            continue;
                        }
                        (a, format!("!{}!", &l[a + 1..z]))
                    }
                };
                if !off.is_some_and(|o| o < pos) {
                    errors.push(format!("{}: {why} : {t}", n + 1));
                }
                if why == "! seul" {
                    break;
                }
            }
        }
        errors
    }

    #[test]
    fn bang_checker_sees_what_cmd_removes() {
        let bad = [
            (
                "Reg.exe add \"HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel\" /v \"Enabled\" /t REG_DWORD /d \"0\" /f",
                "! seul",
            ),
            ("echo @@RAGO reg \"HKCU\\A!B\" \"Enabled\"", "! seul"),
            ("echo - Notifications & reg add \"HKCU\\A!B\" /f", "! seul"),
            ("if not defined RAGO_HELD_1 reg delete \"HKCU\\A!B\" /v \"Enabled\" /f >nul 2>&1", "! seul"),
            ("reg add \"HKCU\\A!B!C\" /f", "!B!"),
            ("reg add \"HKCU\\!Jean!\" /f", "!Jean!"),
            ("set \"x=1\"\r\nreg add \"HKCU\\!x!\" /d \"!y!\" /f", "!y!"),
            // le bloc DisableDelayedExpansion est refermé
            ("setlocal DisableDelayedExpansion\r\nendlocal\r\nreg add \"HKCU\\A!B\" /f", "! seul"),
            // le `!` est avant le setlocal de la ligne
            ("reg add \"HKCU\\A!B\" /f & setlocal DisableDelayedExpansion & endlocal", "! seul"),
        ];
        for (s, why) in bad {
            let e = bang_errors(s);
            assert!(e.len() == 1 && e[0].contains(why), "{s}\n{e:?}");
        }
        let good = [
            "setlocal DisableDelayedExpansion & Reg.exe add \"HKCU\\A!B\" /v \"Enabled\" /f & endlocal",
            "setlocal DisableDelayedExpansion & echo @@RAGO reg \"HKCU\\A!B\" \"Enabled\" & endlocal",
            "setlocal DisableDelayedExpansion & (if not defined RAGO_HELD_1 reg delete \"HKCU\\A!B\" /v \"Enabled\" /f >nul 2>&1) & endlocal",
            "setlocal DisableDelayedExpansion\r\nreg add \"HKCU\\A!B\" /f\r\nendlocal",
            "set /a n+=1\r\nreg add \"HKCU\\K\" /v N /d \"!n!\" /f",
            "for /f %%a in ('ver') do set \"v=%%a\"\r\nreg add \"HKCU\\K\" /d \"!v:~0,4!\" /f",
            "netsh interface ipv4 set subinterface \"!adapter_name!\" mtu=1500 store=persistent",
            "if defined temp del /s /f /q \"!temp!\\*\" >nul 2>&1",
            "echo Credit to Mathako for helping!",
            "echo.- Finished!",
            ":: Notifications!",
            "rem Notifications!",
        ];
        for s in good {
            assert!(bang_errors(s).is_empty(), "{s}\n{:?}", bang_errors(s));
        }
    }

    /// Rien de ce que lance le moteur (réglages, relevés, annulations) n'a de `!` que cmd retirerait ou remplacerait
    /// (bang_errors). La clé des notifications de l'appli Paramètres (identifiant d'appli du Store, « famille!appli »)
    /// est écrite, relevée et annulée avec son `!`, et l'annulation sans relevé nettoie aussi la clé sans `!` que
    /// posaient les anciens scripts (finitions du 2026-10-13, tools/expansion.py).
    #[test]
    fn no_literal_bang_with_delayed_expansion() {
        let probes: Scripts = serde_json::from_str(include_str!("../scripts/probes.json")).unwrap();
        let undo: HashMap<String, HashMap<String, Undo>> = serde_json::from_str(include_str!("../scripts/undo.json")).unwrap();
        let mut bad = Vec::new();
        let mut check = |what: String, s: &str| bad.extend(bang_errors(s).into_iter().map(|e| format!("{what} {e}")));
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                check(format!("{id}:{v}"), s);
            }
        }
        for (id, variants) in &probes {
            for (v, s) in variants {
                check(format!("relevé {id}:{v}"), s);
            }
        }
        for (id, variants) in &undo {
            for (v, u) in variants {
                for (part, s) in [("full", &u.full), ("rest", &u.rest)] {
                    if let Some(s) = s {
                        check(format!("annulation {id}:{v} {part}"), s);
                    }
                }
            }
        }
        assert!(bad.is_empty(), "{} défauts :\n{}", bad.len(), bad.join("\n"));
        const KEY: &str = "\"HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\windows.immersivecontrolpanel_cw5n1h2txyewy";
        const APP: &str = "microsoft.windows.immersivecontrolpanel\"";
        for id in ["in_advanced", "sys_registry", "win_notifications"] {
            let (s, p, full) = (&SCRIPTS[id]["_"], &probes[id]["_"], undo[id]["_"].full.as_deref().unwrap());
            let set = format!("add {KEY}!{APP} /v \"Enabled\" /t REG_DWORD /d \"0\" /f & endlocal");
            let ok = |l: &str, end: &str| l.starts_with("setlocal DisableDelayedExpansion & ") && l.ends_with(end);
            assert_eq!(s.lines().filter(|l| ok(l, &set)).count(), 1, "{id}\n{s}");
            assert_eq!(s.matches("immersivecontrolpanel_").count(), 1, "{id}\n{s}");
            assert_eq!(p.lines().filter(|l| ok(l, &format!("echo @@RAGO reg {KEY}!{APP} \"Enabled\" & endlocal"))).count(), 1, "{id}\n{p}");
            assert_eq!(p.matches("immersivecontrolpanel_").count(), 1, "{id}\n{p}");
            let del = format!("reg delete {KEY}!{APP} /v \"Enabled\" /f >nul 2>&1) & endlocal");
            assert_eq!(full.lines().filter(|l| ok(l, &del)).count(), 1, "{id}\n{full}");
            let old = format!("reg delete {KEY}{APP} /v \"Enabled\" /f >nul 2>&1)");
            assert_eq!(full.lines().filter(|l| l.ends_with(&old)).count(), 1, "{id}\n{full}");
        }
    }

    /// Nom de la carte réseau lu par cmd en lisant un bloc (finitions du 2026-10-13, tools/expansion.py) : `%adapter_name%`
    /// est remplacé avant que le bloc soit découpé, un `)` dans le nom (« Ethernet (2) ») fermait le `if … (` au milieu
    /// et un `&` coupait la commande. `\"%NOM%\"` dans une commande PowerShell laisse même le nom hors des guillemets de
    /// cmd, qui ne connaît pas `\"`.
    fn adapter_errors(script: &str) -> Vec<String> {
        // parenthèses avant `end` sur une ligne de commande, hors guillemets et hors ^ (comme block_errors) : (ouvertes
        // et pas encore fermées sur la ligne, somme des +1 / -1)
        fn parens(l: &str, end: usize) -> (i32, i32) {
            let t = l.trim().trim_start_matches('@').trim().to_ascii_lowercase();
            let first = t.split(|c: char| c.is_ascii_whitespace() || ".(:/".contains(c)).next().unwrap_or("");
            if t.starts_with(':') || first == "rem" || first == "echo" {
                return (0, 0);
            }
            let (mut open, mut sum, mut quoted, mut it) = (0, 0, false, l[..end].bytes());
            while let Some(c) = it.next() {
                match c {
                    b'"' => quoted = !quoted,
                    b'^' if !quoted => {
                        it.next();
                    }
                    b'(' if !quoted => {
                        open += 1;
                        sum += 1;
                    }
                    b')' if !quoted => {
                        open = (open - 1).max(0);
                        sum -= 1;
                    }
                    _ => {}
                }
            }
            (open, sum)
        }
        let mut errors = Vec::new();
        let mut depth = 0;
        for (n, l) in script.lines().enumerate() {
            let t = l.trim();
            let low = l.to_ascii_lowercase();
            if low.match_indices("%adapter_name%").any(|(i, _)| depth + parens(l, i).0 > 0) {
                errors.push(format!("{}: %adapter_name% dans un bloc : {t}", n + 1));
            }
            if l.match_indices("\\\"%").any(|(i, _)| l[i + 3..].find('%').is_some_and(|j| l[i + 3 + j + 1..].starts_with("\\\""))) {
                errors.push(format!("{}: \\\"%…%\\\" hors des guillemets de cmd : {t}", n + 1));
            }
            depth = (depth + parens(l, l.len()).1).max(0);
        }
        errors
    }

    #[test]
    fn adapter_checker_sees_what_breaks_a_block() {
        let bad = [
            ("if defined adapter_name (\r\n    echo Your current network adapter is: %adapter_name%\r\n)", "dans un bloc"),
            ("if defined adapter_name (\r\n    netsh interface ipv4 set subinterface \"%adapter_name%\" mtu=1500\r\n)", "dans un bloc"),
            ("if defined adapter_name ( echo %adapter_name% )", "dans un bloc"),
            ("powershell -Command \"Get-NetAdapter -Name \\\"%adapter_name%\\\"\"", "hors des guillemets"),
        ];
        for (s, why) in bad {
            let e = adapter_errors(s);
            assert!(e.len() == 1 && e[0].contains(why), "{s}\n{e:?}");
        }
        let good = [
            "netsh interface ipv4 set subinterface \"%adapter_name%\" mtu=1500 store=persistent >nul 2>&1",
            "if \"%adapter_name%\"==\"\" (\r\n    exit /B\r\n)",
            "if defined adapter_name (\r\n    echo Your current network adapter is: !adapter_name!\r\n    powershell -Command \"Get-NetAdapterAdvancedProperty \
             -Name $env:adapter_name -RegistryKeyword '*EEE' | Set-NetAdapterAdvancedProperty -RegistryValue 0\" >nul 2>&1\r\n) else (\r\n    echo Skipping.\r\n)\r\n\
             netsh interface ipv4 set subinterface \"%adapter_name%\" mtu=1500",
            "for /f \"delims=\" %%a in ('x') do (\r\n    set \"adapter_name=%%a\"\r\n)\r\necho %adapter_name%",
        ];
        for s in good {
            assert!(adapter_errors(s).is_empty(), "{s}\n{:?}", adapter_errors(s));
        }
    }

    /// Le nom de la carte réseau (ping_main:config3, hitreg_suite) est lu à l'exécution dans les blocs : `!adapter_name!`
    /// pour l'echo, `$env:adapter_name` pour PowerShell (adapter_errors). Les lignes netsh qui lisent la valeur posée
    /// par le moteur (hors bloc, entre guillemets) ne changent pas.
    #[test]
    fn adapter_name_cannot_break_a_block() {
        let probes: Scripts = serde_json::from_str(include_str!("../scripts/probes.json")).unwrap();
        let undo: HashMap<String, HashMap<String, Undo>> = serde_json::from_str(include_str!("../scripts/undo.json")).unwrap();
        let mut bad = Vec::new();
        let mut check = |what: String, s: &str| bad.extend(adapter_errors(s).into_iter().map(|e| format!("{what} {e}")));
        for (id, variants) in SCRIPTS.iter() {
            for (v, s) in variants {
                check(format!("{id}:{v}"), s);
            }
        }
        for (id, variants) in &probes {
            for (v, s) in variants {
                check(format!("relevé {id}:{v}"), s);
            }
        }
        for (id, variants) in &undo {
            for (v, u) in variants {
                for (part, s) in [("full", &u.full), ("rest", &u.rest)] {
                    if let Some(s) = s {
                        check(format!("annulation {id}:{v} {part}"), s);
                    }
                }
            }
        }
        assert!(bad.is_empty(), "{} défauts :\n{}", bad.len(), bad.join("\n"));
        let echo = "    echo Your current network adapter is: !adapter_name!";
        let ps = "    powershell -Command \"Get-NetAdapterAdvancedProperty -Name $env:adapter_name -";
        let s = &SCRIPTS["ping_main"]["config3"];
        assert_eq!(s.lines().filter(|l| *l == echo).count(), 1, "{s}");
        assert_eq!(s.lines().filter(|l| l.starts_with(ps)).count(), 29, "{s}");
        for v in ["good", "medium", "low", "laptop"] {
            let s = &SCRIPTS["hitreg_suite"][v];
            assert_eq!(s.lines().filter(|l| *l == echo).count(), 1, "{v}\n{s}");
            assert_eq!(s.lines().filter(|l| l.starts_with(ps)).count(), 2, "{v}\n{s}");
        }
        // décision de Sofiene en attente : valeur posée par le moteur (runner.rs, carte physique active), inchangée
        for (id, v) in [("net_profile", "hitreg"), ("net_profile", "knockback"), ("ping_packets", "hitreg"), ("ping_packets", "knockback"), ("net_advanced", "_")] {
            assert!(SCRIPTS[id][v].contains("netsh interface ipv4 set subinterface \"%adapter_name%\" mtu="), "{id}:{v}");
        }
    }

    /// Services que lit le vérificateur officiel de RBW (github.com/quickpots/RBW-SS, Services.ps1, relevé le
    /// 2026-10-13), en plus de chaque CDPUserSvc_xxxx : il les veut tous en Running.
    const RBW_CHECKER: [&str; 11] = ["sysmain", "pcasvc", "dps", "bam", "eventlog", "wsearch", "dusmsvc", "bfe", "appinfo", "dcomlaunch", "plugplay"];

    /// RBW Mod « Activé » fait ce que fait le script validé par Sofiene (rbw/Rago-RBW-Fix.ps1), dans le même ordre :
    /// démarrage avec Windows, services dont ils dépendent, réglages lus par le vérificateur, lancement, rapport, programmes
    /// qui les recouperaient. Le vérificateur passe au vert même quand un autre réglage de l'app les a coupés.
    #[test]
    fn rbw_mode_on_does_what_the_validated_fix_does() {
        let on = SCRIPTS["rbw_mode"]["on"].to_lowercase();
        // services et démarrage voulu (2 automatique, 3 manuel, 1 système), comme $services dans le script validé
        let list = on.split("$services = [ordered]@{ ").nth(1).and_then(|s| s.split(" }").next()).expect("$services");
        let wanted: Vec<(&str, &str)> = list.split("; ").map(|p| p.split_once(" = ").expect(p)).collect();
        assert_eq!(
            wanted,
            [
                ("sysmain", "2"), ("pcasvc", "2"), ("dps", "2"), ("eventlog", "2"), ("wsearch", "2"), ("dusmsvc", "2"), ("bfe", "2"),
                ("appinfo", "2"), ("schedule", "2"), ("dsmsvc", "2"), ("diagtrack", "2"), ("dcomlaunch", "2"), ("plugplay", "3"),
                ("bam", "1"), ("dam", "1"), ("cdpusersvc", "2"),
            ]
        );
        for svc in RBW_CHECKER {
            assert!(wanted.iter().any(|(n, _)| *n == svc), "{svc} absent de la liste");
        }
        let at = |part: &str| on.find(part).unwrap_or_else(|| panic!("absent : {part}"));
        // chaque CDPUserSvc_xxxx (suffixe propre à chaque session), lu dans le registre : la sortie de sc query est
        // traduite (NOM_SERVICE sur un Windows en français)
        at("get-childitem -path 'hklm:\\system\\currentcontrolset\\services' | where-object { $_.pschildname -like 'cdpusersvc_*' } | foreach-object { $services[$_.pschildname] = 2 }");
        assert!(!on.contains("service_name"), "sortie de sc lue");
        // 1. démarrage avec Windows : sc config, puis Set-Service, puis la valeur Start du registre ; WSearch en différé ;
        //    Windows Search remis s'il a été retiré
        let start_type = at("function set-start($name, $start)");
        for part in [
            "sc.exe config $name start= $mode | out-null",
            "set-service -name $name -startuptype $type",
            "set-itemproperty -path $key -name 'start' -value $start -type dword",
            "set-itemproperty -path $key -name 'delayedautostart' -value 1 -type dword",
            "enable-windowsoptionalfeature -online -featurename 'searchengine-client-package' -all -norestart",
            "foreach ($name in @($services.keys)) { set-start $name $services[$name] }",
        ] {
            assert!(at(part) > start_type, "{part}");
        }
        // 2. services dont ils dépendent : désactivés, remis en manuel
        let deps = at("function fix-dependencies($name)");
        assert!(at("(get-service -name $name).servicesdependedon") > deps);
        assert!(at("sc.exe config $d.name start= demand") > deps);
        assert!(at("set-itemproperty -path $key -name 'start' -value 3 -type dword") > deps);
        // 3. réglages lus par le vérificateur, et ce dont DPS a besoin pour démarrer
        let settings = at("$sys = 'hklm:\\software\\policies\\microsoft\\windows\\system'");
        for part in [
            "foreach ($v in 'enableactivityfeed', 'publishuseractivities') { if ($null -ne (reg $sys $v)) { remove-itemproperty -path $sys -name $v",
            "$ac = 'hklm:\\software\\policies\\microsoft\\windows\\appcompat'; if (test-path $ac) { remove-item -path $ac -recurse -force",
            "if ((reg $adv 'start_trackdocs') -ne 1) { set-itemproperty -path $adv -name 'start_trackdocs' -value 1 -type dword",
            "$cmd = 'hkcu:\\software\\policies\\microsoft\\windows\\system'; if ($null -ne (reg $cmd 'disablecmd')) { remove-itemproperty -path $cmd -name 'disablecmd'",
            "if ((reg $sb 'enablescriptblocklogging') -eq 0) { remove-itemproperty -path $sb -name 'enablescriptblocklogging'",
            "foreach ($v in 'enableprefetcher', 'enablesuperfetch') { if ((reg $pf $v) -ne 3) { set-itemproperty -path $pf -name $v -value 3 -type dword",
            "foreach ($logger in 'diaglog', 'wdicontextlog') { $key = 'hklm:\\system\\currentcontrolset\\control\\wmi\\autologger\\' + $logger; if ((test-path $key) -and (reg $key 'start') -ne 1) { set-itemproperty -path $key -name 'start' -value 1 -type dword",
            "$wdi = 'hklm:\\software\\policies\\microsoft\\windows\\wdi\\{9c5a40da-b965-4fc3-8781-88dd50a6299d}'; if ($null -ne (reg $wdi 'scenarioexecutionenabled')) { remove-itemproperty -path $wdi -name 'scenarioexecutionenabled'",
        ] {
            assert!(at(part) > settings, "{part}");
        }
        // 4. lancement : Start-Service, puis sc start, puis net start ; tous sauf le modèle CDPUserSvc et DAM
        let launch = at("function start-one($name)");
        for part in ["start-service -name $name", "sc.exe start $name | out-null", "net.exe start $name 2>&1 | out-null"] {
            assert!(at(part) > launch, "{part}");
        }
        at("foreach ($name in @($services.keys) | where-object { $_ -notin 'cdpusersvc', 'dam' }) { start-one $name }");
        // 5. ce que voit le vérificateur, lu comme lui ; 6. ce qui les recouperait au démarrage (rien n'est changé)
        let report = at("$since = (get-date).addminutes(-30)");
        let names = at("$names = @(") + "$names = @(".len();
        let names = &on[names..names + on[names..].find(')').unwrap()];
        assert_eq!(names.replace('\'', "").split(", ").collect::<Vec<_>>(), RBW_CHECKER, "services lus par le rapport");
        assert!(at("$names += @(get-service | where-object { $_.name -match '^cdpusersvc_.+' }") > report);
        assert!(at("if (test-path 'hklm:\\software\\policies\\microsoft\\windows\\appcompat') { $red++") > report);
        for part in ["get-ciminstance -classname win32_service", "get-winevent", "servicespecificexitcode"] {
            assert!(at(part) > report, "{part}");
        }
        let scan = at("get-scheduledtask");
        // même ordre que le script validé
        assert!(start_type < deps && deps < settings && settings < launch && launch < report && report < scan);
        // cmd : lignes de moins de 8191 caractères ; dans le code PowerShell, ni « " » (fin de l'argument), ni « % »
        // (variable de cmd), ni « ! » (retiré par EnableDelayedExpansion)
        assert!(!on.contains('!') && !on.contains('%'));
        let stages: Vec<&str> = on.lines().filter(|l| !l.starts_with("echo ")).collect();
        assert_eq!(stages.len(), 6);
        for l in stages {
            assert!(l.len() < 8191, "ligne de {} caractères", l.len());
            let code = l.strip_prefix("powershell -noprofile -noninteractive -executionpolicy bypass -command \"").and_then(|c| c.strip_suffix('"')).expect(l);
            assert!(!code.contains('"'), "{code}");
        }
        // « Activé » lance toujours son script, même après « Désactivé » (pas la sauvegarde, qui ne démarre rien)
        assert!(revert_runs_script("rbw_mode") && !revert_runs_script("game_mode"));
        assert_eq!(revert_variant("rbw_mode").as_deref(), Some("on"));
        assert!(PLAIN.scripts.get("rbw_mode").and_then(|e| e.get("on")).is_some(), "ouvert sans licence");
    }

    /// RBW Mod « Désactivé » : services et réglages comme Windows les règle, rien d'arrêté.
    #[test]
    fn rbw_mode_off_puts_windows_values_and_stops_nothing() {
        let off = SCRIPTS["rbw_mode"]["off"].to_lowercase();
        let lines: Vec<&str> = off.lines().map(str::trim).collect();
        assert!(!off.contains("sc stop") && !off.contains("stop-service") && !off.contains("net stop") && !off.contains("disabled") && !off.contains('!'));
        for (svc, mode) in [
            ("sysmain", "auto"), ("pcasvc", "auto"), ("dps", "auto"), ("eventlog", "auto"), ("wsearch", "delayed-auto"), ("dusmsvc", "auto"),
            ("bfe", "auto"), ("appinfo", "demand"), ("schedule", "auto"), ("dsmsvc", "demand"), ("diagtrack", "auto"), ("dcomlaunch", "auto"),
            ("plugplay", "demand"), ("bam", "system"), ("dam", "system"),
        ] {
            assert!(lines.contains(&format!("sc config {svc} start= {mode} >nul 2>&1").as_str()), "{svc} pas en {mode}");
        }
        // les réglages lus par le vérificateur, comme « Activé »
        for part in [
            "reg delete \"hklm\\software\\policies\\microsoft\\windows\\system\" /v \"enableactivityfeed\" /f",
            "reg delete \"hklm\\software\\policies\\microsoft\\windows\\appcompat\" /f",
            "explorer\\advanced\" /v \"start_trackdocs\" /t reg_dword /d \"1\" /f",
            "reg delete \"hkcu\\software\\policies\\microsoft\\windows\\system\" /v \"disablecmd\" /f",
            "| find \"0x0\" >nul && reg delete \"hklm\\software\\policies\\microsoft\\windows\\powershell\\scriptblocklogging\" /v \"enablescriptblocklogging\" /f",
            "/v \"enableprefetcher\" /t reg_dword /d \"3\" /f",
            "autologger\\diaglog\" /v \"start\" /t reg_dword /d \"1\" /f",
            "autologger\\wdicontextlog\" /v \"start\" /t reg_dword /d \"1\" /f",
            "/v \"scenarioexecutionenabled\" /f",
        ] {
            assert!(off.contains(part), "« Désactivé » ne remet pas : {part}");
        }
        // les services que Windows démarre seul sont lancés, chaque CDPUserSvc_xxxx compris, en automatique comme son
        // modèle (noms lus dans le registre, pas dans la sortie de sc, traduite)
        let started = lines.iter().find(|l| l.starts_with("for %%s in (")).expect("services lancés");
        for svc in ["sysmain", "pcasvc", "dps", "eventlog", "wsearch", "dusmsvc", "bfe", "bam"] {
            assert!(started.split(['(', ')', ' ']).any(|s| s == svc), "{svc} pas lancé");
        }
        assert!(lines.iter().any(|l| l.contains("('reg query \"hklm\\system\\currentcontrolset\\services\" /k /f \"cdpusersvc_\" ^| find /i \"cdpusersvc_\"')")
            && l.ends_with("do (reg add \"hklm\\system\\currentcontrolset\\services\\%%s\" /v \"start\" /t reg_dword /d \"2\" /f >nul & sc start %%s >nul 2>&1)")));
        assert!(!off.contains("service_name"));
    }

    /// Ce qu'un réglage de l'app change dans ce que lit le vérificateur RBW (ou dans ce dont ses services ont besoin pour
    /// démarrer) et que RBW Mod « Activé » ne remettrait pas. None : rien, ou « Activé » le remet.
    fn rbw_gap(line: &str) -> Option<String> {
        let mut l = line.to_lowercase().replace(['"', '\''], "");
        for (a, b) in [("hkey_local_machine", "hklm"), ("hkey_current_user", "hkcu"), ("reg.exe", "reg"), ("sc.exe", "sc"), ("net.exe", "net"), ("start= ", "start=")] {
            l = l.replace(a, b);
        }
        let l = l.split_whitespace().collect::<Vec<_>>().join(" ");
        if l.is_empty() || l.starts_with("echo") || l.starts_with("rem ") || l.starts_with("::") {
            return None;
        }
        let tk: Vec<&str> = l.split(|c: char| c.is_whitespace() || "\\(),;|&>".contains(c)).filter(|t| !t.is_empty()).collect();
        if tk.is_empty() {
            return None;
        }
        let after = |w: &str| tk.iter().position(|t| *t == w).and_then(|i| tk.get(i + 1)).copied();
        let value = after("/v").or(after("-name"));
        let reads = (tk[0] == "reg" && tk.get(1) == Some(&"query")) || tk[0] == "get-itemproperty";
        // services : démarrage et état seulement, « Activé » remet le démarrage voulu puis les lance
        let svc = RBW_CHECKER.iter().find(|s| tk.contains(s)).copied().or(tk.iter().find(|t| t.starts_with("cdpusersvc")).copied());
        if let Some(svc) = svc.filter(|_| tk.contains(&"sc") || tk.contains(&"net") || l.contains("-service") || l.contains("services\\")) {
            let ok = if l.contains("services\\") {
                reads || matches!(value, Some("start" | "delayedautostart"))
            } else if tk.contains(&"sc") {
                match after("sc") {
                    Some("stop" | "start" | "query" | "qc") => true,
                    Some("config") => tk.iter().skip_while(|t| **t != "config").filter(|t| t.contains('=')).all(|t| t.starts_with("start=")),
                    _ => false,
                }
            } else if tk.contains(&"net") {
                matches!(after("net"), Some("stop" | "start"))
            } else {
                ["stop-service", "start-service", "get-service"].iter().any(|c| l.contains(c))
                    || (l.contains("set-service") && (l.contains("-startuptype") || l.contains("-status")) && !l.contains("-securitydescriptor"))
            };
            if !ok {
                return Some(format!("service {svc}"));
            }
        }
        // valeurs : « Activé » enlève les stratégies, la clé AppCompat, remet Start_TrackDocs, le Prefetcher, les journaux
        // de DPS (Start) ; une autre valeur de ces journaux ou du scénario WDI, ou la clé entière, n'est pas remise
        for key in ["autologger\\diaglog", "autologger\\wdicontextlog"] {
            if l.contains(key) && !reads && value != Some("start") {
                return Some(key.to_string());
            }
        }
        if l.contains("wdi\\{9c5a40da-b965-4fc3-8781-88dd50a6299d}") && !reads && value != Some("scenarioexecutionenabled") {
            return Some("WDI".into());
        }
        None
    }

    /// Garde pour les réglages à venir : ce qu'un autre réglage coupe parmi ce que lit le vérificateur RBW, RBW Mod
    /// « Activé » le remet (relevé du 2026-10-13 : win_services, dbl_autologgers, exp_autologgers, sys_registry,
    /// win_audit, win_telemetry, win_tracking, dbl_telemetry, hitreg_suite, in_advanced, win_feed, sys_csrss, win_diag).
    /// Un nouveau réglage qui coupe autrement un de ces éléments fait échouer ce test : le remettre dans tools/rbw.py
    /// (« Activé », comme le script validé), ou ne pas le couper.
    #[test]
    fn rbw_mode_puts_back_what_other_tweaks_turn_off() {
        let mut touched = std::collections::BTreeSet::new();
        for (id, variants) in SCRIPTS.iter().filter(|(id, _)| id.as_str() != "rbw_mode") {
            for (v, s) in variants {
                for l in s.lines() {
                    assert_eq!(rbw_gap(l), None, "{id}:{v} : le RBW Mod ne remet pas : {l}");
                    let low = l.to_lowercase();
                    if ["enableactivityfeed", "appcompat", "start_trackdocs", "enableprefetcher", "autologger\\diaglog", "wdicontextlog", "sc config wsearch"]
                        .iter()
                        .any(|p| low.contains(p))
                    {
                        touched.insert(id.as_str());
                    }
                }
            }
        }
        // la garde voit bien les réglages qui coupent ces éléments aujourd'hui
        for id in ["win_services", "dbl_autologgers", "sys_registry", "win_telemetry", "dbl_telemetry", "hitreg_suite", "in_advanced"] {
            assert!(touched.contains(id), "{id}");
        }
        // et elle refuse ce que « Activé » ne remet pas
        for l in [
            "sc delete SysMain",
            "sc.exe sdset DPS D:(D;;GA;;;WD)",
            "sc config WSearch depend= RpcSs/NoSuchService",
            "reg delete \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\bam\" /f",
            "Reg.exe add \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc\" /v \"ImagePath\" /t REG_EXPAND_SZ /d \"x\" /f",
            "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\CDPUserSvc' -Name UserServiceFlags -Value 0",
            "Remove-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\EventLog' -Recurse",
            "reg delete \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\WMI\\Autologger\\DiagLog\" /f",
            "reg add \"HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WDI\\{9c5a40da-b965-4fc3-8781-88dd50a6299d}\" /v \"EnabledScenarioExecutionLevel\" /t REG_DWORD /d \"1\" /f",
        ] {
            assert!(rbw_gap(l).is_some(), "pas vu : {l}");
        }
        for l in [
            "sc config DPS start= disabled",
            "for %%s in (SysMain WSearch) do sc stop %%s >nul 2>&1",
            "net stop bfe /y",
            "Set-Service -Name DusmSvc -StartupType Disabled",
            "reg add \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\bam\" /v \"Start\" /t REG_DWORD /d \"4\" /f",
            "reg add \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\WMI\\Autologger\\WdiContextLog\" /v \"Start\" /t REG_DWORD /d \"0\" /f",
            "reg add \"HKLM\\SOFTWARE\\Microsoft\\DusmSvc\\Settings\" /v \"DisableSystemBucket\" /t REG_DWORD /d \"1\" /f",
        ] {
            assert_eq!(rbw_gap(l), None, "{l}");
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

    /// RAG-65 : toute désinstallation d'applis du Store se remet. Le réglage est une case (relevé et annulation), son
    /// relevé note les applis visées et le catalogue garde leur liste pour l'annulation sans relevé.
    #[test]
    fn store_app_removals_can_be_undone() {
        let b = premium(&test_key()).unwrap();
        let mut seen = Vec::new();
        for (id, vs) in SCRIPTS.iter() {
            for (v, body) in vs {
                if !body.to_lowercase().contains("remove-appxpackage") {
                    continue;
                }
                seen.push(id.as_str());
                assert!(is_switch(id), "{id} : une case, pas une action ponctuelle");
                assert!(!apps_of(id).is_empty(), "{id} : liste des applis dans le catalogue");
                let p = probe(id, Some(v), Some(&b)).or_else(|| probe(id, None, Some(&b))).unwrap();
                for app in apps_of(id) {
                    assert!(p.contains(&format!("@@RAGO appx \"{app}\"")), "{id} : relevé de {app}");
                }
                assert!(!body.to_lowercase().contains("remove-appxprovisionedpackage"), "{id} : l'image garde le paquet");
            }
        }
        seen.sort();
        seen.dedup();
        assert_eq!(seen, vec!["app_remove", "dbl_cortana", "win_apps", "win_services"]);
        assert!(apps_of("app_remove").iter().any(|a| a == "*Microsoft.WindowsCamera*"));
        assert_eq!(apps_of("app_remove"), apps_of("win_apps"), "jumeaux");
        for id in FORMER_ACTIONS {
            assert!(is_switch(id) && !apps_of(id).is_empty(), "{id}");
        }
        assert!(apps_of("net_nagle").is_empty());
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

    /// Revue finale du moteur (2026-10-13) : un PC passé par 1.1.9 garde dans applied.json la copie de l'annulation
    /// de 1.1.9. Sans licence (fin de Premium, déconnexion, Tout annuler, désinstallation), c'est elle qui tourne :
    /// elle doit être remplacée par celle de cette version dès que la licence est encore active (keep_undo, appelé à
    /// chaque lecture des réglages appliqués), sinon les corrections du retour arrière (RAG-60) ne servent qu'aux
    /// joueurs encore abonnés.
    #[test]
    fn undo_copies_of_older_versions_are_refreshed_while_licensed() {
        use crate::backup::{Ledger, Undo};
        let bundle = premium(&test_key()).unwrap();
        // textes de 1.1.9 (undo.json de 1c340df)
        let old = [
            ("in_advanced", "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Disable-ComputerRestore -Drive 'D:\\','E:\\','F:\\','G:\\' -ErrorAction SilentlyContinue\" >nul 2>&1"),
            ("sys_registry", "auditpol /set /subcategory:{0CCE922C-69AE-11D9-BED3-505054503030} /success:disable /failure:disable >nul 2>&1"),
        ];
        let mut l = Ledger::default();
        for (i, (id, rest)) in old.iter().enumerate() {
            l.set_applied(id, None, true, true, vec![], i as u64);
            l.tweaks.get_mut(*id).unwrap().undo = Some(Undo { rest: Some(rest.to_string()), ..Default::default() });
            // réglages Premium : sans licence, le moteur n'a que cette copie (runner::undo_item)
            assert!(undo_of(id, None, None).is_none(), "{id}");
        }
        let ledger = Mutex::new(l);
        // sans licence : rien à mettre à la place, la copie reste
        crate::keep_undo(&ledger, None);
        assert!(ledger.lock().unwrap().tweaks["in_advanced"].undo.as_ref().unwrap().rest.as_deref().unwrap().contains("Disable-ComputerRestore"));
        // licence active : la copie devient l'annulation de cette version
        crate::keep_undo(&ledger, Some(&bundle));
        let l = ledger.lock().unwrap();
        for (id, _) in old {
            let copy = l.tweaks[id].undo.clone().unwrap();
            assert_eq!(Some(&copy), undo_of(id, None, Some(&bundle)).as_ref(), "{id}");
            let (full, rest) = (copy.full.unwrap_or_default().to_lowercase(), copy.rest.unwrap_or_default().to_lowercase());
            assert!(!full.contains("disable-computerrestore") && !rest.contains("disable-computerrestore"), "{id}");
            assert!(!rest.contains("auditpol"), "{id}");
        }
    }
}
