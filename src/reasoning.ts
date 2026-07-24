import Anthropic from "@anthropic-ai/sdk";
import type { ScoredInsight } from "./types.js";

let client: Anthropic | null = null;

function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

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

  // Demo / no-key mode: compose a serviceable briefing locally instead of
  // calling the model, so the ingest step and the app still work end to end.
  if (!hasApiKey()) {
    return composeBriefingLocally(cleared);
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
  facts: { category: string; key: string; value: string }[];
}

export interface RememberFactInput {
  category: "home" | "office" | "family" | "contact" | "festival" | "other";
  key: string;
  value: string;
}

export type RememberFactHandler = (fact: RememberFactInput) => Promise<void>;

const REMEMBER_FACT_TOOL: Anthropic.Tool = {
  name: "remember_fact",
  description:
    "Save a personal fact the user explicitly wants remembered for later — home/office location or commute route, a family member's contact info, a festival date, or any other detail they ask you to remember or note down. Only call this when the user is clearly asking you to remember/save/note something (e.g. \"remember that...\", \"my wife's number is..., save that\"), never just because a fact was mentioned in passing, and never for a plain question.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["home", "office", "family", "contact", "festival", "other"],
        description: "Broad category for the fact",
      },
      key: {
        type: "string",
        description:
          "Short, stable, human-readable label for this fact, e.g. 'home address', 'wife's phone number', 'office commute route', 'Diwali date'",
      },
      value: { type: "string", description: "The actual value to remember" },
    },
    required: ["category", "key", "value"],
  },
};

function buildSystemPrompt(context: QuestionContext): string {
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

  const describeFacts = (list: QuestionContext["facts"]) =>
    list.length > 0 ? list.map((f) => `- [${f.category}] ${f.key}: ${f.value}`).join("\n") : "(nothing saved yet)";

  return `You are Buddy, a thoughtful chief-of-staff assistant, answering a question the user just asked (by voice or text).

Right now it is: ${new Date(context.now).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}

Personal facts the user has asked you to remember:
${describeFacts(context.facts)}

Today's delivered insights (already cleared for the user to see):
${describeInsights(context.deliveredInsights)}

Trust by domain (how reliable Buddy has been so far):
${describeTrust(context.trustScores)}

Today's raw calendar/weather events:
${describeEvents(context.todaysEvents)}

How to answer:
- If it's about their own day — meetings, weather, trust scores, nudges — ground it ONLY in the data above. Never invent a meeting, forecast, or number that isn't listed; if the data doesn't cover it, say so plainly.
- If it's asking to recall a personal fact, use the "Personal facts" list above. If it's not there, say you don't have that saved rather than guessing.
- If the user is clearly asking you to remember/save/note a new personal fact, use the remember_fact tool rather than just replying in text.
- If it's general (the time, a fact, a definition, quick math, anything not about their personal data) — just answer it directly and helpfully, the way any competent assistant would. Don't refuse or deflect just because it's not in the data above — use the current time given above for anything time/date-related.
- If the question itself is empty, garbled, or you genuinely can't tell what was asked, say so briefly and ask them to repeat it — don't pivot to volunteering unrelated information instead.
- You cannot confirm/dismiss insights or create calendar events yourself; if asked to do something actionable besides remembering a fact, say the user should do it from the app rather than pretending to have done it.

Reply in 1-4 sentences, plain text, no markdown, no headers — the way a sharp human assistant would answer out loud.`;
}

/**
 * Answers a free-form question (typed or spoken), with one real tool
 * available: remembering a personal fact. Claude itself decides — from the
 * conversation, not a keyword match — whether the user is asking a question
 * or asking it to remember something, and only calls the tool in the latter
 * case. Otherwise stays conversational, not agentic: it can describe, not
 * act — no confirm/dismiss/create-event on the user's behalf.
 */
export async function answerQuestion(
  question: string,
  context: QuestionContext,
  onRememberFact?: RememberFactHandler
): Promise<string> {
  // Demo / no-key mode: answer from the day's data with a lightweight local
  // responder. Real conversational answers turn on the moment ANTHROPIC_API_KEY
  // is set — no other change needed.
  if (!hasApiKey()) {
    return answerQuestionLocally(question, context);
  }

  const client = getClient();
  const system = buildSystemPrompt(context);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  let response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system,
    tools: onRememberFact ? [REMEMBER_FACT_TOOL] : undefined,
    messages,
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use" && onRememberFact) {
    let resultText = "Saved.";
    try {
      await onRememberFact(toolUse.input as RememberFactInput);
    } catch (err) {
      resultText = `Failed to save: ${(err as Error).message}`;
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUse.id, content: resultText }],
    });

    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system,
      messages,
    });
  }

  const text = response.content.find((block) => block.type === "text");
  return text && text.type === "text" ? text.text : "";
}

// ---------------------------------------------------------------------------
// Local (no-API-key) fallbacks — keep Buddy useful in demo mode.
// ---------------------------------------------------------------------------

function composeBriefingLocally(cleared: ScoredInsight[]): string {
  const byTier = (tier: string) => cleared.filter((i) => i.tier === tier).map((i) => i.candidateText);
  const lead = byTier("proactive");
  const soft = byTier("ambient");
  const parts: string[] = ["Good morning — I've already handled the busywork."];
  if (lead.length) parts.push(lead.join(" "));
  if (soft.length) parts.push(soft.join(" "));
  parts.push("You don't have to do it all — just the next right thing. Buddy has the rest.");
  return parts.join(" ");
}

/**
 * A small, honest responder for demo mode: it answers the common "about my day"
 * questions straight from the supplied context, and is upfront when it can't.
 * It never invents meetings, forecasts, or numbers that aren't in the data.
 */
function answerQuestionLocally(question: string, context: QuestionContext): string {
  const q = question.toLowerCase().trim();
  if (!q) return "I didn't catch that — could you say it again?";

  const calendar = context.todaysEvents
    .filter((e) => e.type === "calendar_event")
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const weather = context.todaysEvents.filter((e) => e.type === "weather_forecast");
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const matches = (...words: string[]) => words.some((w) => q.includes(w));

  // Time / date
  if (matches("what time", "the time", "what day", "what's the date", "today's date", "what is the date")) {
    return `It's ${new Date(context.now).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}.`;
  }

  // Weather
  if (matches("rain", "weather", "forecast", "umbrella")) {
    if (weather.length === 0) return "I don't have a weather forecast connected right now.";
    return weather.map((w) => w.summary).join(" ") + ".";
  }

  // Meetings / schedule / day
  if (matches("meeting", "schedule", "calendar", "my day", "my plate", "on today", "what's on", "whats on", "next")) {
    if (calendar.length === 0) return "Your calendar looks clear for today.";
    const list = calendar.map((e) => `${e.summary} at ${timeOf(e.at)}`).join(", ");
    return `You've got ${calendar.length} thing${calendar.length === 1 ? "" : "s"} today: ${list}.`;
  }

  // Nudges / what did you do
  if (matches("nudge", "what did you do", "what have you done", "briefing", "brief me", "summary", "protect")) {
    if (context.deliveredInsights.length === 0) return "Nothing has cleared the bar to surface yet today.";
    return context.deliveredInsights.slice(0, 3).map((i) => i.text).join(" ");
  }

  // Trust
  if (matches("trust", "accuracy", "how are you learning", "how reliable")) {
    if (context.trustScores.length === 0) return "I don't have any trust history yet — confirm or dismiss a nudge and I'll start learning.";
    const best = [...context.trustScores].sort((a, b) => b.accuracy - a.accuracy)[0];
    return `I'm most reliable on ${best.domain} so far — ${Math.round(best.accuracy * 100)}% accuracy across ${best.confirmed + best.dismissed} judged nudges.`;
  }

  // Remembered facts — match a saved fact by any significant word in its label.
  const factHit = context.facts.find((f) => {
    const keyWords = f.key.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    return keyWords.some((w) => q.includes(w));
  });
  if (factHit) return `${factHit.key}: ${factHit.value}.`;
  if (matches("remember", "my ", "address", "number", "phone", "saved", "note")) {
    if (context.facts.length > 0) {
      return `I've saved: ${context.facts.map((f) => f.key).join(", ")}. Ask me for any of those, or add more on the Me page.`;
    }
    return "I don't have that saved yet — you can add it on the Me page.";
  }

  // Fallback — honest about demo mode, points at what does work.
  return (
    "I'm running in demo mode without a language model connected, so I answer from your day's data. " +
    "Try asking about today's meetings, the weather, your briefing, or how I'm learning. " +
    "Set ANTHROPIC_API_KEY to turn on full conversational answers."
  );
}
