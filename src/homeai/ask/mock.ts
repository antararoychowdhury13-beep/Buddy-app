/** The single coherent Project Phoenix scenario. All Ask Buddy views derive
 * from this — consistent people, dates, decisions and action items. */
import type {
  ActionItem, Assumption, ConsentRecord, Decision, Meeting, MomDocument,
  OpenQuestion, Participant, PlanStep, User,
} from "./models.js";

export const PALETTE = {
  indigo: "#4B5BD7", violet: "#6A5CFF", green: "#22B07D", amber: "#E8963A",
  red: "#E14D6E", slate: "#5A6072", blue: "#2F6BFF",
};

export const USER: User = {
  id: "u-antara", name: "Antara Roychowdhury", role: "Design Manager",
  email: "antara@company.com", initials: "AR",
};

export const PARTICIPANTS: Participant[] = [
  { id: "p-antara", name: "Antara Roychowdhury", role: "Design Manager", org: "internal", consent: "consented", initials: "AR", color: PALETTE.indigo },
  { id: "p-ananya", name: "Ananya Sen", role: "Product Designer", org: "internal", consent: "consented", initials: "AS", color: PALETTE.violet },
  { id: "p-rahul", name: "Rahul Mehta", role: "Engineering Lead", org: "internal", consent: "consented", initials: "RM", color: PALETTE.blue },
  { id: "p-priya", name: "Priya Nair", role: "Accessibility Specialist", org: "internal", consent: "consented", initials: "PN", color: PALETTE.green },
  { id: "p-david", name: "David Miller", role: "Product Manager", org: "internal", consent: "consented", initials: "DM", color: PALETTE.indigo },
  { id: "p-elena", name: "Elena Rossi", role: "Client Partner", org: "internal", consent: "pending", initials: "ER", color: PALETTE.amber },
  { id: "p-mark", name: "Mark Taylor", role: "External Vendor", org: "external", consent: "not_required", initials: "MT", color: PALETTE.slate },
  { id: "p-sarah", name: "Sarah Chen", role: "External Vendor", org: "external", consent: "not_required", initials: "SC", color: PALETTE.slate },
];

export const MEETING: Meeting = {
  id: "m-phoenix", title: "Project Phoenix Weekly Review", date: "19 July 2026",
  durationMins: 48, platform: "Microsoft Teams", scope: "Work → Project Phoenix",
  participants: PARTICIPANTS, state: "upcoming",
};

export const CONSENT: ConsentRecord = {
  purpose: "Capture decisions and action items to draft the Minutes of Meeting.",
  captured: ["Audio transcript", "Speaker labels", "Decisions & action items", "Timestamps of important moments"],
  retentionDays: 30,
  orgPolicy: "Meeting capture is permitted for internal reviews with participant notice. External guests are notified, not recorded individually.",
  accessScope: "Recording & transcript: internal Project Phoenix members only.",
  alternatives: ["Notes-only (no audio kept)", "Off-record segments you can toggle live", "Decline — Buddy will not capture anything"],
  path: null,
};

export const DECISIONS: Decision[] = [
  { id: "d1", text: "Beta launch moved to 28 August.", confidence: "high", corrected: "Initially heard as 18 August — corrected to 28 August during review." },
  { id: "d2", text: "Accessibility testing must finish before the stakeholder review.", confidence: "high" },
  { id: "d3", text: "The revised onboarding flow will use the simplified three-step structure.", confidence: "high" },
  { id: "d4", text: "External vendors receive only client-safe meeting notes.", confidence: "high" },
];

export const ACTION_ITEMS: ActionItem[] = [
  { id: "a1", title: "Revise onboarding flow", owner: "Ananya Sen", ownerId: "p-ananya", due: "24 Jul", destination: "Jira", confidence: "high", confirmed: true, transcriptRef: "00:14:20" },
  { id: "a2", title: "Confirm API readiness", owner: "Rahul Mehta", ownerId: "p-rahul", due: "28 Jul", destination: "Jira", confidence: "high", confirmed: true, transcriptRef: "00:22:05" },
  { id: "a3", title: "Share accessibility checklist", owner: "Priya Nair", ownerId: "p-priya", due: "23 Jul", destination: "Jira", confidence: "review_suggested", confirmed: false, transcriptRef: "00:31:47" },
  { id: "a4", title: "Update stakeholder presentation", owner: "Antara Roychowdhury", ownerId: "p-antara", due: "25 Jul", destination: "Jira", confidence: "high", confirmed: true, transcriptRef: "00:38:12" },
  { id: "a5", title: "Book stakeholder review", owner: "Buddy", ownerId: "u-buddy", due: "25 Jul", destination: "Outlook", confidence: "high", confirmed: true, transcriptRef: "00:44:30" },
];

export const OPEN_QUESTIONS: OpenQuestion[] = [
  { id: "q1", text: "Who owns the final security review?" },
];

export function buildMom(): MomDocument {
  return {
    meetingId: MEETING.id,
    sections: [
      { id: "s-purpose", title: "Purpose", body: "Weekly review of Project Phoenix delivery: launch readiness, accessibility, onboarding, and vendor alignment.", confidential: false, editable: true },
      { id: "s-summary", title: "Executive summary", body: "The team confirmed the beta launch shift to 28 August, agreed accessibility testing must precede stakeholder review, and locked the simplified three-step onboarding. Vendors will receive client-safe notes only.", confidential: false, editable: true },
      { id: "s-discussion", title: "Discussion themes", body: "Launch timing and dependency risk; accessibility gating; onboarding simplification; vendor communications boundary.", confidential: false, editable: true },
      { id: "s-budget", title: "Budget discussion", body: "Q3 design tooling budget is 12% over; a reforecast is due before the next finance sync.", confidential: true, editable: true },
      { id: "s-staffing", title: "Staffing constraints", body: "One accessibility contractor rolls off on 5 August; backfill not yet approved.", confidential: true, editable: true },
      { id: "s-vendor", title: "Vendor negotiation notes", body: "Vendor rate card under renegotiation; do not share the target reduction externally.", confidential: true, editable: true },
      { id: "s-next", title: "Next meeting", body: "26 July 2026, 3:00 PM — same Teams link. Agenda: accessibility sign-off and stakeholder-review prep.", confidential: false, editable: true },
    ],
    decisions: DECISIONS.map((d) => ({ ...d })),
    actionItems: ACTION_ITEMS.map((a) => ({ ...a })),
    openQuestions: OPEN_QUESTIONS.map((q) => ({ ...q })),
  };
}

export const ASSUMPTIONS: Assumption[] = [
  { id: "as1", text: "Use Antara's work email · reminders 24h before deadlines", editable: true },
  { id: "as2", text: "Add Jira tasks to the current sprint (Sprint 24)", editable: true },
  { id: "as3", text: "Share the recording with internal employees only", editable: true },
  { id: "as4", text: "Retain the recording for 30 days", editable: true },
];

export function buildPlan(): PlanStep[] {
  const s = (o: Partial<PlanStep> & Pick<PlanStep, "id" | "title" | "application" | "risk" | "riskLabel" | "reversible" | "reversibleLabel" | "permission">): PlanStep => ({
    description: "", target: "", enabled: true, status: "queued", approvalRequired: false,
    sideEffects: [], dependencies: [], ...o,
  });
  return [
    s({ id: "st-internal", title: "Send internal MOM to 6 employees", description: "Full-detail minutes including budget, staffing and recording links.", application: "Outlook", target: "6 internal recipients", risk: "medium", riskLabel: "External send", reversible: "partially_reversible", reversibleLabel: "Recall within 10 min", permission: "Send email as Antara", approvalRequired: true, sideEffects: ["Notifies 6 people", "Includes confidential sections"] }),
    s({ id: "st-external", title: "Send client-safe MOM to 2 vendors", description: "Client-safe minutes — budget, staffing and vendor-negotiation notes removed, no recording link.", application: "Outlook", target: "2 external vendors", risk: "high", riskLabel: "External send", reversible: "irreversible", reversibleLabel: "Not reversible once sent", permission: "Send email to external recipients", approvalRequired: true, sideEffects: ["Notifies 2 external vendors", "Confidential sections auto-removed"] }),
    s({ id: "st-create", title: "Create 4 Jira tasks", description: "One task per confirmed action item, added to Sprint 24.", application: "Jira", target: "Project Phoenix · Sprint 24", risk: "low", riskLabel: "Creates", reversible: "fully_reversible", reversibleLabel: "Reversible — delete tasks", permission: "Create issues in Project Phoenix", approvalRequired: false, dependencies: [], sideEffects: ["Adds to Sprint 24"] }),
    s({ id: "st-assign", title: "Assign tasks to confirmed owners", description: "Assign each task and notify the owner. Priya's access will be checked.", application: "Jira", target: "4 owners", risk: "medium", riskLabel: "Notifies", reversible: "fully_reversible", reversibleLabel: "Reversible — unassign", permission: "Assign issues & notify", approvalRequired: false, dependencies: ["st-create"], sideEffects: ["4 owners notified"] }),
    s({ id: "st-refs", title: "Add deadlines & transcript references", description: "Set due dates and link each task to its transcript moment.", application: "Jira", target: "4 tasks", risk: "low", riskLabel: "Updates", reversible: "fully_reversible", reversibleLabel: "Reversible", permission: "Edit issues", approvalRequired: false, dependencies: ["st-create"], sideEffects: ["No notifications"] }),
    s({ id: "st-timeline", title: "Update Project Phoenix timeline", description: "Shift the beta milestone from 26 Aug to 28 Aug and recompute dependents.", application: "Project timeline", target: "Beta milestone", risk: "medium", riskLabel: "Updates", reversible: "fully_reversible", reversibleLabel: "Reversible — revert milestone", permission: "Edit project timeline", approvalRequired: true, dependencies: [], sideEffects: ["PM notified of +2 day shift", "Affects 2 dependent milestones"] }),
    s({ id: "st-schedule", title: "Schedule the stakeholder review", description: "Book a 45-min review on 25 Jul with the internal group.", application: "Outlook", target: "6 attendees", risk: "low", riskLabel: "Creates", reversible: "fully_reversible", reversibleLabel: "Reversible — cancel event", permission: "Create calendar events", approvalRequired: false, dependencies: [], sideEffects: ["6 attendees invited"] }),
    s({ id: "st-remind", title: "Remind owners 24h before deadlines", description: "Set standing reminders for each task owner.", application: "Buddy monitor", target: "4 owners", risk: "low", riskLabel: "Monitors", reversible: "fully_reversible", reversibleLabel: "Reversible — turn off", permission: "Send reminders", approvalRequired: false, dependencies: ["st-create"], sideEffects: ["Standing reminders"] }),
    s({ id: "st-overdue", title: "Notify Antara when an action becomes overdue", description: "Escalate any overdue task to you with suggested next steps.", application: "Buddy monitor", target: "You", risk: "low", riskLabel: "Monitors", reversible: "fully_reversible", reversibleLabel: "Reversible — turn off", permission: "Send you notifications", approvalRequired: false, dependencies: ["st-create"], sideEffects: ["Notifies you only"] }),
  ];
}

export const PRIMARY_COMMAND =
  "Buddy, record this meeting, prepare the MOM, send after I approve, create Jira tasks for every action item, update the project timeline and follow up with owners before their deadlines.";
