import { PERMISSION_CATEGORIES } from "./mock.js";
const KEY = "buddy.life.v1";
function defaultPermissions() {
    const out = {};
    for (const p of PERMISSION_CATEGORIES)
        out[p.id] = p.level;
    return out;
}
function fresh() {
    return {
        household: "hh-full", privacyMode: false, hideSensitiveValues: false, sensitivity: "gentle",
        confirmedInfo: [], correctedInfo: [], deletedInfo: [], dismissedNudges: [],
        permissions: defaultPermissions(),
        wellbeingToggles: { wearable: true, correlations: true, checkins: true },
        basketExcluded: [], audit: [],
    };
}
export class LifeStore {
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
    audit(action, detail, category) {
        this.data.audit.unshift({ id: `la-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), action, detail, category });
        this.data.audit = this.data.audit.slice(0, 80);
        this.save();
    }
    confirmInfo(id) { if (!this.data.confirmedInfo.includes(id))
        this.data.confirmedInfo.push(id); this.save(); }
    correctInfo(id) { if (!this.data.correctedInfo.includes(id))
        this.data.correctedInfo.push(id); this.save(); }
    deleteInfo(id) { if (!this.data.deletedInfo.includes(id))
        this.data.deletedInfo.push(id); this.save(); }
}
