/**
 * VGT GaiaCom — secret clipboard handling (SEC-FE FE-05).
 *
 * Mnemonic seeds and device-pairing codes must never stay in the OS clipboard
 * indefinitely. `copySecretToClipboard` writes the value, schedules a bounded
 * auto-clear and reports the UI copy that must accompany the action. Other
 * clipboard copies (GaiaID, fingerprint) are not secrets and stay on the plain
 * `navigator.clipboard.writeText` path.
 */

export const SECRET_CLIPBOARD_WARNING =
  'In die Zwischenablage kopiert — nach dem Einfügen leeren. Wird nach 60 Sekunden automatisch entfernt.';

export const SECRET_CLIPBOARD_CLEAR_MS = 60 * 1000;

export function clipboardAvailable() {
  return typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText);
}

/**
 * Clears the clipboard only while it still contains our value, so a newer copy
 * made by the user is never destroyed. If reading the clipboard is not allowed
 * (permission prompt denied, unsupported API) the value is left to the user —
 * the visible warning already tells them to clear it.
 */
export async function clearClipboardIfUnchanged(expectedValue) {
  if (!clipboardAvailable()) return false;
  try {
    if (typeof navigator.clipboard.readText === 'function') {
      const current = await navigator.clipboard.readText();
      if (current !== expectedValue) return false;
    }
    await navigator.clipboard.writeText('');
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Copy a secret to the clipboard and schedule its removal.
 * Returns the timeout handle so a caller can cancel the auto-clear on unmount.
 */
export async function copySecretToClipboard(secret, { timeoutMs = SECRET_CLIPBOARD_CLEAR_MS } = {}) {
  if (!secret) throw new Error('Kein Wert zum Kopieren vorhanden.');
  if (!clipboardAvailable()) throw new Error('Zwischenablage ist auf diesem Gerät nicht verfügbar.');
  await navigator.clipboard.writeText(secret);
  const handle = setTimeout(() => {
    clearClipboardIfUnchanged(secret).catch(() => {});
  }, Math.max(1000, Number(timeoutMs) || SECRET_CLIPBOARD_CLEAR_MS));
  if (handle && typeof handle.unref === 'function') handle.unref();
  return handle;
}

export function cancelSecretClipboardClear(handle) {
  if (handle) clearTimeout(handle);
}
