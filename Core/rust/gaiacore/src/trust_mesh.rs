use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

type HmacSha256 = Hmac<Sha256>;

/// Berechnet den Report-Proof für eine gemeldete Nachricht.
/// report_proof = SHA256(message_id + sender_pubkey + recipient_pubkey + ciphertext_hash)
pub fn calculate_report_proof(
    message_id: &[u8; 16],
    sender_pubkey: &[u8],
    recipient_pubkey: &[u8],
    ciphertext_hash: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(message_id);
    hasher.update(sender_pubkey);
    hasher.update(recipient_pubkey);
    hasher.update(ciphertext_hash);
    
    let result = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(&result);
    out
}

/// Berechnet den epoch-basierten Hash für eine Identität zum Schutz der Privatsphäre.
/// epoch_hash = HMAC-SHA256(epoch_key, sender_pubkey)
pub fn calculate_epoch_hash(
    epoch_key: &[u8],
    sender_pubkey: &[u8],
) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(epoch_key)
        .expect("HMAC can accept key of any size");
    mac.update(sender_pubkey);
    
    let result = mac.finalize().into_bytes();
    let mut out = [0u8; 32];
    out.copy_from_slice(&result);
    out
}
