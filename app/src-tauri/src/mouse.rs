//! Page Souris : logiciels lancés qui se placent entre la souris et le jeu.
//!
//! Rago Optimizer ne fait que lire la liste des processus (comme `games::process_paths`) : il ne ferme rien, n'installe
//! aucun crochet et n'envoie aucune entrée. Les mesures de la souris (fréquence, doubles clics) se font dans
//! l'interface, dans la fenêtre de Rago seulement.

use serde::Serialize;
use std::path::PathBuf;

/// Ce que fait un logiciel connu.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    /// remappe les boutons par un crochet global et sait simuler des touches (X-Mouse Button Control)
    Remap,
    /// lance des scripts qui peuvent appuyer à la place du joueur (AutoHotkey)
    Script,
    /// clique tout seul ou rejoue des actions enregistrées
    Autoclick,
    /// le logiciel du fabricant de la souris : là où se règlent DPI, fréquence et anti-rebond
    Vendor,
}

/// Un logiciel trouvé : son nom affiché et ce qu'il fait.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct MouseApp {
    pub name: &'static str,
    pub kind: Kind,
}

/// Exes connus (minuscules), avec le nom affiché. Un même logiciel peut avoir plusieurs exes : il n'est listé qu'une fois.
const KNOWN: &[(&str, &str, Kind)] = &[
    ("xmousebuttoncontrol.exe", "X-Mouse Button Control", Kind::Remap),
    ("autohotkey.exe", "AutoHotkey", Kind::Script),
    ("autohotkey32.exe", "AutoHotkey", Kind::Script),
    ("autohotkey64.exe", "AutoHotkey", Kind::Script),
    ("autohotkeyu32.exe", "AutoHotkey", Kind::Script),
    ("autohotkeyu64.exe", "AutoHotkey", Kind::Script),
    ("autohotkeya32.exe", "AutoHotkey", Kind::Script),
    ("autohotkeyux.exe", "AutoHotkey", Kind::Script),
    ("tinytask.exe", "TinyTask", Kind::Autoclick),
    ("gsautoclicker.exe", "GS Auto Clicker", Kind::Autoclick),
    ("autoclicker.exe", "Auto Clicker", Kind::Autoclick),
    ("lghub.exe", "Logitech G HUB", Kind::Vendor),
    ("lghub_agent.exe", "Logitech G HUB", Kind::Vendor),
    ("logioptionsplus_agent.exe", "Logi Options+", Kind::Vendor),
    ("razer synapse 3.exe", "Razer Synapse", Kind::Vendor),
    ("razer synapse service.exe", "Razer Synapse", Kind::Vendor),
    ("razerappengine.exe", "Razer Synapse", Kind::Vendor),
    ("steelseriesgg.exe", "SteelSeries GG", Kind::Vendor),
    ("icue.exe", "Corsair iCUE", Kind::Vendor),
    ("glorious core.exe", "Glorious CORE", Kind::Vendor),
];

/// Logiciels connus parmi ces exes : d'abord ceux qui posent un risque en partie classée, puis ceux du fabricant.
pub fn detect(exes: &[PathBuf]) -> Vec<MouseApp> {
    let mut out: Vec<MouseApp> = Vec::new();
    for exe in exes {
        // nom du fichier, coupé à la main pour que les tests passent aussi hors Windows (chemins avec « \ »)
        let path = exe.to_string_lossy();
        let file = path.rsplit(['\\', '/']).next().unwrap_or_default().to_lowercase();
        let known = KNOWN.iter().find(|(e, _, _)| *e == file);
        if let Some(&(_, name, kind)) = known.filter(|(_, n, _)| !out.iter().any(|a| a.name == *n)) {
            out.push(MouseApp { name, kind });
        }
    }
    out.sort_by_key(|a| (a.kind == Kind::Vendor, a.name));
    out
}

/// Logiciels connus lancés en ce moment.
pub fn running() -> Vec<MouseApp> {
    detect(&crate::games::process_paths())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths(list: &[&str]) -> Vec<PathBuf> {
        list.iter().map(PathBuf::from).collect()
    }

    #[test]
    fn finds_known_apps_once_risky_first() {
        let found = detect(&paths(&[
            r"C:\Program Files\LGHUB\lghub.exe",
            r"C:\Program Files\LGHUB\lghub_agent.exe",
            r"C:\Program Files\Highresolution Enterprises\X-Mouse Button Control\XMouseButtonControl.exe",
            r"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe",
            r"C:\Windows\explorer.exe",
        ]));
        assert_eq!(
            found,
            vec![
                MouseApp { name: "AutoHotkey", kind: Kind::Script },
                MouseApp { name: "X-Mouse Button Control", kind: Kind::Remap },
                MouseApp { name: "Logitech G HUB", kind: Kind::Vendor },
            ]
        );
    }

    #[test]
    fn ignores_unknown_apps() {
        assert!(detect(&paths(&[r"C:\Games\VALORANT.exe", r"C:\Windows\System32\svchost.exe"])).is_empty());
    }
}
