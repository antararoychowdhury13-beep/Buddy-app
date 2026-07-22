/**
 * Seed content for Buddy's out-of-the-box demo mode (no Supabase, no API keys).
 * A single believable day for one user — connectors, calendar/weather events,
 * scored insights across every life domain, a composed briefing, per-domain
 * trust history, remembered facts, and a little notification history — so every
 * screen is populated the moment `npm run dev` starts. Swap in a real Supabase
 * project (set the env vars) and this is never touched.
 */
import type { MemoryDb } from "./memoryDb.js";

export const DEMO_EMAIL = "you@buddy.app";
export const DEMO_USER_ID = "demo-user-0001";
export const DEMO_DISPLAY_NAME = "Anupam";

export function seedDemoData(db: MemoryDb, email: string = DEMO_EMAIL): void {
  const now = new Date();
  const nowIso = now.toISOString();
  const at = (h: number, m: number): string => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const agoHours = (h: number): string => new Date(now.getTime() - h * 3600_000).toISOString();

  const uid = DEMO_USER_ID;

  // ---- User ----
  db.seed("app_user", [{ id: uid, email, display_name: DEMO_DISPLAY_NAME, created_at: nowIso }]);

  // ---- Connectors (real wiring comes later; shown as connected in the demo) ----
  db.seed("connector", [
    { id: "conn-cal", user_id: uid, type: "google_calendar", status: "connected", metadata: {}, refresh_token: null, created_at: nowIso },
    { id: "conn-weather", user_id: uid, type: "weather", status: "connected", metadata: { location: "Bengaluru,IN" }, created_at: nowIso },
  ]);

  // ---- Sign-in (one connected social account) ----
  db.seed("social_login", [
    { id: "sl-google", user_id: uid, provider: "google", name: DEMO_DISPLAY_NAME, email: DEMO_EMAIL, created_at: nowIso },
  ]);

  // ---- Today's raw events (calendar + weather) ----
  const events = [
    { id: "evt-standup", user_id: uid, connector_id: "conn-cal", type: "calendar_event", domain: "work", occurred_at: at(9, 0), raw: { id: "gcal-standup", summary: "Morning standup" }, created_at: nowIso },
    { id: "evt-review", user_id: uid, connector_id: "conn-cal", type: "calendar_event", domain: "work", occurred_at: at(11, 30), raw: { id: "gcal-review", summary: "Design review with Rahul" }, created_at: nowIso },
    { id: "evt-lunch", user_id: uid, connector_id: "conn-cal", type: "calendar_event", domain: "family", occurred_at: at(13, 0), raw: { id: "gcal-lunch", summary: "Lunch with Mum" }, created_at: nowIso },
    { id: "evt-1v1", user_id: uid, connector_id: "conn-cal", type: "calendar_event", domain: "work", occurred_at: at(16, 0), raw: { id: "gcal-1v1", summary: "1:1 with your manager" }, created_at: nowIso },
    { id: "evt-airport", user_id: uid, connector_id: "conn-cal", type: "calendar_event", domain: "family", occurred_at: at(18, 0), raw: { id: "gcal-airport", summary: "Pick up Mum from the airport" }, created_at: nowIso },
    { id: "evt-weather", user_id: uid, connector_id: "conn-weather", type: "weather_forecast", domain: "commute", occurred_at: at(17, 0), raw: { condition: "Light rain", window: "5–7pm" }, created_at: nowIso },
  ];
  db.seed("event", events);

  // ---- Scored insights (trust-engine output) ----
  // All share one created_at so Home treats them as the latest ingest batch.
  const mkInsight = (
    id: string,
    domain: string,
    tier: string,
    confidence: number,
    text: string,
    sourceEventIds: string[] = [],
    delivered = tier !== "silent"
  ) => ({
    id,
    user_id: uid,
    domain,
    source_event_ids: sourceEventIds,
    candidate_text: text,
    confidence,
    tier,
    composed_text: null,
    delivered_at: delivered ? nowIso : null,
    created_at: nowIso,
  });

  db.seed("insight", [
    mkInsight("ins-flight", "family", "proactive", 0.86, "Mum's flight lands at 6:40pm. I set a leave-by reminder for 5:15 so you beat the airport rush.", ["evt-airport"]),
    mkInsight("ins-focus", "work", "proactive", 0.83, "I declined the 2pm 'weekly sync' — it overlapped your focus block and had no owner. You can undo that if you want it back.", ["evt-1v1"]),
    mkInsight("ins-review", "work", "ambient", 0.78, "Your 11:30 design review with Rahul still has no agenda. I drafted three talking points from the thread.", ["evt-review"]),
    mkInsight("ins-sleep", "health", "ambient", 0.72, "You slept 7h 42m — only 15 minutes short of your target. I kept your morning light.", []),
    mkInsight("ins-bill", "finance", "ambient", 0.7, "Your electricity bill (₹2,340) is due tomorrow. I can remind you at 9am.", []),
    mkInsight("ins-rain", "commute", "passive", 0.66, "Light rain is expected 5–7pm. Leaving 10 minutes earlier should keep the airport run smooth.", ["evt-weather"]),
    // Held back — shown as "stayed quiet", proof Buddy reduces load.
    mkInsight("ins-recruiter", "work", "silent", 0.31, "A recruiter emailed about a role — low urgency, so I held it back.", []),
    mkInsight("ins-netflix", "other", "silent", 0.26, "A show you follow added a new season.", []),
    mkInsight("ins-screen", "health", "silent", 0.38, "Screen time was a little high last night — nothing worth a nudge.", []),
  ]);

  // ---- Composed daily briefing ----
  db.seed("briefing", [
    {
      id: "brief-today",
      user_id: uid,
      composed_text:
        "Good morning — I've already handled the busywork. Your day has four meetings, and I moved things so your morning stays protected: I declined a 2pm sync with no owner and drafted talking points for the 11:30 review with Rahul. The big one is this evening — Mum's flight lands at 6:40pm, so I've set a leave-by reminder for 5:15, a little earlier because light rain is expected around then. Your electricity bill is due tomorrow; say the word and I'll remind you at 9am. You don't have to do it all — just the next right thing.",
      created_at: nowIso,
    },
  ]);

  // ---- Per-domain trust history ----
  const mkTrust = (domain: string, confirmed: number, dismissed: number, ignored: number) => {
    const total = confirmed + dismissed;
    return {
      id: `trust-${domain}`,
      user_id: uid,
      domain,
      confirmed_count: confirmed,
      dismissed_count: dismissed,
      ignored_count: ignored,
      evidence_count: confirmed + dismissed + ignored,
      accuracy: total === 0 ? 0.5 : confirmed / total,
      updated_at: nowIso,
    };
  };
  db.seed("trust_score", [
    mkTrust("work", 14, 2, 3),
    mkTrust("family", 9, 0, 1),
    mkTrust("health", 6, 3, 2),
    mkTrust("commute", 5, 4, 1),
    mkTrust("finance", 3, 1, 0),
    mkTrust("other", 2, 2, 1),
  ]);

  // ---- Remembered personal facts ----
  db.seed("fact", [
    { id: "fact-wife", user_id: uid, category: "family", key: "Partner's phone number", value: "+91 98765 43210", created_at: nowIso, updated_at: nowIso },
    { id: "fact-home", user_id: uid, category: "home", key: "Home address", value: "42 Brigade Road, Bengaluru 560001", created_at: nowIso, updated_at: nowIso },
    { id: "fact-commute", user_id: uid, category: "office", key: "Office commute route", value: "Via Old Airport Road — about 35 minutes", created_at: nowIso, updated_at: nowIso },
    { id: "fact-diwali", user_id: uid, category: "festival", key: "Diwali", value: "November 12 — book train tickets home by early October", created_at: nowIso, updated_at: nowIso },
  ]);

  // ---- A little notification history (feedback the user already gave) ----
  db.seed("feedback", [
    { id: "fb-1", user_id: uid, insight_id: "ins-flight", action: "confirmed", created_at: agoHours(2) },
    { id: "fb-2", user_id: uid, insight_id: "ins-review", action: "confirmed", created_at: agoHours(4) },
    { id: "fb-3", user_id: uid, insight_id: "ins-recruiter", action: "dismissed", created_at: agoHours(6) },
  ]);
}
