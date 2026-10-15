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
        // ce que tools/paths.py a écrit (redirection « > nul » de la 1.1.10 : le journal du Mode jeu n'est pas changé)
        let on = &SCRIPTS["game_mode"]["on"];
        assert!(on.lines().any(|l| l == "if defined temp del /s /f /q \"!temp!\\*\" > nul"), "{on}");
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
        assert!(crate::assets::bytes("LowLatency.pow").is_some_and(|b| !b.is_empty()));
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
        // le fichier chiffré dans l'exe, écrit comme le fait le moteur (assets.rs)
        let run = std::env::temp_dir().join(format!("rago-test-plan-{}", std::process::id()));
        let line = SCRIPTS["pow_plan"]["_"].lines().find(|l| l.contains("powercfg -import")).unwrap().replace(RAGO_PLAN, TEST_PLAN);
        let (staged, line) = crate::assets::stage(&run, &line).unwrap();
        let res = staged.dir().unwrap().to_path_buf();
        for cmd in line.split(" & ").filter(|c| !c.contains("-setactive")) {
            let cmd = cmd.replace("%RAGO_SEC%", &res.to_string_lossy());
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
