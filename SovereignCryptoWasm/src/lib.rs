// STATUS: PLATIN
use gaiacom_sovereign_core::{open, seal, MAX_PAYLOAD_BYTES, ROOT_SECRET_BYTES};
use wasm_bindgen::prelude::*;
use zeroize::{Zeroize, Zeroizing};

const MAX_AAD_BYTES: usize = 128 * 1024;

fn rejected() -> JsValue {
    JsValue::from_str("Sovereign crypto operation rejected.")
}

fn decode_hex_bounded(value: &str, maximum: usize) -> Result<Zeroizing<Vec<u8>>, JsValue> {
    if value.is_empty()
        || value.len() > maximum.saturating_mul(2)
        || value.len() % 2 != 0
        || !value.as_bytes().iter().all(u8::is_ascii_hexdigit)
    {
        return Err(rejected());
    }
    let decoded = hex::decode(value).map_err(|_| rejected())?;
    if decoded.len() > maximum {
        return Err(rejected());
    }
    Ok(Zeroizing::new(decoded))
}

fn decode_exact(value: &str, expected: usize) -> Result<Zeroizing<Vec<u8>>, JsValue> {
    let decoded = decode_hex_bounded(value, expected)?;
    if decoded.len() != expected {
        return Err(rejected());
    }
    Ok(decoded)
}

#[wasm_bindgen]
pub fn sovereign_seal(
    profile: &str,
    root_secret_hex: &str,
    aad_hex: &str,
    plaintext_hex: &str,
) -> Result<String, JsValue> {
    let root = decode_exact(root_secret_hex, ROOT_SECRET_BYTES)?;
    let aad = decode_hex_bounded(aad_hex, MAX_AAD_BYTES)?;
    let plaintext = decode_hex_bounded(plaintext_hex, MAX_PAYLOAD_BYTES)?;
    let mut ciphertext = seal(profile, root.as_slice(), aad.as_slice(), plaintext.as_slice())
        .map_err(|_| rejected())?;
    let encoded = hex::encode(&ciphertext);
    ciphertext.zeroize();
    Ok(encoded)
}

#[wasm_bindgen]
pub fn sovereign_open(
    profile: &str,
    root_secret_hex: &str,
    aad_hex: &str,
    ciphertext_hex: &str,
) -> Result<String, JsValue> {
    let root = decode_exact(root_secret_hex, ROOT_SECRET_BYTES)?;
    let aad = decode_hex_bounded(aad_hex, MAX_AAD_BYTES)?;
    let ciphertext = decode_hex_bounded(ciphertext_hex, MAX_PAYLOAD_BYTES + 128)?;
    let plaintext = open(profile, root.as_slice(), aad.as_slice(), ciphertext.as_slice())
        .map_err(|_| rejected())?;
    Ok(hex::encode(plaintext.as_slice()))
}

#[wasm_bindgen]
pub fn sovereign_self_test() -> Result<(), JsValue> {
    let root = [0x6d_u8; ROOT_SECRET_BYTES];
    let aad = b"GaiaCom browser provider self-test/v1";
    let plaintext = b"provider-ready";
    for profile in ["accelerated", "top-secret"] {
        let mut ciphertext = seal(profile, &root, aad, plaintext).map_err(|_| rejected())?;
        let opened = open(profile, &root, aad, &ciphertext).map_err(|_| rejected())?;
        if opened.as_slice() != plaintext {
            ciphertext.zeroize();
            return Err(rejected());
        }
        ciphertext[0] ^= 1;
        if open(profile, &root, aad, &ciphertext).is_ok() {
            ciphertext.zeroize();
            return Err(rejected());
        }
        ciphertext.zeroize();
    }
    Ok(())
}
