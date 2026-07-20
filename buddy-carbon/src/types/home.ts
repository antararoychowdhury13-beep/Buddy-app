/** Domain models for the AI-enabled Home module (browser prototype — no backend). */

export type Domain = "work" | "calendar" | "tasks" | "email" | "family" | "personal" | "health" | "mobility" | "finance";

export type RiskLevel = "low" | "medium" | "high";

export type ConfidenceLevel = "high" | "medium" | "low" | "missing_info";

export type HomeMode = "morning" | "workday" | "evening" | "weekend" | "travel" | "high_stress";

export type PlanCategory = "protect" | "prioritise" | "move" | "prepare" | "delegate" | "personal";

export type ActionExecStatus =
  | "suggested" | "drafting" | "draft_ready" | "waiting_approval" | "approved"
  | "executing" | "completed" | "partial" | "failed" | "cancelled" | "undone";

export type RecommendationStatus = "suggested" | "accepted" | "rejected" | "snoozed" | "done" | "undone";

export interface DataSource {
  id: string;
  label: string;            // "Calendar", "Jira", ...
  lastRefreshMinsAgo: number;
  stale: boolean;           // stale sources reduce confidence
  detail: string;           // what information was used (no sensitive content)
}

export interface AIExplanation {
  whyNow: string;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  sources: string[];        // DataSource ids
  evidence: string[];
  assumptions: string[];
  consequenceIfIgnored: string;
  missingInfo?: string;
}

export interface ActionStep {
  id: string;
  description: string;
  targetSystem: string;     // "Calendar", "Teams", ...
  riskLevel: RiskLevel;
  reversible: boolean;
  permissionRequired: string | null;  // named permission, null = none needed
  preview: string;          // exact effect shown before confirmation
  executionStatus: ActionExecStatus;
  result?: string;
  undoAvailable: boolean;
}

export interface Recommendation {
  id: string;
  title: string;
  summary: string;
  domain: Domain;
  category: PlanCategory;
  urgency: number;            // 0..1
  impact: number;             // 0..1
  peopleAffected: number;
  financialImpact: number;    // rupees, 0 if none
  emotionalImportance: number;// 0..1
  estimatedMinutes: number;
  reversible: boolean;
  buddyCanHandle: boolean;
  requiredPermission: string | null;
  explanation: AIExplanation;
  steps: ActionStep[];        // what "accept" would actually do
  alternative?: { label: string; tradeoff: string };
  defaultTime?: string;       // e.g. "3:00 PM" — editable in Edit Plan
  status: RecommendationStatus;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;  // "9:00 AM"
  end: string;
  startMins: number;  // minutes from midnight, for conflict math
  endMins: number;
  requiresActiveParticipation: boolean;
  optional: boolean;
  attendees: number;
  location: "remote" | "office" | "offsite";
  avgOverrunMins: number;
  app: string;    // Teams / Zoom
}

export interface TaskItem {
  id: string;
  title: string;
  dueToday: boolean;
  blockingPeople: number;
  estimatedMinutes: number;
  priorityHint: "high" | "normal" | "low";
  domain: Domain;
}

export interface Signals {
  commute: { route: string; usualMins: number; currentMins: number; heavy: boolean };
  sleep: { hours: number; quality: "good" | "fair" | "poor" };
  family: { title: string; time: string; timeMins: number; travelMins: number; people: string[] };
  finance: { bill: string; amount: number; dueInDays: number; incomeInDays: number };
  projectRisk: { title: string; delayDays: number; blockedTasks: number };
  focusPreference: { start: string; end: string; startMins: number; endMins: number };
  personalTask: { title: string; priority: "low" };
  travelStatus: boolean;
  stressLoad: number; // 0..1 — derived from sleep + calendar density
}

export interface ResolutionOption {
  id: "A" | "B";
  label: string;
  impact: string;
  tradeoff: string;
  riskLevel: RiskLevel;
  permissionRequired: string | null;
  steps: ActionStep[];
}

export interface Conflict {
  id: string;
  rule: string;              // which detection rule fired
  title: string;
  description: string;
  domains: Domain[];
  severity: "high" | "medium" | "low";
  peopleAffected: string[];
  resolutionDeadline: string;
  recommended: ResolutionOption;
  alternative: ResolutionOption;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  sources: string[];
  status: "open" | "resolved" | "deferred";
  chosen?: "A" | "B";
}

export type PriorityTier = "critical" | "high" | "medium" | "low";

export interface PriorityItem {
  id: string;
  refId: string;             // recommendation or conflict or task id
  kind: "recommendation" | "conflict" | "task";
  title: string;
  domain: Domain;
  tier: PriorityTier;
  score: number;             // internal — never shown as a precise truth
  explanation: string;
  buddyCanHandle: boolean;
  estimatedMinutes: number;
}

export interface OutcomeFeedback {
  id: string;
  at: number;
  subjectId: string;
  kind: "accepted" | "rejected" | "edited" | "ignored" | "undone" | "helpful" | "not_helpful" | "wrong_time"
      | "always_ask" | "never_move_type" | "one_time_exception" | "rank_up" | "rank_down" | "not_important";
  note?: string;
}

export interface AuditEvent {
  id: string;
  at: number;
  action: string;
  target: string;
  outcome: string;
  undoable: boolean;
}

export interface PlanSummary {
  meetings: number;
  activeMeetings: number;
  criticalTasks: number;
  conflicts: number;
  focusMins: number;
  personalCommitments: number;
  estTimeSavedMins: number;
  updatedAt: string;
  narrative: string;
}

export interface PlanComparisonRow {
  metric: string;
  recommended: string;
  alternative: string;
  better: "recommended" | "alternative" | "even";
}

/** Per-item user edits from the Edit Plan flow. */
export interface PlanItemEdit {
  disabled?: boolean;
  time?: string;
  handling?: "buddy" | "remind";
  instruction?: string;
  orderDelta?: number;
}

/**
 * The full input the engines operate on. Assembled server-side from real
 * Supabase data where a connector exists, and filled with clearly-labelled
 * demo signals for domains Buddy has no connector for yet. The client falls
 * back to a fully-mock context if the API is unreachable.
 */
export interface HomeContext {
  meetings: CalendarEvent[];
  tasks: TaskItem[];
  signals: Signals;
  dataSources: DataSource[];
  /** Provenance for the UI: which domains are real vs demo. */
  origin: { real: string[]; demo: string[] };
}

export interface LearningPrefs {
  /** ranking weight nudges learned from feedback — small, bounded */
  domainBias: Partial<Record<Domain, number>>;
  quietMode: boolean;          // learned "less intrusive"
  neverMoveMeetingTypes: string[];
  alwaysAskFirst: boolean;
}
