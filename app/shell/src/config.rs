//! Options écrites par Rago Optimizer dans %LOCALAPPDATA%\Rago OS\shell.json (os/resident.rs), et commandes reçues en
//! argument : la deuxième copie lancée passe la sienne à celle qui tourne, puis quitte.

use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub boot: bool,
    pub island: bool,
    /// barre de Rago OS en haut de l'écran
    pub bar: bool,
    /// Dock en bas, à la place de la barre des tâches
    pub dock: bool,
    /// Recherche Rago (Alt+Espace)
    pub search: bool,
    pub ttb_guard: bool,
    pub lang: String,
}

impl Config {
    pub fn fr(&self) -> bool {
        !self.lang.starts_with("en")
    }
}

pub fn dir() -> PathBuf {
    std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| std::env::temp_dir()).join("Rago OS")
}

pub fn load() -> Config {
    std::fs::read(dir().join("shell.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Command {
    /// lancé par la tâche de l'ouverture de session : animation (si cochée) puis Dynamic Island
    Logon,
    /// juste après l'activation de Rago OS : l'animation dévoile le bureau transformé
    Welcome,
    /// bouton « Voir l'animation » de l'app (aussi pour le plan gratuit)
    Preview,
    /// options changées dans l'app
    Reload,
    Quit,
    /// minuteur de la Dynamic Island, en secondes (0 : arrêté)
    Timer(u32),
}

impl Command {
    pub fn code(self) -> (usize, u32) {
        match self {
            Command::Logon => (1, 0),
            Command::Welcome => (2, 0),
            Command::Preview => (3, 0),
            Command::Reload => (4, 0),
            Command::Quit => (5, 0),
            Command::Timer(s) => (6, s),
        }
    }

    pub fn from_code(code: usize, arg: u32) -> Option<Command> {
        Some(match code {
            1 => Command::Logon,
            2 => Command::Welcome,
            3 => Command::Preview,
            4 => Command::Reload,
            5 => Command::Quit,
            6 => Command::Timer(arg),
            _ => return None,
        })
    }
}

pub fn parse(args: &[String]) -> Command {
    let mut it = args.iter().map(String::as_str);
    while let Some(a) = it.next() {
        match a {
            "--logon" => return Command::Logon,
            "--welcome" => return Command::Welcome,
            "--preview" => return Command::Preview,
            "--reload" => return Command::Reload,
            "--quit" => return Command::Quit,
            "--timer" => return Command::Timer(it.next().and_then(|s| s.parse().ok()).unwrap_or(0).min(24 * 3600)),
            _ => {}
        }
    }
    // lancé à la main : comme à l'ouverture de session, sans l'animation
    Command::Reload
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(s: &[&str]) -> Vec<String> {
        s.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn commands_are_read_and_round_trip() {
        assert_eq!(parse(&args(&["rago-shell.exe", "--logon"])), Command::Logon);
        assert_eq!(parse(&args(&["x", "--timer", "300"])), Command::Timer(300));
        assert_eq!(parse(&args(&["x", "--timer", "nope"])), Command::Timer(0));
        assert_eq!(parse(&args(&["x", "--timer", "999999"])), Command::Timer(86400));
        assert_eq!(parse(&args(&["x"])), Command::Reload);
        for c in [Command::Logon, Command::Welcome, Command::Preview, Command::Reload, Command::Quit, Command::Timer(42)] {
            let (code, arg) = c.code();
            assert_eq!(Command::from_code(code, arg), Some(c));
        }
    }

    #[test]
    fn config_defaults_to_nothing_and_french() {
        let c: Config = serde_json::from_str("{}").unwrap();
        assert!(!c.boot && !c.island && c.fr());
        assert!(!c.bar && !c.dock && !c.search);
        let c: Config = serde_json::from_str(r#"{"island":true,"lang":"en","dock":true}"#).unwrap();
        assert!(c.island && !c.fr() && c.dock && !c.bar);
    }
}
