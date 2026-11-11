import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { presentAttestation } from '../utils/attestations';

/**
 * Loads and verifies the attestations (badges) of one identity.
 *
 * Results are cached per GaiaID for a short time so the same profile opened in
 * chat, contact profile and GSN does not trigger repeated requests. Every entry
 * is signature-verified client-side; the server's status is kept separately.
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
    api.getIdentityAttestations(clean)
      .then(response => {
        const list = Array.isArray(response?.attestations)
          ? response.attestations.map(presentAttestation)
          : [];
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
