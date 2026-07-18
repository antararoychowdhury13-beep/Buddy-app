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
