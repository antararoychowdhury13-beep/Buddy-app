import { google } from "googleapis";
import type { EventRecord } from "../types.js";

/**
 * Google Calendar connector (read-only, single user). Requires GOOGLE_CLIENT_ID,
 * GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env — run
 * `npm run auth:google` once to obtain the refresh token via the one-time
 * OAuth consent flow.
 */
export interface RawCalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN must be set in .env. Run `npm run auth:google` after creating an OAuth client in Google Cloud Console."
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function fetchCalendarEvents(): Promise<RawCalendarEvent[]> {
  const auth = getOAuthClient();
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
