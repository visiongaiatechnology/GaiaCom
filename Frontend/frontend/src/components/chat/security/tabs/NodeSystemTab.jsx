import React from 'react';
import Icon from '../../../ui/Icon';
import { unavailable, formatDateTime } from '../utils/securityFormat';

const registryStatusClass = status => {
  if (status === 'accepted') return 'vgt-status--ok';
  if (status === 'blocked') return 'vgt-status--danger';
  if (status === 'quarantined') return 'vgt-status--warn';
  return 'vgt-status--idle';
};

/**
 * Federation registry tab (node operators only).
 *
 * Registry entries, core hashes and generated secrets are rendered exactly as
 * the server reports them. No entry is synthesized when the registry is empty.
 */
export default function NodeSystemTab({
  nodeRegistry,
  nodeRegistryError,
  nodeSecrets,
  handleGenerateNodeSecrets,
  handlePingMainNode,
  handleRegistryStatus,
  t
}) {
  const registryRows = Array.isArray(nodeRegistry?.registry) ? nodeRegistry.registry : [];
  const acceptedNodes = Array.isArray(nodeRegistry?.acceptedNodes) ? nodeRegistry.acceptedNodes : null;

  return (
    <div className="vgt-sec-stack">
      <section className="vgt-sec-block" aria-labelledby="vgt-registry-title">
        <div className="vgt-sec-block__head">
          <div>
            <span className="vgt-eyebrow">{t('sc_fed_registry_title') || 'GaiaCom Federation Registry'}</span>
            <h2 className="vgt-h3" id="vgt-registry-title">
              {t('sc_node_system_title') || 'Nodesystem'}
            </h2>
            <p className="vgt-body vgt-body--sm">
              {t('sc_fed_registry_desc') ||
                'Dieser Node kann seine S2S-Secrets erzeugen, den Registry-Mainnode pingen und verbundene Nodes anhand von Public Key, Core-Hash und Status verwalten.'}
            </p>
          </div>
          <div className="vgt-sec-block__actions">
            <button type="button" className="btn-secondary" onClick={handleGenerateNodeSecrets}>
              <Icon name="key" size={15} />
              {t('sc_btn_generate_secrets') || 'Secrets generieren'}
            </button>
            <button type="button" className="btn-primary" onClick={handlePingMainNode}>
              <Icon name="activity" size={15} />
              {t('sc_btn_ping_main') || 'Main-Node pingen'}
            </button>
          </div>
        </div>
      </section>

      {nodeRegistryError ? (
        <p className="vgt-inline-status is-error" role="alert">
          {t('sc_registry_notice_title') || 'Registry-Hinweis'}: {nodeRegistryError}
        </p>
      ) : null}

      {nodeRegistry ? (
        <>
          <dl className="vgt-sec-metrics">
            <div className="vgt-sec-metric">
              <dt>{t('sc_server') || 'Server'}</dt>
              <dd>{nodeRegistry.serverName || unavailable(t)}</dd>
            </div>
            <div className="vgt-sec-metric">
              <dt>{t('sc_authority') || 'Authority'}</dt>
              <dd className={nodeRegistry.isRegistryAuthority ? 'is-ok' : undefined}>
                {nodeRegistry.isRegistryAuthority ? (t('sc_active') || 'Aktiv') : 'Remote'}
              </dd>
            </div>
            <div className="vgt-sec-metric">
              <dt>{t('sc_core_hash') || 'Core Hash'}</dt>
              <dd className="vgt-mono vgt-sec-metric__break">{nodeRegistry.coreHash || unavailable(t)}</dd>
            </div>
            <div className="vgt-sec-metric">
              <dt>{t('sc_accepted_nodes') || 'Accepted Nodes'}</dt>
              <dd className="vgt-numeric">{acceptedNodes === null ? unavailable(t) : acceptedNodes.length}</dd>
            </div>
          </dl>

          {registryRows.length === 0 ? (
            <p className="vgt-empty-note">
              {t('sc_no_nodes_in_registry') || 'Noch keine externen Nodes in der Registry.'}
            </p>
          ) : (
            <div className="vgt-table-wrap">
              <table className="vgt-table">
                <caption className="vgt-sr-only">Externe Nodes in der Federation Registry</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('sc_col_node') || 'Node'}</th>
                    <th scope="col">{t('sc_col_status') || 'Status'}</th>
                    <th scope="col">{t('sc_col_version') || 'Version'}</th>
                    <th scope="col">{t('sc_core_hash') || 'Core Hash'}</th>
                    <th scope="col">{t('sc_col_ping') || 'Ping'}</th>
                    <th scope="col">{t('sc_col_action') || 'Aktion'}</th>
                  </tr>
                </thead>
                <tbody>
                  {registryRows.map(entry => (
                    <tr key={entry.domain}>
                      <td>
                        <strong>{entry.domain || unavailable(t)}</strong>
                        <div className="vgt-caption">
                          {entry.operatorGaiaId || (t('sc_operator_not_specified') || 'Operator nicht angegeben')}
                        </div>
                      </td>
                      <td>
                        <span className={`vgt-status ${registryStatusClass(entry.status)}`.trim()}>
                          {entry.status || unavailable(t)}
                        </span>
                      </td>
                      <td>{entry.nodeVersion || 'unbekannt'}</td>
                      <td className="vgt-mono vgt-sec-table__hash">
                        {entry.coreHash || unavailable(t)}
                        {entry.coreHash && nodeRegistry.coreHash && entry.coreHash !== nodeRegistry.coreHash ? (
                          <div className="vgt-caption vgt-sec-table__warning">
                            {t('sc_fork_differs') || 'Update/Fork abweichend'}
                          </div>
                        ) : null}
                      </td>
                      <td className="vgt-numeric">
                        {typeof entry.pingCount === 'number' ? `${entry.pingCount}x` : unavailable(t)}
                        <br />
                        {entry.lastSeenAt ? formatDateTime(entry.lastSeenAt, t) : (t('sc_ping_never') || 'nie')}
                      </td>
                      <td>
                        <div className="vgt-sec-table__actions">
                          <button type="button" className="btn-action" onClick={() => handleRegistryStatus(entry.domain, 'accepted')}>
                            {t('sc_btn_accept') || 'Annehmen'}
                          </button>
                          <button type="button" className="btn-action" onClick={() => handleRegistryStatus(entry.domain, 'quarantined')}>
                            {t('sc_btn_quarantine') || 'Quarantäne'}
                          </button>
                          <button type="button" className="btn-danger-outline" onClick={() => handleRegistryStatus(entry.domain, 'blocked')}>
                            {t('sc_btn_block') || 'Blocken'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {nodeSecrets ? (
        <section className="vgt-notice vgt-notice--danger" aria-labelledby="vgt-node-secrets-title">
          <Icon name="alertOctagon" size={18} />
          <div>
            <h2 className="vgt-h4" id="vgt-node-secrets-title">
              {t('sc_generated_secrets_title') || 'Generierte Node-Secrets'}
            </h2>
            <p className="vgt-body vgt-body--sm">
              {t('sc_generated_secrets_desc') ||
                'Die Datei wurde serverseitig gespeichert. Trage die Werte als Umgebungsvariablen ein, bevor du den Node produktiv startest.'}
            </p>
            <dl className="vgt-sec-proof-list">
              <div>
                <dt>GAIACOM_SERVER_PRIVATE_KEY</dt>
                <dd className="vgt-mono vgt-sec-proof__hash">{nodeSecrets.serverPrivateKeyHex || unavailable(t)}</dd>
              </div>
              <div>
                <dt>GAIACOM_TRUSTMESH_EPOCH_SECRET</dt>
                <dd className="vgt-mono vgt-sec-proof__hash">{nodeSecrets.trustMeshEpochSecretHex || unavailable(t)}</dd>
              </div>
              <div>
                <dt>{t('sc_public_key') || 'Public Key'}</dt>
                <dd className="vgt-mono vgt-sec-proof__hash">{nodeSecrets.serverPublicKeyBase64 || unavailable(t)}</dd>
              </div>
              <div>
                <dt>{t('sc_file') || 'Datei'}</dt>
                <dd className="vgt-mono">{nodeSecrets.savedTo || unavailable(t)}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}
    </div>
  );
}
