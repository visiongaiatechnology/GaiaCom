import React from 'react';

/* State, connectivity and system glyphs. Status is always paired with text. */
export const statusIcons = {
  dotOnline: (
    <>
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
    </>
  ),
  dotOffline: (
    <>
      <circle cx="12" cy="12" r="5" />
    </>
  ),
  wifi: (
    <>
      <path d="M4 9.4a12 12 0 0 1 16 0M7 12.6a7.6 7.6 0 0 1 10 0M10 15.8a3.2 3.2 0 0 1 4 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.5 6.2A12 12 0 0 1 20 9.4M7 12.6a7.6 7.6 0 0 1 6-2.3M10 15.8a3.2 3.2 0 0 1 4 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  offline: (
    <>
      <path d="M4 4l16 16" />
      <path d="M8.6 6.4A10.6 10.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.7" />
      <path d="M6.2 7.3A17 17 0 0 0 2.5 12S6 18.2 12 18.2a10 10 0 0 0 3.4-.6" />
    </>
  ),
  zap: (
    <>
      <path d="M13 3.5L5 13.5h6l-1 7 8-10h-6z" />
    </>
  ),
  cpu: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.8" />
      <rect x="10" y="10" width="4" height="4" rx="0.8" />
      <path d="M9 3.5v3M15 3.5v3M9 17.5v3M15 17.5v3M3.5 9h3M3.5 15h3M17.5 9h3M17.5 15h3" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5l8 4.5-8 4.5-8-4.5z" />
      <path d="M4 12.5l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" />
    </>
  ),
  shieldOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-1.2-.5-2.3-1.1-3.2-1.9M5.6 15.3A9.4 9.4 0 0 1 5 12V6l2-0.9" />
    </>
  ),
  sync: (
    <>
      <path d="M20 8a8 8 0 0 0-14.2-1M4 16a8 8 0 0 0 14.2 1" />
      <path d="M20 3.5V8h-4.5M4 20.5V16h4.5" />
    </>
  ),
  spinner: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
    </>
  ),
};
