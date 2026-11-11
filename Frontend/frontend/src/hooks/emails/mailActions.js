// useEmails reply/export/report actions (moved verbatim from useEmails.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';
import * as crypto from '../../crypto';
import { parseToGaiaID, displayGaiaID } from '../../utils/gaiaAddress';
import { parsePayload } from '../../utils/payload';
import { assertSecureExportClean, sanitizeSecureExport } from '../../utils/secureExport';
import { parsePublicRecordValue } from './mailHelpers';

export function createMailActions(ctx) {
  const {
    activeIdentity,
    derivedKeys,
    contacts,
    triggerAlert,
    showConfirm,
    t,
    pollEmails,
    setComposeTo,
    setComposeSubject,
    setComposeBody,
    setComposeReplyTo,
    setSelectedMail,
    setIsComposing
  } = ctx;

  function handleReplyMail(mail, options = {}) {
    if (!mail) return;
    const selfGaia = activeIdentity?.GaiaID;
    let recipient = mail.senderGaia || displayGaiaID(mail.sender);

    if (options.replyAll) {
      const otherRecipients = [];
      if (mail.recipientGaia && mail.recipientGaia !== selfGaia && mail.recipientGaia !== recipient) {
        otherRecipients.push(mail.recipientGaia);
      }
      if (otherRecipients.length > 0) {
        recipient = `${recipient}, ${otherRecipients.join(', ')}`;
      }
    }

    let subject = mail.subject || '(Kein Betreff)';
    let body = mail.body || '';

    if (options.forward) {
      subject = subject.toLowerCase().startsWith('fwd:') ? subject : `Fwd: ${subject}`;
      body = `\n\n--- Weitergeleitete Nachricht von ${recipient} ---\n${body}`;
      recipient = '';
    } else {
      subject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
      body = `\n\n--- Ursprüngliche Nachricht von ${recipient} ---\n${body}`;
    }

    setComposeTo(recipient);
    setComposeSubject(subject);
    setComposeBody(body);
    setComposeReplyTo({
      messageId: mail.id,
      sender: mail.sender,
      timestamp: mail.createdAt
    });
    setSelectedMail(null);
    setIsComposing(true);
  }

  async function resolveIdentityPublicKeys(gaiaID) {
    const formatted = parseToGaiaID(gaiaID);
    if (activeIdentity && parseToGaiaID(activeIdentity.GaiaID) === formatted) {
      const activeRecord = parsePublicRecordValue(activeIdentity.PublicRecord || activeIdentity.publicRecord);
      if (activeRecord?.public_keys) return activeRecord.public_keys;
      if (derivedKeys) {
        return {
          identity: derivedKeys.sign.public,
          box: derivedKeys.box.public,
          pke: derivedKeys.pke.public
        };
      }
    }

    const cached = contacts.find(contact => parseToGaiaID(contact.gaiaID) === formatted);
    if (cached?.publicKey) {
      return { identity: cached.publicKey };
    }

    const response = await api.getPublicIdentity(formatted);
    const publicRecord = parsePublicRecordValue(response.publicRecord);
    return publicRecord?.public_keys || {};
  }

  function downloadJSON(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExportDisclosurePackage(mail) {
    try {
      const payloadObj = parsePayload(mail.rawPayload);
      if (!payloadObj) {
        throw new Error('Ungültiger oder fehlender Nachrichteninhalt.');
      }

      const proof = await api.getMessageProof(mail.id);
      const senderKeys = await resolveIdentityPublicKeys(mail.sender);
      const recipientKeys = await resolveIdentityPublicKeys(mail.recipient);
      const ciphertextHash = proof?.ciphertextHash || crypto.sha256Hex(payloadObj.payload_ciphertext);
      const senderPublicKey = senderKeys.identity || proof?.sender || mail.sender;
      const recipientPublicKey = recipientKeys.identity || proof?.recipient || mail.recipient;
      let abuseProof = '';
      try {
        abuseProof = crypto.calculateReportProof(mail.id, senderPublicKey, recipientPublicKey, ciphertextHash);
      } catch (_) {}

      const runExport = (includePlaintext) => {
        const disclosurePackage = {
          package_type: 'gaiacom.secure_disclosure.v1',
          exported_at: new Date().toISOString(),
          message_id: mail.id,
          sender_gaia_id: mail.sender,
          recipient_gaia_id: mail.recipient,
          sender_pubkey: senderPublicKey,
          recipient_pubkey: recipientPublicKey,
          ciphertext_hash: ciphertextHash,
          signature: proof?.senderSignature || payloadObj.signature || '',
          timestamp: proof?.serverReceivedAt || mail.createdAt,
          abuse_proof: abuseProof,
          gaia_proof: proof,
          tamper_evidence: {
            envelope_hash: proof?.envelopeHash || '',
            delivery_receipts: proof?.receipts || []
          },
          plaintext_disclosure: includePlaintext ? {
            subject: mail.subject,
            body: mail.body,
            disclosed_by: activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : '',
            disclosed_at: new Date().toISOString()
          } : null
        };

        downloadJSON(`gaiacom-disclosure-${mail.id}.json`, assertSecureExportClean(sanitizeSecureExport(disclosurePackage)));
        triggerAlert('Disclosure exportiert', 'Das Sicherheitsfall-Paket wurde lokal als JSON exportiert.', 'warning');
      };

      showConfirm(
        t('export_package_title') || 'Disclosure Package exportieren',
        t('export_package_desc') || 'Möchtest du den Klartext der Nachricht in das exportierte Sicherheits-Paket aufnehmen? (Bestätige nur, wenn du diesen Inhalt bewusst gegenüber Behörden/Anwälten offenlegen willst.)',
        () => runExport(true),
        () => runExport(false),
        t('include_plaintext') || 'Ja, Klartext einschließen',
        t('exclude_plaintext') || 'Nein, nur Beweise exportieren'
      );
    } catch (err) {
      triggerAlert('Export failed', err.message, 'danger');
    }
  }

  async function handleReportMail(mail) {
    showConfirm(
      t('report_abuse_title') || 'Missbrauch melden',
      t('report_abuse_desc') || 'Möchtest du diese Nachricht wirklich melden? Dies generiert einen kryptographischen Missbrauchsbeweis und übermittelt ihn dem Server.',
      async () => {
        try {
          const payloadObj = parsePayload(mail.rawPayload);
          if (!payloadObj) {
            throw new Error('Ungültiger oder fehlender Nachrichteninhalt.');
          }
          const ciphertextHash = crypto.sha256Hex(payloadObj.payload_ciphertext);

          await api.submitReport(
            mail.id,
            mail.sender,
            activeIdentity.publicKeyHex,
            ciphertextHash,
            payloadObj.signature
          );

          triggerAlert('Report eingereicht', 'Der Missbrauchsbeweis wurde übermittelt. Die Reputation wurde angepasst.', 'warning');
          setSelectedMail(null);
          pollEmails();
        } catch (err) {
          triggerAlert('Fehler beim Melden', err.message, 'danger');
        }
      },
      null,
      t('melden') || 'Melden',
      t('abbrechen') || 'Abbrechen',
      true
    );
  }

  return {
    handleReplyMail,
    resolveIdentityPublicKeys,
    handleExportDisclosurePackage,
    handleReportMail
  };
}
