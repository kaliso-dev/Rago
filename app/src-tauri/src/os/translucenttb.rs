//! Barre des tâches entièrement transparente, en option : par TranslucentTB (logiciel libre, GPLv3, installé par le
//! joueur depuis le Microsoft Store, jamais livré avec l'app). Rago OS n'en fait que régler les couleurs, dans son
//! fichier settings.json : le fichier d'avant est gardé et revient à la désactivation (absent : il est supprimé).
//! Rien n'est injecté par Rago Optimizer, et TranslucentTB n'agit que sur l'Explorateur, jamais sur les jeux.

use serde::{Deserialize, Serialize};

/// Page du Store de TranslucentTB.
pub const STORE: &str = "ms-windows-store://pdp/?productid=9PF4KZ2VN4W9";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Saved {
    pub path: String,
    /// contenu d'avant ; None : pas de fichier
    pub before: Option<String>,
}

/// Réglages de Rago OS fusionnés dans ceux du joueur (schéma settings.schema.json de TranslucentTB) : transparente sur
/// le bureau, acrylique sombre quand une fenêtre est agrandie (texte lisible), apparence de Windows quand Démarrer, la
/// recherche ou la vue des tâches sont ouverts, opaque en économiseur de batterie. Le reste (fenêtres ignorées, langue,
/// icône de notification…) est gardé tel quel.
pub fn settings(existing: Option<&str>) -> String {
    let mut v: serde_json::Value = existing
        .and_then(|s| serde_json::from_str(s.trim_start_matches('\u{feff}')).ok())
        .filter(serde_json::Value::is_object)
        .unwrap_or_else(|| serde_json::json!({}));
    let o = v.as_object_mut().expect("objet");
    o.insert(
        "desktop_appearance".into(),
        serde_json::json!({ "accent": "clear", "color": "#00000000", "show_peek": true, "show_line": false }),
    );
    o.insert("visible_window_appearance".into(), serde_json::json!({ "enabled": false, "accent": "clear", "color": "#00000000" }));
    o.insert(
        "maximized_window_appearance".into(),
        serde_json::json!({ "enabled": true, "accent": "acrylic", "color": "#0A0A0BCC", "show_peek": true, "show_line": false }),
    );
    for key in ["start_opened_appearance", "search_opened_appearance", "task_view_opened_appearance"] {
        o.insert(key.into(), serde_json::json!({ "enabled": true, "accent": "normal", "color": "#00000000" }));
    }
    o.insert("battery_saver_appearance".into(), serde_json::json!({ "enabled": true, "accent": "opaque", "color": "#0A0A0BFF" }));
    serde_json::to_string_pretty(&v).expect("json")
}

/// Paquet installé : famille (dossier sous %LOCALAPPDATA%\Packages) et identifiant de l'appli dans le paquet.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Package {
    pub family: String,
    pub app: String,
}

impl Package {
    /// Lancement par l'Explorateur, dans la session du joueur, sans élévation.
    pub fn aumid(&self) -> String {
        format!("{}!{}", self.family, self.app)
    }
}

/// settings.json du paquet : RoamingState s'il y est déjà, sinon LocalState s'il y est, sinon RoamingState (dossier
/// d'ApplicationData utilisé par la version du Store).
pub fn settings_path(local_appdata: &std::path::Path, family: &str) -> std::path::PathBuf {
    let base = local_appdata.join("Packages").join(family);
    let roaming = base.join("RoamingState").join("settings.json");
    let local = base.join("LocalState").join("settings.json");
    if !roaming.exists() && local.exists() {
        local
    } else {
        roaming
    }
}

#[cfg(windows)]
pub fn find() -> Option<Package> {
    let out = crate::shell::powershell(
        "$p = Get-AppxPackage -Name '*TranslucentTB*' | Select-Object -First 1; if ($p) { $id = ((Get-AppxPackageManifest $p).Package.Applications.Application | Select-Object -First 1).Id; \"$($p.PackageFamilyName)|$id\" }",
    )?;
    let (family, app) = out.lines().last()?.trim().split_once('|')?;
    (!family.is_empty() && !app.is_empty()).then(|| Package { family: family.into(), app: app.into() })
}

#[cfg(not(windows))]
pub fn find() -> Option<Package> {
    None
}

pub fn running() -> bool {
    #[cfg(windows)]
    {
        crate::shell::hidden("tasklist.exe")
            .args(["/FI", "IMAGENAME eq TranslucentTB.exe", "/NH"])
            .output()
            .is_ok_and(|o| String::from_utf8_lossy(&o.stdout).to_lowercase().contains("translucenttb.exe"))
    }
    #[cfg(not(windows))]
    false
}

/// Relance TranslucentTB pour qu'il relise ses réglages (arrêté, puis rouvert dans la session du joueur).
pub fn restart(pkg: &Package) {
    let _ = crate::shell::hidden("taskkill.exe").args(["/IM", "TranslucentTB.exe", "/F"]).output();
    std::thread::sleep(std::time::Duration::from_millis(600));
    let _ = crate::games::launch::unelevated(std::path::Path::new("explorer.exe"), &[format!("shell:AppsFolder\\{}", pkg.aumid())], None);
}

/// Pose les couleurs de Rago OS. Renvoie l'état d'avant.
pub fn apply(pkg: &Package) -> Result<Saved, String> {
    let local = std::env::var("LOCALAPPDATA").map_err(|e| e.to_string())?;
    let path = settings_path(std::path::Path::new(&local), &pkg.family);
    let before = std::fs::read_to_string(&path).ok();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, settings(before.as_deref())).map_err(|e| e.to_string())?;
    restart(pkg);
    Ok(Saved { path: path.to_string_lossy().into_owned(), before })
}

/// Remet le fichier d'avant (ou le retire) et relance TranslucentTB s'il tourne. Paquet désinstallé entre-temps :
/// le dossier n'existe plus, rien à remettre.
pub fn revert(saved: &Saved, pkg: Option<&Package>) -> Result<(), String> {
    let path = std::path::Path::new(&saved.path);
    if path.parent().is_some_and(|d| d.exists()) {
        match &saved.before {
            Some(text) => std::fs::write(path, text).map_err(|e| e.to_string())?,
            None => {
                let _ = std::fs::remove_file(path);
            }
        }
    }
    if let Some(pkg) = pkg {
        if running() {
            restart(pkg);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rago_colors_keep_the_players_other_settings() {
        let mine = r#"{"hide_tray": true, "language": "fr-FR", "ignored_windows": {"process_name": ["obs64.exe"]}, "desktop_appearance": {"accent": "blur"}}"#;
        let v: serde_json::Value = serde_json::from_str(&settings(Some(mine))).unwrap();
        assert_eq!(v["hide_tray"], true);
        assert_eq!(v["language"], "fr-FR");
        assert_eq!(v["ignored_windows"]["process_name"][0], "obs64.exe");
        assert_eq!(v["desktop_appearance"]["accent"], "clear");
        assert_eq!(v["maximized_window_appearance"]["accent"], "acrylic");
        // couleurs au format #RRGGBBAA du schéma
        let re = |s: &str| s.len() == 9 && s.starts_with('#') && s[1..].chars().all(|c| c.is_ascii_hexdigit());
        for k in ["desktop_appearance", "maximized_window_appearance", "battery_saver_appearance"] {
            assert!(re(v[k]["color"].as_str().unwrap()), "{k}");
        }
    }

    #[test]
    fn unreadable_or_missing_settings_start_fresh() {
        for s in [None, Some("not json"), Some("[1,2]"), Some("\u{feff}{}")] {
            let v: serde_json::Value = serde_json::from_str(&settings(s)).unwrap();
            assert_eq!(v["desktop_appearance"]["accent"], "clear");
        }
    }

    #[test]
    fn settings_file_is_found_where_it_already_is() {
        let dir = std::env::temp_dir().join(format!("rago-ttb-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let fam = "28017CharlesMilette.TranslucentTB_v826wp6bftszj";
        assert!(settings_path(&dir, fam).ends_with("RoamingState/settings.json") || settings_path(&dir, fam).ends_with("RoamingState\\settings.json"));
        let local = dir.join("Packages").join(fam).join("LocalState");
        std::fs::create_dir_all(&local).unwrap();
        std::fs::write(local.join("settings.json"), "{}").unwrap();
        assert_eq!(settings_path(&dir, fam), local.join("settings.json"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
