import { fmtMins } from "../mock.js";
import { buildRecommendations, buildSummary, CATEGORY_LABELS } from "../engines/planner.js";
import { detectConflicts } from "../engines/conflicts.js";
import { rankPriorities, TIER_META } from "../engines/ranking.js";
import { ALL_MODES, MODE_CONFIG, currentContext, selectMode } from "../engines/modes.js";
import { Store } from "../store.js";
import { announce, clear, el, openSheet, toast } from "./dom.js";
import { DOMAIN_META, ICONS } from "./icons.js";
import { openComparePlans, openConflictSheet, openPlanPreview, openPriorityActions, openSourceSheet, openWhySheet, setSheetDataSources, } from "./sheets.js";
const BLUE = "#2F6BFF";
export class HomeApp {
    store = new Store();
    root;
    ctx;
    recs = [];
    conflicts;
    constructor(root, ctx) {
        this.root = root;
        this.ctx = ctx;
        setSheetDataSources(ctx.dataSources);
        this.conflicts = detectConflicts(ctx);
        this.recs = buildRecommendations(ctx);
        this.applyStatuses();
        this.render();
    }
    applyStatuses() {
        for (const r of this.recs) {
            const s = this.store.data.recStatuses[r.id];
            if (s)
                r.status = s;
        }
    }
    activeMode() {
        if (this.store.data.mode === "auto") {
            const sel = selectMode(currentContext(this.ctx.signals));
            return { ...sel, auto: true };
        }
        const m = this.store.data.mode;
        return { mode: m, reason: MODE_CONFIG[m].reasonHint, auto: false };
    }
    planState() {
        return { edits: this.store.data.planEdits, statuses: this.store.data.recStatuses, choice: this.store.data.planChoice };
    }
    openConflicts() {
        return this.conflicts.filter((c) => c.status === "open");
    }
    render() {
        clear(this.root);
        const { mode, reason, auto } = this.activeMode();
        const cfg = MODE_CONFIG[mode];
        this.root.classList.toggle("reduced-motion", cfg.reducedMotion);
        this.root.append(this.greeting(), this.askBar(), this.modeBar(mode, reason, auto), this.dailyPlan(mode), this.priorities(), this.conflictsSection(), this.footerControls());
    }
    greeting() {
        const h = new Date().getHours();
        const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
        return el("header", { class: "hp-head" }, [
            el("div", { class: "hp-brand" }, [
                el("div", { class: "hp-logo", "aria-hidden": "true", html: ICONS.spark }),
                el("span", { class: "hp-brandname" }, ["Buddy"]),
                el("button", { class: "hp-bell", "aria-label": "Notifications", html: ICONS.bell }),
            ]),
            el("h1", { class: "hp-greet" }, [`${g}, Anupam `, el("span", { "aria-hidden": "true" }, ["👋"])]),
            el("p", { class: "hp-sub" }, ["Here's your day, organised. Nothing acts on its own — you're in control."]),
        ]);
    }
    askBar() {
        return el("button", { class: "ask-bar", type: "button", onClick: () => toast("Ask Buddy is a demo entry point in this prototype.") }, [
            el("span", { class: "ask-ic", html: ICONS.chat }),
            el("span", { class: "ask-text" }, ["Ask Buddy anything…"]),
        ]);
    }
    modeBar(mode, reason, auto) {
        const chips = ALL_MODES.map((m) => el("button", {
            class: `mode-chip${m === mode ? " active" : ""}`, type: "button", role: "radio", "aria-checked": m === mode,
            onClick: () => { this.store.setMode(m); announce(`Home mode: ${MODE_CONFIG[m].label}`); this.render(); },
        }, [MODE_CONFIG[m].label]));
        return el("section", { class: "mode-bar", "aria-label": "Home mode" }, [
            el("div", { class: "mode-top" }, [
                el("div", {}, [
                    el("span", { class: "mode-active" }, [`${MODE_CONFIG[mode].label} mode`]),
                    auto ? el("span", { class: "mode-auto" }, ["Auto"]) : null,
                ]),
                auto
                    ? el("button", { class: "mode-link", type: "button", onClick: () => { this.store.setMode(mode); this.render(); } }, ["Keep this layout"])
                    : el("button", { class: "mode-link", type: "button", onClick: () => { this.store.setMode("auto"); this.render(); } }, ["Back to automatic"]),
            ]),
            el("p", { class: "mode-reason" }, [reason]),
            el("div", { class: "mode-chips", role: "radiogroup", "aria-label": "Switch mode" }, chips),
        ]);
    }
    dailyPlan(mode) {
        const summary = buildSummary(this.ctx, this.recs, this.openConflicts().length, this.planState());
        const cfg = MODE_CONFIG[mode];
        const stats = [
            ["Meetings", `${summary.meetings}`, `${summary.activeMeetings} need you`],
            ["Critical tasks", `${summary.criticalTasks}`, "due today"],
            ["Conflicts", `${summary.conflicts}`, summary.conflicts ? "to resolve" : "all clear"],
            ["Focus time", fmtMins(summary.focusMins), "protected"],
            ["Personal", `${summary.personalCommitments}`, "commitments"],
            ["Time saved", `~${summary.estTimeSavedMins}m`, "if you accept"],
        ];
        // group recommendations by category, ordered/filtered per mode
        const visible = this.recs
            .filter((r) => r.status === "suggested" || r.status === "accepted")
            .filter((r) => !this.store.data.planEdits[r.id]?.disabled)
            .filter((r) => !cfg.hidden.includes(r.category));
        const byCat = cfg.order
            .map((cat) => ({ cat, items: visible.filter((r) => r.category === cat) }))
            .filter((g) => g.items.length > 0);
        const capped = cfg.maxCards ? this.capForStress(byCat, cfg.maxCards) : byCat;
        const groups = capped.map(({ cat, items }) => el("div", { class: "plan-group" }, [
            el("div", { class: "plan-cat" }, [CATEGORY_LABELS[cat]]),
            ...items.map((r) => this.recCard(r)),
        ]));
        return el("section", { class: "card plan-card", "aria-label": "Daily Operating Plan" }, [
            el("div", { class: "plan-head" }, [
                el("div", {}, [
                    el("div", { class: "plan-kicker" }, [el("span", { class: "ic", html: ICONS.spark }), "Daily Operating Plan"]),
                    el("div", { class: "plan-updated" }, [`Updated ${summary.updatedAt} · ${cfg.summaryTone}`]),
                ]),
            ]),
            el("p", { class: "plan-narrative" }, [summary.narrative]),
            el("div", { class: "plan-stats" }, stats.map(([k, v, s]) => el("div", { class: "pstat" }, [
                el("div", { class: "pstat-v" }, [v]), el("div", { class: "pstat-k" }, [k]), el("div", { class: "pstat-s" }, [s]),
            ]))),
            el("div", { class: "plan-actions" }, [
                el("button", { class: "btn btn-primary", type: "button", onClick: () => this.acceptEntirePlan() }, ["Accept entire plan"]),
                el("button", { class: "btn btn-tonal", type: "button", onClick: () => openComparePlans(this.store, () => this.render()) }, ["Compare alternative"]),
                el("button", { class: "btn btn-ghost", type: "button", onClick: () => this.editPlan() }, ["Edit plan"]),
            ]),
            ...groups,
            capped.length === 0 ? el("p", { class: "empty" }, ["Everything here is handled. Nice."]) : null,
        ]);
    }
    capForStress(groups, max) {
        const out = [];
        let count = 0;
        for (const g of groups) {
            if (count >= max)
                break;
            const room = max - count;
            const items = g.items.slice(0, room);
            out.push({ cat: g.cat, items });
            count += items.length;
        }
        return out;
    }
    recCard(r) {
        const dm = DOMAIN_META[r.domain];
        const handling = this.store.data.planEdits[r.id]?.handling ?? (r.buddyCanHandle ? "buddy" : "remind");
        const time = this.store.data.planEdits[r.id]?.time ?? r.defaultTime;
        const highRisk = r.steps.some((s) => s.riskLevel === "high");
        return el("article", { class: "rec-card" }, [
            el("div", { class: "rec-icon", style: `background:${dm.bg}; color:${dm.color};`, html: dm.icon }),
            el("div", { class: "rec-main" }, [
                el("div", { class: "rec-title" }, [r.title]),
                el("div", { class: "rec-summary" }, [r.summary]),
                el("div", { class: "rec-meta" }, [
                    time ? el("span", { class: "rec-chip" }, [el("span", { class: "ic", html: ICONS.clock }), time]) : null,
                    el("span", { class: "rec-chip" }, [handling === "buddy" ? "Buddy handles" : "Remind me"]),
                    highRisk ? el("span", { class: "rec-chip danger" }, ["Needs your OK"]) : null,
                ]),
                el("div", { class: "rec-actions" }, [
                    el("button", { class: "chip-btn primary", type: "button", onClick: () => this.acceptItem(r) }, ["Accept"]),
                    el("button", { class: "chip-btn", type: "button", onClick: () => openWhySheet(r, this.store) }, ["Why now?"]),
                    r.alternative ? el("button", { class: "chip-btn", type: "button", onClick: () => this.compareItem(r) }, ["Compare"]) : null,
                    el("button", { class: "chip-btn ghost", type: "button", "aria-label": `Reject ${r.title}`, onClick: () => this.rejectItem(r) }, ["Reject"]),
                ]),
            ]),
        ]);
    }
    priorities() {
        const items = rankPriorities({
            recommendations: this.recs, conflicts: this.conflicts, prefs: this.store.data.prefs, manualOrder: this.store.data.manualOrder,
        }).filter((i) => !this.store.data.snoozed.includes(i.refId) && this.store.data.recStatuses[i.refId] !== "rejected" && this.store.data.recStatuses[i.refId] !== "done");
        const rows = items.map((i) => {
            const tm = TIER_META[i.tier];
            const dm = DOMAIN_META[i.domain];
            return el("article", { class: "pri-row" }, [
                el("div", { class: "pri-rail", style: `background:${tm.color};`, "aria-hidden": "true" }),
                el("div", { class: "pri-body" }, [
                    el("div", { class: "pri-top" }, [
                        el("span", { class: "tier-pill", style: `background:${tm.bg}; color:${tm.color};` }, [tm.label]),
                        el("span", { class: "pri-domain" }, [dm.label]),
                    ]),
                    el("div", { class: "pri-title" }, [i.title]),
                    el("div", { class: "pri-why" }, [i.explanation]),
                ]),
                el("button", { class: "pri-more", type: "button", "aria-label": `Actions for ${i.title}`, html: ICONS.sliders, onClick: () => openPriorityActions(i, this.store, () => this.render()) }),
            ]);
        });
        return el("section", { class: "card list-card", "aria-label": "What's important" }, [
            el("div", { class: "sec-head" }, [
                el("h2", {}, ["What's important"]),
                el("span", { class: "sec-note" }, ["AI-ranked · tap ", el("span", { class: "ic", html: ICONS.sliders }), " to adjust"]),
            ]),
            ...(rows.length ? rows : [el("p", { class: "empty" }, ["Nothing pressing right now."])]),
        ]);
    }
    conflictsSection() {
        const open = this.openConflicts();
        const deferred = this.conflicts.filter((c) => c.status === "deferred");
        const resolved = this.conflicts.filter((c) => c.status === "resolved");
        const rows = open.map((c) => el("article", { class: `conf-row sev-${c.severity}` }, [
            el("div", { class: "conf-icon", "aria-hidden": "true", html: ICONS.bolt }),
            el("div", { class: "conf-body" }, [
                el("div", { class: "conf-top" }, [
                    el("span", { class: `sev-pill sev-${c.severity}` }, [c.severity[0].toUpperCase() + c.severity.slice(1)]),
                    el("span", { class: "conf-domains" }, [c.domains.join(" · ")]),
                ]),
                el("div", { class: "conf-title" }, [c.title]),
                el("p", { class: "conf-desc" }, [c.description]),
                el("div", { class: "conf-actions" }, [
                    el("button", { class: "chip-btn primary", type: "button", onClick: () => openConflictSheet(c, this.store, () => this.render()) }, ["Resolve now"]),
                    el("button", { class: "chip-btn", type: "button", onClick: () => { c.status = "deferred"; this.store.audit("Deferred conflict", c.title, "deferred", true); this.render(); toast("Decide later."); } }, ["Decide later"]),
                ]),
            ]),
        ]));
        return el("section", { class: "card list-card", "aria-label": "Conflicts" }, [
            el("div", { class: "sec-head" }, [
                el("h2", {}, ["Conflicts Buddy found"]),
                el("span", { class: "sec-note" }, [`${open.length} open`]),
            ]),
            ...(rows.length ? rows : [el("p", { class: "empty" }, ["No conflicts right now. Buddy keeps watching."])]),
            deferred.length ? el("p", { class: "deferred-note" }, [`${deferred.length} deferred · Buddy will remind you.`]) : null,
            resolved.length ? el("p", { class: "resolved-note" }, [`${resolved.length} resolved today.`]) : null,
        ]);
    }
    footerControls() {
        return el("section", { class: "foot-controls" }, [
            el("button", { class: "btn btn-ghost sm", type: "button", onClick: () => this.openAudit() }, ["View activity log"]),
            el("button", { class: "btn btn-ghost sm", type: "button", onClick: () => this.openDataSources() }, ["Data sources"]),
            el("button", { class: "btn btn-ghost sm danger", type: "button", onClick: () => this.resetDemo() }, ["Reset demo"]),
        ]);
    }
    // ---- flows ----
    acceptEntirePlan() {
        const active = this.recs.filter((r) => (r.status === "suggested" || r.status === "accepted") && !this.store.data.planEdits[r.id]?.disabled);
        if (active.length === 0) {
            toast("Nothing to apply.");
            return;
        }
        openPlanPreview(active, this.store, () => { this.afterExecution(); });
    }
    acceptItem(r) {
        r.status = "accepted";
        this.store.setStatus(r.id, "accepted");
        this.store.addFeedback({ subjectId: r.id, kind: "accepted", note: r.domain });
        openPlanPreview([r], this.store, () => this.afterExecution());
    }
    rejectItem(r) {
        r.status = "rejected";
        this.store.setStatus(r.id, "rejected");
        this.store.addFeedback({ subjectId: r.id, kind: "rejected", note: r.domain });
        this.store.audit("Rejected recommendation", r.title, "rejected", false);
        announce(`Rejected: ${r.title}`);
        this.render();
        toast("Removed from your plan.");
    }
    compareItem(r) {
        if (!r.alternative)
            return;
        const body = el("div", { class: "sheet-body" }, [
            el("div", { class: "cmp2" }, [
                el("div", { class: "cmp2-col best" }, [
                    el("div", { class: "cmp2-tag" }, ["Recommended"]),
                    el("div", { class: "cmp2-title" }, [r.title]),
                    el("p", {}, [r.summary]),
                ]),
                el("div", { class: "cmp2-col" }, [
                    el("div", { class: "cmp2-tag" }, ["Alternative"]),
                    el("div", { class: "cmp2-title" }, [r.alternative.label]),
                    el("p", {}, [r.alternative.tradeoff]),
                ]),
            ]),
            el("p", { class: "fineprint" }, ["Estimates, not guarantees."]),
        ]);
        openSheet({ title: "Compare this item", body });
    }
    afterExecution() {
        this.render();
        // contextual outcome feedback after a plan runs
        setTimeout(() => {
            const body = el("div", { class: "sheet-body" }, [
                el("p", { style: "margin-bottom:14px;" }, ["Was protecting this focus block helpful?"]),
                ...[
                    { k: "helpful", label: "Yes" },
                    { k: "not_helpful", label: "Not really" },
                    { k: "wrong_time", label: "Wrong time" },
                ].map((o) => el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
                        this.store.addFeedback({ subjectId: "rec-focus", kind: o.k, note: "work" });
                        toast("Thanks — that shapes future suggestions, not permissions.");
                        document.querySelector(".sheet-scrim.open .sheet-close")?.click();
                    } }, [o.label])),
                el("p", { class: "fineprint" }, ["Your feedback tunes ranking and timing only."]),
            ]);
            openSheet({ title: "How did that go?", body });
        }, 400);
    }
    editPlan() {
        const editable = this.recs.filter((r) => r.status === "suggested" || r.status === "accepted");
        const listWrap = el("div", { class: "edit-list" });
        const rebuild = () => listWrap.replaceChildren(...editable.map((r) => {
            const e = this.store.data.planEdits[r.id] ?? {};
            const handling = e.handling ?? (r.buddyCanHandle ? "buddy" : "remind");
            return el("div", { class: `edit-row${e.disabled ? " disabled" : ""}` }, [
                el("div", { class: "edit-main" }, [
                    el("div", { class: "edit-title" }, [r.title]),
                    el("div", { class: "edit-controls" }, [
                        el("label", { class: "edit-field" }, ["Time ", el("input", { type: "text", value: e.time ?? r.defaultTime ?? "", "aria-label": `Time for ${r.title}`, onChange: (ev) => { this.store.data.planEdits[r.id] = { ...e, time: ev.target.value }; this.store.save(); } })]),
                        r.buddyCanHandle ? el("button", { class: "toggle", type: "button", "aria-pressed": handling === "buddy", onClick: () => { this.store.data.planEdits[r.id] = { ...e, handling: handling === "buddy" ? "remind" : "buddy" }; this.store.save(); rebuild(); } }, [handling === "buddy" ? "Buddy handles" : "Remind me"]) : el("span", { class: "muted sm" }, ["Remind me"]),
                    ]),
                    el("input", { type: "text", class: "edit-instruction", placeholder: "Add an instruction for Buddy…", value: e.instruction ?? "", "aria-label": `Instruction for ${r.title}`, onChange: (ev) => { this.store.data.planEdits[r.id] = { ...e, instruction: ev.target.value }; this.store.save(); } }),
                ]),
                el("div", { class: "edit-side" }, [
                    el("button", { class: "toggle sm", type: "button", "aria-pressed": !e.disabled, onClick: () => { this.store.data.planEdits[r.id] = { ...e, disabled: !e.disabled }; this.store.save(); rebuild(); } }, [e.disabled ? "Off" : "On"]),
                ]),
            ]);
        }));
        rebuild();
        const body = el("div", { class: "sheet-body" }, [
            el("p", { class: "muted", style: "margin-bottom:12px;" }, ["Turn items on/off, change times, switch who handles them, or add an instruction."]),
            listWrap,
            el("div", { class: "sheet-actions col" }, [
                el("button", { class: "btn btn-primary full", type: "button", onClick: () => { this.render(); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); toast("Plan updated."); } }, ["Save changes"]),
                el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { for (const r of editable)
                        delete this.store.data.planEdits[r.id]; this.store.save(); rebuild(); toast("Restored Buddy's recommendations."); } }, ["Restore Buddy's plan"]),
            ]),
        ]);
        openSheet({ title: "Edit plan", body });
    }
    openAudit() {
        const items = this.store.data.audit;
        const body = el("div", { class: "sheet-body" }, [
            items.length === 0 ? el("p", { class: "empty" }, ["No activity yet."]) :
                el("div", { class: "audit-list" }, items.map((a) => el("div", { class: "audit-row" }, [
                    el("div", { class: `audit-dot audit-${a.outcome}`, "aria-hidden": "true" }),
                    el("div", {}, [
                        el("div", { class: "audit-action" }, [a.action]),
                        el("div", { class: "audit-meta" }, [`${a.target} · ${a.outcome} · ${new Date(a.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`]),
                    ]),
                ]))),
        ]);
        openSheet({ title: "Activity log", body });
    }
    openDataSources() {
        const body = el("div", { class: "sheet-body" }, [
            el("p", { class: "muted", style: "margin-bottom:12px;" }, ["Toggle a source to 'stale' to see how Buddy lowers its confidence and warns you."]),
            el("div", { class: "src-list" }, [
                "calendar", "jira", "teams", "email", "maps", "health", "bank", "prefs",
            ].map((id) => {
                const stale = this.store.data.staleOverrides[id] ?? (id === "health");
                return el("div", { class: "src-row" }, [
                    el("button", { class: "src-name", type: "button", onClick: () => openSourceSheet(id, this.store) }, [id[0].toUpperCase() + id.slice(1)]),
                    el("button", { class: `toggle sm${stale ? " warn" : ""}`, type: "button", "aria-pressed": stale, "aria-label": `${id} data ${stale ? "stale" : "fresh"}`, onClick: () => { this.store.toggleStale(id, !stale); this.render(); toast(stale ? "Marked fresh." : "Marked stale — confidence will drop where used."); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); } }, [stale ? "Stale" : "Fresh"]),
                ]);
            })),
        ]);
        openSheet({ title: "Data sources", body });
    }
    resetDemo() {
        const body = el("div", { class: "sheet-body" }, [
            el("p", { style: "margin-bottom:16px;" }, ["Reset all prototype state — mode, plan edits, feedback, snoozes and the activity log?"]),
            el("div", { class: "sheet-actions col" }, [
                el("button", { class: "btn btn-primary full danger", type: "button", onClick: () => { this.store.reset(); this.recs = buildRecommendations(this.ctx); this.conflicts = detectConflicts(this.ctx); this.render(); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); toast("Demo reset."); } }, ["Reset everything"]),
                el("button", { class: "btn btn-ghost full", type: "button", onClick: () => document.querySelector(".sheet-scrim.open .sheet-close")?.click() }, ["Cancel"]),
            ]),
        ]);
        openSheet({ title: "Reset demo", body });
    }
}
