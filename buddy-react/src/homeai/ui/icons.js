function svg(paths, opts = {}) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="${opts.fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${opts.sw ?? 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
const ICONS = {
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>'),
  check: svg('<polyline points="20 6 9 17 4 12"/>', { sw: 2.4 }),
  clock: svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>'),
  heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>'),
  briefcase: svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  card: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>'),
  pin: svg('<path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  users: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'),
  shield: svg('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>'),
  bolt: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none"/>'),
  home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>'),
  activity: svg('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', { sw: 2.2 }),
  info: svg('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/>'),
  undo: svg('<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7L3 9"/>'),
  arrowUp: svg('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
  arrowDown: svg('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'),
  x: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  bell: svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  sliders: svg('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
  spark: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" stroke="none"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><line x1="12" y1="17" x2="12" y2="21"/>'),
  doc: svg('<path d="M6 3h9l3 3v15H6z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/>'),
  paperclip: svg('<path d="M21 8l-9.5 9.5a4 4 0 0 1-5.7-5.7L15 3a2.7 2.7 0 0 1 3.8 3.8l-9 9a1.4 1.4 0 0 1-2-2l8.5-8.5"/>'),
  board: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/>')
};
const DOMAIN_META = {
  work: { color: "#2F6BFF", bg: "#E9F0FF", icon: ICONS.briefcase, label: "Work" },
  calendar: { color: "#2F6BFF", bg: "#E9F0FF", icon: ICONS.calendar, label: "Calendar" },
  tasks: { color: "#22B07D", bg: "#E3F6EC", icon: ICONS.check, label: "Tasks" },
  email: { color: "#5B5FC7", bg: "#EAE9FB", icon: ICONS.mail, label: "Email" },
  family: { color: "#EC5B8A", bg: "#FDE8EF", icon: ICONS.heart, label: "Family" },
  personal: { color: "#8B5CF6", bg: "#EFEAFE", icon: ICONS.home, label: "Personal" },
  health: { color: "#EC5B8A", bg: "#FDE8EF", icon: ICONS.activity, label: "Health" },
  mobility: { color: "#0FB5B0", bg: "#E1F6F5", icon: ICONS.pin, label: "Mobility" },
  finance: { color: "#E8963A", bg: "#FBF0DF", icon: ICONS.card, label: "Finance" }
};
export {
  DOMAIN_META,
  ICONS
};
