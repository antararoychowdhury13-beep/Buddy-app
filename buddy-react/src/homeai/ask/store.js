var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ASSUMPTIONS, buildPlan } from "./mock";
const KEY = "buddy.ask.v1";
function freshContext() {
  return { scopeType: "project", scopeLabel: "Work → Project Phoenix", apps: ["Teams", "Outlook", "Jira"], mode: "prepare", privacy: "Private to Antara" };
}
function fresh() {
  return {
    journey: "idle",
    meeting: "upcoming",
    messages: [],
    context: freshContext(),
    plan: buildPlan(),
    assumptions: ASSUMPTIONS.map((a) => ({ ...a })),
    approvedStepIds: [],
    consentPath: null,
    momEdits: {},
    momConfirmed: [],
    momRemoved: [],
    launchCorrected: false,
    externalRedacted: false,
    activeAudience: "internal",
    priyaResolution: null,
    monitoringOn: false,
    workflowSaved: false,
    audit: []
  };
}
class AskStore {
  constructor() {
    __publicField(this, "data");
    this.data = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const parsed = JSON.parse(raw);
      const base = fresh();
      const merged = { ...base, ...parsed };
      merged.plan = buildPlan().map((p) => {
        const saved = parsed.plan?.find((s) => s.id === p.id);
        return saved ? { ...p, enabled: saved.enabled, status: saved.status, evidence: saved.evidence, error: saved.error } : p;
      });
      return merged;
    } catch {
      return fresh();
    }
  }
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
    }
  }
  reset() {
    this.data = fresh();
    this.save();
  }
  audit(action, detail) {
    this.data.audit.unshift({ id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), actor: "Antara", action, detail, scope: this.data.context.scopeLabel });
    this.data.audit = this.data.audit.slice(0, 80);
    this.save();
  }
  pushMessage(m) {
    this.data.messages.push({ id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), ...m });
    this.save();
  }
  transition(to) {
    this.data.journey = to;
    this.save();
  }
  meetingTo(to) {
    this.data.meeting = to;
    this.save();
  }
  /** Guard: external send steps must be individually approved before execution. */
  canExecute() {
    const enabledApprovalSteps = this.data.plan.filter((s) => s.enabled && s.approvalRequired);
    return enabledApprovalSteps.every((s) => this.data.approvedStepIds.includes(s.id));
  }
  enabledSteps() {
    return this.data.plan.filter((s) => s.enabled);
  }
}
export {
  AskStore
};
