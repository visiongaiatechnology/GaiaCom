// STATUS: DIAMANT VGT SUPREME

const ENVELOPE_VERSION: u8 = 1;
const MAX_IDENTITY_BYTES: usize = 320;
const MAX_PAYLOAD_BYTES: usize = 64 * 1024 * 1024;
const MAX_SIGNATURE_BYTES: usize = 4096;
const MAX_ENCODED_BYTES: usize = 1
    + 2
    + MAX_IDENTITY_BYTES
    + 2
    + MAX_IDENTITY_BYTES
    + 4
    + MAX_PAYLOAD_BYTES
    + 2
    + MAX_SIGNATURE_BYTES;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GaiaEnvelope {
    pub sender: String,
    pub recipient: String,
    pub payload_ciphertext: Vec<u8>,
    pub signature: Vec<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EncodeError {
    EmptySender,
    EmptyRecipient,
    SenderTooLong,
    RecipientTooLong,
    PayloadTooLarge,
    InvalidSignatureLength,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DecodeError {
    TooShort,
    EnvelopeTooLarge,
    InvalidVersion(u8),
    EmptySender,
    EmptyRecipient,
    SenderTooLong,
    RecipientTooLong,
    PayloadTooLarge,
    InvalidSignatureLength,
    InvalidUtf8,
    TrailingData,
}

pub fn encode(envelope: &GaiaEnvelope) -> Result<Vec<u8>, EncodeError> {
    validate_for_encode(envelope)?;
    let sender = envelope.sender.as_bytes();
    let recipient = envelope.recipient.as_bytes();
    let sender_len = u16::try_from(sender.len()).map_err(|_| EncodeError::SenderTooLong)?;
    let recipient_len =
        u16::try_from(recipient.len()).map_err(|_| EncodeError::RecipientTooLong)?;
    let payload_len = u32::try_from(envelope.payload_ciphertext.len())
        .map_err(|_| EncodeError::PayloadTooLarge)?;
    let signature_len =
        u16::try_from(envelope.signature.len()).map_err(|_| EncodeError::InvalidSignatureLength)?;
    let capacity = 11usize
        .saturating_add(sender.len())
        .saturating_add(recipient.len())
        .saturating_add(envelope.payload_ciphertext.len())
        .saturating_add(envelope.signature.len());
    let mut encoded = Vec::with_capacity(capacity);
    encoded.push(ENVELOPE_VERSION);
    encoded.extend_from_slice(&sender_len.to_be_bytes());
    encoded.extend_from_slice(sender);
    encoded.extend_from_slice(&recipient_len.to_be_bytes());
    encoded.extend_from_slice(recipient);
    encoded.extend_from_slice(&payload_len.to_be_bytes());
    encoded.extend_from_slice(&envelope.payload_ciphertext);
    encoded.extend_from_slice(&signature_len.to_be_bytes());
    encoded.extend_from_slice(&envelope.signature);
    Ok(encoded)
}

pub fn decode(encoded: &[u8]) -> Result<GaiaEnvelope, DecodeError> {
    if encoded.len() > MAX_ENCODED_BYTES {
        return Err(DecodeError::EnvelopeTooLarge);
    }
    let mut reader = Reader::new(encoded);
    let version = reader.read_u8()?;
    if version != ENVELOPE_VERSION {
        return Err(DecodeError::InvalidVersion(version));
    }

    let sender_len = usize::from(reader.read_u16()?);
    if sender_len == 0 {
        return Err(DecodeError::EmptySender);
    }
    if sender_len > MAX_IDENTITY_BYTES {
        return Err(DecodeError::SenderTooLong);
    }
    let sender = decode_string(reader.take(sender_len)?)?;

    let recipient_len = usize::from(reader.read_u16()?);
    if recipient_len == 0 {
        return Err(DecodeError::EmptyRecipient);
    }
    if recipient_len > MAX_IDENTITY_BYTES {
        return Err(DecodeError::RecipientTooLong);
    }
    let recipient = decode_string(reader.take(recipient_len)?)?;

    let payload_len =
        usize::try_from(reader.read_u32()?).map_err(|_| DecodeError::PayloadTooLarge)?;
    if payload_len > MAX_PAYLOAD_BYTES {
        return Err(DecodeError::PayloadTooLarge);
    }
    let payload_ciphertext = reader.take(payload_len)?.to_vec();

    let signature_len = usize::from(reader.read_u16()?);
    if signature_len == 0 || signature_len > MAX_SIGNATURE_BYTES {
        return Err(DecodeError::InvalidSignatureLength);
    }
    let signature = reader.take(signature_len)?.to_vec();
    if !reader.is_finished() {
        return Err(DecodeError::TrailingData);
    }

    Ok(GaiaEnvelope {
        sender,
        recipient,
        payload_ciphertext,
        signature,
    })
}

fn validate_for_encode(envelope: &GaiaEnvelope) -> Result<(), EncodeError> {
    if envelope.sender.is_empty() {
        return Err(EncodeError::EmptySender);
    }
    if envelope.recipient.is_empty() {
        return Err(EncodeError::EmptyRecipient);
    }
    if envelope.sender.len() > MAX_IDENTITY_BYTES {
        return Err(EncodeError::SenderTooLong);
    }
    if envelope.recipient.len() > MAX_IDENTITY_BYTES {
        return Err(EncodeError::RecipientTooLong);
    }
    if envelope.payload_ciphertext.len() > MAX_PAYLOAD_BYTES {
        return Err(EncodeError::PayloadTooLarge);
    }
    if envelope.signature.is_empty() || envelope.signature.len() > MAX_SIGNATURE_BYTES {
        return Err(EncodeError::InvalidSignatureLength);
    }
    Ok(())
}

fn decode_string(value: &[u8]) -> Result<String, DecodeError> {
    let text = std::str::from_utf8(value).map_err(|_| DecodeError::InvalidUtf8)?;
    Ok(text.to_owned())
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn read_u8(&mut self) -> Result<u8, DecodeError> {
        Ok(self.take(1)?[0])
    }

    fn read_u16(&mut self) -> Result<u16, DecodeError> {
        let bytes = self.take(2)?;
        Ok(u16::from_be_bytes([bytes[0], bytes[1]]))
    }

    fn read_u32(&mut self) -> Result<u32, DecodeError> {
        let bytes = self.take(4)?;
        Ok(u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    fn take(&mut self, length: usize) -> Result<&'a [u8], DecodeError> {
        let end = self
            .offset
            .checked_add(length)
            .ok_or(DecodeError::TooShort)?;
        let value = self
            .bytes
            .get(self.offset..end)
            .ok_or(DecodeError::TooShort)?;
        self.offset = end;
        Ok(value)
    }

    fn is_finished(&self) -> bool {
        self.offset == self.bytes.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn envelope() -> GaiaEnvelope {
        GaiaEnvelope {
            sender: "@alice:gaia.local".to_owned(),
            recipient: "@bob:gaia.local".to_owned(),
            payload_ciphertext: vec![1, 2, 3, 4],
            signature: vec![5; 64],
        }
    }

    #[test]
    fn round_trip_is_exact() {
        let original = envelope();
        let encoded = match encode(&original) {
            Ok(value) => value,
            Err(error) => panic!("encode failed: {error:?}"),
        };
        assert_eq!(decode(&encoded), Ok(original));
    }

    #[test]
    fn rejects_trailing_data_and_truncation() {
        let mut encoded = match encode(&envelope()) {
            Ok(value) => value,
            Err(error) => panic!("encode failed: {error:?}"),
        };
        encoded.push(0xff);
        assert_eq!(decode(&encoded), Err(DecodeError::TrailingData));
        encoded.truncate(7);
        assert_eq!(decode(&encoded), Err(DecodeError::TooShort));
    }

    #[test]
    fn rejects_oversized_fields_before_allocation() {
        let oversized = GaiaEnvelope {
            sender: "a".repeat(MAX_IDENTITY_BYTES + 1),
            ..envelope()
        };
        assert_eq!(encode(&oversized), Err(EncodeError::SenderTooLong));

        let encoded = [
            vec![ENVELOPE_VERSION],
            ((MAX_IDENTITY_BYTES + 1) as u16).to_be_bytes().to_vec(),
        ]
        .concat();
        assert_eq!(decode(&encoded), Err(DecodeError::SenderTooLong));
    }
}
