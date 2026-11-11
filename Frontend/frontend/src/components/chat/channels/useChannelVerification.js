import { useCallback, useEffect, useState } from 'react';
import * as api from '../../../api';

/**
 * Live verification authority for public channels.
 *
 * Source of truth: `GET /api/v1/public/transparency`
 * (Backend/governance/handler.go:728 `GetPublicTransparency`) which serves the
 * role-credential registry: credentials + revocations. A credential counts as a
 * valid verification authority only when it is a `node_operator` credential,
 * not revoked and currently inside its validity window. Nothing is cached
 * locally and there is no static fallback identity: when the registry cannot be
 * read the state becomes `unavailable`/`denied` and the UI says so.
 */
const NODE_OPERATOR_ROLE = 'node_operator';

function classifyError(error) {
  const message = String(error?.message || error || '');
  if (/forbidden|unauthorized|not authorized|\b40[13]\b/i.test(message)) return 'denied';
  return 'unavailable';
}

function isWithinValidity(credential, now) {
  const from = credential?.validFrom ? new Date(credential.validFrom).getTime() : 0;
  const until = credential?.validUntil ? new Date(credential.validUntil).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isNaN(from) || Number.isNaN(until)) return false;
  return from <= now && now <= until;
}

function deriveOperators(registry) {
  const credentials = Array.isArray(registry?.credentials) ? registry.credentials : [];
  const revocations = Array.isArray(registry?.revocations) ? registry.revocations : [];
  const revokedIds = new Set(
    revocations.map(revocation => String(revocation?.credentialId || '')).filter(Boolean)
  );
  const now = Date.now();

  return credentials
    .filter(credential => String(credential?.role || '') === NODE_OPERATOR_ROLE)
    .filter(credential => !revokedIds.has(String(credential?.id || '')))
    .filter(credential => isWithinValidity(credential, now))
    .map(credential => ({
      credentialId: String(credential.id || ''),
      gaiaId: String(credential.subjectIdentity || ''),
      issuer: String(credential.issuer || ''),
      validUntil: credential.validUntil || '',
      signature: String(credential.signature || '')
    }))
    .filter(operator => operator.gaiaId);
}

export default function useChannelVerification({ enabled = true } = {}) {
  const [state, setState] = useState({ status: 'idle', operators: [], error: '', fetchedAt: '' });

  const loadVerification = useCallback(async () => {
    if (!enabled) {
      setState({ status: 'idle', operators: [], error: '', fetchedAt: '' });
      return;
    }
    setState(previous => ({ ...previous, status: previous.status === 'ok' ? 'refreshing' : 'loading', error: '' }));
    try {
      const registry = await api.getPublicTransparency();
      setState({
        status: 'ok',
        operators: deriveOperators(registry),
        error: '',
        fetchedAt: new Date().toISOString()
      });
    } catch (error) {
      setState({ status: classifyError(error), operators: [], error: error?.message || '', fetchedAt: '' });
    }
  }, [enabled]);

  useEffect(() => {
    loadVerification();
  }, [loadVerification]);

  return { verification: state, refreshVerification: loadVerification };
}
