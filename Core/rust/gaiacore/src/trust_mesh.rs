// STATUS: DIAMANT VGT SUPREME
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

type HmacSha256 = Hmac<Sha256>;

const IDENTITY_PUBLIC_KEY_BYTES: usize = 32;
const MIN_EPOCH_KEY_BYTES: usize = 32;
const MAX_EPOCH_KEY_BYTES: usize = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrustMeshError {
    InvalidSenderKeyLength,
    InvalidRecipientKeyLength,
    InvalidEpochKeyLength,
    MacInitializationFailed,
}

pub fn calculate_report_proof(
    message_id: &[u8; 16],
    sender_pubkey: &[u8],
    recipient_pubkey: &[u8],
    ciphertext_hash: &[u8; 32],
) -> Result<[u8; 32], TrustMeshError> {
    validate_identity_key(sender_pubkey, TrustMeshError::InvalidSenderKeyLength)?;
    validate_identity_key(recipient_pubkey, TrustMeshError::InvalidRecipientKeyLength)?;
    let mut hasher = Sha256::new();
    hasher.update(message_id);
    hasher.update(sender_pubkey);
    hasher.update(recipient_pubkey);
    hasher.update(ciphertext_hash);
    let result = hasher.finalize();
    let mut output = [0u8; 32];
    output.copy_from_slice(&result);
    Ok(output)
}

pub fn calculate_epoch_hash(
    epoch_key: &[u8],
    sender_pubkey: &[u8],
) -> Result<[u8; 32], TrustMeshError> {
    if !(MIN_EPOCH_KEY_BYTES..=MAX_EPOCH_KEY_BYTES).contains(&epoch_key.len()) {
        return Err(TrustMeshError::InvalidEpochKeyLength);
    }
    validate_identity_key(sender_pubkey, TrustMeshError::InvalidSenderKeyLength)?;
    let mut mac = HmacSha256::new_from_slice(epoch_key)
        .map_err(|_| TrustMeshError::MacInitializationFailed)?;
    mac.update(sender_pubkey);
    let result = mac.finalize().into_bytes();
    let mut output = [0u8; 32];
    output.copy_from_slice(&result);
    Ok(output)
}

fn validate_identity_key(value: &[u8], error: TrustMeshError) -> Result<(), TrustMeshError> {
    if value.len() != IDENTITY_PUBLIC_KEY_BYTES {
        return Err(error);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_valid_protocol_hashes() {
        let message_id = [7u8; 16];
        let sender = [8u8; 32];
        let recipient = [9u8; 32];
        let cipher_hash = [10u8; 32];
        let proof = calculate_report_proof(&message_id, &sender, &recipient, &cipher_hash);
        assert!(matches!(proof, Ok(value) if value != [0u8; 32]));
        let epoch_hash = calculate_epoch_hash(&[11u8; 32], &sender);
        assert!(matches!(epoch_hash, Ok(value) if value != [0u8; 32]));
    }

    #[test]
    fn rejects_ambiguous_key_lengths() {
        assert_eq!(
            calculate_report_proof(&[0u8; 16], &[1u8; 31], &[2u8; 32], &[3u8; 32]),
            Err(TrustMeshError::InvalidSenderKeyLength)
        );
        assert_eq!(
            calculate_epoch_hash(&[4u8; 16], &[5u8; 32]),
            Err(TrustMeshError::InvalidEpochKeyLength)
        );
    }
}
