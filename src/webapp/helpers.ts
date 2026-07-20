import type { Domain, Tier } from "../types.js";

export const DOMAIN_META: Record<Domain, { icon: string; chip: string; label: string }> = {
  work: { icon: "briefcase", chip: "iris", label: "Work" },
  commute: { icon: "map-pin", chip: "violet", label: "Commute" },
  health: { icon: "heart", chip: "good", label: "Health" },
  family: { icon: "family", chip: "rose", label: "Family" },
  finance: { icon: "coin", chip: "warn", label: "Finance" },
  other: { icon: "grid", chip: "iris", label: "Other" },
};

export function tierPillHtml(tier: Tier): string {
  return `<span class="tier-pill ${tier}">${tier}</span>`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Good day" is what a stranger says. A chief of staff knows what time it is. */
export function timeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Still up,";
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  if (hour < 21) return "Good evening,";
  return "Winding down,";
}

/** Restricts a user-supplied redirect target to an internal relative path, preventing open-redirect. */
export function safeInternalPath(path: unknown, fallback = "/"): string {
  if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return fallback;
}

