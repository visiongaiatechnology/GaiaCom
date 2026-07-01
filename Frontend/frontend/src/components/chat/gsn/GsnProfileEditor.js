// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import DecryptedAvatar from './DecryptedAvatar';

export default function GsnProfileEditor({
  editRealName,
  setEditRealName,
  editDisplayName,
  setEditDisplayName,
  editAvatar,
  setEditAvatar,
  editBio,
  setEditBio,
  editWebsite,
  setEditWebsite,
  uploadingAvatar,
  avatarUploadProgress,
  handleAvatarImageUpload,
  handleSaveProfile,
  setEditMode,
  t
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 style={{ margin: 0 }}>⚙️ {t('gsn_edit_profile') || 'Profil bearbeiten'}</h4>
      
      <div>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Echter Name (freiwillig)
        </label>
        <input
          type="text"
          className="gsn-comment-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={editRealName}
          onChange={(e) => setEditRealName(e.target.value)}
          placeholder="Nur anzeigen, wenn du das moechtest"
        />
      </div>

      <div>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          {t('gsn_display_name') || 'Anzeigename'}
        </label>
        <input
          type="text"
          className="gsn-comment-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={editDisplayName}
          onChange={(e) => setEditDisplayName(e.target.value)}
        />
      </div>

      <div>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Profilbild (Bild oder Emoji)
        </label>
        {editAvatar && editAvatar.startsWith('{"fileId"') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <DecryptedAvatar avatarJson={editAvatar} displayName={editDisplayName} variant="editor" />
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => setEditAvatar('🤖')}
            >
              Bild entfernen
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="gsn-comment-input"
                style={{ width: '60px', textAlign: 'center' }}
                maxLength={2}
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="🚀"
              />
              <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>oder Bild hochladen:</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarImageUpload}
              disabled={uploadingAvatar}
              style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
            />
          </div>
        )}
        {uploadingAvatar && (
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
            ⏳ Profilbild wird verschlüsselt und hochgeladen... ({avatarUploadProgress}%)
          </div>
        )}
      </div>

      <div>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          {t('gsn_bio_label') || 'Beschreibung / Bio'}
        </label>
        <textarea
          className="gsn-composer-textarea"
          style={{ width: '100%', minHeight: '80px', boxSizing: 'border-box', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
        />
      </div>

      <div>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Website
        </label>
        <input
          type="text"
          className="gsn-comment-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={editWebsite}
          onChange={(e) => setEditWebsite(e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1 }}
          onClick={() => setEditMode(false)}
        >
          {t('cancel') || 'Abbrechen'}
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={handleSaveProfile}
        >
          {t('gsn_save_profile') || 'Speichern'}
        </button>
      </div>
    </div>
  );
}
