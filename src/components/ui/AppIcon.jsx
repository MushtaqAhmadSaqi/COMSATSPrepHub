import React from 'react';

/**
 * Crisp inline 24x24 vector icon registry replacing raw Material Symbols font ligatures.
 * Guarantees zero ligature-text flash (FOUT) on slow campus Wi-Fi and screen-reader safety
 * via `aria-hidden="true"`.
 */
const ICON_PATHS = {
  // Navigation & Core Chrome
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4.5v-6h3v6H18a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  menu_book: (
    <>
      <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H12v17H4.5A2.5 2.5 0 0 0 2 22Z" />
      <path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H12v17h7.5A2.5 2.5 0 0 1 22 22Z" />
    </>
  ),
  auto_awesome: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="M19 3v3" />
      <path d="M17.5 4.5h3" />
      <path d="M5 17v2.5" />
      <path d="M3.75 18.25h2.5" />
    </>
  ),
  psychology: (
    <>
      <path d="M12 4.5a6.5 6.5 0 0 0-6.5 6.5c0 2.1 1 3.9 2.5 5v2.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5V16c1.5-1.1 2.5-2.9 2.5-5A6.5 6.5 0 0 0 12 4.5Z" />
      <path d="M9.5 10.5c0-1 .8-1.8 1.8-1.8.6 0 1.2.3 1.5.8" />
      <path d="M12 20v2" />
    </>
  ),
  calculate: (
    <>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <path d="M8 7h8" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01M8.5 18.5h4" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="9" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="14" width="8" height="7" rx="1.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  search_off: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
      <path d="m8.8 8.8 4.4 4.4" />
      <path d="m13.2 8.8-4.4 4.4" />
    </>
  ),
  explore_off: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m15.2 8.8-1.6 4.8-4.8 1.6 1.6-4.8Z" />
      <path d="m4 4 16 16" />
    </>
  ),
  light_mode: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </>
  ),
  dark_mode: (
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
  ),
  account_circle: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="9.5" r="3" />
      <path d="M6.8 18.8a6 6 0 0 1 10.4 0" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13V6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5V13" />
      <path d="M3 13h4.5l1.5 2.5h6L16.5 13H21v5.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </>
  ),
  close: (
    <>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  check_circle: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8.5 12.5 2.4 2.4 4.8-5.2" />
    </>
  ),
  cancel: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  error_outline: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 21 19.5H3Z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 16.75h.01" />
    </>
  ),
  dangerous: (
    <>
      <polygon points="7.86 2.5 16.14 2.5 21.5 7.86 21.5 16.14 16.14 21.5 7.86 21.5 2.5 16.14 2.5 7.86 7.86 2.5" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </>
  ),
  block: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m5.5 5.5 13 13" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.75h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 5 .5c0 1.8-2.5 2.1-2.5 3.8" />
      <path d="M12 17h.01" />
    </>
  ),
  flag: (
    <>
      <path d="M5 3v18" />
      <path d="M5 4h11l-1.8 4L16 12H5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  notifications_active: (
    <>
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 2 6.5H4.5c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
      <path d="M4.2 6.5a8 8 0 0 1 1.6-2M19.8 6.5a8 8 0 0 0-1.6-2" />
    </>
  ),

  // Arrows & Directional Controls
  arrow_upward: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  arrow_forward: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  arrow_back: (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  chevron_right: <path d="m9 6 6 6-6 6" />,
  expand_more: <path d="m6 9 6 6 6-6" />,
  expand_less: <path d="m6 15 6-6 6 6" />,
  keyboard_return: (
    <>
      <path d="M19 6v6a2 2 0 0 1-2 2H6" />
      <path d="m10 10-4 4 4 4" />
    </>
  ),

  // Study & Academic Tools
  school: (
    <>
      <path d="m2 9 10-5 10 5-10 5-10-5Z" />
      <path d="M6 11v5.5c0 1.8 2.7 3 6 3s6-1.2 6-3V11" />
      <path d="M21 9.5V16" />
    </>
  ),
  picture_as_pdf: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v4h4" />
      <path d="M9 14h6M9 17.5h4" />
    </>
  ),
  description: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v4h4" />
      <path d="M9 11.5h6M9 15h6M9 18h4" />
    </>
  ),
  library_books: (
    <>
      <rect x="7" y="3" width="13" height="14" rx="2" />
      <path d="M4 7v12a2 2 0 0 0 2 2h10" />
      <path d="M10 8h7M10 11.5h7" />
    </>
  ),
  auto_stories: (
    <>
      <path d="M2 6c3-1.5 6.5-1.5 10 0 3.5-1.5 7-1.5 10 0v13c-3-1.5-6.5-1.5-10 0-3.5-1.5-7-1.5-10 0Z" />
      <path d="M12 6v13" />
    </>
  ),
  timer: (
    <>
      <path d="M9 2.5h6" />
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.5 2" />
    </>
  ),
  local_fire_department: (
    <path d="M12.5 3c.5 3.2 4 4.8 4 9a5.5 5.5 0 1 1-11 0c0-2.7 1.7-4.8 3.1-6 .2 1.8 1.2 2.7 2.2 2.8.1-2.2.8-4.2 1.7-5.8Z" />
  ),
  manage_search: (
    <>
      <path d="M4 7h6M4 12h4M4 17h6" />
      <circle cx="15" cy="13" r="4" />
      <path d="m20.5 18.5-2.6-2.6" />
    </>
  ),
  trending_up: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M16 7h5v5" />
    </>
  ),
  rocket_launch: (
    <>
      <path d="M14.5 3.5c3 0 5.5 2.5 6 6-2 3-5 5.5-8.5 7L7.5 12c1.5-3.5 4-6.5 7-8.5Z" />
      <circle cx="15" cy="9" r="1.5" />
      <path d="M7.5 12 4 13l3 4 1 3 1-3.5" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3.5V8h4.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  schedule: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  campaign: (
    <>
      <path d="M4 10v4h3.5l7.5 4V6l-7.5 4H4Z" />
      <path d="M18.5 9.5a4 4 0 0 1 0 5" />
      <path d="M7.5 14v4" />
    </>
  ),
  quiz: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 5 .4c0 1.6-2.5 1.9-2.5 3.4" />
      <path d="M12 16.5h.01" />
    </>
  ),
  edit_note: (
    <>
      <path d="M4 7h9M4 11h7M4 15h5" />
      <path d="m14.5 18 5.5-5.5-2-2L12.5 16v2h2Z" />
    </>
  ),
  style: (
    <>
      <rect x="7" y="4" width="11" height="15" rx="2" transform="rotate(-8 12.5 11.5)" />
      <rect x="9" y="5" width="11" height="15" rx="2" />
    </>
  ),
  inventory_2: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8" />
      <path d="M10 12.5h4" />
    </>
  ),
  flip: (
    <>
      <path d="M4 8.5A8.5 8.5 0 0 1 18.5 6" />
      <path d="M15 6h3.8v3.8" />
      <path d="M20 15.5A8.5 8.5 0 0 1 5.5 18" />
      <path d="M9 18H5.2v-3.8" />
    </>
  ),
  task_alt: (
    <>
      <path d="M20.5 12A8.5 8.5 0 1 1 12 3.5" />
      <path d="m9 11.5 3 3 8.5-8.5" />
    </>
  ),
  fact_check: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h5M7 13h4" />
      <path d="m14.5 12 1.8 1.8 3.2-3.3" />
    </>
  ),
  track_changes: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  bolt: <path d="M13 2 5 13h6l-1 9 9-12h-6Z" />,
  flash_on: <path d="M13 2 5 13h6l-1 9 9-12h-6Z" />,
  lightbulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M9.5 15a5 5 0 1 1 5 0c-.6.6-.9 1.3-.9 2h-3.2c0-.7-.3-1.4-.9-2Z" />
    </>
  ),
  extension: (
    <path d="M11 3.5a2 2 0 1 1 2 3.4V8h4a1.5 1.5 0 0 1 1.5 1.5v3.5h1a2 2 0 1 1 0 4h-1V20a1.5 1.5 0 0 1-1.5 1.5H13v-1a2 2 0 1 0-4 0v1H5.5A1.5 1.5 0 0 1 4 20v-4h1a2 2 0 1 0 0-4H4V9.5A1.5 1.5 0 0 1 5.5 8H11V3.5Z" />
  ),
  category: (
    <>
      <polygon points="12 3 16.5 10 7.5 10" />
      <circle cx="16.5" cy="16.5" r="3.5" />
      <rect x="4.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  verified: (
    <>
      <path d="M12 2.8 14.8 4.4l3.1.2 1.1 3 2 2.4-.9 3 .9 3-2 2.4-1.1 3-3.1.2L12 21.2l-2.8-1.6-3.1-.2-1.1-3-2-2.4.9-3-.9-3 2-2.4 1.1-3 3.1-.2Z" />
      <path d="m9 12 2.1 2.1L15.5 9.6" />
    </>
  ),
  topic: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4.2l1.8 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M8 12h8M8 15.5h5" />
    </>
  ),
  casino: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  format_list_bulleted: (
    <>
      <path d="M9 7h11M9 12h11M9 17h11" />
      <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  military_tech: (
    <>
      <path d="M8 3h8l-1.5 6h-5L8 3Z" />
      <circle cx="12" cy="15" r="5" />
      <path d="m10 15 1.5 1.5L14.5 13.5" />
    </>
  ),
  workspace_premium: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14.5 7 21l5-2.5L17 21l-1.5-6.5" />
      <path d="m12 6.5.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3Z" />
    </>
  ),
  emoji_events: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v2.5A2.5 2.5 0 0 0 6.5 11H7" />
      <path d="M17 6h3v2.5a2.5 2.5 0 0 1-2.5 2.5H17" />
      <path d="M12 14v5M8 20h8" />
    </>
  ),

  // Bookmarks & Stars
  bookmark: <path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v16l-7-4-7 4V5a1.5 1.5 0 0 1 1.5-1.5Z" />,
  bookmark_add: (
    <>
      <path d="M17 11v9.5l-5-3-5 3V5.5A1.5 1.5 0 0 1 8.5 4H13" />
      <path d="M18 3v5M15.5 5.5h5" />
    </>
  ),
  bookmark_added: (
    <>
      <path d="M17 10.5v10l-5-3-5 3V5.5A1.5 1.5 0 0 1 8.5 4H13" />
      <path d="m15 6 2 2 4-4" />
    </>
  ),
  bookmark_flag: (
    <>
      <path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v16l-7-4-7 4V5a1.5 1.5 0 0 1 1.5-1.5Z" />
    </>
  ),
  star_border: (
    <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9Z" />
  ),
  star: (
    <path
      fill="currentColor"
      d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9Z"
    />
  ),

  // Auth, Privacy & Community
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  lock_open: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7" />
    </>
  ),
  lock_reset: (
    <>
      <rect x="6" y="11" width="12" height="9" rx="2" />
      <path d="M9 11V8.5a3 3 0 0 1 6 0" />
      <path d="M4.5 8A8.5 8.5 0 1 1 5 15.5" />
      <path d="M3 8h2.5v2.5" />
    </>
  ),
  login: (
    <>
      <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M4 12h11" />
      <path d="m11 8 4 4-4 4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
      <path d="M10 12h10" />
      <path d="m16 8 4 4-4 4" />
    </>
  ),
  person_add: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 19.5a6.5 6.5 0 0 1 13 0" />
      <path d="M19 8v5M16.5 10.5h5" />
    </>
  ),
  manage_accounts: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 19.5a6.5 6.5 0 0 1 11-4.2" />
      <circle cx="18" cy="16" r="2.2" />
      <path d="M18 12v1.2M18 18.8V20M14.5 16h1.2M20.3 16h1.2" />
    </>
  ),
  admin_panel_settings: (
    <>
      <path d="M12 3 5 6v6c0 4.8 3 7.8 7 9 4-1.2 7-4.2 7-9V6Z" />
      <circle cx="12" cy="11" r="2.5" />
    </>
  ),
  groups: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 19.5a6 6 0 0 1 12 0" />
      <path d="M14.5 19.5a4.5 4.5 0 0 1 6.5-3.2" />
    </>
  ),
  visibility: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  visibility_off: (
    <>
      <path d="M4.5 12s3.2-5.5 7.5-5.5 7.5 5.5 7.5 5.5-3.2 5.5-7.5 5.5-7.5-5.5-7.5-5.5Z" />
      <path d="m4 4 16 16" />
    </>
  ),
  shield_lock: (
    <>
      <path d="M12 3 5 6v6c0 4.8 3 7.8 7 9 4-1.2 7-4.2 7-9V6Z" />
      <rect x="9.5" y="11" width="5" height="4.5" rx="1" />
      <path d="M10.5 11v-1.2a1.5 1.5 0 0 1 3 0V11" />
    </>
  ),
  security: (
    <>
      <path d="M12 3 5 6v6c0 4.8 3 7.8 7 9 4-1.2 7-4.2 7-9V6Z" />
      <path d="m9.5 12.2 1.8 1.8 3.4-3.6" />
    </>
  ),
  gavel: (
    <>
      <path d="m14 5 5 5-3 3-5-5Z" />
      <path d="m11.5 9.5-6.5 6.5 2 2 6.5-6.5" />
      <path d="M4 20h10" />
    </>
  ),
  copyright: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2a4 4 0 1 0 0 5.6" />
    </>
  ),
  cookie: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9 3.5 3.5 0 0 1-3.8-3.8 3.5 3.5 0 0 1-3.4-3.4A3.5 3.5 0 0 1 12 3Z" />
      <circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),

  // File, Data, Network & Actions
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4.5 4.5-4.5" />
      <path d="M4 19.5h16" />
    </>
  ),
  save: (
    <>
      <path d="M5 3.5h11l3 3v14H5Z" />
      <path d="M8.5 3.5v4.5h6V3.5" />
      <rect x="8" y="13.5" width="8" height="7" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14-4.8L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 14 4.8l2-2.3" />
      <path d="M20 20v-4.5h-4.5" />
    </>
  ),
  restart_alt: (
    <>
      <path d="M12 5a7 7 0 1 1-6.5 4.5" />
      <path d="M5 4v5h5" />
    </>
  ),
  sync: (
    <>
      <path d="M18.5 8A7.5 7.5 0 0 0 6 7" />
      <path d="M19 4v4h-4" />
      <path d="M5.5 16A7.5 7.5 0 0 0 18 17" />
      <path d="M5 20v-4h4" />
    </>
  ),
  delete_forever: (
    <>
      <path d="M4 6.5h16" />
      <path d="M9 4h6" />
      <path d="M6.5 6.5 7.5 20h9l1-13.5" />
      <path d="m10 11 4 4M14 11l-4 4" />
    </>
  ),
  delete_sweep: (
    <>
      <path d="M4 8h9M4 12h7M4 16h5" />
      <path d="M14 7h6M15.5 7l.8 11h3.4l.8-11" />
    </>
  ),
  dataset: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M10 10v10" />
    </>
  ),
  cloud_upload: (
    <>
      <path d="M7.5 18.5h9a4 4 0 0 0 .8-7.9A5.5 5.5 0 0 0 6.8 9.2 4 4 0 0 0 7.5 18.5Z" />
      <path d="M12 16v-6" />
      <path d="m9.5 12.5 2.5-2.5 2.5 2.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
      <path d="M4 19.5h16" />
    </>
  ),
  upload_file: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v4h4" />
      <path d="M12 17v-5" />
      <path d="m9.5 14 2.5-2.5 2.5 2.5" />
    </>
  ),
  folder_open: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4.2l1.8 2H19a2 2 0 0 1 2 2v1H5.5l-2 9" />
      <path d="M3.5 19h15l2-9h-15Z" />
    </>
  ),
  find_in_page: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <circle cx="11.5" cy="13.5" r="2.8" />
      <path d="m15.5 17.5-2-2" />
    </>
  ),
  content_copy: (
    <>
      <rect x="9" y="8" width="11" height="12" rx="1.8" />
      <path d="M6 16H5a1.8 1.8 0 0 1-1.8-1.8V5.8A1.8 1.8 0 0 1 5 4h8.4A1.8 1.8 0 0 1 15 5.8V6" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
    </>
  ),
  preview: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8.5h18" />
      <circle cx="12" cy="14" r="2.5" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  add_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  remove: <path d="M5 12h14" />,
  remove_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  translate: (
    <>
      <path d="M4 6h8M8 4v2c0 4.2-2 7.2-4.5 9" />
      <path d="M6 10.5c1.5 2 3.2 3.4 5 4.2" />
      <path d="m13 20 3.5-9 3.5 9M14.2 17h4.6" />
    </>
  ),
  wifi: (
    <>
      <path d="M4 9a12.5 12.5 0 0 1 16 0" />
      <path d="M7.5 12.5a7.5 7.5 0 0 1 9 0" />
      <path d="M10.5 16a2.5 2.5 0 0 1 3 0" />
      <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  wifi_off: (
    <>
      <path d="M4 9a12.5 12.5 0 0 1 16 0" />
      <path d="M7.5 12.5a7.5 7.5 0 0 1 9 0" />
      <path d="m4 4 16 16" />
    </>
  ),
  install_mobile: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M12 8v6" />
      <path d="m9.5 11.5 2.5 2.5 2.5-2.5" />
    </>
  ),
  progress_activity: (
    <path d="M12 3.5A8.5 8.5 0 1 1 3.5 12" />
  ),
  smart_toy: (
    <>
      <rect x="5" y="7" width="14" height="11" rx="2.5" />
      <path d="M12 3.5V7" />
      <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M9.5 15.5h5" />
    </>
  ),
  auto_graph: (
    <>
      <path d="m3.5 17.5 5-5 4 3 7.5-8" />
      <path d="m18 5 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
    </>
  ),
  model_training: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    </>
  ),
  schema: (
    <>
      <rect x="3" y="4" width="6" height="4" rx="1" />
      <rect x="15" y="4" width="6" height="4" rx="1" />
      <rect x="9" y="16" width="6" height="4" rx="1" />
      <path d="M9 6h6M12 8v8" />
    </>
  ),
  table_chart: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M9.5 9.5V20M15 9.5V20" />
    </>
  ),
  calendar_month: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
    </>
  ),
  terminal: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="m7.5 9.5 3 2.5-3 2.5" />
      <path d="M12.5 14.5h4" />
    </>
  ),
  print: (
    <>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  playlist_add: (
    <>
      <path d="M3 6h12M3 12h12M3 18h8M17 15v6M14 18h6" />
    </>
  ),
  sigma: <path d="M18 6H6l6 6-6 6h12" />,

  // Subject Icons
  computer: (
    <>
      <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
      <path d="M8 20h8M12 16.5V20" />
    </>
  ),
  code: (
    <>
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
      <path d="m13.5 6-3 12" />
    </>
  ),
  account_tree: (
    <>
      <rect x="3" y="4" width="5.5" height="4.5" rx="1" />
      <rect x="15.5" y="4" width="5.5" height="4.5" rx="1" />
      <rect x="15.5" y="15.5" width="5.5" height="4.5" rx="1" />
      <path d="M8.5 6.2h7M12 6.2v11.5h3.5" />
    </>
  ),
  hub: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5" cy="7" r="2" />
      <circle cx="19" cy="7" r="2" />
      <circle cx="5" cy="17" r="2" />
      <circle cx="19" cy="17" r="2" />
      <path d="m6.8 8.2 3.2 2.4M17.2 8.2 14 10.6M6.8 15.8l3.2-2.4M17.2 15.8 14 13.4" />
    </>
  ),
  alt_route: (
    <>
      <path d="M6 19V7M6 7l3 3M6 7 3 10" />
      <path d="M18 19V11a4 4 0 0 0-4-4h-3" />
      <path d="m13 4-3 3 3 3" />
    </>
  ),
  lan: (
    <>
      <rect x="9.5" y="3" width="5" height="4.5" rx="1" />
      <rect x="4" y="16.5" width="5" height="4.5" rx="1" />
      <rect x="15" y="16.5" width="5" height="4.5" rx="1" />
      <path d="M12 7.5v4.5M6.5 16.5V12h11v4.5" />
    </>
  ),
  memory: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" />
      <path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3" />
    </>
  ),
  developer_board: (
    <>
      <rect x="4" y="4" width="14" height="16" rx="2" />
      <rect x="7.5" y="8" width="5" height="5" rx="0.8" />
      <path d="M18 8h2M18 12h2M18 16h2M7.5 16h5" />
    </>
  ),
  touch_app: (
    <>
      <path d="M9 12V6.5a1.5 1.5 0 0 1 3 0V11l4.5 1.2a2 2 0 0 1 1.5 2V19a2 2 0 0 1-2 2H10a3 3 0 0 1-2.8-2L5 13.5a1.5 1.5 0 0 1 2.4-1.7Z" />
      <path d="M7.5 4.2a5 5 0 0 1 7 0" />
    </>
  ),
  storage: (
    <>
      <rect x="4" y="4" width="16" height="5" rx="1.5" />
      <rect x="4" y="10.5" width="16" height="5" rx="1.5" />
      <path d="M7.5 6.5h.01M7.5 13h.01M6 19.5h12" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  language: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  assignment: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <path d="M9 4.5a1.5 1.5 0 0 1 6 0" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </>
  ),
  functions: (
    <path d="M17 5H8l5.5 7L8 19h9" />
  ),
  grid_on: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9.5 3.5v17M14.5 3.5v17M3.5 9.5h17M3.5 14.5h17" />
    </>
  ),
  timeline: (
    <>
      <circle cx="5" cy="15" r="2" />
      <circle cx="11" cy="9" r="2" />
      <circle cx="19" cy="13" r="2" />
      <path d="m6.5 13.5 3-3M12.8 10l4.4 2.2" />
    </>
  ),
  pin: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8.5 9.5h7M8.5 14.5h7M10 7.5v9M14 7.5v9" />
    </>
  ),
  science: (
    <>
      <path d="M9.5 3.5h5M10.5 3.5v5L5.5 18a2 2 0 0 0 1.8 2.8h9.4a2 2 0 0 0 1.8-2.8L13.5 8.5v-5" />
      <path d="M7.5 15h9" />
    </>
  ),
  business_center: (
    <>
      <rect x="3.5" y="7" width="17" height="13" rx="2" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M3.5 12.5h17" />
    </>
  ),
};

export default function AppIcon({
  name = 'menu_book',
  className = '',
  size,
  style,
  filled = false,
  ...props
}) {
  const pathNode = ICON_PATHS[name] || ICON_PATHS.menu_book;
  const resolvedStyle = size
    ? { fontSize: typeof size === 'number' ? `${size}px` : size, ...style }
    : style;

  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `app-icon ${className}` : 'app-icon'}
      style={resolvedStyle}
      {...props}
    >
      {pathNode}
    </svg>
  );
}
