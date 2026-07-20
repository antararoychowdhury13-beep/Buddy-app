/** Configurable demonstration household. No spouse/child/parent is mandatory —
 * relationship labels are user-defined and there are no gendered assumptions.
 * A single-person variant is provided too. */
import type {
  Asset, BasketItem, CareStep, Correlation, FinancialAction, Household, LifeNudge,
  MicroIntervention, Occasion, SafeToSpend, Scenario, SharedWorkflow, Store, WellbeingMetric,
} from "./models.js";

export const PAL = {
  blue: "#2F6BFF", green: "#22B07D", purple: "#8B5CF6", violet: "#6D5CF5",
  pink: "#EC5B8A", amber: "#E8963A", teal: "#0FB5B0", red: "#E14D6E", slate: "#5A6072",
};

export const INFO_LEGEND = [
  { state: "verified", label: "Verified", color: PAL.green },
  { state: "inferred", label: "Inferred", color: PAL.amber },
  { state: "shared", label: "Shared", color: PAL.blue },
  { state: "sensitive", label: "Sensitive", color: PAL.violet },
] as const;

/** Full demonstration household — user + partner + parent (care) + child + trusted member. */
export const HOUSEHOLD: Household = {
  id: "hh-full", label: "Roychowdhury household", singlePerson: false,
  members: [
    {
      id: "m-you", name: "You", relationship: "Me", initials: "AR", color: PAL.blue,
      manages: ["Household bills", "Car servicing", "Dad's care coordination"],
      info: [
        { id: "i-y1", label: "Work email · antara@company.com", state: "verified", source: "Added by you", visibility: "only_you", confirmed: true, usedIn: ["Money", "Occasions"] },
      ],
    },
    {
      id: "m-partner", name: "Priya", relationship: "Partner", initials: "PR", color: PAL.violet,
      manages: ["Groceries", "Weekend plans"],
      info: [
        { id: "i-p1", label: "Birthday · 12 September", state: "verified", source: "Added by you", visibility: "household", confirmed: true, usedIn: ["Occasions"] },
        { id: "i-p2", label: "May prefer Italian restaurants", state: "inferred", source: "Inferred from 3 authorised conversations", visibility: "only_you", confirmed: false, usedIn: [] },
        { id: "i-p3", label: "Anniversary · 24 July", state: "verified", source: "Added by you", visibility: "household", confirmed: true, usedIn: ["Occasions"] },
      ],
    },
    {
      id: "m-parent", name: "Dad", relationship: "Parent (periodic care)", initials: "BR", color: PAL.green,
      manages: [],
      info: [
        { id: "i-d1", label: "Cardiologist · Dr. Sharma, City Hospital", state: "verified", source: "Added by you", visibility: "you_and_caregiver", confirmed: true, usedIn: ["Care journey"] },
        { id: "i-d2", label: "Medicine schedule", state: "shared", source: "Shared by caregiver", visibility: "you_and_caregiver", confirmed: true, usedIn: ["Care journey"] },
        { id: "i-d3", label: "Blood pressure trend (last 3 readings)", state: "sensitive", source: "Buddy detected in a shared report", visibility: "only_you", confirmed: false, usedIn: [] },
      ],
    },
    {
      id: "m-child", name: "Aarav", relationship: "Child", initials: "AA", color: PAL.amber,
      manages: [],
      info: [
        { id: "i-c1", label: "Parent–teacher meeting · 25 Jul, 5:45 PM", state: "verified", source: "Added by you", visibility: "household", confirmed: true, usedIn: ["Today", "Occasions"] },
        { id: "i-c2", label: "May enjoy football camp this summer", state: "inferred", source: "Inferred from 2 authorised chats", visibility: "only_you", confirmed: false, usedIn: [] },
      ],
    },
    {
      id: "m-trusted", name: "Ravi", relationship: "Sibling (trusted)", initials: "RV", color: PAL.teal,
      manages: ["Weekend elder-care cover"],
      info: [
        { id: "i-r1", label: "Weekend availability for Dad's visits", state: "shared", source: "Shared by Ravi", visibility: "you_and_caregiver", confirmed: true, usedIn: ["Elder-care rota"] },
      ],
    },
  ],
};

export const HOUSEHOLD_SOLO: Household = {
  id: "hh-solo", label: "Just me", singlePerson: true,
  members: [{ id: "m-you", name: "You", relationship: "Me", initials: "AR", color: PAL.blue, manages: ["Everything"], info: [
    { id: "i-y1", label: "Work email · antara@company.com", state: "verified", source: "Added by you", visibility: "only_you", confirmed: true, usedIn: ["Money"] },
  ] }],
};

export const NEEDS_ATTENTION: LifeNudge[] = [
  {
    id: "n-italian", category: "family", accent: PAL.amber, tag: "Confirm inference",
    title: "Priya may prefer Italian restaurants", sub: "Inferred from 3 chats · confirm before I use it",
    whyNow: "Your anniversary is on 24 July and I'm drafting dinner options.",
    source: "Based on an authorised preference signal (3 conversations). Tap to inspect privately.",
    confidence: "medium", sensitivity: "sensitive", reversible: true,
    consequenceIfIgnored: "I'll leave this out of the anniversary suggestions.",
  },
  {
    id: "n-dad-call", category: "family", accent: PAL.blue, tag: "Gentle nudge",
    title: "You normally call Dad on Sunday", sub: "The last two Sundays don't show a call",
    whyNow: "It's a confirmed pattern over the last several weeks — nothing more.",
    source: "Call log pattern you authorised. This is about timing, not anyone's feelings.",
    confidence: "high", sensitivity: "normal", reversible: true,
    consequenceIfIgnored: "Nothing happens — I'll stop mentioning it if you prefer.",
  },
  {
    id: "n-car", category: "family", accent: PAL.green, tag: "Care task",
    title: "Dad's cardiologist follow-up is coming up", sub: "I can turn this into a full care journey",
    whyNow: "The appointment is in your shared care calendar for next week.",
    source: "Shared care calendar · verified.",
    confidence: "high", sensitivity: "sensitive", reversible: true,
    consequenceIfIgnored: "The appointment stays as a plain reminder.",
  },
];

export const CARE_STEPS: CareStep[] = [
  // before
  { id: "cs1", stage: "before", title: "Confirm appointment & verify doctor/date/location", owner: "You", due: "By Fri", status: "ready", sensitivity: "normal", visibility: "you_and_caregiver", source: "Shared care calendar", buddyCanPrepare: true, buddyCanExecute: false, requiresConfirm: false },
  { id: "cs2", stage: "before", title: "Gather previous reports", owner: "Buddy", due: "By Fri", status: "ready", sensitivity: "sensitive", visibility: "you_and_caregiver", source: "Health records you shared", buddyCanPrepare: true, buddyCanExecute: true, requiresConfirm: false },
  { id: "cs3", stage: "before", title: "Prepare medicine list", owner: "Buddy", due: "By Fri", status: "ready", sensitivity: "sensitive", visibility: "you_and_caregiver", source: "Shared medicine schedule", buddyCanPrepare: true, buddyCanExecute: true, requiresConfirm: false },
  { id: "cs4", stage: "before", title: "Prepare questions for the doctor", owner: "You", due: "By Fri", status: "todo", sensitivity: "normal", visibility: "only_you", source: "Your notes", buddyCanPrepare: true, buddyCanExecute: false, requiresConfirm: false },
  { id: "cs5", stage: "before", title: "Arrange cab / travel", owner: "Buddy", due: "Morning of", status: "todo", sensitivity: "normal", visibility: "you_and_caregiver", source: "Maps", buddyCanPrepare: true, buddyCanExecute: true, requiresConfirm: true },
  { id: "cs6", stage: "before", title: "Block your calendar & notify Ravi", owner: "Buddy", due: "By Fri", status: "todo", sensitivity: "normal", visibility: "you_and_caregiver", source: "Calendar", buddyCanPrepare: true, buddyCanExecute: true, requiresConfirm: false },
  // during
  { id: "cs7", stage: "during", title: "Quick access: reports, medicine list, questions", owner: "You", due: "At visit", status: "todo", sensitivity: "sensitive", visibility: "only_you", source: "Prepared above", buddyCanPrepare: true, buddyCanExecute: false, requiresConfirm: false },
  { id: "cs8", stage: "during", title: "Appointment notes (with consent)", owner: "You", due: "At visit", status: "todo", sensitivity: "sensitive", visibility: "only_you", source: "Your notes", buddyCanPrepare: false, buddyCanExecute: false, requiresConfirm: true },
  // after
  { id: "cs9", stage: "after", title: "Capture instructions (doctor-confirmed vs Buddy interpretation)", owner: "You", due: "Same day", status: "todo", sensitivity: "sensitive", visibility: "only_you", source: "Your notes", buddyCanPrepare: true, buddyCanExecute: false, requiresConfirm: false },
  { id: "cs10", stage: "after", title: "Create medicine reminders", owner: "Buddy", due: "Same day", status: "todo", sensitivity: "sensitive", visibility: "you_and_caregiver", source: "Confirmed instructions only", buddyCanPrepare: true, buddyCanExecute: true, requiresConfirm: false },
  { id: "cs11", stage: "after", title: "Prepare medicine reorder", owner: "Buddy", due: "As needed", status: "todo", sensitivity: "sensitive", visibility: "you_and_caregiver", source: "Pharmacy", buddyCanPrepare: true, buddyCanExecute: false, requiresConfirm: true },
  { id: "cs12", stage: "after", title: "Record expense & store report", owner: "Buddy", due: "Same day", status: "todo", sensitivity: "sensitive", visibility: "only_you", source: "Money + records", buddyCanPrepare: true, buddyCanExecute: true, requiresConfirm: false },
];

export const WELLBEING: WellbeingMetric[] = [
  { id: "w-activity", label: "Activity", baseline: "usual Tuesday", today: "4,100 steps", diffPct: -18, dataPeriod: "last 6 Tuesdays", confidence: "medium", missingData: "no wearable data 11 AM–2 PM", publicRef: "General guidance suggests ~8,000/day" },
  { id: "w-sleep", label: "Sleep", baseline: "your usual range 6h 30m–7h 20m", today: "5h 40m", diffPct: -15, dataPeriod: "last 14 nights", confidence: "high", publicRef: "Adults commonly 7–9h" },
];

export const CORRELATIONS: Correlation[] = [
  {
    id: "cor-sleep-focus", variables: "Sleep ↔ afternoon focus",
    observation: "On days when you sleep at least 7 hours, you report better afternoon focus more often.",
    dataPoints: 12, strength: "moderate", missingData: "3 days had no focus check-in",
    alternatives: ["Meeting density also varies on those days", "Caffeine isn't tracked"],
    disclaimer: "This is a personal correlation, not a medical conclusion.",
  },
];

export const MICRO: MicroIntervention[] = [
  { id: "mi-walk", title: "10-minute walk", durationMins: 10, reason: "You're below your usual Tuesday activity and have a free slot.", bestTime: "1:15 PM (after lunch)", affectsCalendar: false, whyChosen: "Fits your real gap and matches your preferred exercise time." },
  { id: "mi-water", title: "Water after your next call", durationMins: 1, reason: "No water logged in 3 hours on a meeting-heavy day.", bestTime: "After the 11 AM sync", affectsCalendar: false, whyChosen: "Bundled so it doesn't interrupt anything." },
];

export const BASKET: BasketItem[] = [
  { id: "b-milk", name: "Milk (1L × 4)", inventoryState: "predicted", whyPredicted: "You buy ~4/week; last purchased 6 days ago.", daysRemaining: 1, confidence: "high", prevQty: "4", suggestedQty: "4", brand: "Amul", alternatives: ["Mother Dairy", "Local"], price: 280, needsConfirm: false, included: true },
  { id: "b-eggs", name: "Eggs (12)", inventoryState: "predicted", whyPredicted: "Consumption rhythm suggests a refill this week.", daysRemaining: 2, confidence: "medium", prevQty: "12", suggestedQty: "12", brand: "Farm fresh", alternatives: ["Organic"], price: 90, needsConfirm: true, included: true },
  { id: "b-coffee", name: "Coffee (250g)", inventoryState: "user_reported", whyPredicted: "You marked this low yesterday.", daysRemaining: 0, confidence: "high", prevQty: "250g", suggestedQty: "250g", brand: "Blue Tokai", alternatives: ["Local roast"], price: 550, needsConfirm: false, included: true },
  { id: "b-rice", name: "Rice (5kg)", inventoryState: "confirmed", whyPredicted: "Smart-shelf shows plenty in stock.", daysRemaining: 20, confidence: "high", prevQty: "5kg", suggestedQty: "0", brand: "India Gate", alternatives: [], price: 0, needsConfirm: false, included: false },
];

export const STORES: Store[] = [
  { name: "FreshMart", eta: "2 hrs", price: 920, recommended: true },
  { name: "DailyGo", eta: "Tomorrow", price: 955, recommended: false },
];

export const CAR: Asset = {
  id: "a-car", name: "Honda City", kind: "car", purchaseDate: "Mar 2021",
  serviceDue: "~400 km (est. 2 weeks)", estAnnualCost: "₹42,000", insurance: "Renews Oct 2026",
  compliance: "Pollution cert valid to Dec 2026", responsible: "You",
  serviceSlots: [
    { name: "AutoCare (authorised)", when: "Sat 10 AM", price: 6500, authorised: true },
    { name: "QuickServe", when: "Sun 9 AM", price: 6900, authorised: false },
    { name: "CityMotors", when: "Mon 4 PM", price: 7200, authorised: false },
  ],
};

export const OCCASION: Occasion = {
  id: "o-anniv", title: "Anniversary", date: "24 July 2026", people: ["You", "Priya"], budget: 6000,
  giftIdeas: [
    { label: "Italian dinner reservation", source: "inferred", note: "Based on an authorised preference signal — confirm before I use it." },
    { label: "Weekend pottery class", source: "verified", note: "From a saved interest you added." },
    { label: "Personalised photo book", source: "verified", note: "A safe default." },
  ],
};

export const SAFE_TO_SPEND: SafeToSpend = {
  period: "until 31 July",
  rows: [
    { label: "Available balance", amount: 72400, op: "add" },
    { label: "Expected income (paid 25th)", amount: 0, op: "add" },
    { label: "Upcoming bills", amount: 24560, op: "sub" },
    { label: "Recurring & SIP", amount: 18200, op: "sub" },
    { label: "Planned purchases", amount: 4000, op: "sub" },
    { label: "Safety buffer", amount: 8000, op: "sub" },
  ],
  total: 48200,
  accountsIncluded: ["HDFC Savings ••1102", "Salary account ••7781"],
  accountsExcluded: ["Emergency FD (excluded on purpose)"],
  lastSync: "12 min ago", pendingTxns: 2, confidence: "medium", buffer: 8000,
};

export const FORECAST_7D = [
  { day: "16", balance: 72400, low: false }, { day: "18", balance: 66000, low: false },
  { day: "20", balance: 58000, low: false }, { day: "21", balance: 40000, low: false },
  { day: "22", balance: 15440, low: true }, { day: "25", balance: 78000, low: false },
  { day: "28", balance: 70000, low: false },
];

export const SCENARIO: Scenario = {
  id: "sc-trip", question: "Can I spend ₹30,000 on a trip next month?",
  monthlyImpact: "−₹30,000 one-time; buffer stays above ₹5,000",
  lowestBalance: "₹12,400 on 22 Aug (vs ₹15,440 now)",
  savingsImpact: "SIP unaffected; goal date slips ~3 weeks",
  bufferImpact: "Safety buffer dips to ₹5,000 for 6 days",
  assumptions: ["Salary lands on the 25th", "No new large bills"],
  confidence: "medium",
  risks: ["A late bill in that window would tighten things"],
  unknowns: ["Any cash spending Buddy can't see"],
};

export const FINANCIAL_ACTION: FinancialAction = {
  id: "fa-card", action: "Pay credit-card bill", amount: 24560, to: "HDFC Card ••4821",
  from: "Savings ••1102", when: "Now", fees: "None", cancellation: "Can't be reversed once sent",
  safeToSpendImpact: "−₹24,560 → ₹23,640", permission: "One-time · this amount · this recipient only",
};

export const SHARED_WORKFLOWS: SharedWorkflow[] = [
  {
    id: "sw-eldercare", title: "Elder-care rota", purpose: "Coordinate Dad's visits and daily medicines.",
    owner: "You", pendingInvites: 0,
    participants: [
      { name: "You", role: "Coordinates visits", permission: "Owner", color: PAL.blue, initials: "AR" },
      { name: "Ravi", role: "Weekend cover", permission: "Editor", color: PAL.teal, initials: "RV" },
      { name: "Caregiver", role: "Daily meds", permission: "View", color: PAL.purple, initials: "CG" },
    ],
    sharedInfo: ["Visit schedule", "Medicine times"],
    privateInfo: ["Dad's blood-pressure trend (only you)", "Your private notes"],
  },
];

export const PERMISSION_CATEGORIES = [
  { id: "family", label: "Family data", level: "prepare_draft" },
  { id: "health", label: "Health data", level: "suggest" },
  { id: "purchasing", label: "Household purchasing", level: "execute_after_confirm" },
  { id: "location", label: "Location", level: "view_only" },
  { id: "messages", label: "Messages", level: "prepare_draft" },
  { id: "calendar", label: "Calendar", level: "execute_reversible" },
  { id: "banking", label: "Banking", level: "execute_after_confirm" },
  { id: "investments", label: "Investments", level: "never_auto" },
  { id: "shared", label: "Shared workflows", level: "execute_after_confirm" },
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  view_only: "View only", suggest: "Suggest", prepare_draft: "Prepare draft",
  execute_after_confirm: "Execute after confirmation", execute_reversible: "Execute reversible only",
  never_auto: "Never automatic",
};
