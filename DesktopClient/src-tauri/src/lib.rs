// STATUS: PLATIN
mod sovereign_crypto;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), tauri::Error> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sovereign_crypto::sovereign_hqc256_keypair,
            sovereign_crypto::sovereign_hqc256_encapsulate,
            sovereign_crypto::sovereign_hqc256_decapsulate,
            sovereign_crypto::sovereign_seal,
            sovereign_crypto::sovereign_open
        ])
        .run(tauri::generate_context!())
        .map_err(Into::into)
}
