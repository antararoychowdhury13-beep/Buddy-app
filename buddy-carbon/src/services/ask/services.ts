/**
 * Service abstractions for future real integrations. Every method here is a
 * SIMULATED/demonstration implementation — no real emails, tasks or events are
 * created. Swap these mock impls for real API clients later without touching
 * the UI. Mock behaviour lives here, never scattered through components.
 */
import type { Evidence, PlanStep } from "../../types/ask";

export interface CreateIssueInput { title: string; description: string; sprint: string; due: string; transcriptRef?: string; }
export interface JiraIssue { key: string; url: string; }

export interface EmailInput { to: string[]; subject: string; external: boolean; }
export interface CalendarInput { title: string; date: string; attendees: number; }

let seq = 1000;
const evId = (p: string) => `${p}-${++seq}`;

/** Named permissions the acting identity actually holds in this demo. */
export const GRANTED = new Set<string>([
  "Send email as Antara", "Send email to external recipients", "Create issues in Project Phoenix",
  "Assign issues & notify", "Edit issues", "Edit project timeline", "Create calendar events",
  "Send reminders", "Send you notifications",
]);

export const AskServices = {
  email: {
    async send(input: EmailInput): Promise<Evidence> {
      return { kind: "email", id: evId("MSG"), label: `Email sent · ${input.to.length} recipient${input.to.length > 1 ? "s" : ""}`, actor: "Buddy (simulated)", at: Date.now(), recipients: input.to.length, detail: `Subject: ${input.subject}${input.external ? " · external send" : ""}` };
    },
  },
  jira: {
    async createIssue(input: CreateIssueInput): Promise<Evidence & { key: string }> {
      const key = `PHX-${240 + (seq % 10)}`;
      return { kind: "jira", id: key, key, label: `Jira issue ${key} created`, actor: "Buddy (simulated)", at: Date.now(), detail: `${input.title} · ${input.sprint} · due ${input.due}` };
    },
    /** Deliberate partial failure: Priya has no Project Phoenix access. */
    async assign(issueKey: string, ownerId: string): Promise<{ ok: boolean; evidence?: Evidence; error?: string }> {
      if (ownerId === "p-priya") {
        return { ok: false, error: "Couldn't assign to Priya Nair — she has no access to Project Phoenix." };
      }
      return { ok: true, evidence: { kind: "jira", id: evId("ASN"), label: `Assigned & notified`, actor: "Buddy (simulated)", at: Date.now(), recipients: 1, detail: `${issueKey} assigned` } };
    },
  },
  calendar: {
    async create(input: CalendarInput): Promise<Evidence> {
      return { kind: "calendar", id: evId("CAL"), label: `Event booked · ${input.attendees} attendees`, actor: "Buddy (simulated)", at: Date.now(), recipients: input.attendees, detail: `${input.title} · ${input.date}` };
    },
  },
  timeline: {
    async update(from: string, to: string): Promise<Evidence> {
      return { kind: "timeline", id: evId("TL"), label: "Timeline updated", actor: "Buddy (simulated)", at: Date.now(), detail: `Beta milestone ${from} → ${to}; 2 dependents recomputed` };
    },
  },
  monitor: {
    async activate(what: string): Promise<Evidence> {
      return { kind: "monitor", id: evId("MON"), label: "Monitoring active", actor: "Buddy (simulated)", at: Date.now(), detail: what };
    },
  },
};

export type StepRunner = (step: PlanStep) => Promise<{ status: "completed" | "failed"; evidence?: Evidence; error?: string }>;

/** Maps a plan step to its simulated service call. */
export function runnerFor(_step: PlanStep): StepRunner {
  return async (s) => {
    switch (s.id) {
      case "st-internal": return okE(await AskServices.email.send({ to: new Array(6).fill("x"), subject: "Project Phoenix — Weekly Review MOM (internal)", external: false }));
      case "st-external": return okE(await AskServices.email.send({ to: new Array(2).fill("x"), subject: "Project Phoenix — Meeting notes", external: true }));
      case "st-create": return okE(await AskServices.jira.createIssue({ title: "4 confirmed action items", description: "", sprint: "Sprint 24", due: "various" }));
      case "st-assign": {
        // 3 of 4 assign fine; Priya's fails → the whole step is partially failed
        const r = await AskServices.jira.assign("PHX-243", "p-priya");
        if (!r.ok) return { status: "failed", error: r.error };
        return { status: "completed", evidence: r.evidence };
      }
      case "st-refs": return okE({ kind: "jira", id: `REF-${++seq}`, label: "Deadlines & transcript refs added", actor: "Buddy (simulated)", at: Date.now(), detail: "4 tasks linked to transcript moments" });
      case "st-timeline": return okE(await AskServices.timeline.update("26 Aug", "28 Aug"));
      case "st-schedule": return okE(await AskServices.calendar.create({ title: "Stakeholder review", date: "25 Jul 2026", attendees: 6 }));
      case "st-remind": return okE(await AskServices.monitor.activate("Reminders 24h before each deadline"));
      case "st-overdue": return okE(await AskServices.monitor.activate("Overdue escalation to Antara"));
      default: return okE({ kind: "monitor", id: evId("X"), label: "Done", actor: "Buddy (simulated)", at: Date.now(), detail: s.title });
    }
  };
}
function okE(evidence: Evidence): { status: "completed"; evidence: Evidence } { return { status: "completed", evidence }; }
