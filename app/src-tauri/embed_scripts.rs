// Inclus par build.rs : sépare les scripts gratuits (en clair) des scripts Premium (chiffrés, voir src/seal.rs).
// En clair : réglages du plan gratuit, variantes de retour arrière, scripts internes. Chiffré : le reste,
// avec les relevés (scripts/probes.json) et l'annulation (scripts/undo.json) des réglages Premium.

fn embed_scripts(manifest: &std::path::Path, out: &std::path::Path) {
    use std::collections::{BTreeMap, HashSet};
    type Map = BTreeMap<String, BTreeMap<String, String>>;
    for f in ["scripts/scripts.json", "scripts/probes.json", "scripts/undo.json", "../src/data/free.json", "../src/data/catalog.json"] {
        println!("cargo:rerun-if-changed={}", manifest.join(f).display());
    }
    println!("cargo:rerun-if-env-changed=RAGO_SCRIPTS_SECRET");
    println!("cargo:rerun-if-env-changed=RAGO_API_BASE");
    let read = |f: &str| std::fs::read_to_string(manifest.join(f)).unwrap_or_else(|e| panic!("{f} : {e}"));
    let scripts: Map = serde_json::from_str(&read("scripts/scripts.json")).expect("scripts.json");
    let probes: Map = serde_json::from_str(&read("scripts/probes.json")).expect("probes.json (npm run catalog)");
    let undo: BTreeMap<String, serde_json::Value> = serde_json::from_str(&read("scripts/undo.json")).expect("undo.json (npm run catalog)");
    let free: serde_json::Value = serde_json::from_str(&read("../src/data/free.json")).expect("free.json");
    let free: HashSet<String> = free["tweaks"].as_array().unwrap().iter().map(|v| v.as_str().unwrap().to_string()).collect();
    let catalog: serde_json::Value = serde_json::from_str(&read("../src/data/catalog.json")).expect("catalog.json");
    let mut reverts = HashSet::new();
    for m in catalog["modules"].as_array().unwrap() {
        for s in m["sections"].as_array().unwrap() {
            for t in s["tweaks"].as_array().unwrap() {
                for v in t["variants"].as_array().into_iter().flatten() {
                    if v["revert"] == true {
                        reverts.insert(format!("{}:{}", t["id"].as_str().unwrap(), v["id"].as_str().unwrap()));
                    }
                }
            }
        }
    }

    let release = std::env::var("PROFILE").as_deref() == Ok("release");
    let connected = std::env::var("RAGO_API_BASE").is_ok();
    let secret = match std::env::var("RAGO_SCRIPTS_SECRET") {
        Ok(s) if !s.trim().is_empty() => s.trim().to_string(),
        _ => {
            assert!(
                !(release && connected),
                "RAGO_SCRIPTS_SECRET manque : ajoute le secret GitHub RAGO_SCRIPTS_SECRET (même valeur que SCRIPTS_SECRET sur Railway)"
            );
            seal::TEST_SECRET.to_string()
        }
    };
    assert!(
        !(release && connected && secret == seal::TEST_SECRET),
        "RAGO_SCRIPTS_SECRET est le secret de TEST : mets celui du serveur de production"
    );

    let (mut plain_s, mut plain_p, mut sealed_s, mut sealed_p) = (Map::new(), Map::new(), Map::new(), Map::new());
    for (id, vs) in &scripts {
        for (v, body) in vs {
            let open = free.contains(id) || reverts.contains(&format!("{id}:{v}"));
            let dst = if open { &mut plain_s } else { &mut sealed_s };
            dst.entry(id.clone()).or_default().insert(v.clone(), body.clone());
            if let Some(p) = probes.get(id).and_then(|p| p.get(v)) {
                let dst = if free.contains(id) { &mut plain_p } else { &mut sealed_p };
                dst.entry(id.clone()).or_default().insert(v.clone(), p.clone());
            }
        }
    }
    let (mut plain_u, mut sealed_u) = (BTreeMap::new(), BTreeMap::new());
    for (id, u) in undo {
        let dst = if free.contains(&id) { &mut plain_u } else { &mut sealed_u };
        dst.insert(id, u);
    }
    let plain = serde_json::json!({ "scripts": plain_s, "probes": plain_p, "undo": plain_u });
    std::fs::write(out.join("scripts.plain.json"), serde_json::to_vec(&plain).unwrap()).unwrap();
    let premium = serde_json::to_vec(&serde_json::json!({ "scripts": sealed_s, "probes": sealed_p, "undo": sealed_u })).unwrap();
    let version = std::env::var("CARGO_PKG_VERSION").unwrap();
    let key = seal::version_key(&secret, &version);
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
    let nonce: [u8; 16] = seal::hmac(&key, format!("nonce|{stamp}|{}", premium.len()).as_bytes())[..16].try_into().unwrap();
    std::fs::write(out.join("scripts.sealed"), seal::seal(&key, &nonce, &premium)).unwrap();
}
