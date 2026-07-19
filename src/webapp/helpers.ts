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

/** Restricts a user-supplied redirect target to an internal relative path, preventing open-redirect. */
export function safeInternalPath(path: unknown, fallback = "/"): string {
  if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return fallback;
}

/**
 * Roadmap directory shown on the Me page under "More integrations" — none of
 * these are wired up (only Calendar/Weather are real), shown honestly as
 * "Coming soon" rather than implying they work.
 */
export const PLANNED_INTEGRATIONS: { category: string; apps: string[] }[] = [
  { category: "Work & Productivity", apps: ["Outlook Calendar", "Slack", "Microsoft Teams", "Zoom", "Notion", "Asana", "Trello", "Jira", "Monday.com"] },
  { category: "Email & Messaging", apps: ["Gmail", "Outlook Mail", "WhatsApp", "Telegram", "Signal", "iMessage", "Discord", "Google Meet", "Webex", "Skype"] },
  { category: "Commute & Maps", apps: ["Google Maps", "Apple Maps", "Waze", "Uber", "Ola", "Rapido", "IRCTC", "Citymapper", "Moovit", "MapmyIndia"] },
  { category: "Finance & Banking", apps: ["Google Pay", "PhonePe", "Paytm", "HDFC Bank", "ICICI Bank", "SBI YONO", "Zerodha Kite", "Groww", "CRED", "Splitwise"] },
  { category: "Health & Fitness", apps: ["Apple Health", "Google Fit", "Fitbit", "Strava", "MyFitnessPal", "Practo", "Tata 1mg", "Cult.fit", "Headspace", "Calm"] },
  { category: "Family & Home", apps: ["Life360", "Google Family Link", "FamilyWall", "Cozi", "Amazon Alexa", "Google Home", "Ring", "Nest", "myGate", "NoBroker"] },
  { category: "Shopping & Food", apps: ["Amazon", "Flipkart", "Swiggy", "Zomato", "BigBasket", "Blinkit", "Myntra", "Ajio", "Instacart", "DoorDash"] },
  { category: "Entertainment & Media", apps: ["Spotify", "YouTube Music", "Netflix", "Prime Video", "Disney+ Hotstar", "JioCinema", "Audible", "Kindle", "Goodreads", "Pocket"] },
  { category: "Travel", apps: ["MakeMyTrip", "Booking.com", "Airbnb", "Skyscanner", "Google Flights", "TripIt", "ClearTrip", "Yatra", "ixigo", "Expedia"] },
  { category: "Career & Learning", apps: ["LinkedIn", "Coursera", "Udemy", "Duolingo", "GitHub", "Stack Overflow", "Glassdoor", "Naukri.com", "Google Scholar", "Medium"] },
];
