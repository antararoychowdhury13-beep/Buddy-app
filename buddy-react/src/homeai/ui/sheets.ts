/** Explanation, source, conflict, plan-preview, edit and compare sheets. */
import type { Conflict, DataSource, PriorityItem, Recommendation, ResolutionOption } from "../models";
import { needsConfirmation, riskLabel, hasPermission } from "../engines/policy";
import { comparePlans, COMPARISON_CAVEAT } from "../engines/planner";
import { simulateStep } from "../engines/execution";
import type { Store } from "../store";
import { announce, el, openSheet, toast } from "./dom";
import { DOMAIN_META, ICONS } from "./icons";

// Active data sources for the current context (real or mock). The app sets
// this on boot so sheets don't each need a ctx param threaded through.
let DATA_SOURCES: DataSource[] = [];
export function setSheetDataSources(ds: DataSource[]) { DATA_SOURCES = ds; }

/** Target-system labels currently stale (source stale flag OR a demo override). */
function staleSystems(store: Store): string[] {
  return DATA_SOURCES.filter((s) => store.data.staleOverrides[s.id] ?? s.stale).map((s) => s.label);
}

const CONF_META: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "High confidence", color: "#22B07D", bg: "#E3F6EC" },
  medium: { label: "Medium confidence", color: "#E8963A", bg: "#FBF0DF" },
  low: { label: "Low confidence", color: "#D64545", bg: "#FCE9E9" },
  missing_info: { label: "Missing information", color: "#6B7280", bg: "#F0F1F4" },
};

function sourceChip(sourceId: string, store: Store): HTMLElement {
  const src = DATA_SOURCES.find((s) => s.id === sourceId);
  const label = src?.label ?? sourceId;
  const stale = store.data.staleOverrides[sourceId] ?? src?.stale ?? false;
  return el("button", {
    class: `src-chip${stale ? " stale" : ""}`, type: "button",
    "aria-label": `Data source: ${label}${stale ? ", stale" : ""}. Tap for details.`,
    onClick: () => openSourceSheet(sourceId, store),
  }, [label, stale ? el("span", { class: "src-stale-dot", "aria-hidden": "true" }, ["•"]) : null]);
}

export function openSourceSheet(sourceId: string, store: Store) {
  const src = DATA_SOURCES.find((s) => s.id === sourceId);
  if (!src) return;
  const stale = store.data.staleOverrides[sourceId] ?? src.stale;
  const body = el("div", { class: "sheet-body" }, [
    el("p", { class: "muted", style: "margin-bottom:12px;" }, [
      stale ? `Last refreshed ${Math.round(src.lastRefreshMinsAgo / 60)}h ago — treated as stale.` : `Refreshed ${src.lastRefreshMinsAgo} min ago.`,
    ]),
    el("div", { class: "info-block" }, [
      el("div", { class: "info-label" }, ["What Buddy used"]),
      el("p", {}, [src.detail]),
    ]),
    el("p", { class: "fineprint" }, ["Buddy shows what type of information it used, not the private contents of your messages."]),
  ]);
  openSheet({ title: `${src.label} source`, body });
}

export function openWhySheet(rec: Recommendation, store: Store) {
  const e = rec.explanation;
  // recompute confidence if any of its sources is now stale (Flow 7)
  const anyStale = e.sources.some((id) => store.data.staleOverrides[id] ?? DATA_SOURCES.find((s) => s.id === id)?.stale);
  const conf = anyStale && e.confidence === "high" ? "medium" : e.confidence;
  const cm = CONF_META[conf];

  const body = el("div", { class: "sheet-body" }, [
    el("div", { class: "why-lead" }, [
      el("div", { class: "why-icon", style: `background:${DOMAIN_META[rec.domain].bg}; color:${DOMAIN_META[rec.domain].color};`, html: DOMAIN_META[rec.domain].icon }),
      el("div", {}, [
        el("div", { class: "info-label" }, ["Why now"]),
        el("p", {}, [e.whyNow]),
      ]),
    ]),
    el("div", { class: "conf-row" }, [
      el("span", { class: "conf-badge", style: `background:${cm.bg}; color:${cm.color};` }, [
        el("span", { class: "conf-dot", style: `background:${cm.color};`, "aria-hidden": "true" }),
        cm.label,
      ]),
      anyStale ? el("span", { class: "conf-note" }, ["Lowered — a source is stale"]) : null,
    ]),
    el("p", { class: "muted", style: "margin:6px 0 14px;" }, [e.confidenceReason]),

    el("div", { class: "info-block" }, [
      el("div", { class: "info-label" }, ["Data sources"]),
      el("div", { class: "chip-row" }, e.sources.map((s) => sourceChip(s, store))),
    ]),
    el("div", { class: "info-block" }, [
      el("div", { class: "info-label" }, ["Evidence"]),
      el("ul", { class: "bullet" }, e.evidence.map((x) => el("li", {}, [x]))),
    ]),
    el("div", { class: "info-block" }, [
      el("div", { class: "info-label" }, ["Assumptions"]),
      el("ul", { class: "bullet" }, e.assumptions.map((x) => el("li", {}, [x]))),
    ]),
    e.missingInfo ? el("div", { class: "info-block warn-block" }, [
      el("div", { class: "info-label" }, ["Missing information"]),
      el("p", {}, [e.missingInfo]),
    ]) : null,
    el("div", { class: "info-block" }, [
      el("div", { class: "info-label" }, ["If ignored"]),
      el("p", {}, [e.consequenceIfIgnored]),
    ]),
    el("div", { class: "meta-grid" }, [
      el("div", {}, [el("span", { class: "meta-k" }, ["Reversible"]), el("span", { class: "meta-v" }, [rec.reversible ? "Yes" : "No — needs confirmation"])]),
      el("div", {}, [el("span", { class: "meta-k" }, ["Permission"]), el("span", { class: "meta-v" }, [rec.requiredPermission ?? "None needed"])]),
    ]),
    el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { store.addFeedback({ subjectId: rec.id, kind: "not_important", note: rec.domain }); toast("Thanks — Buddy will weight this lower."); } }, ["Correct Buddy — this isn't important to me"]),
    el("p", { class: "fineprint" }, ["Nothing changes until you confirm."]),
  ]);
  openSheet({ title: "Why now?", body });
}

/** Plan Preview → per-step deselect, confirmation, staged execution. */
export function openPlanPreview(recs: Recommendation[], store: Store, onDone: () => void) {
  const steps = recs.flatMap((r) => r.steps.map((s) => ({ rec: r, step: s })));
  const selected = new Set(steps.filter((x) => x.step.executionStatus !== "completed").map((x) => x.step.id));
  const confirmed = new Set<string>();

  const list = el("div", { class: "preview-list" });
  const runBtn = el("button", { class: "btn btn-primary full", type: "button" }, ["Confirm & apply selected"]);

  function renderRows() {
    list.replaceChildren(...steps.map(({ rec, step }) => {
      const need = needsConfirmation(step);
      const isSel = selected.has(step.id);
      const isConf = confirmed.has(step.id);
      const permBlocked = !hasPermission(step.permissionRequired);
      return el("div", { class: `preview-row risk-${step.riskLevel}` }, [
        el("label", { class: "preview-check" }, [
          el("input", {
            type: "checkbox", checked: isSel, "aria-label": `Include: ${step.description}`,
            onChange: (ev: Event) => { const c = ev.target as HTMLInputElement; if (c.checked) selected.add(step.id); else { selected.delete(step.id); confirmed.delete(step.id); } renderRows(); },
          }),
        ]),
        el("div", { class: "preview-main" }, [
          el("div", { class: "preview-title" }, [step.description]),
          el("div", { class: "preview-meta" }, [
            el("span", { class: `risk-pill risk-${step.riskLevel}` }, [riskLabel(step.riskLevel)]),
            el("span", { class: "sys-pill" }, [step.targetSystem]),
            el("span", { class: `rev-pill ${step.reversible ? "rev-yes" : "rev-no"}` }, [step.reversible ? "Reversible" : "Not reversible"]),
          ]),
          el("p", { class: "preview-effect" }, [step.preview]),
          need && isSel ? el("label", { class: `confirm-line${permBlocked ? " blocked" : ""}` }, [
            el("input", { type: "checkbox", checked: isConf, disabled: permBlocked, "aria-label": `Explicit confirmation for ${step.description}`,
              onChange: (ev: Event) => { const c = ev.target as HTMLInputElement; if (c.checked) confirmed.add(step.id); else confirmed.delete(step.id); updateRun(); } }),
            permBlocked
              ? el("span", {}, [`Needs the "${step.permissionRequired}" permission — grant it in Settings first.`])
              : el("span", {}, [`Yes, I confirm this ${step.riskLevel}-risk action.`]),
          ]) : null,
        ]),
      ]);
    }));
    updateRun();
  }

  function updateRun() {
    const active = steps.filter((x) => selected.has(x.step.id));
    const unconfirmed = active.filter((x) => needsConfirmation(x.step) && !confirmed.has(x.step.id));
    runBtn.toggleAttribute("disabled", active.length === 0 || unconfirmed.length > 0);
    runBtn.textContent = active.length === 0 ? "Select at least one step"
      : unconfirmed.length > 0 ? `Confirm ${unconfirmed.length} action${unconfirmed.length > 1 ? "s" : ""} above`
      : `Confirm & apply ${active.length} step${active.length > 1 ? "s" : ""}`;
  }

  runBtn.addEventListener("click", async () => {
    runBtn.setAttribute("disabled", "");
    const active = steps.filter((x) => selected.has(x.step.id));
    for (const { rec, step } of active) {
      step.executionStatus = "executing";
      renderRows();
      announce(`Applying: ${step.description}`);
      const res = await simulateStep(step, staleSystems(store));
      step.executionStatus = res.status === "completed" ? "completed" : res.status === "partial" ? "partial" : "failed";
      step.result = res.message;
      step.undoAvailable = res.undoAvailable;
      store.audit(step.description, step.targetSystem, res.status, res.undoAvailable);
      renderResult(rec, step, res.message, res.warning, res.undoAvailable);
    }
    store.setStatus("__plan_applied", "true");
    announce("Plan applied. Review results below.");
    onDone();
  });

  const results = el("div", { class: "exec-results" });
  function renderResult(rec: Recommendation, step: any, msg: string, warning: string | undefined, undoable: boolean) {
    const tone = step.executionStatus === "completed" ? "ok" : step.executionStatus === "partial" ? "warn" : "err";
    const row = el("div", { class: `exec-row exec-${tone}` }, [
      el("span", { class: "exec-icon", "aria-hidden": "true", html: tone === "ok" ? ICONS.check : tone === "warn" ? ICONS.info : ICONS.x }),
      el("div", { class: "exec-body" }, [
        el("div", { class: "exec-status" }, [step.executionStatus === "completed" ? "Completed" : step.executionStatus === "partial" ? "Partially done" : "Couldn't complete"]),
        el("p", {}, [msg]),
        warning ? el("p", { class: "exec-warn" }, [warning]) : null,
        undoable ? el("button", { class: "btn btn-ghost sm", type: "button", onClick: (ev: Event) => {
          step.executionStatus = "undone"; store.audit(`Undo: ${step.description}`, step.targetSystem, "undone", false);
          store.addFeedback({ subjectId: rec.id, kind: "undone", note: rec.domain });
          (ev.target as HTMLElement).closest(".exec-row")?.classList.add("undone-row");
          (ev.target as HTMLButtonElement).replaceWith(el("span", { class: "undone-tag" }, ["Undone"]));
          openUndoLearnSheet(rec, store);
          announce("Change undone.");
        } }, [el("span", { html: ICONS.undo, class: "ic" }), "Undo"]) : el("span", { class: "no-undo" }, ["Can't be undone"]),
      ]),
    ]);
    results.append(row);
  }

  const body = el("div", { class: "sheet-body" }, [
    el("div", { class: "preview-note" }, [
      el("span", { class: "ic", html: ICONS.shield }),
      el("p", {}, ["Nothing changes until you confirm. Medium- and high-risk steps each need an explicit tick."]),
    ]),
    list, results, el("div", { class: "sheet-actions" }, [runBtn]),
  ]);
  renderRows();
  openSheet({ title: "Preview plan changes", body });
}

export function openUndoLearnSheet(rec: Recommendation, store: Store) {
  const body = el("div", { class: "sheet-body" }, [
    el("p", { style: "margin-bottom:14px;" }, ["You undid this change. What should Buddy learn?"]),
    ...[
      { k: "always_ask" as const, label: "Always ask me first" },
      { k: "never_move_type" as const, label: "Never move this type of item" },
      { k: "one_time_exception" as const, label: "This was a one-time exception" },
    ].map((o) => el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
      store.addFeedback({ subjectId: rec.id, kind: o.k, note: rec.domain });
      toast("Got it — Buddy will remember that.");
      (document.querySelector(".sheet-scrim.open .sheet-close") as HTMLElement)?.click();
    } }, [o.label])),
    el("p", { class: "fineprint" }, ["This adjusts how Buddy suggests things. It never changes what Buddy is allowed to do — permissions live in Settings."]),
  ]);
  openSheet({ title: "Help Buddy learn", body });
}

export function openComparePlans(store: Store, onChoose: (choice: "recommended" | "alternative") => void) {
  const rows = comparePlans();
  let choice: "recommended" | "alternative" = store.data.planChoice;
  const table = el("div", { class: "cmp-table", role: "table", "aria-label": "Plan comparison" }, [
    el("div", { class: "cmp-head", role: "row" }, [
      el("span", { role: "columnheader" }, ["Metric"]),
      el("span", { role: "columnheader", class: "cmp-col" }, ["Recommended"]),
      el("span", { role: "columnheader", class: "cmp-col" }, ["Alternative"]),
    ]),
    ...rows.map((r) => el("div", { class: "cmp-row", role: "row" }, [
      el("span", { role: "cell", class: "cmp-metric" }, [r.metric]),
      el("span", { role: "cell", class: `cmp-col ${r.better === "recommended" ? "cmp-best" : ""}` }, [r.recommended]),
      el("span", { role: "cell", class: `cmp-col ${r.better === "alternative" ? "cmp-best" : ""}` }, [r.alternative]),
    ])),
  ]);
  const seg = el("div", { class: "seg", role: "radiogroup", "aria-label": "Choose a plan" });
  function renderSeg() {
    seg.replaceChildren(
      el("button", { class: `seg-btn${choice === "recommended" ? " active" : ""}`, role: "radio", "aria-checked": choice === "recommended", type: "button", onClick: () => { choice = "recommended"; renderSeg(); } }, ["Recommended"]),
      el("button", { class: `seg-btn${choice === "alternative" ? " active" : ""}`, role: "radio", "aria-checked": choice === "alternative", type: "button", onClick: () => { choice = "alternative"; renderSeg(); } }, ["Alternative"]),
    );
  }
  renderSeg();
  const body = el("div", { class: "sheet-body" }, [
    seg, table,
    el("p", { class: "fineprint" }, [COMPARISON_CAVEAT]),
    el("div", { class: "sheet-actions" }, [
      el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
        store.data.planChoice = choice; store.save(); store.audit("Selected plan", choice, "chosen", true);
        onChoose(choice);
        (document.querySelector(".sheet-scrim.open .sheet-close") as HTMLElement)?.click();
        toast(`Using the ${choice} plan.`);
      } }, ["Use this plan"]),
    ]),
  ]);
  openSheet({ title: "Compare plans", body });
}

export function openConflictSheet(c: Conflict, store: Store, onResolved: () => void) {
  const anyStale = c.sources.some((id) => store.data.staleOverrides[id] ?? DATA_SOURCES.find((s) => s.id === id)?.stale);
  const conf = anyStale && c.confidence === "high" ? "medium" : c.confidence;
  const cm = CONF_META[conf];
  let picked: "A" | "B" = c.chosen ?? "A";

  function optionCard(o: ResolutionOption): HTMLElement {
    const isRec = o.id === "A";
    return el("button", {
      class: `res-card${picked === o.id ? " picked" : ""}`, type: "button", role: "radio", "aria-checked": picked === o.id,
      onClick: () => { picked = o.id; render(); },
    }, [
      el("div", { class: "res-top" }, [
        el("span", { class: "res-tag" }, [isRec ? "Recommended" : "Alternative"]),
        el("span", { class: `risk-pill risk-${o.riskLevel}` }, [riskLabel(o.riskLevel)]),
      ]),
      el("div", { class: "res-label" }, [o.label]),
      el("div", { class: "res-impact" }, [el("span", { class: "meta-k" }, ["Impact"]), " ", o.impact]),
      el("div", { class: "res-impact" }, [el("span", { class: "meta-k" }, ["Trade-off"]), " ", o.tradeoff]),
      o.permissionRequired ? el("div", { class: "res-perm" }, [`Needs "${o.permissionRequired}"${hasPermission(o.permissionRequired) ? " — granted" : " — not granted"}`]) : null,
    ]);
  }

  const wrap = el("div", {});
  function render() {
    const chosen = picked === "A" ? c.recommended : c.alternative;
    const needsConfirm = chosen.riskLevel !== "low" || !hasPermission(chosen.permissionRequired);
    wrap.replaceChildren(
      el("div", { class: "info-block" }, [
        el("div", { class: "conf-row" }, [
          el("span", { class: `sev-pill sev-${c.severity}` }, [c.severity[0].toUpperCase() + c.severity.slice(1) + " severity"]),
          el("span", { class: "conf-badge sm", style: `background:${cm.bg}; color:${cm.color};` }, [cm.label]),
        ]),
        el("p", { style: "margin-top:10px;" }, [c.description]),
      ]),
      el("div", { class: "meta-grid" }, [
        el("div", {}, [el("span", { class: "meta-k" }, ["Domains"]), el("span", { class: "meta-v" }, [c.domains.join(" & ")])]),
        el("div", {}, [el("span", { class: "meta-k" }, ["People affected"]), el("span", { class: "meta-v" }, [c.peopleAffected.length ? c.peopleAffected.join(", ") : "Just you"])]),
      ]),
      el("div", { class: "info-block" }, [
        el("div", { class: "info-label" }, ["Data sources"]),
        el("div", { class: "chip-row" }, c.sources.map((s) => sourceChip(s, store))),
      ]),
      el("div", { class: "res-grid", role: "radiogroup", "aria-label": "Resolution options" }, [optionCard(c.recommended), optionCard(c.alternative)]),
      el("div", { class: "sheet-actions col" }, [
        el("button", { class: "btn btn-primary full", type: "button", onClick: () => resolve(needsConfirm) }, [needsConfirm ? "Review & confirm resolution" : "Apply resolution"]),
        el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { c.status = "deferred"; store.audit("Deferred conflict", c.title, "deferred", true); onResolved(); (document.querySelector(".sheet-scrim.open .sheet-close") as HTMLElement)?.click(); toast("Decide later — Buddy will keep an eye on it."); } }, ["Decide later"]),
      ]),
      el("p", { class: "fineprint" }, ["Nothing changes until you confirm."]),
    );
  }

  async function resolve(needsConfirm: boolean) {
    const chosen = picked === "A" ? c.recommended : c.alternative;
    const proceed = () => runResolution(chosen);
    if (needsConfirm) {
      const permBlocked = !hasPermission(chosen.permissionRequired);
      const confirmBody = el("div", { class: "sheet-body" }, [
        el("div", { class: "preview-row risk-" + chosen.riskLevel }, [
          el("div", { class: "preview-main" }, [
            el("div", { class: "preview-title" }, [chosen.label]),
            el("div", { class: "preview-meta" }, [
              el("span", { class: `risk-pill risk-${chosen.riskLevel}` }, [riskLabel(chosen.riskLevel)]),
              ...chosen.steps.map((s) => el("span", { class: "sys-pill" }, [s.targetSystem])),
            ]),
            ...chosen.steps.map((s) => el("p", { class: "preview-effect" }, [s.preview])),
          ]),
        ]),
        permBlocked
          ? el("p", { class: "warn-block" }, [`This needs the "${chosen.permissionRequired}" permission, which isn't granted. Grant it in Settings — Buddy won't act without it.`])
          : el("button", { class: "btn btn-primary full", type: "button", onClick: () => { (document.querySelectorAll(".sheet-scrim.open .sheet-close")[1] as HTMLElement)?.click(); proceed(); } }, [`Confirm this ${chosen.riskLevel}-risk action`]),
        el("p", { class: "fineprint" }, ["Exact effect shown above. This is your explicit go-ahead."]),
      ]);
      openSheet({ title: "Confirm resolution", body: confirmBody });
    } else {
      proceed();
    }
  }

  async function runResolution(chosen: ResolutionOption) {
    c.chosen = chosen.id; c.status = "resolved";
    for (const s of chosen.steps) {
      const res = await simulateStep(s, staleSystems(store));
      store.audit(s.description, s.targetSystem, res.status, res.undoAvailable);
    }
    store.audit("Resolved conflict", c.title, chosen.label, true);
    onResolved();
    document.querySelectorAll<HTMLElement>(".sheet-scrim.open .sheet-close").forEach((b) => b.click());
    toast("Conflict resolved.");
    openConflictFeedback(c, store);
  }

  render();
  const body = el("div", { class: "sheet-body" }, [wrap]);
  openSheet({ title: c.title, body });
}

function openConflictFeedback(c: Conflict, store: Store) {
  const body = el("div", { class: "sheet-body" }, [
    el("p", { style: "margin-bottom:14px;" }, ["Was this the right call?"]),
    ...[
      { k: "helpful" as const, label: "Yes, good catch" },
      { k: "not_helpful" as const, label: "Not really" },
      { k: "wrong_time" as const, label: "Flagged too late" },
    ].map((o) => el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
      store.addFeedback({ subjectId: c.id, kind: o.k, note: c.domains[0] });
      toast("Thanks — that tunes Buddy's timing, not its permissions.");
      (document.querySelector(".sheet-scrim.open .sheet-close") as HTMLElement)?.click();
    } }, [o.label])),
  ]);
  openSheet({ title: "Quick feedback", body });
}

export function openPriorityActions(item: PriorityItem, store: Store, onChange: () => void) {
  const actions: { label: string; run: () => void }[] = [
    { label: "Move up", run: () => { store.data.manualOrder[item.refId] = (store.data.manualOrder[item.refId] ?? item.score) + 1; store.addFeedback({ subjectId: item.refId, kind: "rank_up", note: item.domain }); store.save(); } },
    { label: "Move down", run: () => { store.data.manualOrder[item.refId] = (store.data.manualOrder[item.refId] ?? item.score) - 1; store.addFeedback({ subjectId: item.refId, kind: "rank_down", note: item.domain }); store.save(); } },
    { label: "Not important to me", run: () => { store.addFeedback({ subjectId: item.refId, kind: "not_important", note: item.domain }); store.data.recStatuses[item.refId] = "rejected"; store.save(); } },
    { label: "Snooze for 2 hours", run: () => { store.data.snoozed.push(item.refId); store.save(); } },
    { label: "Mark complete", run: () => { store.data.recStatuses[item.refId] = "done"; store.addFeedback({ subjectId: item.refId, kind: "accepted", note: item.domain }); store.save(); } },
  ];
  if (item.buddyCanHandle) actions.splice(2, 0, { label: "Delegate to Buddy", run: () => { store.data.recStatuses[item.refId] = "accepted"; store.save(); } });

  const body = el("div", { class: "sheet-body" }, [
    el("p", { class: "muted", style: "margin-bottom:14px;" }, [item.explanation]),
    ...actions.map((a) => el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
      a.run(); onChange();
      (document.querySelector(".sheet-scrim.open .sheet-close") as HTMLElement)?.click();
      toast("Updated — recalculating your plan.");
    } }, [a.label])),
    el("p", { class: "fineprint" }, ["Changing priority updates your plan and teaches Buddy your preferences. It never changes permissions."]),
  ]);
  openSheet({ title: item.title, body });
}
