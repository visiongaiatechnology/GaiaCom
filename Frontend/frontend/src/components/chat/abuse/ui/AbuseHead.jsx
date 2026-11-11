import React from 'react';
import Icon from '../../../ui/Icon';

/**
 * Governance pane header and role-aware tab strip.
 *
 * Role badges are rendered from the loaded governance roles; no badge claims a
 * capability the server has not confirmed.
 */
export default function AbuseHead({ activeTab, setActiveTab, isReviewer, isOperator, t }) {
  const tabs = [{ key: 'my_reports', label: t('ac_tab_my_reports') || 'Meine Meldungen', icon: 'megaphone' }];
  if (isReviewer) {
    tabs.push({ key: 'reviewer_queue', label: t('ac_tab_queue') || 'Review-Warteschlange', icon: 'inbox' });
  }
  if (isOperator) {
    tabs.push({ key: 'operator_panel', label: t('ac_tab_operator') || 'Node Operator', icon: 'server' });
  }
  tabs.push({ key: 'public_transparency', label: t('ac_tab_transparency') || 'Föderation & Transparenz', icon: 'globe' });

  return (
    <header className="vgt-abuse-head">
      <div className="vgt-abuse-head__titles">
        <span className="vgt-eyebrow">{t('ac_subtitle') || 'GaiaCom Governance & Abuse Consensus'}</span>
        <h1 className="vgt-h2" id="vgt-abuse-title">{t('ac_title') || 'Governance- & Meldecenter'}</h1>
      </div>
      <div className="vgt-abuse-head__roles" aria-label="Rollen">
        <span className="vgt-status vgt-status--idle">User</span>
        {isReviewer ? <span className="vgt-status vgt-status--signed">Reviewer</span> : null}
        {isOperator ? <span className="vgt-status vgt-status--signed">Node Operator</span> : null}
      </div>
      <nav className="vgt-abuse-tabs" aria-label="Bereiche des Meldecenters">
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              className={`vgt-abuse-tab ${active ? 'is-active' : ''}`.trim()}
              aria-current={active ? 'page' : undefined}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
