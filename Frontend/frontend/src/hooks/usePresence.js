// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useEffect } from 'react';
import * as api from '../api';
import { parseToGaiaID } from '../utils/gaiaAddress';

/**
 * Manages online presence: sends a heartbeat for the active identity and
 * polls presence status for all contacts every 20 seconds.
 * Extracted from App.js (was lines 593–648). Zero logic changes.
 *
 * @param {object} params
 * @param {object|null} params.activeIdentity
 * @param {object|null} params.user
 * @param {Array}  params.contacts
 * @param {Function} params.setPresenceMap
 */
export function usePresence({ activeIdentity, user, contacts, setPresenceMap }) {
  // Send heartbeat every 30 seconds
  useEffect(() => {
    if (!activeIdentity?.ID || !user) {
      setPresenceMap({});
      return undefined;
    }
    let stopped = false;
    const sendHeartbeat = async () => {
      try {
        await api.sendPresenceHeartbeat(activeIdentity.ID, 'online');
      } catch (_) {}
    };
    sendHeartbeat();
    const interval = window.setInterval(() => {
      if (!stopped) {
        sendHeartbeat();
      }
    }, 30000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeIdentity?.ID, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll presence status of contacts every 20 seconds
  useEffect(() => {
    if (!activeIdentity?.ID || !user) {
      setPresenceMap({});
      return undefined;
    }
    const gaiaIds = contacts
      .map(contact => contact.gaiaID)
      .filter(Boolean)
      .filter(gaiaID => parseToGaiaID(gaiaID) !== parseToGaiaID(activeIdentity.GaiaID));
    if (gaiaIds.length === 0) {
      setPresenceMap({});
      return undefined;
    }
    let stopped = false;
    const loadPresence = async () => {
      try {
        const result = await api.getPresenceStatus(gaiaIds);
        if (!stopped) {
          setPresenceMap(result?.presence || {});
        }
      } catch (_) {}
    };
    loadPresence();
    const interval = window.setInterval(() => {
      if (!stopped) {
        loadPresence();
      }
    }, 20000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeIdentity?.GaiaID, activeIdentity?.ID, contacts, user]); // eslint-disable-line react-hooks/exhaustive-deps
}
