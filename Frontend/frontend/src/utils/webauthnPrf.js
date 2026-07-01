// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import * as crypto from '../crypto';

const DEVICE_UNLOCK_KDF_ITERATIONS = 600000;

function toBase64Url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function randomBytes(length) {
  return window.crypto.getRandomValues(new Uint8Array(length));
}

function requireWebAuthnPrf() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('WebAuthn ist auf diesem Geraet nicht verfuegbar.');
  }
}

function extractPrfSecret(credential) {
  const results = credential?.getClientExtensionResults?.();
  const first = results?.prf?.results?.first;
  if (!first) {
    throw new Error('Dieser Authenticator unterstuetzt WebAuthn PRF nicht.');
  }
  return crypto.bytesToHex(new Uint8Array(first));
}

export function hasWebAuthnSupport() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

export async function createWebAuthnMnemonicEnvelope({ userId, username, mnemonic }) {
  requireWebAuthnPrf();
  if (!userId || !mnemonic) {
    throw new Error('WebAuthn Unlock benoetigt einen entsperrten Account.');
  }

  const salt = randomBytes(32);
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'GaiaCOM' },
      user: {
        id: randomBytes(16),
        name: username || userId,
        displayName: username || 'GaiaCOM User'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required'
      },
      attestation: 'none',
      timeout: 60000,
      extensions: {
        prf: {
          eval: {
            first: salt
          }
        }
      }
    }
  });

  const secret = extractPrfSecret(credential);
  const encrypted = await crypto.encryptMnemonic(mnemonic, secret, DEVICE_UNLOCK_KDF_ITERATIONS);
  return {
    version: 1,
    type: 'webauthn-prf-mnemonic',
    credentialId: toBase64Url(credential.rawId),
    salt: toBase64Url(salt),
    userId,
    encrypted
  };
}

export async function decryptWebAuthnMnemonicEnvelope(record) {
  requireWebAuthnPrf();
  if (!record || record.type !== 'webauthn-prf-mnemonic' || !record.credentialId || !record.salt || !record.encrypted) {
    throw new Error('WebAuthn Unlock Record ist ungueltig.');
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [
        {
          type: 'public-key',
          id: fromBase64Url(record.credentialId)
        }
      ],
      userVerification: 'required',
      timeout: 60000,
      extensions: {
        prf: {
          eval: {
            first: fromBase64Url(record.salt)
          }
        }
      }
    }
  });

  const secret = extractPrfSecret(credential);
  return crypto.decryptMnemonic(record.encrypted, secret);
}
