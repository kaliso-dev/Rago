//! Mode arrière-plan (RAG-82) : à la fermeture, Rago Optimizer peut rester près de l'horloge Windows au lieu de
//! quitter, et se lancer avec Windows (caché, près de l'horloge). La barre en jeu (overlay.rs) et ce que l'app fait
//! pendant une partie (session.rs) lisent leurs réglages ici.
//! Réglages gardés dans background.json, dans le dossier de données de l'app.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime};

/// Argument du lancement avec Windows : la fenêtre reste cachée.
pub const BACKGROUND_ARG: &str = "--background";
/// Alt+X depuis la 1.2.0 : avec Ctrl+Shift+R, Échap tapé avant de lâcher Ctrl et Shift ouvrait le Gestionnaire des
/// tâches (Ctrl+Shift+Échap) au lieu de fermer la barre.
pub const DEFAULT_SHORTCUT: &str = "Alt+X";
/// Raccourci par défaut avant la 1.2.0, remplacé au chargement par le nouveau.
const OLD_DEFAULT_SHORTCUT: &str = "Ctrl+Shift+R";
const TRAY_ID: &str = "rago";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Prefs {
    /// fermer la fenêtre : Rago reste près de l'horloge
    pub tray: bool,
    /// lancer Rago au démarrage de Windows (caché, près de l'horloge). Activé d'office tant que le joueur ne l'a pas
    /// coupé lui-même dans les paramètres (`autostart_chosen`).
    pub autostart: bool,
    /// le joueur a lui-même allumé ou coupé le lancement avec Windows
    pub autostart_chosen: bool,
    /// barre en jeu : le raccourci l'ouvre par-dessus le jeu
    pub overlay: bool,
    pub shortcut: String,
    /// FPS et ping gardés à l'écran pendant la partie, sans prendre les clics
    pub pin: bool,
    /// langue de l'interface, pour le menu de l'icône
    pub lang: String,
    /// pendant une partie (session.rs) : carte graphique performante pour les jeux, sur un PC à deux cartes
    pub game_gpu: bool,
    /// mode Performances élevées le temps de jouer
    pub game_power: bool,
    /// vérifications au lancement d'un jeu (conseils, rien n'est fermé)
    pub game_checks: bool,
}

impl Default for Prefs {
    fn default() -> Self {
        Prefs {
            tray: true,
            autostart: true,
            autostart_chosen: false,
            overlay: true,
            shortcut: DEFAULT_SHORTCUT.into(),
            pin: false,
            lang: "fr".into(),
            game_gpu: true,
            game_power: true,
            game_checks: true,
        }
    }
}

impl Prefs {
    /// L'icône près de l'horloge : demandée, ou nécessaire pour retrouver une Rago lancée cachée avec Windows.
    pub fn keeps_running(&self) -> bool {
        self.tray || self.autostart
    }
}

pub struct Background {
    path: PathBuf,
    prefs: Mutex<Prefs>,
    /// lancée cachée avec Windows : l'icône reste même si l'option a été coupée depuis
    pub started_hidden: bool,
}

impl Background {
    pub fn load(data_dir: &Path, started_hidden: bool) -> Self {
        let path = data_dir.join("background.json");
        let mut prefs: Prefs = std::fs::read(&path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        // le lancement avec Windows démarre caché : l'icône près de l'horloge va avec (comme dans les paramètres)
        if !prefs.autostart_chosen {
            prefs.autostart = true;
            prefs.tray = true;
        }
        if prefs.shortcut == OLD_DEFAULT_SHORTCUT {
            prefs.shortcut = DEFAULT_SHORTCUT.into();
        }
        Background { path, prefs: Mutex::new(prefs), started_hidden }
    }

    pub fn prefs(&self) -> Prefs {
        self.prefs.lock().unwrap_or_else(std::sync::PoisonError::into_inner).clone()
    }

    pub fn save(&self, prefs: Prefs) {
        let _ = std::fs::write(&self.path, serde_json::to_vec_pretty(&prefs).unwrap_or_default());
        *self.prefs.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = prefs;
    }

    /// Fermer la fenêtre principale la cache au lieu de quitter.
    pub fn hides_on_close(&self) -> bool {
        self.prefs().keeps_running() || self.started_hidden
    }
}

fn label(lang: &str, key: &str) -> &'static str {
    let fr = lang != "en";
    match key {
        "open" if fr => "Ouvrir Rago Optimizer",
        "open" => "Open Rago Optimizer",
        "quit" if fr => "Quitter",
        "quit" => "Quit",
        _ => "",
    }
}

/// Montre la fenêtre principale (icône, raccourci, second lancement).
pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Crée ou retire l'icône près de l'horloge selon les réglages.
pub fn sync_tray<R: Runtime>(app: &AppHandle<R>, show: bool, lang: &str, on_quit: fn(&AppHandle<R>)) {
    let _ = app.remove_tray_by_id(TRAY_ID);
    if !show {
        return;
    }
    let build = || -> tauri::Result<()> {
        let open = MenuItem::with_id(app, "open", label(lang, "open"), true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", label(lang, "quit"), true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&open, &PredefinedMenuItem::separator(app)?, &quit])?;
        let mut tray = TrayIconBuilder::with_id(TRAY_ID)
            .tooltip(app.package_info().name.clone())
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(move |app, e| match e.id().as_ref() {
                "open" => show_main(app),
                "quit" => on_quit(app),
                _ => {}
            })
            .on_tray_icon_event(|tray, e| {
                if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                    show_main(tray.app_handle());
                }
            });
        if let Some(icon) = app.default_window_icon() {
            tray = tray.icon(icon.clone());
        }
        tray.build(app)?;
        Ok(())
    };
    if let Err(e) = build() {
        eprintln!("[tray] {e}");
    }
}

// ------------------------------------------------------------------ lancement avec Windows

/// Tâche planifiée à l'ouverture de session, avec les droits administrateur (l'app les demande : la clé Run de Windows
/// ne lance pas une app qui les demande). Sans limite de durée et aussi sur batterie, contrairement aux valeurs par
/// défaut de schtasks.
pub fn task_xml(exe: &Path, user: &str) -> String {
    let esc = |s: &str| s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;");
    format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Rago Optimizer : lancement caché à l'ouverture de session (Paramètres de l'app).</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>{user}</UserId>
      <Delay>PT10S</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{user}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{exe}</Command>
      <Arguments>{arg}</Arguments>
    </Exec>
  </Actions>
</Task>
"#,
        user = esc(user),
        exe = esc(&exe.to_string_lossy()),
        arg = BACKGROUND_ARG,
    )
}

/// Crée (on) ou retire (off) la tâche de lancement avec Windows. Nom de la tâche : celui de l'app.
pub fn set_autostart(name: &str, on: bool, temp_dir: &Path) -> Result<(), String> {
    if !on {
        let out = crate::shell::hidden("schtasks.exe").args(["/Delete", "/TN", name, "/F"]).output().map_err(|e| e.to_string())?;
        // déjà absente : rien à faire
        return if out.status.success() || !autostart_exists(name) { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).trim().to_string()) };
    }
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let user = match (std::env::var("USERDOMAIN"), std::env::var("USERNAME")) {
        (Ok(d), Ok(u)) if !d.is_empty() => format!("{d}\\{u}"),
        (_, Ok(u)) => u,
        _ => return Err("user unknown".into()),
    };
    // schtasks lit le XML en UTF-16
    let xml: Vec<u8> = [0xFF, 0xFE].into_iter().chain(task_xml(&exe, &user).encode_utf16().flat_map(u16::to_le_bytes)).collect();
    let file = temp_dir.join("rago-autostart.xml");
    std::fs::write(&file, xml).map_err(|e| e.to_string())?;
    let out = crate::shell::hidden("schtasks.exe")
        .args(["/Create", "/TN", name, "/XML"])
        .arg(&file)
        .arg("/F")
        .output()
        .map_err(|e| e.to_string());
    let _ = std::fs::remove_file(&file);
    let out = out?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

pub fn autostart_exists(name: &str) -> bool {
    crate::shell::hidden("schtasks.exe").args(["/Query", "/TN", name]).output().is_ok_and(|o| o.status.success())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefs_fill_missing_fields() {
        let p: Prefs = serde_json::from_str(r#"{"tray":true}"#).unwrap();
        assert!(p.tray && p.overlay && p.autostart && !p.autostart_chosen);
        assert_eq!(p.shortcut, DEFAULT_SHORTCUT);
        assert!(p.keeps_running());
        // lancement avec Windows d'office, sauf s'il a été coupé dans les paramètres
        let dir = std::env::temp_dir().join(format!("rago-bg-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("background.json"), r#"{"autostart":false}"#).unwrap();
        assert!(Background::load(&dir, false).prefs().autostart);
        std::fs::write(dir.join("background.json"), r#"{"autostart":false,"autostartChosen":true}"#).unwrap();
        assert!(!Background::load(&dir, false).prefs().autostart);
        // l'ancien raccourci par défaut passe au nouveau, un raccourci choisi reste
        std::fs::write(dir.join("background.json"), r#"{"shortcut":"Ctrl+Shift+R"}"#).unwrap();
        assert_eq!(Background::load(&dir, false).prefs().shortcut, DEFAULT_SHORTCUT);
        std::fs::write(dir.join("background.json"), r#"{"shortcut":"Alt+F9"}"#).unwrap();
        assert_eq!(Background::load(&dir, false).prefs().shortcut, "Alt+F9");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn task_runs_hidden_elevated_without_time_limit() {
        let xml = task_xml(Path::new(r"C:\Program Files\Rago Optimizer\Rago Optimizer.exe"), r"PC\Tom & Co");
        assert!(xml.contains(r"<Command>C:\Program Files\Rago Optimizer\Rago Optimizer.exe</Command>"));
        assert!(xml.contains("<Arguments>--background</Arguments>"));
        assert!(xml.contains("<RunLevel>HighestAvailable</RunLevel>"));
        assert!(xml.contains("<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>"));
        assert!(xml.contains("<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>"));
        assert!(xml.contains(r"<UserId>PC\Tom &amp; Co</UserId>"));
    }
}
