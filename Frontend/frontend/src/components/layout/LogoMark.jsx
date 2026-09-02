import React from 'react';
import gaiacomLogo from '../../gaiacom.png';

export default function LogoMark({ compact = false }) {
  return (
    <div className={`logo-mark ${compact ? 'compact' : ''}`}>
      <div className="logo-icon-wrapper">
        <img className="logo-icon" src={gaiacomLogo} alt="GaiaCom Logo" />
      </div>
      {!compact && (
        <h1 className="logo-title font-display text-gradient">
          Gaia<span className="logo-title-suffix">COM</span>
        </h1>
      )}
    </div>
  );
}
