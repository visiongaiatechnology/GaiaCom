// STATUS: PLATIN
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::ExitCode;

fn main() -> ExitCode {
    if let Err(error) = gaiacom_lib::run() {
        eprintln!("GaiaCom failed to start: {error}");
        return ExitCode::FAILURE;
    }

    ExitCode::SUCCESS
}
