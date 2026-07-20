/**
 * One coherent sample day for the Today module — same people, times,
 * projects and deadlines as the Home module, matching the Buddy Today.html
 * reference. Every card derives from these structures.
 */
import type {
  AdapterStatus, MeetingBrief, RecoveryPlan, ScheduleSuggestion, TaskPlan, TimelineBlock,
} from "../types/today";

export function minsToClock(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}
export function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

let sq = 0;
const sid = () => `t-step-${++sq}`;
function step(p: { description: string; targetSystem: string; riskLevel: "low" | "medium" | "high"; reversible: boolean; permissionRequired: string | null; preview: string; draftMessage?: string }) {
  return { id: sid(), executionStatus: "suggested" as const, undoAvailable: p.reversible, ...p };
}

// ---- mock integration adapters ----
export const ADAPTERS: AdapterStatus[] = [
  { id: "calendar", label: "Calendar", connected: true, lastSyncMins: 3, stale: false, scope: "Read/write events" },
  { id: "jira", label: "Jira", connected: true, lastSyncMins: 11, stale: false, scope: "Read issues, blockers" },
  { id: "teams", label: "Teams", connected: true, lastSyncMins: 8, stale: false, scope: "Read mentions, presence" },
  { id: "email", label: "Email", connected: true, lastSyncMins: 20, stale: false, scope: "Read flags, subjects" },
  { id: "figma", label: "Figma", connected: true, lastSyncMins: 15, stale: false, scope: "Read file changes" },
  { id: "drive", label: "Drive", connected: false, lastSyncMins: 0, stale: false, scope: "Not connected" },
  { id: "maps", label: "Maps", connected: true, lastSyncMins: 2, stale: false, scope: "Read traffic ETA" },
  { id: "health", label: "Wellbeing", connected: false, lastSyncMins: 0, stale: false, scope: "Off until you enable it" },
];

// ---- timeline (typed blocks) ----
export function buildTimeline(): TimelineBlock[] {
  const b = (o: Partial<TimelineBlock> & Pick<TimelineBlock, "id" | "type" | "title" | "sub" | "startMins" | "endMins">): TimelineBlock => ({
    start: minsToClock(o.startMins), attendance: "required", flexibility: "fixed",
    overrunMins: 0, travelMins: 0, prepMins: 0, actions: [], ...o,
  });
  return [
    b({ id: "e-travel", type: "travel", title: "Drive to office", sub: "Heavy traffic · ring road", startMins: 495, endMins: 540, flexibility: "movable", travelMins: 45, app: "Maps", actions: ["View", "Add travel"] }),
    b({ id: "m1", type: "meeting", title: "Design Review", sub: "PowerVC 2.0 · Teams · needs you", startMins: 540, endMins: 585, attendance: "active", app: "Teams", actions: ["View", "Brief me", "Join meeting"] }),
    b({ id: "m2", type: "meeting", title: "Stakeholder Sync", sub: "Usually overruns · 10-min buffer added", startMins: 660, endMins: 690, attendance: "active", overrunMins: 25, app: "Teams", actions: ["View", "Brief me", "Resolve conflict"] }),
    b({ id: "buf1", type: "buffer", title: "Buffer", sub: "Protects your next block", startMins: 690, endMins: 700, flexibility: "flexible", actions: [] }),
    b({ id: "m3", type: "meeting", title: "Vendor Demo", sub: "Optional · recording offered", startMins: 720, endMins: 750, attendance: "optional", flexibility: "movable", app: "Zoom", actions: ["View", "Mark optional", "Ask Buddy to move"] }),
    b({ id: "lunch", type: "break", title: "Lunch", sub: "Protected hour", startMins: 780, endMins: 840, flexibility: "flexible", actions: ["Protect"] }),
    b({ id: "m4", type: "meeting", title: "Roadmap Review", sub: "Zoom · deck lags fresh data", startMins: 870, endMins: 915, attendance: "required", app: "Zoom", actions: ["View", "Brief me", "Add preparation"] }),
    b({ id: "focus", type: "focus", title: "Focus block", sub: "Deep work · API review", startMins: 900, endMins: 1035, flexibility: "flexible", actions: ["Protect", "Delegate"] }),
    b({ id: "m5", type: "meeting", title: "Project Review — Q3", sub: "Overruns ~22 min · leave by 5:15", startMins: 975, endMins: 1020, app: "Teams", overrunMins: 22, conflict: true, actions: ["View", "Resolve conflict"] }),
    b({ id: "personal", type: "personal", title: "Aarav's parent–teacher meeting", sub: "5:45 PM · 30-min drive · protect", startMins: 1065, endMins: 1125, flexibility: "fixed", attendance: "required", actions: ["Protect", "Add travel"] }),
  ];
}

// ---- schedule optimisation suggestions ----
export function buildSuggestions(): ScheduleSuggestion[] {
  return [
    {
      id: "s-focus", type: "protect_focus", title: "Protect 3:00–5:15 PM for focused work",
      reason: "Your only unbroken window today, and the API review needs ~45 min of quiet time.",
      impact: "+1h 10m focus · raises task completion ~24 points",
      originalTime: "Unprotected", proposedTime: "3:00–5:15 PM held", affectedPeople: [],
      confidence: "high", confidenceReason: "From your calendar (3 min old) and saved focus preference.",
      sources: ["calendar", "prefs"], reversible: true, riskLevel: "low", permissionRequired: "calendar.block_focus",
      minutesRecovered: 70, safe: true, status: "suggested",
      steps: [step({ description: "Hold 3:00–5:15 PM as a private focus block", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "A private block appears; others see you as busy." })],
    },
    {
      id: "s-buffer", type: "add_buffer", title: "Add a 10-min buffer after the Stakeholder Sync",
      reason: "That meeting has overrun by an average of 25 minutes across its last four sessions.",
      impact: "Prevents a knock-on delay into your afternoon",
      originalTime: "11:30 AM hard stop", proposedTime: "10-min buffer to 11:40", affectedPeople: [],
      confidence: "high", confidenceReason: "Overrun history from your calendar.",
      sources: ["calendar"], reversible: true, riskLevel: "low", permissionRequired: "calendar.block_focus",
      minutesRecovered: 0, safe: true, status: "suggested",
      steps: [step({ description: "Insert a 10-min buffer after the 11 AM sync", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "A short buffer block appears at 11:30 AM." })],
    },
    {
      id: "s-vendor", type: "move_optional", title: "Move the optional vendor demo to Thursday",
      reason: "It's marked optional, the recording is offered, and moving it opens a prep hour.",
      impact: "Frees 30 min · one external person notified",
      originalTime: "12:00 PM today", proposedTime: "Thu 12:00 PM", affectedPeople: ["Vendor organiser"],
      confidence: "medium", confidenceReason: "Organiser offered alternates by email; Thursday not yet confirmed.",
      sources: ["calendar", "email"], reversible: true, riskLevel: "medium", permissionRequired: "calendar.move_internal",
      minutesRecovered: 30, safe: false, status: "suggested",
      steps: [step({ description: "Propose Thursday 12:00 PM to the organiser", targetSystem: "Calendar", riskLevel: "medium", reversible: true, permissionRequired: "calendar.move_internal", preview: "The organiser gets a reschedule proposal; nothing moves until they accept.", draftMessage: "Hi — could we move today's demo to Thursday 12:00 PM? I want to give it proper attention. Happy to take the recording if that's easier." })],
    },
    {
      id: "s-prep", type: "add_prep", title: "Add a 30-min prep block before the Roadmap Review",
      reason: "The deck's slides 6–7 lag the latest delivery dates; a short prep avoids live corrections.",
      impact: "9 attendees see current data",
      originalTime: "No prep", proposedTime: "1:30–2:00 PM prep", affectedPeople: [],
      confidence: "high", confidenceReason: "Jira delivery dates vs the deck's last-modified time.",
      sources: ["jira", "calendar"], reversible: true, riskLevel: "low", permissionRequired: "calendar.block_focus",
      minutesRecovered: 0, safe: true, status: "suggested",
      steps: [step({ description: "Reserve 1:30–2:00 PM to refresh the deck", targetSystem: "Calendar", riskLevel: "low", reversible: true, permissionRequired: "calendar.block_focus", preview: "A 30-min prep hold appears before the 2:30 review." })],
    },
    {
      id: "s-delegate", type: "delegate", title: "Let Buddy draft the sprint summary",
      reason: "It's due today, it's mechanical, and the board has everything needed to draft it.",
      impact: "Saves ~20 min of focus time",
      originalTime: "On your list", proposedTime: "Buddy drafts, you review", affectedPeople: [],
      confidence: "high", confidenceReason: "All sprint issues have final states in Jira.",
      sources: ["jira"], reversible: true, riskLevel: "low", permissionRequired: null,
      minutesRecovered: 20, safe: true, status: "suggested",
      steps: [step({ description: "Draft the sprint summary from the board", targetSystem: "Jira", riskLevel: "low", reversible: true, permissionRequired: null, preview: "A draft lands in your tasks — sending stays manual." })],
    },
  ];
}

// ---- meeting brief (Stakeholder Sync) ----
export const MEETING_BRIEF: MeetingBrief = {
  meetingId: "m2", title: "Stakeholder Sync", time: "11:00 AM",
  objective: "Align leadership on the PowerVC delivery timeline and surface the API delay early.",
  glance: "4 stakeholders, 30 min. The PowerVC API delay (4 days) will likely come up — Buddy drafted a 3-line status and two questions.",
  attendees: [
    { name: "Rohan Mehta", role: "VP Engineering", context: "Owns the delivery commitment; prefers numbers over narrative." },
    { name: "Sara Kapoor", role: "Product Lead", context: "Asked twice this week about the API date." },
    { name: "Dan Osei", role: "Delivery Manager", context: "Tracks the risk log; will want a mitigation." },
    { name: "You", role: "Design & Eng liaison", context: "Bridging design and the backend timeline." },
  ],
  previousSummary: "Last sync agreed to hold the launch date and revisit if the API slipped more than 2 days.",
  previousDecisions: ["Launch date held at 24 Jul", "API owner to flag any slip >2 days"],
  unresolvedActions: ["You: confirm design sign-off (done)", "Backend: publish revised API ETA (now +4 days)"],
  relevantSignals: [
    { source: "jira", note: "BUD-231 blocker links now show a 4-day slip on the API." },
    { source: "email", note: "Sara flagged the API date in a thread this morning (subject only)." },
    { source: "teams", note: "1 mention in #powervc-launch about the timeline." },
  ],
  predictedRisks: ["Leadership asks whether launch still holds", "Pressure to commit a firm new API date live"],
  recommendedQuestions: ["Can the backend team commit to the +4-day ETA, or is it still moving?", "Do we hold the launch or add a small buffer now?"],
  recommendedPosition: "Hold the launch, add a 2-day internal buffer, and bring the firm API ETA to the next sync — don't commit a hard date live without the backend team's confirmation.",
  missingInformation: "The backend team's confirmed (not estimated) API ETA.",
  confidence: "medium",
  confidenceReason: "Strong Jira + email signals, but the firm API date is still missing — so treat the position as provisional.",
  sources: ["jira", "email", "teams", "calendar"],
  lastUpdated: "8 min ago",
  verbalTranscript: [
    { t: 0, text: "Quick brief for your 11 AM Stakeholder Sync." },
    { t: 3, text: "Four people, thirty minutes. The main thing: the PowerVC API has slipped four days." },
    { t: 8, text: "Sara and Rohan will both want to know if the launch still holds." },
    { t: 12, text: "My suggestion — hold the launch, add a two-day buffer, and promise a firm API date at the next sync." },
    { t: 17, text: "You're missing the backend team's confirmed date, so keep it provisional. That's it — you're set." },
  ],
};

// ---- task decomposition (Review API spec) ----
export function buildTaskPlan(clarified: boolean): TaskPlan {
  return {
    taskId: "t1", title: "Review API spec (BUD-231)",
    objective: "Assess the revised PowerVC API spec and unblock two teammates.",
    expectedOutput: clarified ? "Written comments + a go/no-go risk call" : "",
    assumptions: ["The revised spec is the latest version in Confluence"],
    missingInformation: clarified ? [] : ["What should this review produce — approval, written comments, a risk assessment, or a summary?"],
    estimatedMinutes: 45, peopleBlocked: 2, clarified,
    steps: [
      { id: "k1", title: "Identify changed sections", description: "Diff the revised spec against the last approved version.", estimatedMinutes: 8, requiredSource: "Confluence", buddyCapability: "buddy_first_pass", userJudgementRequired: false, owner: "buddy", status: "todo", output: "" },
      { id: "k2", title: "Compare with last approved version", description: "Flag anything that changes an agreed contract.", estimatedMinutes: 6, requiredSource: "Confluence", buddyCapability: "buddy_first_pass", userJudgementRequired: false, owner: "buddy", status: "todo", output: "" },
      { id: "k3", title: "Highlight UX risks", description: "Note anywhere the API shape forces awkward UI.", estimatedMinutes: 8, requiredSource: null, buddyCapability: "buddy_assist", userJudgementRequired: true, owner: "you", status: "todo", output: "" },
      { id: "k4", title: "Highlight delivery risks", description: "Cross-check against the 4-day slip and downstream tasks.", estimatedMinutes: 6, requiredSource: "jira", buddyCapability: "buddy_assist", userJudgementRequired: true, owner: "you", status: "todo", output: "" },
      { id: "k5", title: "Review error & empty states", description: "Check the spec covers failure and empty responses.", estimatedMinutes: 7, requiredSource: null, buddyCapability: "buddy_assist", userJudgementRequired: true, owner: "you", status: "todo", output: "" },
      { id: "k6", title: "Draft comments", description: "Turn findings into clear, actionable comments.", estimatedMinutes: 6, requiredSource: null, buddyCapability: "buddy_first_pass", userJudgementRequired: false, owner: "buddy", status: "todo", output: "" },
      { id: "k7", title: "Identify blocked colleagues", description: "Name the two teammates waiting and what unblocks them.", estimatedMinutes: 2, requiredSource: "jira", buddyCapability: "buddy_first_pass", userJudgementRequired: false, owner: "buddy", status: "todo", output: "" },
      { id: "k8", title: "Submit feedback", description: "Post the review and notify the blocked teammates.", estimatedMinutes: 2, requiredSource: null, buddyCapability: "user_only", userJudgementRequired: true, owner: "you", status: "todo", output: "" },
    ],
  };
}

// ---- recovery plans (triggered by 25-min overrun) ----
export function buildRecoveryPlans(): RecoveryPlan[] {
  const s = (description: string, targetSystem: string, riskLevel: "low" | "medium" | "high", reversible: boolean, permissionRequired: string | null, preview: string, draftMessage?: string) =>
    step({ description, targetSystem, riskLevel, reversible, permissionRequired, preview, draftMessage });
  return [
    {
      id: "r-lunch", name: "Protect lunch", trigger: "Stakeholder Sync overran 25 min",
      description: "Keep your lunch hour intact and move the sprint summary to tomorrow morning.",
      commitmentsProtected: ["Lunch", "Aarav's pickup"], commitmentsMoved: ["Sprint summary → tomorrow 9:30 AM"],
      peopleAffected: [], personalImpact: "Family pickup stays safe.", expectedFinish: "6:15 PM",
      completionBand: "Likely (~78%)", confidence: "high", permissionRequired: "calendar.block_focus",
      steps: [s("Move the sprint summary hold to tomorrow 9:30 AM", "Calendar", "low", true, "calendar.block_focus", "The sprint-summary block moves to tomorrow morning. Reversible.")],
    },
    {
      id: "r-deliver", name: "Protect deliverables", trigger: "Stakeholder Sync overran 25 min",
      description: "Shorten lunch by 10 minutes and keep the sprint summary today.",
      commitmentsProtected: ["Sprint summary", "Aarav's pickup"], commitmentsMoved: ["Lunch −10 min"],
      peopleAffected: [], personalImpact: "Family pickup stays safe; lunch is a bit shorter.", expectedFinish: "6:20 PM",
      completionBand: "Likely (~81%)", confidence: "high", permissionRequired: "calendar.block_focus",
      steps: [s("Trim lunch to 50 min and keep the sprint block today", "Calendar", "low", true, "calendar.block_focus", "Lunch shortens by 10 min; the sprint block stays this afternoon.")],
    },
    {
      id: "r-delegate", name: "Delegate to Buddy", trigger: "Stakeholder Sync overran 25 min",
      description: "Buddy drafts the sprint summary from the board; you review it later.",
      commitmentsProtected: ["Lunch", "Focus block", "Aarav's pickup"], commitmentsMoved: [],
      peopleAffected: [], personalImpact: "Nothing personal is touched.", expectedFinish: "6:05 PM",
      completionBand: "Very likely (~88%)", confidence: "medium", permissionRequired: "project.read",
      steps: [s("Draft the sprint summary from Jira for your review", "Jira", "medium", true, "project.read", "Buddy reads the sprint board and drafts the summary. Needs project-read access; sending stays manual.")],
    },
  ];
}
