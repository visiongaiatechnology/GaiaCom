export function fingerprintKey(key) {
  if (!key || typeof key !== 'string') return '';
  return `${key.slice(0, 16)}...${key.slice(-16)}`;
}

export function buildInitialKeyHistory(publicKey, confirmed = true) {
  if (!publicKey) return [];
  const now = new Date().toISOString();
  return [{
    fingerprint: fingerprintKey(publicKey),
    publicKey,
    firstSeenAt: now,
    lastSeenAt: now,
    confirmed,
    warning: ''
  }];
}

export function appendKeyHistory(contact, nextPublicKey, confirmed) {
  const now = new Date().toISOString();
  const history = Array.isArray(contact.keyHistory) ? contact.keyHistory : buildInitialKeyHistory(contact.publicKey, true);
  const existing = history.find(entry => entry.publicKey === nextPublicKey);
  if (existing) {
    return history.map(entry => entry.publicKey === nextPublicKey ? { ...entry, lastSeenAt: now, confirmed } : entry);
  }
  return [
    {
      fingerprint: fingerprintKey(nextPublicKey),
      publicKey: nextPublicKey,
      firstSeenAt: now,
      lastSeenAt: now,
      confirmed,
      warning: ''
    },
    ...history
  ];
}
