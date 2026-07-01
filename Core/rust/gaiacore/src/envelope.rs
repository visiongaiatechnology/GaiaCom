// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GaiaEnvelope {
    pub sender: String,
    pub recipient: String,
    pub payload_ciphertext: Vec<u8>,
    pub signature: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecodeError {
    TooShort,
    InvalidVersion(u8),
    InvalidString(std::string::FromUtf8Error),
}

pub fn encode(envelope: &GaiaEnvelope) -> Vec<u8> {
    let mut bytes = Vec::new();
    bytes.push(0x01); // Version byte
    
    let sender_bytes = envelope.sender.as_bytes();
    let sender_len = sender_bytes.len() as u16;
    bytes.extend_from_slice(&sender_len.to_be_bytes());
    bytes.extend_from_slice(sender_bytes);
    
    let recipient_bytes = envelope.recipient.as_bytes();
    let recipient_len = recipient_bytes.len() as u16;
    bytes.extend_from_slice(&recipient_len.to_be_bytes());
    bytes.extend_from_slice(recipient_bytes);
    
    let payload_len = envelope.payload_ciphertext.len() as u32;
    bytes.extend_from_slice(&payload_len.to_be_bytes());
    bytes.extend_from_slice(&envelope.payload_ciphertext);
    
    let signature_len = envelope.signature.len() as u16;
    bytes.extend_from_slice(&signature_len.to_be_bytes());
    bytes.extend_from_slice(&envelope.signature);
    
    bytes
}

pub fn decode(bytes: &[u8]) -> Result<GaiaEnvelope, DecodeError> {
    if bytes.is_empty() {
        return Err(DecodeError::TooShort);
    }
    let version = bytes[0];
    if version != 0x01 {
        return Err(DecodeError::InvalidVersion(version));
    }
    
    let mut offset = 1;
    
    if bytes.len() < offset + 2 {
        return Err(DecodeError::TooShort);
    }
    let sender_len = u16::from_be_bytes([bytes[offset], bytes[offset+1]]) as usize;
    offset += 2;
    if bytes.len() < offset + sender_len {
        return Err(DecodeError::TooShort);
    }
    let sender = String::from_utf8(bytes[offset..offset+sender_len].to_vec())
        .map_err(DecodeError::InvalidString)?;
    offset += sender_len;
    
    if bytes.len() < offset + 2 {
        return Err(DecodeError::TooShort);
    }
    let recipient_len = u16::from_be_bytes([bytes[offset], bytes[offset+1]]) as usize;
    offset += 2;
    if bytes.len() < offset + recipient_len {
        return Err(DecodeError::TooShort);
    }
    let recipient = String::from_utf8(bytes[offset..offset+recipient_len].to_vec())
        .map_err(DecodeError::InvalidString)?;
    offset += recipient_len;
    
    if bytes.len() < offset + 4 {
        return Err(DecodeError::TooShort);
    }
    let payload_len = u32::from_be_bytes([
        bytes[offset],
        bytes[offset+1],
        bytes[offset+2],
        bytes[offset+3],
    ]) as usize;
    offset += 4;
    if bytes.len() < offset + payload_len {
        return Err(DecodeError::TooShort);
    }
    let payload_ciphertext = bytes[offset..offset+payload_len].to_vec();
    offset += payload_len;
    
    if bytes.len() < offset + 2 {
        return Err(DecodeError::TooShort);
    }
    let signature_len = u16::from_be_bytes([bytes[offset], bytes[offset+1]]) as usize;
    offset += 2;
    if bytes.len() < offset + signature_len {
        return Err(DecodeError::TooShort);
    }
    let signature = bytes[offset..offset+signature_len].to_vec();
    
    Ok(GaiaEnvelope {
        sender,
        recipient,
        payload_ciphertext,
        signature,
    })
}
