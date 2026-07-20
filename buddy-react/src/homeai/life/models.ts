/** Domain models for the Life module — Personal-Life Orchestrator. Browser-only.
 * Core principle: personal intelligence stays personal, explainable,
 * permission-controlled, and easy to correct or delete. */

/** The four information states every Life fact carries. */
export type InfoState = "verified" | "inferred" | "shared" | "sensitive";

/** Visibility of an item. */
export type Visibility = "only_you" | "you_and_caregiver" | "household" | "custom";

/** Permission level Buddy holds for a category. */
export type PermissionLevel =
  | "view_only" | "suggest" | "prepare_draft" | "execute_after_confirm"
  | "execute_reversible" | "never_auto";

export type PermissionCategory =
  | "family" | "health" | "purchasing" | "location" | "messages" | "calendar" | "banking" | "investments" | "shared";

export interface InfoItem {
  id: string;
  label: string;
  state: InfoState;
  source: string;            // "Added by you", "Inferred from 3 authorised chats", "Shared by …"
  visibility: Visibility;
  confirmed: boolean;        // inferred/sensitive items start unconfirmed
  usedIn?: string[];         // where this information is used
}

export interface Member {
  id: string;
  name: string;
  relationship: string;      // user-defined label — no gender/structure assumptions
  initials: string;
  color: string;
  manages: string[];         // responsibilities they normally manage
  info: InfoItem[];
}

export interface Household {
  id: string;
  label: string;
  members: Member[];
  singlePerson: boolean;
}

/** Care journey — a doctor appointment as a full journey, not a reminder. */
export type CareStage = "before" | "during" | "after";
export interface CareStep {
  id: string;
  stage: CareStage;
  title: string;
  owner: string;
  due: string;
  status: "todo" | "ready" | "done";
  sensitivity: "normal" | "sensitive";
  visibility: Visibility;
  source: string;
  buddyCanPrepare: boolean;
  buddyCanExecute: boolean;
  requiresConfirm: boolean;
}

export type EscalationLevel = "wellness" | "care" | "medical" | "urgent";

/** Wellbeing — personal baseline, not generic targets. */
export interface WellbeingMetric {
  id: string;
  label: string;
  baseline: string;          // "usual Tuesday activity"
  today: string;
  diffPct: number;           // negative = below usual (never shamed)
  dataPeriod: string;
  confidence: "high" | "medium" | "low";
  missingData?: string;
  publicRef?: string;        // clearly separated public-health reference
}

export interface Correlation {
  id: string;
  variables: string;         // "Sleep ↔ afternoon focus"
  observation: string;
  dataPoints: number;
  strength: "weak" | "moderate" | "clear";
  missingData?: string;
  alternatives: string[];
  disclaimer: string;
}

export interface MicroIntervention {
  id: string;
  title: string;
  durationMins: number;
  reason: string;
  bestTime: string;
  affectsCalendar: boolean;
  whyChosen: string;
}

/** Household replenishment. */
export type InventoryState = "confirmed" | "predicted" | "user_reported" | "device";
export interface BasketItem {
  id: string;
  name: string;
  inventoryState: InventoryState;
  whyPredicted: string;
  daysRemaining: number;
  confidence: "high" | "medium" | "low";
  prevQty: string;
  suggestedQty: string;
  brand: string;
  alternatives: string[];
  price: number;
  needsConfirm: boolean;
  included: boolean;
}

export interface Store { name: string; eta: string; price: number; recommended: boolean; }

/** Ownership-cost assistant. */
export interface Asset {
  id: string;
  name: string;
  kind: "car" | "appliance" | "electronics" | "home";
  purchaseDate: string;
  serviceDue: string;
  estAnnualCost: string;
  insurance: string;
  compliance: string;        // pollution cert / registration
  responsible: string;
  serviceSlots: { name: string; when: string; price: number; authorised: boolean }[];
}

/** Occasion planner. */
export interface Occasion {
  id: string;
  title: string;
  date: string;
  people: string[];
  budget: number;
  giftIdeas: { label: string; source: "inferred" | "verified"; note: string }[];
}

/** Explainable Safe-to-Spend. */
export interface SafeToSpendRow { label: string; amount: number; op: "add" | "sub" | "total"; }
export interface SafeToSpend {
  period: string;
  rows: SafeToSpendRow[];
  total: number;
  accountsIncluded: string[];
  accountsExcluded: string[];
  lastSync: string;
  pendingTxns: number;
  confidence: "high" | "medium" | "low";
  buffer: number;
}

export interface Scenario {
  id: string;
  question: string;
  monthlyImpact: string;
  lowestBalance: string;
  savingsImpact: string;
  bufferImpact: string;
  assumptions: string[];
  confidence: "high" | "medium" | "low";
  risks: string[];
  unknowns: string[];
}

/** High-risk financial action requiring step-up + audit. */
export interface FinancialAction {
  id: string;
  action: string;
  amount: number;
  to: string;
  from: string;
  when: string;
  fees: string;
  cancellation: string;
  safeToSpendImpact: string;
  permission: string;
}

export interface SharedWorkflow {
  id: string;
  title: string;
  purpose: string;
  owner: string;
  participants: { name: string; role: string; permission: "Owner" | "Editor" | "View"; color: string; initials: string }[];
  sharedInfo: string[];
  privateInfo: string[];
  pendingInvites: number;
}

/** A Life nudge with the full trust envelope. */
export interface LifeNudge {
  id: string;
  category: PermissionCategory;
  accent: string;
  tag: string;
  title: string;
  sub: string;
  whyNow: string;
  source: string;
  confidence: "high" | "medium" | "low";
  sensitivity: "normal" | "sensitive";
  reversible: boolean;
  consequenceIfIgnored: string;
}

export type SensitivityLevel = "practical" | "gentle" | "proactive";

export interface AuditEntry { id: string; at: number; action: string; detail: string; category: PermissionCategory; }
