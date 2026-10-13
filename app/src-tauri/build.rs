#[path = "src/seal.rs"]
mod seal;
include!("embed_scripts.rs");

fn main() {
    guard_test_key();
    let manifest = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let out = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());
    embed_scripts(&manifest, &out);
    app_identifier(&manifest);
    // Le manifeste demande les droits administrateur au lancement : la quasi-totalité des
    // réglages écrivent dans HKLM, les services ou le BCD.
    let windows = tauri_build::WindowsAttributes::new().app_manifest(include_str!("app.manifest"));
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("failed to run tauri-build");
}

/// La clé privée de test est publique (licensing/docs/test) : un exe release qui accepterait la clé
/// publique correspondante validerait des licences signées par n'importe qui.
fn guard_test_key() {
    println!("cargo:rerun-if-env-changed=RAGO_LICENSE_PUBKEY");
    let release = std::env::var("PROFILE").as_deref() == Ok("release");
    let squash = |s: &str| s.chars().filter(|c| !c.is_whitespace()).collect::<String>().replace("\\n", "");
    if let (true, Ok(key)) = (release, std::env::var("RAGO_LICENSE_PUBKEY")) {
        let test = squash(include_str!("keys/test-public-key.pem"));
        let body = test.replace("-----BEGINPUBLICKEY-----", "").replace("-----ENDPUBLICKEY-----", "");
        let key = squash(&key);
        assert!(
            key != test && !key.contains(&body),
            "RAGO_LICENSE_PUBKEY est la clé publique de TEST : mets la clé du serveur de production (GET /api/v1/public-key)"
        );
    }
}

/// Identifiant de l'app (tauri.conf.json, où la CI fusionne celui de l'exe de test depuis tauri.staging.conf.json) : le
/// désinstallateur lancé avec `--reset-tweaks` lit applied.json dans ce dossier de %APPDATA%. Écrit en dur, celui de
/// l'exe de test lirait et remettrait les réglages appliqués par le vrai Rago Optimizer.
fn app_identifier(manifest: &std::path::Path) {
    println!("cargo:rerun-if-changed={}", manifest.join("tauri.conf.json").display());
    println!("cargo:rerun-if-env-changed=TAURI_CONFIG");
    let read = |s: &str| {
        serde_json::from_str::<serde_json::Value>(s).ok().and_then(|v| v["identifier"].as_str().map(str::to_string))
    };
    let id = std::env::var("TAURI_CONFIG")
        .ok()
        .and_then(|c| read(&c))
        .or_else(|| read(&std::fs::read_to_string(manifest.join("tauri.conf.json")).ok()?))
        .expect("identifier manquant dans tauri.conf.json");
    println!("cargo:rustc-env=RAGO_IDENTIFIER={id}");
}
