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

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Restricts a user-supplied redirect target to an internal relative path, preventing open-redirect. */
export function safeInternalPath(path: unknown, fallback = "/"): string {
  if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return fallback;
}
