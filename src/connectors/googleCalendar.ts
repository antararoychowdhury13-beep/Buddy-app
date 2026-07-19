import { google } from "googleapis";
import type { EventRecord } from "../types.js";
import { createOAuthClient } from "./googleOAuth.js";

/**
 * Google Calendar connector (read-only, single user). Takes the refresh
 * token as a parameter — it's per-connection data that lives in the
 * `connector` table, managed via the in-app Connect/Disconnect flow (or
 * `npm run auth:google` as a CLI fallback), not a static .env value.
 */
export interface RawCalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
}

export async function fetchCalendarEvents(refreshToken: string): Promise<RawCalendarEvent[]> {
  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: "v3", auth });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? [])
    .filter((event) => event.id && (event.start?.dateTime || event.start?.date))
    .map((event) => ({
      id: event.id as string,
      summary: event.summary ?? "(no title)",
      start: (event.start?.dateTime ?? event.start?.date) as string,
      end: (event.end?.dateTime ?? event.end?.date) as string,
    }));
}

export function normalizeCalendarEvents(
  userId: string,
  connectorId: string,
  raw: RawCalendarEvent[]
): Omit<EventRecord, "id">[] {
  return raw.map((event) => ({
    user_id: userId,
    connector_id: connectorId,
    type: "calendar_event",
    domain: "work",
    occurred_at: event.start,
    raw: { ...event },
  }));
}
