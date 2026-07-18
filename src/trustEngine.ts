import type { CandidateInsight, ScoredInsight, Tier, TrustScoreRecord } from "./types.js";

/**
 * Fixed tier thresholds for v1 (no ML yet — see Buddy_Architecture_and_Trust_Engine.md).
 * confidence >= proactive -> proactive; >= ambient -> ambient; >= passive -> passive; else silent.
 */
export const TIER_THRESHOLDS: Record<Exclude<Tier, "silent">, number> = {
  proactive: 0.75,
  ambient: 0.5,
  passive: 0.3,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** confidence = source directness x evidence maturity x domain accuracy, discounted by a stakes multiplier. */
export function computeConfidence(candidate: CandidateInsight): number {
  const raw =
    candidate.sourceDirectness *
    candidate.evidenceMaturity *
    candidate.domainAccuracy *
    candidate.stakesMultiplier;
  return clamp(raw, 0, 1);
}

export function assignTier(confidence: number): Tier {
  if (confidence >= TIER_THRESHOLDS.proactive) return "proactive";
  if (confidence >= TIER_THRESHOLDS.ambient) return "ambient";
  if (confidence >= TIER_THRESHOLDS.passive) return "passive";
  return "silent";
}

export function scoreInsights(candidates: CandidateInsight[]): ScoredInsight[] {
  return candidates.map((candidate) => {
    const confidence = computeConfidence(candidate);
    return { ...candidate, confidence, tier: assignTier(confidence) };
  });
}

/** No confirm/dismiss history yet -> neutral prior, matches "TrustScore.accuracy default 0.5" in the schema. */
export function domainAccuracyFromTrustScore(trustScore: TrustScoreRecord | null): number {
  if (!trustScore) return 0.5;
  const total = trustScore.confirmed_count + trustScore.dismissed_count;
  if (total === 0) return 0.5;
  return trustScore.confirmed_count / total;
}

/** Evidence maturity ramps from 0 to 1 as a domain accumulates insight history; matures at `matureAt` insights. */
export function evidenceMaturityFromTrustScore(
  trustScore: TrustScoreRecord | null,
  matureAt = 20
): number {
  if (!trustScore) return 0;
  return clamp(trustScore.evidence_count / matureAt, 0, 1);
}
