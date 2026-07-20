/**
 * One coherent sample day. Every card derives from these signals — numbers are
 * kept consistent across the plan, conflicts, priorities and tabs.
 */
import type { CalendarEvent, DataSource, HomeContext, Signals, TaskItem } from "../types/home";

export const DATA_SOURCES: DataSource[] = [
  { id: "calendar", label: "Calendar", lastRefreshMinsAgo: 4, stale: false, detail: "Today's 6 events: titles, times, attendee counts and response status. No event bodies read." },
  { id: "jira", label: "Jira", lastRefreshMinsAgo: 12, stale: false, detail: "3 assigned issues due today, blocker links on BUD-231 (API spec review) affecting 2 assignees." },
  { id: "teams", label: "Teams", lastRefreshMinsAgo: 9, stale: false, detail: "Unread thread count and 1 mention in #powervc-launch. Message text is not shown here." },
  { id: "email", label: "Email", lastRefreshMinsAgo: 18, stale: false, detail: "Subject lines of 2 flagged emails (vendor demo invite, credit card statement). Bodies not read." },
  { id: "maps", label: "Maps", lastRefreshMinsAgo: 3, stale: false, detail: "Commute estimate home → office: 52 min vs the usual 31 min. Ring-road alternative: 40 min." },
  { id: "health", label: "Health", lastRefreshMinsAgo: 540, stale: true, detail: "Last sync 9h ago: 5h 40m sleep (poor), HRV low. Data is stale — confidence reduced where used." },
  { id: "bank", label: "Bank", lastRefreshMinsAgo: 45, stale: false, detail: "Credit card bill ₹24,560 due in 3 days; salary expected in 5 days. Balances not shown here." },
  { id: "prefs", label: "User preference", lastRefreshMinsAgo: 0, stale: false, detail: "Your saved preferences: focus 3:00–5:15 PM, protect family events, ask before external messages." },
];

export const MEETINGS: CalendarEvent[] = [
  { id: "m1", title: "Design Review — PowerVC 2.0", start: "9:00 AM", end: "9:45 AM", startMins: 540, endMins: 585, requiresActiveParticipation: true, optional: false, attendees: 5, location: "office", avgOverrunMins: 6, app: "Teams" },
  { id: "m2", title: "Stakeholder Sync", start: "11:00 AM", end: "11:30 AM", startMins: 660, endMins: 690, requiresActiveParticipation: true, optional: false, attendees: 4, location: "remote", avgOverrunMins: 4, app: "Teams" },
  { id: "m3", title: "Vendor Demo — Optional", start: "12:00 PM", end: "12:30 PM", startMins: 720, endMins: 750, requiresActiveParticipation: false, optional: true, attendees: 8, location: "remote", avgOverrunMins: 0, app: "Zoom" },
  { id: "m4", title: "Product Roadmap Review", start: "2:30 PM", end: "3:15 PM", startMins: 870, endMins: 915, requiresActiveParticipation: false, optional: false, attendees: 9, location: "remote", avgOverrunMins: 8, app: "Zoom" },
  { id: "m5", title: "Project Review — Q3", start: "4:15 PM", end: "5:00 PM", startMins: 975, endMins: 1020, requiresActiveParticipation: false, optional: false, attendees: 6, location: "remote", avgOverrunMins: 22, app: "Teams" },
  { id: "m6", title: "1:1 with Priya", start: "5:45 PM", end: "6:15 PM", startMins: 1065, endMins: 1095, requiresActiveParticipation: false, optional: false, attendees: 2, location: "remote", avgOverrunMins: 2, app: "Teams" },
];

export const TASKS: TaskItem[] = [
  { id: "t1", title: "Review API spec (BUD-231)", dueToday: true, blockingPeople: 2, estimatedMinutes: 45, priorityHint: "high", domain: "work" },
  { id: "t2", title: "Send sprint summary", dueToday: true, blockingPeople: 0, estimatedMinutes: 20, priorityHint: "normal", domain: "work" },
  { id: "t3", title: "Approve design tokens PR", dueToday: true, blockingPeople: 1, estimatedMinutes: 15, priorityHint: "normal", domain: "work" },
  { id: "t4", title: "Renew library card", dueToday: false, blockingPeople: 0, estimatedMinutes: 10, priorityHint: "low", domain: "personal" },
];

export const SIGNALS: Signals = {
  commute: { route: "Home → Office", usualMins: 31, currentMins: 52, heavy: true },
  sleep: { hours: 5.7, quality: "poor" },
  family: { title: "Aarav's parent–teacher meeting", time: "5:45 PM", timeMins: 1045 + 20, travelMins: 30, people: ["Aarav", "Meera"] },
  finance: { bill: "Credit card bill", amount: 24560, dueInDays: 3, incomeInDays: 5 },
  projectRisk: { title: "PowerVC API delivery", delayDays: 4, blockedTasks: 2 },
  focusPreference: { start: "3:00 PM", end: "5:15 PM", startMins: 900, endMins: 1035 },
  personalTask: { title: "Renew library card", priority: "low" },
  travelStatus: false,
  stressLoad: 0.72, // poor sleep + 6 meetings — drives the High-stress mode suggestion
};

/** Fully-mock context — the offline fallback and the demo baseline. */
export const MOCK_CONTEXT: HomeContext = {
  meetings: MEETINGS,
  tasks: TASKS,
  signals: SIGNALS,
  dataSources: DATA_SOURCES,
  origin: { real: [], demo: ["Calendar", "Tasks", "Commute", "Family", "Finance", "Health", "Work"] },
};

export function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function minsToClock(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}
