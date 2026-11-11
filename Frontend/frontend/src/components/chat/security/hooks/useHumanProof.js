import { useCallback, useEffect, useState } from 'react';
import * as api from '../../../../api';
import { getHumanProof, saveHumanProof } from '../../../../utils/humanProof';

/**
 * Human-proof and trust-passport state.
 *
 * Local proof is read from the local store; the server passport is loaded when
 * available. When the passport cannot be loaded the consumer renders an
 * explicit "unavailable" state instead of a zero-valued passport.
 */
export default function useHumanProof(activeIdentity) {
  const [humanProof, setHumanProof] = useState(null);
  const [trustPassport, setTrustPassport] = useState(null);
  const [passportError, setPassportError] = useState('');
  const [humanProofRefresh, setHumanProofRefresh] = useState(0);
  const [showHumanProofDialog, setShowHumanProofDialog] = useState(false);

  useEffect(() => {
    setHumanProof(getHumanProof(activeIdentity?.GaiaID));
  }, [activeIdentity?.GaiaID, humanProofRefresh]);

  useEffect(() => {
    let cancelled = false;
    async function loadTrustPassport() {
      if (!activeIdentity?.GaiaID) {
        setTrustPassport(null);
        return;
      }
      try {
        const passport = await api.getTrustPassport(activeIdentity.GaiaID);
        if (cancelled) return;
        setTrustPassport(passport || null);
        setPassportError('');
        if (passport?.humanProof) {
          saveHumanProof(activeIdentity.GaiaID, passport.humanProof);
          setHumanProof(passport.humanProof);
        }
      } catch (error) {
        if (cancelled) return;
        setTrustPassport(null);
        setPassportError(error?.message || 'Trust Passport konnte nicht geladen werden.');
      }
    }
    loadTrustPassport();
    return () => {
      cancelled = true;
    };
  }, [activeIdentity?.GaiaID, humanProofRefresh]);

  const refresh = useCallback(() => {
    setHumanProofRefresh(value => value + 1);
  }, []);

  const handleVerified = useCallback((proof, nextTrustPassport) => {
    if (proof) setHumanProof(proof);
    if (nextTrustPassport) setTrustPassport(nextTrustPassport);
    setHumanProofRefresh(value => value + 1);
    setShowHumanProofDialog(false);
  }, []);

  return {
    humanProof,
    trustPassport,
    passportError,
    showHumanProofDialog,
    setShowHumanProofDialog,
    handleVerified,
    refresh
  };
}
