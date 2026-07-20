/**
 * Central prototype store: persisted preferences, plan edits, statuses,
 * outcome-learning and audit log. localStorage-backed with a Reset control.
 *
 * Hard rule: learning adjusts ranking/timing preferences only. It NEVER
 * grants permissions — that requires an explicit Settings action (policy.ts).
 */
import type {
  AuditEvent, HomeMode, LearningPrefs, OutcomeFeedback,
} from "./models";

const KEY = "buddy.homeai.v1";

export interface PersistShape {
  mode: HomeMode | "auto";
  planEdits: Record<string, { disabled?: boolean; time?: string; handling?: "buddy" | "remind"; instruction?: string; orderDelta?: number }>;
  recStatuses: Record<string, string>;
  manualOrder: Record<string, number>;
  snoozed: string[];
  planChoice: "recommended" | "alternative";
  feedback: OutcomeFeedback[];
  audit: AuditEvent[];
  prefs: LearningPrefs;
  staleOverrides: Record<string, boolean>; // sourceId -> forced stale (Flow 7)
}

function fresh(): PersistShape {
  return {
    mode: "auto",
    planEdits: {},
    recStatuses: {},
    manualOrder: {},
    snoozed: [],
    planChoice: "recommended",
    feedback: [],
    audit: [],
    prefs: { domainBias: {}, quietMode: false, neverMoveMeetingTypes: [], alwaysAskFirst: false },
    staleOverrides: {},
  };
}

export class Store {
  data: PersistShape;

  constructor() {
    this.data = this.load();
  }

  private load(): PersistShape {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      return { ...fresh(), ...JSON.parse(raw) };
    } catch {
      return fresh();
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch { /* ignore quota errors in prototype */ }
  }

  reset() {
    this.data = fresh();
    this.save();
  }

  audit(action: string, target: string, outcome: string, undoable: boolean) {
    this.data.audit.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(), action, target, outcome, undoable,
    });
    this.data.audit = this.data.audit.slice(0, 50);
    this.save();
  }

  addFeedback(f: Omit<OutcomeFeedback, "id" | "at">) {
    const entry: OutcomeFeedback = { id: `fb-${Date.now()}`, at: Date.now(), ...f };
    this.data.feedback.unshift(entry);
    this.applyLearning(entry);
    this.save();
  }

  /** Learning is bounded and preference-only — never permissions. */
  private applyLearning(f: OutcomeFeedback) {
    const p = this.data.prefs;
    switch (f.kind) {
      case "not_helpful":
      case "wrong_time":
        p.quietMode = true; // fewer, better-timed nudges
        break;
      case "always_ask":
        p.alwaysAskFirst = true;
        break;
      case "never_move_type":
        if (f.note && !p.neverMoveMeetingTypes.includes(f.note)) p.neverMoveMeetingTypes.push(f.note);
        break;
      case "rank_up":
      case "rank_down": {
        // nudge the domain bias slightly, clamped to ±0.08 so no single
        // correction dominates the transparent ranking function
        const dom = f.note as keyof LearningPrefs["domainBias"] | undefined;
        if (dom) {
          const cur = p.domainBias[dom] ?? 0;
          const delta = f.kind === "rank_up" ? 0.04 : -0.04;
          p.domainBias[dom] = Math.max(-0.08, Math.min(0.08, cur + delta));
        }
        break;
      }
      case "not_important": {
        const dom = f.note as keyof LearningPrefs["domainBias"] | undefined;
        if (dom) {
          const cur = p.domainBias[dom] ?? 0;
          p.domainBias[dom] = Math.max(-0.08, cur - 0.04);
        }
        break;
      }
      default:
        break;
    }
  }

  setStatus(recId: string, status: string) {
    this.data.recStatuses[recId] = status;
    this.save();
  }

  setMode(mode: HomeMode | "auto") {
    this.data.mode = mode;
    this.save();
  }

  toggleStale(sourceId: string, stale: boolean) {
    this.data.staleOverrides[sourceId] = stale;
    this.save();
  }
}
