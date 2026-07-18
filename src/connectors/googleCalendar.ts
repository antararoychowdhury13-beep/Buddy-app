import type { EventRecord } from "../types.js";

/**
 * Mock Google Calendar connector. Shaped like what the real Google Calendar API
 * (events.list) would return, so swapping in the real client later only touches
 * this file, not the ingest pipeline or trust engine.
 */
export interface RawCalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
}

export async function fetchCalendarEvents(): Promise<RawCalendarEvent[]> {
  const today = new Date();
  const at = (hour: number, minute = 0) => {
    const d = new Date(today);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return [
    { id: "cal_1", summary: "Design review", start: at(14, 0), end: at(15, 0) },
    { id: "cal_2", summary: "1:1 with manager", start: at(15, 0), end: at(15, 30) },
    { id: "cal_3", summary: "Sprint planning", start: at(9, 0), end: at(10, 0) },
  ];
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
