// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../api';
import * as crypto from '../../crypto';
import {
  buildHumanProofPayload,
  createHumanProofChallenge,
  createHumanProofWorker,
  saveHumanProof as saveLocalHumanProof
} from '../../utils/humanProof';

const HUMAN_PROOF_DURATION_MS = 5 * 60 * 1000;

export default function HumanProofDialog({
  show,
  onClose,
  activeIdentity,
  derivedKeys,
  profile,
  triggerAlert,
  onVerified
}) {
  const workerRef = useRef(null);
  const [challenge, setChallenge] = useState(null);
  const [phraseInput, setPhraseInput] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [iterations, setIterations] = useState(0);
  const [digest, setDigest] = useState('');

  useEffect(() => {
    if (!show || !activeIdentity?.GaiaID) return;
    setChallenge(createHumanProofChallenge(activeIdentity.GaiaID));
    setPhraseInput('');
    setRunning(false);
    setProgress(0);
    setIterations(0);
    setDigest('');
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [show, activeIdentity?.GaiaID]);

  const phraseMatches = useMemo(() => {
    return Boolean(challenge?.phrase && phraseInput.trim().toUpperCase() === challenge.phrase);
  }, [challenge?.phrase, phraseInput]);

  if (!show || !challenge) return null;

  const closeDialog = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setRunning(false);
    onClose?.();
  };

  const startProof = () => {
    if (!phraseMatches || !activeIdentity?.GaiaID || !derivedKeys?.sign?.private) return;
    const worker = createHumanProofWorker();
    const startedAt = Date.now();
    workerRef.current = worker;
    setRunning(true);
    setProgress(0);
    setIterations(0);
    setDigest('');

    worker.onmessage = async event => {
      const data = event.data || {};
      if (data.type === 'progress') {
        setProgress(Number(data.progress) || 0);
        setIterations(Number(data.iterations) || 0);
        setDigest(String(data.digest || ''));
        return;
      }
      if (data.type === 'done') {
        const unsignedProof = {
          version: 'gaia-human-proof-v1',
          gaiaId: activeIdentity.GaiaID,
          displayName: profile?.displayName || activeIdentity.DisplayName || activeIdentity.GaiaID,
          challengeHash: data.challengeHash,
          digest: data.digest,
          iterations: Number(data.iterations) || 0,
          durationMs: Number(data.durationMs) || HUMAN_PROOF_DURATION_MS,
          completedAt: Number(data.completedAt) || Date.now(),
          algorithm: 'SHA-256 chained proof-of-work ceremony'
        };
        const signaturePayload = JSON.stringify(buildHumanProofPayload(unsignedProof));
        const mldsa87Private = derivedKeys?.mldsa87?.private || '';
        const mldsa87Public = mldsa87Private
          ? crypto.getMldsa87PublicKey(mldsa87Private)
          : '';
        const mldsa87Signature = mldsa87Private
          ? crypto.signMldsa87Message(signaturePayload, mldsa87Private)
          : '';
        const signedProof = {
          ...unsignedProof,
          signature: crypto.signGsnMessage(signaturePayload, derivedKeys.sign.private),
          signerPublicKey: derivedKeys.sign.public,
          signatureSuite: mldsa87Signature ? 'Ed25519+ML-DSA-87' : 'Ed25519',
          mldsa87Signature,
          mldsa87PublicKey: mldsa87Public
        };
        try {
          const identityId = activeIdentity.ID || activeIdentity.id;
          if (!identityId) throw new Error('Identity ID fehlt.');
          const response = await api.saveIdentityHumanProof(identityId, signedProof);
          const serverProof = response?.trustPassport?.humanProof || signedProof;
          saveLocalHumanProof(activeIdentity.GaiaID, serverProof);
          setProgress(1);
          setIterations(serverProof.iterations || signedProof.iterations);
          setDigest(serverProof.digest || signedProof.digest);
          triggerAlert?.('Gaia Passport verifiziert', 'Human-Proof wurde serverseitig geprueft und im Trust Passport gespeichert.');
          onVerified?.(serverProof, response?.trustPassport);
        } catch (err) {
          saveLocalHumanProof(activeIdentity.GaiaID, signedProof);
          triggerAlert?.('Human-Proof lokal gesichert', err.message || 'Server-Speicherung konnte nicht bestaetigt werden.', 'warning');
          onVerified?.(signedProof, null);
        } finally {
          setRunning(false);
          worker.terminate();
          workerRef.current = null;
        }
      }
    };

    worker.onerror = () => {
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
      triggerAlert?.('Human-Proof fehlgeschlagen', 'Die SHA-Ceremony konnte nicht abgeschlossen werden.', 'danger');
    };

    worker.postMessage({
      gaiaId: activeIdentity.GaiaID,
      phrase: challenge.phrase,
      salt: challenge.salt,
      durationMs: HUMAN_PROOF_DURATION_MS,
      startedAt
    });
  };

  return (
    <div className="popup-overlay human-proof-overlay">
      <div className="popup-card glass-panel human-proof-dialog">
        <div className="human-proof-header">
          <div>
            <span className="human-proof-eyebrow">GAIA PASSPORT HUMAN PROOF</span>
            <h3>Ich bin ein Mensch</h3>
          </div>
          <button type="button" className="chat-icon-btn" onClick={closeDialog} aria-label="Schliessen">
            {'\u2715'}
          </button>
        </div>

        <div className="human-proof-brief">
          Diese Verifizierung ist ein GaiaCom-PoC: Du bestaetigst bewusst eine Challenge und laesst danach eine lokale
          SHA-256 Ceremony laufen. Das beweist Rechenaufwand und erschwert Massenbots, ersetzt aber keine amtliche KYC-Pruefung.
        </div>

        <div className="human-proof-phrase">
          <span>Challenge Phrase</span>
          <strong>{challenge.phrase}</strong>
        </div>

        <label className="human-proof-input-row">
          <span>Phrase exakt eingeben</span>
          <input
            type="text"
            className="input-field"
            value={phraseInput}
            onChange={event => setPhraseInput(event.target.value)}
            disabled={running}
            autoComplete="off"
          />
        </label>

        <div className="human-proof-meter">
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="human-proof-stats">
          <span>{Math.round(progress * 100)}%</span>
          <span>{iterations.toLocaleString()} SHA Runden</span>
          <code>{digest ? `${digest.slice(0, 18)}...${digest.slice(-10)}` : 'wartet'}</code>
        </div>

        <div className="human-proof-actions">
          <button type="button" className="btn-secondary" onClick={closeDialog} disabled={running}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={startProof} disabled={!phraseMatches || running}>
            {running ? 'SHA Ceremony laeuft...' : '5-Minuten-Verifizierung starten'}
          </button>
        </div>
      </div>
    </div>
  );
}
