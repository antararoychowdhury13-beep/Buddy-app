import type { EventRecord } from "../types.js";

/**
 * OpenWeatherMap connector (5 day / 3 hour forecast, free tier). Picks the
 * forecast slot closest to a morning and an evening commute window.
 */
export interface RawWeatherForecast {
  window: string; // e.g. "morning" | "evening"
  at: string; // ISO datetime the window starts
  condition: string;
  precipitationProbability: number; // 0-1
}

interface OpenWeatherForecastEntry {
  dt: number; // unix seconds, UTC
  weather: { main: string }[];
  pop?: number;
}

interface OpenWeatherForecastResponse {
  city: { timezone: number }; // shift in seconds from UTC
  list: OpenWeatherForecastEntry[];
}

const MORNING_HOUR_RANGE: [number, number] = [6, 10];
const EVENING_HOUR_RANGE: [number, number] = [16, 20];

function localHour(unixSeconds: number, timezoneOffsetSeconds: number): number {
  return new Date((unixSeconds + timezoneOffsetSeconds) * 1000).getUTCHours();
}

function findFirstInRange(
  entries: OpenWeatherForecastEntry[],
  timezoneOffsetSeconds: number,
  [start, end]: [number, number]
): OpenWeatherForecastEntry | undefined {
  return entries.find((e) => {
    const hour = localHour(e.dt, timezoneOffsetSeconds);
    return hour >= start && hour <= end;
  });
}

export async function fetchWeatherForecast(): Promise<RawWeatherForecast[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const location = process.env.WEATHER_LOCATION ?? "Bengaluru,IN";
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not set. Add it to .env before running the weather connector.");
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenWeatherMap request failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as OpenWeatherForecastResponse;

  const morning = findFirstInRange(data.list, data.city.timezone, MORNING_HOUR_RANGE);
  const evening = findFirstInRange(data.list, data.city.timezone, EVENING_HOUR_RANGE);

  const toForecast = (entry: OpenWeatherForecastEntry, window: string): RawWeatherForecast => ({
    window,
    at: new Date(entry.dt * 1000).toISOString(),
    condition: entry.weather[0]?.main.toLowerCase() ?? "unknown",
    precipitationProbability: entry.pop ?? 0,
  });

  const result: RawWeatherForecast[] = [];
  if (morning) result.push(toForecast(morning, "morning"));
  if (evening) result.push(toForecast(evening, "evening"));
  return result;
}

export function normalizeWeatherForecast(
  userId: string,
  connectorId: string,
  raw: RawWeatherForecast[]
): Omit<EventRecord, "id">[] {
  return raw.map((forecast) => ({
    user_id: userId,
    connector_id: connectorId,
    type: "weather_forecast",
    domain: "commute",
    occurred_at: forecast.at,
    raw: { ...forecast },
  }));
}
