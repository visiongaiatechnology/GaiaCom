import React from 'react';
import Icon from '../../../ui/Icon';

/**
 * Pane header and tab strip for the security surface.
 *
 * Tabs are real navigation buttons with `aria-current`; visibility of the node
 * tabs still depends on the same role/error conditions as before.
 */
export default function SecurityHead({
  activeTab,
  setActiveTab,
  isOperator,
  nodeOperatorError,
  t
}) {
  const tabs = [
    { key: 'status', icon: 'shield', label: t('sc_tab_status') || 'Schutzstatus' },
    { key: 'events', icon: 'fileText', label: t('sc_tab_events') || 'Sicherheitsprotokoll' },
    { key: 'passport', icon: 'seal', label: t('sc_tab_passport') || 'Gaia Passport' }
  ];

  if (isOperator || nodeOperatorError) {
    tabs.push({ key: 'node_operator', icon: 'server', label: t('sc_tab_node') || 'Node-Sicherheit' });
  }
  if (isOperator) {
    tabs.push({ key: 'node_system', icon: 'layers', label: t('sc_tab_node_system') || 'Nodesystem' });
  }

  return (
    <header className="vgt-sec-head">
      <div className="vgt-sec-head__titles">
        <span className="vgt-eyebrow">{t('sc_subtitle') || 'GaiaShield Integrated Security Layer'}</span>
        <h1 className="vgt-h2" id="vgt-sec-title">{t('sc_title') || 'Security Center'}</h1>
      </div>
      <nav className="vgt-sec-tabs" aria-label="Sicherheitsbereiche">
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              className={`vgt-sec-tab ${active ? 'is-active' : ''}`.trim()}
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
