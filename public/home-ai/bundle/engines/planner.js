let seq = 0;
const sid = () => `step-${++seq}`;
function step(partial) {
    return { id: sid(), executionStatus: "suggested", undoAvailable: partial.undoAvailable ?? partial.reversible, ...partial };
}
export function buildRecommendations(ctx) {
    const SIGNALS = ctx.signals;
    const focus = SIGNALS.focusPreference;
    const recs = [];
    // PROTECT — focus block (low risk, permitted, Buddy can handle)
    recs.push({
        id: "rec-focus",
        title: `Protect ${focus.start}–${focus.end} for focused work`,
        summary: "Block the afternoon window and mute notifications while it runs.",
        domain: "work", category: "protect",
        urgency: 0.6, impact: 0.7, peopleAffected: 0, financialImpact: 0,
        emotionalImportance: 0.4, estimatedMinutes: 0, reversible: true,
        buddyCanHandle: true, requiredPermission: "calendar.block_focus",
        defaultTime: focus.start,
        explanation: {
            whyNow: "Your only unbroken window today is 3:00–5:15 PM, and two due-today tasks need about 80 minutes of quiet time.",
            confidence: "high",
            confidenceReason: "Based on your calendar (refreshed 4 min ago) and your saved focus preference.",
            sources: ["calendar", "prefs"],
            evidence: ["No meetings scheduled 3:15–4:15 PM", "You set 3:00–5:15 PM as preferred focus time", "3 tasks due before 6:00 PM"],
            assumptions: ["No new meetings land in this window"],
            consequenceIfIgnored: "The due-today tasks likely slip past 6:00 PM or into the evening.",
        },
        steps: [
            step({ description: "Create 'Focus — do not book' block 3:00–5:15 PM", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "A private calendar block appears; others see you as busy." }),
            step({ description: "Mute non-critical notifications during the block", targetSystem: "Notifications", riskLevel: "low", reversible: true, permissionRequired: "notifications.mute", preview: "Only calls from favourites and critical alerts get through until 5:15 PM." }),
        ],
        status: "suggested",
    });
    // PRIORITISE — API review before 11 AM (blocks 2 teammates)
    recs.push({
        id: "rec-api",
        title: "Do the API spec review before 11:00 AM",
        summary: "BUD-231 blocks two teammates; the 11 AM sync will ask about it.",
        domain: "work", category: "prioritise",
        urgency: 0.95, impact: 0.9, peopleAffected: 2, financialImpact: 0,
        emotionalImportance: 0.3, estimatedMinutes: 45, reversible: true,
        buddyCanHandle: false, requiredPermission: null,
        defaultTime: "9:50 AM",
        explanation: {
            whyNow: "Two teammates are blocked on BUD-231, and the stakeholder sync at 11:00 AM is the natural checkpoint — finishing before it unblocks them today.",
            confidence: "high",
            confidenceReason: "Jira blocker links are explicit and were refreshed 12 minutes ago.",
            sources: ["jira", "calendar"],
            evidence: ["BUD-231 has 2 'is blocked by' links to teammates' issues", "Review estimated at ~45 min", "Free 9:50–10:50 AM slot exists"],
            assumptions: ["The review doesn't uncover major spec problems"],
            consequenceIfIgnored: "Two teammates stay blocked at least until tomorrow; the sync surfaces the delay.",
        },
        steps: [
            step({ description: "Hold 9:50–10:35 AM for the review (private)", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "A 45-min private hold appears before the 11 AM sync." }),
        ],
        status: "suggested",
    });
    // MOVE — optional vendor call (medium risk, permitted via move_internal? It's external-ish but attendee move is internal reschedule)
    recs.push({
        id: "rec-vendor",
        title: "Move the optional vendor demo to Thursday",
        summary: "It collides with your best prep window and needs nothing from you live.",
        domain: "calendar", category: "move",
        urgency: 0.5, impact: 0.5, peopleAffected: 1, financialImpact: 0,
        emotionalImportance: 0.1, estimatedMinutes: 5, reversible: true,
        buddyCanHandle: true, requiredPermission: "calendar.move_internal",
        defaultTime: "Thu 12:00 PM",
        explanation: {
            whyNow: "The 12:00 PM demo is marked optional, the recording is offered, and moving it opens a prep hour before the roadmap review.",
            confidence: "medium",
            confidenceReason: "The organiser offered alternates in email, but I haven't confirmed Thursday works for their team.",
            sources: ["calendar", "email"],
            evidence: ["Event marked optional", "Organiser's invite lists Thu/Fri alternates", "No agenda items assigned to you"],
            assumptions: ["Thursday alternate is still open"],
            consequenceIfIgnored: "Nothing breaks — you lose the prep hour or skip the demo.",
            missingInfo: "Vendor's confirmed availability for Thursday",
        },
        steps: [
            step({ description: "Propose Thursday 12:00 PM to the organiser and move the hold", targetSystem: "Calendar", riskLevel: "medium", reversible: true, permissionRequired: "calendar.move_internal", preview: "The organiser gets a reschedule proposal; your hold moves to Thursday." }),
        ],
        alternative: { label: "Keep it and just skim the recording later", tradeoff: "Keeps today tighter; recording arrives tomorrow." },
        status: "suggested",
    });
    // PREPARE — roadmap deck refresh (draft → partial completion path)
    recs.push({
        id: "rec-deck",
        title: "Refresh the roadmap deck before 2:30 PM",
        summary: "Two slides lag the latest delivery data; Buddy can draft the update.",
        domain: "work", category: "prepare",
        urgency: 0.7, impact: 0.6, peopleAffected: 9, financialImpact: 0,
        emotionalImportance: 0.2, estimatedMinutes: 20, reversible: true,
        buddyCanHandle: true, requiredPermission: null,
        defaultTime: "1:30 PM",
        explanation: {
            whyNow: "The 2:30 PM roadmap review has 9 attendees, and the PowerVC delay (4 days) isn't reflected on slides 6–7 yet.",
            confidence: "high",
            confidenceReason: "Jira delivery dates and the deck's last-modified timestamp disagree; both were checked within 15 minutes.",
            sources: ["jira", "calendar"],
            evidence: ["Deck last edited before the delay was flagged", "Slides 6–7 cite the old ETA"],
            assumptions: ["No further ETA changes before 2:30 PM"],
            consequenceIfIgnored: "You present outdated dates to 9 people and field corrections live.",
        },
        steps: [
            step({ description: "Draft updated slides 6–7 with the new ETA", targetSystem: "Slides", riskLevel: "low", reversible: true, permissionRequired: null, preview: "A draft revision appears in your deck — nothing is shared until you review it." }),
            step({ description: "Post the draft summary to #powervc-launch", targetSystem: "Teams", riskLevel: "medium", reversible: false, permissionRequired: "messages.send_external", preview: "A 3-line status goes to the channel. This needs your explicit approval.", undoAvailable: false }),
        ],
        status: "suggested",
    });
    // DELEGATE — sprint summary
    recs.push({
        id: "rec-sprint",
        title: "Let Buddy draft the sprint summary",
        summary: "Buddy assembles the draft from Jira; you review and send.",
        domain: "tasks", category: "delegate",
        urgency: 0.55, impact: 0.4, peopleAffected: 0, financialImpact: 0,
        emotionalImportance: 0.1, estimatedMinutes: 5, reversible: true,
        buddyCanHandle: true, requiredPermission: null,
        defaultTime: "5:20 PM",
        explanation: {
            whyNow: "It's due today, it's mechanical, and the sprint board already has everything needed to draft it.",
            confidence: "high",
            confidenceReason: "All 14 sprint issues have final states in Jira (refreshed 12 min ago).",
            sources: ["jira"],
            evidence: ["Sprint closed yesterday", "Summary template exists from last sprint"],
            assumptions: ["You still review before it's sent anywhere"],
            consequenceIfIgnored: "A 20-minute task stays on your plate during focus time.",
        },
        steps: [
            step({ description: "Draft sprint summary from the board", targetSystem: "Jira", riskLevel: "low", reversible: true, permissionRequired: null, preview: "A draft lands in your tasks — sending it remains manual." }),
        ],
        status: "suggested",
    });
    // PERSONAL — leave by 5:15 for family commitment + bill reminder
    recs.push({
        id: "rec-family",
        title: `Leave by 5:15 PM for ${SIGNALS.family.title}`,
        summary: "30-min drive; the Q3 review historically overruns 22 minutes.",
        domain: "family", category: "personal",
        urgency: 0.85, impact: 0.8, peopleAffected: 2, financialImpact: 0,
        emotionalImportance: 0.95, estimatedMinutes: 30, reversible: false,
        buddyCanHandle: true, requiredPermission: "reminders.create",
        defaultTime: "5:10 PM",
        explanation: {
            whyNow: "The parent–teacher meeting is at 5:45 PM, the drive takes ~30 minutes, and the 4:15 PM review has overrun by an average of 22 minutes in its last four sessions.",
            confidence: "medium",
            confidenceReason: "Calendar and Maps are fresh, but tonight's traffic estimate uses typical evening data, not live data yet.",
            sources: ["calendar", "maps", "prefs"],
            evidence: ["Q3 review overran 4/4 recent sessions (avg 22 min)", "Drive estimate 30 min at 5:15 PM", "You marked family events as protected"],
            assumptions: ["Evening traffic stays near typical levels"],
            consequenceIfIgnored: "You likely arrive late, or leave the review mid-decision.",
        },
        steps: [
            step({ description: "Set a firm 5:10 PM leave reminder", targetSystem: "Reminders", riskLevel: "low", reversible: true, permissionRequired: "reminders.create", preview: "A private reminder fires at 5:10 PM." }),
        ],
        status: "suggested",
    });
    recs.push({
        id: "rec-bill",
        title: `Schedule the ₹24,560 card payment`,
        summary: "Due in 3 days — 2 days before salary lands. Payment always needs your explicit confirmation.",
        domain: "finance", category: "personal",
        urgency: 0.75, impact: 0.7, peopleAffected: 0, financialImpact: SIGNALS.finance.amount,
        emotionalImportance: 0.5, estimatedMinutes: 3, reversible: false,
        buddyCanHandle: false, requiredPermission: "payments.execute",
        defaultTime: "Today 7:00 PM",
        explanation: {
            whyNow: "The bill is due in 3 days but salary arrives in 5 — paying from the current balance now avoids late fees without waiting on income.",
            confidence: "high",
            confidenceReason: "Due date and expected income date come straight from your bank feed (45 min old).",
            sources: ["bank", "email"],
            evidence: ["Statement due date in 3 days", "Salary credit expected in 5 days", "Late fee on this card: ₹750 + interest"],
            assumptions: ["Current balance covers the bill"],
            consequenceIfIgnored: "₹750 late fee plus interest, and a credit-utilisation spike.",
        },
        steps: [
            step({ description: `Pay ₹24,560 to the card from savings`, targetSystem: "Bank", riskLevel: "high", reversible: false, permissionRequired: "payments.execute", preview: "₹24,560 leaves your savings account. Irreversible. Requires your explicit confirmation — Buddy never auto-pays.", undoAvailable: false }),
        ],
        status: "suggested",
    });
    // Commute (morning) — uses fresh Maps data
    recs.push({
        id: "rec-commute",
        title: "Leave by 8:10 AM via the ring road",
        summary: "Usual route is 21 min slower than normal today.",
        domain: "mobility", category: "prepare",
        urgency: 0.9, impact: 0.6, peopleAffected: 0, financialImpact: 0,
        emotionalImportance: 0.2, estimatedMinutes: 40, reversible: true,
        buddyCanHandle: false, requiredPermission: null,
        defaultTime: "8:10 AM",
        explanation: {
            whyNow: `Traffic on ${SIGNALS.commute.route} is running ${SIGNALS.commute.currentMins} min vs the usual ${SIGNALS.commute.usualMins}, and the 9:00 AM design review is in person.`,
            confidence: "high",
            confidenceReason: "Live Maps data, refreshed 3 minutes ago.",
            sources: ["maps", "calendar"],
            evidence: ["Current estimate 52 min (usual 31)", "Ring road alternative: 40 min", "9:00 AM meeting is at the office"],
            assumptions: ["You leave within the next 20 minutes"],
            consequenceIfIgnored: "You'd arrive ~9:10, missing the start of a meeting you're presenting in.",
        },
        steps: [
            step({ description: "Start navigation on the ring-road route", targetSystem: "Maps", riskLevel: "low", reversible: true, permissionRequired: null, preview: "Navigation opens with the 40-min alternative." }),
        ],
        status: "suggested",
    });
    return recs;
}
export function buildSummary(ctx, recs, conflictsOpen, planState) {
    const meetings = ctx.meetings.length;
    const active = ctx.meetings.filter((m) => m.requiresActiveParticipation).length;
    const critical = ctx.tasks.filter((t) => t.dueToday && (t.priorityHint === "high" || t.blockingPeople > 0)).length;
    const focus = ctx.signals.focusPreference.endMins - ctx.signals.focusPreference.startMins;
    const enabled = recs.filter((r) => !planState.edits[r.id]?.disabled && (r.status === "suggested" || r.status === "accepted"));
    const saved = enabled.filter((r) => r.buddyCanHandle).reduce((s, r) => s + (r.category === "delegate" ? 20 : 10), 0);
    const activePart = active > 0 ? `only ${active} need active participation` : `none strictly need you live`;
    const focusClause = focus > 0
        ? `protect ${ctx.signals.focusPreference.start}–${ctx.signals.focusPreference.end} for focused work`
        : `there's no clear focus window — Buddy will try to carve one out`;
    const familyClause = ctx.signals.family.title
        ? ` Leave by ${ctx.signals.family.time} for ${ctx.signals.family.title}.`
        : "";
    const narrative = meetings > 0
        ? `You have ${meetings} meeting${meetings === 1 ? "" : "s"} today, but ${activePart}. Tackle what's blocking others first, and ${focusClause}.${familyClause}`
        : `A light calendar today — a good chance to ${focusClause} and clear what's due.${familyClause}`;
    return {
        meetings, activeMeetings: active, criticalTasks: critical, conflicts: conflictsOpen,
        focusMins: focus, personalCommitments: 2, estTimeSavedMins: saved,
        updatedAt: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        narrative,
    };
}
export const CATEGORY_LABELS = {
    protect: "Protect", prioritise: "Prioritise", move: "Move",
    prepare: "Prepare", delegate: "Delegate", personal: "Personal",
};
/** Alternative plan: keep vendor demo, split focus, later leave — for comparison. */
export function comparePlans() {
    return [
        { metric: "Focus time", recommended: "2h 15m (one block)", alternative: "1h 30m (two fragments)", better: "recommended" },
        { metric: "Meetings moved", recommended: "1 (optional demo)", alternative: "0", better: "alternative" },
        { metric: "Est. completion of due tasks", recommended: "Likely (~85%)", alternative: "Uncertain (~60%)", better: "recommended" },
        { metric: "Personal conflicts", recommended: "0 — leave 5:15 PM protected", alternative: "1 — family meeting at risk", better: "recommended" },
        { metric: "Expected working hours", recommended: "8.6 h", alternative: "9.4 h", better: "recommended" },
        { metric: "Estimated load", recommended: "Moderate", alternative: "High", better: "recommended" },
        { metric: "People affected", recommended: "1 (vendor organiser)", alternative: "0", better: "alternative" },
        { metric: "Actions needing your approval", recommended: "2", alternative: "1", better: "alternative" },
    ];
}
export const COMPARISON_CAVEAT = "Estimates, not guarantees — completion odds are rough reads from similar past days.";
