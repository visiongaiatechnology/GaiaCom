import React from 'react';
import Icon from '../../ui/Icon';
import { formatDateTime, formatIsoDateTime } from './mailUtils';

function ProofRow({ label, value, mono }) {
  return (
    <div className="vgt-mail-proof__row">
      <dt>{label}</dt>
      <dd className={mono ? 'vgt-mono' : undefined}>{value || '—'}</dd>
    </div>
  );
}

/**
 * GaiaProof audit trail. Every value is taken from the proof object the server
 * returned; nothing is computed to look stronger than the data.
 */
export default function MailProofPanel({ proof, msgId, onDownload, t }) {
  if (!proof) return null;
  const received = proof.serverReceivedAt || proof.createdAt;

  return (
    <details className="vgt-mail-proof">
      <summary className="vgt-mail-proof__summary">
        <span className="vgt-mail-proof__seal" aria-hidden="true">
          <Icon name="seal" size={16} />
        </span>
        <span className="vgt-mail-proof__title">
          {t('gaiaproof_audit_trail') || 'GaiaProof-Audit-Trail'}
        </span>
        <span className="vgt-status vgt-status--signed">
          {t('proof_received') || 'Nachweis übermittelt'}
        </span>
        <span className="vgt-mail-proof__chevron" aria-hidden="true">
          <Icon name="chevronDown" size={16} />
        </span>
      </summary>

      <dl className="vgt-mail-proof__rows">
        <ProofRow label={t('message_id') || 'Message ID'} value={proof.messageId} mono />
        <ProofRow
          label={t('ciphertext_hash') || 'Ciphertext Hash'}
          value={proof.ciphertextHash}
          mono
        />
        {proof.senderSignature ? (
          <ProofRow
            label={t('sender_signature') || 'Sender Signature'}
            value={proof.senderSignature}
            mono
          />
        ) : null}
        {proof.envelopeHash ? (
          <ProofRow
            label={t('envelope_hash') || 'Envelope Hash'}
            value={proof.envelopeHash}
            mono
          />
        ) : null}
        <ProofRow
          label={t('server_received') || 'Serverzugang'}
          value={
            received ? (
              <time className="vgt-numeric" dateTime={formatIsoDateTime(received)}>
                {formatDateTime(received)}
              </time>
            ) : (
              '—'
            )
          }
        />
      </dl>

      <p className="vgt-mail-proof__note">
        {t('proof_note') ||
          'Vom Server übermittelter Nachweis. Hashes und Signaturen sind im Rohformat einsehbar.'}
      </p>

      <button
        type="button"
        className="btn-secondary vgt-mail-proof__download"
        onClick={() => onDownload(proof, msgId)}
      >
        <Icon name="download" size={16} />
        {t('proof_download') || 'GaiaProof als JSON'}
      </button>
    </details>
  );
}
