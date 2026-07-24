/**
 * Shared design system for the Buddy web app: tokens, component CSS, and the
 * icon sprite. Every route renders through shell.ts, which pulls this in once.
 *
 * Implements the Buddy brand guide (`design.md`): dark-first & calm, one
 * typeface (Manrope) with weight carrying hierarchy, a single accent gradient
 * (#4F8CFF -> #7C4DFF), translucent glass surfaces over a deep near-black
 * canvas with a soft drifting aura, category dots for life domains, and status
 * colors for state. Legacy token names (--iris, --violet, --layer-01, ...) are
 * kept as aliases mapped onto the new palette so existing route markup keeps
 * working unchanged.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">`;

export const DESIGN_CSS = `
:root {
  /* ---- Accent (Buddy / actions) ---- */
  --buddy-accent-a: #4F8CFF;
  --buddy-accent-b: #7C4DFF;
  --buddy-accent-gradient: linear-gradient(135deg, #4F8CFF, #7C4DFF);
  --buddy-accent-link: #7FB0FF;
  --buddy-accent-link-hover: #A9C8FF;

  /* ---- Canvas & text (dark theme, default) ---- */
  --bg: radial-gradient(135% 95% at 50% -12%, #17203A 0%, #0B0F20 55%, #05070E 100%);
  --ink: #05070E;
  --text: #F3F5FA;
  --muted: rgba(255,255,255,0.5);
  --faint: rgba(255,255,255,0.34);
  --mist: rgba(255,255,255,0.62);

  /* ---- Glass surfaces & hairlines ---- */
  --surface: rgba(255,255,255,0.055);
  --surface-2: rgba(255,255,255,0.09);
  --layer-01: rgba(255,255,255,0.055);
  --layer-02: rgba(255,255,255,0.09);
  --border: rgba(255,255,255,0.1);
  --line: rgba(255,255,255,0.1);
  --line-soft: rgba(255,255,255,0.06);

  /* ---- Status ---- */
  --success: #3DDC84; --info: #5AC8FA; --warning: #F5A623; --alert: #EC5B8A;
  --good: #3DDC84;  --good-dim: rgba(61,220,132,0.16);
  --warn: #F5A623;  --warn-dim: rgba(245,166,35,0.16);
  --crit: #EC5B8A;  --crit-dim: rgba(236,91,138,0.16);
  --rose: #EC5B8A;  --rose-dim: rgba(236,91,138,0.16);
  --info-dim: rgba(90,200,250,0.16);

  /* ---- Accent aliases (legacy names -> brand accent) ---- */
  --iris: #4F8CFF;   --iris-dim: rgba(79,140,255,0.16);
  --violet: #9B6BFF; --violet-dim: rgba(155,107,255,0.16);
  --grad-brand: var(--buddy-accent-gradient);

  /* ---- Category dots (life domains) ---- */
  --cat-work: #5A9BFF; --cat-family: #EC5B8A; --cat-health: #3DDC84;
  --cat-weather: #5AC8FA; --cat-focus: #9B6BFF; --cat-money: #F5A623;
  --cat-personal: #A855F7; --cat-learn: #22D3EE; --cat-neutral: #8A93A6;

  /* ---- Radii ---- */
  --r-chip: 12px; --r-sm: 11px; --r-md: 16px; --r-lg: 22px;
  --r-hero: 24px; --r-sheet: 26px; --r-pill: 999px;

  /* ---- Elevation ---- */
  --shadow-card: 0 14px 34px rgba(5,8,20,0.4);
  --shadow-active: 0 16px 40px rgba(30,25,90,0.26);
  --shadow-accent: 0 20px 44px rgba(60,50,130,0.34);

  /* ---- Motion ---- */
  --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  --ease-standard: cubic-bezier(0.22, 0.61, 0.36, 1);
  --ease-entrance: cubic-bezier(0.22, 0.61, 0.36, 1);
  --ease-exit: cubic-bezier(0.4, 0.14, 1, 1);
  --dur-fast: 140ms; --dur-moderate: 240ms; --dur-slow: 420ms;

  color-scheme: dark;
}

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: var(--bg) fixed;
  color: var(--text);
  font-family: 'Manrope', -apple-system, 'Segoe UI', sans-serif;
  font-weight: 500;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
/* Soft drifting aura — calm, never loud. */
body::before {
  content: "";
  position: fixed; inset: -20% -10% auto -10%; height: 70%;
  background:
    radial-gradient(50% 60% at 22% 20%, rgba(79,140,255,0.16), transparent 70%),
    radial-gradient(52% 62% at 82% 8%, rgba(124,77,255,0.16), transparent 72%);
  filter: blur(24px);
  pointer-events: none; z-index: 0;
  animation: auraDrift 24s ease-in-out infinite alternate;
}
@keyframes auraDrift {
  from { transform: translate3d(-2%, -1%, 0) scale(1); }
  to   { transform: translate3d(3%, 2%, 0) scale(1.08); }
}
@media (prefers-reduced-motion: reduce) { body::before { animation: none; } }

a { color: inherit; text-decoration: none; }
button { font-family: inherit; }
code { font-family: 'Manrope', ui-monospace, monospace; font-weight: 600; }
.mono { font-variant-numeric: tabular-nums; letter-spacing: 0; }

/* ---- Shell ---- */
.app-shell {
  max-width: 430px; margin: 0 auto; min-height: 100vh;
  display: flex; flex-direction: column; position: relative; z-index: 1;
}

.app-header {
  display: flex; align-items: center; gap: 12px;
  padding: 52px 20px 10px; flex-shrink: 0;
  position: sticky; top: 0; z-index: 20;
  background: rgba(8,11,22,0.72);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.app-header .spacer { flex: 1; min-width: 0; }
.app-header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }

.icon-btn {
  width: 44px; height: 44px; border-radius: var(--r-chip);
  background: var(--surface); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text); flex-shrink: 0; cursor: pointer;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  transition: transform var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
.icon-btn:active { transform: scale(0.975); }
.icon-btn:focus-visible, a:focus-visible, button:focus-visible { outline: 2px solid var(--buddy-accent-a); outline-offset: 2px; }

.app-body { flex: 1; padding: 4px 20px 28px; position: relative; z-index: 1; }
.app-body > * { animation: cardIn var(--dur-slow) var(--ease) both; }

@keyframes cardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .app-body > * { animation: none; } }

/* ---- Tab bar ---- */
.tabbar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-around;
  padding: 10px 8px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line-soft);
  background: rgba(8,11,22,0.78);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  position: sticky; bottom: 0; z-index: 30;
}
.tab { display: flex; flex-direction: column; align-items: center; gap: 3px; color: var(--faint); padding: 4px 12px; min-height: 44px; justify-content: center; transition: color var(--dur-fast) var(--ease); }
.tab.active { color: var(--buddy-accent-a); }
.tab span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; }
.tab-orb {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--buddy-accent-gradient);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 4px var(--ink), var(--shadow-accent);
  margin-top: -24px; color: #fff;
  transition: transform var(--dur-fast) var(--ease);
}
.tab-orb:active { transform: scale(0.975); }

/* ---- Icons ---- */
.i { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; display: block; }
.i-sm { width: 15px; height: 15px; }
.i-lg { width: 26px; height: 26px; }

/* ---- Category / status chips (icon tile) ---- */
.chip {
  width: 40px; height: 40px; border-radius: var(--r-chip);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.chip.violet { background: var(--violet-dim); color: var(--violet); }
.chip.iris { background: var(--iris-dim); color: var(--iris); }
.chip.good { background: var(--good-dim); color: var(--good); }
.chip.warn { background: var(--warn-dim); color: var(--warn); }
.chip.rose { background: var(--rose-dim); color: var(--rose); }
.chip.info { background: var(--info-dim); color: var(--info); }

/* Category dot — 8px round marker for a life domain. */
.cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.cat-dot.work { background: var(--cat-work); }
.cat-dot.family { background: var(--cat-family); }
.cat-dot.health { background: var(--cat-health); }
.cat-dot.weather { background: var(--cat-weather); }
.cat-dot.focus { background: var(--cat-focus); }
.cat-dot.money { background: var(--cat-money); }
.cat-dot.personal { background: var(--cat-personal); }
.cat-dot.learn { background: var(--cat-learn); }
.cat-dot.neutral { background: var(--cat-neutral); }

/* ---- Eyebrows & labels ---- */
.eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--buddy-accent-a); }
.label { font-size: 11.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); }

.section-head { display: flex; align-items: baseline; justify-content: space-between; margin: 30px 0 14px; }
.section-head h2 { font-size: 16.5px; font-weight: 800; letter-spacing: -0.3px; margin: 0; }
.section-head a { font-size: 12.5px; color: var(--buddy-accent-link); font-weight: 700; }

/* ---- Buttons ---- */
.btn {
  font-family: inherit; font-weight: 800; font-size: 13.5px; letter-spacing: -0.1px;
  border-radius: var(--r-sm); border: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 12px 18px; min-height: 44px;
  transition: transform var(--dur-fast) var(--ease), filter var(--dur-fast) var(--ease);
}
.btn:active { transform: scale(0.975); }
.btn-primary { background: var(--buddy-accent-gradient); color: #fff; box-shadow: var(--shadow-accent); }
.btn-primary:active { filter: brightness(1.05); }
.btn-ghost { background: var(--surface); border: 1px solid var(--border); color: var(--text); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.btn-secondary { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); }
.btn-outline-good { background: transparent; border: 1.5px solid var(--good); color: var(--good); }
.btn-outline-crit { background: transparent; border: 1.5px solid var(--border); color: var(--muted); }
.btn-sm { padding: 8px 13px; min-height: 0; font-size: 12px; border-radius: var(--r-sm); }
.btn:disabled { opacity: 0.55; cursor: default; }

/* ---- Stat tiles ---- */
.tile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tile {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);
  padding: 15px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-card);
}
.tile .chip { width: 30px; height: 30px; border-radius: 9px; margin-bottom: 9px; }
.tile .num { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
.tile .lbl { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.tile .sub { font-size: 10.5px; color: var(--faint); }

/* ---- Cards (glass / active / accent) ---- */
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-hero);
  padding: 18px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-card);
}
.card.active { border: 1.5px solid rgba(120,150,255,0.45); box-shadow: var(--shadow-active); border-radius: var(--r-lg); }
.card.accent {
  background: var(--buddy-accent-gradient); color: #fff; border: none;
  box-shadow: var(--shadow-accent); position: relative; overflow: hidden;
}
.card.accent::after {
  content: ""; position: absolute; top: -40%; right: -20%; width: 60%; height: 120%;
  background: radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%);
  pointer-events: none;
}

.list-row {
  display: flex; align-items: center; gap: 11px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);
  padding: 11px 13px; margin-bottom: 8px;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}

/* ---- Nudge / timeline card ---- */
.nudge-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 15px;
  display: flex; gap: 13px; margin-bottom: 10px;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-card);
}
.nudge-body { flex: 1; min-width: 0; }
.nudge-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; gap: 8px; }
.nudge-domain { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.nudge-domain.family { color: var(--cat-family); }
.nudge-domain.health { color: var(--cat-health); }
.nudge-domain.finance { color: var(--cat-money); }
.nudge-domain.work { color: var(--cat-work); }
.nudge-domain.commute, .nudge-domain.other { color: var(--cat-focus); }
.nudge-time { font-variant-numeric: tabular-nums; font-size: 10.5px; font-weight: 600; color: var(--faint); flex-shrink: 0; }
.nudge-msg { font-size: 14.5px; font-weight: 600; line-height: 1.45; margin-bottom: 11px; }
.nudge-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

/* Pills render color on a ~16% alpha tint of itself. */
.tier-pill { font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; padding: 4px 9px; border-radius: var(--r-pill); text-transform: uppercase; }
.tier-pill.proactive { background: var(--violet-dim); color: var(--violet); }
.tier-pill.ambient { background: var(--iris-dim); color: var(--iris); }
.tier-pill.passive { background: var(--surface-2); color: var(--muted); }
.tier-pill.silent { background: var(--surface-2); color: var(--faint); }

/* ---- Integrations ---- */
.integration-group { margin-bottom: 8px; }
.integration-group summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 13px 15px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.integration-group summary::-webkit-details-marker { display: none; }
.integration-group summary .chev { color: var(--faint); flex-shrink: 0; transition: transform var(--dur-fast) var(--ease); }
.integration-group[open] summary { border-radius: var(--r-md) var(--r-md) 0 0; }
.integration-group[open] summary .chev { transform: rotate(90deg); }
.integration-group-body { border: 1px solid var(--border); border-top: none; border-radius: 0 0 var(--r-md) var(--r-md); padding: 4px 15px; background: var(--surface); }
.integration-group:not([open]) .integration-group-body { display: none; }
.integration-group-counts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

.integration-row { padding: 10px 0; border-bottom: 1px solid var(--line); }
.integration-row:last-child { border-bottom: none; }
.integration-row .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.integration-row .name { font-size: 12.5px; font-weight: 700; }
.integration-row .notes { font-size: 11px; color: var(--faint); margin-top: 3px; line-height: 1.4; }
.integration-row .action { font-size: 11px; color: var(--buddy-accent-link); font-weight: 700; white-space: nowrap; flex-shrink: 0; }

.method-pill { font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; padding: 3px 8px; border-radius: var(--r-pill); white-space: nowrap; flex-shrink: 0; }
.method-pill.violet { background: var(--violet-dim); color: var(--violet); }
.method-pill.iris { background: var(--iris-dim); color: var(--iris); }
.method-pill.good { background: var(--good-dim); color: var(--good); }
.method-pill.warn { background: var(--warn-dim); color: var(--warn); }
.method-pill.rose { background: var(--rose-dim); color: var(--rose); }
.method-pill.plain { background: var(--surface-2); color: var(--faint); }

/* ---- Trust meter ---- */
.trust-row + .trust-row { margin-top: 16px; }
.trust-row .top { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; }
.trust-row .top .pct { font-size: 16px; font-weight: 800; }
.meter-track { height: 8px; border-radius: 4px; background: var(--surface-2); display: flex; overflow: hidden; }
.meter-seg { height: 100%; transition: width var(--dur-slow) var(--ease); }
.meter-seg.good { background: var(--good); }
.meter-seg.rose { background: var(--rose); }
.meter-seg.neutral { background: var(--faint); opacity: 0.5; }
.meter-track.empty { background: var(--surface-2); }
.meter-legend { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.meter-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--faint); }
.meter-legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.trust-row .caption { font-size: 10.5px; color: var(--faint); margin-top: 6px; }

/* ---- Orb (voice) ---- */
.orb-glow { animation: pulse 3.6s ease-in-out infinite; }
.wave-bar { animation: wave 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .orb-glow, .wave-bar { animation: none; } }
@keyframes pulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.05); } }
@keyframes wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }

/* ---- Menu drawer (panel slides in) ---- */
.scrim {
  position: fixed; inset: 0; background: rgba(4,5,10,0.6);
  backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  opacity: 0; pointer-events: none; transition: opacity var(--dur-fast) var(--ease); z-index: 40;
}
.drawer {
  position: fixed; top: 0; bottom: 0; left: 0; width: 80%; max-width: 320px;
  background: rgba(11,15,32,0.86); border-right: 1px solid var(--border);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transform: translateX(-100%); transition: transform var(--dur-moderate) var(--ease);
  z-index: 41; display: flex; flex-direction: column; padding: 28px 16px 20px;
}
body.menu-open .scrim { opacity: 1; pointer-events: auto; }
body.menu-open .drawer { transform: translateX(0); }
.drawer-link { display: flex; align-items: center; gap: 12px; padding: 12px 10px; border-radius: 12px; color: var(--mist); min-height: 44px; }
.drawer-link.active { background: var(--violet-dim); color: var(--violet); }
.drawer-link span { font-size: 13.5px; font-weight: 700; }

/* ---- Timeline (My Day) ---- */
.timeline { position: relative; padding-left: 52px; margin-top: 16px; }
.timeline::before { content: ""; position: absolute; left: 44px; top: 6px; bottom: 6px; width: 1px; background: var(--line); }
.timeline-item { position: relative; margin-bottom: 16px; }
.timeline-time { position: absolute; left: -52px; top: 12px; font-variant-numeric: tabular-nums; font-size: 10.5px; font-weight: 700; color: var(--faint); width: 44px; text-align: right; }
.timeline-card { border-left: 3px solid var(--iris); border-radius: var(--r-md); background: var(--surface); border: 1px solid var(--border); border-left-width: 3px; padding: 12px 14px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.timeline-card .t { font-size: 14px; font-weight: 700; }
.timeline-card .d { font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }

/* ---- Chat ---- */
.bubble-row { display: flex; margin-bottom: 12px; }
.bubble-row.user { justify-content: flex-end; }
.bubble { max-width: 82%; border-radius: 18px; padding: 11px 14px; font-size: 14px; font-weight: 600; line-height: 1.5; }
.bubble.user { background: var(--iris-dim); border-radius: 18px 18px 5px 18px; }
.bubble.bot { background: var(--surface); border: 1px solid var(--border); border-radius: 18px 18px 18px 5px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.bot-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start; }
.bot-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--buddy-accent-gradient); flex-shrink: 0; margin-top: 2px; }
.chat-input-bar { display: flex; align-items: center; gap: 8px; padding: 10px 0 4px; }
.chat-input-bar input[type=text] {
  flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill);
  padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--text); font-family: inherit;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.chat-input-bar input[type=text]::placeholder { color: var(--faint); }

/* ---- Voice screen ---- */
.voice-stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 24px; text-align: center; }
.orb-lg { position: relative; width: 140px; height: 140px; transition: transform var(--dur-moderate) var(--ease); }
.orb-lg .ring { position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(124,77,255,0.4); transition: border-color var(--dur-moderate) var(--ease); }
.orb-lg .glow { position: absolute; inset: -26px; border-radius: 50%; background: radial-gradient(circle, rgba(124,77,255,0.5), transparent 70%); transition: background var(--dur-moderate) var(--ease); }
.orb-lg .core { position: absolute; inset: 0; border-radius: 50%; background: var(--buddy-accent-gradient); display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: var(--shadow-accent); }

/* Orb state coding — listening / thinking / speaking legible at a glance. */
.orb-lg.state-listening .ring { border-color: rgba(61,220,132,0.55); }
.orb-lg.state-listening .glow { background: radial-gradient(circle, rgba(61,220,132,0.55), transparent 70%); }
.orb-lg.state-thinking .ring { border-color: var(--warn); border-style: dashed; animation: spin 900ms linear infinite; }
.orb-lg.state-thinking .glow { background: radial-gradient(circle, rgba(245,166,35,0.45), transparent 70%); animation: none; }
.orb-lg.state-speaking .ring { border-color: var(--iris); }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .orb-lg.state-thinking .ring { animation: none; } }

/* ============================================================= Daily Brief home
   The "Your day, already handled" home screen: date header + greeting orb,
   segmented control, an AI Daily Brief hero card (stat strip + highlights),
   attention/ignore sections, and a floating "tap to talk" voice orb. */

/* Bell with unread badge */
.bell-badge {
  position: absolute; top: -3px; right: -3px; min-width: 17px; height: 17px; padding: 0 4px;
  border-radius: 9px; background: var(--alert); color: #fff; font-size: 9.5px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; border: 2px solid var(--ink);
}

/* Greeting row + avatar orb */
.greeting-row { display: flex; align-items: center; gap: 13px; margin-top: 8px; }
.avatar-orb {
  width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0;
  background: radial-gradient(circle at 34% 30%, #ffffff 0%, var(--buddy-accent-a) 44%, #241653 100%);
  box-shadow: 0 0 0 1px rgba(255,255,255,.12), var(--shadow-accent);
}
.greeting-row .hi { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
.greeting-row .sub { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-top: 1px; }

/* Segmented control */
.seg-row { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; gap: 10px; }
.segmented {
  display: inline-flex; gap: 4px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-pill); padding: 4px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.segmented a { padding: 8px 16px; border-radius: var(--r-pill); font-size: 12.5px; font-weight: 700; color: var(--muted); transition: color var(--dur-fast) var(--ease); }
.segmented a.active { background: var(--buddy-accent-gradient); color: #fff; }
.seg-add { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--buddy-accent-link); flex-shrink: 0; }

/* AI Daily Brief hero card */
.brief-hero { margin-top: 16px; }
.brief-hero .hero-title { font-size: 21px; font-weight: 800; letter-spacing: -0.4px; margin: 8px 0 5px; }
.brief-hero .hero-sub { font-size: 13.5px; font-weight: 600; color: var(--muted); line-height: 1.5; }

/* 4-up stat strip inside the brief */
.stat-strip {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 15px 0 4px;
  background: var(--border); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden;
}
.stat-cell { background: rgba(255,255,255,0.03); padding: 12px 10px; }
.stat-cell .v { font-size: 16.5px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.1; }
.stat-cell .k { font-size: 9.5px; font-weight: 700; color: var(--muted); margin-top: 4px; line-height: 1.25; text-transform: none; }
.stat-cell .i { margin-top: 9px; }
.stat-cell .i .i { width: 15px; height: 15px; }

/* Brief highlight rows */
.brief-item { display: flex; gap: 11px; align-items: flex-start; padding: 11px 0; }
.brief-item + .brief-item { border-top: 1px solid var(--line-soft); }
.brief-item .dot { width: 27px; height: 27px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.brief-item .t { font-size: 13.5px; font-weight: 700; line-height: 1.35; }
.brief-item .s { font-size: 12px; font-weight: 500; color: var(--muted); margin-top: 2px; line-height: 1.45; }

/* Section eyebrow header */
.eyebrow-head { margin: 26px 0 12px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.eyebrow-head .label { color: var(--muted); }

/* "Safely ignore" compact row */
.ignore-row { display: flex; align-items: center; gap: 11px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 11px 13px; margin-bottom: 8px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.ignore-row .txt { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--mist); }
.ignore-row .txt .d { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--faint); margin-bottom: 2px; }

/* ================================================= My Day — hour-by-hour timeline
   Vertical rail with colored category nodes; each hour is a glass card with a
   category icon tile, a status badge, description, and contextual actions. */
.tl { position: relative; margin-top: 18px; padding-left: 64px; }
.tl::before { content: ""; position: absolute; left: 52px; top: 10px; bottom: 10px; width: 2px; background: var(--line); }
.tl-item { position: relative; margin-bottom: 16px; }
.tl-node { position: absolute; left: -18px; top: 15px; width: 12px; height: 12px; border-radius: 50%; background: var(--cat-neutral); box-shadow: 0 0 0 4px var(--ink); }
.tl-time { position: absolute; left: -64px; top: 13px; width: 44px; text-align: right; font-variant-numeric: tabular-nums; font-size: 12px; font-weight: 700; color: var(--muted); }
.tl-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 15px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: var(--shadow-card); display: flex; gap: 13px; }
.tl-card.now { border: 1.5px solid rgba(120,150,255,0.45); box-shadow: var(--shadow-active); }
.tl-icon { width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tl-icon .i { width: 20px; height: 20px; }
.tl-body { flex: 1; min-width: 0; }
.tl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.tl-title { font-size: 16.5px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.2; }
.tl-badge { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; flex-shrink: 0; margin-top: 2px; white-space: nowrap; }
.tl-desc { font-size: 13px; font-weight: 500; color: var(--mist); line-height: 1.5; margin-top: 7px; }
.tl-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.tl-chip { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 9px 13px; font-size: 12.5px; font-weight: 700; color: var(--text); cursor: pointer; }
.tl-chip:active { transform: scale(0.975); }

/* Category-filter segmented control on My Day */
.filter-seg { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill); padding: 4px; margin-top: 14px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.filter-seg a { flex: 1; text-align: center; padding: 9px 8px; border-radius: var(--r-pill); font-size: 12.5px; font-weight: 700; color: var(--muted); }
.filter-seg a.active { background: var(--buddy-accent-gradient); color: #fff; }

/* "A thought for today" closing card reuses the accent card. */
.thought-eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9; display: flex; align-items: center; gap: 7px; }
.thought-quote { font-size: 21px; font-weight: 800; letter-spacing: -0.4px; line-height: 1.28; margin: 12px 0 10px; }
.thought-attr { font-size: 12.5px; font-weight: 700; opacity: 0.85; }
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
<symbol id="ic-sparkle" viewBox="0 0 24 24"><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8L12 3.5Z"/></symbol>
</defs>
</svg>`;

export function icon(name: string, cls = "i"): string {
  return `<svg class="${cls}"><use href="#ic-${name}"/></svg>`;
}
