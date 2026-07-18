import "dotenv/config";
import { db, getOrCreateSingleUser } from "../src/db.js";
import { fetchCalendarEvents, normalizeCalendarEvents } from "../src/connectors/googleCalendar.js";
import { fetchWeatherForecast, normalizeWeatherForecast } from "../src/connectors/weather.js";
import {
  domainAccuracyFromTrustScore,
  evidenceMaturityFromTrustScore,
  scoreInsights,
} from "../src/trustEngine.js";
import { getTrustScore, seedTrustScore } from "../src/trustScoreStore.js";
import { composeBriefing } from "../src/reasoning.js";
import type { CandidateInsight, Domain, EventRecord } from "../src/types.js";

async function upsertConnector(userId: string, type: "google_calendar" | "weather") {
  const { data, error } = await db
    .from("connector")
    .upsert({ user_id: userId, type, status: "connected" }, { onConflict: "user_id,type" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function insertEvents(rows: Omit<EventRecord, "id">[]): Promise<EventRecord[]> {
  if (rows.length === 0) return [];
  const { data, error } = await db.from("event").insert(rows).select("*");
  if (error) throw error;
  return data;
}

/** First-run seeding: "work" starts nearly cold, "commute" already has an established track record. */
async function ensureSeedTrustScores(userId: string) {
  const work = await getTrustScore(userId, "work");
  if (!work) {
    await seedTrustScore(userId, "work", {
      confirmed_count: 1,
      dismissed_count: 1,
      evidence_count: 3,
    });
  }
  const commute = await getTrustScore(userId, "commute");
  if (!commute) {
    await seedTrustScore(userId, "commute", {
      confirmed_count: 18,
      dismissed_count: 2,
      evidence_count: 25,
    });
  }
}

async function buildCandidates(
  userId: string,
  calendarEvents: EventRecord[],
  weatherEvents: EventRecord[]
): Promise<CandidateInsight[]> {
  const workTs = await getTrustScore(userId, "work");
  const commuteTs = await getTrustScore(userId, "commute");

  const workDomainAccuracy = domainAccuracyFromTrustScore(workTs);
  const workEvidenceMaturity = evidenceMaturityFromTrustScore(workTs);
  const commuteDomainAccuracy = domainAccuracyFromTrustScore(commuteTs);
  const commuteEvidenceMaturity = evidenceMaturityFromTrustScore(commuteTs);

  const designReview = calendarEvents.find((e) => (e.raw as any).id === "cal_1");
  const oneOnOne = calendarEvents.find((e) => (e.raw as any).id === "cal_2");
  const evening = weatherEvents.find((e) => (e.raw as any).window === "evening");
  const morning = weatherEvents.find((e) => (e.raw as any).window === "morning");

  const candidates: CandidateInsight[] = [];

  if (designReview && oneOnOne) {
    candidates.push({
      domain: "work",
      sourceEventIds: [designReview.id, oneOnOne.id],
      candidateText:
        "Your design review ends at 3:00pm right as your 1:1 with your manager starts, with no buffer between them.",
      sourceDirectness: 1.0, // directly read off the calendar, no inference
      evidenceMaturity: workEvidenceMaturity,
      domainAccuracy: workDomainAccuracy,
      stakesMultiplier: 0.8,
    });

    candidates.push({
      domain: "work",
      sourceEventIds: [designReview.id, oneOnOne.id],
      candidateText: "Your afternoon looks like it might be running you a little ragged this week.",
      sourceDirectness: 0.3, // inferred pattern, not a direct fact
      evidenceMaturity: workEvidenceMaturity,
      domainAccuracy: workDomainAccuracy,
      stakesMultiplier: 0.5,
    });
  }

  if (evening) {
    candidates.push({
      domain: "commute",
      sourceEventIds: [evening.id],
      candidateText: "Traffic may run heavier than usual on your evening commute because of the forecasted rain.",
      sourceDirectness: 0.5, // derived from the rain forecast, not observed directly
      evidenceMaturity: commuteEvidenceMaturity,
      domainAccuracy: commuteDomainAccuracy,
      stakesMultiplier: 0.7,
    });

    candidates.push({
      domain: "commute",
      sourceEventIds: [evening.id],
      candidateText: "Rain is likely during your evening commute — worth leaving 15 minutes early and grabbing an umbrella.",
      sourceDirectness: 0.9,
      evidenceMaturity: commuteEvidenceMaturity,
      domainAccuracy: commuteDomainAccuracy,
      stakesMultiplier: 0.9,
    });
  }

  if (morning) {
    candidates.push({
      domain: "commute",
      sourceEventIds: [morning.id],
      candidateText: "Clear skies for your morning commute — no umbrella needed.",
      sourceDirectness: 1.0,
      evidenceMaturity: commuteEvidenceMaturity,
      domainAccuracy: commuteDomainAccuracy,
      stakesMultiplier: 1.0, // trivial to be wrong about, no real downside
    });
  }

  return candidates;
}

async function main() {
  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) throw new Error("BUDDY_USER_EMAIL must be set in .env");

  const user = await getOrCreateSingleUser(email);
  console.log(`User: ${user.email} (${user.id})`);

  const calendarConnector = await upsertConnector(user.id, "google_calendar");
  const weatherConnector = await upsertConnector(user.id, "weather");

  const rawCalendar = await fetchCalendarEvents();
  const rawWeather = await fetchWeatherForecast();

  const calendarEvents = await insertEvents(
    normalizeCalendarEvents(user.id, calendarConnector.id, rawCalendar)
  );
  const weatherEvents = await insertEvents(
    normalizeWeatherForecast(user.id, weatherConnector.id, rawWeather)
  );
  console.log(`Stored ${calendarEvents.length} calendar events, ${weatherEvents.length} weather events.`);

  await ensureSeedTrustScores(user.id);

  const candidates = await buildCandidates(user.id, calendarEvents, weatherEvents);
  const scored = scoreInsights(candidates);

  console.log("\nScored candidates:");
  for (const s of scored) {
    console.log(
      `  [${s.tier.toUpperCase().padEnd(9)}] (${s.confidence.toFixed(2)}) ${s.domain}: ${s.candidateText}`
    );
  }

  const { data: insertedInsights, error: insightErr } = await db
    .from("insight")
    .insert(
      scored.map((s) => ({
        user_id: user.id,
        domain: s.domain,
        source_event_ids: s.sourceEventIds,
        candidate_text: s.candidateText,
        confidence: s.confidence,
        tier: s.tier,
      }))
    )
    .select("*");
  if (insightErr) throw insightErr;

  const cleared = scored.filter((s) => s.tier !== "silent");
  const silentCount = scored.length - cleared.length;
  console.log(`\n${cleared.length} insight(s) cleared for delivery, ${silentCount} correctly stayed silent.`);

  let briefingText: string;
  try {
    briefingText = await composeBriefing(cleared);
  } catch (err) {
    console.warn(`\nReasoning step skipped: ${(err as Error).message}`);
    briefingText =
      cleared.length === 0
        ? "Nothing worth surfacing today."
        : cleared.map((c) => c.candidateText).join(" ");
  }

  const clearedIds = insertedInsights
    .filter((row) => row.tier !== "silent")
    .map((row) => row.id);

  const deliveredAt = new Date().toISOString();
  if (clearedIds.length > 0) {
    await db.from("insight").update({ composed_text: briefingText, delivered_at: deliveredAt }).in(
      "id",
      clearedIds
    );
  }

  await db.from("briefing").insert({
    user_id: user.id,
    composed_text: briefingText,
    insight_ids: clearedIds,
  });

  console.log("\n=== Today's Briefing ===");
  console.log(briefingText);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
