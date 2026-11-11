import React from 'react';
import Icon from '../../../ui/Icon';

/**
 * Setup wizard step 3 — address, node domain and fallback nodes.
 *
 * The register action is passed straight through (`onRegisterIdentity`); this
 * component only renders fields and validation feedback supplied by App.jsx.
 */
export default function IdentityStep({
  t,
  wizardGaiaUsername,
  wizardDomain,
  wizardCustomDomain,
  wizardFallbackNodes,
  wizardError,
  availableNodes,
  onGaiaUsernameChange,
  onDomainChange,
  onCustomDomainChange,
  onFallbackNodesChange,
  onBack,
  onRegisterIdentity
}) {
  const nodes = Array.isArray(availableNodes) ? availableNodes : [];

  return (
    <section className="vgt-wizard__step" aria-labelledby="vgt-wizard-identity-title">
      <h2 className="vgt-h3" id="vgt-wizard-identity-title">
        {t('wizard_title2') || 'GaiaCOM-Adresse wählen'}
      </h2>
      <p className="vgt-body vgt-body--sm">{t('wizard_desc2')}</p>

      <div className="vgt-wizard__field">
        <label className="input-label" htmlFor="vgt-wizard-address">{t('wizard_address') || 'Adresse'}</label>
        <input
          id="vgt-wizard-address"
          type="text"
          className="input-field"
          placeholder="alice"
          value={wizardGaiaUsername}
          onChange={event => onGaiaUsernameChange(event.target.value)}
          autoComplete="username"
        />
      </div>

      <div className="vgt-wizard__field">
        <label className="input-label" htmlFor="vgt-wizard-domain">
          {t('wizard_server_domain') || 'Server-Node-Domain'}
        </label>
        <select
          id="vgt-wizard-domain"
          className="input-field"
          value={wizardDomain}
          onChange={event => onDomainChange(event.target.value)}
        >
          {nodes.map(node => (
            <option key={node} value={node}>@{node}</option>
          ))}
          <option value="custom">{t('wizard_custom_domain') || 'Eigene Domain verwenden'}</option>
        </select>
      </div>

      {wizardDomain === 'custom' ? (
        <div className="vgt-wizard__field">
          <label className="input-label" htmlFor="vgt-wizard-custom-domain">Domain</label>
          <input
            id="vgt-wizard-custom-domain"
            type="text"
            className="input-field"
            placeholder="my-domain.com"
            value={wizardCustomDomain}
            onChange={event => onCustomDomainChange(event.target.value)}
            autoComplete="url"
          />
        </div>
      ) : null}

      <div className="vgt-wizard__field">
        <label className="input-label" htmlFor="vgt-wizard-fallback">{t('wizard_fallback') || 'Fallback Nodes'}</label>
        <input
          id="vgt-wizard-fallback"
          type="text"
          className="input-field"
          placeholder="backup.gaiacom.de"
          value={wizardFallbackNodes}
          onChange={event => onFallbackNodesChange(event.target.value)}
        />
        <p className="field-hint">Wird verwendet, wenn der primäre Node nicht erreichbar ist.</p>
      </div>

      {wizardError ? <p className="field-error" role="alert">{wizardError}</p> : null}

      <div className="vgt-wizard__actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          <Icon name="arrowLeft" size={16} />
          {t('wizard_back') || 'Zurück'}
        </button>
        <button type="button" className="btn-primary" onClick={onRegisterIdentity}>
          <Icon name="check" size={16} />
          {t('wizard_finish') || 'Einrichtung abschließen'}
        </button>
      </div>
    </section>
  );
}
