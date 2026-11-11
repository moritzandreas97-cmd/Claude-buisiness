// Verhindert unter Windows ein zusätzliches Konsolenfenster im Release-Build
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    planstudio_lib::run()
}
