import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { base64ToHex, presentAttestation } from '../utils/attestations';

/**
 * Loads and verifies the attestations (badges) of one identity.
 *
 * Trust anchor: the signing key is pinned to the serving node's discovery
 * document (`/.well-known/gaiacom/server`), not to the key included in the
 * attestation response. Only claims whose signed canonical payload matches the
 * displayed fields and whose issuer domain is scoped by the serving node are
 * rendered as verified.
 */
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

export default function useAttestations(gaiaID) {
  const clean = String(gaiaID || '').trim().replace(/^@/, '');
  const cacheKey = clean.toLowerCase();
  const cached = cacheKey ? cache.get(cacheKey) : null;
  const [state, setState] = useState(() => ({
    loading: Boolean(clean) && !(cached && Date.now() - cached.at < CACHE_TTL_MS),
    attestations: cached && Date.now() - cached.at < CACHE_TTL_MS ? cached.attestations : [],
    error: ''
  }));

  useEffect(() => {
    let active = true;
    if (!clean) {
      setState({ loading: false, attestations: [], error: '' });
      return () => { active = false; };
    }
    const fresh = cache.get(cacheKey);
    if (fresh && Date.now() - fresh.at < CACHE_TTL_MS) {
      setState({ loading: false, attestations: fresh.attestations, error: '' });
      return () => { active = false; };
    }
    setState(prev => ({ ...prev, loading: true, error: '' }));

    const trust = api.getServerDiscovery().then(discovery => ({
      trustedKeyHex: discovery?.ed25519_public_key ? base64ToHex(discovery.ed25519_public_key) : '',
      nodeName: String(discovery?.server_name || '')
    })).catch(() => ({ trustedKeyHex: '', nodeName: '' }));

    Promise.all([api.getIdentityAttestations(clean), trust])
      .then(([response, anchor]) => {
        const raw = Array.isArray(response?.attestations) ? response.attestations : [];
        const list = raw.map(record => presentAttestation(record, {
          expectedSubject: clean,
          trustedKeyHex: anchor.trustedKeyHex,
          nodeName: anchor.nodeName
        }));
        cache.set(cacheKey, { at: Date.now(), attestations: list });
        if (active) setState({ loading: false, attestations: list, error: '' });
      })
      .catch(error => {
        if (active) {
          setState({
            loading: false,
            attestations: [],
            error: error?.message || 'Attestierungen konnten nicht geladen werden.'
          });
        }
      });
    return () => { active = false; };
  }, [cacheKey, clean]);

  const validAttestations = useMemo(
    () => state.attestations.filter(entry => entry.status === 'valid' && entry.signatureValid),
    [state.attestations]
  );

  return {
    ...state,
    validAttestations
  };
}

export function invalidateAttestationCache(gaiaID) {
  const key = String(gaiaID || '').trim().replace(/^@/, '').toLowerCase();
  if (key) cache.delete(key);
  else cache.clear();
}
