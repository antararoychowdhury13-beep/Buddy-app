/**
 * Adaptive Home modes. A deterministic selector picks a mode from context;
 * the user can override manually. Modes change order/emphasis/visibility and
 * the summary language — header, bottom nav and Ask-Buddy stay put.
 */
import type { HomeMode, PlanCategory, Signals } from "../models.js";

export interface ModeContext {
  hour: number;      // 0..23
  dayOfWeek: number; // 0 Sun .. 6 Sat
  travel: boolean;
  stressLoad: number;
}

export function selectMode(ctx: ModeContext): { mode: HomeMode; reason: string } {
  if (ctx.travel) return { mode: "travel", reason: "A trip is active on your calendar." };
  if (ctx.stressLoad >= 0.7) return { mode: "high_stress", reason: "Poor sleep plus a dense meeting day — showing less, prioritising more." };
  if (ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6) return { mode: "weekend", reason: "It's the weekend — leading with life, not work." };
  if (ctx.hour < 11) return { mode: "morning", reason: "It's the start of your workday." };
  if (ctx.hour >= 18) return { mode: "evening", reason: "The workday is winding down." };
  return { mode: "workday", reason: "You're mid-workday." };
}

export interface ModeConfig {
  label: string;
  reasonHint: string;
  /** ordered category emphasis — categories earlier appear first / larger */
  order: PlanCategory[];
  /** categories hidden entirely in this mode */
  hidden: PlanCategory[];
  reducedMotion: boolean;
  maxCards?: number;
  summaryTone: string;
}

export const MODE_CONFIG: Record<HomeMode, ModeConfig> = {
  morning: {
    label: "Morning", reasonHint: "Plan, commute and first meeting up top.",
    order: ["prepare", "prioritise", "protect", "move", "delegate", "personal"],
    hidden: [], reducedMotion: false,
    summaryTone: "Here's the shape of your day before it starts.",
  },
  workday: {
    label: "Workday", reasonHint: "Current work, next meeting and blockers first.",
    order: ["prioritise", "protect", "prepare", "delegate", "move", "personal"],
    hidden: [], reducedMotion: false,
    summaryTone: "Focused on what's live right now.",
  },
  evening: {
    label: "Evening", reasonHint: "Unfinished work, travel home and family.",
    order: ["personal", "delegate", "prepare", "prioritise", "protect", "move"],
    hidden: ["move"], reducedMotion: false,
    summaryTone: "Wrapping up — here's what's left and what's at home.",
  },
  weekend: {
    label: "Weekend", reasonHint: "Life, family, wellbeing and money.",
    order: ["personal", "protect", "prepare", "delegate", "prioritise", "move"],
    hidden: ["move", "delegate"], reducedMotion: false,
    summaryTone: "Off the clock — a lighter, life-first view.",
  },
  travel: {
    label: "Travel", reasonHint: "Itinerary, documents and logistics first.",
    order: ["prepare", "personal", "prioritise", "protect", "move", "delegate"],
    hidden: [], reducedMotion: false,
    summaryTone: "On the move — logistics first.",
  },
  high_stress: {
    label: "High stress", reasonHint: "Three critical cards, one clear next step, calmer motion.",
    order: ["prioritise", "personal", "protect", "prepare", "move", "delegate"],
    hidden: ["move", "delegate", "prepare"], reducedMotion: true, maxCards: 3,
    summaryTone: "Just the essentials. Everything else can wait.",
  },
};

export function currentContext(signals: Signals, overrideStress?: number): ModeContext {
  const now = new Date();
  return {
    hour: now.getHours(),
    dayOfWeek: now.getDay(),
    travel: signals.travelStatus,
    stressLoad: overrideStress ?? signals.stressLoad,
  };
}

export const ALL_MODES: HomeMode[] = ["morning", "workday", "evening", "weekend", "travel", "high_stress"];
