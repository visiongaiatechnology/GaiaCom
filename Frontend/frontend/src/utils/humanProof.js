// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { safeJsonParse } from './safeJson';

const HUMAN_PROOF_PREFIX = 'gaia_human_proof_v1_';
const HUMAN_PROOF_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const HUMAN_PROOF_WORDS = [
  'orbit', 'signal', 'atlas', 'nova', 'cipher', 'anchor', 'vector', 'pulse',
  'matrix', 'lumen', 'quantum', 'bridge', 'kernel', 'prism', 'zenith', 'vault'
];

function storageKey(gaiaId) {
  return `${HUMAN_PROOF_PREFIX}${String(gaiaId || '').toLowerCase()}`;
}

export function getHumanProof(gaiaId) {
  if (!gaiaId) return null;
  const proof = safeJsonParse(localStorage.getItem(storageKey(gaiaId)), null);
  if (!proof || typeof proof !== 'object') return null;
  if (Number(proof.completedAt || 0) + HUMAN_PROOF_TTL_MS <= Date.now()) return null;
  return proof;
}

export function saveHumanProof(gaiaId, proof) {
  if (!gaiaId || !proof) return;
  localStorage.setItem(storageKey(gaiaId), JSON.stringify(proof));
}

export function createHumanProofChallenge(gaiaId) {
  const random = new Uint32Array(4);
  window.crypto.getRandomValues(random);
  const words = Array.from(random, value => HUMAN_PROOF_WORDS[value % HUMAN_PROOF_WORDS.length]);
  return {
    phrase: `GAIA HUMAN ${words.join(' ').toUpperCase()}`,
    salt: Array.from(random, value => value.toString(16).padStart(8, '0')).join(''),
    gaiaId,
    createdAt: Date.now()
  };
}

export function buildHumanProofPayload(proof) {
  return {
    version: proof.version,
    gaiaId: proof.gaiaId,
    displayName: proof.displayName,
    challengeHash: proof.challengeHash,
    digest: proof.digest,
    iterations: proof.iterations,
    durationMs: proof.durationMs,
    completedAt: proof.completedAt,
    algorithm: proof.algorithm
  };
}

export function createHumanProofWorker() {
  const workerSource = `
    const encoder = new TextEncoder();
    const bytesToHex = bytes => Array.from(bytes).map(value => value.toString(16).padStart(2, '0')).join('');
    async function sha256(text) {
      const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
      return bytesToHex(new Uint8Array(digest));
    }
    self.onmessage = async event => {
      const { gaiaId, phrase, salt, durationMs, startedAt } = event.data || {};
      const targetMs = Math.max(1000, Number(durationMs) || 300000);
      const start = Number(startedAt) || Date.now();
      const deadline = start + targetMs;
      let iterations = 0;
      let digest = await sha256([gaiaId, phrase, salt, start].join('|'));
      const challengeHash = await sha256([gaiaId, phrase, salt].join('|'));
      while (Date.now() < deadline) {
        digest = await sha256([digest, iterations, gaiaId, salt].join('|'));
        iterations += 1;
        if (iterations % 64 === 0) {
          self.postMessage({
            type: 'progress',
            progress: Math.min(0.99, (Date.now() - start) / targetMs),
            iterations,
            digest
          });
        }
      }
      self.postMessage({
        type: 'done',
        progress: 1,
        iterations,
        digest,
        challengeHash,
        durationMs: Date.now() - start,
        completedAt: Date.now()
      });
    };
  `;
  const blob = new Blob([workerSource], { type: 'text/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);
  URL.revokeObjectURL(workerUrl);
  return worker;
}
