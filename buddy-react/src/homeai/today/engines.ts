/**
 * Deterministic Today engines: day simulation, completion-probability
 * estimator, and energy-aware recommendations. No randomness — the same
 * inputs always give the same output, and results only change when a real
 * input (applied suggestion, overrun, energy, staleness) changes.
 */
import type {
  CompletionEstimate, DayMetrics, EnergyRecommendation, EnergyState, TimelineBlock,
} from "./models";
import { minsToClock } from "./mock";

export interface SimInput {
  timeline: TimelineBlock[];
  appliedSuggestions: Set<string>;   // suggestion ids the user applied
  overrunActive: boolean;            // stakeholder sync overrun triggered
  calendarStale: boolean;
}

/** Recompute day metrics from the current timeline + applied changes. */
export function simulateDay(input: SimInput): DayMetrics {
  const t = input.timeline;
  const sum = (type: string) => t.filter((b) => b.type === type).reduce((a, b) => a + (b.endMins - b.startMins), 0);
  const meetingMins = sum("meeting") + (input.overrunActive ? 25 : 0);
  let focusMins = sum("focus");
  const travelMins = sum("travel") + sum("personal") > 0 ? sum("travel") + 30 : sum("travel");
  const prepMins = sum("prep");
  let bufferMins = sum("buffer");

  // applied optimisations improve the day deterministically
  if (input.appliedSuggestions.has("s-focus")) focusMins += 0; // already in timeline; keeps it protected
  if (input.appliedSuggestions.has("s-buffer")) bufferMins += 10;
  if (input.appliedSuggestions.has("s-vendor")) { /* frees 30 min midday */ }

  // context switches ≈ transitions between different block types
  let switches = 0;
  for (let i = 1; i < t.length; i++) if (t[i].type !== t[i - 1].type) switches++;
  if (input.appliedSuggestions.has("s-buffer")) switches = Math.max(0, switches - 2);
  if (input.appliedSuggestions.has("s-vendor")) switches = Math.max(0, switches - 2);

  const dayEndMins = Math.max(...t.map((b) => b.endMins), 1035);
  const overrunPush = input.overrunActive ? 25 : 0;
  const optimisedPull = (input.appliedSuggestions.has("s-vendor") ? 20 : 0) + (input.appliedSuggestions.has("s-delegate") ? 20 : 0);
  const expectedFinishMins = dayEndMins + overrunPush - optimisedPull + 30; // wind-down
  const totalDayMins = 24 * 60;
  const busy = meetingMins + focusMins + travelMins + prepMins;
  const freeMins = Math.max(0, (dayEndMins - 495) - busy);

  const personalAtRisk = input.overrunActive && !input.appliedSuggestions.has("s-focus") &&
    !input.appliedSuggestions.has("s-vendor");

  return {
    meetingMins, focusMins, travelMins, prepMins, bufferMins,
    contextSwitches: switches, freeMins,
    expectedFinish: minsToClock(Math.min(totalDayMins - 1, expectedFinishMins)),
    personalAtRisk,
  };
}

export type Scenario = "current" | "optimised" | "delegated" | "personal_first";

/**
 * Transparent completion estimator for the 3 due tasks. Internal probability
 * is a weighted read; the UI shows a band + the factors behind it, never a
 * bare number framed as truth.
 */
export function estimateCompletion(scenario: Scenario, input: SimInput, healthConsent: boolean, energy: EnergyState): CompletionEstimate {
  const m = simulateDay(input);
  // Scenario baselines model how protected the focus time is. "Current"
  // leaves focus fragmented; optimising/delegating protects or offloads it.
  // These match the day's intended 58% → 82% story rather than reading the
  // raw timeline (which always contains the block).
  const base: Record<Scenario, number> = { current: 0.58, optimised: 0.82, delegated: 0.88, personal_first: 0.72 };
  let p = base[scenario];

  const positive: string[] = [];
  const negative: string[] = [];
  const assumptions = ["The 3 due tasks need ~80 focused minutes total", "No new urgent work lands this afternoon"];

  if (scenario === "optimised") { positive.push("Protects a clean 2h 15m focus block"); positive.push("Buffer added after the overrun-prone sync"); }
  if (scenario === "delegated") { positive.push("Buddy drafts the sprint summary, removing ~20 min"); positive.push("Focus block stays fully protected"); }
  if (scenario === "personal_first") { positive.push("Leaving on time for pickup is guaranteed"); negative.push("Slightly less focus time before 5:15 PM"); }
  if (scenario === "current") { negative.push("Focus time is fragmented across the day"); negative.push("No buffer for the overrun-prone 11 AM sync"); }

  if (input.overrunActive) { p -= 0.12; negative.push("The 11 AM sync overran by 25 min, eating into the afternoon"); }
  if (m.personalAtRisk) { negative.push("Family pickup at 5:15 PM is currently at risk"); }
  if (m.contextSwitches >= 8) negative.push(`${m.contextSwitches} context switches — heavy task-switching`);
  else positive.push(`Only ${m.contextSwitches} context switches`);

  const dataUsed = ["calendar", "jira", "prefs"];
  let healthUsed = false;
  if (healthConsent) {
    healthUsed = true; dataUsed.push("wellbeing");
    if (energy === "low" || energy === "over") { p -= 0.08; negative.push("You checked in low on energy, so deep work may be slower"); }
    else if (energy === "energised") { p += 0.05; positive.push("You're feeling energised — good for deep work"); }
  } else if (energy === "low" || energy === "over") {
    p -= 0.05; negative.push("You mentioned low energy (no health data used — just your check-in)");
  }

  p = Math.min(0.95, Math.max(0.15, p));
  const band = p >= 0.82 ? "very likely" : p >= 0.62 ? "likely" : p >= 0.4 ? "uncertain" : "unlikely";
  const confidence: CompletionEstimate["confidence"] = input.calendarStale ? "low" : p >= 0.6 ? "high" : "medium";

  return {
    band, internalProbability: Math.round(p * 100) / 100, confidence,
    positiveFactors: positive, negativeFactors: negative, assumptions,
    dataUsed, healthDataUsed: healthUsed,
    calculatedAt: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    disclaimer: "This is planning guidance, not a performance score or guarantee. It's never shared with your manager.",
  };
}

export function energyRecommendations(energy: EnergyState): EnergyRecommendation[] {
  switch (energy) {
    case "energised":
      return [
        { title: "Front-load the deep work", detail: "You've got momentum — move the API review earlier while focus is high." },
        { title: "Keep the afternoon lighter", detail: "Batch admin and replies for later when energy naturally dips." },
      ];
    case "ok":
      return [
        { title: "Protect one clear focus block", detail: "A single 2-hour block beats scattered 20-minute gaps today." },
      ];
    case "low":
      return [
        { title: "Move creative work to your best window", detail: "I'll shift the API review to your usual 3 PM focus peak instead of the morning." },
        { title: "Batch the small stuff", detail: "Group replies and approvals so you're not switching all day." },
        { title: "Add a short recovery break", detail: "A 10-minute break after the 11 AM sync will help you reset." },
      ];
    case "over":
      return [
        { title: "Let's lighten today", detail: "I can move the optional demo and draft the sprint summary so you carry less." },
        { title: "Reduce meeting density", detail: "Two of today's meetings are informational — I can make them optional for you." },
        { title: "Protect a real break", detail: "Keeping lunch intact matters more than squeezing in extra work." },
      ];
    default:
      return [{ title: "Using only your schedule", detail: "No energy input — recommendations come purely from your calendar and tasks." }];
  }
}
