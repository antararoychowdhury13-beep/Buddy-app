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

/** Finds the first pair of calendar events with 5 minutes or less between them. */
function findBackToBackMeetings(calendarEvents: EventRecord[]): [EventRecord, EventRecord] | null {
  const sorted = [...calendarEvents].sort(
    (a, b) => new Date((a.raw as { start: string }).start).getTime() - new Date((b.raw as { start: string }).start).getTime()
  );
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const aEnd = new Date((a.raw as { end: string }).end).getTime();
    const bStart = new Date((b.raw as { start: string }).start).getTime();
    const gapMinutes = (bStart - aEnd) / 60000;
    if (gapMinutes >= 0 && gapMinutes <= 5) {
      return [a, b];
    }
  }
  return null;
}

async function getOrCreateConnector(
  userId: string,
  type: "google_calendar" | "weather"
): Promise<{ row: Awaited<ReturnType<typeof insertConnectorRow>>; wasJustCreated: boolean }> {
  const { data: existing, error } = await db
    .from("connector")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle();
  if (error) throw error;
  if (existing) return { row: existing, wasJustCreated: false };

  return { row: await insertConnectorRow(userId, type), wasJustCreated: true };
}

async function insertConnectorRow(userId: string, type: "google_calendar" | "weather") {
  const { data: created, error: createErr } = await db
    .from("connector")
    .insert({ user_id: userId, type, status: "disconnected" })
    .select("*")
    .single();
  if (createErr) throw createErr;
  return created;
}

/**
 * Credentials live on the connector row (managed via the in-app Connect flow
 * on the Me page), not static .env values. The .env fallback only applies
 * the very first time this connector's row is created — never once a row
 * already exists, so an explicit Disconnect in the UI (which clears the row
 * but doesn't delete it) is respected instead of silently re-migrated back.
 */
async function getGoogleRefreshToken(userId: string): Promise<{ connectorId: string; refreshToken: string }> {
  const { row: connector, wasJustCreated } = await getOrCreateConnector(userId, "google_calendar");
  if (connector.refresh_token) {
    return { connectorId: connector.id, refreshToken: connector.refresh_token };
  }

  const envToken = wasJustCreated ? process.env.GOOGLE_REFRESH_TOKEN : undefined;
  if (envToken) {
    const { data, error } = await db
      .from("connector")
      .update({ refresh_token: envToken, status: "connected" })
      .eq("id", connector.id)
      .select("*")
      .single();
    if (error) throw error;
    console.log("(migrated GOOGLE_REFRESH_TOKEN from .env into the connector table)");
    return { connectorId: data.id, refreshToken: envToken };
  }

  throw new Error(
    "Google Calendar isn't connected. Connect it from the Me page in the app (or run `npm run auth:google`)."
  );
}

async function getWeatherCredentials(
  userId: string
): Promise<{ connectorId: string; apiKey: string; location: string }> {
  const { row: connector, wasJustCreated } = await getOrCreateConnector(userId, "weather");
  const metadata = (connector.metadata ?? {}) as { apiKey?: string; location?: string };
  if (metadata.apiKey) {
    return { connectorId: connector.id, apiKey: metadata.apiKey, location: metadata.location ?? "Bengaluru,IN" };
  }

  const envKey = wasJustCreated ? process.env.OPENWEATHER_API_KEY : undefined;
  if (envKey) {
    const migrated = { apiKey: envKey, location: process.env.WEATHER_LOCATION ?? "Bengaluru,IN" };
    const { data, error } = await db
      .from("connector")
      .update({ metadata: migrated, status: "connected" })
      .eq("id", connector.id)
      .select("*")
      .single();
    if (error) throw error;
    console.log("(migrated OPENWEATHER_API_KEY from .env into the connector table)");
    return { connectorId: data.id, apiKey: migrated.apiKey, location: migrated.location };
  }

  throw new Error("Weather isn't connected. Connect it from the Me page in the app.");
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

  const evening = weatherEvents.find((e) => (e.raw as any).window === "evening");
  const morning = weatherEvents.find((e) => (e.raw as any).window === "morning");

  const candidates: CandidateInsight[] = [];

  const backToBack = findBackToBackMeetings(calendarEvents);
  if (backToBack) {
    const [a, b] = backToBack;
    const aRaw = a.raw as { summary: string; end: string };
    const bRaw = b.raw as { summary: string };
    const endTime = new Date(aRaw.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    candidates.push({
      domain: "work",
      sourceEventIds: [a.id, b.id],
      candidateText: `Your ${aRaw.summary} ends at ${endTime} right as your ${bRaw.summary} starts, with no buffer between them.`,
      sourceDirectness: 1.0, // directly read off the calendar, no inference
      evidenceMaturity: workEvidenceMaturity,
      domainAccuracy: workDomainAccuracy,
      stakesMultiplier: 0.8,
    });

    candidates.push({
      domain: "work",
      sourceEventIds: [a.id, b.id],
      candidateText: "Your day looks like it might be running you a little ragged, with back-to-back meetings and no breathing room.",
      sourceDirectness: 0.3, // inferred pattern, not a direct fact
      evidenceMaturity: workEvidenceMaturity,
      domainAccuracy: workDomainAccuracy,
      stakesMultiplier: 0.5,
    });
  }

  if (evening) {
    const raw = evening.raw as { condition: string; precipitationProbability: number };
    const rainy = raw.precipitationProbability >= 0.4;

    if (rainy) {
      candidates.push({
        domain: "commute",
        sourceEventIds: [evening.id],
        candidateText: `Traffic may run heavier than usual on your evening commute because of the forecasted ${raw.condition} (${Math.round(raw.precipitationProbability * 100)}% chance).`,
        sourceDirectness: 0.5, // derived from the rain forecast, not observed directly
        evidenceMaturity: commuteEvidenceMaturity,
        domainAccuracy: commuteDomainAccuracy,
        stakesMultiplier: 0.7,
      });

      candidates.push({
        domain: "commute",
        sourceEventIds: [evening.id],
        candidateText: `${raw.condition[0].toUpperCase()}${raw.condition.slice(1)} is likely during your evening commute (${Math.round(raw.precipitationProbability * 100)}% chance) — worth leaving 15 minutes early and grabbing an umbrella.`,
        sourceDirectness: 0.9,
        evidenceMaturity: commuteEvidenceMaturity,
        domainAccuracy: commuteDomainAccuracy,
        stakesMultiplier: 0.9,
      });
    } else {
      candidates.push({
        domain: "commute",
        sourceEventIds: [evening.id],
        candidateText: `Evening commute looks dry (${raw.condition}) — no umbrella needed.`,
        sourceDirectness: 1.0,
        evidenceMaturity: commuteEvidenceMaturity,
        domainAccuracy: commuteDomainAccuracy,
        stakesMultiplier: 1.0, // trivial to be wrong about, no real downside
      });
    }
  }

  if (morning) {
    const raw = morning.raw as { condition: string; precipitationProbability: number };
    const rainy = raw.precipitationProbability >= 0.4;

    candidates.push({
      domain: "commute",
      sourceEventIds: [morning.id],
      candidateText: rainy
        ? `${raw.condition[0].toUpperCase()}${raw.condition.slice(1)} expected for your morning commute (${Math.round(raw.precipitationProbability * 100)}% chance) — worth an umbrella.`
        : `Clear skies for your morning commute (${raw.condition}) — no umbrella needed.`,
      sourceDirectness: 1.0,
      evidenceMaturity: commuteEvidenceMaturity,
      domainAccuracy: commuteDomainAccuracy,
      stakesMultiplier: rainy ? 0.9 : 1.0,
    });
  }

  return candidates;
}

async function main() {
  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) throw new Error("BUDDY_USER_EMAIL must be set in .env");

  const user = await getOrCreateSingleUser(email);
  console.log(`User: ${user.email} (${user.id})`);

  const { connectorId: calendarConnectorId, refreshToken } = await getGoogleRefreshToken(user.id);
  const { connectorId: weatherConnectorId, apiKey, location } = await getWeatherCredentials(user.id);

  const rawCalendar = await fetchCalendarEvents(refreshToken);
  const rawWeather = await fetchWeatherForecast(apiKey, location);

  const calendarEvents = await insertEvents(
    normalizeCalendarEvents(user.id, calendarConnectorId, rawCalendar)
  );
  const weatherEvents = await insertEvents(
    normalizeWeatherForecast(user.id, weatherConnectorId, rawWeather)
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
