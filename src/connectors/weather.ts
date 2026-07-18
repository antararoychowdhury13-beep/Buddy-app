import type { EventRecord } from "../types.js";

/**
 * Mock weather connector. Shaped like an OpenWeatherMap-style forecast response
 * so swapping in the real API later only touches this file.
 */
export interface RawWeatherForecast {
  window: string; // e.g. "morning" | "evening"
  at: string; // ISO datetime the window starts
  condition: string;
  precipitationProbability: number; // 0-1
}

export async function fetchWeatherForecast(): Promise<RawWeatherForecast[]> {
  const today = new Date();
  const at = (hour: number) => {
    const d = new Date(today);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return [
    { window: "morning", at: at(8), condition: "clear", precipitationProbability: 0.05 },
    { window: "evening", at: at(18), condition: "rain", precipitationProbability: 0.75 },
  ];
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
