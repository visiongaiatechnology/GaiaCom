// STATUS: PLATIN
use gaiacom_sovereign_core::{open, seal, MAX_PAYLOAD_BYTES, ROOT_SECRET_BYTES};
use pqcrypto_hqc::hqc256::{
    decapsulate, encapsulate, keypair, Ciphertext as HqcCiphertext, PublicKey as HqcPublicKey,
    SecretKey as HqcSecretKey,
};
use pqcrypto_traits::kem::{
    Ciphertext as KemCiphertext, PublicKey as KemPublicKey, SecretKey as KemSecretKey,
    SharedSecret as KemSharedSecret,
};
use serde::Serialize;
use std::fmt::{Display, Formatter};
use zeroize::Zeroizing;

#[derive(Debug)]
enum NativeCryptoError {
    Boundary,
    Encoding,
    Kem,
    Sovereign,
}

impl Display for NativeCryptoError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::Boundary => "boundary",
            Self::Encoding => "encoding",
            Self::Kem => "kem",
            Self::Sovereign => "sovereign",
        })
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HqcKeyPair {
    public_key_hex: String,
    secret_key_hex: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HqcEncapsulation {
    ciphertext_hex: String,
    shared_secret_hex: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SovereignCiphertext {
    profile: String,
    ciphertext_hex: String,
}

fn opaque<T>(result: Result<T, NativeCryptoError>) -> Result<T, String> {
    result.map_err(|error| {
        eprintln!("GaiaCom sovereign crypto rejected an operation: {error}");
        "Sovereign crypto operation rejected.".to_owned()
    })
}

fn decode_hex_bounded(
    value: &str,
    maximum: usize,
) -> Result<Zeroizing<Vec<u8>>, NativeCryptoError> {
    if value.len() > maximum.saturating_mul(2) || value.len() % 2 != 0 {
        return Err(NativeCryptoError::Boundary);
    }
    let decoded = hex::decode(value).map_err(|_| NativeCryptoError::Encoding)?;
    if decoded.len() > maximum {
        return Err(NativeCryptoError::Boundary);
    }
    Ok(Zeroizing::new(decoded))
}

fn decode_exact(value: &str, expected: usize) -> Result<Zeroizing<Vec<u8>>, NativeCryptoError> {
    let decoded = decode_hex_bounded(value, expected)?;
    if decoded.len() != expected {
        return Err(NativeCryptoError::Boundary);
    }
    Ok(decoded)
}

#[tauri::command]
pub fn sovereign_hqc256_keypair() -> Result<HqcKeyPair, String> {
    let (public_key, secret_key) = keypair();
    Ok(HqcKeyPair {
        public_key_hex: hex::encode(public_key.as_bytes()),
        secret_key_hex: hex::encode(secret_key.as_bytes()),
    })
}

#[tauri::command]
pub fn sovereign_hqc256_encapsulate(public_key_hex: String) -> Result<HqcEncapsulation, String> {
    opaque((|| {
        let encoded = decode_hex_bounded(&public_key_hex, 8 * 1024)?;
        let public_key =
            HqcPublicKey::from_bytes(encoded.as_slice()).map_err(|_| NativeCryptoError::Kem)?;
        let (shared_secret, ciphertext) = encapsulate(&public_key);
        Ok(HqcEncapsulation {
            ciphertext_hex: hex::encode(ciphertext.as_bytes()),
            shared_secret_hex: hex::encode(shared_secret.as_bytes()),
        })
    })())
}

#[tauri::command]
pub fn sovereign_hqc256_decapsulate(
    ciphertext_hex: String,
    secret_key_hex: String,
) -> Result<String, String> {
    opaque((|| {
        let ciphertext_bytes = decode_hex_bounded(&ciphertext_hex, 16 * 1024)?;
        let secret_key_bytes = decode_hex_bounded(&secret_key_hex, 32 * 1024)?;
        let ciphertext = HqcCiphertext::from_bytes(ciphertext_bytes.as_slice())
            .map_err(|_| NativeCryptoError::Kem)?;
        let secret_key = HqcSecretKey::from_bytes(secret_key_bytes.as_slice())
            .map_err(|_| NativeCryptoError::Kem)?;
        Ok(hex::encode(
            decapsulate(&ciphertext, &secret_key).as_bytes(),
        ))
    })())
}

#[tauri::command]
pub fn sovereign_seal(
    profile: String,
    root_secret_hex: String,
    aad_hex: String,
    plaintext_hex: String,
) -> Result<SovereignCiphertext, String> {
    opaque((|| {
        let root = decode_exact(&root_secret_hex, ROOT_SECRET_BYTES)?;
        let aad = decode_hex_bounded(&aad_hex, 128 * 1024)?;
        let plaintext = decode_hex_bounded(&plaintext_hex, MAX_PAYLOAD_BYTES)?;
        let ciphertext = seal(
            &profile,
            root.as_slice(),
            aad.as_slice(),
            plaintext.as_slice(),
        )
        .map_err(|_| NativeCryptoError::Sovereign)?;
        Ok(SovereignCiphertext {
            profile,
            ciphertext_hex: hex::encode(ciphertext),
        })
    })())
}

#[tauri::command]
pub fn sovereign_open(
    profile: String,
    root_secret_hex: String,
    aad_hex: String,
    ciphertext_hex: String,
) -> Result<String, String> {
    opaque((|| {
        let root = decode_exact(&root_secret_hex, ROOT_SECRET_BYTES)?;
        let aad = decode_hex_bounded(&aad_hex, 128 * 1024)?;
        let ciphertext = decode_hex_bounded(&ciphertext_hex, MAX_PAYLOAD_BYTES + 128)?;
        let plaintext = open(
            &profile,
            root.as_slice(),
            aad.as_slice(),
            ciphertext.as_slice(),
        )
        .map_err(|_| NativeCryptoError::Sovereign)?;
        Ok(hex::encode(plaintext.as_slice()))
    })())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hqc256_round_trip() {
        let (public_key, secret_key) = keypair();
        let (expected, ciphertext) = encapsulate(&public_key);
        assert_eq!(
            expected.as_bytes(),
            decapsulate(&ciphertext, &secret_key).as_bytes()
        );
    }
}
