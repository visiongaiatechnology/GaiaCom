import React from 'react';
import Icon from '../../ui/Icon';
import { useTranslation } from '../../../utils/i18n';

const SURFACES = [
  { key: 'chat', icon: 'chat', name: 'GaiaChat', bodyKey: 'lp_surface_chat_body' },
  { key: 'mail', icon: 'mail', name: 'GaiaMail', bodyKey: 'lp_surface_mail_body' },
  { key: 'rooms', icon: 'users', name: 'Gruppen & Räume', nameKey: 'lp_surface_rooms_name', bodyKey: 'lp_surface_rooms_body' },
  { key: 'gsn', icon: 'megaphone', name: 'Gaia Social Network', bodyKey: 'lp_surface_gsn_body' },
  { key: 'drive', icon: 'drive', name: 'GaiaDrive', bodyKey: 'lp_surface_drive_body' },
  { key: 'vault', icon: 'key', name: 'GaiaVault', bodyKey: 'lp_surface_vault_body' }
];

export default function LandingSurfaces({ t, onOpenAuth }) {
  const { t: translate } = useTranslation();
  const tr = t || translate;
  return (
    <section className="vgt-surfaces" id="oberflaechen" aria-labelledby="vgt-surfaces-title">
      <div className="vgt-section-head">
        <p className="vgt-eyebrow">{tr('lp_surfaces_eyebrow') || 'Ein Konto, alle Formate'}</p>
        <h2 className="vgt-h2" id="vgt-surfaces-title">
          {tr('lp_surfaces_title') || 'Kein Wechsel zwischen Plattformen. Eine Identität trägt alles.'}
        </h2>
        <p className="vgt-body">
          {tr('lp_surfaces_intro') || 'Dieselbe kryptografische Identität verbindet Nachrichten, Mail, Räume, soziale Kanäle und Dateien. Was du nicht brauchst, bleibt aus deinem Arbeitsbereich.'}
        </p>
      </div>

      <div className="vgt-surfaces__rail">
        {SURFACES.map((surface) => (
          <article className="vgt-surfaces__item" key={surface.key}>
            <div className="vgt-surfaces__head">
              <span className="vgt-surfaces__icon" aria-hidden="true">
                <Icon name={surface.icon} size={20} />
              </span>
              <h3 className="vgt-h4">{surface.nameKey ? tr(surface.nameKey) : surface.name}</h3>
            </div>
            <p className="vgt-body vgt-body--sm">{tr(surface.bodyKey)}</p>
            <button
              type="button"
              className="btn-ghost vgt-surfaces__link"
              onClick={() => onOpenAuth('auth')}
            >
              {surface.key === 'chat' ? (tr('open_chats') || 'Chat öffnen') : (tr('lp_cta_open') || 'Zugang eröffnen')}
              <Icon name="arrowUpRight" size={15} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
