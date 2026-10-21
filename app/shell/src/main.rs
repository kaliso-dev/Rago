//! Rago Shell : la partie de Rago OS qui reste à l'écran. Animation de démarrage à l'ouverture de session, barre en
//! haut, Dock, Recherche Rago, centre de contrôle et Dynamic Island (musique, volume, minuteur), cachés dès qu'un jeu
//! ou une appli plein écran est devant. Sans droits d'administrateur, sans pilote, sans rien injecter dans les autres
//! programmes : uniquement ses propres fenêtres, composées par Windows (DirectComposition). Au repos il ne dessine
//! rien et attend les événements de Windows.

#![cfg_attr(windows, windows_subsystem = "windows")]

mod config;
mod logo;
#[cfg_attr(not(windows), allow(dead_code))]
mod query;

#[cfg(windows)]
mod appbar;
#[cfg(windows)]
mod apps;
#[cfg(windows)]
mod bar;
#[cfg(windows)]
mod boot;
#[cfg(windows)]
mod control;
#[cfg(windows)]
mod desk;
#[cfg(windows)]
mod dock;
#[cfg(windows)]
mod gfx;
#[cfg(windows)]
mod glass;
#[cfg(windows)]
mod host;
#[cfg(windows)]
mod icons;
#[cfg(windows)]
mod island;
#[cfg(windows)]
mod media;
#[cfg(windows)]
mod menu;
#[cfg(windows)]
mod panel;
#[cfg(windows)]
mod screen;
#[cfg(windows)]
mod search;
#[cfg(windows)]
mod status;
#[cfg(windows)]
mod taskbar;
#[cfg(windows)]
mod volume;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let command = config::parse(&args);
    #[cfg(windows)]
    host::run(command);
    #[cfg(not(windows))]
    {
        let _ = (command, logo::MARK_W);
        eprintln!("Rago Shell ne tourne que sur Windows.");
    }
}
