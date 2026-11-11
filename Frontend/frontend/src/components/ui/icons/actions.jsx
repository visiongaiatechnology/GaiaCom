import React from 'react';

/* Action glyphs — commands, editing, system controls. */
export const actionIcons = {
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  minus: (
    <>
      <path d="M5 12h14" />
    </>
  ),
  check: (
    <>
      <path d="M4.5 12.5l5 5L19.5 7" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  search: (
    <>
      <circle cx="10.6" cy="10.6" r="6.4" />
      <path d="M15.4 15.4L21 21" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.2 13.2a7.6 7.6 0 0 0 0-2.4l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2-1.2L14.5 3h-5l-.4 2.7a7.7 7.7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 2 1.2l.4 2.7h5l.4-2.7a7.7 7.7 0 0 0 2-1.2l2.3 1 2-3.4z" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11.5A8 8 0 1 0 17.6 17M20 4v7h-7" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.8" />
      <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20l4.2-1 10-10a2.2 2.2 0 0 0-3.1-3.1l-10 10z" />
      <path d="M13.5 7.5l3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 13h9l1-13" />
      <path d="M10.5 11v5M13.5 11v5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 11l4.5 4.5L16.5 11M4.5 19.5h15" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M4.5 19.5h15" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
  filter: (
    <>
      <path d="M4 5.5h16L14 13v6.5l-4-2V13z" />
    </>
  ),
  sort: (
    <>
      <path d="M7 4.5v15M3.5 8L7 4.5 10.5 8M17 19.5v-15M13.5 16l3.5 3.5 3.5-3.5" />
    </>
  ),
  star: (
    <>
      <path d="M12 3.8l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 10l5.9-.8z" />
    </>
  ),
  bookmark: (
    <>
      <path d="M6 4.5h12V20l-6-3.8L6 20z" />
    </>
  ),
  logout: (
    <>
      <path d="M14 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 4 4v16a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 14 20v-1.5" />
      <path d="M9 12h11M16.5 8.5L20 12l-3.5 3.5" />
    </>
  ),
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M6.2 6.4a8 8 0 1 0 11.6 0" />
    </>
  ),
  link: (
    <>
      <path d="M10.2 13.8a4 4 0 0 0 5.6 0l2.6-2.6a4 4 0 0 0-5.6-5.6l-1.3 1.3" />
      <path d="M13.8 10.2a4 4 0 0 0-5.6 0l-2.6 2.6a4 4 0 0 0 5.6 5.6l1.3-1.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="1.8" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </>
  ),
  play: (
    <>
      <path d="M8 5.5l10 6.5-10 6.5z" />
    </>
  ),
  pause: (
    <>
      <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth="2.4" />
    </>
  ),
  maximize: (
    <>
      <path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" />
    </>
  ),
  minimize: (
    <>
      <path d="M4.5 9H9V4.5M19.5 9H15V4.5M4.5 15H9v4.5M19.5 15H15v4.5" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
};
