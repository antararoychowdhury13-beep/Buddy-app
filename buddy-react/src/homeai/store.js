var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const KEY = "buddy.homeai.v1";
function fresh() {
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
    staleOverrides: {}
  };
}
class Store {
  constructor() {
    __publicField(this, "data");
    this.data = this.load();
  }
  load() {
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
    } catch {
    }
  }
  reset() {
    this.data = fresh();
    this.save();
  }
  audit(action, target, outcome, undoable) {
    this.data.audit.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(),
      action,
      target,
      outcome,
      undoable
    });
    this.data.audit = this.data.audit.slice(0, 50);
    this.save();
  }
  addFeedback(f) {
    const entry = { id: `fb-${Date.now()}`, at: Date.now(), ...f };
    this.data.feedback.unshift(entry);
    this.applyLearning(entry);
    this.save();
  }
  /** Learning is bounded and preference-only — never permissions. */
  applyLearning(f) {
    const p = this.data.prefs;
    switch (f.kind) {
      case "not_helpful":
      case "wrong_time":
        p.quietMode = true;
        break;
      case "always_ask":
        p.alwaysAskFirst = true;
        break;
      case "never_move_type":
        if (f.note && !p.neverMoveMeetingTypes.includes(f.note)) p.neverMoveMeetingTypes.push(f.note);
        break;
      case "rank_up":
      case "rank_down": {
        const dom = f.note;
        if (dom) {
          const cur = p.domainBias[dom] ?? 0;
          const delta = f.kind === "rank_up" ? 0.04 : -0.04;
          p.domainBias[dom] = Math.max(-0.08, Math.min(0.08, cur + delta));
        }
        break;
      }
      case "not_important": {
        const dom = f.note;
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
  setStatus(recId, status) {
    this.data.recStatuses[recId] = status;
    this.save();
  }
  setMode(mode) {
    this.data.mode = mode;
    this.save();
  }
  toggleStale(sourceId, stale) {
    this.data.staleOverrides[sourceId] = stale;
    this.save();
  }
}
export {
  Store
};
