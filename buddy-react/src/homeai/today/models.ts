/** Domain models for the AI Day Orchestrator (Today module). Browser-only. */

export type EventType =
  | "meeting" | "focus" | "prep" | "travel" | "break" | "personal" | "task" | "buddy" | "buffer";

export type Attendance = "required" | "active" | "optional" | "informational" | "unknown";

export type Flexibility = "fixed" | "flexible" | "movable";

export type RiskLevel = "low" | "medium" | "high";

export type Confidence = "high" | "medium" | "low" | "missing_info";

export type ExecStatus =
  | "suggested" | "preview" | "waiting_approval" | "approved" | "executing"
  | "completed" | "partial" | "failed" | "cancelled" | "undone";

export interface TimelineBlock {
  id: string;
  type: EventType;
  title: string;
  sub: string;
  start: string;        // "9:00 AM"
  startMins: number;
  endMins: number;
  attendance: Attendance;
  flexibility: Flexibility;
  overrunMins: number;
  travelMins: number;
  prepMins: number;
  app?: string;
  conflict?: boolean;
  actions: string[];    // labels of block actions available
}

export interface ScheduleSuggestion {
  id: string;
  type: string;
  title: string;
  reason: string;
  impact: string;
  originalTime: string;
  proposedTime: string;
  affectedPeople: string[];
  confidence: Confidence;
  confidenceReason: string;
  sources: string[];
  reversible: boolean;
  riskLevel: RiskLevel;
  permissionRequired: string | null;
  minutesRecovered: number;
  safe: boolean;        // reversible + no external people = "apply safe"
  steps: ActionStep[];
  status: "suggested" | "applied" | "rejected";
}

export interface ActionStep {
  id: string;
  description: string;
  targetSystem: string;
  riskLevel: RiskLevel;
  reversible: boolean;
  permissionRequired: string | null;
  preview: string;
  draftMessage?: string;   // attendee-facing message to preview
  executionStatus: ExecStatus;
  result?: string;
  undoAvailable: boolean;
}

export interface DayMetrics {
  meetingMins: number;
  focusMins: number;
  travelMins: number;
  prepMins: number;
  bufferMins: number;
  contextSwitches: number;
  freeMins: number;
  expectedFinish: string;
  personalAtRisk: boolean;
}

export interface CompletionEstimate {
  band: "very likely" | "likely" | "uncertain" | "unlikely";
  internalProbability: number;   // 0..1, internal only
  confidence: Confidence;
  positiveFactors: string[];
  negativeFactors: string[];
  assumptions: string[];
  dataUsed: string[];
  healthDataUsed: boolean;
  calculatedAt: string;
  disclaimer: string;
}

export interface MeetingBrief {
  meetingId: string;
  title: string;
  time: string;
  objective: string;
  glance: string;                // 30-second
  attendees: { name: string; role: string; context: string }[];
  previousSummary: string;
  previousDecisions: string[];
  unresolvedActions: string[];
  relevantSignals: { source: string; note: string }[];
  predictedRisks: string[];
  recommendedQuestions: string[];
  recommendedPosition: string;
  missingInformation: string;
  confidence: Confidence;
  confidenceReason: string;
  sources: string[];
  lastUpdated: string;
  verbalTranscript: { t: number; text: string }[];  // cue points for playback
}

export interface TaskStep {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  requiredSource: string | null;
  buddyCapability: "buddy_first_pass" | "buddy_assist" | "user_only";
  userJudgementRequired: boolean;
  owner: "buddy" | "you";
  status: "todo" | "buddy_done" | "done";
  output: string;
}

export interface TaskPlan {
  taskId: string;
  title: string;
  objective: string;
  expectedOutput: string;
  assumptions: string[];
  missingInformation: string[];
  estimatedMinutes: number;
  peopleBlocked: number;
  steps: TaskStep[];
  clarified: boolean;
}

export interface RecoveryPlan {
  id: string;
  name: string;
  trigger: string;
  description: string;
  commitmentsProtected: string[];
  commitmentsMoved: string[];
  peopleAffected: string[];
  personalImpact: string;
  expectedFinish: string;
  completionBand: string;
  confidence: Confidence;
  permissionRequired: string | null;
  steps: ActionStep[];
}

export type EnergyState = "energised" | "ok" | "low" | "over" | "unspecified";

export interface EnergyRecommendation {
  title: string;
  detail: string;
}

export interface AuditEvent {
  id: string;
  at: number;
  trigger: string;
  action: string;
  sources: string[];
  decision: string;
  result: string;
  undoStatus: "available" | "undone" | "none";
  permissionUsed: string | null;
}

export type DemoEvent =
  | "overrun" | "urgent" | "cancel" | "traffic" | "task_done" | "low_energy" | "stale_calendar";

export interface AdapterStatus {
  id: string;
  label: string;
  connected: boolean;
  lastSyncMins: number;
  stale: boolean;
  scope: string;
}
