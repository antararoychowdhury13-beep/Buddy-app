/**
 * Shared design system for the Buddy web app: tokens, component CSS, and the
 * icon sprite. Every route renders through shell.ts, which pulls this in once.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const FONT_LINK = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">`;

export const DESIGN_CSS = `
:root {
  --ink: #07080F;
  --layer-01: #12141F;
  --layer-02: #1B1E2E;
  --line: #262A3D;
  --line-soft: rgba(255,255,255,0.07);
  --violet: #8B7CFF;
  --iris: #4C86FF;
  --violet-dim: rgba(139,124,255,0.16);
  --iris-dim: rgba(76,134,255,0.16);
  --text: #F3F4FA;
  --mist: #9BA0BD;
  --faint: #6B7089;
  --good: #34D399; --good-dim: rgba(52,211,153,0.14);
  --warn: #F5B84D; --warn-dim: rgba(245,184,77,0.14);
  --crit: #FF6B81; --crit-dim: rgba(255,107,129,0.14);
  --rose: #FF6FA0; --rose-dim: rgba(255,111,160,0.14);
  --grad-brand: linear-gradient(135deg, var(--violet), var(--iris));
  --r-sm: 8px; --r-md: 14px; --r-lg: 20px; --r-pill: 999px;
  /* Carbon motion tokens (expressive set — mobile-appropriate, not the flatter "productive" curves) */
  --dur-fast: 110ms; --dur-moderate: 150ms; --dur-slow: 240ms;
  --ease-standard: cubic-bezier(0.4, 0.14, 0.3, 1);
  --ease-entrance: cubic-bezier(0, 0, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0.14, 1, 1);
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: radial-gradient(ellipse 900px 500px at 50% -10%, #171a2c 0%, var(--ink) 55%);
  color: var(--text);
  font-family: 'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
button { font-family: inherit; }
.mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }

.app-shell {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 4px;
  flex-shrink: 0;
}
.app-header .spacer { flex: 1; }
.app-header h1 { font-size: 19px; font-weight: 700; margin: 0; }

.icon-btn {
  width: 38px; height: 38px; border-radius: var(--r-sm);
  background: var(--layer-01); border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--text); flex-shrink: 0; cursor: pointer;
}
.icon-btn:focus-visible, a:focus-visible, button:focus-visible { outline: 2px solid var(--iris); outline-offset: 2px; }

.app-body {
  flex: 1;
  padding: 0 16px 24px;
}

.tabbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line-soft);
  background: rgba(18,20,31,0.85);
  backdrop-filter: blur(10px);
  position: sticky;
  bottom: 0;
  z-index: 30;
}
.tab { display: flex; flex-direction: column; align-items: center; gap: 3px; color: var(--faint); padding: 4px 10px; }
.tab.active { color: var(--violet); }
.tab span { font-size: 10px; font-weight: 500; }
.tab-orb {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--grad-brand);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 4px var(--ink), 0 0 18px rgba(139,124,255,0.5);
  margin-top: -22px;
  color: #0A0B14;
}

.i { width: 19px; height: 19px; stroke: currentColor; fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; display: block; }
.i-sm { width: 15px; height: 15px; }
.i-lg { width: 26px; height: 26px; }

.chip {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.chip.violet { background: var(--violet-dim); color: var(--violet); }
.chip.iris { background: var(--iris-dim); color: var(--iris); }
.chip.good { background: var(--good-dim); color: var(--good); }
.chip.warn { background: var(--warn-dim); color: var(--warn); }
.chip.rose { background: var(--rose-dim); color: var(--rose); }

.section-head { display: flex; align-items: baseline; justify-content: space-between; margin: 28px 0 12px; }
.section-head h2 { font-size: 15px; font-weight: 600; margin: 0; }
.section-head a { font-size: 12px; color: var(--iris); font-weight: 500; }

.btn {
  font-family: inherit; font-weight: 600; font-size: 13.5px;
  border-radius: var(--r-pill); border: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px;
  transition: transform var(--dur-fast) var(--ease-standard);
}
.btn:active { transform: scale(0.96); }
.btn-primary { background: var(--grad-brand); color: #0A0B14; }
.btn-ghost { background: transparent; border: 1px solid var(--line); color: var(--text); }
.btn-outline-good { background: transparent; border: 1.5px solid var(--good); color: var(--good); }
.btn-outline-crit { background: transparent; border: 1.5px solid var(--line); color: var(--mist); }
.btn-sm { padding: 7px 13px; font-size: 12px; }
.btn:disabled { opacity: 0.55; cursor: default; }

.tile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tile { background: var(--layer-01); border: 1px solid var(--line); border-radius: var(--r-md); padding: 13px; }
.tile .chip { width: 30px; height: 30px; border-radius: 9px; margin-bottom: 8px; }
.tile .num { font-size: 21px; font-weight: 700; }
.tile .lbl { font-size: 11.5px; color: var(--mist); }
.tile .sub { font-size: 10.5px; }

.nudge-card {
  background: var(--layer-01); border: 1px solid var(--line);
  border-radius: var(--r-lg); padding: 14px;
  display: flex; gap: 12px; margin-bottom: 10px;
}
.nudge-body { flex: 1; min-width: 0; }
.nudge-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 8px; }
.nudge-domain { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.nudge-domain.family { color: var(--rose); }
.nudge-domain.health { color: var(--good); }
.nudge-domain.finance { color: var(--warn); }
.nudge-domain.work { color: var(--iris); }
.nudge-domain.commute, .nudge-domain.other { color: var(--violet); }
.nudge-time { font-family: 'IBM Plex Mono'; font-size: 10.5px; color: var(--faint); flex-shrink: 0; }
.nudge-msg { font-size: 13.5px; line-height: 1.45; margin-bottom: 10px; }
.nudge-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tier-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; padding: 3px 8px; border-radius: var(--r-pill); text-transform: uppercase; }
.tier-pill.proactive { background: var(--violet-dim); color: var(--violet); }
.tier-pill.ambient { background: var(--iris-dim); color: var(--iris); }
.tier-pill.passive { background: var(--layer-02); color: var(--mist); }
.tier-pill.silent { background: var(--layer-02); color: var(--faint); }

.card { background: var(--layer-01); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 16px; }
.list-row { display: flex; align-items: center; gap: 10px; background: var(--layer-01); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; margin-bottom: 6px; }

.integration-group { margin-bottom: 8px; }
.integration-group summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; background: var(--layer-01); border: 1px solid var(--line); border-radius: var(--r-md); }
.integration-group summary::-webkit-details-marker { display: none; }
.integration-group summary .chev { color: var(--faint); flex-shrink: 0; transition: transform var(--dur-fast) var(--ease-standard); }
.integration-group[open] summary { border-radius: var(--r-md) var(--r-md) 0 0; }
.integration-group[open] summary .chev { transform: rotate(90deg); }
.integration-group-body { border: 1px solid var(--line); border-top: none; border-radius: 0 0 var(--r-md) var(--r-md); padding: 4px 14px; }
.integration-group:not([open]) .integration-group-body { display: none; }
.integration-group-counts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

.integration-row { padding: 9px 0; border-bottom: 1px solid var(--line); }
.integration-row:last-child { border-bottom: none; }
.integration-row .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.integration-row .name { font-size: 12.5px; font-weight: 600; }
.integration-row .notes { font-size: 11px; color: var(--faint); margin-top: 3px; line-height: 1.4; }
.integration-row .action { font-size: 11px; color: var(--iris); font-weight: 600; white-space: nowrap; flex-shrink: 0; }

.method-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; padding: 3px 8px; border-radius: var(--r-pill); white-space: nowrap; flex-shrink: 0; }
.method-pill.violet { background: var(--violet-dim); color: var(--violet); }
.method-pill.iris { background: var(--iris-dim); color: var(--iris); }
.method-pill.good { background: var(--good-dim); color: var(--good); }
.method-pill.warn { background: var(--warn-dim); color: var(--warn); }
.method-pill.rose { background: var(--rose-dim); color: var(--rose); }
.method-pill.plain { background: var(--layer-02); color: var(--faint); }

/* Carbon-style segmented Meter — shows the real composition of a trust
   score (confirmed / dismissed / ignored) instead of collapsing it into a
   single accuracy percentage, so the user can see *why* Buddy trusts (or
   doesn't trust) a domain, not just the net result. */
.trust-row + .trust-row { margin-top: 16px; }
.trust-row .top { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-bottom: 6px; }
.trust-row .top .pct { font-size: 15px; font-weight: 700; }
.meter-track { height: 8px; border-radius: 4px; background: var(--line); display: flex; overflow: hidden; }
.meter-seg { height: 100%; transition: width var(--dur-slow) var(--ease-standard); }
.meter-seg.good { background: var(--good); }
.meter-seg.rose { background: var(--rose); }
.meter-seg.neutral { background: var(--faint); opacity: 0.5; }
.meter-track.empty { background: var(--layer-02); }
.meter-legend { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.meter-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--faint); }
.meter-legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.trust-row .caption { font-size: 10.5px; color: var(--faint); margin-top: 6px; }

.orb-glow { animation: pulse 3.2s ease-in-out infinite; }
.wave-bar { animation: wave 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .orb-glow, .wave-bar { animation: none; } }
@keyframes pulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.06); } }
@keyframes wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }

/* Menu drawer */
.scrim {
  position: fixed; inset: 0; background: rgba(4,5,10,0.6);
  opacity: 0; pointer-events: none; transition: opacity var(--dur-fast) var(--ease-standard);
  z-index: 40;
}
.drawer {
  position: fixed; top: 0; bottom: 0; left: 0; width: 80%; max-width: 320px;
  background: var(--layer-01); border-right: 1px solid var(--line);
  transform: translateX(-100%); transition: transform var(--dur-moderate) var(--ease-entrance);
  z-index: 41; display: flex; flex-direction: column; padding: 20px 16px;
}
body.menu-open .scrim { opacity: 1; pointer-events: auto; }
body.menu-open .drawer { transform: translateX(0); }
.drawer-link { display: flex; align-items: center; gap: 12px; padding: 11px 8px; border-radius: 10px; color: var(--mist); }
.drawer-link.active { background: var(--violet-dim); color: var(--violet); }
.drawer-link span { font-size: 13.5px; font-weight: 600; }

/* Timeline (My Day) */
.timeline { position: relative; padding-left: 44px; margin-top: 16px; }
.timeline::before { content: ""; position: absolute; left: 16px; top: 4px; bottom: 4px; width: 1px; background: var(--line); }
.timeline-item { position: relative; margin-bottom: 16px; }
.timeline-time { position: absolute; left: -44px; top: 9px; font-size: 10.5px; color: var(--faint); width: 38px; }
.timeline-card { border-left: 3px solid var(--iris); border-radius: 0 var(--r-md) var(--r-md) 0; background: var(--layer-01); padding: 10px 13px; }
.timeline-card .t { font-size: 13px; font-weight: 600; }
.timeline-card .d { font-size: 11px; color: var(--faint); margin-top: 2px; }

/* Chat */
.bubble-row { display: flex; margin-bottom: 12px; }
.bubble-row.user { justify-content: flex-end; }
.bubble { max-width: 82%; border-radius: 14px; padding: 10px 13px; font-size: 13.5px; line-height: 1.5; }
.bubble.user { background: var(--iris-dim); border-radius: 14px 14px 3px 14px; }
.bubble.bot { background: var(--layer-01); border: 1px solid var(--line); border-radius: 14px 14px 14px 3px; }
.bot-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start; }
.bot-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--grad-brand); flex-shrink: 0; margin-top: 2px; }
.chat-input-bar { display: flex; align-items: center; gap: 8px; padding: 10px 0 4px; }
.chat-input-bar input[type=text] {
  flex: 1; background: var(--layer-01); border: 1px solid var(--line); border-radius: var(--r-pill);
  padding: 10px 15px; font-size: 12.5px; color: var(--text); font-family: inherit;
}
.chat-input-bar input[type=text]::placeholder { color: var(--faint); }

/* Voice screen */
.voice-stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 20px; text-align: center; }
.orb-lg { position: relative; width: 132px; height: 132px; transition: transform var(--dur-moderate) var(--ease-standard); }
.orb-lg .ring { position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(139,124,255,0.4); transition: border-color var(--dur-moderate) var(--ease-standard); }
.orb-lg .glow { position: absolute; inset: -24px; border-radius: 50%; background: radial-gradient(circle, rgba(139,124,255,0.5), transparent 70%); transition: background var(--dur-moderate) var(--ease-standard); }
.orb-lg .core { position: absolute; inset: 0; border-radius: 50%; background: var(--grad-brand); display: flex; align-items: center; justify-content: center; gap: 4px; }

/* Orb state coding — the user should always know which of the three stages
   (listening / thinking / speaking) Buddy is in without reading the label.
   Distinct colors + a spinning "thinking" ring make the state legible at a
   glance, the same way a Carbon InlineLoading or ProgressIndicator would. */
.orb-lg.state-listening .ring { border-color: rgba(52,211,153,0.55); }
.orb-lg.state-listening .glow { background: radial-gradient(circle, rgba(52,211,153,0.55), transparent 70%); }
.orb-lg.state-thinking .ring { border-color: var(--warn); border-style: dashed; animation: spin 900ms linear infinite; }
.orb-lg.state-thinking .glow { background: radial-gradient(circle, rgba(245,184,77,0.45), transparent 70%); animation: none; }
.orb-lg.state-speaking .ring { border-color: var(--iris); }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .orb-lg.state-thinking .ring { animation: none; } }
`;

export const ICON_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
<symbol id="ic-menu" viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></symbol>
<symbol id="ic-bell" viewBox="0 0 24 24"><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/></symbol>
<symbol id="ic-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><line x1="20" y1="20" x2="15.8" y2="15.8"/></symbol>
<symbol id="ic-play" viewBox="0 0 24 24"><path d="M8 6.5v11l9-5.5-9-5.5Z"/></symbol>
<symbol id="ic-wave" viewBox="0 0 24 24"><line x1="4" y1="10" x2="4" y2="14"/><line x1="8" y1="6" x2="8" y2="18"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="16" y1="4" x2="16" y2="20"/><line x1="20" y1="9" x2="20" y2="15"/></symbol>
<symbol id="ic-home" viewBox="0 0 24 24"><path d="M4 11.5 12 5l8 6.5"/><path d="M6 10.5V19h12v-8.5"/></symbol>
<symbol id="ic-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-4 3.5V16H4Z"/></symbol>
<symbol id="ic-calendar" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="8" y1="3.5" x2="8" y2="7"/><line x1="16" y1="3.5" x2="16" y2="7"/></symbol>
<symbol id="ic-person" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-3.8 4-5.5 7-5.5s6 1.7 7 5.5"/></symbol>
<symbol id="ic-family" viewBox="0 0 24 24"><circle cx="9" cy="8" r="2.6"/><circle cx="16" cy="9" r="2.2"/><path d="M4 19c.6-3 2.4-4.6 5-4.6s4.6 1.7 5.2 4.6"/><path d="M14 19c.4-2.2 1.7-3.6 3.6-3.6s3.2 1.4 3.6 3.6"/></symbol>
<symbol id="ic-heart" viewBox="0 0 24 24"><path d="M12 19s-7-4.4-9-8.6C1.5 6.8 4 4 7 4c2 0 4 1.2 5 3 1-1.8 3-3 5-3 3 0 5.5 2.8 4 6.4-2 4.2-9 8.6-9 8.6Z"/></symbol>
<symbol id="ic-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M9.5 9.8c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2c0 2.6-5 1.4-5 4 0 1.2 1.1 2 2.5 2s2.5-.8 2.5-2"/></symbol>
<symbol id="ic-briefcase" viewBox="0 0 24 24"><rect x="3.5" y="8" width="17" height="11" rx="2"/><path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8"/><line x1="3.5" y1="13" x2="20.5" y2="13"/></symbol>
<symbol id="ic-chevron-r" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></symbol>
<symbol id="ic-chevron-l" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></symbol>
<symbol id="ic-check" viewBox="0 0 24 24"><path d="M5 13l4.5 4.5L19 7.5"/></symbol>
<symbol id="ic-x" viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></symbol>
<symbol id="ic-send" viewBox="0 0 24 24"><path d="M4 12l16-7-6.5 16-2.7-6.8L4 12Z"/></symbol>
<symbol id="ic-mic" viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="10.5" rx="3"/><path d="M6 11.5a6 6 0 0 0 12 0"/><line x1="12" y1="17.5" x2="12" y2="20.5"/></symbol>
<symbol id="ic-grid" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></symbol>
<symbol id="ic-doc" viewBox="0 0 24 24"><path d="M6 3.5h9l3 3v14H6Z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></symbol>
<symbol id="ic-map-pin" viewBox="0 0 24 24"><path d="M12 21s6.5-6.2 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4.8 6.5 11 6.5 11Z"/><circle cx="12" cy="10" r="2.2"/></symbol>
<symbol id="ic-cloud" viewBox="0 0 24 24"><path d="M7 17.5a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.6 1.8A3.7 3.7 0 0 1 17.5 17.5Z"/></symbol>
<symbol id="ic-sliders" viewBox="0 0 24 24"><line x1="5" y1="6" x2="19" y2="6"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="5" y1="18" x2="19" y2="18"/><circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="1.6" fill="currentColor" stroke="none"/></symbol>
</defs>
</svg>`;

export function icon(name: string, cls = "i"): string {
  return `<svg class="${cls}"><use href="#ic-${name}"/></svg>`;
}
