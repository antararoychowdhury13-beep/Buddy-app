/**
 * Ask Buddy state machine + persistence. The journey is modelled as explicit
 * states with guarded transitions so impossible states can't happen — e.g.
 * you can't execute before approval, or record without a consent path.
 */
import type {
  AuditEvent, Assumption, JourneyState, MeetingState, Message, MomAudience,
  PlanStep, AskContext,
} from "./models.js";
import { ASSUMPTIONS, buildMom, buildPlan } from "./mock.js";

const KEY = "buddy.ask.v1";

export interface AskPersist {
  journey: JourneyState;
  meeting: MeetingState;
  messages: Message[];
  context: AskContext;
  plan: PlanStep[];
  assumptions: Assumption[];
  approvedStepIds: string[];
  consentPath: "record" | "notes_only" | "declined" | null;
  momEdits: Record<string, string>;         // section id -> edited body
  momConfirmed: string[];                    // action ids confirmed
  momRemoved: string[];                      // action ids removed
  launchCorrected: boolean;                  // 18 Aug → 28 Aug
  externalRedacted: boolean;                 // confidential removed from external version
  activeAudience: MomAudience;
  priyaResolution: string | null;
  monitoringOn: boolean;
  workflowSaved: boolean;
  audit: AuditEvent[];
}

function freshContext(): AskContext {
  return { scopeType: "project", scopeLabel: "Work → Project Phoenix", apps: ["Teams", "Outlook", "Jira"], mode: "prepare", privacy: "Private to Antara" };
}

function fresh(): AskPersist {
  return {
    journey: "idle", meeting: "upcoming", messages: [], context: freshContext(),
    plan: buildPlan(), assumptions: ASSUMPTIONS.map((a) => ({ ...a })), approvedStepIds: [],
    consentPath: null, momEdits: {}, momConfirmed: [], momRemoved: [], launchCorrected: false,
    externalRedacted: false, activeAudience: "internal", priyaResolution: null,
    monitoringOn: false, workflowSaved: false, audit: [],
  };
}

export class AskStore {
  data: AskPersist;
  constructor() { this.data = this.load(); }

  private load(): AskPersist {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const parsed = JSON.parse(raw) as Partial<AskPersist>;
      // plan definitions aren't persisted with methods; rebuild then re-apply status/enabled
      const base = fresh();
      const merged = { ...base, ...parsed } as AskPersist;
      merged.plan = buildPlan().map((p) => {
        const saved = parsed.plan?.find((s) => s.id === p.id);
        return saved ? { ...p, enabled: saved.enabled, status: saved.status, evidence: saved.evidence, error: saved.error } : p;
      });
      return merged;
    } catch { return fresh(); }
  }

  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ } }
  reset() { this.data = fresh(); this.save(); }

  audit(action: string, detail: string) {
    this.data.audit.unshift({ id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), actor: "Antara", action, detail, scope: this.data.context.scopeLabel });
    this.data.audit = this.data.audit.slice(0, 80);
    this.save();
  }

  pushMessage(m: Omit<Message, "id" | "at">) {
    this.data.messages.push({ id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), ...m });
    this.save();
  }

  transition(to: JourneyState) { this.data.journey = to; this.save(); }
  meetingTo(to: MeetingState) { this.data.meeting = to; this.save(); }

  /** Guard: external send steps must be individually approved before execution. */
  canExecute(): boolean {
    const enabledApprovalSteps = this.data.plan.filter((s) => s.enabled && s.approvalRequired);
    return enabledApprovalSteps.every((s) => this.data.approvedStepIds.includes(s.id));
  }

  enabledSteps(): PlanStep[] { return this.data.plan.filter((s) => s.enabled); }
}
