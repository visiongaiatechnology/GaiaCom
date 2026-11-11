import { parsePayload } from '../../../utils/payload';

/**
 * Message-security truth derivation for the chat surfaces (MOCK_REGISTER M-13/M-15).
 *
 * The client holds the real evidence in the received envelope: the encrypted
 * message envelope is delivered as base64 JSON and `utils/payload.parsePayload`
 * exposes its `algorithm_suite` string (the same value the crypto layer binds
 * into the AEAD AAD). We therefore never render a hardcoded suite name; the
 * profile label is classified from the actual string and the full suite is kept
 * in the tooltip. Messages without envelope metadata fall back to an explicit
 * "nicht bestätigt" state instead of a positive claim.
 */

const PROFILE_RULES = [
  { pattern: /top-secret/i, label: 'Top-Secret', variant: 'secret' },
  { pattern: /sovereign/i, label: 'Sovereign', variant: 'info' },
  { pattern: /hybrid-kem/i, label: 'Hybrid-KEM', variant: 'info' }
];

/* Extracts algorithm names only from the received suite string — never invents
   a primitive that the envelope did not carry. */
const ALGORITHM_PATTERN = /(X25519|XChaCha20-Poly1305|ML-KEM-\d+|HQC-\d+|AES-\d+-GCM(?:-SIV)?|Twofish-\d+-EAX|Serpent-\d+-CTR(?:-HMAC-SHA3-\d+)?|Ed25519|ML-DSA-\d+)/g;

export function describeSuite(suite) {
  const raw = typeof suite === 'string' ? suite.trim() : '';
  if (!raw) return null;
  const rule = PROFILE_RULES.find(entry => entry.pattern.test(raw));
  const algorithms = Array.from(new Set(raw.match(ALGORITHM_PATTERN) || []));
  return {
    raw,
    profile: rule ? rule.label : 'Unbestimmt',
    variant: rule ? rule.variant : 'info',
    algorithms
  };
}

/** Suite metadata of one message, read from its delivered envelope. */
export function suiteFromMessage(message) {
  try {
    const envelope = parsePayload(message?.rawPayload);
    return describeSuite(envelope?.algorithm_suite || envelope?.algorithmSuite || '');
  } catch (_) {
    return null;
  }
}

/** Suite index for messages that are explicitly flagged as top-secret. */
export function buildTopSecretSuiteIndex(messages) {
  const index = {};
  const list = Array.isArray(messages) ? messages : [];
  list.forEach(message => {
    if (message?.topSecret === true) {
      index[message.id] = suiteFromMessage(message);
    }
  });
  return index;
}

export function suiteAlgorithmLabel(suiteInfo) {
  if (!suiteInfo) return 'Suite nicht bestätigt';
  if (suiteInfo.algorithms.length > 0) return suiteInfo.algorithms.join(' + ');
  return suiteInfo.profile;
}

function lastMessageOf(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list.length > 0 ? list[list.length - 1] : null;
}

const UNKNOWN_STATE = {
  key: 'unknown',
  variant: 'idle',
  icon: 'help',
  label: 'Verschlüsselung: nicht bestätigt',
  detail: 'Für diesen Verlauf liegt keine Suite-Angabe im Envelope und kein veröffentlichter Kontaktschlüssel vor. Der Client attestiert keine Algorithmus-Suite.'
};

/**
 * M-13: security context of a 1:1 conversation.
 * Cancellation order: legacy/untrusted evidence wins over any suite claim.
 */
export function deriveDirectSecurityState({ topSecretActive = false, contact = null, messages = [] } = {}) {
  const last = lastMessageOf(messages);
  const suite = last ? suiteFromMessage(last) : null;
  const keyPublished = Boolean(contact?.publicKey);
  const modeHint = topSecretActive
    ? ' Der Top-Secret-Modus ist für neue Nachrichten aktiv (Sende-Pfad prüft die ML-DSA-87-Fähigkeit des Kontakts).'
    : '';

  if (last?.isSmtp === true) {
    return {
      key: 'legacy',
      variant: 'warn',
      icon: 'alertTriangle',
      label: 'Legacy-Nachricht (nicht E2E)',
      detail: 'Die letzte Nachricht kam über den SMTP-Legacy-Pfad und ist nicht Ende-zu-Ende verschlüsselt.'
    };
  }

  if (last?.untrusted === true) {
    return {
      key: 'untrusted',
      variant: 'warn',
      icon: 'alertTriangle',
      label: 'Inhalt nicht verifiziert',
      detail: 'Die letzte Nachricht ist vom Server als nicht vertrauenswürdig markiert.'
    };
  }

  if (suite) {
    return {
      key: 'suite',
      variant: suite.variant,
      icon: suite.variant === 'secret' ? 'lock' : 'shieldCheck',
      label: `E2E-Suite: ${suite.profile}`,
      detail: `Suite aus dem Envelope der letzten Nachricht: ${suite.raw}.${modeHint}`
    };
  }

  if (last?.topSecret === true) {
    return {
      key: 'top-secret',
      variant: 'secret',
      icon: 'lock',
      label: 'Top Secret (Suite nicht angegeben)',
      detail: 'Die letzte Nachricht ist als Top-Secret markiert, ihr Envelope enthält aber keine Suite-Angabe.'
    };
  }

  if (topSecretActive) {
    return {
      key: 'top-secret-mode',
      variant: 'secret',
      icon: 'lock',
      label: 'Top Secret: neue Nachrichten',
      detail: `Der Top-Secret-Modus ist für diesen Chat aktiv; der Sende-Pfad prüft die ML-DSA-87-Fähigkeit des Kontakts. Für die letzte Nachricht liegt keine Suite-Angabe vor.`
    };
  }

  if (keyPublished) {
    return {
      key: 'key-only',
      variant: 'info',
      icon: 'key',
      label: 'E2E (Suite nicht bestätigt)',
      detail: 'Der Kontakt hat einen veröffentlichten Identitätsschlüssel. Für die letzte Nachricht liegt keine Suite-Angabe vor, daher wird keine Suite behauptet.'
    };
  }

  return UNKNOWN_STATE;
}

/**
 * M-15: security state of a group channel.
 * Room flags come from the room payload; the suite comes from the last delivered
 * channel envelope. Nothing is inferred from `isPrivate`.
 */
export function deriveGroupSecurityState({ room = null, messages = [] } = {}) {
  const last = lastMessageOf(messages);
  const suite = last ? suiteFromMessage(last) : null;
  const roomTopSecret = Boolean(room?.TopSecret || room?.topSecret);
  const readOnly = Boolean(room?.ReadOnly || room?.readOnly);

  if (last?.isSmtp === true) {
    return {
      key: 'legacy',
      variant: 'warn',
      icon: 'alertTriangle',
      label: 'Kanal: Legacy-Inhalt (nicht E2E)',
      detail: 'Die letzte Kanalnachricht kam über den SMTP-Legacy-Pfad und ist nicht Ende-zu-Ende verschlüsselt.'
    };
  }

  if (last?.untrusted === true) {
    return {
      key: 'untrusted',
      variant: 'warn',
      icon: 'alertTriangle',
      label: 'Kanal: Inhalt nicht verifiziert',
      detail: 'Die letzte Kanalnachricht ist vom Server als nicht vertrauenswürdig markiert.'
    };
  }

  if (roomTopSecret) {
    return {
      key: 'room-top-secret',
      variant: 'secret',
      icon: 'lock',
      label: 'Top-Secret-Raummodus',
      detail: suite
        ? `Der Raum ist für Top-Secret-Nachrichten konfiguriert. Suite der letzten Kanalnachricht: ${suite.raw}.`
        : 'Der Raum ist für Top-Secret-Nachrichten konfiguriert. Für die letzte Kanalnachricht liegt keine Suite-Angabe vor.'
    };
  }

  if (suite) {
    return {
      key: 'suite',
      variant: suite.variant,
      icon: suite.variant === 'secret' ? 'lock' : 'shieldCheck',
      label: `E2E-Suite: ${suite.profile}`,
      detail: `Suite aus dem Envelope der letzten Kanalnachricht: ${suite.raw}.`
    };
  }

  if (last?.topSecret === true) {
    return {
      key: 'top-secret',
      variant: 'secret',
      icon: 'lock',
      label: 'Top-Secret-Inhalt (Suite nicht angegeben)',
      detail: 'Die letzte Kanalnachricht ist als Top-Secret markiert, ihr Envelope enthält aber keine Suite-Angabe.'
    };
  }

  if (readOnly) {
    return {
      key: 'read-only',
      variant: 'info',
      icon: 'lock',
      label: 'Nur-Lesen (Suite nicht bestätigt)',
      detail: 'Der Raum ist schreibgeschützt; für die letzte Kanalnachricht liegt keine Suite-Angabe vor.'
    };
  }

  return {
    ...UNKNOWN_STATE,
    detail: 'Der Raum meldet keine Suite und der Client attestiert keine Algorithmus-Suite für den Kanal.'
  };
}