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

export interface InsightRecord extends ScoredInsight {
  id: string;
  user_id: string;
  composed_text: string | null;
  delivered_at: string | null;
  created_at: string;
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
