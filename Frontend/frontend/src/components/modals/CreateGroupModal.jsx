import React from 'react';
import Icon from '../ui/Icon';
import DialogShell from './DialogShell';

const GROUP_AVATAR_OPTIONS = [
  '\u{1F465}',
  '\u{1F512}',
  '\u{1F6E1}\u{FE0F}',
  '\u{26A1}',
  '\u{1F680}',
  '\u{1F9E0}',
  '\u{1F4BB}',
  '\u{1F30C}',
  '\u{1F9EC}',
  '\u{1F525}',
  '\u{2728}',
  '\u{1F30D}'
];

/**
 * Create-room dialog: name, description, crisis marker and room avatar.
 * The avatar values are user content stored on the room, not UI icons; they are
 * kept as unicode escapes so the source carries no emoji glyphs.
 */
export const CreateGroupModal = ({
  show,
  onClose,
  groupNameInput,
  setGroupNameInput,
  groupDescriptionInput,
  setGroupDescriptionInput,
  groupAvatarInput,
  setGroupAvatarInput,
  handleCreateRoom,
  isCrisisRoomInput,
  setIsCrisisRoomInput,
  t
}) => {
  if (!show) return null;

  return (
    <DialogShell
      id="create-group"
      eyebrow="Räume"
      title={t('create_group_title') || 'Neue Gruppe erstellen'}
      description="Räume bündeln Kanäle und Mitglieder unter einer gemeinsamen Identität."
      onClose={onClose}
      closeLabel={t('abbrechen') || 'Abbrechen'}
      size="sm"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('abbrechen') || 'Abbrechen'}
          </button>
          <button type="submit" form="create-group-form" className="btn-primary">
            <Icon name="plus" size={15} />
            {t('create_btn') || 'Erstellen'}
          </button>
        </div>
      }
    >
      <form id="create-group-form" className="vgt-dialog__form" onSubmit={handleCreateRoom}>
        <div className="vgt-field">
          <label className="vgt-label" htmlFor="create-group-name">
            {t('group_name') || 'Gruppenname'}
          </label>
          <input
            id="create-group-name"
            type="text"
            className="input-field"
            placeholder="Projekt Alpha…"
            value={groupNameInput}
            onChange={event => setGroupNameInput(event.target.value)}
            required
          />
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="create-group-description">
            {t('group_description') || 'Beschreibung'}
          </label>
          <input
            id="create-group-description"
            type="text"
            className="input-field"
            placeholder={t('hybrid_pq_exchange') || 'Hybrider Post-Quanten-Austausch über die GaiaID'}
            value={groupDescriptionInput}
            onChange={event => setGroupDescriptionInput(event.target.value)}
          />
        </div>

        <label className="vgt-switch" htmlFor="create-group-crisis">
          <input
            id="create-group-crisis"
            type="checkbox"
            checked={isCrisisRoomInput}
            onChange={event => setIsCrisisRoomInput(event.target.checked)}
          />
          <span className="vgt-switch__track" aria-hidden="true" />
          <span className="vgt-field__label">
            {t('create_group_is_crisis') || 'Als Krisenraum markieren'}
            <span className="vgt-caption">Aktiviert erweiterte Richtlinien und Hinweise im Raum.</span>
          </span>
        </label>

        <div className="vgt-field">
          <span className="vgt-label">{t('group_icon_label') || 'Gruppen-Icon'}</span>
          <div className="vgt-avatar-grid" role="group" aria-label={t('group_icon_label') || 'Gruppen-Icon'}>
            {GROUP_AVATAR_OPTIONS.map(glyph => (
              <button
                key={glyph}
                type="button"
                className={`vgt-avatar-choice${groupAvatarInput === glyph ? ' is-active' : ''}`}
                aria-pressed={groupAvatarInput === glyph}
                onClick={() => setGroupAvatarInput(glyph)}
              >
                <span aria-hidden="true">{glyph}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </DialogShell>
  );
};

export default CreateGroupModal;
