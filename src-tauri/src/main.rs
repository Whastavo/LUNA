// Evita una ventana de consola adicional en Windows en lanzamiento
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    luna_lib::run();
}
