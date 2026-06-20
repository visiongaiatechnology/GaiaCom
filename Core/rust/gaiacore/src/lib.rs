#![forbid(unsafe_code)]

pub mod envelope;
pub mod trust_mesh;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GaiaIdError {
    Empty,
    MissingPrefix,
    MissingDomainSeparator,
    InvalidLocalLength,
    InvalidDomainLength,
    InvalidLocalCharacter,
    InvalidDomainCharacter,
}

pub fn validate_gaia_id(value: &str) -> Result<(), GaiaIdError> {
    if value.is_empty() {
        return Err(GaiaIdError::Empty);
    }
    if !value.starts_with('@') {
        return Err(GaiaIdError::MissingPrefix);
    }

    let Some(separator_index) = value.rfind(':') else {
        return Err(GaiaIdError::MissingDomainSeparator);
    };

    let local = &value[1..separator_index];
    let domain = &value[(separator_index + 1)..];

    if local.len() < 3 || local.len() > 64 {
        return Err(GaiaIdError::InvalidLocalLength);
    }
    if domain.len() < 3 || domain.len() > 253 {
        return Err(GaiaIdError::InvalidDomainLength);
    }
    if !local.bytes().all(is_local_byte) {
        return Err(GaiaIdError::InvalidLocalCharacter);
    }
    if !domain.bytes().all(is_domain_byte) || domain.starts_with('.') || domain.ends_with('.') {
        return Err(GaiaIdError::InvalidDomainCharacter);
    }

    Ok(())
}

pub fn is_fixed_hex(value: &str, expected_bytes: usize) -> bool {
    let expected_len = expected_bytes.saturating_mul(2);
    value.len() == expected_len && value.bytes().all(is_hex_byte)
}

pub fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    let max_len = left.len().max(right.len());
    let mut diff = left.len() ^ right.len();

    for index in 0..max_len {
        let a = left.get(index).copied().unwrap_or(0);
        let b = right.get(index).copied().unwrap_or(0);
        diff |= usize::from(a ^ b);
    }

    diff == 0
}

fn is_local_byte(value: u8) -> bool {
    value.is_ascii_alphanumeric() || matches!(value, b'.' | b'_' | b'-')
}

fn is_domain_byte(value: u8) -> bool {
    value.is_ascii_alphanumeric() || matches!(value, b'.' | b'-')
}

fn is_hex_byte(value: u8) -> bool {
    value.is_ascii_hexdigit()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_gaia_id() {
        assert_eq!(validate_gaia_id("@alice:gaia.local"), Ok(()));
        assert_eq!(
            validate_gaia_id("alice:gaia.local"),
            Err(GaiaIdError::MissingPrefix)
        );
        assert_eq!(
            validate_gaia_id("@al:gaia.local"),
            Err(GaiaIdError::InvalidLocalLength)
        );
        assert_eq!(
            validate_gaia_id("@alice:.local"),
            Err(GaiaIdError::InvalidDomainCharacter)
        );
    }

    #[test]
    fn validates_fixed_hex() {
        assert!(is_fixed_hex("001122aabbcc", 6));
        assert!(!is_fixed_hex("001122aabbcg", 6));
        assert!(!is_fixed_hex("001122aabb", 6));
    }

    #[test]
    fn compares_in_constant_shape() {
        assert!(constant_time_eq(b"same", b"same"));
        assert!(!constant_time_eq(b"same", b"diff"));
        assert!(!constant_time_eq(b"same", b"same-but-longer"));
    }

    #[test]
    fn encodes_and_decodes_envelope() {
        use crate::envelope::{encode, decode, GaiaEnvelope};

        let env = GaiaEnvelope {
            sender: "alice".to_string(),
            recipient: "bob".to_string(),
            payload_ciphertext: vec![1, 2, 3, 4],
            signature: vec![5, 6, 7],
        };

        let encoded = encode(&env);
        let decoded = decode(&encoded).unwrap();
        assert_eq!(env, decoded);
    }

    #[test]
    fn calculates_report_proof_and_epoch_hash() {
        use crate::trust_mesh::{calculate_report_proof, calculate_epoch_hash};

        let msg_id = [0u8; 16];
        let sender = b"sender-key";
        let recipient = b"recipient-key";
        let cipher_hash = [0u8; 32];

        let proof = calculate_report_proof(&msg_id, sender, recipient, &cipher_hash);
        assert_ne!(proof, [0u8; 32]);

        let epoch_key = b"epoch-key-2026-06-18";
        let epoch_hash = calculate_epoch_hash(epoch_key, sender);
        assert_ne!(epoch_hash, [0u8; 32]);
    }
}
