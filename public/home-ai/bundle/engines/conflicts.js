import { minsToClock } from "../mock.js";
let seq = 0;
const sid = () => `cstep-${++seq}`;
function step(p) {
    return { id: sid(), executionStatus: "suggested", undoAvailable: p.undoAvailable ?? p.reversible, ...p };
}
function opt(id, label, impact, tradeoff, risk, perm, steps) {
    return { id, label, impact, tradeoff, riskLevel: risk, permissionRequired: perm, steps };
}
export function detectConflicts(ctx) {
    const MEETINGS = ctx.meetings;
    const SIGNALS = ctx.signals;
    const out = [];
    // RULE 1 — meeting overrun endangers a personal commitment (family)
    const review = MEETINGS.find((m) => m.id === "m5");
    const leaveBy = SIGNALS.family.timeMins - SIGNALS.family.travelMins; // 5:45 - 30 = 5:15
    if (review && SIGNALS.family.title && review.endMins + review.avgOverrunMins > leaveBy) {
        out.push({
            id: "c-family", rule: "meeting_overrun_vs_personal",
            title: "Q3 review may overrun into your family pickup",
            description: `Your project review ends at ${review.end}, but you need to leave by ${minsToClock(leaveBy)} for ${SIGNALS.family.title}. This meeting has overrun by an average of ${review.avgOverrunMins} minutes across its last four sessions.`,
            domains: ["work", "family"], severity: "high",
            peopleAffected: SIGNALS.family.people, resolutionDeadline: "Before 4:15 PM",
            recommended: opt("A", "Move the review to 3:30 PM", "All six attendees appear free at 3:30 PM.", "Shifts your afternoon focus block 45 min earlier.", "medium", "calendar.move_internal", [step({ description: "Propose 3:30 PM to the 6 attendees", targetSystem: "Calendar", riskLevel: "medium", reversible: true, permissionRequired: "calendar.move_internal", preview: "A reschedule proposal goes to all attendees; nothing changes until they accept." })]),
            alternative: opt("B", "Keep 4:15 PM and leave after the first 20 minutes", "You attend the opening but may miss the final decision.", "You could miss the go/no-go call on Q3 scope.", "low", "reminders.create", [step({ description: "Set a hard 4:55 PM leave alert", targetSystem: "Reminders", riskLevel: "low", reversible: true, permissionRequired: "reminders.create", preview: "A private alert fires at 4:55 PM so you can leave on time." })]),
            confidence: "medium",
            confidenceReason: "Overrun history is strong, but tonight's traffic uses typical, not live, data.",
            sources: ["calendar", "maps", "prefs"], status: "open",
        });
    }
    // RULE 2 — time overlap (family pickup vs 1:1)
    const oneOnOne = MEETINGS.find((m) => m.id === "m6");
    if (oneOnOne && SIGNALS.family.title && oneOnOne.startMins < SIGNALS.family.timeMins && oneOnOne.endMins > SIGNALS.family.timeMins - SIGNALS.family.travelMins) {
        out.push({
            id: "c-overlap", rule: "time_overlap",
            title: "1:1 with Priya overlaps your family commitment",
            description: `Your 1:1 (${oneOnOne.start}–${oneOnOne.end}) runs straight into ${SIGNALS.family.title} at ${SIGNALS.family.time}. You can't be in both.`,
            domains: ["calendar", "family"], severity: "high",
            peopleAffected: ["Priya", ...SIGNALS.family.people], resolutionDeadline: "Before 3:00 PM",
            recommended: opt("A", "Move the 1:1 to tomorrow 10:00 AM", "Priya has an open 10:00 AM slot tomorrow.", "Delays the 1:1 by a day.", "medium", "calendar.move_internal", [step({ description: "Propose tomorrow 10:00 AM to Priya", targetSystem: "Calendar", riskLevel: "medium", reversible: true, permissionRequired: "calendar.move_internal", preview: "Priya gets a reschedule proposal for 10:00 AM tomorrow." })]),
            alternative: opt("B", "Shorten the 1:1 to 15 min and start at 5:15 PM", "You keep it today but with less time.", "Less room to cover Priya's growth topics.", "medium", "calendar.move_internal", [step({ description: "Trim the 1:1 to 5:15–5:30 PM", targetSystem: "Calendar", riskLevel: "medium", reversible: true, permissionRequired: "calendar.move_internal", preview: "The 1:1 shrinks to 15 minutes starting 5:15 PM." })]),
            confidence: "high", confidenceReason: "Both events are confirmed on your calendar (refreshed 4 min ago).",
            sources: ["calendar", "prefs"], status: "open",
        });
    }
    // RULE 3 — insufficient travel time (heavy commute before in-person meeting)
    if (SIGNALS.commute.heavy) {
        out.push({
            id: "c-commute", rule: "insufficient_travel_time",
            title: "Heavy traffic threatens your 9:00 AM in-person meeting",
            description: `${SIGNALS.commute.route} is ${SIGNALS.commute.currentMins} min right now vs a usual ${SIGNALS.commute.usualMins}. To reach the 9:00 AM design review on time you'd need to leave in the next 20 minutes.`,
            domains: ["mobility", "work"], severity: "medium",
            peopleAffected: ["5 attendees"], resolutionDeadline: "8:10 AM",
            recommended: opt("A", "Take the ring road and leave by 8:10 AM", "Ring road is ~40 min — arrives with a buffer.", "Slightly longer distance, tolls apply.", "low", null, [step({ description: "Start ring-road navigation", targetSystem: "Maps", riskLevel: "low", reversible: true, permissionRequired: null, preview: "Navigation opens on the 40-min route." })]),
            alternative: opt("B", "Join the first 15 minutes remotely, then travel", "You don't miss the opening.", "You're not in the room for the hands-on review.", "low", "reminders.create", [step({ description: "Add a Teams-join reminder for 8:55 AM", targetSystem: "Reminders", riskLevel: "low", reversible: true, permissionRequired: "reminders.create", preview: "A reminder to join remotely fires at 8:55 AM." })]),
            confidence: "high", confidenceReason: "Live Maps data refreshed 3 minutes ago.",
            sources: ["maps", "calendar"], status: "open",
        });
    }
    // RULE 4 — bill due before income
    if (SIGNALS.finance.dueInDays < SIGNALS.finance.incomeInDays) {
        out.push({
            id: "c-bill", rule: "bill_before_income",
            title: "Card bill is due before your salary arrives",
            description: `Your ${SIGNALS.finance.bill} of ₹${SIGNALS.finance.amount.toLocaleString("en-IN")} is due in ${SIGNALS.finance.dueInDays} days, but salary lands in ${SIGNALS.finance.incomeInDays}. Paying from the current balance avoids a late fee.`,
            domains: ["finance"], severity: "medium",
            peopleAffected: [], resolutionDeadline: `In ${SIGNALS.finance.dueInDays} days`,
            recommended: opt("A", "Pay ₹24,560 now from savings", "Avoids the ₹750 late fee and keeps utilisation low.", "Reduces savings buffer for 2 days until salary.", "high", "payments.execute", [step({ description: "Pay ₹24,560 to the card", targetSystem: "Bank", riskLevel: "high", reversible: false, permissionRequired: "payments.execute", preview: "₹24,560 leaves savings immediately. Irreversible — needs your explicit confirmation.", undoAvailable: false })]),
            alternative: opt("B", "Pay the minimum now, rest after salary", "Keeps more cash on hand this week.", "Interest accrues on the carried balance.", "high", "payments.execute", [step({ description: "Pay the ₹2,400 minimum now", targetSystem: "Bank", riskLevel: "high", reversible: false, permissionRequired: "payments.execute", preview: "₹2,400 leaves savings. Interest applies to the remaining ₹22,160. Needs explicit confirmation.", undoAvailable: false })]),
            confidence: "high", confidenceReason: "Due date and income date come from your bank feed (45 min old).",
            sources: ["bank", "email"], status: "open",
        });
    }
    // RULE 5 — high workload after poor sleep
    if (SIGNALS.sleep.quality === "poor" && MEETINGS.length >= 6) {
        out.push({
            id: "c-load", rule: "high_load_low_sleep",
            title: "A packed day after only 5h 40m of sleep",
            description: `You slept ${SIGNALS.sleep.hours}h (poor) and have ${MEETINGS.length} meetings today. Back-to-back calls on low sleep tend to hurt your afternoon focus.`,
            domains: ["health", "work"], severity: "medium",
            peopleAffected: [], resolutionDeadline: "Set by noon",
            recommended: opt("A", "Auto-decline the optional demo and add two 10-min breaks", "Trims the day and spaces out the load.", "You skip a non-essential vendor demo.", "medium", "calendar.move_internal", [step({ description: "Decline the optional vendor demo and insert breaks at 10:45 & 3:15", targetSystem: "Calendar", riskLevel: "medium", reversible: true, permissionRequired: "calendar.move_internal", preview: "The optional demo is declined; two 10-min breaks appear. Reversible." })]),
            alternative: opt("B", "Keep everything, switch Home to High-stress mode", "Reduces visual load without touching the calendar.", "The day stays dense; only the UI calms down.", "low", null, [step({ description: "Switch Home to High-stress mode", targetSystem: "Buddy", riskLevel: "low", reversible: true, permissionRequired: null, preview: "Home shows only your 3 most critical cards and mutes low-priority nudges." })]),
            confidence: "low", confidenceReason: "Health data is 9 hours stale, so the sleep read is only indicative.",
            sources: ["health", "calendar"], status: "open",
        });
    }
    // RULE 6 — focus block collides with a project dependency deadline
    if (SIGNALS.projectRisk.blockedTasks > 0) {
        out.push({
            id: "c-dep", rule: "focus_vs_dependency",
            title: "Focus block overlaps a blocking dependency",
            description: `Your 3:00 PM focus block is when you'd normally clear BUD-231, but ${SIGNALS.projectRisk.blockedTasks} teammates are already waiting on it. Doing focus work first risks holding them up further.`,
            domains: ["work", "tasks"], severity: "low",
            peopleAffected: ["2 teammates"], resolutionDeadline: "Before 3:00 PM",
            recommended: opt("A", "Do BUD-231 before 11 AM, keep focus block for the rest", "Unblocks teammates early; focus block stays intact.", "Your morning gets tighter.", "low", "calendar.block_focus", [step({ description: "Reserve 9:50–10:35 AM for BUD-231", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "A 45-min hold appears before the 11 AM sync." })]),
            alternative: opt("B", "Split the focus block: dependency first, deep work after", "Everything fits in the afternoon.", "Teammates wait until ~3:45 PM.", "low", "calendar.block_focus", [step({ description: "Split 3:00–5:15 into 3:00–3:45 (BUD-231) + 3:45–5:15 (deep work)", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "The focus block splits into two labelled segments." })]),
            confidence: "medium", confidenceReason: "Based on Jira blocker links and your focus preference.",
            sources: ["jira", "prefs"], status: "open",
        });
    }
    return out;
}
