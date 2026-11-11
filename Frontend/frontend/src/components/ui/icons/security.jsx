import React from 'react';

/* Security glyphs — the product's own vocabulary. Hand-built, no icon CDN. */
export const securityIcons = {
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" />
      <path d="M8.6 12.2l2.3 2.3 4.5-4.6" />
    </>
  ),
  shieldAlert: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" />
      <path d="M12 8v4.5" />
      <circle cx="12" cy="15.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.2" />
      <path d="M8 10V7.5a4 4 0 0 1 7.6-1.7" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="4.2" />
      <path d="M11 11l9 9M16.5 15.5l2-2M19.5 18.5l2-2" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M12 4a8 8 0 0 1 8 8v3" />
      <path d="M12 8a4 4 0 0 1 4 4v4.5" />
      <path d="M12 12a2 2 0 0 1 2 2v5" />
      <path d="M4 12a8 8 0 0 1 3-6.2M4.4 16a8 8 0 0 0 1.2 3" />
      <path d="M7.5 10a4.5 4.5 0 0 1 .9-1.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.9A10.6 10.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.7" />
      <path d="M6.2 7.3A17 17 0 0 0 2.5 12S6 18.2 12 18.2a10 10 0 0 0 3.4-.6" />
      <path d="M10.1 10.2a2.8 2.8 0 0 0 3.9 3.9" />
    </>
  ),
  seal: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 3.8v3M12 17.2v3M3.8 12h3M17.2 12h3" />
    </>
  ),
  verified: (
    <>
      <path d="M12 3l2.3 1.9 3-.2 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.2L12 21l-2.3-1.9-3 .2-1-2.8-2.6-1.5.9-2.9-.9-2.9 2.6-1.5 1-2.8 3 .2z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4 12h16" />
    </>
  ),
  server: (
    <>
      <rect x="3.5" y="4" width="17" height="7" rx="1.8" />
      <rect x="3.5" y="13" width="17" height="7" rx="1.8" />
      <path d="M7 7.5h.01M7 16.5h.01" strokeWidth="2.4" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2.5-6 4 12L16 12h5" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M12 4.5L21 19H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  alertOctagon: (
    <>
      <path d="M8.2 3.5h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z" />
      <path d="M12 8v4.5" />
      <circle cx="12" cy="15.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
};
