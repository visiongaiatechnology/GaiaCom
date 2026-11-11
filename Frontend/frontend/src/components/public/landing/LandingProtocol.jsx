import React from 'react';
import { useTranslation } from '../../../utils/i18n';

const LEDGER = [
  { labelKey: 'lp_protocol_keyexchange', value: 'X25519', noteKey: 'lp_protocol_note_classic' },
  { labelKey: 'lp_protocol_pqkem', value: 'ML-KEM-1024 + HQC-256', noteKey: 'lp_protocol_note_pqkem' },
  { labelKey: 'lp_protocol_signature', value: 'Ed25519 / ML-DSA-87', noteKey: 'lp_protocol_note_signature' },
  { labelKey: 'lp_protocol_kdf', value: 'HKDF-SHA3-512', noteKey: 'lp_protocol_note_kdf' },
  { labelKey: 'lp_protocol_aead', value: 'AES-256-GCM + Twofish-256-EAX', noteKey: 'lp_protocol_note_aead' },
  { labelKey: 'lp_protocol_toptsecret', valueKey: 'lp_protocol_value_toptsecret', value: 'Vier-Chiffren-Kaskade', noteKey: 'lp_protocol_note_toptsecret' },
  { labelKey: 'lp_protocol_provider', valueKey: 'lp_protocol_value_provider', value: 'WASM + isolierter Worker', noteKey: 'lp_protocol_note_provider' },
  { labelKey: 'lp_protocol_federation', valueKey: 'lp_protocol_value_federation', value: 'Signierte PDUs', noteKey: 'lp_protocol_note_federation' }
];

export default function LandingProtocol() {
  const { t } = useTranslation();
  return (
    <section className="vgt-protocol" id="protokoll" aria-labelledby="vgt-protocol-title">
      <div className="vgt-section-head">
        <p className="vgt-eyebrow">{t('lp_protocol_eyebrow') || 'Protokoll-Ledger'}</p>
        <h2 className="vgt-h2" id="vgt-protocol-title">
          {t('lp_protocol_title') || 'Nachvollziehbare Kryptografie statt Vertrauensversprechen.'}
        </h2>
        <p className="vgt-body">
          {t('lp_protocol_intro') || 'GaiaCom kombiniert einen klassischen Austausch mit zwei unabhängigen Post-Quanten-KEMs. Ein Downgrade auf ein schwächeres Profil wird bei gewähltem Sovereign-Profil verweigert.'}
        </p>
      </div>

      <div className="vgt-ledger" role="table" aria-label={t('lp_protocol_eyebrow') || 'Protokoll-Ledger'}>
        <div className="vgt-ledger__head" role="row">
          <span role="columnheader">{t('lp_protocol_col_layer') || 'Ebene'}</span>
          <span role="columnheader">{t('lp_protocol_col_suite') || 'Suite'}</span>
          <span role="columnheader">{t('lp_protocol_col_note') || 'Anmerkung'}</span>
        </div>
        {LEDGER.map((row) => (
          <div className="vgt-ledger__row" role="row" key={row.labelKey}>
            <span className="vgt-ledger__label" role="cell">{t(row.labelKey)}</span>
            <span className="vgt-ledger__value vgt-mono" role="cell">{row.valueKey ? (t(row.valueKey) || row.value) : row.value}</span>
            <span className="vgt-ledger__note" role="cell">{t(row.noteKey)}</span>
          </div>
        ))}
      </div>

      <p className="vgt-caption vgt-protocol__source">
        {t('lp_protocol_source') || 'Stand laut README.md und SOVEREIGN_CRYPTO.md (GaiaCom 3 · Sovereign Beta 3.0.2). Kein unabhängiges Krypto-Audit abgeschlossen — siehe Beta-Hinweis.'}
      </p>
    </section>
  );
}
