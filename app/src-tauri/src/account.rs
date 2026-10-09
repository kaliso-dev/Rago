//! Compte Rago dans l'app : nom public, photo de profil et avis affiché sur le site
//! (licensing/docs/API.md, « Avis et photo de profil »). Avec Premium, le jeton de licence du PC suffit ;
//! un compte gratuit se connecte une fois et garde un jeton de compte, chiffré (DPAPI) comme celui de la licence.

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use crate::license::{vault, ApiError, License, API_BASE};

/// Les photos du serveur font quelques Ko (256 × 256 en WebP).
const MAX_PHOTO: u64 = 1024 * 1024;
/// Image envoyée par l'interface, déjà réduite : le serveur refuse au-delà de 5 Mo.
const MAX_UPLOAD: usize = 5 * 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub email: String,
    pub name: Option<String>,
    /// photo prête à afficher (data:image/webp;base64,…) : l'interface n'a pas accès au réseau
    pub photo: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    pub rating: u8,
    pub comment: String,
    pub updated_at: String,
    /// masqué du site par l'équipe
    pub hidden: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountState {
    /// "license" (jeton de licence du PC), "account" (jeton de compte), absent : pas connecté
    pub via: Option<&'static str>,
    pub profile: Option<Profile>,
    pub review: Option<Review>,
}

const SIGNED_OUT: AccountState = AccountState { via: None, profile: None, review: None };

enum Body<'a> {
    Empty,
    Json(Value),
    Bytes(&'a [u8]),
}

fn agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(20)))
        .http_status_as_error(false)
        // TLS de Windows (schannel) : magasin de certificats du système
        .tls_config(ureq::tls::TlsConfig::builder().provider(ureq::tls::TlsProvider::NativeTls).build())
        .build()
        .into()
}

/// `https://hote[:port]` de RAGO_API_BASE.
fn origin(base: &str) -> &str {
    let start = base.find("://").map_or(0, |i| i + 3);
    base[start..].find('/').map_or(base, |i| &base[..start + i])
}

/// Nom du fichier d'une photo du serveur (`…/avatars/<20 à 40 caractères>.webp`), sinon None.
fn photo_file(url: &str) -> Option<&str> {
    let file = url.rsplit_once("/avatars/")?.1;
    let id = file.strip_suffix(".webp")?;
    let ok = (20..=40).contains(&id.len()) && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-');
    ok.then_some(file)
}

fn call(method: &str, path: &str, bearer: Option<&str>, body: Body) -> Result<Value, ApiError> {
    let url = format!("{}{path}", API_BASE.ok_or("unconfigured")?.trim_end_matches('/'));
    let agent = agent();
    let auth = bearer.map(|t| format!("Bearer {t}"));
    let sent = match method {
        "GET" | "DELETE" => {
            let mut req = if method == "GET" { agent.get(&url) } else { agent.delete(&url) };
            if let Some(a) = &auth {
                req = req.header("Authorization", a.as_str());
            }
            req.call()
        }
        _ => {
            let mut req = if method == "PUT" { agent.put(&url) } else { agent.post(&url) };
            if let Some(a) = &auth {
                req = req.header("Authorization", a.as_str());
            }
            match body {
                Body::Json(v) => req.send_json(&v),
                Body::Bytes(b) => req.header("Content-Type", "application/octet-stream").send(b),
                Body::Empty => req.send_empty(),
            }
        }
    };
    let mut res = sent.map_err(|_| ApiError::from("network"))?;
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
        buy_url: None,
    })
}

pub struct Account {
    path: PathBuf,
    /// dernière photo téléchargée : (nom du fichier, data URL)
    photo: Mutex<Option<(String, String)>>,
}

impl Account {
    pub fn new() -> Self {
        let dir = std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| std::env::temp_dir()).join("Rago");
        Account { path: dir.join("account.bin"), photo: Mutex::new(None) }
    }

    fn token(&self) -> Option<String> {
        vault::open(&fs::read(&self.path).ok()?)
    }

    fn store(&self, token: &str) {
        if let (Some(dir), Some(bytes)) = (self.path.parent(), vault::seal(token)) {
            let _ = fs::create_dir_all(dir);
            let _ = fs::write(&self.path, bytes);
        }
    }

    fn clear(&self) {
        let _ = fs::remove_file(&self.path);
        *self.photo.lock().unwrap() = None;
    }

    /// Le jeton de licence du PC (Premium) d'abord, sinon le jeton de compte.
    fn bearer(&self, lic: &License) -> Option<(String, &'static str)> {
        lic.bearer().map(|t| (t, "license")).or_else(|| self.token().map(|t| (t, "account")))
    }

    /// Photo du compte, téléchargée depuis le serveur de comptes (et gardée tant qu'elle ne change pas).
    fn photo(&self, url: Option<&str>) -> Option<String> {
        let file = photo_file(url?)?;
        if let Some((f, data)) = &*self.photo.lock().unwrap() {
            if f == file {
                return Some(data.clone());
            }
        }
        // toujours sur le serveur de l'app, quelle que soit l'adresse publique du serveur
        let mut res = agent().get(&format!("{}/avatars/{file}", origin(API_BASE?))).call().ok()?;
        if res.status().as_u16() != 200 {
            return None;
        }
        let bytes = res.body_mut().with_config().limit(MAX_PHOTO).read_to_vec().ok()?;
        let data = format!("data:image/webp;base64,{}", STANDARD.encode(&bytes));
        *self.photo.lock().unwrap() = Some((file.to_string(), data.clone()));
        Some(data)
    }

    fn state(&self, via: &'static str, res: &Value) -> AccountState {
        let acc = res.get("account");
        let s = |v: Option<&Value>, k: &str| v.and_then(|x| x.get(k)).and_then(Value::as_str).map(str::to_string);
        let profile = acc.map(|_| Profile {
            email: s(acc, "email").unwrap_or_default(),
            name: s(acc, "name"),
            photo: self.photo(acc.and_then(|a| a.get("avatar_url")).and_then(Value::as_str)),
        });
        let review = res.get("review").filter(|r| r.is_object()).map(|r| Review {
            rating: r.get("rating").and_then(Value::as_u64).unwrap_or(0).min(5) as u8,
            comment: s(Some(r), "comment").unwrap_or_default(),
            updated_at: s(Some(r), "updated_at").unwrap_or_default(),
            hidden: r.get("hidden").and_then(Value::as_bool).unwrap_or(false),
        });
        AccountState { via: Some(via), profile, review }
    }

    /// Le compte, son avis et sa photo. Pas connecté, ou jeton de compte expiré : `via` absent.
    pub fn me(&self, lic: &License) -> Result<AccountState, ApiError> {
        let Some((token, via)) = self.bearer(lic) else { return Ok(SIGNED_OUT) };
        match call("GET", "/account/me", Some(&token), Body::Empty) {
            Ok(res) => Ok(self.state(via, &res)),
            Err(e) if e.code == "invalid_token" => {
                if via == "account" {
                    self.clear();
                }
                Ok(SIGNED_OUT)
            }
            Err(e) => Err(e),
        }
    }

    pub fn login(&self, email: &str, password: &str) -> Result<AccountState, ApiError> {
        let res = call("POST", "/account/login", None, Body::Json(json!({ "email": email, "password": password })))?;
        let token = res.get("account_token").and_then(Value::as_str).ok_or("server_error")?;
        self.store(token);
        Ok(self.state("account", &res))
    }

    /// Oublie le jeton de compte (le jeton de licence, lui, reste : il se retire depuis la licence).
    pub fn sign_out(&self) {
        if let Some(t) = self.token() {
            let _ = call("POST", "/account/logout", Some(&t), Body::Empty);
        }
        self.clear();
    }

    fn send(&self, lic: &License, method: &str, path: &str, body: Body) -> Result<AccountState, ApiError> {
        let (token, via) = self.bearer(lic).ok_or("invalid_token")?;
        match call(method, path, Some(&token), body) {
            Ok(res) => Ok(self.state(via, &res)),
            Err(e) => {
                if e.code == "invalid_token" && via == "account" {
                    self.clear();
                }
                Err(e)
            }
        }
    }

    /// Crée l'avis du compte ou le remplace (un seul par compte). Le serveur vérifie tout.
    pub fn save_review(&self, lic: &License, rating: u8, comment: &str, name: Option<&str>) -> Result<AccountState, ApiError> {
        let body = json!({ "rating": rating, "comment": comment, "name": name, "app_version": env!("CARGO_PKG_VERSION") });
        self.send(lic, "PUT", "/account/review", Body::Json(body))
    }

    pub fn set_name(&self, lic: &License, name: &str) -> Result<AccountState, ApiError> {
        self.send(lic, "PUT", "/account/name", Body::Json(json!({ "name": name })))
    }

    /// `data` : l'image en base64 (JPG, PNG, WebP ou GIF). Le serveur la recadre en 256 × 256.
    pub fn set_photo(&self, lic: &License, data: &str) -> Result<AccountState, ApiError> {
        let bytes = STANDARD.decode(data.trim()).map_err(|_| ApiError::from("invalid_image"))?;
        if bytes.len() > MAX_UPLOAD {
            return Err("image_too_large".into());
        }
        self.send(lic, "PUT", "/account/avatar", Body::Bytes(&bytes))
    }

    pub fn remove_photo(&self, lic: &License) -> Result<AccountState, ApiError> {
        self.send(lic, "DELETE", "/account/avatar", Body::Empty)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn origin_of_api_base() {
        assert_eq!(origin("https://account.rago-optimizer.com/api/v1"), "https://account.rago-optimizer.com");
        assert_eq!(origin("http://localhost:8787/api/v1"), "http://localhost:8787");
        assert_eq!(origin("https://x.app"), "https://x.app");
    }

    #[test]
    fn only_server_photos() {
        assert_eq!(photo_file("https://account.rago-optimizer.com/avatars/NTG9lLKZoQx3mU8l-pVjQ1hD.webp"), Some("NTG9lLKZoQx3mU8l-pVjQ1hD.webp"));
        for bad in [
            "https://x/avatars/short.webp",
            "https://x/avatars/NTG9lLKZoQx3mU8l-pVjQ1hD.png",
            "https://x/avatars/../NTG9lLKZoQx3mU8l-pVjQ1hD.webp",
            "https://x/avatars/NTG9lLKZoQx3mU8l pVjQ1hD.webp",
            "https://x/other/NTG9lLKZoQx3mU8l-pVjQ1hD.webp",
        ] {
            assert_eq!(photo_file(bad), None, "{bad}");
        }
    }

    #[test]
    fn reads_the_server_reply() {
        let acc = Account { path: std::env::temp_dir().join("rago-account-test.bin"), photo: Mutex::new(None) };
        let st = acc.state(
            "account",
            &json!({ "account": { "email": "a@b.c", "name": "Sam", "avatar_url": null },
                     "review": { "rating": 4, "comment": "Nice", "updated_at": "2026-10-09T10:00:00.000Z", "hidden": false } }),
        );
        let p = st.profile.unwrap();
        assert_eq!((p.email.as_str(), p.name.as_deref(), p.photo), ("a@b.c", Some("Sam"), None));
        let r = st.review.unwrap();
        assert_eq!((r.rating, r.comment.as_str(), r.hidden), (4, "Nice", false));
        assert!(acc.state("account", &json!({ "account": { "email": "a@b.c" }, "review": null })).review.is_none());
    }
}
