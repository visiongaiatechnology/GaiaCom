// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
export const DEFAULT_AVATARS = ['🤖', '👽', '🚀', '🛡️', '🌐', '🌌', '🧬', '💻', '🧠', '⚡', '✨', '🔥'];
export const GROUP_AVATARS = ['👥', '🔒', '🛡️', '⚡', '🚀', '🧠', '💻', '🌌', '🧬', '🔥', '✨', '🌍'];

export async function sanitizeAvatarFile(file, maxBytes = 2 * 1024 * 1024) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) {
    throw new Error('Bitte nur Bilddateien verwenden.');
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error('Avatar-Bild ist zu groß.');
  }

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const maxDim = 256;
  let { width, height } = img;

  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Avatar konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Avatar konnte nicht verarbeitet werden.'));
    img.src = src;
  });
}
