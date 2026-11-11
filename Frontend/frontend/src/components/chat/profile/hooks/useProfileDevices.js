import { useCallback, useEffect, useState } from 'react';
import * as api from '../../../../api';
import * as crypto from '../../../../crypto';
import { safeJsonParse } from '../../../../utils/safeJson';

/**
 * Local-only device state for the identity pane.
 *
 * Behaviour-preserving extraction of the previous ProfilePane logic: browser
 * sessions, cryptographically paired device identities, key rotation and
 * device pairing approval. Every API/crypto call and every user-facing status
 * message is the same as before the redesign.
 */
export default function useProfileDevices({
  activeIdentity,
  deviceKeyVault,
  setDeviceKeyVault,
  derivedKeys,
  mnemonic
}) {
  const [deviceSessions, setDeviceSessions] = useState([]);
  const [deviceKeys, setDeviceKeys] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingStatus, setPairingStatus] = useState('');
  const [rotationPassword, setRotationPassword] = useState('');
  const [rotationBusy, setRotationBusy] = useState(false);
  const [rotationStatus, setRotationStatus] = useState('');

  const loadDeviceSessions = useCallback(async () => {
    setDevicesLoading(true);
    setDevicesError('');
    try {
      const result = await api.getDeviceSessions();
      setDeviceSessions(Array.isArray(result?.devices) ? result.devices : []);
    } catch (error) {
      setDevicesError(error.message || 'Geräte konnten nicht geladen werden.');
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  const loadDeviceKeys = useCallback(async () => {
    try {
      const result = await api.getDeviceKeys();
      setDeviceKeys(Array.isArray(result?.keys) ? result.keys : []);
    } catch (_) {
      setDeviceKeys([]);
    }
  }, []);

  useEffect(() => {
    loadDeviceSessions();
    loadDeviceKeys();
  }, [loadDeviceSessions, loadDeviceKeys]);

  const revokeDevice = async session => {
    if (!session?.id || session.isCurrent) return;
    setDevicesError('');
    try {
      await api.revokeDeviceSession(session.id);
      await loadDeviceSessions();
    } catch (error) {
      setDevicesError(error.message || 'Gerät konnte nicht abgemeldet werden.');
    }
  };

  const revokeDeviceKey = async key => {
    if (!key?.id || key.status !== 'active') return;
    try {
      await api.revokeDeviceKey(key.id);
      await loadDeviceKeys();
    } catch (error) {
      setDevicesError(error.message || 'Geraeteschluessel konnte nicht widerrufen werden.');
    }
  };

  const approveNewDevice = async event => {
    event.preventDefault();
    setPairingStatus('');
    const match = /^gaiacom:\/\/pairing\/([0-9a-f-]{36})\/([0-9a-f]{64})$/i.exec(pairingCode.trim());
    if (!match || !activeIdentity?.ID || !derivedKeys?.sign?.private || !mnemonic) {
      setPairingStatus('Der Pairing-Code oder der lokale Schluesselstatus ist ungueltig.');
      return;
    }
    setPairingBusy(true);
    try {
      const [, pairingId, secret] = match;
      const pairing = await api.getDevicePairing(pairingId, secret);
      if (pairing?.identityId !== activeIdentity.ID || pairing?.status !== 'pending') {
        throw new Error('Diese Anfrage gehoert nicht zur aktiven Identitaet oder ist nicht mehr offen.');
      }
      const encryptedPayload = await crypto.encryptDevicePairingPayload({
        mnemonic,
        identityId: activeIdentity.ID,
        sovereignKeys: derivedKeys.hqc256 || null,
        issuedAt: new Date().toISOString()
      }, pairing);
      const transcript = crypto.buildDevicePairingApprovalPayload(pairing, encryptedPayload);
      const signature = crypto.signGsnMessage(transcript, derivedKeys.sign.private);
      const deviceApproval = crypto.signDevicePairingApproval(pairing, encryptedPayload, deviceKeyVault);
      await api.approveDevicePairing(pairingId, secret, encryptedPayload, signature, deviceApproval.approverDeviceKeyId, deviceApproval.deviceSignature);
      setPairingCode('');
      setPairingStatus(`Geraet „${pairing.deviceLabel || 'neu'}“ wurde kryptografisch freigegeben.`);
      await loadDeviceSessions();
    } catch (error) {
      setPairingStatus(error.message || 'Geraetekopplung konnte nicht freigegeben werden.');
    } finally {
      setPairingBusy(false);
    }
  };

  const rotateCurrentDeviceKey = async event => {
    event.preventDefault();
    setRotationStatus('');
    if (!activeIdentity?.ID || !derivedKeys?.sign?.private || !mnemonic || !rotationPassword) {
      setRotationStatus('Dieses Geraet muss mit Passwort entsperrt sein, bevor sein Schluessel rotiert werden kann.');
      return;
    }
    setRotationBusy(true);
    try {
      if (deviceKeyVault?.deviceKeyId) {
        const storedVault = safeJsonParse(localStorage.getItem('gaia_device_key_vault_enc'), null);
        const verifiedVault = await crypto.decryptLocalRecord(storedVault, rotationPassword);
        if (verifiedVault?.deviceKeyId !== deviceKeyVault.deviceKeyId) throw new Error('Das lokale Tresorpasswort stimmt nicht mit der aktiven Geraeteidentitaet ueberein.');
      } else {
        const mnemonicEnvelope = safeJsonParse(localStorage.getItem('gaia_mnemonic_enc'), null);
        const verifiedMnemonic = await crypto.decryptMnemonic(mnemonicEnvelope, rotationPassword);
        if (verifiedMnemonic !== mnemonic) throw new Error('Das lokale Tresorpasswort ist ungueltig.');
      }
      const current = deviceKeys.find(key => key.id === deviceKeyVault?.deviceKeyId);
      const nextKeys = crypto.generateDevicePairingKeys();
      const started = await api.startDevicePairing(
        activeIdentity.ID,
        `${current?.deviceLabel || 'Dieses Geraet'} · Rotation`,
        nextKeys.publicKeys.box,
        nextKeys.publicKeys.pke,
        nextKeys.publicKeys.sign
      );
      const pairing = started?.pairing;
      if (!pairing?.id || !started?.secret) throw new Error('Rotation konnte nicht initialisiert werden.');
      const encryptedPayload = await crypto.encryptDevicePairingPayload({ mnemonic, identityId: activeIdentity.ID, sovereignKeys: derivedKeys.hqc256 || null, issuedAt: new Date().toISOString(), replacesDeviceKeyId: deviceKeyVault?.deviceKeyId || '' }, pairing);
      const signature = crypto.signGsnMessage(crypto.buildDevicePairingApprovalPayload(pairing, encryptedPayload), derivedKeys.sign.private);
      const deviceApproval = crypto.signDevicePairingApproval(pairing, encryptedPayload, deviceKeyVault);
      await api.approveDevicePairing(pairing.id, started.secret, encryptedPayload, signature, deviceApproval.approverDeviceKeyId, deviceApproval.deviceSignature);
      const consumed = await api.consumeDevicePairing(pairing.id, started.secret);
      if (!consumed?.deviceKey?.id) throw new Error('Neuer Geraeteschluessel wurde nicht registriert.');
      const nextVault = {
        version: 1,
        deviceKeyId: consumed.deviceKey.id,
        identityId: activeIdentity.ID,
        privateKeys: nextKeys.privateKeys,
        publicKeys: nextKeys.publicKeys
      };
      const encryptedVault = await crypto.encryptLocalRecord(nextVault, rotationPassword);
      localStorage.setItem('gaia_device_key_vault_enc', JSON.stringify(encryptedVault));
      setDeviceKeyVault(nextVault);
      if (deviceKeyVault?.deviceKeyId) await api.revokeDeviceKey(deviceKeyVault.deviceKeyId);
      setRotationPassword('');
      setRotationStatus('Rotation erfolgreich: Der vorherige Schluessel ist widerrufen.');
      await loadDeviceKeys();
    } catch (error) {
      setRotationStatus(error.message || 'Geraeteschluessel konnte nicht rotiert werden.');
    } finally {
      setRotationBusy(false);
    }
  };

  const formatDeviceTime = value => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  return {
    deviceSessions,
    deviceKeys,
    devicesLoading,
    devicesError,
    pairingCode,
    setPairingCode,
    pairingBusy,
    pairingStatus,
    rotationPassword,
    setRotationPassword,
    rotationBusy,
    rotationStatus,
    loadDeviceSessions,
    loadDeviceKeys,
    revokeDevice,
    revokeDeviceKey,
    approveNewDevice,
    rotateCurrentDeviceKey,
    formatDeviceTime
  };
}
