import { useCallback, useEffect } from 'react';
import * as api from '../../api';
import { parseToGaiaID } from '../../utils/gaiaAddress';

/* Identity directory wiring: identity fetch, governance roles, sender role resolution (moved verbatim). */
export default function useAppIdentityWiring(ui) {
  const { setIdentities, setActiveIdentity, activeIdentity, activeIdentityRoles, setActiveIdentityRoles, contacts } = ui;

  async function fetchIdentities(currentUser, setShowWizard) {
    if (!currentUser) return;
    try {
      const list = await api.getMyIdentities();
      setIdentities(list || []);
      if (list && list.length > 0) {
        const cached = localStorage.getItem(`active_identity_${currentUser.id}`);
        const found = list.find(id => id.GaiaID === cached || id.ID === cached);
        setActiveIdentity(found || list[0]);
      } else {
        setActiveIdentity(null);
        setShowWizard(true);
      }
    } catch (_) {}
  }

  useEffect(() => {
    if (!activeIdentity) {
      setActiveIdentityRoles([]);
      return;
    }
    const fetchActiveRoles = async () => {
      try {
        const res = await api.getGovernanceRoles();
        if (res && res.roles) {
          setActiveIdentityRoles(res.roles);
        } else {
          setActiveIdentityRoles([]);
        }
      } catch (_) {
        setActiveIdentityRoles([]);
      }
    };
    fetchActiveRoles();
  }, [activeIdentity]);

  const getSenderRoles = useCallback((senderGaiaOrID) => {
    if (!senderGaiaOrID) return [];
    const parsed = parseToGaiaID(senderGaiaOrID);
    
    if (activeIdentity && parseToGaiaID(activeIdentity.GaiaID) === parsed) {
      return activeIdentityRoles;
    }
    
    const contact = contacts.find(c => parseToGaiaID(c.gaiaID) === parsed);
    if (contact?.trustPassport?.roles) {
      return contact.trustPassport.roles;
    }
    
    return [];
  }, [activeIdentity, activeIdentityRoles, contacts]);

  return { fetchIdentities, getSenderRoles };
}
