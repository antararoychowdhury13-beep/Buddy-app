/** Today module sheets: preview/execute, Brief Me (glance/2-min/full),
 * Meeting Companion + consent, post-meeting, task decomposition, recovery
 * plans, energy check-in, completion estimate, and current-vs-optimised. */
import { hasPermission, riskLabel } from "../engines/policy.js";
import { simulateStep } from "../engines/execution.js";
import { el, openSheet, toast, announce } from "../ui/dom.js";
import { ICONS } from "../ui/icons.js";
import { MEETING_BRIEF, buildTaskPlan } from "./mock.js";
import { estimateCompletion, energyRecommendations } from "./engines.js";
const CONF = {
    high: { label: "High confidence", color: "#22B07D", bg: "#E3F6EC" },
    medium: { label: "Medium confidence", color: "#E8963A", bg: "#FBF0DF" },
    low: { label: "Low confidence", color: "#D64545", bg: "#FCE9E9" },
    missing_info: { label: "Missing information", color: "#6B7280", bg: "#F0F1F4" },
};
function confBadge(c) {
    const m = CONF[c] ?? CONF.medium;
    return el("span", { class: "conf-badge sm", style: `background:${m.bg}; color:${m.color};` }, [m.label]);
}
function needsConfirm(step) {
    if (step.riskLevel === "high")
        return true;
    if (step.riskLevel === "medium")
        return !hasPermission(step.permissionRequired);
    return false;
}
// ---- generic preview → execute → undo ----
export function openStepPreview(opts) {
    const { steps, store } = opts;
    const selected = new Set(steps.map((s) => s.id));
    const confirmed = new Set();
    const list = el("div", { class: "preview-list" });
    const results = el("div", { class: "exec-results" });
    const runBtn = el("button", { class: "btn btn-primary full", type: "button" }, ["Confirm & apply"]);
    function updateRun() {
        const active = steps.filter((s) => selected.has(s.id));
        const unconfirmed = active.filter((s) => needsConfirm(s) && !confirmed.has(s.id));
        runBtn.toggleAttribute("disabled", active.length === 0 || unconfirmed.length > 0);
        runBtn.textContent = active.length === 0 ? "Select at least one step"
            : unconfirmed.length > 0 ? `Confirm ${unconfirmed.length} action${unconfirmed.length > 1 ? "s" : ""} above`
                : `Confirm & apply ${active.length} step${active.length > 1 ? "s" : ""}`;
    }
    function render() {
        list.replaceChildren(...steps.map((s) => {
            const permBlocked = !hasPermission(s.permissionRequired);
            const need = needsConfirm(s);
            return el("div", { class: `preview-row risk-${s.riskLevel}` }, [
                el("label", { class: "preview-check" }, [
                    el("input", { type: "checkbox", checked: selected.has(s.id), "aria-label": `Include: ${s.description}`,
                        onChange: (e) => { const c = e.target; if (c.checked)
                            selected.add(s.id);
                        else {
                            selected.delete(s.id);
                            confirmed.delete(s.id);
                        } render(); } }),
                ]),
                el("div", { class: "preview-main" }, [
                    el("div", { class: "preview-title" }, [s.description]),
                    el("div", { class: "preview-meta" }, [
                        el("span", { class: `risk-pill risk-${s.riskLevel}` }, [riskLabel(s.riskLevel)]),
                        el("span", { class: "sys-pill" }, [s.targetSystem]),
                        el("span", { class: `rev-pill ${s.reversible ? "rev-yes" : "rev-no"}` }, [s.reversible ? "Reversible" : "Not reversible"]),
                    ]),
                    el("p", { class: "preview-effect" }, [s.preview]),
                    s.draftMessage ? el("details", { class: "draft-msg" }, [
                        el("summary", {}, ["Preview the message they'll see"]),
                        el("p", {}, [s.draftMessage]),
                    ]) : null,
                    need && selected.has(s.id) ? el("label", { class: `confirm-line${permBlocked ? " blocked" : ""}` }, [
                        el("input", { type: "checkbox", disabled: permBlocked, "aria-label": `Confirm ${s.description}`,
                            onChange: (e) => { const c = e.target; if (c.checked)
                                confirmed.add(s.id);
                            else
                                confirmed.delete(s.id); updateRun(); } }),
                        permBlocked ? el("span", {}, [`Needs the "${s.permissionRequired}" permission — grant it in Settings first.`])
                            : el("span", {}, [`Yes, I confirm this ${s.riskLevel}-risk action.`]),
                    ]) : null,
                ]),
            ]);
        }));
        updateRun();
    }
    runBtn.addEventListener("click", async () => {
        runBtn.setAttribute("disabled", "");
        for (const s of steps.filter((x) => selected.has(x.id))) {
            s.executionStatus = "executing";
            render();
            announce(`Applying: ${s.description}`);
            const res = await simulateStep(s, opts.staleSystems ?? ["Health", "Wellbeing"]);
            s.executionStatus = res.status === "completed" ? "completed" : res.status === "partial" ? "partial" : "failed";
            s.result = res.message;
            s.undoAvailable = res.undoAvailable;
            store.audit({ trigger: opts.trigger, action: s.description, sources: [s.targetSystem], decision: "approved", result: res.status, undoStatus: res.undoAvailable ? "available" : "none", permissionUsed: s.permissionRequired });
            const tone = s.executionStatus === "completed" ? "ok" : s.executionStatus === "partial" ? "warn" : "err";
            const row = el("div", { class: `exec-row exec-${tone}` }, [
                el("span", { class: "exec-icon", "aria-hidden": "true", html: tone === "ok" ? ICONS.check : tone === "warn" ? ICONS.info : ICONS.x }),
                el("div", { class: "exec-body" }, [
                    el("div", { class: "exec-status" }, [s.executionStatus === "completed" ? "Completed" : s.executionStatus === "partial" ? "Awaiting confirmation" : "Couldn't complete"]),
                    el("p", {}, [res.message]),
                    res.warning ? el("p", { class: "exec-warn" }, [res.warning]) : null,
                    res.undoAvailable ? el("button", { class: "btn btn-ghost sm", type: "button", onClick: (e) => {
                            s.executionStatus = "undone";
                            store.audit({ trigger: "user", action: `Undo: ${s.description}`, sources: [s.targetSystem], decision: "undo", result: "undone", undoStatus: "undone", permissionUsed: s.permissionRequired });
                            e.target.replaceWith(el("span", { class: "undone-tag" }, ["Undone"]));
                            toast("Change undone.");
                            announce("Change undone.");
                        } }, [el("span", { class: "ic", html: ICONS.undo }), "Undo"]) : el("span", { class: "no-undo" }, ["Can't be undone"]),
                ]),
            ]);
            results.append(row);
        }
        opts.onDone?.();
    });
    render();
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "preview-note" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["Nothing changes until you confirm. Anything that affects other people is held for your approval."])]),
        list, results, el("div", { class: "sheet-actions" }, [runBtn]),
    ]);
    openSheet({ title: opts.title, body });
}
// ---- Brief Me (glance / 2-min / full) ----
export function openBrief(store, brief = MEETING_BRIEF) {
    let level = "glance";
    let playing = false;
    let cue = 0;
    let timer;
    const wrap = el("div", {});
    const seg = el("div", { class: "seg", role: "radiogroup", "aria-label": "Brief depth" });
    function renderSeg() {
        seg.replaceChildren(...[["glance", "30-sec"], ["two", "2-min"], ["full", "Full context"]].map(([k, lbl]) => el("button", { class: `seg-btn${level === k ? " active" : ""}`, role: "radio", "aria-checked": level === k, type: "button", onClick: () => { level = k; render(); } }, [lbl])));
    }
    const transcriptBox = el("div", { class: "transcript", "aria-live": "polite" });
    function renderTranscript() {
        transcriptBox.replaceChildren(...brief.verbalTranscript.map((line, i) => el("p", { class: `t-line${i === cue && playing ? " active" : ""}` }, [line.text])));
    }
    const playBtn = el("button", { class: "brief-play", type: "button", "aria-label": "Play verbal briefing" }, [el("span", { class: "ic", html: ICONS.spark }), "Play verbal briefing"]);
    playBtn.addEventListener("click", () => {
        playing = !playing;
        if (playing) {
            playBtn.querySelector("span:last-child").textContent = "Pause";
            const advance = () => {
                renderTranscript();
                if (cue >= brief.verbalTranscript.length - 1) {
                    playing = false;
                    playBtn.querySelector("span:last-child").textContent = "Replay";
                    cue = 0;
                    return;
                }
                cue++;
                timer = window.setTimeout(advance, 1400);
            };
            advance();
        }
        else {
            playBtn.querySelector("span:last-child").textContent = "Play verbal briefing";
            if (timer)
                clearTimeout(timer);
        }
    });
    function sourceChips() {
        return el("div", { class: "chip-row" }, brief.sources.map((s) => el("button", { class: "src-chip", type: "button", onClick: () => openTodaySource(s) }, [s[0].toUpperCase() + s.slice(1)])));
    }
    function render() {
        renderSeg();
        const parts = [
            el("div", { class: "brief-head" }, [
                el("div", { class: "brief-obj" }, [el("div", { class: "info-label" }, ["Objective"]), el("p", {}, [brief.objective])]),
                el("div", { class: "conf-row" }, [confBadge(brief.confidence), el("span", { class: "muted sm" }, [`Updated ${brief.lastUpdated}`])]),
            ]),
        ];
        if (level === "glance") {
            parts.push(el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["30-second glance"]), el("p", {}, [brief.glance])]));
            parts.push(playBtn, transcriptBox);
        }
        else if (level === "two") {
            parts.push(el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Previous decisions"]), el("ul", { class: "bullet" }, brief.previousDecisions.map((d) => el("li", {}, [d])))]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Likely to come up"]), el("ul", { class: "bullet" }, brief.predictedRisks.map((r) => el("li", {}, [r])))]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Questions to ask"]), ...brief.recommendedQuestions.map((q) => el("div", { class: "q-row" }, [el("span", {}, [q]), el("button", { class: "chip-btn", type: "button", onClick: () => { store.data.savedQuestions.push(q); store.save(); toast("Question saved to your companion."); } }, ["Save"])]))]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Recommended position"]), el("p", {}, [brief.recommendedPosition])]));
        }
        else {
            parts.push(el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Attendees"]), ...brief.attendees.map((a) => el("div", { class: "att-row" }, [el("div", { class: "att-name" }, [`${a.name} · ${a.role}`]), el("div", { class: "att-ctx" }, [a.context])]))]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Previous summary"]), el("p", {}, [brief.previousSummary])]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Unresolved actions"]), el("ul", { class: "bullet" }, brief.unresolvedActions.map((u) => el("li", {}, [u])))]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Relevant signals"]), ...brief.relevantSignals.map((s) => el("div", { class: "sig-row" }, [el("span", { class: "sig-src" }, [s.source]), el("span", {}, [s.note])]))]), el("div", { class: "info-block warn-block" }, [el("div", { class: "info-label" }, ["Missing information"]), el("p", {}, [brief.missingInformation])]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Data sources"]), sourceChips()]), el("p", { class: "muted sm" }, [brief.confidenceReason]));
        }
        parts.push(el("div", { class: "brief-actions" }, [
            el("button", { class: "chip-btn", type: "button", onClick: () => addNote(store) }, ["Add private note"]),
            el("button", { class: "chip-btn", type: "button", onClick: () => { store.addFeedback(brief.meetingId, "correct_brief"); toast("Thanks — tell me what was off and I'll adjust."); } }, ["Correct Buddy"]),
            el("button", { class: "chip-btn", type: "button", onClick: () => toast("Refreshed — sources re-checked just now.") }, ["Refresh"]),
        ]), el("p", { class: "fineprint" }, ["Buddy shows the type of information used, not private message contents."]));
        renderTranscript();
        wrap.replaceChildren(seg, ...parts.filter(Boolean));
    }
    render();
    openSheet({ title: `Brief · ${brief.title}`, body: el("div", { class: "sheet-body" }, [wrap]) });
}
function addNote(store) {
    const input = el("input", { type: "text", class: "note-input", placeholder: "A private note for this meeting…", "aria-label": "Private note" });
    const body = el("div", { class: "sheet-body" }, [
        input,
        el("button", { class: "btn btn-primary full", type: "button", onClick: () => { const v = input.value.trim(); if (v) {
                store.data.privateNotes.push(v);
                store.save();
                toast("Private note saved.");
            } document.querySelector(".sheet-scrim.open .sheet-close")?.click(); } }, ["Save note"]),
        el("p", { class: "fineprint" }, ["Private to you. Never shared or used to train anything."]),
    ]);
    openSheet({ title: "Private note", body });
    requestAnimationFrame(() => input.focus());
}
function openTodaySource(id) {
    const detail = {
        jira: "BUD-231 blocker links and the sprint board states. No issue bodies shown here.",
        email: "Subject lines of 2 flagged threads. Message contents are not read into the brief.",
        teams: "Unread mention counts in #powervc-launch. No message text.",
        calendar: "Today's events, attendee counts and response status.",
        prefs: "Your saved focus window and 'ask before external messages' preference.",
        maps: "Live commute ETA home → office.",
    };
    openSheet({ title: `${id[0].toUpperCase() + id.slice(1)} source`, body: el("div", { class: "sheet-body" }, [
            el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["What Buddy used"]), el("p", {}, [detail[id] ?? "Connected source."])]),
            el("p", { class: "fineprint" }, ["Type of information used — not private contents."]),
        ]) });
}
// ---- Meeting Companion + consent ----
export function openCompanion(store, onEnd) {
    if (!store.data.recordingConsent) {
        openConsent(store, () => openCompanion(store, onEnd));
        return;
    }
    const emerging = ["Hold the launch date (leaning agreed)", "Add a 2-day buffer (proposed)"];
    const actions = ["Backend to confirm firm API ETA — owner: Rohan", "You to share design sign-off note — owner: you"];
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "companion-status" }, [el("span", { class: "rec-dot", "aria-hidden": "true" }), el("span", {}, ["Recording · you can pause or stop anytime"]), el("button", { class: "chip-btn", type: "button", onClick: () => toast("Paused.") }, ["Pause"])]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Objective"]), el("p", {}, [MEETING_BRIEF.objective])]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, [`Saved questions (${store.data.savedQuestions.length})`]), store.data.savedQuestions.length ? el("ul", { class: "bullet" }, store.data.savedQuestions.map((q) => el("li", {}, [q]))) : el("p", { class: "muted" }, ["None saved — add some from the brief."])]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Emerging decisions"]), el("ul", { class: "bullet" }, emerging.map((e) => el("li", {}, [e])))]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Draft action items"]), el("ul", { class: "bullet" }, actions.map((a) => el("li", {}, [a])))]),
        el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => { document.querySelector(".sheet-scrim.open .sheet-close")?.click(); openPostMeeting(store, onEnd); } }, ["Simulate meeting end"]),
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { store.data.recordingConsent = false; store.save(); toast("Recording stopped."); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); } }, ["Stop recording"]),
        ]),
    ]);
    openSheet({ title: "Meeting Companion", body });
}
function openConsent(store, onStart) {
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "consent-lead" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["Recording and transcription are off by default. Nothing is captured until you start."])]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Participants"]), el("p", {}, ["4 people in the Stakeholder Sync will be recorded."])]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Data usage"]), el("p", {}, ["Audio is transcribed to draft notes and action items. It stays private to you."])]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Retention"]), el("p", {}, ["The transcript is deleted after you approve the notes, or within 24 hours."])]),
        el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => { store.data.recordingConsent = true; store.save(); store.audit({ trigger: "user", action: "Started meeting recording", sources: ["companion"], decision: "consented", result: "completed", undoStatus: "none", permissionUsed: "recording.consent" }); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); onStart(); } }, ["Start recording"]),
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => document.querySelector(".sheet-scrim.open .sheet-close")?.click() }, ["Cancel"]),
        ]),
        el("p", { class: "fineprint" }, ["Consent is a separate, explicit choice — Buddy never enables recording on its own."]),
    ]);
    openSheet({ title: "Before we record", body });
}
function openPostMeeting(store, onEnd) {
    const confirmed = ["Launch date held at 24 Jul"];
    const proposed = ["Add a 2-day internal buffer (needs Rohan's nod)"];
    const followups = [
        { id: "f1", label: "Send Sara the revised API ETA note", risk: "medium", perm: "email.send" },
        { id: "f2", label: "Post the decision summary to #powervc-launch", risk: "medium", perm: "messages.send_external" },
    ];
    const picked = new Set();
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "post-split" }, [
            el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Confirmed decisions"]), el("ul", { class: "bullet" }, confirmed.map((d) => el("li", {}, [d])))]),
            el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Proposed (not yet agreed)"]), el("ul", { class: "bullet muted-bullet" }, proposed.map((d) => el("li", {}, [d])))]),
        ]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Action items"]), el("ul", { class: "bullet" }, [el("li", {}, ["Backend: confirm firm API ETA — due Thu"]), el("li", {}, ["You: share design sign-off — due today"])])]),
        el("div", { class: "info-block" }, [
            el("div", { class: "info-label" }, ["Follow-ups to send (each needs your approval)"]),
            ...followups.map((f) => el("label", { class: "followup-row" }, [
                el("input", { type: "checkbox", "aria-label": f.label, onChange: (e) => { const c = e.target; if (c.checked)
                        picked.add(f.id);
                    else
                        picked.delete(f.id); } }),
                el("div", {}, [el("div", {}, [f.label]), el("span", { class: `risk-pill risk-${f.risk}` }, [riskLabel(f.risk)])]),
            ])),
        ]),
        el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
                    const chosen = followups.filter((f) => picked.has(f.id));
                    if (chosen.length === 0) {
                        toast("Nothing selected — no messages sent.");
                        return;
                    }
                    const steps = chosen.map((f) => ({ id: f.id, description: f.label, targetSystem: f.id === "f2" ? "Teams" : "Email", riskLevel: f.risk, reversible: false, permissionRequired: f.perm, preview: "This message is sent on your behalf. Needs your explicit approval.", executionStatus: "suggested", undoAvailable: false }));
                    document.querySelector(".sheet-scrim.open .sheet-close")?.click();
                    openStepPreview({ title: "Send follow-ups", steps, store, trigger: "post-meeting", onDone: onEnd });
                } }, ["Review & send selected"]),
        ]),
        el("p", { class: "fineprint" }, ["Decisions and discussion are kept separate. Sending anything is always your call."]),
    ]);
    openSheet({ title: "After the meeting", body });
}
// ---- task decomposition ----
export function openDecomposition(store, onChange) {
    if (!store.data.taskClarified) {
        openClarify(store, () => openDecomposition(store, onChange));
        return;
    }
    const plan = buildTaskPlan(true);
    if (store.data.taskFirstPassDone)
        plan.steps.forEach((s) => { if (s.buddyCapability === "buddy_first_pass") {
            s.status = "buddy_done";
            s.output = "Buddy drafted this — review when ready.";
        } });
    const list = el("div", { class: "decomp-list" });
    function render() {
        list.replaceChildren(...plan.steps.map((s, i) => el("div", { class: `decomp-row ${s.status}` }, [
            el("div", { class: "decomp-num" }, [String(i + 1)]),
            el("div", { class: "decomp-body" }, [
                el("div", { class: "decomp-title" }, [s.title, s.status === "buddy_done" ? el("span", { class: "buddy-tag" }, ["Buddy drafted"]) : null]),
                el("div", { class: "decomp-desc" }, [s.description]),
                el("div", { class: "decomp-meta" }, [
                    el("span", { class: "rec-chip" }, [`${s.estimatedMinutes}m`]),
                    s.requiredSource ? el("span", { class: "rec-chip" }, [s.requiredSource]) : null,
                    el("span", { class: "rec-chip" }, [s.owner === "buddy" ? "Buddy" : "You"]),
                    s.userJudgementRequired ? el("span", { class: "rec-chip danger" }, ["Your judgement"]) : null,
                ]),
            ]),
        ])));
    }
    render();
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Objective"]), el("p", {}, [plan.objective]), el("div", { class: "info-label", style: "margin-top:8px;" }, ["Expected output"]), el("p", {}, [plan.expectedOutput])]),
        el("p", { class: "muted sm" }, [`${plan.steps.length} steps · ~${plan.estimatedMinutes} min · blocks ${plan.peopleBlocked} teammates`]),
        list,
        el("div", { class: "sheet-actions col" }, [
            store.data.taskFirstPassDone ? null : el("button", { class: "btn btn-primary full", type: "button", onClick: () => { store.data.taskFirstPassDone = true; store.save(); store.audit({ trigger: "user", action: "Buddy first pass on API review", sources: ["confluence", "jira"], decision: "approved", result: "completed", undoStatus: "available", permissionUsed: null }); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); openDecomposition(store, onChange); toast("Buddy completed the first pass on 4 steps."); } }, ["Let Buddy do the first pass"]),
            el("button", { class: "btn btn-tonal full", type: "button", onClick: () => {
                    const steps = [{ id: "focus-conv", description: "Convert the remaining review steps into a 3:00 PM focus block", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "A focus block for the API review appears at 3:00 PM.", executionStatus: "suggested", undoAvailable: true }];
                    document.querySelector(".sheet-scrim.open .sheet-close")?.click();
                    openStepPreview({ title: "Create focus block", steps, store, trigger: "task decomposition", onDone: onChange });
                } }, ["Convert to focus block"]),
        ]),
        el("p", { class: "fineprint" }, ["Buddy drafts; your judgement steps stay yours. Nothing is submitted without you."]),
    ]);
    openSheet({ title: "Review API spec — plan", body });
}
function openClarify(store, onDone) {
    const opts = ["Approval", "Written comments", "A risk assessment", "A summary"];
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "clarify-lead" }, [el("span", { class: "ic", html: ICONS.info }), el("p", {}, ["This task is a little vague, so I'll ask one quick thing before planning it."])]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["What should this review produce?"]),
            ...opts.map((o) => el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { store.data.taskClarified = true; store.save(); store.audit({ trigger: "user", action: `Clarified review output: ${o}`, sources: [], decision: "answered", result: "completed", undoStatus: "none", permissionUsed: null }); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); onDone(); } }, [o]))]),
        el("p", { class: "fineprint" }, ["Your answer is saved to the task plan so I don't ask again."]),
    ]);
    openSheet({ title: "One quick question", body });
}
// ---- recovery plans ----
export function openRecovery(plans, store, onApply) {
    let pick = plans[0].id;
    let protectPersonal = false;
    const wrap = el("div", {});
    function render() {
        wrap.replaceChildren(el("p", { class: "muted", style: "margin-bottom:12px;" }, ["The 11 AM sync overran 25 minutes. Here are three ways to recover — compare and choose."]), el("label", { class: "protect-toggle" }, [
            el("input", { type: "checkbox", checked: protectPersonal, "aria-label": "Protect my family pickup above all", onChange: (e) => { protectPersonal = e.target.checked; render(); } }),
            el("span", {}, ["Protect Aarav's pickup above all else"]),
        ]), el("div", { class: "recovery-grid", role: "radiogroup", "aria-label": "Recovery options" }, plans.map((p) => {
            const protectsFamily = p.commitmentsProtected.some((c) => /pickup|Aarav/i.test(c));
            const dimmed = protectPersonal && !protectsFamily;
            return el("button", { class: `res-card${pick === p.id ? " picked" : ""}${dimmed ? " dimmed" : ""}`, type: "button", role: "radio", "aria-checked": pick === p.id, disabled: dimmed,
                onClick: () => { pick = p.id; render(); } }, [
                el("div", { class: "res-top" }, [el("span", { class: "res-tag" }, [p.name]), confBadge(p.confidence)]),
                el("p", { class: "res-impact" }, [p.description]),
                el("div", { class: "res-impact" }, [el("span", { class: "meta-k" }, ["Protects"]), " ", p.commitmentsProtected.join(", ")]),
                p.commitmentsMoved.length ? el("div", { class: "res-impact" }, [el("span", { class: "meta-k" }, ["Moves"]), " ", p.commitmentsMoved.join(", ")]) : null,
                el("div", { class: "res-impact" }, [el("span", { class: "meta-k" }, ["Finish"]), " ", p.expectedFinish, " · ", p.completionBand]),
                p.permissionRequired ? el("div", { class: "res-perm" }, [`Needs "${p.permissionRequired}"${hasPermission(p.permissionRequired) ? " — granted" : " — not granted"}`]) : null,
            ]);
        })), el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => { const plan = plans.find((p) => p.id === pick); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); openStepPreview({ title: `Apply: ${plan.name}`, steps: plan.steps, store, trigger: "overrun recovery", onDone: onApply }); } }, ["Apply this plan"]),
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => toast("I'll draft another option in a moment.") }, ["Ask for another option"]),
            el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { store.data.overrunActive = false; store.save(); onApply(); document.querySelector(".sheet-scrim.open .sheet-close")?.click(); toast("Kept your original plan."); } }, ["Ignore & restore plan"]),
        ]), el("p", { class: "fineprint" }, ["Estimates, not guarantees. Applying a plan updates your timeline and activity log."]));
    }
    render();
    openSheet({ title: "Day needs replanning", body: el("div", { class: "sheet-body" }, [wrap]) });
}
// ---- energy check-in ----
export function openEnergy(store, onChange) {
    const wrap = el("div", {});
    function render() {
        const states = [["energised", "Energised"], ["ok", "Okay"], ["low", "Low energy"], ["over", "Overloaded"], ["unspecified", "Prefer not to say"]];
        const parts = [
            el("p", { class: "muted", style: "margin-bottom:12px;" }, ["A quick check-in helps me pace your day. This works without any health data."]),
            el("div", { class: "energy-grid" }, states.map(([k, lbl]) => el("button", { class: `energy-btn${store.data.energy === k ? " active" : ""}`, type: "button", "aria-pressed": store.data.energy === k,
                onClick: () => { store.data.energy = k; store.save(); store.addFeedback("energy", "checkin", k); render(); onChange(); } }, [lbl]))),
            store.data.energy !== "unspecified" ? el("div", { class: "info-block" }, [
                el("div", { class: "info-label" }, ["How I'll adjust"]),
                ...energyRecommendations(store.data.energy).map((r) => el("div", { class: "energy-rec" }, [el("div", { class: "energy-rec-t" }, [r.title]), el("p", {}, [r.detail])])),
            ]) : null,
            el("div", { class: "info-block" }, [
                el("div", { class: "consent-row" }, [
                    el("div", {}, [el("div", { class: "decomp-title" }, ["Use optional health data"]), el("p", { class: "muted sm" }, ["Off by default. Private to you — never shared with managers, never used for performance or employment decisions. You can delete it anytime."])]),
                    el("button", { class: `toggle sm${store.data.healthConsent ? " warn" : ""}`, type: "button", "aria-pressed": store.data.healthConsent, "aria-label": "Toggle health data", onClick: () => { store.data.healthConsent = !store.data.healthConsent; store.save(); store.audit({ trigger: "user", action: store.data.healthConsent ? "Enabled health data" : "Disabled health data", sources: ["wellbeing"], decision: "consent", result: "completed", undoStatus: "none", permissionUsed: "health.consent" }); render(); onChange(); toast(store.data.healthConsent ? "Health data on — private to you." : "Health data off and this session's read discarded."); } }, [store.data.healthConsent ? "On" : "Off"]),
                ]),
                store.data.healthConsent ? el("p", { class: "health-note" }, ["Using last night's sleep (5h 40m, poor) only to gently pace deep work — nothing diagnostic, and it never affects any performance metric."]) : null,
            ]),
            el("p", { class: "fineprint" }, ["Supportive guidance only — never a medical or diagnostic claim."]),
        ];
        wrap.replaceChildren(...parts.filter(Boolean));
    }
    render();
    openSheet({ title: "Energy check-in", body: el("div", { class: "sheet-body" }, [wrap]) });
}
// ---- completion estimate ----
export function openCompletion(input, store) {
    let scenario = "current";
    const wrap = el("div", {});
    const BAND_META = {
        "very likely": { color: "#22B07D", bg: "#E3F6EC", pct: "88%" },
        likely: { color: "#2F6BFF", bg: "#E9F0FF", pct: "78%" },
        uncertain: { color: "#E8963A", bg: "#FBF0DF", pct: "58%" },
        unlikely: { color: "#D64545", bg: "#FCE9E9", pct: "38%" },
    };
    function render() {
        const est = estimateCompletion(scenario, input, store.data.healthConsent, store.data.energy);
        const pct = Math.round(est.internalProbability * 100);
        const bm = BAND_META[est.band];
        const seg = el("div", { class: "seg", role: "radiogroup", "aria-label": "Scenario" }, [["current", "Current"], ["optimised", "Optimised"], ["delegated", "Delegated"], ["personal_first", "Family-first"]].map(([k, lbl]) => el("button", { class: `seg-btn${scenario === k ? " active" : ""}`, role: "radio", "aria-checked": scenario === k, type: "button", onClick: () => { scenario = k; render(); } }, [lbl])));
        wrap.replaceChildren(seg, el("div", { class: "est-hero", style: `background:${bm.bg};` }, [
            el("div", { class: "est-band", style: `color:${bm.color};` }, [est.band[0].toUpperCase() + est.band.slice(1)]),
            el("div", { class: "est-pct", style: `color:${bm.color};` }, [`~${pct}%`]),
            el("div", { class: "est-cap" }, ["estimated chance of finishing all 3 due tasks"]),
            el("div", { class: "est-meter", role: "img", "aria-label": `${est.band}, about ${pct} percent` }, [el("div", { class: "est-fill", style: `width:${pct}%; background:${bm.color};` })]),
        ]), el("div", { class: "conf-row", style: "margin:10px 0;" }, [confBadge(est.confidence), el("span", { class: "muted sm" }, [`Calculated ${est.calculatedAt}`])]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["What's helping"]), el("ul", { class: "bullet good-bullet" }, est.positiveFactors.map((f) => el("li", {}, [f])))]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["What's working against it"]), el("ul", { class: "bullet bad-bullet" }, est.negativeFactors.map((f) => el("li", {}, [f])))]), el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Assumptions"]), el("ul", { class: "bullet" }, est.assumptions.map((f) => el("li", {}, [f])))]), el("div", { class: "meta-grid" }, [
            el("div", {}, [el("span", { class: "meta-k" }, ["Data used"]), el("span", { class: "meta-v" }, [est.dataUsed.join(", ")])]),
            el("div", {}, [el("span", { class: "meta-k" }, ["Health data"]), el("span", { class: "meta-v" }, [est.healthDataUsed ? "Used (with consent)" : "Not used"])]),
        ]), el("div", { class: "disclaimer" }, [est.disclaimer]));
    }
    render();
    openSheet({ title: "Completion estimate", body: el("div", { class: "sheet-body" }, [wrap]) });
}
// ---- current vs optimised compare ----
export function openCompare(store, onApply) {
    const rows = [
        { label: "Focus time", cur: "1h 05m", opt: "2h 15m", better: "opt" },
        { label: "Buffer time", cur: "0 min", opt: "20 min", better: "opt" },
        { label: "Context switches", cur: "9", opt: "5", better: "opt" },
        { label: "Travel handled", cur: "No", opt: "Yes", better: "opt" },
        { label: "Task completion", cur: "58%", opt: "82%", better: "opt" },
        { label: "Personal protected", cur: "At risk", opt: "Yes", better: "opt" },
        { label: "Expected finish", cur: "7:10 PM", opt: "6:15 PM", better: "opt" },
        { label: "External changes", cur: "—", opt: "2 need approval", better: "cur" },
    ];
    let view = "optimised";
    const wrap = el("div", {});
    function render() {
        wrap.replaceChildren(el("div", { class: "seg", role: "radiogroup", "aria-label": "Timeline view" }, [["current", "Current"], ["optimised", "Optimised"]].map(([k, lbl]) => el("button", { class: `seg-btn${view === k ? " active" : ""}`, role: "radio", "aria-checked": view === k, type: "button", onClick: () => { view = k; render(); } }, [lbl]))), el("div", { class: "cmp-table", role: "table" }, [
            el("div", { class: "cmp-head", role: "row" }, [el("span", { role: "columnheader" }, ["Metric"]), el("span", { class: "cmp-col", role: "columnheader" }, ["Current"]), el("span", { class: "cmp-col", role: "columnheader" }, ["Optimised"])]),
            ...rows.map((r) => el("div", { class: "cmp-row", role: "row" }, [
                el("span", { class: "cmp-metric", role: "cell" }, [r.label]),
                el("span", { class: `cmp-col${view === "current" ? " cmp-focus" : ""} ${r.better === "cur" ? "cmp-best" : ""}`, role: "cell" }, [r.cur]),
                el("span", { class: `cmp-col${view === "optimised" ? " cmp-focus" : ""} ${r.better === "opt" ? "cmp-best" : ""}`, role: "cell" }, [r.opt]),
            ])),
        ]), el("p", { class: "fineprint" }, ["Estimates, not guarantees. Two changes affect other people and will ask before applying."]), el("div", { class: "sheet-actions col" }, [
            el("button", { class: "btn btn-primary full", type: "button", onClick: () => { document.querySelector(".sheet-scrim.open .sheet-close")?.click(); onApply(); } }, ["Apply safe optimisations"]),
        ]));
    }
    render();
    openSheet({ title: "Current vs optimised", body: el("div", { class: "sheet-body" }, [wrap]) });
}
export function openSuggestionWhy(s, store) {
    const body = el("div", { class: "sheet-body" }, [
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Why now"]), el("p", {}, [s.reason])]),
        el("div", { class: "conf-row" }, [confBadge(s.confidence)]),
        el("p", { class: "muted sm", style: "margin:6px 0 12px;" }, [s.confidenceReason]),
        el("div", { class: "meta-grid" }, [
            el("div", {}, [el("span", { class: "meta-k" }, ["Original"]), el("span", { class: "meta-v" }, [s.originalTime])]),
            el("div", {}, [el("span", { class: "meta-k" }, ["Proposed"]), el("span", { class: "meta-v" }, [s.proposedTime])]),
            el("div", {}, [el("span", { class: "meta-k" }, ["Affects"]), el("span", { class: "meta-v" }, [s.affectedPeople.length ? s.affectedPeople.join(", ") : "Only you"])]),
            el("div", {}, [el("span", { class: "meta-k" }, ["Reversible"]), el("span", { class: "meta-v" }, [s.reversible ? "Yes" : "No"])]),
        ]),
        el("div", { class: "info-block" }, [el("div", { class: "info-label" }, ["Data sources"]), el("div", { class: "chip-row" }, s.sources.map((src) => el("button", { class: "src-chip", type: "button", onClick: () => openTodaySource(src) }, [src[0].toUpperCase() + src.slice(1)])))]),
        el("button", { class: "btn btn-ghost full", type: "button", onClick: () => { store.addFeedback(s.id, "no_recommend_type", s.type); toast("Noted — I'll ease off suggestions like this."); } }, ["Don't suggest this type"]),
        el("p", { class: "fineprint" }, ["Nothing changes until you confirm."]),
    ]);
    openSheet({ title: s.title, body });
}
