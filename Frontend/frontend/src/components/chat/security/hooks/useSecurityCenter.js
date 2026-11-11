import { useCallback, useEffect, useState } from 'react';
import * as api from '../../../../api';

/**
 * Data and actions for the security surface.
 *
 * The previous component swallowed load failures and rendered a zeroed status
 * hero. Here failures are kept as state so the UI can say "unavailable"
 * instead of inventing a healthy account. All existing API calls are retained.
 */
export default function useSecurityCenter({ activeIdentity, triggerAlert, t }) {
  const [activeTab, setActiveTab] = useState('status');
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [nodeSummary, setNodeSummary] = useState(null);
  const [nodeEvents, setNodeEvents] = useState([]);
  const [nodeRegistry, setNodeRegistry] = useState(null);
  const [nodeSecrets, setNodeSecrets] = useState(null);
  const [nodeRegistryError, setNodeRegistryError] = useState('');
  const [roles, setRoles] = useState([]);
  const [nodeOperatorError, setNodeOperatorError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await api.getGovernanceRoles();
        if (res && res.roles) {
          setRoles(res.roles);
        }
      } catch (_) {}
    }
    if (activeIdentity) {
      loadRoles();
    }
  }, [activeIdentity]);

  // P-04: operator capability comes from the governance role list only. A
  // successful node-data fetch is a capability probe for the tab content, not
  // proof of an operator role.
  const isOperator = roles.includes('node_operator');

  const loadData = useCallback(async () => {
    setLoading(true);
    setSummaryError('');
    setEventsError('');

    // M-26: a failed summary fetch must never leave a "secured" claim on
    // screen; the summary is cleared and an explicit error banner is shown.
    let summaryOk = false;
    try {
      const sumRes = await api.getSecuritySummary();
      setSummary(sumRes);
      summaryOk = true;
    } catch (err) {
      setSummary(null);
      setSummaryError(err.message || 'Sicherheitsdaten konnten nicht geladen werden.');
    }

    if (summaryOk) {
      try {
        const evsRes = await api.getSecurityEvents();
        setEvents(evsRes.events || []);
        setEventsLoaded(true);
      } catch (err) {
        setEvents([]);
        setEventsLoaded(false);
        setEventsError(err.message || 'Sicherheitsprotokoll konnte nicht geladen werden.');
      }

      try {
        const nodeSum = await api.getNodeSecuritySummary();
        setNodeSummary(nodeSum);
        const nodeEvs = await api.getNodeSecurityEvents();
        setNodeEvents(nodeEvs.events || []);
        try {
          const registryRes = await api.getNodeRegistrySummary();
          setNodeRegistry(registryRes);
          setNodeRegistryError('');
        } catch (registryErr) {
          setNodeRegistry(null);
          setNodeRegistryError(registryErr.message || 'Node Registry konnte nicht geladen werden.');
        }
        setNodeOperatorError('');
      } catch (nodeErr) {
        setNodeSummary(null);
        setNodeEvents([]);
        setNodeOperatorError(nodeErr.message || 'Node-Sicherheitsdaten konnten nicht geladen werden.');
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeIdentity) {
      loadData();
    }
  }, [activeIdentity, roles, loadData]);

  const handleAcknowledge = async eventId => {
    try {
      await api.acknowledgeSecurityEvent(eventId);
      triggerAlert(
        t('success') || (t('erfolg') || 'Erfolg'),
        'Sicherheitsereignis wurde bestätigt.',
        'success'
      );
      loadData();
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message, 'danger');
    }
  };

  const handleExport = async format => {
    try {
      const blob = await api.exportSecurityReport(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gaiashield_report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message, 'danger');
    }
  };

  const handleGenerateNodeSecrets = async () => {
    try {
      const result = await api.generateNodeRegistrySecrets();
      setNodeSecrets(result);
      triggerAlert((t('erfolg') || 'Erfolg'), `Node-Secrets wurden erzeugt und in ${result.savedTo || 'node_secrets.json'} gespeichert.`, 'success');
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message, 'danger');
    }
  };

  const handlePingMainNode = async () => {
    try {
      const result = await api.pingNodeRegistryMain();
      triggerAlert((t('erfolg') || 'Erfolg'), `Main-Node Ping akzeptiert: ${result.entry?.status || result.status}`, 'success');
      const registryRes = await api.getNodeRegistrySummary();
      setNodeRegistry(registryRes);
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message, 'danger');
    }
  };

  const handleRegistryStatus = async (domain, status) => {
    try {
      await api.updateNodeRegistryStatus(domain, status);
      triggerAlert((t('erfolg') || 'Erfolg'), `Node ${domain} wurde auf ${status} gesetzt.`, 'success');
      const registryRes = await api.getNodeRegistrySummary();
      setNodeRegistry(registryRes);
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message, 'danger');
    }
  };

  const filteredEvents = (Array.isArray(events) ? events : []).filter(ev => {
    if (filterSeverity !== 'all' && ev.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && ev.category !== filterCategory) return false;
    return true;
  });

  return {
    activeTab,
    setActiveTab,
    summary,
    events,
    eventsLoaded,
    summaryError,
    eventsError,
    nodeSummary,
    nodeEvents,
    nodeRegistry,
    nodeSecrets,
    nodeRegistryError,
    roles,
    isOperator,
    nodeOperatorError,
    loading,
    filterSeverity,
    setFilterSeverity,
    filterCategory,
    setFilterCategory,
    filteredEvents,
    loadData,
    handleAcknowledge,
    handleExport,
    handleGenerateNodeSecrets,
    handlePingMainNode,
    handleRegistryStatus
  };
}
