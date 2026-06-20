import React, { useState } from 'react';
import logoWebp from '../../gaiacom.webp';
import logoPng from '../../gaiacom_vgt.png';

export default function LogoMark({ compact = false }) {
  const [fallback, setFallback] = useState(false);
  return (
    <div className={`logo-mark ${compact ? 'compact' : ''}`}>
      <img
        src={fallback ? logoPng : logoWebp}
        alt="GaiaCOM"
        onError={() => setFallback(true)}
      />
    </div>
  );
}
