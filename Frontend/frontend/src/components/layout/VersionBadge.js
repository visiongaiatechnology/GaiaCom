import React from 'react';

export default function VersionBadge({ version, consensus }) {
  return (
    <div className="version-badge" aria-label="GaiaCOM Serverstatus">
      <span>{version}</span>
      <strong>{consensus}</strong>
    </div>
  );
}
