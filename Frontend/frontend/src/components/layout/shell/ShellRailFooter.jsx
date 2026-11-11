import React from 'react';
import Icon from '../../ui/Icon';
import VersionBadge from '../VersionBadge';
import { languageOptions } from '../../../utils/i18n';
import { tr } from './shellRailFormat';

/**
 * Quiet utility footer of the navigation rail: theme, language, the Sovereign
 * Shield details entry, lock/logout and the honest build provenance line.
 *
 * No fake status text and no progress bar — the shield button opens the real
 * details surface instead of asserting a hardcoded "activated" state.
 */
export default function ShellRailFooter({
  isLightMode,
  onToggleTheme,
  language,
  changeLanguage,
  onOpenSecurityDetails,
  onLock,
  onLogout,
  serverVersion,
  serverConsensus,
  t
}) {
  return (
    <footer className="vgt-rail__footer">
      <label className="vgt-switch vgt-rail__switch">
        <input
          type="checkbox"
          checked={Boolean(isLightMode)}
          onChange={onToggleTheme}
        />
        <span className="vgt-switch__track" aria-hidden="true" />
        <span className="vgt-rail__switch-label">
          {tr(t, 'heller_modus', 'Heller Modus').trim()}
        </span>
      </label>

      <label className="vgt-lang vgt-rail__lang" htmlFor="vgt-rail-language">
        <span className="vgt-sr-only">{tr(t, 'language', 'Sprache')}</span>
        <select
          id="vgt-rail-language"
          className="vgt-lang__select"
          value={language}
          onChange={(event) => changeLanguage(event.target.value)}
        >
          {languageOptions.map((option) => (
            <option key={option.code} value={option.code}>{option.label}</option>
          ))}
        </select>
        <Icon name="chevronDown" size={14} className="vgt-lang__chevron" />
      </label>

      <button type="button" className="vgt-rail__security" onClick={onOpenSecurityDetails}>
        <Icon name="shieldCheck" size={16} />
        <span className="vgt-rail__security-label">{tr(t, 'quantum_shield', 'Quantum Shield')}</span>
        <Icon name="chevronRight" size={14} className="vgt-rail__chevron" />
      </button>

      <div className="vgt-rail__actions">
        <button type="button" className="btn-secondary vgt-rail__action" onClick={onLock}>
          <Icon name="lock" size={16} />
          {tr(t, 'sperren', 'Sperren')}
        </button>
        <button type="button" className="btn-ghost vgt-rail__action vgt-rail__action--danger" onClick={onLogout}>
          <Icon name="logout" size={16} />
          {tr(t, 'system_verlassen', 'Verlassen')}
        </button>
      </div>

      <div className="vgt-rail__meta">
        <VersionBadge version={serverVersion} consensus={serverConsensus} />
        <span className="vgt-rail__credit">
          {tr(t, 'powered_by', 'Powered by')}{' '}
          <a
            href="https://visiongaiatechnology.de"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr(t, 'vision_gaia_technology', 'VisionGaiaTechnology')}
          </a>
        </span>
      </div>
    </footer>
  );
}
