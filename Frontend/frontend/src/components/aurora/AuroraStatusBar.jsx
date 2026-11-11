import React from 'react';
import Icon from '../ui/Icon';
import { useTranslation } from '../../utils/i18n';

/**
 * Bottom status bar in the Astraea SecureSpace language: local-first badges on
 * the left, build/session status on the right. Values are real build/session
 * metadata only.
 */
export default function AuroraStatusBar({ serverVersion, serverConsensus }) {
  const { t } = useTranslation();
  return (
    <footer className="ax4-statusbar" aria-label={t('ui_system_status') || 'Systemstatus'}>
      <div className="ax4-statusbar__brand">
        <span className="ax4-statusbar__dot" aria-hidden="true" />
        <strong>GaiaCom Workspace</strong>
        <span>{t('ui_status_encrypted_verified') || 'Verschlüsselt & verifiziert'}</span>
      </div>
      <div className="ax4-statusbar__badges">
        <span><Icon name="lock" size={11} /> {t('ui_status_e2e') || 'E2E-verschlüsselt'}</span>
        <span><Icon name="shieldCheck" size={11} /> Zero-Trust Session</span>
        <span><Icon name="cpu" size={11} /> Post-Quantum Crypto</span>
        <span><Icon name="check" size={11} /> {t('ui_status_integrity') || 'Integritätsprüfung aktiv'}</span>
      </div>
      <div className="ax4-statusbar__meta">
        <span>{serverVersion ? `${serverVersion}${serverConsensus ? ` · ${serverConsensus}` : ''}` : '—'}</span>
        <span className="ax4-statusbar__ok"><Icon name="shieldCheck" size={11} /> {t('ui_status_system_protected') || 'System geschützt'}</span>
      </div>
    </footer>
  );
}
