import React from 'react';

/**
 * BrandIcon & BrandGraphic primitives for GaiaCom & Astraea SecureSpace.
 * Supports 3D glass icons from /brand/icons, GaiaCom UI asset pack icons from /ui/02_icons,
 * and large illustrations from /brand/graphics and /ui/03_illustrations.
 */

const BASE_BRAND = '/brand';
const BASE_UI = '/ui';

export const brand = {
  logo: (size = 256) => `${BASE_BRAND}/logo/astraea_logo_mark_${size}.png`,
  wordmark: (variant = 'white') => `${BASE_BRAND}/wordmarks/astraea_wordmark_${variant}.png`,
  icon: (name) => `${BASE_BRAND}/icons/${name}_128.png`,
  uiIcon: (category, name) => `${BASE_UI}/02_icons/${category}/png/${name}.png`,
  folder: (name) => `${BASE_BRAND}/folders/${name}_128.png`,
  filetype: (name) => `${BASE_BRAND}/filetypes/file_${name}_128.png`,
  graphic: (name) => `${BASE_BRAND}/graphics/${name}_256.png`,
  illustration: (name) => `${BASE_UI}/03_illustrations/png/${name}.png`,
  background: (file) => `${BASE_BRAND}/backgrounds/${file}`,
  effect: (file) => `${BASE_BRAND}/effects/${file}`
};

export const heroImages = {
  dashboard: brand.background('header_01_01_Cyan_Mountain_Aurora.png'),
  cinematicAurora: '/ui/06_backgrounds/png/aurora_mountains_cinematic.png',
  workspace: brand.background('header_02_02_Violet_Nebula.png'),
  data: brand.background('header_04_04_Network_Globe.png'),
  activity: brand.background('header_05_05_Quantum_Mesh.png'),
  security: brand.background('header_06_06_Deep_Space_Planet.png')
};

// Map logical names to exact icon URLs
function resolveIconSrc(name) {
  if (!name) return brand.icon('home');
  if (name.startsWith('/') || name.startsWith('http')) return name;

  // Direct custom mappings
  const directMaps = {
    mail: `${BASE_UI}/02_icons/navigation/png/mail.png`,
    chat: brand.icon('comment'),
    groups: brand.icon('users'),
    channels: `${BASE_UI}/02_icons/navigation/png/channels.png`,
    social: `${BASE_UI}/02_icons/navigation/png/social.png`,
    drive: brand.icon('cloud'),
    vault: brand.icon('vault'),
    files: `${BASE_UI}/02_icons/navigation/png/files.png`,
    folderTree: brand.folder('folder_cyan'),
    folder: brand.folder('folder_cyan'),
    shieldCheck: brand.icon('shield_check'),
    security: brand.icon('shield'),
    settings: brand.icon('settings'),
    dashboard: brand.icon('dashboard'),
    grid: brand.icon('dashboard'),
    compose: `${BASE_UI}/02_icons/actions/png/compose.png`,
    send: `${BASE_UI}/02_icons/actions/png/send.png`,
    attachment: `${BASE_UI}/02_icons/actions/png/attachment.png`,
    plus: `${BASE_UI}/02_icons/actions/png/plus.png`,
    edit: brand.icon('edit'),
    upload: brand.icon('cloud_upload'),
    download: brand.icon('download'),
    radio: `${BASE_UI}/02_icons/navigation/png/channels.png`,
    globe: brand.icon('globe'),
    lock: brand.icon('lock')
  };

  if (directMaps[name]) return directMaps[name];
  return brand.icon(name);
}

export function BrandIcon({ name, size = 20, alt = '', className = '', style, onClick }) {
  const src = resolveIconSrc(name);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      className={`brand-icon ${className}`.trim()}
      style={style}
      onClick={onClick}
      draggable={false}
      loading="lazy"
    />
  );
}

export function BrandGraphic({ name, size = 96, alt = '', className = '', style }) {
  const src = name.startsWith('/') ? name : brand.graphic(name);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      className={`brand-graphic ${className}`.trim()}
      style={style}
      draggable={false}
      loading="lazy"
    />
  );
}

export default BrandIcon;
