import { db } from "./db.js";
import type { Domain, FeedbackAction, TrustScoreRecord } from "./types.js";

export async function getTrustScore(
  userId: string,
  domain: Domain
): Promise<TrustScoreRecord | null> {
  const { data, error } = await db
    .from("trust_score")
    .select("*")
    .eq("user_id", userId)
    .eq("domain", domain)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function seedTrustScore(
  userId: string,
  domain: Domain,
  fields: Partial<
    Pick<TrustScoreRecord, "confirmed_count" | "dismissed_count" | "evidence_count">
  >
): Promise<TrustScoreRecord> {
  const existing = await getTrustScore(userId, domain);
  const confirmed = fields.confirmed_count ?? existing?.confirmed_count ?? 0;
  const dismissed = fields.dismissed_count ?? existing?.dismissed_count ?? 0;
  const evidence = fields.evidence_count ?? existing?.evidence_count ?? 0;
  const total = confirmed + dismissed;
  const accuracy = total === 0 ? 0.5 : confirmed / total;

  const { data, error } = await db
    .from("trust_score")
    .upsert(
      {
        user_id: userId,
        domain,
        confirmed_count: confirmed,
        dismissed_count: dismissed,
        evidence_count: evidence,
        accuracy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,domain" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Applies one piece of feedback to a domain's running trust score. */
export async function applyFeedback(
  userId: string,
  domain: Domain,
  action: FeedbackAction
): Promise<TrustScoreRecord> {
  const existing = await getTrustScore(userId, domain);
  const confirmed = (existing?.confirmed_count ?? 0) + (action === "confirmed" ? 1 : 0);
  const dismissed = (existing?.dismissed_count ?? 0) + (action === "dismissed" ? 1 : 0);
  const ignored = (existing?.ignored_count ?? 0) + (action === "ignored" ? 1 : 0);
  const evidence = (existing?.evidence_count ?? 0) + 1;
  const total = confirmed + dismissed;
  const accuracy = total === 0 ? 0.5 : confirmed / total;

  const { data, error } = await db
    .from("trust_score")
    .upsert(
      {
        user_id: userId,
        domain,
        confirmed_count: confirmed,
        dismissed_count: dismissed,
        ignored_count: ignored,
        evidence_count: evidence,
        accuracy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,domain" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
