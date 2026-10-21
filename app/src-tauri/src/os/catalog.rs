//! Catalogue de Rago OS (src/data/os.json, généré par tools/build_os_catalog.py), embarqué dans l'exe. L'interface lit le
//! même fichier pour les textes ; le moteur ne prend que les actions et leurs conditions.

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

/// Catégories et profils sont lus par l'interface ; le moteur ne les vérifie que dans les tests.
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(not(test), allow(dead_code))]
pub struct Catalog {
    pub version: u32,
    pub categories: Vec<Category>,
    pub profiles: Vec<Profile>,
    pub features: Vec<Feature>,
    pub tweaks: Vec<Tweak>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(not(test), allow(dead_code))]
pub struct Category {
    pub id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(not(test), allow(dead_code))]
pub struct Profile {
    pub id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Feature {
    pub id: String,
    pub default: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Reboot {
    None,
    /// l'Explorateur relit le réglage quand il redémarre (fait à la fin de l'activation)
    Explorer,
    /// le réglage ne prend effet qu'après un redémarrage du PC
    Restart,
}

/// Ce qu'il faut prévenir après l'écriture pour que Windows relise la valeur sans redémarrage.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Refresh {
    /// thème et couleurs (WM_SETTINGCHANGE « ImmersiveColorSet »)
    Immersive,
    /// accélération de la souris (SPI_SETMOUSE)
    Mouse,
    /// touches rémanentes, filtres (SPI_SETSTICKYKEYS…)
    Accessibility,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(not(test), allow(dead_code))]
pub struct Tweak {
    pub id: String,
    pub category: String,
    /// profils qui le cochent ; vide : seulement en mode avancé
    pub profiles: Vec<String>,
    pub reboot: Reboot,
    #[serde(default)]
    pub refresh: Vec<Refresh>,
    /// première build de Windows où il existe (Recall : 26100)
    #[serde(default)]
    pub min_build: Option<u32>,
    pub actions: Vec<Action>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(tag = "do", rename_all = "lowercase")]
pub enum Action {
    Reg {
        key: String,
        name: String,
        #[serde(rename = "type")]
        kind: RegKind,
        value: serde_json::Value,
    },
    Task {
        path: String,
        enabled: bool,
    },
    Service {
        name: String,
        start: Start,
    },
    Appx {
        name: String,
    },
    Native {
        what: Native,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RegKind {
    Dword,
    Sz,
    Binary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Start {
    Disabled,
    Manual,
}

impl Start {
    /// Valeur Start du service dans le registre.
    pub fn value(self) -> u32 {
        match self {
            Start::Disabled => 4,
            Start::Manual => 3,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Native {
    Wallpaper,
    Lockscreen,
    Theme,
    Powerplan,
}

/// Types de valeurs du registre (winnt.h).
pub const REG_SZ: u32 = 1;
pub const REG_BINARY: u32 = 3;
pub const REG_DWORD: u32 = 4;

impl Action {
    /// Type et octets de la valeur de registre à écrire, comme RegSetValueExW les attend.
    pub fn reg_bytes(&self) -> Option<(u32, Vec<u8>)> {
        let Action::Reg { kind, value, .. } = self else { return None };
        Some(match kind {
            RegKind::Dword => (REG_DWORD, (value.as_u64()? as u32).to_le_bytes().to_vec()),
            RegKind::Sz => {
                let mut b: Vec<u8> = value.as_str()?.encode_utf16().chain(std::iter::once(0)).flat_map(u16::to_le_bytes).collect();
                b.shrink_to_fit();
                (REG_SZ, b)
            }
            RegKind::Binary => (REG_BINARY, crate::backup::unhex(value.as_str()?)),
        })
    }
}

const SOURCE: &str = include_str!("../../../src/data/os.json");

pub fn get() -> &'static Catalog {
    static CATALOG: OnceLock<Catalog> = OnceLock::new();
    CATALOG.get_or_init(|| serde_json::from_str(SOURCE).expect("src/data/os.json illisible : relancer tools/build_os_catalog.py"))
}

impl Catalog {
    pub fn tweak(&self, id: &str) -> Option<&Tweak> {
        self.tweaks.iter().find(|t| t.id == id)
    }

    /// Réglages cochés par un profil sur cette build, dans l'ordre du catalogue (l'interface fait le même calcul).
    #[cfg(test)]
    pub fn profile(&self, profile: &str, build: u32) -> Vec<String> {
        self.tweaks
            .iter()
            .filter(|t| t.profiles.iter().any(|p| p == profile) && t.runs_on(build))
            .map(|t| t.id.clone())
            .collect()
    }

    pub fn feature_default(&self, id: &str) -> bool {
        self.features.iter().any(|f| f.id == id && f.default)
    }
}

impl Tweak {
    pub fn runs_on(&self, build: u32) -> bool {
        // build inconnue (0) : on ne retire rien
        build == 0 || self.min_build.map_or(true, |m| build >= m)
    }

    pub fn natives(&self) -> impl Iterator<Item = Native> + '_ {
        self.actions.iter().filter_map(|a| match a {
            Action::Native { what } => Some(*what),
            _ => None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn catalog_is_complete_and_consistent() {
        let c = get();
        assert_eq!(c.version, 1);
        let cats: HashSet<&str> = c.categories.iter().map(|x| x.id.as_str()).collect();
        let profiles: HashSet<&str> = c.profiles.iter().map(|x| x.id.as_str()).collect();
        let mut ids = HashSet::new();
        for t in &c.tweaks {
            assert!(ids.insert(t.id.as_str()), "{} en double", t.id);
            assert!(cats.contains(t.category.as_str()), "{} : catégorie {}", t.id, t.category);
            assert!(t.profiles.iter().all(|p| profiles.contains(p.as_str())), "{} : profil inconnu", t.id);
            assert!(!t.actions.is_empty(), "{} sans action", t.id);
            for a in &t.actions {
                if let Action::Reg { key, .. } = a {
                    assert!(crate::backup::normalize_key(key).as_deref() == Some(key.as_str()), "{} : clé {key}", t.id);
                    assert!(a.reg_bytes().is_some(), "{} : valeur illisible", t.id);
                }
            }
        }
        for p in ["competitive", "balanced", "streaming", "minimal"] {
            assert!(c.profile(p, 26100).len() > 30, "profil {p} presque vide");
        }
    }

    #[test]
    fn security_is_never_touched() {
        // principe 4 : Defender, SmartScreen, Windows Update, pare-feu, VBS/HVCI restent tels quels
        let banned = ["defender", "smartscreen", "windowsupdate", "wuauserv", "mpssvc", "deviceguard", "hypervisorenforced", "securityhealth", "windefend", "bits"];
        for t in &get().tweaks {
            for a in &t.actions {
                let text = serde_json::to_string(a).unwrap().to_lowercase().replace(['\\', ' '], "");
                for b in banned {
                    assert!(!text.contains(b), "{} touche {b}", t.id);
                }
            }
        }
    }

    #[test]
    fn values_become_registry_bytes() {
        let dword = Action::Reg { key: "HKCU\\X".into(), name: "A".into(), kind: RegKind::Dword, value: 4281351167u64.into() };
        assert_eq!(dword.reg_bytes(), Some((REG_DWORD, 4281351167u32.to_le_bytes().to_vec())));
        let sz = Action::Reg { key: "HKCU\\X".into(), name: "A".into(), kind: RegKind::Sz, value: "0".into() };
        assert_eq!(sz.reg_bytes(), Some((REG_SZ, vec![b'0', 0, 0, 0])));
        let bin = Action::Reg { key: "HKCU\\X".into(), name: "A".into(), kind: RegKind::Binary, value: "ff00".into() };
        assert_eq!(bin.reg_bytes(), Some((REG_BINARY, vec![0xff, 0])));
    }

    #[test]
    fn recall_only_from_24h2() {
        let c = get();
        assert!(!c.profile("balanced", 22631).contains(&"ai.recall".to_string()));
        assert!(c.profile("balanced", 26100).contains(&"ai.recall".to_string()));
    }
}
