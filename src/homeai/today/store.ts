/** Today module persistence — localStorage-backed, feedback never touches
 * permissions or consent (those are separate explicit toggles). */
import type { AuditEvent, EnergyState } from "./models.js";

const KEY = "buddy.today.v1";

export interface TodayPersist {
  appliedSuggestions: string[];
  rejectedSuggestions: string[];
  savedQuestions: string[];
  privateNotes: string[];
  energy: EnergyState;
  healthConsent: boolean;         // separate explicit consent — feedback can't set this
  recordingConsent: boolean;      // separate explicit consent
  taskClarified: boolean;
  taskFirstPassDone: boolean;
  overrunActive: boolean;
  calendarStale: boolean;
  audit: AuditEvent[];
  feedback: { at: number; subjectId: string; kind: string; note?: string }[];
  prefs: { preferredBufferMins: number; preferredFocusMins: number; quiet: boolean; askFirst: boolean; inflexibleTypes: string[] };
}

function fresh(): TodayPersist {
  return {
    appliedSuggestions: [], rejectedSuggestions: [], savedQuestions: [], privateNotes: [],
    energy: "unspecified", healthConsent: false, recordingConsent: false,
    taskClarified: false, taskFirstPassDone: false, overrunActive: false, calendarStale: false,
    audit: [], feedback: [],
    prefs: { preferredBufferMins: 10, preferredFocusMins: 120, quiet: false, askFirst: false, inflexibleTypes: [] },
  };
}

export class TodayStore {
  data: TodayPersist;
  constructor() { this.data = this.load(); }

  private load(): TodayPersist {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
    } catch { return fresh(); }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ } }
  reset() { this.data = fresh(); this.save(); }

  audit(e: Omit<AuditEvent, "id" | "at">) {
    this.data.audit.unshift({ id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), ...e });
    this.data.audit = this.data.audit.slice(0, 60);
    this.save();
  }

  /** Feedback adjusts preferences/ranking only — never permissions or consent. */
  addFeedback(subjectId: string, kind: string, note?: string) {
    this.data.feedback.unshift({ at: Date.now(), subjectId, kind, note });
    const p = this.data.prefs;
    if (kind === "intrusive" || kind === "poor_timing") p.quiet = true;
    if (kind === "ask_first") p.askFirst = true;
    if (kind === "no_recommend_type" && note && !p.inflexibleTypes.includes(note)) p.inflexibleTypes.push(note);
    this.save();
  }
}
