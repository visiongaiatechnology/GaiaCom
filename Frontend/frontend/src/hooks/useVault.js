import { useState } from 'react';
import * as crypto from '../crypto';
import { createClientMessageId } from '../utils/payload';

export default function useVault({ user, triggerAlert }) {
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPasswordInput, setVaultPasswordInput] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [vaultRecords, setVaultRecords] = useState([]);
  const [selectedVaultRecord, setSelectedVaultRecord] = useState(null);
  const [vaultDraftTitle, setVaultDraftTitle] = useState('');
  const [vaultDraftCategory, setVaultDraftCategory] = useState('identity');
  const [vaultDraftBody, setVaultDraftBody] = useState('');

  const vaultStorageKey = user ? `gaia_vault_${user.id}` : '';

  async function persistVaultRecords(nextRecords, password = vaultPasswordInput) {
    if (!user || !password) {
      throw new Error('Vault password required.');
    }
    const envelope = await crypto.encryptLocalRecord({
      version: 1,
      records: nextRecords,
      updatedAt: new Date().toISOString()
    }, password);
    localStorage.setItem(vaultStorageKey, JSON.stringify(envelope));
    setVaultRecords(nextRecords);
  }

  async function handleUnlockVault(e) {
    if (e) e.preventDefault();
    setVaultError('');
    if (!user) return;
    if (!vaultPasswordInput) {
      setVaultError('Passwort erforderlich.');
      return;
    }
    const stored = localStorage.getItem(vaultStorageKey);
    try {
      if (!stored) {
        await persistVaultRecords([], vaultPasswordInput);
        setVaultUnlocked(true);
        triggerAlert('GaiaVault erstellt', 'Dein lokaler Tresor wurde verschlüsselt angelegt.');
        return;
      }
      const decrypted = await crypto.decryptLocalRecord(JSON.parse(stored), vaultPasswordInput);
      setVaultRecords(Array.isArray(decrypted.records) ? decrypted.records : []);
      setVaultUnlocked(true);
    } catch (_) {
      setVaultError('Tresor konnte nicht entsperrt werden.');
    }
  }

  async function handleAddVaultRecord(e) {
    if (e) e.preventDefault();
    if (!vaultUnlocked || !vaultDraftTitle.trim() || !vaultDraftBody.trim()) return;
    try {
      const now = new Date().toISOString();
      const nextRecords = [
        {
          id: createClientMessageId(),
          title: vaultDraftTitle.trim().slice(0, 80),
          category: vaultDraftCategory,
          body: vaultDraftBody.trim().slice(0, 5000),
          createdAt: now,
          updatedAt: now
        },
        ...vaultRecords
      ];
      await persistVaultRecords(nextRecords);
      setVaultDraftTitle('');
      setVaultDraftBody('');
      triggerAlert('GaiaVault gespeichert', 'Der Secure Record wurde lokal verschlüsselt gespeichert.');
    } catch (err) {
      setVaultError(err.message);
    }
  }

  async function handleDeleteVaultRecord(recordId) {
    if (!vaultUnlocked) return;
    try {
      const nextRecords = vaultRecords.filter(record => record.id !== recordId);
      await persistVaultRecords(nextRecords);
      triggerAlert('GaiaVault aktualisiert', 'Der Secure Record wurde aus deinem lokalen Tresor entfernt.');
    } catch (err) {
      setVaultError(err.message);
    }
  }

  function handleLockVault() {
    setVaultUnlocked(false);
    setVaultPasswordInput('');
    setVaultError('');
    setVaultRecords([]);
    setVaultDraftTitle('');
    setVaultDraftBody('');
    setSelectedVaultRecord(null);
  }

  return {
    vaultUnlocked, setVaultUnlocked,
    vaultPasswordInput, setVaultPasswordInput,
    vaultError, setVaultError,
    vaultRecords, setVaultRecords,
    selectedVaultRecord, setSelectedVaultRecord,
    vaultDraftTitle, setVaultDraftTitle,
    vaultDraftCategory, setVaultDraftCategory,
    vaultDraftBody, setVaultDraftBody,
    handleUnlockVault,
    handleAddVaultRecord,
    handleDeleteVaultRecord,
    handleLockVault
  };
}
