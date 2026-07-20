/** Domain models for Ask Buddy — the agentic orchestration module. Browser-only.
 * All integrations here are simulated/demonstration only. */

export type AgentMode = "ask" | "prepare" | "act" | "monitor";

export type ExecutionStatus =
  | "queued" | "in_progress" | "waiting_for_approval" | "completed"
  | "partially_completed" | "failed" | "cancelled" | "undone";

export type ConfidenceLevel = "high" | "review_suggested" | "needs_confirmation" | "conflicting";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type Reversibility = "fully_reversible" | "partially_reversible" | "not_reliably_reversible" | "irreversible";

export type ContextScopeType = "conversation" | "today" | "work" | "personal" | "family" | "project" | "application" | "custom";

/** Top-level journey state machine. */
export type JourneyState =
  | "idle" | "request_understood" | "clarification_needed" | "plan_ready"
  | "waiting_for_approval" | "executing" | "execution_paused"
  | "partially_completed" | "completed" | "monitoring" | "workflow_saved";

export type MeetingState =
  | "upcoming" | "consent_pending" | "ready" | "recording" | "paused"
  | "off_record" | "processing" | "review_ready" | "approved";

export interface User { id: string; name: string; role: string; email: string; initials: string; }

export interface Participant {
  id: string; name: string; role: string; org: "internal" | "external";
  consent: "consented" | "pending" | "declined" | "not_required";
  initials: string; color: string;
}

export interface ConsentRecord {
  purpose: string; captured: string[]; retentionDays: number;
  orgPolicy: string; accessScope: string; alternatives: string[];
  acceptedAt?: number; path: "record" | "notes_only" | "declined" | null;
}

export interface Decision { id: string; text: string; confidence: ConfidenceLevel; confidential?: boolean; corrected?: string; }

export interface ActionItem {
  id: string; title: string; owner: string; ownerId: string; due: string;
  destination: "Jira" | "Outlook"; confidence: ConfidenceLevel; confirmed: boolean; removed?: boolean;
  transcriptRef?: string;
}

export interface OpenQuestion { id: string; text: string; }

export interface Meeting {
  id: string; title: string; date: string; durationMins: number; platform: string;
  scope: string; participants: Participant[]; state: MeetingState;
}

export type MomAudience = "internal" | "external" | "leadership" | "actions_only";

export interface MomSectionModel {
  id: string; title: string; body: string; confidential: boolean; editable: boolean;
}

export interface MomDocument {
  meetingId: string; sections: MomSectionModel[]; decisions: Decision[];
  actionItems: ActionItem[]; openQuestions: OpenQuestion[];
}

export interface PlanStep {
  id: string; title: string; description: string; application: string;
  target: string; enabled: boolean; status: ExecutionStatus; risk: RiskLevel;
  riskLabel: string; approvalRequired: boolean; reversible: Reversibility; reversibleLabel: string;
  sideEffects: string[]; dependencies: string[]; permission: string;
  evidence?: Evidence; error?: string; recoveryOptions?: RecoveryOption[];
}

export interface RecoveryOption { id: string; label: string; kind: "primary" | "normal" | "danger"; }

export interface Assumption { id: string; text: string; editable: true; }

export interface Evidence {
  kind: "email" | "jira" | "calendar" | "timeline" | "monitor";
  id: string; label: string; actor: string; at: number; recipients?: number; detail: string;
}

export interface AuditEvent { id: string; at: number; actor: string; action: string; detail: string; scope: string; }

export interface Automation {
  name: string; description: string; trigger: string; scope: string;
  apps: string[]; approvalPoints: string[]; recipients: string; reminderRule: string;
  escalationRule: string; exceptions: string; retentionDays: number; expiry: string;
  owner: string; teamAccess: string; autonomy: "ask_each_time" | "plan_then_act" | "auto_low_risk";
  status: "draft" | "active" | "disabled";
}

/** A conversation message in the command centre. */
export type MessageKind = "user" | "text" | "plan" | "completion" | "followup";
export interface Message { id: string; kind: MessageKind; text?: string; at: number; }

export interface AskContext {
  scopeType: ContextScopeType; scopeLabel: string; apps: string[];
  mode: AgentMode; privacy: string;
}
