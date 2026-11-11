import React from 'react';

/* File, storage and transfer glyphs — GaiaDrive, GaiaDrop, GaiaVault, GSN media. */
export const fileIcons = {
  drive: (
    <>
      <rect x="3" y="14" width="18" height="6" rx="1.8" />
      <path d="M5.5 14l2.2-8h8.6l2.2 8" />
      <path d="M7 17h.01M10 17h.01" strokeWidth="2.2" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h9A1.5 1.5 0 0 1 21.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />
    </>
  ),
  folderPlus: (
    <>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h9A1.5 1.5 0 0 1 21.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />
      <path d="M12.5 11.5v5M10 14h5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.5h8l4.5 4.5v12.5H6z" />
      <path d="M14 3.5V8h4.5" />
    </>
  ),
  fileText: (
    <>
      <path d="M6 3.5h8l4.5 4.5v12.5H6z" />
      <path d="M14 3.5V8h4.5M9 12h6M9 15h6M9 18h4" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.8" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M3.8 16.5l4.7-4.2 3.5 3 3.2-2.6 5 4.3" />
    </>
  ),
  paperclip: (
    <>
      <path d="M20 11.5l-7.6 7.6a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-8 8a1.5 1.5 0 0 1-2.2-2.2l7.3-7.3" />
    </>
  ),
  cloud: (
    <>
      <path d="M7.2 18.5a4.2 4.2 0 0 1-.6-8.4A5.6 5.6 0 0 1 17.4 9.3a4.6 4.6 0 0 1-.2 9.2z" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
      <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4" width="17" height="5" rx="1.4" />
      <path d="M5 9v10.5h14V9M9.5 13h5" />
    </>
  ),
  share: (
    <>
      <circle cx="17.5" cy="5.5" r="2.6" />
      <circle cx="6.5" cy="12" r="2.6" />
      <circle cx="17.5" cy="18.5" r="2.6" />
      <path d="M8.8 10.8l6.4-3.9M8.8 13.2l6.4 3.9" />
    </>
  ),
  import: (
    <>
      <path d="M12 4v10.5M7.5 10L12 14.5 16.5 10" />
      <path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </>
  ),
  export: (
    <>
      <path d="M12 15V4.5M7.5 9L12 4.5 16.5 9" />
      <path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2z" />
    </>
  ),
};
