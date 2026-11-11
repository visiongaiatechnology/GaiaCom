import React from 'react';

/**
 * GaiaCom brand mark — VGT GLASS 2100.
 * The "Aegis Seal": a hexagonal shield containing three nested layers
 * (classical exchange + two post-quantum KEMs) converging on one envelope core.
 * Rendered as local SVG (no raster logo, no CDN, no gradient text).
 */
export default function LogoMark({ compact = false, size = 30 }) {
  return (
    <div className={compact ? 'vgt-brandmark vgt-brandmark--compact' : 'vgt-brandmark'}>
      <img
        className="vgt-brandmark__seal"
        src="/brand/gaiacom-mark.webp"
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      {!compact && (
        <span className="vgt-brandmark__word">
          Gaia<span className="vgt-brandmark__word-accent">Com</span>
        </span>
      )}
    </div>
  );
}
