import React from 'react';
import VoiceNotePlayer from './VoiceNotePlayer';
import { DecryptedImage, DecryptedFileDownload } from './DecryptedAttachments';

/**
 * Attachment list of a message. Type is decided from the real attachment record
 * (inline audio data, decrypted image mime type, otherwise encrypted download).
 * Stable positional keys: the attachment array of a message is immutable.
 */
export default function MessageAttachments({ attachments, triggerAlert }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;

  return (
    <div className="vgt-attach-list">
      {attachments.map((attachment, index) => {
        if (attachment.inlineData) {
          return <VoiceNotePlayer key={`voice-${index}`} inlineData={attachment.inlineData} />;
        }
        if (attachment.mimeType && String(attachment.mimeType).startsWith('image/')) {
          return (
            <DecryptedImage
              key={`image-${index}`}
              fileId={attachment.fileId}
              keyHex={attachment.keyHex}
              ivHex={attachment.ivHex}
              alt={attachment.fileName}
            />
          );
        }
        return (
          <DecryptedFileDownload
            key={`file-${index}`}
            fileId={attachment.fileId}
            keyHex={attachment.keyHex}
            ivHex={attachment.ivHex}
            fileName={attachment.fileName}
            triggerAlert={triggerAlert}
          />
        );
      })}
    </div>
  );
}
