import React from 'react';

/* Navigation & directional glyphs — 24x24 grid, 1.6 stroke, currentColor. */
export const navigationIcons = {
  menu: (
    <>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </>
  ),
  close: (
    <>
      <path d="M5 5l14 14M19 5L5 19" />
    </>
  ),
  chevronLeft: (
    <>
      <path d="M15 5l-7 7 7 7" />
    </>
  ),
  chevronRight: (
    <>
      <path d="M9 5l7 7-7 7" />
    </>
  ),
  chevronDown: (
    <>
      <path d="M5 9l7 7 7-7" />
    </>
  ),
  chevronUp: (
    <>
      <path d="M5 15l7-7 7 7" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M20 12H4M11 19l-7-7 7-7" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17L17 7M8 7h9v9" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  folderTree: (
    <>
      <path d="M4 5h5l2 2h9v12H4z" />
      <path d="M4 10h16" />
    </>
  ),
  command: (
    <>
      <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  square: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
    </>
  ),
  windowRestore: (
    <>
      <rect x="7" y="4.5" width="12.5" height="12.5" rx="1.8" />
      <path d="M4.5 7.5v12h12" />
    </>
  ),
};
