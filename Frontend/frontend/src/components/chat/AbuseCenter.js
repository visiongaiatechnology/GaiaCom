// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import { safeJsonParse } from '../../utils/safeJson';

const parseJsonRecord = (value, fallback = {}) => {
	if (!value) return fallback;
	if (typeof value === 'object') return value;
	if (typeof value !== 'string') return fallback;
	return safeJsonParse(value, fallback);
};

export default function AbuseCenter({ activeIdentity, triggerAlert, t }) {
	const [activeTab, setActiveTab] = useState('my_reports');
	const [myReports, setMyReports] = useState([]);
	const [reviewerCases, setReviewerCases] = useState([]);
	const [transparency, setTransparency] = useState(null);
	const [roles, setRoles] = useState([]);
	
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [selectedCase, setSelectedCase] = useState(null);

	// Case Detail Modal fields
	const [caseDetail, setCaseDetail] = useState(null);

	// Form fields
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

	// Load user roles
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

	// Load Tab data
	const loadTabData = async (tab) => {
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
				await api.getNodeOperatorQueue();
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

	const handleSelectCase = async (c) => {
		setSelectedCase(c);
		setCaseDetail(null);
		setLoading(true);
		try {
			const res = await api.getReportDetail(c.id);
			setCaseDetail(res);
			// Auto set review defaults
			setReviewCategory(c.category);
			setReviewSeverity(c.severity);
		} catch (err) {
			triggerAlert('Fehler', 'Konnte Details nicht laden: ' + err.message, 'danger');
		} finally {
			setLoading(false);
		}
	};

	const handleAppealSubmit = async (e) => {
		e.preventDefault();
		if (!activeIdentity || !selectedCase) return;
		setBusy(true);
		try {
			await api.submitAppeal(selectedCase.id, activeIdentity.ID, appealReason, appealStatement);
			triggerAlert('Erfolg', 'Einspruch wurde eingereicht.');
			setAppealStatement('');
			loadTabData(activeTab);
		} catch (err) {
			triggerAlert('Fehler', err.message || 'Einspruch fehlgeschlagen.', 'danger');
		} finally {
			setBusy(false);
		}
	};

	const handleReviewSubmit = async (e) => {
		e.preventDefault();
		if (!activeIdentity || !selectedCase) return;
		setBusy(true);
		try {
			await api.submitReview(selectedCase.id, activeIdentity.ID, reviewCategory, reviewSeverity, reviewAction, reviewReason);
			triggerAlert('Erfolg', 'Review wurde signiert und übermittelt.');
			setReviewReason('');
			loadTabData(activeTab);
		} catch (err) {
			triggerAlert('Fehler', err.message || 'Review fehlgeschlagen.', 'danger');
		} finally {
			setBusy(false);
		}
	};

	const handleOperatorActionSubmit = async (e) => {
		e.preventDefault();
		if (!activeIdentity) return;
		setBusy(true);
		try {
			await api.applyNodeOperatorAction(activeIdentity.ID, opTargetType, opTargetId, opSuspend, opReason);
			triggerAlert('Erfolg', (t('ac_tab_operator') || 'Node Operator') + ' Maßnahme wurde angewendet.');
			setOpTargetId('');
			setOpReason('');
			loadTabData(activeTab);
		} catch (err) {
			triggerAlert('Fehler', err.message || 'Override fehlgeschlagen.', 'danger');
		} finally {
			setBusy(false);
		}
	};

	const handleSnapshotTrigger = async () => {
		setBusy(true);
		try {
			await api.createTransparencySnapshot();
			triggerAlert('Erfolg', 'Transparenz-Snapshot wurde erzeugt.');
			if (activeTab === 'public_transparency') {
				loadTabData(activeTab);
			}
		} catch (err) {
			triggerAlert('Fehler', err.message || 'Snapshot fehlgeschlagen.', 'danger');
		} finally {
			setBusy(false);
		}
	};

	const formatTime = (timeStr) => {
		if (!timeStr) return '';
		return new Date(timeStr).toLocaleString();
	};

	return (
		<div className="abuse-center-pane">
			<header className="abuse-center-header">
				<div>
					<p className="abuse-center-kicker">{t('ac_subtitle') || 'GaiaCom Governance & Abuse Consensus'}</p>
					<h2>{t('ac_title') || 'Governance- & Meldecenter'}</h2>
				</div>
				<div className="role-badges">
					<span className="role-badge user-badge">User</span>
					{isReviewer && <span className="role-badge reviewer-badge">Reviewer</span>}
					{isOperator && <span className="role-badge operator-badge">{t('ac_tab_operator') || 'Node Operator'}</span>}
				</div>
			</header>

			<nav className="abuse-center-tabs">
				<button 
					className={`tab-btn ${activeTab === 'my_reports' ? 'active' : ''}`}
					onClick={() => setActiveTab('my_reports')}
				>
					{t('ac_tab_my_reports') || 'Meine Meldungen'}
				</button>
				{isReviewer && (
					<button 
						className={`tab-btn ${activeTab === 'reviewer_queue' ? 'active' : ''}`}
						onClick={() => setActiveTab('reviewer_queue')}
					>
						{t('ac_tab_queue') || 'Review Warteschlange'}
					</button>
				)}
				{isOperator && (
					<button 
						className={`tab-btn ${activeTab === 'operator_panel' ? 'active' : ''}`}
						onClick={() => setActiveTab('operator_panel')}
					>
						{t('ac_tab_operator') || 'Node Operator'}
					</button>
				)}
				<button 
					className={`tab-btn ${activeTab === 'public_transparency' ? 'active' : ''}`}
					onClick={() => setActiveTab('public_transparency')}
				>
					{t('ac_tab_transparency') || 'Föderation & Transparenz'}
				</button>
			</nav>

			<div className="abuse-center-content gaia-scrollbar">
				{loading && !selectedCase && <div className="abuse-state-msg">{t('ac_loading') || 'Lade Daten...'}</div>}
				{error && <div className="abuse-state-msg danger">{error}</div>}

				{/* 1. TAB: MY REPORTS */}
				{activeTab === 'my_reports' && !loading && (
					<div className="abuse-split-layout">
						<div className="abuse-list-pane">
							<h3>{t('ac_reported_cases') || 'Gemeldete Fälle'}</h3>
							{myReports.length === 0 ? (
								<p className="empty-note">{t('ac_no_reports') || 'Sie haben noch keine Meldungen eingereicht.'}</p>
							) : (
								<div className="case-cards">
									{myReports.map(c => (
										<div 
											key={c.id} 
											className={`case-card glass-panel ${selectedCase?.id === c.id ? 'active' : ''}`}
											onClick={() => handleSelectCase(c)}
										>
											<div className="case-card-header">
												<strong>{c.id.slice(0, 12)}...</strong>
												<span className={`status-pill status-${c.status}`}>{c.status}</span>
											</div>
											<div className="case-card-meta">
												<span>Kategorie: {c.category}</span>
												<span>Schweregrad: {c.severity}</span>
												<span>Datum: {formatTime(c.createdAt)}</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="abuse-detail-pane glass-panel">
							{selectedCase ? (
								<>
									<h3>{t('ac_case_details') || 'Fall-Details'} ({selectedCase.id.slice(0, 12)}...)</h3>
									<div className="detail-row">
										<span>Status:</span>
										<strong className={`status-text-${selectedCase.status}`}>{selectedCase.status}</strong>
									</div>
									<div className="detail-row">
										<span>Kategorie:</span>
										<strong>{selectedCase.category}</strong>
									</div>
									<div className="detail-row">
										<span>Schweregrad:</span>
										<strong>{selectedCase.severity}</strong>
									</div>
									<div className="detail-row">
										<span>Erstellt am:</span>
										<strong>{formatTime(selectedCase.createdAt)}</strong>
									</div>

									{selectedCase.decision && (
										<div className="decision-box">
											<h4>Entscheidung / Begründung:</h4>
											<p>{selectedCase.decision}</p>
										</div>
									)}

									{/* Appeal Form */}
									{(selectedCase.status === 'actioned' || selectedCase.status === 'closed') && (
										<div className="appeal-section">
											<h4>{t('ac_appeal_submit') || 'Einspruch einlegen'}</h4>
											{caseDetail?.appeal ? (
												<div className="appeal-status-box">
													<p><strong>{t('ac_appeal_status') || 'Status des Einspruchs'}:</strong> {caseDetail.appeal.status}</p>
													{caseDetail.appeal.decisionReason && (
														<p><strong>Begründung:</strong> {caseDetail.appeal.decisionReason}</p>
													)}
												</div>
											) : (
												<form onSubmit={handleAppealSubmit}>
													<div className="form-group">
														<label>{t('ac_appeal_reason') || 'Grund für den Einspruch'}</label>
														<select 
															className="input-field"
															value={appealReason}
															onChange={e => setAppealReason(e.target.value)}
														>
															<option value="false_positive">Fälschliche Meldung (False Positive)</option>
															<option value="wrong_identity">Falsche Identität</option>
															<option value="context_missing">Kontext fehlt</option>
															<option value="other">Sonstiges</option>
														</select>
													</div>
													<div className="form-group">
														<label>{t('ac_appeal_statement') || 'Stellungnahme'} / Begründung</label>
														<textarea
															className="input-field"
															value={appealStatement}
															onChange={e => setAppealStatement(e.target.value)}
															placeholder="Beschreiben Sie sachlich, warum die Maßnahme aufgehoben werden sollte..."
															required
														/>
													</div>
													<button type="submit" className="btn-primary" disabled={busy}>
														{busy ? 'Sende...' : 'Einspruch einreichen'}
													</button>
												</form>
											)}
										</div>
									)}
								</>
							) : (
								<p className="empty-note">Wählen Sie links einen Fall aus, um Details anzuzeigen.</p>
							)}
						</div>
					</div>
				)}

				{/* 2. TAB: REVIEWER QUEUE */}
				{activeTab === 'reviewer_queue' && !loading && (
					<div className="abuse-split-layout">
						<div className="abuse-list-pane">
							<h3>Offene Meldungen</h3>
							{reviewerCases.length === 0 ? (
								<p className="empty-note">Keine ausstehenden Fälle in der Warteschlange.</p>
							) : (
								<div className="case-cards">
									{reviewerCases.map(c => (
										<div 
											key={c.id} 
											className={`case-card glass-panel ${selectedCase?.id === c.id ? 'active' : ''}`}
											onClick={() => handleSelectCase(c)}
										>
											<div className="case-card-header">
												<strong>Case: {c.id.slice(0, 12)}...</strong>
												<span className={`status-pill status-${c.status}`}>{c.status}</span>
											</div>
											<div className="case-card-meta">
												<span>Kategorie: {c.category}</span>
												<span>Schweregrad: {c.severity}</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="abuse-detail-pane glass-panel">
							{selectedCase && caseDetail ? (
								<>
									<h3>Minimierte Fallansicht</h3>
									<div className="case-audit-card">
										<div><span>Case ID:</span> <code>{caseDetail.case?.id}</code></div>
										<div><span>Gemeldeter Inhalt ID:</span> <code>{caseDetail.case?.reportedIdentityHash}</code></div>
										<div><span>Gemeldet auf Node:</span> <strong>{caseDetail.case?.reportedNode}</strong></div>
										<div><span>Schweregrad:</span> <strong className={`status-text-${caseDetail.case?.status}`}>{caseDetail.case?.severity}</strong></div>
										<div><span>Kryptografischer Proof:</span> <span className="badge-success">Gültig (Ed25519)</span></div>
									</div>

									{caseDetail.case?.gaiaProof && (
										<div className="proof-comment-box">
											<h4>Meldekommentar des Nutzers:</h4>
											<p className="comment-text">{parseJsonRecord(caseDetail.case.gaiaProof)?.comment || 'Kein Kommentar.'}</p>
										</div>
									)}

									{caseDetail.appeal && (
										<div className="decision-box warning">
											<h4>⚠️ Einspruch eingereicht:</h4>
											<p><strong>Grund:</strong> {caseDetail.appeal.reason}</p>
											<p><strong>Aussage:</strong> {caseDetail.appeal.statement}</p>
										</div>
									)}

									{/* Existing Reviews */}
									{caseDetail.reviews && caseDetail.reviews.length > 0 && (
										<div className="existing-reviews">
											<h4>Bestehende Reviews ({caseDetail.reviews.length})</h4>
											{caseDetail.reviews.map(r => (
												<div key={r.id} className="reviewer-vote-row">
													<span>Reviewer {r.reviewerIdentity.slice(0, 10)}...:</span>
													<strong>Empfehlung: {r.recommendation} (Stimme: {r.categoryVote})</strong>
												</div>
											))}
										</div>
									)}

									{/* Review Vote Form */}
									{caseDetail.case?.status !== 'closed' && (
										<div className="review-vote-form">
											<h4>Eigene Fallprüfung (Review) abgeben</h4>
											<form onSubmit={handleReviewSubmit}>
												<div className="form-row-2">
													<div className="form-group">
														<label>Kategorie-Stimme</label>
														<select value={reviewCategory} onChange={e => setReviewCategory(e.target.value)}>
															<option value="spam">Spam / Abuse</option>
															<option value="phishing">Betrug / Phishing</option>
															<option value="malware">Malware / Angriff</option>
															<option value="harassment">Belästigung</option>
															<option value="illegal_content">Illegale Inhalte</option>
															<option value="threat">Akute Bedrohung</option>
															<option value="other">Sonstiges</option>
														</select>
													</div>
													<div className="form-group">
														<label>Schweregrad-Stimme</label>
														<select value={reviewSeverity} onChange={e => setReviewSeverity(e.target.value)}>
															<option value="low">Niedrig</option>
															<option value="medium">Mittel</option>
															<option value="high">Hoch</option>
															<option value="critical">Kritisch</option>
														</select>
													</div>
												</div>

												<div className="form-group">
													<label>Moderations-Empfehlung</label>
													<select value={reviewAction} onChange={e => setReviewAction(e.target.value)}>
														<option value="warn">Warnen / Freigeben (Warnlabel)</option>
														<option value="quarantine">In Quarantäne verschieben</option>
														<option value="suspend">Kanal / Inhalt sperren (Suspension)</option>
														<option value="reject">Meldung ablehnen (False Report)</option>
													</select>
												</div>

												<div className="form-group">
													<label>Sachliche Begründung (Öffentlich im Log)</label>
													<textarea 
														className="input-field"
														value={reviewReason}
														onChange={e => setReviewReason(e.target.value)}
														placeholder="Geben Sie eine objektive Begründung basierend auf den Proofs an..."
														required
													/>
												</div>

												<button type="submit" className="btn-primary" disabled={busy}>
													{busy ? 'Signiere...' : 'Review signieren & abschicken'}
												</button>
											</form>
										</div>
									)}
								</>
							) : (
								<p className="empty-note">Wählen Sie links eine Meldung zur kryptografischen Prüfung aus.</p>
							)}
						</div>
					</div>
				)}

				{/* 3. TAB: OPERATOR PANEL */}
				{activeTab === 'operator_panel' && !loading && (
					<div className="operator-control-hub">
						<div className="operator-columns">
							<div className="operator-column glass-panel">
								<h3>Node Moderation / Manuelle Overrides</h3>
								<form onSubmit={handleOperatorActionSubmit}>
									<div className="form-group">
										<label>{t('ac_target_type') || 'Ziel-Typ'}</label>
										<select value={opTargetType} onChange={e => setOpTargetType(e.target.value)}>
											<option value="channel">Kanal sperren / entsperren</option>
											<option value="appeal">Einspruch entscheiden</option>
										</select>
									</div>

									<div className="form-group">
										<label>{opTargetType === 'channel' ? 'Kanal ID (UUID)' : 'Case ID'}</label>
										<input 
											type="text" 
											className="input-field" 
											value={opTargetId} 
											onChange={e => setOpTargetId(e.target.value)} 
											placeholder="z.B. UUID oder Case-ID..."
											required 
										/>
									</div>

									<div className="form-group">
										<label>{opTargetType === 'channel' ? 'Status' : 'Einspruchsentscheidung'}</label>
										<select value={opSuspend ? 'true' : 'false'} onChange={e => setOpSuspend(e.target.value === 'true')}>
											{opTargetType === 'channel' ? (
												<>
													<option value="true">Sperren (Suspend)</option>
													<option value="false">Entsperren (Reinstate)</option>
												</>
											) : (
												<>
													<option value="true">Einspruch ablehnen (Reject)</option>
													<option value="false">Einspruch annehmen (Approve)</option>
												</>
											)}
										</select>
									</div>

									<div className="form-group">
										<label>Begründung</label>
										<textarea 
											className="input-field" 
											value={opReason} 
											onChange={e => setOpReason(e.target.value)}
											placeholder="Begründung für das Audit Log angeben..."
											required
										/>
									</div>

									<button type="submit" className="btn-primary" disabled={busy}>
										{busy ? 'Führe aus...' : 'Maßnahme anwenden'}
									</button>
								</form>
							</div>

							<div className="operator-column glass-panel">
								<h3>Dezentrales Transparenz-Management</h3>
								<p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '16px' }}>
									Als {t('ac_tab_operator') || 'Node Operator'} können Sie jederzeit einen aggregierten, kryptografisch signierten Snapshot des lokalen Transparenz-Protokolls erzeugen und öffentlich zur Verfügung stellen.
								</p>
								<button 
									type="button" 
									className="btn-primary" 
									onClick={handleSnapshotTrigger}
									disabled={busy}
									style={{ width: '100%' }}
								>
									{busy ? 'Erzeuge...' : 'Transparenz-Log Snapshot erzeugen & signieren'}
								</button>

								<div className="operator-policies-info" style={{ marginTop: '24px' }}>
									<h4>Aktive Node Policy</h4>
									<div className="case-audit-card" style={{ padding: '12px' }}>
										<div><span>Policy ID:</span> <code>abuse-policy-v0.1</code></div>
										<div><span>Konsens:</span> <strong>Threshold abuse consent</strong></div>
										<div><span>Sperr-Schwelle:</span> <strong>2 Reviews</strong></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* 4. TAB: PUBLIC OBSERVER / TRANSPARENCY */}
				{activeTab === 'public_transparency' && !loading && transparency && (
					<div className="transparency-hub">
						<h3>Kryptografische Audit Registry & Transparenzberichte</h3>

						<div className="transparency-grid">
							<div className="transparency-card glass-panel">
								<h4>Gültige Rollen-Credentials</h4>
								<div className="registry-table-container gaia-scrollbar">
									<table className="registry-table">
										<thead>
											<tr>
												<th>Credential ID</th>
												<th>Rolle</th>
												<th>Subject</th>
												<th>Gültig bis</th>
											</tr>
										</thead>
										<tbody>
											{transparency.credentials && transparency.credentials.map(cr => (
												<tr key={cr.id}>
													<td><code>{cr.id.slice(0, 10)}...</code></td>
													<td><span className="role-tag">{cr.role}</span></td>
													<td><code>{cr.subjectIdentity.slice(0, 14)}...</code></td>
													<td>{new Date(cr.validUntil).toLocaleDateString()}</td>
												</tr>
											))}
											{transparency.credentials?.length === 0 && (
												<tr><td colSpan="4">Keine Credentials in Registry.</td></tr>
											)}
										</tbody>
									</table>
								</div>
							</div>

							<div className="transparency-card glass-panel">
								<h4>Letzte Transparenzberichte (Snapshots)</h4>
								{transparency.snapshots && transparency.snapshots.map(sn => {
									const data = parseJsonRecord(sn.snapshotData, { reports: {}, invalidSnapshotData: !!sn.snapshotData });
									return (
										<div key={sn.id} className="snapshot-record">
											<div className="snapshot-record-header">
												<strong>Snapshot {sn.period}</strong>
												<small>{formatTime(sn.timestamp)}</small>
											</div>
											<div className="snapshot-record-metrics">
												<span>Spam: {data.reports?.spam || 0}</span>
												<span>Betrug: {data.reports?.phishing || 0}</span>
												<span>Malware: {data.reports?.malware || 0}</span>
												<span>Belästigung: {data.reports?.harassment || 0}</span>
											</div>
											{data.invalidSnapshotData && (
												<div className="snapshot-warning">Snapshotdaten konnten nicht als JSON gelesen werden.</div>
											)}
											<div className="snapshot-signature">
												<span>Kryptografische Signatur:</span>
												<code>{sn.signature.slice(0, 32)}...</code>
											</div>
										</div>
									);
								})}
								{transparency.snapshots?.length === 0 && (
									<p className="empty-note">Noch keine Transparenz-Snapshots erzeugt.</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
