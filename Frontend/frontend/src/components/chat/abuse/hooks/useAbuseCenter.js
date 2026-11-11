import { useEffect, useState } from 'react';
import * as api from '../../../../api';
import { safeJsonParse } from '../../../../utils/safeJson';

/**
 * Data and actions for the governance/abuse surface.
 *
 * Extracted from the previous AbuseCenter component without behaviour change:
 * the same tabs, the same API calls and the same signed submissions. The node
 * operator queue response is now retained (it was fetched and discarded) so the
 * operator tab can show the real queue instead of an empty panel.
 */
export default function useAbuseCenter({ activeIdentity, triggerAlert, t }) {
  const [activeTab, setActiveTab] = useState('my_reports');
  const [myReports, setMyReports] = useState([]);
  const [reviewerCases, setReviewerCases] = useState([]);
  const [operatorCases, setOperatorCases] = useState([]);
  const [transparency, setTransparency] = useState(null);
  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  const [caseDetail, setCaseDetail] = useState(null);

  const [appealReason, setAppealReason] = useState('false_positive');
  const [appealStatement, setAppealStatement] = useState('');

  const [reviewCategory, setReviewCategory] = useState('spam');
  const [reviewSeverity, setReviewSeverity] = useState('low');
  const [reviewAction, setReviewAction] = useState('warn');
  const [reviewReason, setReviewReason] = useState('');

  const [opTargetType, setOpTargetType] = useState('channel');
  const [opTargetId, setOpTargetId] = useState('');
  const [opSuspend, setOpSuspend] = useState(true);
  const [opReason, setOpReason] = useState('');

  const [busy, setBusy] = useState(false);
  const [disclosureRole, setDisclosureRole] = useState('reporter');
  const [disclosurePackageText, setDisclosurePackageText] = useState('{\n  "type": "GaiaProofDisclosure",\n  "version": "v1",\n  "statement": ""\n}');
  const [gaiasEyesTTL, setGaiasEyesTTL] = useState(900);
  const [gaiasEyesKey, setGaiasEyesKey] = useState(null);
  const [requestTargetRole, setRequestTargetRole] = useState('reporter');
  const [requestReason, setRequestReason] = useState('Bitte freiwillig ein fallbezogenes GaiaProof-Paket zur Prüfung freigeben.');

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

  const isReviewer = roles.includes('trusted_reviewer') || roles.includes('senior_reviewer');
  const isOperator = roles.includes('node_operator');

  const loadTabData = async tab => {
    setLoading(true);
    setError('');
    setSelectedCase(null);
    setCaseDetail(null);
    try {
      if (tab === 'my_reports') {
        const res = await api.getMyReports();
        setMyReports(res.cases || []);
      } else if (tab === 'reviewer_queue') {
        const res = await api.getReviewerQueue();
        setReviewerCases(res.cases || []);
      } else if (tab === 'operator_panel') {
        const res = await api.getNodeOperatorQueue();
        setOperatorCases(Array.isArray(res?.cases) ? res.cases : []);
      } else if (tab === 'public_transparency') {
        const res = await api.getPublicTransparency();
        setTransparency(res);
      }
    } catch (err) {
      setError(err.message || 'Laden fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeIdentity) {
      loadTabData(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeIdentity]);

  const handleSelectCase = async c => {
    setSelectedCase(c);
    setCaseDetail(null);
    setLoading(true);
    try {
      const res = await api.getReportDetail(c.id);
      setCaseDetail(res);
      setReviewCategory(c.category);
      setReviewSeverity(c.severity);
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), 'Konnte Details nicht laden: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleAppealSubmit = async e => {
    e.preventDefault();
    if (!activeIdentity || !selectedCase) return;
    setBusy(true);
    try {
      await api.submitAppeal(selectedCase.id, activeIdentity.ID, appealReason, appealStatement);
      triggerAlert((t('erfolg') || 'Erfolg'), 'Einspruch wurde eingereicht.');
      setAppealStatement('');
      loadTabData(activeTab);
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message || 'Einspruch fehlgeschlagen.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewSubmit = async e => {
    e.preventDefault();
    if (!activeIdentity || !selectedCase) return;
    setBusy(true);
    try {
      await api.submitReview(selectedCase.id, activeIdentity.ID, reviewCategory, reviewSeverity, reviewAction, reviewReason);
      triggerAlert((t('erfolg') || 'Erfolg'), 'Review wurde signiert und übermittelt.');
      setReviewReason('');
      loadTabData(activeTab);
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message || 'Review fehlgeschlagen.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleOperatorActionSubmit = async e => {
    e.preventDefault();
    if (!activeIdentity) return;
    setBusy(true);
    try {
      await api.applyNodeOperatorAction(activeIdentity.ID, opTargetType, opTargetId, opSuspend, opReason);
      triggerAlert((t('erfolg') || 'Erfolg'), (t('ac_tab_operator') || 'Node Operator') + ' Maßnahme wurde angewendet.');
      setOpTargetId('');
      setOpReason('');
      loadTabData(activeTab);
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message || 'Override fehlgeschlagen.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleSnapshotTrigger = async () => {
    setBusy(true);
    try {
      await api.createTransparencySnapshot();
      triggerAlert((t('erfolg') || 'Erfolg'), 'Transparenz-Snapshot wurde erzeugt.');
      if (activeTab === 'public_transparency') {
        loadTabData(activeTab);
      }
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message || 'Snapshot fehlgeschlagen.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const parseDisclosurePackage = () => {
    const parsed = safeJsonParse(disclosurePackageText, null);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Disclosure-Paket muss ein JSON-Objekt sein.');
    }
    return parsed;
  };

  const refreshSelectedCase = async () => {
    if (!selectedCase) return;
    const res = await api.getReportDetail(selectedCase.id);
    setCaseDetail(res);
  };

  const handleDisclosureSubmit = async e => {
    e.preventDefault();
    if (!activeIdentity || !selectedCase) return;
    setBusy(true);
    try {
      const disclosurePackage = parseDisclosurePackage();
      await api.createCaseDisclosure(selectedCase.id, activeIdentity.ID, disclosureRole, disclosurePackage, '');
      triggerAlert('Disclosure gespeichert', 'Das freiwillige Beweispaket wurde dem Fall hinzugefügt.');
      await refreshSelectedCase();
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message || 'Disclosure fehlgeschlagen.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateGaiasEyesKey = async () => {
    if (!activeIdentity || !selectedCase) return;
    setBusy(true);
    try {
      const disclosurePackage = parseDisclosurePackage();
      const res = await api.createGaiasEyesGrant(activeIdentity.ID, {
        caseId: selectedCase.id,
        scope: 'case',
        disclosurePackage,
        signature: '',
        ttlSeconds: Number(gaiasEyesTTL) || 900
      });
      setGaiasEyesKey(res.key || null);
      triggerAlert('GaiasEyesKey erstellt', 'Der Einmal-Schlüssel wurde erzeugt und zerfällt nach Nutzung.');
      await refreshSelectedCase();
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message || 'GaiasEyesKey konnte nicht erstellt werden.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestDisclosure = async () => {
    if (!activeIdentity || !selectedCase) return;
    setBusy(true);
    try {
      await api.requestCaseDisclosure(selectedCase.id, activeIdentity.ID, requestTargetRole, requestReason);
      triggerAlert('Anfrage gesendet', 'Die Offenlegungsanfrage wurde im Fallprotokoll vermerkt.');
      await refreshSelectedCase();
    } catch (err) {
      triggerAlert((t('error') || 'Fehler'), err.message || 'Offenlegungsanfrage fehlgeschlagen.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    myReports,
    reviewerCases,
    operatorCases,
    transparency,
    roles,
    isReviewer,
    isOperator,
    loading,
    error,
    selectedCase,
    caseDetail,
    appealReason,
    setAppealReason,
    appealStatement,
    setAppealStatement,
    reviewCategory,
    setReviewCategory,
    reviewSeverity,
    setReviewSeverity,
    reviewAction,
    setReviewAction,
    reviewReason,
    setReviewReason,
    opTargetType,
    setOpTargetType,
    opTargetId,
    setOpTargetId,
    opSuspend,
    setOpSuspend,
    opReason,
    setOpReason,
    busy,
    disclosureRole,
    setDisclosureRole,
    disclosurePackageText,
    setDisclosurePackageText,
    gaiasEyesTTL,
    setGaiasEyesTTL,
    gaiasEyesKey,
    requestTargetRole,
    setRequestTargetRole,
    requestReason,
    setRequestReason,
    loadTabData,
    handleSelectCase,
    handleAppealSubmit,
    handleReviewSubmit,
    handleOperatorActionSubmit,
    handleSnapshotTrigger,
    handleDisclosureSubmit,
    handleCreateGaiasEyesKey,
    handleRequestDisclosure
  };
}
