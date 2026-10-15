//! Licence Rago Optimizer Premium, d'après le contrat /api/v1 du serveur de licences
//! (licensing/docs/API.md) : connexion, activation liée au PC, jeton Ed25519 vérifié hors ligne.

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use crate::history::now_ms;
use crate::shell;

/// En release, fixés à la compilation : `RAGO_API_BASE=https://…/api/v1 RAGO_LICENSE_PUBKEY="<PEM>"`.
/// En debug, le serveur local et la clé de test du contrat servent par défaut.
pub(crate) const API_BASE: Option<&str> = match option_env!("RAGO_API_BASE") {
    Some(v) => Some(v),
    None if cfg!(debug_assertions) => Some("http://localhost:8787/api/v1"),
    None => None,
};
const PUBLIC_KEY: Option<&str> = match option_env!("RAGO_LICENSE_PUBKEY") {
    Some(v) => Some(v),
    None if cfg!(debug_assertions) => Some(include_str!("../keys/test-public-key.pem")),
    None => None,
};

/// Le contrat demande un rafraîchissement au plus tard quand il reste 7 jours.
const REFRESH_BEFORE_S: u64 = 7 * 24 * 3600;

// ------------------------------------------------------------------ empreinte

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct Fingerprint {
    pub machine_guid: Option<String>,
    pub smbios_uuid: Option<String>,
    pub board_serial: Option<String>,
}

const JUNK: [&str; 14] = [
    "00000000-0000-0000-0000-000000000000",
    "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
    "03000200-0400-0500-0006-000700080009",
    "DEFAULT STRING",
    "TO BE FILLED BY O.E.M.",
    "NONE",
    "N/A",
    "NOT APPLICABLE",
    "NOT SPECIFIED",
    "SYSTEM SERIAL NUMBER",
    "BASE BOARD SERIAL NUMBER",
    "123456789",
    "0123456789",
    "",
];

fn is_junk(v: &str) -> bool {
    JUNK.contains(&v)
        || v.chars().all(|c| c == '0' || c == '.' || c == ' ')
        || v.chars().all(|c| c == 'F' || c == '.' || c == ' ')
}

fn sha256_hex(s: &str) -> String {
    Sha256::digest(s.as_bytes()).iter().map(|b| format!("{b:02x}")).collect()
}

pub fn fp_hash(name: &str, raw: &str) -> Option<String> {
    let v = raw.trim().to_uppercase();
    if is_junk(&v) {
        return None;
    }
    Some(sha256_hex(&format!("rago-fp-v1|{name}|{v}")))
}

/// Règle « même PC », identique au serveur : au moins 2 identifiants égaux,
/// ou tous ceux comparables s'il y en a moins de 2.
pub fn same_device(a: &Fingerprint, b: &Fingerprint) -> bool {
    let pairs = [
        (&a.machine_guid, &b.machine_guid),
        (&a.smbios_uuid, &b.smbios_uuid),
        (&a.board_serial, &b.board_serial),
    ];
    let (mut comparable, mut matches) = (0, 0);
    for (x, y) in pairs {
        if let (Some(x), Some(y)) = (x, y) {
            comparable += 1;
            matches += (x == y) as usize;
        }
    }
    comparable > 0 && matches >= comparable.min(2)
}

#[derive(Debug, Clone, Serialize)]
pub struct Device {
    pub name: String,
    pub os: String,
    pub app_version: String,
    pub fingerprint: Fingerprint,
}

impl Device {
    fn to_json(&self) -> Value {
        json!({
            "name": self.name,
            "os": self.os,
            "app_version": self.app_version,
            "fingerprint": {
                "v": 1,
                "machine_guid": self.fingerprint.machine_guid,
                "smbios_uuid": self.fingerprint.smbios_uuid,
                "board_serial": self.fingerprint.board_serial,
            },
        })
    }
}

const PROBE: &str = r#"$p = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue;
$b = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue;
$o = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue;
[pscustomobject]@{ uuid = "$($p.UUID)"; serial = "$($b.SerialNumber)"; os = "$($o.Caption) ($($o.BuildNumber))" } | ConvertTo-Json -Compress"#;

/// Lit les trois identifiants du PC. La vue 64 bits du registre est demandée explicitement.
pub fn probe_device() -> Device {
    let guid = shell::hidden("reg.exe")
        .args(["query", r"HKLM\SOFTWARE\Microsoft\Cryptography", "/v", "MachineGuid", "/reg:64"])
        .output()
        .ok()
        .and_then(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .find(|l| l.contains("MachineGuid"))
                .and_then(|l| l.split_whitespace().last().map(str::to_string))
        })
        .unwrap_or_default();
    let wmi: Value = shell::powershell(PROBE).and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Null);
    let get = |k: &str| wmi.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    let os = get("os").replace("Microsoft ", "");
    Device {
        name: std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows PC".into()),
        os: os.trim().chars().take(64).collect(),
        app_version: env!("CARGO_PKG_VERSION").into(),
        fingerprint: Fingerprint {
            machine_guid: fp_hash("machine_guid", &guid),
            smbios_uuid: fp_hash("smbios_uuid", &get("uuid")),
            board_serial: fp_hash("board_serial", &get("serial")),
        },
    }
}

// ------------------------------------------------------------------ jeton

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Claims {
    pub typ: String,
    #[serde(default)]
    pub iss: String,
    pub sub: String,
    pub email: String,
    pub plan: String,
    #[serde(default)]
    pub lic: String,
    #[serde(default)]
    pub did: String,
    #[serde(default)]
    pub tv: u32,
    pub fp: Fingerprint,
    pub iat: u64,
    pub exp: u64,
}

/// Accepte une clé PEM (SPKI), un DER SPKI ou la clé brute de 32 octets, en base64.
pub fn parse_public_key(text: &str) -> Option<VerifyingKey> {
    let b64: String = text.lines().filter(|l| !l.starts_with("-----")).collect::<String>();
    let der = STANDARD.decode(b64.trim()).ok()?;
    let raw: [u8; 32] = der.get(der.len().checked_sub(32)?..)?.try_into().ok()?;
    VerifyingKey::from_bytes(&raw).ok()
}

fn public_key() -> Option<VerifyingKey> {
    static KEY: OnceLock<Option<VerifyingKey>> = OnceLock::new();
    *KEY.get_or_init(|| PUBLIC_KEY.and_then(parse_public_key))
}

/// Vérifie la signature EdDSA et `typ == "license"`. L'expiration et l'appareil sont
/// contrôlés à part pour distinguer « à rafraîchir » de « copié depuis un autre PC ».
pub fn verify(token: &str, key: &VerifyingKey) -> Result<Claims, &'static str> {
    let mut parts = token.split('.');
    let (h, p, s) = match (parts.next(), parts.next(), parts.next(), parts.next()) {
        (Some(h), Some(p), Some(s), None) => (h, p, s),
        _ => return Err("format"),
    };
    let sig: [u8; 64] = URL_SAFE_NO_PAD.decode(s).map_err(|_| "signature")?.try_into().map_err(|_| "signature")?;
    key.verify(format!("{h}.{p}").as_bytes(), &Signature::from_bytes(&sig)).map_err(|_| "signature")?;
    let header: Value = serde_json::from_slice(&URL_SAFE_NO_PAD.decode(h).map_err(|_| "header")?).map_err(|_| "header")?;
    if header.get("alg").and_then(Value::as_str) != Some("EdDSA") {
        return Err("alg");
    }
    let claims: Claims = serde_json::from_slice(&URL_SAFE_NO_PAD.decode(p).map_err(|_| "payload")?).map_err(|_| "payload")?;
    if claims.typ != "license" {
        return Err("typ");
    }
    Ok(claims)
}

// ------------------------------------------------------------------ stockage

/// Le jeton est chiffré avec DPAPI (lié à la session Windows) dans %LOCALAPPDATA%\Rago.
pub(crate) mod vault {
    #[cfg(windows)]
    fn crypt(data: &[u8], protect: bool) -> Option<Vec<u8>> {
        use windows_sys::Win32::Foundation::{LocalFree, HLOCAL};
        use windows_sys::Win32::Security::Cryptography::{
            CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
        };
        let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
        let mut out = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
        let ok = unsafe {
            if protect {
                CryptProtectData(&input, std::ptr::null(), std::ptr::null(), std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
            } else {
                CryptUnprotectData(&input, std::ptr::null_mut(), std::ptr::null(), std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
            }
        };
        if ok == 0 {
            return None;
        }
        let bytes = unsafe { std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec() };
        unsafe { LocalFree(out.pbData as HLOCAL) };
        Some(bytes)
    }

    #[cfg(not(windows))]
    fn crypt(data: &[u8], _protect: bool) -> Option<Vec<u8>> {
        Some(data.to_vec())
    }

    pub fn seal(text: &str) -> Option<Vec<u8>> {
        crypt(text.as_bytes(), true)
    }

    pub fn open(bytes: &[u8]) -> Option<String> {
        crypt(bytes, false).and_then(|b| String::from_utf8(b).ok())
    }
}

// ------------------------------------------------------------------ API

/// Erreur renvoyée à l'interface : le code stable du contrat et, quand le serveur
/// en fournit un, son message anglais affichable tel quel.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    pub code: String,
    pub message: Option<String>,
    pub buy_url: Option<String>,
}

impl From<&str> for ApiError {
    fn from(code: &str) -> Self {
        ApiError { code: code.into(), message: None, buy_url: None }
    }
}

impl ApiError {
    /// Ces erreurs rendent le jeton local inutilisable : on l'efface.
    fn drops_token(&self) -> bool {
        matches!(self.code.as_str(), "invalid_token" | "bound_to_other_device" | "revoked")
    }

    /// Le serveur dit que la licence de ce PC n'est plus active : abonnement terminé (`reason: "subscription_ended"`),
    /// récompense d'affiliation finie, remboursement, litige, licence coupée par le support (licensing/src/app.js,
    /// `/licenses/refresh` : `license.status !== 'active'`). Les autres refus ne disent pas que Premium est fini :
    /// - `invalid_token` : jeton que le serveur ne vérifie plus (sa clé de signature a changé), PC libéré par le
    ///   support, jeton remplacé, compte supprimé : le joueur se reconnecte, sa licence peut être toujours payée ;
    /// - `bound_to_other_device` : licence active, liée à un PC qui ne ressemble plus à celui-ci (autre PC, ou carte
    ///   mère changée : le serveur ne sait pas les distinguer) ;
    /// - réseau, panne serveur, trop d'essais.
    fn ends_premium(&self) -> bool {
        self.code == "revoked"
    }
}

/// Remettre les réglages Premium de ce PC : seulement sans licence (`state == "none"`) ET après une vraie fin, notée sur
/// disque (déconnexion du joueur, ou licence arrêtée d'après le serveur). Un jeton effacé pour une autre raison (jeton
/// illisible, signature qui ne passe plus après un changement de clé, deux identifiants du PC changés, refus ambigu
/// du serveur) déconnecte seulement le joueur, comme en 1.1.9 : ses réglages restent.
pub fn premium_ended(state: &str, end_noted: bool) -> bool {
    state == "none" && end_noted
}

fn post(path: &str, bearer: Option<&str>, body: Value) -> Result<Value, ApiError> {
    let base = API_BASE.ok_or("unconfigured")?;
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(15)))
        .http_status_as_error(false)
        // TLS de Windows (schannel) : magasin de certificats du système
        .tls_config(ureq::tls::TlsConfig::builder().provider(ureq::tls::TlsProvider::NativeTls).build())
        .build()
        .into();
    let mut req = agent.post(format!("{}{path}", base.trim_end_matches('/')));
    if let Some(t) = bearer {
        req = req.header("Authorization", format!("Bearer {t}"));
    }
    let mut res = req.send_json(&body).map_err(|_| ApiError::from("network"))?;
    let status = res.status().as_u16();
    let json: Value = res.body_mut().read_json().unwrap_or(Value::Null);
    if (200..300).contains(&status) {
        return Ok(json);
    }
    let err = json.get("error");
    let s = |k: &str| err.and_then(|e| e.get(k)).and_then(Value::as_str).map(str::to_string);
    Err(ApiError {
        code: s("code").unwrap_or_else(|| if status == 429 { "rate_limited" } else { "server_error" }.into()),
        message: s("message"),
        buy_url: s("buy_url"),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    /// "active", "none", "expired", "unconfigured"
    pub state: &'static str,
    pub email: Option<String>,
    pub plan: Option<String>,
    pub key_hint: Option<String>,
    pub expires_at: Option<u64>,
    pub needs_refresh: bool,
    pub device_name: String,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum LoginResult {
    #[serde(rename_all = "camelCase")]
    ActivationRequired { email: String, key_hint: Option<String> },
    Active { status: Status },
}

pub struct License {
    path: PathBuf,
    device: OnceLock<Device>,
    probe: fn() -> Device,
    /// jeton d'accès de 15 minutes, gardé en mémoire entre login et activation
    access: Mutex<Option<String>>,
    key_hint: Mutex<Option<String>>,
}

fn field(v: &Value, path: &[&str]) -> Option<String> {
    let mut cur = v;
    for k in path {
        cur = cur.get(k)?;
    }
    cur.as_str().map(str::to_string)
}

impl License {
    pub fn new() -> Self {
        let dir = std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| std::env::temp_dir()).join("Rago");
        Self::with(dir.join("license.bin"), probe_device)
    }

    pub fn with(path: PathBuf, probe: fn() -> Device) -> Self {
        License { path, device: OnceLock::new(), probe, access: Mutex::new(None), key_hint: Mutex::new(None) }
    }

    /// Calculé au premier besoin : la sonde lance reg.exe et PowerShell.
    pub fn device(&self) -> &Device {
        self.device.get_or_init(self.probe)
    }

    fn token(&self) -> Option<String> {
        vault::open(&fs::read(&self.path).ok()?)
    }

    fn store(&self, token: &str) {
        if let (Some(dir), Some(bytes)) = (self.path.parent(), vault::seal(token)) {
            let _ = fs::create_dir_all(dir);
            let _ = fs::write(&self.path, bytes);
        }
        // le serveur vient de répondre « active » : une fin notée avant (déconnexion, licence arrêtée) ne vaut plus
        let _ = fs::remove_file(self.end_path());
    }

    fn clear(&self) {
        let _ = fs::remove_file(&self.path);
        let _ = fs::remove_file(self.key_path());
    }

    /// Fin de Premium sur ce PC, notée à côté du jeton : déconnexion du joueur ou licence arrêtée d'après le serveur.
    /// Gardée sur disque : une remise coupée (app fermée, PC éteint) reprend au lancement suivant. Retirée dès qu'une
    /// licence revient (`store`).
    fn end_path(&self) -> PathBuf {
        self.path.with_file_name("premium-ended")
    }

    fn note_end(&self, why: &str) {
        if let Some(dir) = self.path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        let _ = fs::write(self.end_path(), format!("{why} {}", now_ms()));
    }

    /// Les réglages Premium de ce PC doivent être remis (voir `premium_ended`).
    pub fn ended(&self) -> bool {
        premium_ended(self.status().state, self.end_path().exists())
    }
    /// Clé des scripts Premium de cette version, gardée chiffrée (DPAPI) à côté du jeton.
    fn key_path(&self) -> PathBuf {
        self.path.with_file_name("scripts.bin")
    }
    /// Clé des scripts Premium, seulement avec une licence active.
    pub fn scripts_key(&self) -> Option<[u8; 32]> {
        if self.status().state != "active" {
            return None;
        }
        let b64 = vault::open(&fs::read(self.key_path()).ok()?)?;
        STANDARD.decode(b64.trim()).ok()?.try_into().ok()
    }

    fn empty(&self, state: &'static str) -> Status {
        Status {
            state,
            email: None,
            plan: None,
            key_hint: None,
            expires_at: None,
            needs_refresh: false,
            device_name: self.device().name.clone(),
        }
    }

    /// Vérification hors ligne au démarrage, dans l'ordre du contrat.
    pub fn status(&self) -> Status {
        let Some(key) = public_key().filter(|_| API_BASE.is_some()) else {
            return self.empty("unconfigured");
        };
        let Some(token) = self.token() else { return self.empty("none") };
        let claims = match verify(&token, &key) {
            Ok(c) => c,
            Err(_) => {
                self.clear();
                return self.empty("none");
            }
        };
        if !same_device(&claims.fp, &self.device().fingerprint) {
            // jeton copié depuis un autre PC
            self.clear();
            return self.empty("none");
        }
        let now = now_ms() / 1000;
        let mut st = self.empty(if claims.exp > now { "active" } else { "expired" });
        st.needs_refresh = claims.exp.saturating_sub(now) < REFRESH_BEFORE_S;
        st.email = Some(claims.email);
        st.plan = Some(claims.plan);
        st.expires_at = Some(claims.exp * 1000);
        st.key_hint = self.key_hint.lock().unwrap().clone();
        st
    }

    /// Accepte une réponse `active` : vérifie le jeton reçu avant de le garder.
    fn accept(&self, res: &Value) -> Result<Status, ApiError> {
        let token = field(res, &["license_token"]).ok_or("server_error")?;
        let key = public_key().ok_or("unconfigured")?;
        let claims = verify(&token, &key).map_err(|_| ApiError::from("server_error"))?;
        if !same_device(&claims.fp, &self.device().fingerprint) {
            return Err("bound_to_other_device".into());
        }
        *self.key_hint.lock().unwrap() = field(res, &["license", "key_hint"]);
        self.store(&token);
        // remplacée à chaque réponse active ; absente (serveur sans SCRIPTS_SECRET) : plus de scripts Premium
        match field(res, &["scripts_key"]).and_then(|k| vault::seal(&k)) {
            Some(bytes) => {
                let _ = fs::write(self.key_path(), bytes);
            }
            None => {
                let _ = fs::remove_file(self.key_path());
            }
        }
        Ok(self.status())
    }

    pub fn login(&self, email: &str, password: &str) -> Result<LoginResult, ApiError> {
        let res = post("/auth/login", None, json!({ "email": email, "password": password, "device": self.device().to_json() }))?;
        if field(&res, &["status"]).as_deref() == Some("activation_required") {
            *self.access.lock().unwrap() = field(&res, &["access_token"]);
            let key_hint = field(&res, &["license", "key_hint"]);
            *self.key_hint.lock().unwrap() = key_hint.clone();
            let email = field(&res, &["account", "email"]).unwrap_or_else(|| email.to_string());
            return Ok(LoginResult::ActivationRequired { email, key_hint });
        }
        Ok(LoginResult::Active { status: self.accept(&res)? })
    }

    pub fn activate(&self) -> Result<Status, ApiError> {
        let access = self.access.lock().unwrap().clone().ok_or("invalid_token")?;
        let res = post("/licenses/activate", Some(&access), json!({ "device": self.device().to_json() }))?;
        *self.access.lock().unwrap() = None;
        self.accept(&res)
    }

    /// Prolonge le jeton, même expiré. Sans réseau ou en panne serveur, le jeton actuel est gardé.
    pub fn refresh(&self) -> Result<Status, ApiError> {
        let token = self.token().ok_or("invalid_token")?;
        match post("/licenses/refresh", None, json!({ "license_token": token, "device": self.device().to_json() })) {
            Ok(res) => self.accept(&res),
            Err(e) => {
                self.refused(&e);
                Err(e)
            }
        }
    }

    /// Refus du serveur au rafraîchissement du jeton de ce PC. Seule une licence arrêtée (`revoked`) note la fin de
    /// Premium ; les autres refus effacent le jeton sans toucher aux réglages.
    fn refused(&self, e: &ApiError) {
        if e.drops_token() {
            self.clear();
        }
        if e.ends_premium() {
            self.note_end("revoked");
        }
    }

    pub fn sign_out(&self) {
        self.clear();
        *self.access.lock().unwrap() = None;
        self.note_end("signed_out");
    }

    /// Jeton de licence de ce PC tant qu'il est valable : il ouvre aussi l'API du compte (avis, photo).
    pub(crate) fn bearer(&self) -> Option<String> {
        if self.status().state != "active" {
            return None;
        }
        self.token()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn fp(a: Option<&str>, b: Option<&str>, c: Option<&str>) -> Fingerprint {
        Fingerprint {
            machine_guid: a.map(Into::into),
            smbios_uuid: b.map(Into::into),
            board_serial: c.map(Into::into),
        }
    }

    fn token(key: &SigningKey, claims: &Claims) -> String {
        let h = URL_SAFE_NO_PAD.encode(br#"{"alg":"EdDSA","typ":"JWT","kid":"t"}"#);
        let p = URL_SAFE_NO_PAD.encode(serde_json::to_vec(claims).unwrap());
        let sig = key.sign(format!("{h}.{p}").as_bytes());
        format!("{h}.{p}.{}", URL_SAFE_NO_PAD.encode(sig.to_bytes()))
    }

    fn claims() -> Claims {
        Claims {
            typ: "license".into(),
            iss: "https://ragohub.com".into(),
            sub: "usr_1".into(),
            email: "a@b.c".into(),
            plan: "premium".into(),
            lic: "lic_1".into(),
            did: "dev_1".into(),
            tv: 1,
            fp: fp(Some("a"), Some("b"), None),
            iat: 1,
            exp: 4_000_000_000,
        }
    }

    #[test]
    fn hashes_follow_the_contract() {
        assert_eq!(
            fp_hash("machine_guid", " 9a1b-x "),
            Some(sha256_hex("rago-fp-v1|machine_guid|9A1B-X"))
        );
        for junk in ["", "  ", "To be filled by O.E.M.", "00000000-0000-0000-0000-000000000000", "0000", "FFFF", "...", "None"] {
            assert_eq!(fp_hash("board_serial", junk), None, "{junk:?}");
        }
        assert!(fp_hash("board_serial", "PF2ABCD").is_some());
    }

    #[test]
    fn same_device_rule() {
        // réinstallation de Windows : nouveau MachineGuid, carte mère inchangée
        assert!(same_device(&fp(Some("a"), Some("b"), Some("c")), &fp(Some("x"), Some("b"), Some("c"))));
        // autre PC
        assert!(!same_device(&fp(Some("a"), Some("b"), Some("c")), &fp(Some("a"), Some("y"), Some("z"))));
        // un seul identifiant comparable : il doit être égal
        assert!(same_device(&fp(Some("a"), None, None), &fp(Some("a"), Some("b"), None)));
        assert!(!same_device(&fp(Some("a"), None, None), &fp(Some("x"), Some("b"), None)));
        assert!(!same_device(&fp(None, None, None), &fp(None, None, None)));
    }

    #[test]
    fn verifies_signed_token() {
        let sk = SigningKey::from_bytes(&[7u8; 32]);
        assert_eq!(verify(&token(&sk, &claims()), &sk.verifying_key()).unwrap(), claims());
        let mut other = claims();
        other.typ = "access".into();
        assert_eq!(verify(&token(&sk, &other), &sk.verifying_key()), Err("typ"));
    }

    #[test]
    fn rejects_tampered_or_foreign_tokens() {
        let sk = SigningKey::from_bytes(&[7u8; 32]);
        let t = token(&sk, &claims());
        assert!(verify(&t, &SigningKey::from_bytes(&[8u8; 32]).verifying_key()).is_err());
        let mut forged = claims();
        forged.plan = "lifetime".into();
        let parts: Vec<&str> = t.split('.').collect();
        let fake = format!("{}.{}.{}", parts[0], URL_SAFE_NO_PAD.encode(serde_json::to_vec(&forged).unwrap()), parts[2]);
        assert!(verify(&fake, &sk.verifying_key()).is_err());
        assert!(verify("a.b", &sk.verifying_key()).is_err());
    }

    fn test_device() -> Device {
        Device { name: "PC-TEST".into(), os: String::new(), app_version: "1.0.0".into(), fingerprint: fp(Some("a"), Some("b"), None) }
    }

    fn test_license(name: &str) -> (License, PathBuf) {
        let dir = std::env::temp_dir().join(format!("rago-lic-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        (License::with(dir.join("license.bin"), test_device), dir)
    }

    /// N1 : les réglages Premium ne sont remis qu'après une vraie fin (déconnexion, licence arrêtée d'après le serveur),
    /// jamais parce que le jeton a été effacé sur un doute.
    #[test]
    fn premium_ends_only_on_sign_out_or_revocation() {
        assert!(premium_ended("none", true));
        assert!(!premium_ended("none", false), "jeton effacé sans fin notée : le joueur est seulement déconnecté");
        for state in ["active", "expired", "unconfigured"] {
            assert!(!premium_ended(state, true), "{state}");
        }

        // refus du serveur au rafraîchissement : seule une licence arrêtée note la fin
        let (lic, dir) = test_license("refused");
        for code in ["network", "server_error", "rate_limited", "invalid_request", "unconfigured", "invalid_token", "bound_to_other_device", "revoked"] {
            fs::write(&lic.path, b"jeton").unwrap();
            let _ = fs::remove_file(lic.end_path());
            let e = ApiError::from(code);
            lic.refused(&e);
            assert_eq!(lic.end_path().exists(), code == "revoked", "{code}");
            assert_eq!(!lic.path.exists(), e.drops_token(), "{code} : jeton effacé seulement s'il ne vaut plus rien");
        }
        // abonnement terminé : même code, avec une raison en plus
        let ended = ApiError { code: "revoked".into(), message: None, buy_url: Some("https://x/#pricing".into()) };
        let _ = fs::remove_file(lic.end_path());
        lic.refused(&ended);
        assert!(lic.end_path().exists());

        // une licence revient (réponse « active » gardée) : la fin ne vaut plus
        lic.store("jeton");
        assert!(!lic.end_path().exists());

        // déconnexion du joueur
        lic.sign_out();
        assert!(lic.end_path().exists() && !lic.path.exists());
        let _ = fs::remove_dir_all(dir);
    }

    /// Jeton effacé par la vérification hors ligne (illisible, signature qui ne passe plus après un changement de clé du
    /// serveur, jeton d'un autre PC) : aucune fin notée, aucun réglage remis.
    #[test]
    fn a_dropped_token_is_not_the_end_of_premium() {
        let (lic, dir) = test_license("dropped");
        assert!(!lic.ended(), "jamais connecté");
        fs::write(&lic.path, b"pas un jeton").unwrap();
        assert_ne!(lic.status().state, "active");
        assert!(!lic.end_path().exists() && !lic.ended());
        let other_key = SigningKey::from_bytes(&[9u8; 32]);
        lic.store(&token(&other_key, &claims()));
        assert_ne!(lic.status().state, "active");
        assert!(!lic.end_path().exists() && !lic.ended(), "signature d'une autre clé");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn parses_test_public_key() {
        assert!(parse_public_key(include_str!("../keys/test-public-key.pem")).is_some());
        assert!(parse_public_key("nope").is_none());
    }

    /// Parcours complet contre le serveur local du contrat (voir licensing/docs/API.md) :
    /// `cargo test live_flow -- --ignored` une fois `npm start` lancé avec la clé de test.
    #[test]
    #[ignore]
    fn live_flow() {
        fn device(name: &str, guid: &str, uuid: &str, serial: Option<&str>) -> Device {
            Device {
                name: name.into(),
                os: "Windows 11 Pro (26100)".into(),
                app_version: "1.0.0".into(),
                fingerprint: Fingerprint {
                    machine_guid: fp_hash("machine_guid", guid),
                    smbios_uuid: fp_hash("smbios_uuid", uuid),
                    board_serial: serial.and_then(|s| fp_hash("board_serial", s)),
                },
            }
        }
        let dir = std::env::temp_dir().join(format!("rago-live-{}", std::process::id()));
        let a = License::with(dir.join("a.bin"), || device("PC-A", "guid-a", "uuid-a", Some("serial-a")));
        assert_eq!(a.login("test@rago.dev", "wrong").unwrap_err().code, "invalid_credentials");
        assert!(matches!(a.login("test@rago.dev", "password123").unwrap(), LoginResult::ActivationRequired { .. }));
        assert_eq!(a.activate().unwrap().state, "active");
        assert_eq!(a.refresh().unwrap().state, "active");
        // même PC après réinstallation de Windows : connexion directe, sans nouvelle activation
        let a2 = License::with(dir.join("a2.bin"), || device("PC-A", "guid-new", "uuid-a", Some("serial-a")));
        assert!(matches!(a2.login("test@rago.dev", "password123").unwrap(), LoginResult::Active { .. }));
        // un autre PC est refusé, et un jeton copié depuis PC-A n'y vaut rien
        let b = License::with(dir.join("b.bin"), || device("PC-B", "guid-b", "uuid-b", None));
        assert_eq!(b.login("test@rago.dev", "password123").unwrap_err().code, "bound_to_other_device");
        std::fs::copy(dir.join("a.bin"), dir.join("b.bin")).unwrap();
        assert_eq!(b.status().state, "none");
    }
}
