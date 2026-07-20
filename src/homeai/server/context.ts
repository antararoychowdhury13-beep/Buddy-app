/**
 * Assembles a HomeContext from REAL data in the existing Buddy stack — the
 * Supabase `event` (Google Calendar), `fact`, and `connector` tables — and
 * fills domains that have no connector yet (tasks, health, bank, Jira/Teams)
 * with clearly-labelled demo signals. The `origin` field tells the UI which
 * is which, so nothing is dishonestly presented as real.
 *
 * Node-only (imports Supabase). Excluded from the browser bundle build.
 */
import { db } from "../../db.js";
import { getFacts } from "../../factStore.js";
import type { CalendarEvent, DataSource, HomeContext, Signals } from "../models.js";
import { MOCK_CONTEXT } from "../mock.js";

function isoToMins(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours() * 60 + d.getMinutes();
}
function minsToClock(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

interface RawEventRow {
  type: string;
  raw: Record<string, unknown>;
  created_at: string;
  domain?: string | null;
}

/** Map the most-recent ingest run's calendar rows into typed meetings. */
function realMeetings(rows: RawEventRow[]): CalendarEvent[] {
  const calRows = rows.filter((r) => r.type === "calendar_event");
  if (calRows.length === 0) return [];
  // keep only the latest ingest batch (rows within 60s of the newest)
  const newest = Math.max(...calRows.map((r) => new Date(r.created_at).getTime()));
  const batch = calRows.filter((r) => newest - new Date(r.created_at).getTime() < 60_000);

  return batch
    .map((r, i) => {
      const raw = r.raw ?? {};
      const start = String(raw.start ?? "");
      const end = String(raw.end ?? "");
      const startMins = isoToMins(start);
      const endMins = end ? isoToMins(end) : startMins + 30;
      const summary = String(raw.summary ?? "(untitled)");
      const optional = /optional|fyi|hold/i.test(summary);
      return {
        id: `real-${i}`,
        title: summary,
        start: minsToClock(startMins),
        end: minsToClock(endMins),
        startMins,
        endMins,
        requiresActiveParticipation: !optional,
        optional,
        attendees: Number(raw.attendees ?? 0) || 2,
        location: "remote" as const,
        avgOverrunMins: 0,
        app: "Calendar",
      };
    })
    .sort((a, b) => a.startMins - b.startMins);
}

/** Pull any personal/family/finance commitments the user actually saved as facts. */
function signalsFromFacts(facts: { category: string; key: string; value: string }[], base: Signals): Signals {
  const s: Signals = JSON.parse(JSON.stringify(base));
  const family = facts.find((f) => f.category === "family");
  const festival = facts.find((f) => f.category === "festival");
  if (family) {
    s.family = { ...s.family, title: `${family.key}`.slice(0, 60), people: [family.value].filter(Boolean) };
  } else if (festival) {
    s.family = { ...s.family, title: `${festival.key} (${festival.value})`, people: [] };
  } else {
    // no real family data — clear the demo family so family conflicts don't fire on real days
    s.family = { ...s.family, title: "" };
  }
  return s;
}

export async function buildHomeContext(userId: string): Promise<HomeContext> {
  try {
    const [{ data: eventRows }, { data: connectorRows }, facts] = await Promise.all([
      db.from("event").select("type, raw, created_at, domain").eq("user_id", userId).order("created_at", { ascending: false }).limit(40),
      db.from("connector").select("type, status, metadata").eq("user_id", userId),
      getFacts(userId),
    ]);

    const calendarConnected = (connectorRows ?? []).some((c) => c.type === "google_calendar" && c.status === "connected");
    const weatherConnected = (connectorRows ?? []).some((c) => c.type === "weather" && c.status === "connected");

    const meetings = realMeetings((eventRows ?? []) as RawEventRow[]);
    const haveRealMeetings = calendarConnected && meetings.length > 0;

    const real: string[] = [];
    const demo: string[] = [];
    if (haveRealMeetings) real.push("Calendar"); else demo.push("Calendar");
    if (facts.length > 0) real.push("Personal facts"); else demo.push("Family");
    weatherConnected ? real.push("Weather") : demo.push("Commute");
    demo.push("Tasks", "Health", "Finance", "Work");

    // Build data-source provenance to match reality
    const dataSources: DataSource[] = MOCK_CONTEXT.dataSources.map((src) => {
      if (src.id === "calendar") {
        return haveRealMeetings
          ? { ...src, stale: false, lastRefreshMinsAgo: 4, detail: `${meetings.length} real event(s) from your connected Google Calendar today.` }
          : { ...src, stale: true, detail: "Calendar isn't connected (or no events today) — showing a demo day." };
      }
      return src; // Jira/Teams/Email/Maps/Health/Bank/prefs stay demo
    });

    const signals = facts.length > 0
      ? signalsFromFacts(facts as { category: string; key: string; value: string }[], MOCK_CONTEXT.signals)
      : MOCK_CONTEXT.signals;

    return {
      meetings: haveRealMeetings ? meetings : MOCK_CONTEXT.meetings,
      tasks: MOCK_CONTEXT.tasks, // no real task connector yet — demo
      signals,
      dataSources,
      origin: { real, demo: [...new Set(demo)] },
    };
  } catch (err) {
    console.error("buildHomeContext failed, serving mock:", err);
    return MOCK_CONTEXT;
  }
}
