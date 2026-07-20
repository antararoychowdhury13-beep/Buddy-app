/** Ask Buddy flow overlays: consent → meeting companion → processing → MOM
 * workspace (+ recipient versions) → plan-before-action (+ previews +
 * approval) → execution timeline (+ Priya recovery) → completion evidence →
 * follow-up monitoring → workflow builder → activity/audit. */
import { el, openSheet, toast, announce } from "../ui/dom.js";
import { ICONS } from "../ui/icons.js";
import { ACTION_ITEMS, CONSENT, MEETING, PALETTE, PARTICIPANTS, USER, buildMom, } from "./mock.js";
import { GRANTED, runnerFor } from "./services.js";
const CONF_META = {
    high: { label: "High confidence", color: PALETTE.green },
    review_suggested: { label: "Review suggested", color: PALETTE.amber },
    needs_confirmation: { label: "Needs confirmation", color: PALETTE.red },
    conflicting: { label: "Conflicting", color: PALETTE.red },
};
function confChip(k) {
    const m = CONF_META[k] ?? CONF_META.high;
    return el("span", { class: "conf-chip", style: `color:${m.color}; background:${m.color}1a;` }, [el("span", { class: "dot", style: `background:${m.color};` }), m.label]);
}
function closeTop() { const scrims = document.querySelectorAll(".sheet-scrim"); scrims[scrims.length - 1]?.querySelector(".sheet-close")?.click(); }
function closeAll() { document.querySelectorAll(".sheet-scrim .sheet-close").forEach((b) => b.click()); }
// ============ CONSENT ============
export function openConsent(store, rerender, onMomReady) {
    store.meetingTo("consent_pending");
    const c = CONSENT;
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "consent-lead" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["Nothing is captured until you choose a path below. External guests are notified, not recorded individually."])]),
        infoBlock("Purpose", el("p", {}, [c.purpose])),
        infoBlock("What's captured", el("ul", { class: "bullet" }, c.captured.map((x) => el("li", {}, [x])))),
        infoBlock("Participants & consent", el("div", { class: "consent-people" }, PARTICIPANTS.map((p) => el("div", { class: "consent-person" }, [
            el("span", { class: "avatar sm", style: `background:${p.color};` }, [p.initials]),
            el("div", { style: "flex:1;min-width:0;" }, [el("div", { class: "cp-name" }, [p.name]), el("div", { class: "cp-role" }, [`${p.org === "external" ? "External" : "Internal"} · ${p.role}`])]),
            el("span", { class: `consent-tag ${p.consent}` }, [p.consent === "consented" ? "Consented" : p.consent === "pending" ? "Pending" : p.consent === "not_required" ? "Notified" : "Declined"]),
        ])))),
        infoBlock("Access scope", el("p", {}, [c.accessScope])),
        infoBlock("Retention", el("p", {}, [`Recording & transcript kept for ${c.retentionDays} days, then deleted.`])),
        infoBlock("Organisation policy", el("p", { class: "muted" }, [c.orgPolicy])),
        infoBlock("Alternatives", el("ul", { class: "bullet" }, c.alternatives.map((a) => el("li", {}, [a])))),
        el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => choose("record") }, ["I have consent — start recording"]),
            el("button", { class: "btn btn-tonal full", type: "button", onClick: () => choose("notes_only") }, ["Notes only (no audio kept)"]),
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { closeTop(); toast("Capture declined — nothing recorded."); store.meetingTo("upcoming"); rerender(); } }, ["Decline"]),
        ]),
        el("p", { class: "fineprint" }, ["Simulated capture — no real audio is recorded in this demo."]),
    ]);
    function choose(path) {
        store.data.consentPath = path;
        store.save();
        store.audit("Consent chosen", path === "record" ? "Recording with consent" : "Notes only");
        closeTop();
        openCompanion(store, rerender, onMomReady, path);
    }
    openSheet({ title: "Before Buddy captures this meeting", body });
}
// ============ LIVE MEETING COMPANION ============
export function openCompanion(store, rerender, onMomReady, path) {
    store.meetingTo(path === "record" ? "recording" : "ready");
    let seconds = 0;
    let paused = false;
    let offRecord = false;
    const timer = el("span", { class: "rec-timer" }, ["00:00"]);
    const stateLabel = el("span", { class: "rec-state" }, [path === "record" ? "Recording" : "Notes only"]);
    const interval = window.setInterval(() => { if (!paused) {
        seconds++;
        timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    } }, 1000);
    const liveDecisions = el("ul", { class: "bullet" }, [el("li", {}, ["Beta launch → 28 August (corrected from 18 Aug)"]), el("li", {}, ["Accessibility testing before stakeholder review"])]);
    const liveActions = el("ul", { class: "bullet" }, [el("li", {}, ["Ananya — revise onboarding flow (24 Jul)"]), el("li", {}, ["Rahul — confirm API readiness (28 Jul)"])]);
    const ctrl = (label, onClick, cls = "chip-btn") => el("button", { class: cls, type: "button", onClick }, [label]);
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: `rec-bar${path === "record" ? " live" : ""}` }, [
            path === "record" ? el("span", { class: "rec-dot", "aria-hidden": "true" }) : el("span", { class: "ic", html: ICONS.doc }),
            stateLabel, timer,
            el("span", { class: "consent-tag consented", style: "margin-left:auto;" }, ["Consent ✓"]),
        ]),
        infoBlock("Active speaker", el("div", { class: "speaker" }, [el("span", { class: "avatar sm", style: `background:${PALETTE.blue};` }, ["RM"]), el("span", {}, ["Rahul Mehta"]), el("button", { class: "chip-btn", type: "button", style: "margin-left:auto;", onClick: () => toast("Correct speaker (simulated).") }, ["Correct"])])),
        infoBlock("Decisions so far", liveDecisions),
        infoBlock("Proposed actions", liveActions),
        infoBlock("Open questions", el("ul", { class: "bullet" }, [el("li", {}, ["Who owns the final security review?"])])),
        el("div", { class: "companion-ctrls" }, [
            ctrl("Mark important", () => toast("Moment marked ✓")),
            ctrl("Add note", () => toast("Note added ✓")),
            ctrl("Correct speaker", () => toast("Speaker corrected ✓")),
            ctrl(offRecord ? "Back on record" : "Off record", () => { offRecord = !offRecord; stateLabel.textContent = offRecord ? "Off the record" : (path === "record" ? "Recording" : "Notes only"); toast(offRecord ? "Off the record — not captured." : "Back on record."); }),
        ]),
        el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { paused = !paused; toast(paused ? "Paused." : "Resumed."); } }, ["Pause / Resume"]),
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => { clearInterval(interval); store.meetingTo("processing"); closeTop(); openProcessing(store, rerender, onMomReady); } }, ["End meeting"]),
        ]),
        el("p", { class: "fineprint" }, ["Deterministic simulated meeting — no real microphone or Teams connection."]),
    ]);
    openSheet({ title: "Meeting companion", body });
}
// ============ PROCESSING ============
export function openProcessing(store, rerender, onMomReady) {
    const steps = ["Processing transcript", "Identifying speakers", "Extracting decisions", "Detecting action items", "Checking project context", "Generating MOM"];
    let idx = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const list = el("div", { class: "proc-list" });
    function render() {
        list.replaceChildren(...steps.map((s, i) => el("div", { class: `proc-row ${i < idx ? "done" : i === idx ? "active" : ""}` }, [
            el("span", { class: "proc-ic", html: i < idx ? ICONS.check : i === idx ? ICONS.spark : "" }),
            el("span", {}, [s]),
        ])));
    }
    render();
    const body = el("div", { class: "sheet-body" }, [
        el("p", { class: "muted", style: "margin-bottom:14px;" }, ["Buddy is turning the meeting into a structured MOM. You can leave — I'll notify you when it's ready."]),
        list,
        el("button", { class: "btn btn-ghost full", type: "button", style: "margin-top:14px;", onClick: () => { closeTop(); toast("Processing continues in the background."); } }, ["Leave — notify me when ready"]),
    ]);
    openSheet({ title: "Processing meeting", body });
    const advance = () => {
        idx++;
        render();
        if (idx >= steps.length) {
            store.meetingTo("review_ready");
            store.audit("MOM generated", `${MEETING.title}`);
            store.pushMessage({ kind: "text", text: "Your MOM is ready to review. I flagged one action item that needs confirmation and a launch date to double-check." });
            closeAll();
            rerender();
            setTimeout(() => onMomReady(), reduce ? 60 : 300);
            return;
        }
        setTimeout(advance, reduce ? 120 : 700);
    };
    setTimeout(advance, reduce ? 120 : 700);
}
// ============ MOM WORKSPACE ============
export function openMomWorkspace(store, rerender) {
    const mom = buildMom();
    let audience = store.data.activeAudience;
    const wrap = el("div", {});
    function isRedactedForAudience(sectionConfidential) {
        return sectionConfidential && (audience === "external" || audience === "actions_only");
    }
    function render() {
        const versions = [
            ["internal", "Internal", "Full detail"], ["external", "Client-safe", "Confidential removed"],
            ["leadership", "Leadership", "Summary + decisions"], ["actions_only", "Actions only", "Tasks + owners"],
        ];
        const decisions = store.data.launchCorrected
            ? mom.decisions.map((d) => d.id === "d1" ? { ...d, text: "Beta launch moved to 28 August." } : d)
            : mom.decisions;
        const sections = mom.sections.filter((s) => {
            if (audience === "actions_only")
                return false;
            if (audience === "leadership")
                return ["s-purpose", "s-summary", "s-next"].includes(s.id) || !s.confidential;
            return true;
        });
        const nodes = [
            // version switcher
            el("div", { class: "version-switch", role: "radiogroup", "aria-label": "MOM version" }, versions.map(([a, label, note]) => el("button", { class: `ver-btn${audience === a ? " active" : ""}`, role: "radio", "aria-checked": audience === a, type: "button", onClick: () => { audience = a; store.data.activeAudience = a; store.save(); render(); } }, [
                el("div", { class: "ver-name" }, [label]), el("div", { class: "ver-note" }, [note]),
            ]))),
            audience === "external" ? el("div", { class: "redact-banner", role: "status" }, [
                el("span", { class: "ic", html: ICONS.shield }),
                el("div", {}, [el("strong", {}, ["Client-safe version"]), el("p", {}, [store.data.externalRedacted ? "Budget, staffing, vendor-negotiation notes and the recording link are removed." : "Confidential sections are present — remove them before this goes to vendors."])]),
                store.data.externalRedacted ? null : el("button", { class: "btn btn-primary sm", type: "button", onClick: () => { store.data.externalRedacted = true; store.audit("Redacted external MOM", "Removed budget, staffing, vendor notes, recording link"); store.save(); render(); toast("Confidential content removed from the client-safe version."); } }, ["Remove confidential"]),
            ]) : null,
            // meeting details
            el("div", { class: "mom-meta" }, [
                el("div", {}, [el("span", { class: "meta-k" }, ["Meeting"]), el("span", { class: "meta-v" }, [MEETING.title])]),
                el("div", {}, [el("span", { class: "meta-k" }, ["Date"]), el("span", { class: "meta-v" }, [MEETING.date])]),
                el("div", {}, [el("span", { class: "meta-k" }, ["Duration"]), el("span", { class: "meta-v" }, [`${MEETING.durationMins} min`])]),
                el("div", {}, [el("span", { class: "meta-k" }, ["Platform"]), el("span", { class: "meta-v" }, [MEETING.platform])]),
            ]),
            // sections
            ...sections.map((s) => {
                const redacted = isRedactedForAudience(s.confidential) && store.data.externalRedacted;
                if (redacted)
                    return el("div", { class: "mom-section redacted" }, [el("div", { class: "mom-sec-head" }, [el("h3", {}, [s.title]), el("span", { class: "redact-tag" }, ["Removed for this audience"])])]);
                const bodyText = store.data.momEdits[s.id] ?? s.body;
                return el("div", { class: `mom-section${s.confidential ? " confidential" : ""}` }, [
                    el("div", { class: "mom-sec-head" }, [el("h3", {}, [s.title]), s.confidential ? el("span", { class: "conf-tag" }, [el("span", { class: "ic", html: ICONS.shield }), "Confidential"]) : null,
                        el("button", { class: "chip-btn ghost", type: "button", style: "margin-left:auto;", onClick: () => editSection(s.id, s.title, bodyText) }, ["Edit"])]),
                    el("p", {}, [bodyText]),
                ]);
            }),
            // decisions
            el("div", { class: "mom-section" }, [
                el("div", { class: "mom-sec-head" }, [el("h3", {}, ["Decisions"])]),
                ...decisions.map((d) => el("div", { class: "decision-row" }, [
                    el("span", { class: "ic", html: ICONS.check, style: `color:${PALETTE.green};` }),
                    el("div", { style: "flex:1;" }, [
                        el("div", {}, [d.text]),
                        d.corrected && !store.data.launchCorrected ? el("div", { class: "conflict-note" }, [
                            el("span", {}, [`⚠ ${d.corrected}`]),
                            el("button", { class: "chip-btn primary", type: "button", onClick: () => { store.data.launchCorrected = true; store.audit("Corrected decision", "Launch date confirmed 28 August"); store.save(); render(); toast("Confirmed — 28 August."); } }, ["Confirm 28 Aug"]),
                        ]) : null,
                    ]),
                ])),
            ]),
            // action items table
            audience !== "leadership" ? el("div", { class: "mom-section" }, [
                el("div", { class: "mom-sec-head" }, [el("h3", {}, ["Action items"])]),
                el("table", { class: "action-table" }, [
                    el("thead", {}, [el("tr", {}, [el("th", {}, ["Task"]), el("th", {}, ["Owner"]), el("th", {}, ["Due"]), el("th", {}, ["Confidence"])])]),
                    el("tbody", {}, mom.actionItems.filter((a) => !store.data.momRemoved.includes(a.id)).map((a) => el("tr", {}, [
                        el("td", {}, [
                            el("div", { class: "at-title" }, [a.title]),
                            a.transcriptRef ? el("button", { class: "transcript-ref", type: "button", onClick: () => openTranscript(a.transcriptRef, a.title) }, [el("span", { class: "ic", html: ICONS.mic }), a.transcriptRef]) : null,
                        ]),
                        el("td", {}, [a.owner]),
                        el("td", {}, [a.due]),
                        el("td", {}, [
                            store.data.momConfirmed.includes(a.id) ? confChip("high") : confChip(a.confidence),
                            a.confidence !== "high" && !store.data.momConfirmed.includes(a.id) ? el("button", { class: "chip-btn primary", type: "button", style: "margin-top:6px;", onClick: () => { store.data.momConfirmed.push(a.id); store.save(); render(); toast("Confirmed."); } }, ["Confirm"]) : null,
                            el("button", { class: "chip-btn ghost", type: "button", style: "margin-top:6px;", onClick: () => { store.data.momRemoved.push(a.id); store.save(); render(); toast("Removed — you can restore it."); } }, ["Remove"]),
                        ]),
                    ]))),
                ]),
                store.data.momRemoved.length ? el("button", { class: "btn btn-ghost sm", type: "button", style: "margin-top:8px;", onClick: () => { store.data.momRemoved = []; store.save(); render(); toast("Restored removed items."); } }, [el("span", { class: "ic", html: ICONS.undo }), "Restore removed"]) : null,
            ]) : null,
            // open questions
            el("div", { class: "mom-section" }, [
                el("div", { class: "mom-sec-head" }, [el("h3", {}, ["Open questions"])]),
                el("ul", { class: "bullet" }, mom.openQuestions.map((q) => el("li", {}, [q.text]))),
            ]),
            el("div", { class: "sheet-actions col" }, [
                el("button", { class: "btn btn-primary full", type: "button", onClick: () => { closeTop(); openPlanFlow(store, rerender); } }, ["Continue to plan"]),
            ]),
            el("p", { class: "fineprint" }, ["Recording excerpts and transcript references are simulated."]),
        ];
        wrap.replaceChildren(...nodes.filter(Boolean));
    }
    function editSection(id, title, current) {
        const ta = el("textarea", { class: "edit-ta", rows: "4", "aria-label": `Edit ${title}` });
        ta.value = current;
        openSheet({ title: `Edit · ${title}`, body: el("div", { class: "sheet-body" }, [ta,
                el("button", { class: "btn btn-primary full", type: "button", style: "margin-top:12px;", onClick: () => { store.data.momEdits[id] = ta.value; store.save(); closeTop(); render(); toast("Section updated."); } }, ["Save"]),
            ]) });
        requestAnimationFrame(() => ta.focus());
    }
    render();
    openSheet({ title: "MOM · Project Phoenix", body: el("div", { class: "sheet-body" }, [wrap]) });
}
function openTranscript(ref, title) {
    openSheet({ title: `Transcript · ${ref}`, body: el("div", { class: "sheet-body" }, [
            el("div", { class: "transcript-excerpt" }, [
                el("div", { class: "te-head" }, [el("button", { class: "te-play", type: "button", "aria-label": "Play excerpt", html: ICONS.spark, onClick: () => toast("Playing excerpt (simulated).") }, []), el("span", {}, [`Excerpt at ${ref}`])]),
                el("p", {}, [`"...so for "${title.toLowerCase()}", let's make sure the owner has it before the deadline. Agreed — I'll take it."`]),
            ]),
            el("p", { class: "fineprint" }, ["Simulated transcript — illustrative text only."]),
        ]) });
}
function infoBlock(label, node) {
    return el("div", { class: "info-block" }, [el("div", { class: "info-label" }, [label]), node]);
}
// ============ PLAN + PREVIEWS + APPROVAL ============
export function openPlanFlow(store, rerender) {
    store.transition("waiting_for_approval");
    const wrap = el("div", {});
    function render() {
        const plan = store.data.plan;
        const enabled = plan.filter((s) => s.enabled);
        const externalRecipients = enabled.filter((s) => s.id === "st-external").length ? 2 : 0;
        const irreversible = enabled.filter((s) => s.reversible === "irreversible" || s.reversible === "not_reliably_reversible");
        const needApproval = enabled.filter((s) => s.approvalRequired);
        const allApproved = needApproval.every((s) => store.data.approvedStepIds.includes(s.id));
        wrap.replaceChildren(el("p", { class: "muted", style: "margin-bottom:12px;" }, ["Review, edit, enable/disable and approve. High-impact steps need explicit sign-off before anything runs."]), 
        // assumptions
        el("div", { class: "assumptions" }, [
            el("div", { class: "info-label" }, ["Assumptions Buddy is making"]),
            ...store.data.assumptions.map((a) => el("div", { class: "assumption-row" }, [
                el("span", { class: "ic", html: ICONS.info }), el("span", { style: "flex:1;" }, [a.text]),
                el("button", { class: "chip-btn ghost", type: "button", onClick: () => editAssumption(a.id, a.text) }, ["Edit"]),
            ])),
        ]), 
        // steps
        ...plan.map((s, i) => planStepCard(s, i)), 
        // pre-approval summary
        el("div", { class: "approve-summary" }, [
            el("div", { class: "info-label" }, ["Before you approve"]),
            summaryRow("Actions", `${enabled.length} enabled`),
            summaryRow("External recipients", `${externalRecipients}`),
            summaryRow("Systems affected", [...new Set(enabled.map((s) => s.application))].join(", ")),
            summaryRow("People notified", `${enabled.reduce((n, s) => n + s.sideEffects.filter((e) => /notif/i.test(e)).length * 0 + (s.id === "st-internal" ? 6 : s.id === "st-external" ? 2 : s.id === "st-assign" ? 4 : 0), 0)}`),
            summaryRow("Hard to reverse", irreversible.length ? irreversible.map((s) => s.title).join("; ") : "None"),
            summaryRow("Outstanding uncertainties", store.data.momConfirmed.includes("a3") ? "None" : "1 — accessibility checklist owner"),
        ]));
        // approval bar (sticky)
        const bar = el("div", { class: "approval-bar" }, [
            el("div", { class: "approval-info" }, [`${enabled.length} steps · ${needApproval.filter((s) => store.data.approvedStepIds.includes(s.id)).length}/${needApproval.length} approved`]),
            el("button", { class: "btn btn-ghost", type: "button", onClick: () => { closeTop(); toast("Saved for later."); } }, ["Later"]),
            el("button", { class: "btn btn-primary", type: "button", disabled: !allApproved, onClick: () => { store.audit("Approved plan", `${enabled.length} steps`); closeTop(); openExecution(store, rerender); } }, [allApproved ? "Approve & execute" : `Approve ${needApproval.length - needApproval.filter((s) => store.data.approvedStepIds.includes(s.id)).length} more`]),
        ]);
        wrap.append(bar);
    }
    function planStepCard(s, i) {
        const approved = store.data.approvedStepIds.includes(s.id);
        return el("div", { class: `plan-step${s.enabled ? "" : " disabled"}`, "data-step": s.id }, [
            el("div", { class: "ps-top" }, [
                el("span", { class: "ps-num" }, [String(i + 1)]),
                el("div", { style: "flex:1;min-width:0;" }, [
                    el("div", { class: "ps-title" }, [s.title]),
                    el("div", { class: "ps-meta" }, [
                        el("span", { class: "app-tag" }, [s.application]),
                        el("span", { class: `risk-tag risk-${s.risk}` }, [s.riskLabel]),
                    ]),
                ]),
                el("button", { class: `toggle sm${s.enabled ? " on" : ""}`, type: "button", role: "switch", "aria-checked": s.enabled, "aria-label": `${s.enabled ? "Disable" : "Enable"} ${s.title}`, onClick: () => { s.enabled = !s.enabled; if (!s.enabled)
                        store.data.approvedStepIds = store.data.approvedStepIds.filter((id) => id !== s.id); store.save(); render(); } }, [s.enabled ? "On" : "Off"]),
            ]),
            s.enabled ? el("details", { class: "ps-details" }, [
                el("summary", {}, ["Details, side effects & reversibility"]),
                el("p", { class: "ps-desc" }, [s.description]),
                el("div", { class: "ps-grid" }, [
                    kv("Reversibility", s.reversibleLabel),
                    kv("Permission", GRANTED.has(s.permission) ? `${s.permission} ✓` : `${s.permission} — not granted`),
                    s.dependencies.length ? kv("Depends on", s.dependencies.join(", ")) : null,
                    s.sideEffects.length ? kv("Side effects", s.sideEffects.join("; ")) : null,
                ]),
                previewButton(s),
            ]) : null,
            s.enabled && s.approvalRequired ? el("label", { class: `ps-approve${approved ? " approved" : ""}` }, [
                el("input", { type: "checkbox", checked: approved, "aria-label": `Approve ${s.title}`, onChange: (e) => { const c = e.target; if (c.checked) {
                        if (!store.data.approvedStepIds.includes(s.id))
                            store.data.approvedStepIds.push(s.id);
                    }
                    else
                        store.data.approvedStepIds = store.data.approvedStepIds.filter((id) => id !== s.id); store.save(); render(); } }),
                el("span", {}, [`I approve this ${s.risk === "high" ? "high-impact" : ""} step (${s.riskLabel.toLowerCase()})`]),
            ]) : null,
        ]);
    }
    function previewButton(s) {
        if (s.application === "Outlook" && s.id.includes("MOM") || s.id === "st-internal" || s.id === "st-external")
            return el("button", { class: "chip-btn", type: "button", onClick: () => openEmailPreview(s.id === "st-external") }, ["Preview email"]);
        if (s.application === "Jira")
            return el("button", { class: "chip-btn", type: "button", onClick: () => openJiraPreview() }, ["Preview tasks"]);
        if (s.id === "st-timeline")
            return el("button", { class: "chip-btn", type: "button", onClick: () => openTimelinePreview() }, ["Preview timeline change"]);
        if (s.id === "st-schedule")
            return el("button", { class: "chip-btn", type: "button", onClick: () => openCalendarPreview() }, ["Preview calendar"]);
        return null;
    }
    function editAssumption(id, current) {
        const inp = el("input", { type: "text", class: "edit-input", "aria-label": "Edit assumption" });
        inp.value = current;
        openSheet({ title: "Edit assumption", body: el("div", { class: "sheet-body" }, [inp,
                el("button", { class: "btn btn-primary full", type: "button", style: "margin-top:12px;", onClick: () => { const a = store.data.assumptions.find((x) => x.id === id); if (a)
                        a.text = inp.value; store.save(); closeTop(); render(); toast("Assumption updated."); } }, ["Save"]),
            ]) });
        requestAnimationFrame(() => inp.focus());
    }
    render();
    openSheet({ title: "Plan before action", body: el("div", { class: "sheet-body plan-body" }, [wrap]) });
}
function kv(k, v) { return el("div", { class: "ps-kv" }, [el("span", { class: "meta-k" }, [k]), el("span", { class: "meta-v" }, [v])]); }
function summaryRow(k, v) { return el("div", { class: "sum-row" }, [el("span", { class: "sum-k" }, [k]), el("span", { class: "sum-v" }, [v])]); }
// ---- action previews ----
function openEmailPreview(external) {
    const body = el("div", { class: "sheet-body" }, [
        external ? el("div", { class: "redact-banner", role: "status" }, [el("span", { class: "ic", html: ICONS.info }), el("div", {}, [el("strong", {}, ["External recipients"]), el("p", {}, ["Goes to 2 people outside your org. Confidential sections are removed and it can't be recalled once sent."])])]) : null,
        previewField("From", USER.email),
        previewField("To", external ? "mark.taylor@vendor.com, sarah.chen@vendor.com" : "6 Project Phoenix members"),
        previewField("Subject", external ? "Project Phoenix — Meeting notes" : "Project Phoenix — Weekly Review MOM (internal)"),
        infoBlock("Body", el("p", { class: "email-body" }, [external ? "Hi all — sharing the client-safe minutes from today's Project Phoenix review. Key decisions and the agreed timeline are inside. Confidential internal detail has been removed." : "Team — full minutes from today's review attached, including budget, staffing notes and the recording link. Action items are assigned in Jira."])),
        previewField("Access", external ? "External · no recording link" : "Internal only · recording link included"),
        previewField("Delivery", "Immediately on approval"),
        previewField("Reversibility", external ? "Not reversible once sent" : "Recall within 10 minutes"),
        el("p", { class: "fineprint" }, ["Editable before approval. Simulated send."]),
    ]);
    openSheet({ title: "Email preview", body });
}
function openJiraPreview() {
    const tasks = ACTION_ITEMS.filter((a) => a.destination === "Jira");
    const body = el("div", { class: "sheet-body" }, [
        el("p", { class: "muted", style: "margin-bottom:12px;" }, ["4 tasks in Sprint 24. Each links to its transcript moment."]),
        ...tasks.map((t, i) => el("div", { class: "jira-preview" }, [
            el("div", { class: "jira-key" }, [`PHX-${240 + i}`, el("span", { class: `risk-tag risk-low` }, ["New"])]),
            el("div", { class: "jira-title" }, [t.title]),
            el("div", { class: "jira-meta" }, [`${t.owner} · due ${t.due} · Sprint 24`]),
            t.ownerId === "p-priya" ? el("div", { class: "jira-warn" }, ["⚠ Priya may lack Project Phoenix access — assignment will be checked at run time."]) : null,
        ])),
        el("p", { class: "fineprint" }, ["Editable before approval. Simulated creation."]),
    ]);
    openSheet({ title: "Jira tasks preview", body });
}
function openTimelinePreview() {
    const body = el("div", { class: "sheet-body" }, [
        previewField("Current beta date", "26 August 2026"),
        previewField("Proposed beta date", "28 August 2026"),
        previewField("Dependent milestones", "Stakeholder review, GA prep (recomputed)"),
        previewField("Affected teams", "Engineering, Design, Client Partnerships"),
        infoBlock("Change summary", el("p", {}, ["Beta shifts +2 days. Two downstream milestones move automatically; the PM is notified."])),
        el("p", { class: "fineprint" }, ["Reversible — you can revert the milestone. Simulated update."]),
    ]);
    openSheet({ title: "Timeline change preview", body });
}
function openCalendarPreview() {
    const body = el("div", { class: "sheet-body" }, [
        previewField("Proposed", "25 July 2026 · 3:00–3:45 PM IST"),
        previewField("Attendees", "6 internal members"),
        previewField("Availability", "All free · no conflicts"),
        previewField("Notification", "6 invites sent on approval"),
        el("p", { class: "fineprint" }, ["Reversible — cancel the event. Simulated booking."]),
    ]);
    openSheet({ title: "Calendar preview", body });
}
function previewField(k, v) { return el("div", { class: "preview-field" }, [el("span", { class: "pf-k" }, [k]), el("span", { class: "pf-v" }, [v])]); }
// ============ EXECUTION + RECOVERY ============
export function openExecution(store, rerender) {
    store.transition("executing");
    const steps = store.enabledSteps();
    const list = el("div", { class: "exec-timeline" });
    let i = 0;
    function statusBadge(s) {
        const map = {
            queued: ["Queued", PALETTE.slate], in_progress: ["Running", PALETTE.blue], completed: ["Completed", PALETTE.green],
            failed: ["Needs attention", PALETTE.red], partially_completed: ["Partial", PALETTE.amber], waiting_for_approval: ["Waiting", PALETTE.amber],
        };
        const [label, color] = map[s.status] ?? ["Queued", PALETTE.slate];
        return el("span", { class: "exec-badge", style: `color:${color}; background:${color}1a;` }, [label]);
    }
    function render() {
        list.replaceChildren(...steps.map((s) => el("div", { class: `exec-node status-${s.status}` }, [
            el("span", { class: "exec-rail", "aria-hidden": "true" }, [s.status === "completed" ? el("span", { class: "ic", html: ICONS.check }) : s.status === "failed" ? el("span", { class: "ic", html: ICONS.info }) : el("span", { class: "exec-dot" })]),
            el("div", { class: "exec-content" }, [
                el("div", { class: "exec-node-top" }, [el("span", { class: "exec-node-title" }, [s.title]), statusBadge(s)]),
                s.status === "completed" && s.evidence ? el("button", { class: "evidence-link", type: "button", onClick: () => openEvidence(s) }, [el("span", { class: "ic", html: ICONS.info }), s.evidence.label, el("span", { class: "ev-id" }, [s.evidence.id])]) : null,
                s.status === "failed" ? el("div", { class: "failure-card" }, [
                    el("div", { class: "fail-msg" }, [el("span", { class: "ic", html: ICONS.info }), s.error ?? "Couldn't complete this step."]),
                    el("div", { class: "fail-note" }, ["3 of 4 tasks assigned. Created tasks are kept — only Priya's assignment failed."]),
                    el("div", { class: "recovery-opts" }, [
                        recovery("Invite Priya to project", () => resolvePriya("Access request sent to admin — Priya will be assigned once granted.")),
                        recovery("Assign to Antara for now", () => resolvePriya("Reassigned to Antara — Priya can take it over later.")),
                        recovery("Keep unassigned", () => resolvePriya("Left unassigned with a note on the task.")),
                        recovery("Retry", () => resolvePriya("Retried — still no access. Try inviting Priya.", true)),
                    ]),
                ]) : null,
            ]),
        ])));
    }
    const stopBar = el("div", { class: "exec-stopbar" }, [
        el("span", { class: "agent-indicator" }, [el("span", { class: "ai-dot" }), "Buddy is executing"]),
        el("button", { class: "btn btn-ghost danger sm", type: "button", onClick: () => { for (const s of steps)
                if (s.status === "queued" || s.status === "in_progress")
                    s.status = "cancelled"; store.save(); render(); toast("Execution stopped."); store.audit("Emergency stop", "User halted execution"); } }, ["Stop"]),
    ]);
    const body = el("div", { class: "sheet-body" }, [
        el("p", { class: "muted", style: "margin-bottom:10px;" }, ["Running approved steps in order. Completed actions are kept even if a later step needs attention."]),
        stopBar, list,
    ]);
    render();
    openSheet({ title: "Executing plan", body });
    const runNext = async () => {
        if (i >= steps.length) {
            finish();
            return;
        }
        const s = steps[i];
        if (s.status === "cancelled") {
            i++;
            return runNext();
        }
        s.status = "in_progress";
        render();
        announce(`Running: ${s.title}`);
        const res = await runnerFor(s)(s);
        if (res.status === "completed") {
            s.status = "completed";
            s.evidence = res.evidence;
            store.audit("Executed step", s.title);
        }
        else {
            s.status = "failed";
            s.error = res.error;
            store.audit("Step needs attention", s.error ?? s.title);
        }
        store.save();
        render();
        i++;
        if (s.status === "failed")
            return; // pause on the Priya failure until resolved
        setTimeout(runNext, 420);
    };
    setTimeout(runNext, 400);
    function resolvePriya(msg, retryAgain = false) {
        store.data.priyaResolution = msg;
        store.audit("Resolved assignment failure", msg);
        const failStep = steps.find((s) => s.status === "failed");
        if (failStep && !retryAgain) {
            failStep.status = "partially_completed";
            failStep.evidence = { kind: "jira", id: `ASN-RES`, label: "3 of 4 assigned · 1 resolved", actor: "Antara", at: Date.now(), recipients: 3, detail: msg };
        }
        store.save();
        render();
        toast(msg);
        if (!retryAgain) {
            i++;
            setTimeout(runNext, 400);
        }
    }
    function finish() {
        const anyFail = steps.some((s) => s.status === "failed");
        store.transition(anyFail ? "partially_completed" : "completed");
        store.data.monitoringOn = true;
        store.save();
        stopBar.remove();
        setTimeout(() => { closeAll(); store.pushMessage({ kind: "completion" }); setTimeout(() => { store.pushMessage({ kind: "followup" }); store.transition("monitoring"); rerender(); }, 900); rerender(); }, 500);
    }
    function recovery(label, onClick) { return el("button", { class: "chip-btn", type: "button", onClick }, [label]); }
}
function openEvidence(s) {
    const e = s.evidence;
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "evidence-hero" }, [el("span", { class: "ic", html: ICONS.check }), el("div", {}, [el("div", { class: "ev-label" }, [e.label]), el("div", { class: "ev-idbig" }, [e.id])])]),
        previewField("System", s.application),
        previewField("Actor", e.actor),
        previewField("When", new Date(e.at).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })),
        e.recipients ? previewField("Recipients", String(e.recipients)) : null,
        infoBlock("Detail", el("p", {}, [e.detail])),
        s.reversible === "fully_reversible" || s.reversible === "partially_reversible" ? el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { s.status = "undone"; toast("Action undone."); closeTop(); } }, [el("span", { class: "ic", html: ICONS.undo }), "Undo this action"]) : el("p", { class: "fineprint" }, ["This action can't be reliably undone."]),
    ]);
    openSheet({ title: "Evidence", body });
}
// ============ COMPLETION ============
export function openCompletion(store, rerender) {
    const rows = [
        ["Internal MOM sent", "6 recipients · MSG-" + (1001), true],
        ["Client-safe MOM sent", "2 vendors · external", true],
        ["4 Jira tasks created", "Sprint 24 · PHX-240–243", true],
        ["Task assignment", store.data.priyaResolution ? "3 assigned · 1 resolved" : "3 of 4 assigned", !!store.data.priyaResolution],
        ["Project timeline updated", "Beta 26 → 28 Aug", true],
        ["Stakeholder review booked", "25 Jul · 6 attendees", true],
        ["Monitoring activated", "Reminders + overdue escalation", true],
    ];
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "comp-hero" }, [el("span", { class: "ic", html: ICONS.check }), el("div", {}, [el("div", { class: "comp-h" }, ["Plan executed"]), el("div", { class: "comp-sub" }, ["8 recipients reached · 1 item you resolved"])])]),
        ...rows.map(([k, v, ok]) => el("div", { class: "comp-row" }, [
            el("span", { class: `ic ${ok ? "ok" : "amber"}`, html: ok ? ICONS.check : ICONS.info }),
            el("div", { style: "flex:1;" }, [el("div", { class: "comp-k" }, [k]), el("div", { class: "comp-v" }, [v])]),
        ])),
        store.data.priyaResolution ? el("div", { class: "resolved-banner" }, [el("span", { class: "ic", html: ICONS.check }), el("span", {}, [store.data.priyaResolution])]) : null,
        el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => { closeTop(); openWorkflowBuilder(store, rerender); } }, [el("span", { class: "ic", html: ICONS.spark }), "Turn this into a reusable workflow"]),
            el("button", { class: "btn btn-tonal full", type: "button", onClick: () => { closeTop(); openActivity(store); } }, ["View audit history"]),
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { closeTop(); openMonitoring(store, rerender); } }, ["Set up follow-up monitoring"]),
        ]),
    ]);
    openSheet({ title: "Completion summary", body });
}
// ============ MONITORING ============
export function openMonitoring(store, rerender) {
    let handled = false;
    const wrap = el("div", {});
    function render() {
        wrap.replaceChildren(el("div", { class: "monitor-alert" }, [
            el("span", { class: "ic amber", html: ICONS.info }),
            el("div", {}, [el("strong", {}, ["Rahul's API readiness task"]), el("p", {}, ["Due tomorrow and still To Do. It blocks Ananya's integration work."])]),
        ]), handled ? el("div", { class: "resolved-banner" }, [el("span", { class: "ic", html: ICONS.check }), el("span", {}, ["Buddy sent Rahul a standard check-in and logged it. Evidence: MON-check-in."])]) :
            el("div", { class: "monitor-actions" }, [
                el("button", { class: "btn btn-primary full", type: "button", onClick: () => { handled = true; store.audit("Monitoring action", "Sent Rahul a standard check-in"); store.save(); render(); toast("Check-in sent to Rahul · evidence recorded."); } }, ["Ask Rahul for an update"]),
                el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { toast("Deadline extended by 2 days."); store.audit("Monitoring action", "Extended deadline"); } }, ["Extend deadline"]),
                el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { toast("Reassign flow (simulated)."); } }, ["Reassign"]),
                el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { toast("PM notified."); store.audit("Monitoring action", "Notified project manager"); } }, ["Notify project manager"]),
                el("button", { class: "btn btn-ghost full", type: "button", onClick: () => closeTop() }, ["Do nothing"]),
            ]), el("p", { class: "fineprint" }, ["Authorised standing rule — Buddy can send a standard check-in and record evidence, but won't change deadlines or owners without you."]));
    }
    render();
    openSheet({ title: "Follow-up monitoring", body: el("div", { class: "sheet-body" }, [wrap]) });
}
// ============ WORKFLOW BUILDER ============
export function openWorkflowBuilder(store, rerender) {
    const wf = {
        name: "Weekly Project Meeting Assistant",
        trigger: "After a Project Phoenix meeting ends",
        approval: "Ask before external sharing",
        autonomy: "plan_then_act",
        retention: 30,
    };
    const wrap = el("div", {});
    function render() {
        wrap.replaceChildren(el("div", { class: "wf-summary" }, [
            el("span", { class: "ic", html: ICONS.spark }),
            el("p", {}, [`After a Project Phoenix meeting ends, Buddy will prepare the MOM, ask ${USER.name.split(" ")[0]} to approve external sharing, create confirmed Jira tasks and monitor deadlines.`]),
        ]), field("Name", wf.name), field("Trigger", wf.trigger), field("Scope", "Work → Project Phoenix"), field("Connected apps", "Teams, Outlook, Jira"), field("Approval points", wf.approval), field("Reminders", "24h before each deadline"), field("Escalation", "Notify Antara when overdue"), field("Data retention", `${wf.retention} days`), el("div", { class: "info-block" }, [
            el("div", { class: "info-label" }, ["Autonomy level"]),
            el("div", { class: "autonomy-row" }, [["ask_each_time", "Ask each time"], ["plan_then_act", "Plan, then act on approval"], ["auto_low_risk", "Auto-run low-risk only"]].map(([k, label]) => el("button", { class: `auton-btn${wf.autonomy === k ? " active" : ""}`, type: "button", "aria-pressed": wf.autonomy === k, onClick: () => { wf.autonomy = k; render(); } }, [label]))),
        ]), el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => { store.data.workflowSaved = true; store.transition("workflow_saved"); store.audit("Activated workflow", wf.name); store.save(); closeTop(); rerender(); toast("Workflow activated — it keeps your approval points."); } }, ["Activate workflow"]),
            el("button", { class: "btn btn-tonal full", type: "button", onClick: () => { toast("Test run — Buddy simulated the workflow end to end."); } }, ["Test workflow"]),
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { store.data.workflowSaved = true; store.save(); closeTop(); rerender(); toast("Saved as draft."); } }, ["Save as draft"]),
        ]), el("p", { class: "fineprint" }, ["Approval points are always kept — even 'auto-run' never sends external email without you."]));
    }
    function field(k, v) { return el("div", { class: "wf-field" }, [el("span", { class: "wf-k" }, [k]), el("span", { class: "wf-v" }, [v])]); }
    render();
    openSheet({ title: "Save as workflow", body: el("div", { class: "sheet-body" }, [wrap]) });
}
// ============ ACTIVITY / AUDIT ============
export function openActivity(store) {
    const items = store.data.audit;
    openSheet({ title: "Activity & audit", body: el("div", { class: "sheet-body" }, [
            el("p", { class: "muted", style: "margin-bottom:12px;" }, ["Every meaningful action Buddy took, with who approved it and the scope."]),
            items.length === 0 ? el("p", { class: "empty" }, ["No activity yet — start the meeting assistant to see the trail."]) :
                el("div", { class: "audit-list" }, items.map((a) => el("div", { class: "audit-row" }, [
                    el("div", { class: "audit-dot" }, []),
                    el("div", {}, [el("div", { class: "audit-action" }, [a.action]), el("div", { class: "audit-meta" }, [`${a.detail} · ${a.actor} · ${a.scope} · ${new Date(a.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`])]),
                ]))),
            el("button", { class: "btn btn-ghost sm danger full", type: "button", style: "margin-top:14px;", onClick: () => { store.reset(); closeAll(); toast("Ask Buddy demo reset."); } }, ["Reset Ask Buddy demo"]),
        ]) });
}
