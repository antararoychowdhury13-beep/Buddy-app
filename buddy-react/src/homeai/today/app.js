var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { clear, el, openSheet, toast, announce } from "../ui/dom";
import { ICONS } from "../ui/icons";
import { ADAPTERS, buildRecoveryPlans, buildSuggestions, buildTimeline, fmtDur } from "./mock";
import { estimateCompletion, simulateDay } from "./engines";
import { TodayStore } from "./store";
import {
  openBrief,
  openCompanion,
  openCompare,
  openCompletion,
  openDecomposition,
  openEnergy,
  openRecovery,
  openStepPreview,
  openSuggestionWhy
} from "./sheets";
const TYPE_META = {
  meeting: { label: "Meeting", color: "#2F6BFF", bg: "#E9F0FF", icon: ICONS.users },
  focus: { label: "Focus", color: "#8B5CF6", bg: "#EFEAFE", icon: ICONS.shield },
  prep: { label: "Prep", color: "#0FB5B0", bg: "#E1F6F5", icon: ICONS.info },
  travel: { label: "Travel", color: "#0FB5B0", bg: "#E1F6F5", icon: ICONS.pin },
  break: { label: "Break", color: "#22B07D", bg: "#E3F6EC", icon: ICONS.heart },
  personal: { label: "Personal", color: "#EC5B8A", bg: "#FDE8EF", icon: ICONS.home },
  task: { label: "Task", color: "#22B07D", bg: "#E3F6EC", icon: ICONS.check },
  buddy: { label: "Buddy", color: "#2F6BFF", bg: "#E9F0FF", icon: ICONS.spark },
  buffer: { label: "Buffer", color: "#6B7280", bg: "#F0F1F4", icon: ICONS.clock }
};
const FLEX_LABEL = { fixed: "Fixed", flexible: "Flexible", movable: "Movable" };
class TodayApp {
  constructor(root) {
    __publicField(this, "store", new TodayStore());
    __publicField(this, "root");
    __publicField(this, "timeline", buildTimeline());
    __publicField(this, "suggestions", buildSuggestions());
    this.root = root;
    for (const s of this.suggestions) {
      if (this.store.data.appliedSuggestions.includes(s.id)) s.status = "applied";
      if (this.store.data.rejectedSuggestions.includes(s.id)) s.status = "rejected";
    }
    this.render();
  }
  simInput() {
    return {
      timeline: this.timeline,
      appliedSuggestions: new Set(this.store.data.appliedSuggestions),
      overrunActive: this.store.data.overrunActive,
      calendarStale: this.store.data.calendarStale
    };
  }
  render() {
    clear(this.root);
    const sections = [
      this.header(),
      this.staleBanner(),
      this.optimisationCard(),
      this.completionSnapshot(),
      this.nextMeeting(),
      this.timelineCard(),
      this.taskCard(),
      this.energyCard(),
      this.demoControls(),
      this.footer()
    ];
    for (const s of sections) if (s) this.root.append(s);
  }
  header() {
    const now = /* @__PURE__ */ new Date();
    return el("header", { class: "hp-head" }, [
      el("div", { class: "hp-brand" }, [
        el("div", { class: "hp-logo", "aria-hidden": "true", html: ICONS.spark }),
        el("span", { class: "hp-brandname" }, ["Today"]),
        el("button", { class: "hp-bell", "aria-label": "Notifications", html: ICONS.bell })
      ]),
      el("h1", { class: "hp-greet", style: "font-size:24px;" }, ["Your day, orchestrated"]),
      el("p", { class: "hp-sub" }, [now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + " · Buddy keeps it optimised, you stay in control."])
    ]);
  }
  staleBanner() {
    if (!this.store.data.calendarStale) return null;
    return el("div", { class: "stale-banner", role: "status" }, [
      el("span", { class: "ic", html: ICONS.info }),
      el("div", {}, [
        el("strong", {}, ["Calendar data is stale"]),
        el("p", {}, ["Last synced over an hour ago. Confidence is lowered and automatic rescheduling is paused until it refreshes."])
      ])
    ]);
  }
  optimisationCard() {
    const open = this.suggestions.filter((s) => s.status === "suggested");
    const recovered = open.reduce((a, s) => a + s.minutesRecovered, 0);
    const cur = estimateCompletion("current", this.simInput(), this.store.data.healthConsent, this.store.data.energy);
    const opt = estimateCompletion("optimised", this.simInput(), this.store.data.healthConsent, this.store.data.energy);
    const stale = this.store.data.calendarStale;
    const suggestionRows = open.map((s) => el("article", { class: "sug-row" }, [
      el("div", { class: "sug-body" }, [
        el("div", { class: "sug-title" }, [s.title, s.safe ? el("span", { class: "safe-tag" }, ["Safe"]) : el("span", { class: "ext-tag" }, ["Affects others"])]),
        el("div", { class: "sug-reason" }, [s.reason]),
        el("div", { class: "sug-impact" }, [el("span", { class: "ic", html: ICONS.bolt }), s.impact]),
        el("div", { class: "sug-actions" }, [
          el("button", { class: "chip-btn primary", type: "button", onClick: () => this.applySuggestion(s) }, ["Apply"]),
          el("button", { class: "chip-btn", type: "button", onClick: () => openSuggestionWhy(s, this.store) }, ["Ask why"]),
          el("button", { class: "chip-btn ghost", type: "button", "aria-label": `Reject ${s.title}`, onClick: () => this.rejectSuggestion(s) }, ["Reject"])
        ])
      ])
    ]));
    return el("section", { class: "card opt-card", "aria-label": "Schedule optimisation" }, [
      el("div", { class: "plan-kicker" }, [el("span", { class: "ic", html: ICONS.sliders }), "Schedule optimisation"]),
      el("div", { class: "opt-stats" }, [
        this.optStat(`${open.length}`, "Suggestions"),
        this.optStat(`~${recovered}m`, "Recoverable"),
        this.optStat(stale ? "—" : `${Math.round(cur.internalProbability * 100)}→${Math.round(opt.internalProbability * 100)}%`, "Completion")
      ]),
      el("div", { class: "opt-actions" }, [
        el("button", { class: "btn btn-primary", type: "button", disabled: stale, onClick: () => openCompare(this.store, () => this.applySafe()) }, ["Compare & optimise"]),
        el("button", { class: "btn btn-ghost", type: "button", onClick: () => openCompletion(this.simInput(), this.store) }, ["Completion odds"])
      ]),
      stale ? el("p", { class: "opt-blocked" }, ["Optimisation paused — calendar data is stale."]) : null,
      ...suggestionRows.length ? suggestionRows : [el("p", { class: "empty" }, ["No optimisations needed right now — your day looks well balanced."])],
      this.suggestions.some((s) => s.status === "applied") ? el("button", { class: "btn btn-ghost sm", type: "button", style: "margin-top:8px;", onClick: () => this.restoreSchedule() }, [el("span", { class: "ic", html: ICONS.undo }), "Restore original schedule"]) : null
    ]);
  }
  optStat(v, k) {
    return el("div", { class: "pstat" }, [el("div", { class: "pstat-v" }, [v]), el("div", { class: "pstat-k" }, [k])]);
  }
  completionSnapshot() {
    const m = simulateDay(this.simInput());
    const stats = [
      [`${fmtDur(m.focusMins)}`, "Focus"],
      [`${fmtDur(m.meetingMins)}`, "Meetings"],
      [`${m.contextSwitches}`, "Switches"],
      [m.expectedFinish, "Finish"]
    ];
    return el("section", { class: "card", "aria-label": "Day at a glance" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Day at a glance"]), m.personalAtRisk ? el("span", { class: "risk-tag" }, ["Pickup at risk"]) : el("span", { class: "sec-note" }, ["On track"])]),
      el("div", { class: "plan-stats" }, stats.map(([v, k]) => el("div", { class: "pstat" }, [el("div", { class: "pstat-v" }, [v]), el("div", { class: "pstat-k" }, [k])])))
    ]);
  }
  nextMeeting() {
    return el("section", { class: "card next-card", "aria-label": "Next meeting" }, [
      el("div", { class: "next-top" }, [
        el("div", {}, [el("div", { class: "next-when" }, ["11:00 AM · in 40 min"]), el("div", { class: "next-title" }, ["Stakeholder Sync"]), el("div", { class: "next-sub" }, ["4 stakeholders · Buddy prepped a brief"])]),
        el("div", { class: "chip", style: "width:40px;height:40px;border-radius:12px;background:#E9F0FF;color:#2F6BFF;display:grid;place-items:center;", html: ICONS.users })
      ]),
      el("div", { class: "next-actions" }, [
        el("button", { class: "btn btn-primary", type: "button", onClick: () => openBrief(this.store) }, [el("span", { class: "ic", html: ICONS.spark }), "Brief me"]),
        el("button", { class: "btn btn-tonal", type: "button", onClick: () => openCompanion(this.store, () => this.render()) }, ["Meeting companion"])
      ])
    ]);
  }
  timelineCard() {
    const legend = el("div", { class: "legend" }, ["meeting", "focus", "personal", "buffer", "travel"].map((t) => el("span", { class: "legend-item" }, [el("span", { class: "legend-dot", style: `background:${TYPE_META[t].bg}; color:${TYPE_META[t].color};`, "aria-hidden": "true", html: TYPE_META[t].icon }), TYPE_META[t].label])));
    const rows = this.timeline.map((b) => {
      const meta = TYPE_META[b.type];
      const dur = b.endMins - b.startMins;
      return el("article", { class: `tl-row${b.conflict ? " tl-conflict" : ""}` }, [
        el("div", { class: "tl-time" }, [b.start]),
        el("div", { class: "tl-rail", style: `background:${meta.color};`, "aria-hidden": "true" }),
        el("div", { class: "tl-body" }, [
          el("div", { class: "tl-head" }, [
            el("span", { class: "tl-type", style: `background:${meta.bg}; color:${meta.color};` }, [el("span", { class: "ic", html: meta.icon }), meta.label]),
            el("span", { class: "tl-flex" }, [FLEX_LABEL[b.flexibility]]),
            b.attendance === "optional" ? el("span", { class: "tl-opt" }, ["Optional"]) : null,
            b.conflict ? el("span", { class: "tl-conf-tag" }, [el("span", { class: "ic", html: ICONS.bolt }), "Conflict"]) : null
          ]),
          el("div", { class: "tl-title" }, [b.title, el("span", { class: "tl-dur" }, [` · ${fmtDur(dur)}`])]),
          el("div", { class: "tl-sub" }, [b.sub]),
          b.actions.length ? el("div", { class: "tl-actions" }, b.actions.map((a) => el("button", { class: "chip-btn", type: "button", onClick: () => this.blockAction(a, b) }, [a]))) : null
        ])
      ]);
    });
    return el("section", { class: "card", "aria-label": "Timeline" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Timeline"]), el("span", { class: "sec-note" }, ["Adaptive · replans live"])]),
      legend,
      el("div", { class: "timeline" }, rows)
    ]);
  }
  taskCard() {
    const clarified = this.store.data.taskClarified;
    const firstPass = this.store.data.taskFirstPassDone;
    return el("section", { class: "card", "aria-label": "Due tasks" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Due today"]), el("span", { class: "sec-note" }, ["3 tasks · 1 blocks 2 people"])]),
      el("article", { class: "task-row" }, [
        el("div", { class: "task-body" }, [
          el("div", { class: "task-title" }, ["Review API spec (BUD-231)", el("span", { class: "block-tag" }, ["Blocks 2"])]),
          el("div", { class: "task-sub" }, [clarified ? firstPass ? "Clarified · Buddy did the first pass" : "Clarified · ready to plan" : "A bit vague — Buddy will ask one thing first"])
        ]),
        el("button", { class: "chip-btn primary", type: "button", onClick: () => openDecomposition(this.store, () => this.render()) }, [clarified ? "Open plan" : "Plan it"])
      ]),
      el("article", { class: "task-row" }, [el("div", { class: "task-body" }, [el("div", { class: "task-title" }, ["Send sprint summary"]), el("div", { class: "task-sub" }, ["Due today · Buddy can draft it"])])]),
      el("article", { class: "task-row" }, [el("div", { class: "task-body" }, [el("div", { class: "task-title" }, ["Approve design tokens PR"]), el("div", { class: "task-sub" }, ["Due today · 15 min"])])])
    ]);
  }
  energyCard() {
    const e = this.store.data.energy;
    const label = { energised: "Energised", ok: "Okay", low: "Low energy", over: "Overloaded", unspecified: "Not set" }[e];
    return el("section", { class: "card energy-card", "aria-label": "Energy" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Energy-aware"]), el("span", { class: "sec-note" }, [this.store.data.healthConsent ? "Health data on" : "Manual check-in"])]),
      el("div", { class: "energy-lead" }, [
        el("div", {}, [el("div", { class: "energy-cur" }, [`You're feeling: ${label}`]), el("p", { class: "muted sm" }, ["I'll pace deep work and breaks around this — no health data needed."])]),
        el("button", { class: "btn btn-tonal", type: "button", onClick: () => openEnergy(this.store, () => this.render()) }, ["Check in"])
      ])
    ]);
  }
  demoControls() {
    const btn = (label, run) => el("button", { class: "demo-btn", type: "button", onClick: run }, [label]);
    return el("details", { class: "demo-panel" }, [
      el("summary", {}, [el("span", { class: "ic", html: ICONS.sliders }), "Demo controls"]),
      el("div", { class: "demo-grid" }, [
        btn("Trigger 25-min overrun", () => {
          this.store.data.overrunActive = true;
          this.store.save();
          this.store.audit({ trigger: "demo", action: "Stakeholder sync overran 25 min", sources: ["calendar"], decision: "system", result: "completed", undoStatus: "none", permissionUsed: null });
          announce("Day is replanning after a 25-minute overrun.");
          this.render();
          openRecovery(buildRecoveryPlans(), this.store, () => this.render());
        }),
        btn("Add urgent task", () => {
          toast("Urgent issue added — completion odds recalculated.");
          this.render();
        }),
        btn("Traffic delay", () => {
          toast("Traffic worsened — leave 10 min earlier flagged on your commute.");
        }),
        btn("Mark task complete", () => {
          toast("Nice — one due task cleared. Odds improved.");
          this.render();
        }),
        btn("Change energy", () => openEnergy(this.store, () => this.render())),
        btn(this.store.data.calendarStale ? "Refresh calendar" : "Make calendar stale", () => {
          this.store.data.calendarStale = !this.store.data.calendarStale;
          this.store.save();
          toast(this.store.data.calendarStale ? "Calendar marked stale — auto-reschedule paused." : "Calendar refreshed.");
          this.render();
        })
      ])
    ]);
  }
  footer() {
    return el("section", { class: "foot-controls" }, [
      el("button", { class: "btn btn-ghost sm", type: "button", onClick: () => this.openAudit() }, ["Day changes"]),
      el("button", { class: "btn btn-ghost sm", type: "button", onClick: () => this.openAdapters() }, ["Connections"]),
      el("button", { class: "btn btn-ghost sm danger", type: "button", onClick: () => {
        this.store.reset();
        this.timeline = buildTimeline();
        this.suggestions = buildSuggestions();
        this.render();
        toast("Today demo reset.");
      } }, ["Reset Today"])
    ]);
  }
  // ---- actions ----
  applySuggestion(s) {
    openStepPreview({ title: s.title, steps: s.steps, store: this.store, trigger: "optimisation", onDone: () => {
      s.status = "applied";
      if (!this.store.data.appliedSuggestions.includes(s.id)) this.store.data.appliedSuggestions.push(s.id);
      this.store.save();
      this.render();
      setTimeout(() => this.outcomeFeedback(s.id), 300);
    } });
  }
  applySafe() {
    const safe = this.suggestions.filter((s) => s.status === "suggested" && s.safe);
    const steps = safe.flatMap((s) => s.steps);
    if (steps.length === 0) {
      toast("No safe changes to apply.");
      return;
    }
    openStepPreview({ title: "Apply safe optimisations", steps, store: this.store, trigger: "optimisation (safe)", onDone: () => {
      for (const s of safe) {
        s.status = "applied";
        if (!this.store.data.appliedSuggestions.includes(s.id)) this.store.data.appliedSuggestions.push(s.id);
      }
      this.store.save();
      this.render();
    } });
  }
  rejectSuggestion(s) {
    s.status = "rejected";
    if (!this.store.data.rejectedSuggestions.includes(s.id)) this.store.data.rejectedSuggestions.push(s.id);
    this.store.addFeedback(s.id, "rejected", s.type);
    this.store.audit({ trigger: "user", action: `Rejected: ${s.title}`, sources: s.sources, decision: "rejected", result: "completed", undoStatus: "none", permissionUsed: null });
    this.store.save();
    this.render();
    toast("Removed from your plan.");
  }
  restoreSchedule() {
    this.store.data.appliedSuggestions = [];
    for (const s of this.suggestions) if (s.status === "applied") s.status = "suggested";
    this.store.audit({ trigger: "user", action: "Restored original schedule", sources: ["calendar"], decision: "restore", result: "completed", undoStatus: "none", permissionUsed: null });
    this.store.save();
    this.render();
    toast("Original schedule restored.");
  }
  blockAction(action, b) {
    if (action === "Brief me") {
      openBrief(this.store);
      return;
    }
    if (action === "Resolve conflict") {
      openRecovery(buildRecoveryPlans(), this.store, () => this.render());
      return;
    }
    if (action === "Protect") {
      openStepPreview({ title: `Protect ${b.title}`, store: this.store, trigger: "timeline", steps: [{ id: `prot-${b.id}`, description: `Hold ${b.title} and mute non-urgent alerts`, targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "The block is held; others see you as busy.", executionStatus: "suggested", undoAvailable: true }], onDone: () => this.render() });
      return;
    }
    if (action === "Ask Buddy to move" || action === "Mark optional") {
      const s = this.suggestions.find((x) => x.id === "s-vendor");
      if (s) this.applySuggestion(s);
      return;
    }
    toast(`${action} — ${b.title}`);
  }
  outcomeFeedback(id) {
    const body = el("div", { class: "sheet-body" }, [
      el("p", { style: "margin-bottom:14px;" }, ["How does that change feel?"]),
      ...[["useful", "Useful"], ["poor_timing", "Poor timing"], ["intrusive", "Too intrusive"], ["ask_first", "Ask me first next time"]].map(([k, lbl]) => el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
        this.store.addFeedback(id, k);
        toast("Thanks — that shapes future suggestions, not permissions.");
        document.querySelector(".sheet-scrim.open .sheet-close")?.click();
      } }, [lbl])),
      el("p", { class: "fineprint" }, ["Feedback tunes timing and ranking only — never permissions or consent."])
    ]);
    openSheet({ title: "Quick feedback", body });
  }
  openAudit() {
    const items = this.store.data.audit;
    openSheet({ title: "Day changes", body: el("div", { class: "sheet-body" }, [
      items.length === 0 ? el("p", { class: "empty" }, ["No changes yet today."]) : el("div", { class: "audit-list" }, items.map((a) => el("div", { class: "audit-row" }, [
        el("div", { class: `audit-dot audit-${a.result}`, "aria-hidden": "true" }),
        el("div", {}, [el("div", { class: "audit-action" }, [a.action]), el("div", { class: "audit-meta" }, [`${a.trigger} · ${a.decision} · ${a.result}${a.permissionUsed ? " · " + a.permissionUsed : ""} · ${new Date(a.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`])])
      ])))
    ]) });
  }
  openAdapters() {
    openSheet({ title: "Connections", body: el("div", { class: "sheet-body" }, [
      el("p", { class: "muted", style: "margin-bottom:12px;" }, ["The data Buddy reads to plan your day. It works even when some are off or stale."]),
      el("div", { class: "src-list" }, ADAPTERS.map((a) => el("div", { class: "src-row" }, [
        el("div", {}, [el("div", { class: "src-name" }, [a.label]), el("div", { class: "muted sm" }, [a.connected ? `Synced ${a.lastSyncMins}m ago · ${a.scope}` : a.scope])]),
        el("span", { class: `conn-pill ${a.connected ? a.stale ? "warn" : "ok" : "off"}` }, [a.connected ? a.stale ? "Stale" : "Connected" : "Off"])
      ])))
    ]) });
  }
}
export {
  TodayApp
};
