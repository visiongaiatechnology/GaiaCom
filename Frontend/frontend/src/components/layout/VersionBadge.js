// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export default function VersionBadge({ version, consensus }) {
  return (
    <div className="version-badge" aria-label="GaiaCOM Serverstatus">
      <span>{version}</span>
      <strong>{consensus}</strong>
    </div>
  );
}
