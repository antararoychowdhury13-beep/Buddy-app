import Anthropic from "@anthropic-ai/sdk";
import type { ScoredInsight } from "./types.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env before running the reasoning step."
    );
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

/**
 * Composes the day's briefing from insights the trust engine already cleared
 * (tier != "silent"). This is the one reasoning step in the v1 loop — it does
 * not re-score or re-tier anything, only turns cleared candidates into prose.
 */
export async function composeBriefing(cleared: ScoredInsight[]): Promise<string> {
  if (cleared.length === 0) {
    return "Nothing worth surfacing today — all candidate insights stayed below the confidence bar.";
  }

  const proactive = cleared.filter((i) => i.tier === "proactive");
  const ambient = cleared.filter((i) => i.tier === "ambient");
  const passive = cleared.filter((i) => i.tier === "passive");

  const describe = (list: ScoredInsight[]) =>
    list
      .map((i) => `- [${i.domain}, confidence ${i.confidence.toFixed(2)}] ${i.candidateText}`)
      .join("\n");

  const prompt = `You are Buddy, a thoughtful chief-of-staff assistant. Compose a short daily briefing (3-5 sentences, plain text, no headers or markdown) from the following cleared insights, grouped by how confidently they should be surfaced.

Proactive (lead with these, state plainly):
${describe(proactive) || "(none)"}

Ambient (mention briefly, softer framing):
${describe(ambient) || "(none)"}

Passive (only mention in passing if it fits naturally, otherwise omit):
${describe(passive) || "(none)"}

Write it as a natural, warm, concise briefing a sharp human chief of staff would say out loud. Do not mention tiers, confidence scores, or the word "insight" — just talk about the actual calendar and weather content.`;

  const message = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.find((block) => block.type === "text");
  return text && text.type === "text" ? text.text : "";
}

export interface QuestionContext {
  now: string; // ISO timestamp — Claude has no innate sense of the current time, so this must be supplied
  deliveredInsights: { domain: string; tier: string; confidence: number; text: string }[];
  trustScores: { domain: string; accuracy: number; confirmed: number; dismissed: number }[];
  todaysEvents: { type: string; domain: string; summary: string; at: string }[];
}

/**
 * Answers a free-form question (typed or spoken). Two different kinds of
 * question get two different treatments:
 *  - Anything about the user's own day (meetings, weather, trust, nudges)
 *    must be grounded ONLY in the real data below — never invented.
 *  - Anything else (the time, general knowledge, definitions, quick
 *    calculations) Buddy answers normally, like any capable assistant would
 *    — refusing those just because they're not in the app's data would be
 *    unhelpfully narrow, not careful.
 * Deliberately conversational rather than agentic either way: it can
 * describe, not act — no confirm/dismiss/create on the user's behalf.
 */
export async function answerQuestion(question: string, context: QuestionContext): Promise<string> {
  const describeInsights = (list: QuestionContext["deliveredInsights"]) =>
    list.length > 0
      ? list.map((i) => `- [${i.domain}, ${i.tier}, confidence ${i.confidence.toFixed(2)}] ${i.text}`).join("\n")
      : "(none)";

  const describeTrust = (list: QuestionContext["trustScores"]) =>
    list.length > 0
      ? list
          .map((t) => `- ${t.domain}: ${Math.round(t.accuracy * 100)}% accuracy (${t.confirmed} confirmed, ${t.dismissed} dismissed)`)
          .join("\n")
      : "(no history yet)";

  const describeEvents = (list: QuestionContext["todaysEvents"]) =>
    list.length > 0
      ? list.map((e) => `- [${e.domain}] ${e.summary} (${new Date(e.at).toLocaleString("en-US")})`).join("\n")
      : "(none)";

  const prompt = `You are Buddy, a thoughtful chief-of-staff assistant, answering a question the user just asked (by voice or text).

Right now it is: ${new Date(context.now).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}

Today's delivered insights (already cleared for the user to see):
${describeInsights(context.deliveredInsights)}

Trust by domain (how reliable Buddy has been so far):
${describeTrust(context.trustScores)}

Today's raw calendar/weather events:
${describeEvents(context.todaysEvents)}

The user asked: "${question}"

How to answer:
- If it's about their own day — meetings, weather, trust scores, nudges — ground it ONLY in the data above. Never invent a meeting, forecast, or number that isn't listed; if the data doesn't cover it, say so plainly.
- If it's general (the time, a fact, a definition, quick math, anything not about their personal data) — just answer it directly and helpfully, the way any competent assistant would. Don't refuse or deflect just because it's not in the data above — use the current time given above for anything time/date-related.
- If the question itself is empty, garbled, or you genuinely can't tell what was asked, say so briefly and ask them to repeat it — don't pivot to volunteering unrelated information instead.
- You cannot confirm/dismiss insights or create events yourself; if asked to do something actionable, say the user should do it from the app rather than pretending to have done it.

Reply in 1-4 sentences, plain text, no markdown, no headers — the way a sharp human assistant would answer out loud.`;

  const message = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.find((block) => block.type === "text");
  return text && text.type === "text" ? text.text : "";
}
