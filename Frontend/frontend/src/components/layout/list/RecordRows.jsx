import React from 'react';
import Icon from '../../ui/Icon';
import { listTimestamp, truncateText } from './format';

function RowIcon({ name, className }) {
  return (
    <span className={`vgt-inbox-row__avatar vgt-inbox-row__avatar--glyph${className ? ` ${className}` : ''}`} aria-hidden="true">
      <Icon name={name} size={16} />
    </span>
  );
}

/**
 * VGT GLASS 2100 — vault record row. Shows only fields the record actually
 * carries (type, date, title, mime/size or body excerpt).
 */
export function VaultRow({ record, isSelected, onSelect }) {
  const isFile = record.type === 'file';
  const typeLabel = isFile ? 'DATEI' : String(record.category || 'NOTIZ').toUpperCase();
  const timestamp = listTimestamp(record.createdAt);
  const sizeKb = record.sizeBytes ? `${(record.sizeBytes / 1024).toFixed(1)} KB` : null;
  const meta = isFile
    ? [record.mimeType || 'Datei', sizeKb, record.cloudFileId ? 'Cloud' : null].filter(Boolean).join(' · ')
    : truncateText(record.body, 68);
  const icon = isFile ? (record.cloudFileId ? 'cloud' : 'file') : 'fileText';

  return (
    <li className={`vgt-inbox-row vgt-inbox-row--record${isSelected ? ' is-active' : ''}`}>
      <button
        type="button"
        className="vgt-inbox-row__main"
        onClick={onSelect}
        aria-current={isSelected ? 'true' : undefined}
      >
        <RowIcon name={icon} />
        <span className="vgt-inbox-row__body">
          <span className="vgt-inbox-row__line vgt-inbox-row__line--top">
            <span className="vgt-inbox-row__tag vgt-label">{typeLabel}</span>
            <time className="vgt-inbox-row__time vgt-numeric" title={timestamp.title}>{timestamp.label}</time>
          </span>
          <span className="vgt-inbox-row__subject">{record.title}</span>
          {meta ? <span className="vgt-inbox-row__preview">{meta}</span> : null}
        </span>
      </button>
    </li>
  );
}

/**
 * VGT GLASS 2100 — GaiaDrop inbox row. "Neu" is not colour-only: the row gets a
 * text chip and a screen-reader label; decryption state is displayed verbatim.
 */
export function DropRow({ drop, isSelected, onSelect, t }) {
  const timestamp = listTimestamp(drop.created_at);
  const isNew = drop.status === 'new';
  const sender = drop.sender_label || ((typeof t === 'function' && t('anonymous_sender')) || 'Anonymer Absender');
  const proofLabel = (typeof t === 'function' && t('drop_proof')) || 'Drop-Nachweis';
  const rawText = drop.decrypted
    ? (typeof drop.decrypted === 'string' ? drop.decrypted : drop.decrypted.body)
    : (drop.decryptError || 'Entschlüsselung ausstehend …');

  const rowClass = [
    'vgt-inbox-row',
    'vgt-inbox-row--drop',
    isSelected ? 'is-active' : '',
    isNew ? 'is-unread' : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={rowClass}>
      <button
        type="button"
        className="vgt-inbox-row__main"
        onClick={onSelect}
        aria-current={isSelected ? 'true' : undefined}
      >
        <RowIcon name="seal" />
        <span className="vgt-inbox-row__body">
          <span className="vgt-inbox-row__line vgt-inbox-row__line--top">
            <span className="vgt-inbox-row__tag vgt-label">{proofLabel}</span>
            <time className="vgt-inbox-row__time vgt-numeric" title={timestamp.title}>{timestamp.label}</time>
          </span>
          <span className="vgt-inbox-row__subject">{sender}</span>
          <span className="vgt-inbox-row__preview">{truncateText(rawText, 72)}</span>
          {isNew ? (
            <span className="vgt-inbox-row__tags">
              <span className="vgt-inbox-chip vgt-inbox-chip--warn">Neu</span>
            </span>
          ) : null}
        </span>
        {isNew ? <span className="vgt-sr-only">Neuer, ungesehener Drop</span> : null}
      </button>
    </li>
  );
}
