import React from 'react';
import Icon from '../../ui/Icon';
import { useTranslation } from '../../../utils/i18n';

const EDITIONS = [
  {
    key: 'public',
    label: 'Public',
    name: 'GaiaCom Network',
    descKey: 'auth_landing_network_desc',
    body: 'Das offene Netz für digitale Privatsphäre: Open-Source-Client, föderierte Nodes, kein zentraler Leseschlüssel.',
    pointKeys: ['auth_landing_network_list1', 'auth_landing_network_list2', 'auth_landing_network_list3'],
    points: ['Open Source Client', 'Föderierte Nodes', 'Kein zentraler Leseschlüssel'],
    ctaKey: 'lp_cta_open',
    cta: 'Zugang eröffnen',
    primary: true
  },
  {
    key: 'business',
    label: 'Business',
    name: 'GaiaCom Enterprise',
    descKey: 'auth_landing_enterprise_desc',
    body: 'Geschlossene Kommunikationskreise mit administrativer Kontrolle, Compliance und Support für Unternehmen.',
    pointKeys: ['auth_landing_enterprise_list1', 'auth_landing_enterprise_list2', 'auth_landing_enterprise_list3'],
    points: ['Interne Souveränität und User-Verwaltung', 'Self-hosted Node oder Managed Cluster', 'SLA, Support und Premium-Module'],
    ctaKey: 'lp_cta_enterprise',
    cta: 'Enterprise anfragen',
    primary: false
  },
  {
    key: 'defend',
    label: 'Government',
    name: 'GaiaCom Defend',
    descKey: 'auth_landing_defend_desc',
    body: 'Hochsicherheits-Infrastruktur für Behörden, kritische Infrastrukturen und isolierte Kommunikationssilos.',
    pointKeys: ['auth_landing_defend_list1', 'auth_landing_defend_list2', 'auth_landing_defend_list3'],
    points: ['Air-gapped und isolierte Deployments', 'White Labeling und Source-Code-Audit', 'Nationale digitale Souveränität'],
    ctaKey: 'lp_cta_defend',
    cta: 'Defend anfragen',
    primary: false
  }
];

const LICENSE_ROWS = [
  { name: 'Client App', license: 'GPLv3', noteKey: 'auth_landing_license1_desc' },
  { name: 'Core Node', license: 'AGPLv3', noteKey: 'auth_landing_license2_desc' },
  { name: 'Enterprise Module', licenseKey: 'lp_editions_proprietary', noteKey: 'auth_landing_license3_desc' }
];

export default function LandingEditions({ onOpenAuth }) {
  const { t } = useTranslation();

  return (
    <section className="vgt-editions" id="editionen" aria-labelledby="vgt-editions-title">
      <div className="vgt-section-head">
        <p className="vgt-eyebrow">{t('lp_editions_eyebrow') || 'Editionen'}</p>
        <h2 className="vgt-h2" id="vgt-editions-title">
          {t('lp_editions_title') || 'Ein Protokoll. Drei Betriebsmodelle.'}
        </h2>
        <p className="vgt-body">
          {t('lp_editions_intro') || 'Das Netz bleibt offen, die Betriebsform entscheidet über Kontrolle, Support und Compliance.'}
        </p>
      </div>

      <div className="vgt-editions__grid">
        {EDITIONS.map((edition) => (
          <article
            className={`vgt-editions__card${edition.primary ? ' vgt-editions__card--primary' : ''}`}
            key={edition.key}
          >
            <span className="vgt-editions__label vgt-label">{edition.label}</span>
            <h3 className="vgt-h3">{edition.name}</h3>
            <p className="vgt-body vgt-body--sm">{t(edition.descKey) || edition.body}</p>
            <ul className="vgt-editions__points">
              {edition.points.map((point, index) => (
                <li key={point}>
                  <Icon name="check" size={14} />
                  {t(edition.pointKeys[index]) || point}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={edition.primary ? 'btn-primary' : 'btn-secondary'}
              onClick={() => onOpenAuth('auth')}
            >
              {t(edition.ctaKey) || edition.cta}
            </button>
          </article>
        ))}
      </div>

      <div className="vgt-license" aria-label={t('lp_editions_license_eyebrow') || 'Lizenzmodell'}>
        <div className="vgt-license__head">
          <p className="vgt-eyebrow">{t('lp_editions_license_eyebrow') || 'Lizenzmodell'}</p>
          <p className="vgt-caption">
            {t('auth_landing_gov_desc') || 'Öffentliches Protokoll, offene Clients, kommerzielle Premium-Infrastruktur. Vertrauen durch Transparenz.'}
          </p>
        </div>
        <ul className="vgt-license__rows">
          {LICENSE_ROWS.map((row) => (
            <li key={row.name}>
              <span>{row.name}</span>
              <strong className="vgt-mono">{row.licenseKey ? (t(row.licenseKey) || 'Proprietär') : row.license}</strong>
              <span className="vgt-caption">{t(row.noteKey)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
