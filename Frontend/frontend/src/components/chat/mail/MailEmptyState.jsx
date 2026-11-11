import React from 'react';
import Icon from '../../ui/Icon';

/**
 * Honest no-selection state. It explains why the pane is empty and what the
 * next action is; it makes no security or availability claim.
 */
export default function MailEmptyState({ t }) {
  return (
    <section className="vgt-mail-empty" aria-labelledby="vgt-mail-empty-title">
      <span className="vgt-mail-empty__glyph" aria-hidden="true">
        <Icon name="mailOpen" size={28} />
      </span>
      <p className="vgt-eyebrow">{t('mail') || 'Mail'}</p>
      <h2 className="vgt-h2" id="vgt-mail-empty-title">
        {t('gaiacom_reader') || 'GaiaCOM Reader'}
      </h2>
      <p className="vgt-mail-empty__copy">
        {t('mail_empty_selection') ||
          'Keine Nachricht ausgewählt. Wähle in der Liste eine Mail aus, um Betreff, Verlauf, Anhänge und Sicherheitsnachweise zu lesen.'}
      </p>
      <p className="vgt-mail-empty__hint">
        {t('mail_empty_compose_hint') ||
          'Neue Nachrichten schreibst du über die Verfassen-Aktion in der Mailbox.'}
      </p>
    </section>
  );
}
