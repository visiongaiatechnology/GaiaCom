import { ed25519 } from '@noble/curves/ed25519.js';
import { hexToBytes } from '../crypto/format.js';

/**
 * Client-side verification helpers for identity attestations (badges).
 *
 * The server returns the exact canonical payload it signed plus the Ed25519
 * signature and the issuer public key. The client verifies that signature over
 * the supplied canonical bytes (no re-canonicalisation), so a badge is only
 * rendered as "verified" when the cryptographic claim actually checks out.
 */

export const ATTESTATION_TYPES = {
  human: {
    label: 'Mensch',
    short: 'Human',
    icon: 'user',
    description: 'Von einem Node-Operator nach persönlicher Prüfung bestätigt.'
  },
  organization: {
    label: 'Organisation',
    short: 'Organisation',
    icon: 'users',
    description: 'Organisation mit Domain-/Rechtsnachweis, durch den Node bestätigt.'
  },
  node_operator: {
    label: 'Node-Operator',
    short: 'Node-Operator',
    icon: 'server',
    description: 'Durch Governance als Node-Operator bestätigt.'
  },
  moderator: {
    label: 'Moderator',
    short: 'Moderator',
    icon: 'shieldCheck',
    description: 'Durch Governance als Moderator/Reviewer bestätigt.'
  },
  official: {
    label: 'Offiziell',
    short: 'Offiziell',
    icon: 'seal',
    description: 'Durch Governance-Beschluss als offizielle Stelle bestätigt.'
  }
};

export function describeAttestationType(type) {
  return ATTESTATION_TYPES[String(type || '')] || {
    label: String(type || 'Unbekannt'),
    short: String(type || 'Unbekannt'),
    icon: 'verified',
    description: 'Unbekannter Attestierungs-Typ.'
  };
}

export function verifyAttestationSignature(attestation) {
  if (!attestation || typeof attestation !== 'object') {
    return { valid: false, reason: 'missing' };
  }
  const canonical = attestation.canonical;
  const signatureHex = attestation.signature_hex || attestation.signature;
  const publicKeyHex = attestation.signing_public_key_hex || attestation.public_key_hex;
  if (!canonical || !signatureHex || !publicKeyHex) {
    return { valid: false, reason: 'incomplete' };
  }
  try {
    const signature = hexToBytes(String(signatureHex));
    const publicKey = hexToBytes(String(publicKeyHex));
    const message = new TextEncoder().encode(String(canonical));
    return { valid: ed25519.verify(signature, message, publicKey), reason: 'checked' };
  } catch (error) {
    // Malformed hex or an unsupported key length means the client cannot prove
    // the signature; treat the claim as unverified instead of throwing.
    void error;
    return { valid: false, reason: 'invalid-encoding' };
  }
}

/** Presentation tone for a claim: revoked > expired > invalid signature > valid. */
export function attestationTone(status, signatureValid) {
  if (status === 'revoked') return 'danger';
  if (status === 'expired') return 'muted';
  return signatureValid ? 'valid' : 'warning';
}

/**
 * Normalise one server attestation into a presentation record.
 * `status` is the server verdict (valid/expired/revoked), `signatureValid`
 * the independent client check.
 */
export function presentAttestation(attestation) {
  const type = String(attestation?.type || '');
  const meta = describeAttestationType(type);
  const status = String(attestation?.status || 'valid');
  const signature = verifyAttestationSignature(attestation);
  return {
    ...attestation,
    type,
    typeMeta: meta,
    status,
    signatureValid: signature.valid,
    signatureReason: signature.reason,
    isExpired: status === 'expired',
    isRevoked: status === 'revoked',
    tone: attestationTone(status, signature.valid)
  };
}

export function formatAttestationDate(value, language = 'de') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return date.toLocaleDateString(language, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (_) {
    return date.toISOString().slice(0, 10);
  }
}
