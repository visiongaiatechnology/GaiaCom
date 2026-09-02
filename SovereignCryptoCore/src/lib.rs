// STATUS: PLATIN
use aes_gcm::aead::{generic_array::GenericArray, KeyInit, Payload};
use aes_gcm::Aes256Gcm;
use aes_gcm_siv::Aes256GcmSiv;
use chacha20poly1305::XChaCha20Poly1305;
use ctr::cipher::{InnerIvInit, StreamCipher, StreamCipherCoreWrapper};
use ctr::{flavors::Ctr128BE as Ctr128Flavor, CtrCore};
use eax::Eax;
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use serpent::Serpent;
use sha3::Sha3_512;
use std::fmt::{Display, Formatter};
use twofish::Twofish;
use zeroize::{Zeroize, Zeroizing};

pub const MAX_PAYLOAD_BYTES: usize = 8 * 1024 * 1024;
pub const ROOT_SECRET_BYTES: usize = 32;
const DOMAIN: &[u8] = b"GaiaCom/SovereignCrypto/v1";

type TwofishEax = Eax<Twofish>;
type SerpentCtrCore = CtrCore<Serpent, Ctr128Flavor>;

#[derive(Debug)]
pub enum CryptoError {
    Boundary,
    Authentication,
    Derivation,
    Key,
    Profile,
}

impl Display for CryptoError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        let category = match self {
            Self::Boundary => "boundary",
            Self::Authentication => "authentication",
            Self::Derivation => "derivation",
            Self::Key => "key",
            Self::Profile => "profile",
        };
        formatter.write_str(category)
    }
}

fn layer_aad(profile: &str, layer: &str, aad: &[u8]) -> Vec<u8> {
    let mut bound = Vec::with_capacity(DOMAIN.len() + profile.len() + layer.len() + aad.len() + 3);
    bound.extend_from_slice(DOMAIN);
    bound.push(0);
    bound.extend_from_slice(profile.as_bytes());
    bound.push(0);
    bound.extend_from_slice(layer.as_bytes());
    bound.push(0);
    bound.extend_from_slice(aad);
    bound
}

fn derive(
    root: &[u8],
    aad: &[u8],
    label: &[u8],
    size: usize,
) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
    let hkdf = Hkdf::<Sha3_512>::new(Some(aad), root);
    let mut output = Zeroizing::new(vec![0_u8; size]);
    let mut info = Vec::with_capacity(DOMAIN.len() + label.len() + 1);
    info.extend_from_slice(DOMAIN);
    info.push(0);
    info.extend_from_slice(label);
    hkdf.expand(&info, output.as_mut_slice())
        .map_err(|_| CryptoError::Derivation)?;
    info.zeroize();
    Ok(output)
}

fn eax_encrypt<C>(
    root: &[u8],
    aad: &[u8],
    profile: &str,
    layer: &str,
    plaintext: &[u8],
) -> Result<Vec<u8>, CryptoError>
where
    C: aes_gcm::aead::KeyInit + aes_gcm::aead::Aead,
{
    let key = derive(root, aad, format!("{layer}/key").as_bytes(), 32)?;
    let nonce = derive(root, aad, format!("{layer}/nonce").as_bytes(), 16)?;
    let cipher = C::new_from_slice(key.as_slice()).map_err(|_| CryptoError::Key)?;
    cipher
        .encrypt(
            GenericArray::from_slice(nonce.as_slice()),
            Payload {
                msg: plaintext,
                aad: &layer_aad(profile, layer, aad),
            },
        )
        .map_err(|_| CryptoError::Authentication)
}

fn eax_decrypt<C>(
    root: &[u8],
    aad: &[u8],
    profile: &str,
    layer: &str,
    ciphertext: &[u8],
) -> Result<Vec<u8>, CryptoError>
where
    C: aes_gcm::aead::KeyInit + aes_gcm::aead::Aead,
{
    let key = derive(root, aad, format!("{layer}/key").as_bytes(), 32)?;
    let nonce = derive(root, aad, format!("{layer}/nonce").as_bytes(), 16)?;
    let cipher = C::new_from_slice(key.as_slice()).map_err(|_| CryptoError::Key)?;
    cipher
        .decrypt(
            GenericArray::from_slice(nonce.as_slice()),
            Payload {
                msg: ciphertext,
                aad: &layer_aad(profile, layer, aad),
            },
        )
        .map_err(|_| CryptoError::Authentication)
}

fn aead_encrypt<C>(
    root: &[u8],
    aad: &[u8],
    profile: &str,
    layer: &str,
    nonce_size: usize,
    plaintext: &[u8],
) -> Result<Vec<u8>, CryptoError>
where
    C: aes_gcm::aead::KeyInit + aes_gcm::aead::Aead,
{
    let key = derive(root, aad, format!("{layer}/key").as_bytes(), 32)?;
    let nonce = derive(root, aad, format!("{layer}/nonce").as_bytes(), nonce_size)?;
    let cipher = C::new_from_slice(key.as_slice()).map_err(|_| CryptoError::Key)?;
    cipher
        .encrypt(
            GenericArray::from_slice(nonce.as_slice()),
            Payload {
                msg: plaintext,
                aad: &layer_aad(profile, layer, aad),
            },
        )
        .map_err(|_| CryptoError::Authentication)
}

fn aead_decrypt<C>(
    root: &[u8],
    aad: &[u8],
    profile: &str,
    layer: &str,
    nonce_size: usize,
    ciphertext: &[u8],
) -> Result<Vec<u8>, CryptoError>
where
    C: aes_gcm::aead::KeyInit + aes_gcm::aead::Aead,
{
    let key = derive(root, aad, format!("{layer}/key").as_bytes(), 32)?;
    let nonce = derive(root, aad, format!("{layer}/nonce").as_bytes(), nonce_size)?;
    let cipher = C::new_from_slice(key.as_slice()).map_err(|_| CryptoError::Key)?;
    cipher
        .decrypt(
            GenericArray::from_slice(nonce.as_slice()),
            Payload {
                msg: ciphertext,
                aad: &layer_aad(profile, layer, aad),
            },
        )
        .map_err(|_| CryptoError::Authentication)
}

fn serpent_mac(
    key: &[u8],
    profile: &str,
    layer: &str,
    aad: &[u8],
    ciphertext: &[u8],
) -> Result<Hmac<Sha3_512>, CryptoError> {
    let mut mac = <Hmac<Sha3_512> as Mac>::new_from_slice(key).map_err(|_| CryptoError::Key)?;
    let bound = layer_aad(profile, layer, aad);
    mac.update(&(bound.len() as u64).to_be_bytes());
    mac.update(&bound);
    mac.update(&(ciphertext.len() as u64).to_be_bytes());
    mac.update(ciphertext);
    Ok(mac)
}

fn serpent_transform(
    root: &[u8],
    aad: &[u8],
    layer: &str,
    input: &mut [u8],
) -> Result<(), CryptoError> {
    let key = derive(root, aad, format!("{layer}/key").as_bytes(), 32)?;
    let nonce = derive(root, aad, format!("{layer}/nonce").as_bytes(), 16)?;
    let serpent = Serpent::new_from_slice(key.as_slice()).map_err(|_| CryptoError::Key)?;
    let core = <SerpentCtrCore as InnerIvInit>::inner_iv_init(
        serpent,
        GenericArray::from_slice(nonce.as_slice()),
    );
    let mut cipher = StreamCipherCoreWrapper::from_core(core);
    cipher.apply_keystream(input);
    Ok(())
}

fn serpent_encrypt(
    root: &[u8],
    aad: &[u8],
    profile: &str,
    layer: &str,
    plaintext: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    let mut ciphertext = plaintext.to_vec();
    serpent_transform(root, aad, layer, &mut ciphertext)?;
    let mac_key = derive(root, aad, format!("{layer}/mac").as_bytes(), 64)?;
    let tag = serpent_mac(mac_key.as_slice(), profile, layer, aad, &ciphertext)?
        .finalize()
        .into_bytes();
    ciphertext.extend_from_slice(&tag);
    Ok(ciphertext)
}

fn serpent_decrypt(
    root: &[u8],
    aad: &[u8],
    profile: &str,
    layer: &str,
    ciphertext_and_tag: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    const TAG_BYTES: usize = 64;
    if ciphertext_and_tag.len() < TAG_BYTES {
        return Err(CryptoError::Boundary);
    }
    let split = ciphertext_and_tag.len() - TAG_BYTES;
    let (ciphertext, tag) = ciphertext_and_tag.split_at(split);
    let mac_key = derive(root, aad, format!("{layer}/mac").as_bytes(), 64)?;
    serpent_mac(mac_key.as_slice(), profile, layer, aad, ciphertext)?
        .verify_slice(tag)
        .map_err(|_| CryptoError::Authentication)?;
    let mut plaintext = ciphertext.to_vec();
    serpent_transform(root, aad, layer, &mut plaintext)?;
    Ok(plaintext)
}
pub fn seal(
    profile: &str,
    root: &[u8],
    aad: &[u8],
    plaintext: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    if plaintext.len() > MAX_PAYLOAD_BYTES {
        return Err(CryptoError::Boundary);
    }
    match profile {
        "accelerated" => {
            let mut first =
                eax_encrypt::<TwofishEax>(root, aad, profile, "twofish-256-eax", plaintext)?;
            let second = aead_encrypt::<Aes256Gcm>(root, aad, profile, "aes-256-gcm", 12, &first)?;
            first.zeroize();
            Ok(second)
        }
        "top-secret" => {
            let mut first = serpent_encrypt(
                root,
                aad,
                profile,
                "serpent-256-ctr+hmac-sha3-512",
                plaintext,
            )?;
            let mut second =
                eax_encrypt::<TwofishEax>(root, aad, profile, "twofish-256-eax", &first)?;
            first.zeroize();
            let mut third = aead_encrypt::<XChaCha20Poly1305>(
                root,
                aad,
                profile,
                "xchacha20-poly1305",
                24,
                &second,
            )?;
            second.zeroize();
            let fourth =
                aead_encrypt::<Aes256GcmSiv>(root, aad, profile, "aes-256-gcm-siv", 12, &third)?;
            third.zeroize();
            Ok(fourth)
        }
        _ => Err(CryptoError::Profile),
    }
}

pub fn open(
    profile: &str,
    root: &[u8],
    aad: &[u8],
    ciphertext: &[u8],
) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
    if ciphertext.len() > MAX_PAYLOAD_BYTES + 128 {
        return Err(CryptoError::Boundary);
    }
    match profile {
        "accelerated" => {
            let mut first =
                aead_decrypt::<Aes256Gcm>(root, aad, profile, "aes-256-gcm", 12, ciphertext)?;
            let plaintext =
                eax_decrypt::<TwofishEax>(root, aad, profile, "twofish-256-eax", &first)?;
            first.zeroize();
            Ok(Zeroizing::new(plaintext))
        }
        "top-secret" => {
            let mut third = aead_decrypt::<Aes256GcmSiv>(
                root,
                aad,
                profile,
                "aes-256-gcm-siv",
                12,
                ciphertext,
            )?;
            let mut second = aead_decrypt::<XChaCha20Poly1305>(
                root,
                aad,
                profile,
                "xchacha20-poly1305",
                24,
                &third,
            )?;
            third.zeroize();
            let mut first =
                eax_decrypt::<TwofishEax>(root, aad, profile, "twofish-256-eax", &second)?;
            second.zeroize();
            let plaintext =
                serpent_decrypt(root, aad, profile, "serpent-256-ctr+hmac-sha3-512", &first)?;
            first.zeroize();
            Ok(Zeroizing::new(plaintext))
        }
        _ => Err(CryptoError::Profile),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn both_profiles_round_trip_and_reject_tamper() {
        let root = [0x42_u8; ROOT_SECRET_BYTES];
        let aad = b"bound protocol transcript";
        for profile in ["accelerated", "top-secret"] {
            let ciphertext = seal(profile, &root, aad, b"classified payload").expect("seal");
            assert_eq!(
                open(profile, &root, aad, &ciphertext)
                    .expect("open")
                    .as_slice(),
                b"classified payload"
            );
            let mut tampered = ciphertext;
            tampered[0] ^= 1;
            assert!(open(profile, &root, aad, &tampered).is_err());
        }
    }
}
