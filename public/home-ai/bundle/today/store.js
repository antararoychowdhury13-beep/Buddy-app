const KEY = "buddy.today.v1";
function fresh() {
    return {
        appliedSuggestions: [], rejectedSuggestions: [], savedQuestions: [], privateNotes: [],
        energy: "unspecified", healthConsent: false, recordingConsent: false,
        taskClarified: false, taskFirstPassDone: false, overrunActive: false, calendarStale: false,
        audit: [], feedback: [],
        prefs: { preferredBufferMins: 10, preferredFocusMins: 120, quiet: false, askFirst: false, inflexibleTypes: [] },
    };
}
export class TodayStore {
    data;
    constructor() { this.data = this.load(); }
    load() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
        }
        catch {
            return fresh();
        }
    }
    save() { try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
    }
    catch { /* ignore */ } }
    reset() { this.data = fresh(); this.save(); }
    audit(e) {
        this.data.audit.unshift({ id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), ...e });
        this.data.audit = this.data.audit.slice(0, 60);
        this.save();
    }
    /** Feedback adjusts preferences/ranking only — never permissions or consent. */
    addFeedback(subjectId, kind, note) {
        this.data.feedback.unshift({ at: Date.now(), subjectId, kind, note });
        const p = this.data.prefs;
        if (kind === "intrusive" || kind === "poor_timing")
            p.quiet = true;
        if (kind === "ask_first")
            p.askFirst = true;
        if (kind === "no_recommend_type" && note && !p.inflexibleTypes.includes(note))
            p.inflexibleTypes.push(note);
        this.save();
    }
}
