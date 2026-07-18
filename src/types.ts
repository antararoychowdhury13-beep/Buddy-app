export type Domain = "work" | "commute" | "health" | "family" | "finance" | "other";

export type EventType = "calendar_event" | "weather_forecast";

export type Tier = "silent" | "passive" | "ambient" | "proactive";

export type FeedbackAction = "confirmed" | "dismissed" | "ignored";

export interface AppUser {
  id: string;
  email: string;
  display_name: string | null;
}

export interface Connector {
  id: string;
  user_id: string;
  type: "google_calendar" | "weather";
  status: "connected" | "error" | "disconnected";
  metadata: Record<string, unknown>;
}

export interface EventRecord {
  id: string;
  user_id: string;
  connector_id: string | null;
  type: EventType;
  domain: Domain;
  occurred_at: string;
  raw: Record<string, unknown>;
}

export interface CandidateInsight {
  domain: Domain;
  sourceEventIds: string[];
  candidateText: string;
  /** Inputs to the confidence formula, each already normalized to [0, 1]. */
  sourceDirectness: number;
  evidenceMaturity: number;
  domainAccuracy: number;
  /** Stakes multiplier in (0, 1]: 1 = low stakes (safe to guess), lower = higher stakes (be more conservative). */
  stakesMultiplier: number;
}

export interface ScoredInsight extends CandidateInsight {
  confidence: number;
  tier: Tier;
}

/** Shape of a row as it actually comes back from the `insight` table (snake_case, DB boundary only). */
export interface InsightRow {
  id: string;
  user_id: string;
  domain: Domain;
  source_event_ids: string[];
  candidate_text: string;
  confidence: number;
  tier: Tier;
  composed_text: string | null;
  delivered_at: string | null;
  created_at: string;
}

/** Application-facing domain object — camelCase everywhere, no DB column names leak past `toInsight`. */
export interface Insight {
  id: string;
  userId: string;
  domain: Domain;
  sourceEventIds: string[];
  candidateText: string;
  confidence: number;
  tier: Tier;
  composedText: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export function toInsight(row: InsightRow): Insight {
  return {
    id: row.id,
    userId: row.user_id,
    domain: row.domain,
    sourceEventIds: row.source_event_ids,
    candidateText: row.candidate_text,
    confidence: row.confidence,
    tier: row.tier,
    composedText: row.composed_text,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
  };
}

export interface TrustScoreRecord {
  id: string;
  user_id: string;
  domain: Domain;
  confirmed_count: number;
  dismissed_count: number;
  ignored_count: number;
  evidence_count: number;
  accuracy: number;
}
