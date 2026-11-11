import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../api';
import * as crypto from '../../crypto';
import {
  buildHumanProofPayload,
  createHumanProofChallenge,
  createHumanProofWorker,
  saveHumanProof as saveLocalHumanProof
} from '../../utils/humanProof';
import Icon from '../ui/Icon';
import useDialogA11y from './useDialogA11y';

const HUMAN_PROOF_DURATION_MS = 5 * 60 * 1000;

const RESULT_PRESENTATION = {
  verified: {
    icon: 'verified',
    title: 'Serverseitig verifiziert',
    tone: 'verified'
  },
  rejected: {
    icon: 'alertOctagon',
    title: 'Server hat den Proof abgelehnt',
    tone: 'danger'
  },
  unconfirmed: {
    icon: 'alertTriangle',
    title: 'Serverbestätigung fehlt',
    tone: 'warning'
  },
  error: {
    icon: 'alertTriangle',
    title: 'Ceremony fehlgeschlagen',
    tone: 'danger'
  }
};

/**
 * Classify a failed server call. Only an explicit rejection is reported as
 * "rejected"; transport/unknown failures stay "unconfirmed" so the UI does not
 * invent a verdict the server never gave.
 */
function classifyFailure(message) {
  const text = String(message || '');
  return /reject|invalid|denied|ungültig|abgelehnt/i.test(text) ? 'rejected' : 'unconfirmed';
}

/**
 * VGT GLASS 2100 — Gaia Passport human-proof dialog.
 *
 * Proof creation, signing and the server protocol are unchanged. The client
 * state is now truthful: the passport is raised to "verified" only after the
 * server answered 200 with `status: "ok"` and a server-validated
 * `trustPassport.humanProof` (see `identity_handler.go:117-120` and
 * `identity_service.go:279-284`). Rejected / unconfirmed / ceremony-error results
 * are distinct, text-labelled states; the local proof is kept as a local record
 * with provenance markers so `GaiaPassportCard` can never present it as verified.
 */
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
  const [verification, setVerification] = useState({ status: 'idle', message: '' });

  const closeDialog = React.useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setRunning(false);
    onClose?.();
  }, [onClose]);

  const dialogRef = useDialogA11y(Boolean(show && challenge), {
    onClose: closeDialog,
    closeOnEscape: !running
  });

  useEffect(() => {
    if (!show || !activeIdentity?.GaiaID) return undefined;
    setChallenge(createHumanProofChallenge(activeIdentity.GaiaID));
    setPhraseInput('');
    setRunning(false);
    setProgress(0);
    setIterations(0);
    setDigest('');
    setVerification({ status: 'idle', message: '' });
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

  const startProof = () => {
    if (!phraseMatches || !activeIdentity?.GaiaID || !derivedKeys?.sign?.private) return;
    const worker = createHumanProofWorker();
    const startedAt = Date.now();
    workerRef.current = worker;
    setRunning(true);
    setProgress(0);
    setIterations(0);
    setDigest('');
    setVerification({ status: 'idle', message: '' });

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
          if (!identityId) throw new Error('Identity ID fehlt; keine Serverprüfung möglich.');
          const response = await api.saveIdentityHumanProof(identityId, signedProof);
          const serverTrustPassport = response?.trustPassport || null;
          const serverProof = serverTrustPassport?.humanProof;

          if (response?.status !== 'ok' || !serverProof || typeof serverProof !== 'object') {
            const message =
              'Der Server hat keine serverseitig verifizierte Human-Proof-Bestätigung zurückgegeben. Der lokale Proof gilt daher nicht als verifiziert.';
            saveLocalHumanProof(activeIdentity.GaiaID, {
              ...signedProof,
              localOnly: true,
              serverConfirmation: 'missing',
              serverError: message
            });
            setVerification({ status: 'unconfirmed', message });
            triggerAlert?.('Human-Proof nicht bestätigt', message, 'danger');
            return;
          }

          const verifiedProof = {
            ...serverProof,
            serverVerified: true,
            serverVerifiedAt: Date.now()
          };
          saveLocalHumanProof(activeIdentity.GaiaID, verifiedProof);
          setProgress(1);
          setIterations(verifiedProof.iterations || signedProof.iterations);
          setDigest(verifiedProof.digest || signedProof.digest);
          setVerification({
            status: 'verified',
            message: 'Der Server hat den Human-Proof geprüft und im Trust Passport gespeichert.'
          });
          triggerAlert?.(
            'Gaia Passport verifiziert',
            'Human-Proof wurde serverseitig geprüft und im Trust Passport gespeichert.'
          );
          onVerified?.(verifiedProof, serverTrustPassport);
        } catch (err) {
          const message = err?.message || 'Serverbestätigung fehlgeschlagen.';
          const failure = classifyFailure(message);
          saveLocalHumanProof(activeIdentity.GaiaID, {
            ...signedProof,
            localOnly: true,
            serverConfirmation: failure,
            serverError: message
          });
          setVerification({ status: failure, message });
          triggerAlert?.(
            failure === 'rejected' ? 'Human-Proof abgelehnt' : 'Serverbestätigung fehlgeschlagen',
            `${message} Der Proof wurde lokal gesichert, gilt aber nicht als serverseitig verifiziert.`,
            failure === 'rejected' ? 'danger' : 'warning'
          );
        } finally {
          setRunning(false);
          worker.terminate();
          workerRef.current = null;
        }
      }
    };

    worker.onerror = () => {
      const message = 'Die SHA-Ceremony konnte nicht abgeschlossen werden.';
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
      setVerification({ status: 'error', message });
      triggerAlert?.('Human-Proof fehlgeschlagen', message, 'danger');
    };

    worker.postMessage({
      gaiaId: activeIdentity.GaiaID,
      phrase: challenge.phrase,
      salt: challenge.salt,
      durationMs: HUMAN_PROOF_DURATION_MS,
      startedAt
    });
  };

  const percent = Math.round(progress * 100);
  const result = verification.status !== 'idle' ? RESULT_PRESENTATION[verification.status] : null;

  return (
    <div className="vgt-overlay" role="presentation">
      <div
        ref={dialogRef}
        className="vgt-dialog vgt-hp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vgt-hp-title"
        aria-busy={running ? 'true' : 'false'}
      >
        <header className="vgt-dialog__head">
          <div className="vgt-hp__head">
            <span className="vgt-hp__seal" aria-hidden="true"><Icon name="fingerprint" size={22} /></span>
            <div>
              <p className="vgt-label">Gaia Passport</p>
              <h2 className="vgt-h3" id="vgt-hp-title">Ich bin ein Mensch</h2>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={closeDialog}
            disabled={running}
            aria-label="Schließen"
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        <p className="vgt-body vgt-body--sm">
          Diese Verifizierung bestätigt bewusst eine Challenge und lässt danach eine lokale
          SHA-256-Ceremony laufen. Sie belegt Rechenaufwand und erschwert Massenbots, ersetzt aber
          keine amtliche Identitätsprüfung. Als verifiziert gilt der Passport erst nach der
          Serverprüfung — ein lokaler Nachweis allein wird nicht als verifiziert angezeigt.
        </p>

        <div className="vgt-hp__phrase">
          <span className="vgt-label">Challenge-Phrase</span>
          <strong className="vgt-mono">{challenge.phrase}</strong>
        </div>

        <div className="vgt-field">
          <label className="input-label" htmlFor="vgt-hp-phrase">Phrase exakt eingeben</label>
          <input
            id="vgt-hp-phrase"
            type="text"
            className="input-field"
            value={phraseInput}
            onChange={event => setPhraseInput(event.target.value)}
            disabled={running}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <div
          className="vgt-hp__meter"
          role="progressbar"
          aria-label="Fortschritt der Human-Proof-Ceremony"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="vgt-hp__meter-fill" style={{ width: `${percent}%` }} />
        </div>

        <div className="vgt-hp__stats">
          <span className="vgt-numeric">{percent} %</span>
          <span className="vgt-numeric">{iterations.toLocaleString()} SHA-Runden</span>
          <code className="vgt-mono">{digest ? `${digest.slice(0, 18)}...${digest.slice(-10)}` : 'wartet'}</code>
        </div>

        {result ? (
          <div
            className={`vgt-hp__result vgt-hp__result--${result.tone}`}
            role={verification.status === 'verified' ? 'status' : 'alert'}
          >
            <span className="vgt-hp__result-icon" aria-hidden="true">
              <Icon name={result.icon} size={16} />
            </span>
            <div className="vgt-hp__result-text">
              <strong>{result.title}</strong>
              <p>{verification.message}</p>
            </div>
          </div>
        ) : null}

        <footer className="vgt-dialog__foot">
          <button type="button" className="btn-secondary" onClick={closeDialog} disabled={running}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={startProof} disabled={!phraseMatches || running}>
            <Icon name="shieldCheck" size={16} />
            {running ? 'Prüfung läuft' : '5-Minuten-Verifizierung starten'}
          </button>
        </footer>
      </div>
    </div>
  );
}
