/**
 * Dynamic importance ranking. A transparent weighted function produces an
 * internal score, but the UI shows a coarse tier (Critical/High/Medium/Low)
 * plus a plain-English reason — never an unexplained precise number.
 * Learning nudges (domainBias) and manual rank corrections adjust the order
 * but never touch permissions.
 */
import type { Conflict, LearningPrefs, PriorityItem, PriorityTier, Recommendation } from "../models.js";

export const WEIGHTS = {
  urgency: 0.24,
  consequenceOfDelay: 0.18,
  peopleAffected: 0.12,
  financialImpact: 0.08,
  personalImportance: 0.14,
  emotionalImportance: 0.08,
  timeRequired: 0.04,   // shorter = slightly higher
  reversibility: 0.04,  // irreversible = slightly higher
  dependencyImpact: 0.04,
  buddyCanHandle: 0.02, // if Buddy can handle, marginally lower user-priority
  contextRelevance: 0.02,
};

function scoreRecommendation(r: Recommendation, prefs: LearningPrefs): number {
  const peopleNorm = Math.min(1, r.peopleAffected / 5);
  const financeNorm = Math.min(1, r.financialImpact / 50000);
  const timeNorm = 1 - Math.min(1, r.estimatedMinutes / 60);
  const revNorm = r.reversible ? 0 : 1;
  let s =
    WEIGHTS.urgency * r.urgency +
    WEIGHTS.consequenceOfDelay * r.impact +
    WEIGHTS.peopleAffected * peopleNorm +
    WEIGHTS.financialImpact * financeNorm +
    WEIGHTS.personalImportance * r.emotionalImportance +
    WEIGHTS.emotionalImportance * r.emotionalImportance +
    WEIGHTS.timeRequired * timeNorm +
    WEIGHTS.reversibility * revNorm +
    WEIGHTS.dependencyImpact * peopleNorm +
    WEIGHTS.buddyCanHandle * (r.buddyCanHandle ? -1 : 1) * 0.5 +
    WEIGHTS.contextRelevance * 0.5;
  s += prefs.domainBias[r.domain] ?? 0;
  return s;
}

function tierFor(score: number): PriorityTier {
  if (score >= 0.62) return "critical";
  if (score >= 0.48) return "high";
  if (score >= 0.34) return "medium";
  return "low";
}

function reasonFor(r: Recommendation): string {
  if (r.peopleAffected >= 2) return `Ranked high because it blocks ${r.peopleAffected} teammates and is due before your 11 AM meeting.`;
  if (r.emotionalImportance >= 0.9) return `Ranked high because it's a protected family commitment with a hard start time.`;
  if (r.financialImpact > 0) return `Ranked here because it's money due soon with a late fee if missed, but it's a quick action.`;
  if (r.category === "protect") return `Ranked here because it safeguards your only unbroken focus window today.`;
  if (r.buddyCanHandle) return `Lower priority for you because Buddy can handle most of it with your review.`;
  return `Ranked on urgency and impact from today's calendar and tasks.`;
}

export interface RankInput {
  recommendations: Recommendation[];
  conflicts: Conflict[];
  prefs: LearningPrefs;
  manualOrder: Record<string, number>; // refId -> manual position override
}

export function rankPriorities(input: RankInput): PriorityItem[] {
  const items: PriorityItem[] = input.recommendations
    .filter((r) => r.status === "suggested" || r.status === "accepted")
    .map((r) => {
      const score = scoreRecommendation(r, input.prefs);
      return {
        id: `pri-${r.id}`, refId: r.id, kind: "recommendation" as const,
        title: r.title, domain: r.domain, tier: tierFor(score), score,
        explanation: reasonFor(r), buddyCanHandle: r.buddyCanHandle, estimatedMinutes: r.estimatedMinutes,
      };
    });

  // open conflicts always rank at least High
  for (const c of input.conflicts.filter((c) => c.status === "open")) {
    const base = c.severity === "high" ? 0.7 : c.severity === "medium" ? 0.55 : 0.4;
    items.push({
      id: `pri-${c.id}`, refId: c.id, kind: "conflict",
      title: c.title, domain: c.domains[0], tier: tierFor(base), score: base,
      explanation: `Ranked ${c.severity} because it's an unresolved conflict across ${c.domains.join(" & ")} affecting ${c.peopleAffected.length || "you"}.`,
      buddyCanHandle: false, estimatedMinutes: 5,
    });
  }

  items.sort((a, b) => {
    const am = input.manualOrder[a.refId];
    const bm = input.manualOrder[b.refId];
    if (am !== undefined && bm !== undefined) return am - bm;
    if (am !== undefined) return -1;
    if (bm !== undefined) return 1;
    return b.score - a.score;
  });
  return items;
}

export const TIER_META: Record<PriorityTier, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#D64545", bg: "#FCE9E9" },
  high: { label: "High", color: "#E8963A", bg: "#FBF0DF" },
  medium: { label: "Medium", color: "#2F6BFF", bg: "#E9F0FF" },
  low: { label: "Low", color: "#6B7280", bg: "#F0F1F4" },
};
