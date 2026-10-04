// Pas de console derrière la fenêtre en release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    rago_hub_lib::run()
}
