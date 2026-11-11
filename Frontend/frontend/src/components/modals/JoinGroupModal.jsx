import React from 'react';
import Icon from '../ui/Icon';
import DialogShell from './DialogShell';

/** Join a room via its secret invite hash. Contract unchanged. */
export const JoinGroupModal = ({ show, onClose, joinGroupHashInput, setJoinGroupHashInput, handleJoinRoom, t }) => {
  if (!show) return null;

  return (
    <DialogShell
      id="join-group"
      eyebrow="Räume"
      title={t('join_group_title') || 'Gruppe beitreten'}
      description="Der Einladungscode ist der geheime Raum-Hash, den dir ein Mitglied geteilt hat."
      onClose={onClose}
      closeLabel={t('abbrechen') || 'Abbrechen'}
      size="sm"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('abbrechen') || 'Abbrechen'}
          </button>
          <button type="submit" form="join-group-form" className="btn-primary">
            <Icon name="arrowRight" size={15} />
            {t('gruppe_beitreten') || 'Beitreten'}
          </button>
        </div>
      }
    >
      <form id="join-group-form" className="vgt-dialog__form" onSubmit={handleJoinRoom}>
        <div className="vgt-field">
          <label className="vgt-label" htmlFor="join-group-hash">
            {t('invite_code_label') || 'Einladungscode (Secret Hash)'}
          </label>
          <input
            id="join-group-hash"
            type="text"
            className="input-field vgt-mono"
            placeholder="64-stelliger Hex-Hash"
            value={joinGroupHashInput}
            onChange={event => setJoinGroupHashInput(event.target.value)}
            autoComplete="off"
            spellCheck="false"
            required
          />
          <span className="vgt-caption">Der Hash wird nur zum Beitritt verwendet und nicht öffentlich angezeigt.</span>
        </div>
      </form>
    </DialogShell>
  );
};

export default JoinGroupModal;
