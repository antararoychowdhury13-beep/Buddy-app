/** Life module persistence — privacy mode, confirmed inferences, permission
 * levels, sensitivity, and audit. Learning/feedback never grants permissions;
 * permission changes are a separate explicit action. */
import type { AuditEntry, PermissionCategory, PermissionLevel, SensitivityLevel } from "./models";
import { PERMISSION_CATEGORIES } from "./mock";

const KEY = "buddy.life.v1";

export interface LifePersist {
  household: "hh-full" | "hh-solo";
  privacyMode: boolean;
  hideSensitiveValues: boolean;
  sensitivity: SensitivityLevel;
  confirmedInfo: string[];       // info item ids confirmed
  correctedInfo: string[];       // marked inaccurate / not relevant
  deletedInfo: string[];
  dismissedNudges: string[];
  permissions: Record<string, PermissionLevel>;
  wellbeingToggles: { wearable: boolean; correlations: boolean; checkins: boolean };
  basketExcluded: string[];
  audit: AuditEntry[];
}

function defaultPermissions(): Record<string, PermissionLevel> {
  const out: Record<string, PermissionLevel> = {};
  for (const p of PERMISSION_CATEGORIES) out[p.id] = p.level as PermissionLevel;
  return out;
}

function fresh(): LifePersist {
  return {
    household: "hh-full", privacyMode: false, hideSensitiveValues: false, sensitivity: "gentle",
    confirmedInfo: [], correctedInfo: [], deletedInfo: [], dismissedNudges: [],
    permissions: defaultPermissions(),
    wellbeingToggles: { wearable: true, correlations: true, checkins: true },
    basketExcluded: [], audit: [],
  };
}

export class LifeStore {
  data: LifePersist;
  constructor() { this.data = this.load(); }

  private load(): LifePersist {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
    } catch { return fresh(); }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ } }
  reset() { this.data = fresh(); this.save(); }

  audit(action: string, detail: string, category: PermissionCategory) {
    this.data.audit.unshift({ id: `la-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), action, detail, category });
    this.data.audit = this.data.audit.slice(0, 80);
    this.save();
  }

  confirmInfo(id: string) { if (!this.data.confirmedInfo.includes(id)) this.data.confirmedInfo.push(id); this.save(); }
  correctInfo(id: string) { if (!this.data.correctedInfo.includes(id)) this.data.correctedInfo.push(id); this.save(); }
  deleteInfo(id: string) { if (!this.data.deletedInfo.includes(id)) this.data.deletedInfo.push(id); this.save(); }
}
