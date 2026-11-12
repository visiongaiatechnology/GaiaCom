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
    description: 'Vom Node ausgestellte Mensch-Angabe; keine amtliche Identitätsprüfung.'
  },
  organization: {
    label: 'Organisation',
    short: 'Organisation',
    icon: 'users',
    description: 'Vom Node ausgestellte Organisations-Angabe; Evidenz wird nicht automatisch geprüft.'
  },
  node_operator: {
    label: 'Node-Operator',
    short: 'Node-Operator',
    icon: 'server',
    description: 'Vom Node ausgestellte Governance-Angabe; die Rolle wird serverseitig geprüft.'
  },
  moderator: {
    label: 'Moderator',
    short: 'Moderator',
    icon: 'shieldCheck',
    description: 'Vom Node ausgestellte Governance-Angabe; die Rolle wird serverseitig geprüft.'
  },
  official: {
    label: 'Offiziell',
    short: 'Offiziell',
    icon: 'seal',
    description: 'Vom Node ausgestellte Angabe; keine amtliche oder behördliche Bestätigung.'
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

function normalizeGaiaID(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function normalizeHex(value) {
  return String(value || '').trim().toLowerCase();
}

export function issuerDomain(issuerGaiaID) {
  const clean = String(issuerGaiaID || '').trim().replace(/^@+/, '');
  const separator = clean.lastIndexOf(':');
  return separator >= 0 ? clean.slice(separator + 1).toLowerCase() : '';
}

/** Base64 (standard) → lowercase hex, used for the discovery Ed25519 key. */
export function base64ToHex(value) {
  const binary = atob(String(value || ''));
  let hex = '';
  for (let index = 0; index < binary.length; index += 1) {
    hex += binary.codePointAt(index).toString(16).padStart(2, '0');
  }
  return hex;
}

/** Parse the signed canonical claim. Never trust the outer display fields alone. */
export function parseCanonicalClaim(canonical) {
  if (typeof canonical !== 'string' || !canonical) return null;
  try {
    const claim = JSON.parse(canonical);
    if (!claim || typeof claim !== 'object' || claim.version !== 'gaia-attestation-v1') return null;
    if (!claim.subject || !claim.type || !claim.issuer || !claim.authority) return null;
    if (!claim.evidence_ref || !claim.issued_at || !claim.expires_at) return null;
    return claim;
  } catch {
    return null;
  }
}

/**
 * Verify an attestation against the *trusted* serving-node key instead of the
 * key supplied in the same response. Only signed canonical fields are accepted
 * for display; a mismatch between the signed claim and the outer JSON marks the
 * badge unverified.
 */
export function verifyAttestationSignature(attestation, options = {}) {
  if (!attestation || typeof attestation !== 'object') {
    return { valid: false, reason: 'missing' };
  }
  const canonical = attestation.canonical;
  const signatureHex = attestation.signature_hex || attestation.signature;
  const publicKeyHex = normalizeHex(attestation.signing_public_key_hex || attestation.public_key_hex);
  if (!canonical || !signatureHex || !publicKeyHex) {
    return { valid: false, reason: 'incomplete' };
  }
  const claim = parseCanonicalClaim(canonical);
  if (!claim) {
    return { valid: false, reason: 'invalid-canonical' };
  }
  const expectedSubject = normalizeGaiaID(options.expectedSubject);
  if (expectedSubject && normalizeGaiaID(claim.subject) !== expectedSubject) {
    return { valid: false, reason: 'subject-mismatch' };
  }
  if (normalizeGaiaID(claim.issuer) !== normalizeGaiaID(attestation.issuer_gaia_id || attestation.issuer)) {
    return { valid: false, reason: 'issuer-mismatch' };
  }
  if (String(claim.type) !== String(attestation.type)) {
    return { valid: false, reason: 'type-mismatch' };
  }
  if (String(claim.authority) !== String(attestation.authority)) {
    return { valid: false, reason: 'authority-mismatch' };
  }
  if (String(claim.expires_at) !== String(attestation.expires_at || '')) {
    return { valid: false, reason: 'expiry-mismatch' };
  }
  const trustedKey = normalizeHex(options.trustedKeyHex);
  if (!trustedKey || publicKeyHex !== trustedKey) {
    return { valid: false, reason: 'untrusted-key' };
  }
  if (options.nodeName) {
    const nodeName = String(options.nodeName).trim().toLowerCase();
    const domain = issuerDomain(claim.issuer);
    const inNodeScope = domain && (domain === nodeName || nodeName.endsWith(`.${domain}`));
    if (!inNodeScope) {
      return { valid: false, reason: 'untrusted-issuer' };
    }
  }
  try {
    const signature = hexToBytes(String(signatureHex));
    const message = new TextEncoder().encode(String(canonical));
    return { valid: ed25519.verify(signature, message, hexToBytes(trustedKey)), reason: 'checked' };
  } catch {
    // Malformed hex or an unsupported key length means the client cannot prove
    // the signature; treat the claim as unverified instead of throwing.
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
export function presentAttestation(attestation, options = {}) {
  const type = String(attestation?.type || '');
  const meta = describeAttestationType(type);
  const status = String(attestation?.status || 'valid');
  const signature = verifyAttestationSignature(attestation, options);
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
