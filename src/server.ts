import "dotenv/config";
import express from "express";
import { db, getOrCreateSingleUser } from "./db.js";
import { applyFeedback } from "./trustScoreStore.js";
import type { Domain, InsightRecord } from "./types.js";

const app = express();
app.use(express.urlencoded({ extended: true }));

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

app.get("/", async (_req, res) => {
  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) {
    res.status(500).send("BUDDY_USER_EMAIL not set in .env");
    return;
  }
  const user = await getOrCreateSingleUser(email);

  const { data: briefing } = await db
    .from("briefing")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: insights } = await db
    .from("insight")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const delivered = (insights ?? []).filter((i: InsightRecord) => i.tier !== "silent");
  const silent = (insights ?? []).filter((i: InsightRecord) => i.tier === "silent");

  const { data: trustScores } = await db
    .from("trust_score")
    .select("*")
    .eq("user_id", user.id);

  const rowHtml = (i: InsightRecord) => `
    <li class="insight tier-${i.tier}">
      <div class="meta"><span class="tier-badge">${i.tier}</span> <span class="domain">${i.domain}</span> <span class="confidence">confidence ${Number(i.confidence).toFixed(2)}</span></div>
      <div class="text">${escapeHtml(i.candidate_text)}</div>
      <form method="post" action="/feedback">
        <input type="hidden" name="insightId" value="${i.id}" />
        <input type="hidden" name="domain" value="${i.domain}" />
        <button name="action" value="confirmed">Confirm</button>
        <button name="action" value="dismissed">Dismiss</button>
      </form>
    </li>`;

  const trustHtml = (trustScores ?? [])
    .map(
      (t) =>
        `<li>${t.domain}: accuracy ${Number(t.accuracy).toFixed(2)} (${t.confirmed_count} confirmed / ${t.dismissed_count} dismissed), evidence ${t.evidence_count}</li>`
    )
    .join("");

  res.send(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Buddy — Today's Briefing</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #1a1a1a; }
  h1 { font-size: 1.4rem; }
  .briefing { background: #f5f5f4; border-radius: 12px; padding: 20px; font-size: 1.05rem; line-height: 1.5; }
  ul.insight-list { list-style: none; padding: 0; }
  li.insight { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 14px; margin: 10px 0; }
  .meta { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #666; margin-bottom: 6px; }
  .tier-badge { font-weight: 600; }
  .tier-proactive .tier-badge { color: #b45309; }
  .tier-ambient .tier-badge { color: #2563eb; }
  .tier-passive .tier-badge { color: #6b7280; }
  button { margin-right: 8px; margin-top: 8px; cursor: pointer; }
  .silent-section { opacity: 0.6; }
  h2 { font-size: 1rem; margin-top: 32px; }
</style>
</head>
<body>
  <h1>Today's Briefing</h1>
  <div class="briefing">${briefing ? escapeHtml(briefing.composed_text).replace(/\n/g, "<br/>") : "No briefing yet — run <code>npm run ingest</code>."}</div>

  <h2>Delivered insights (${delivered.length})</h2>
  <ul class="insight-list">${delivered.map(rowHtml).join("") || "<li>None yet.</li>"}</ul>

  <h2>Stayed silent (${silent.length})</h2>
  <ul class="insight-list silent-section">${silent.map(rowHtml).join("") || "<li>None.</li>"}</ul>

  <h2>Trust scores by domain</h2>
  <ul>${trustHtml || "<li>No trust scores yet.</li>"}</ul>
</body>
</html>`);
});

app.post("/feedback", async (req, res) => {
  const { insightId, domain, action } = req.body as {
    insightId: string;
    domain: Domain;
    action: "confirmed" | "dismissed";
  };

  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) {
    res.status(500).send("BUDDY_USER_EMAIL not set in .env");
    return;
  }
  const user = await getOrCreateSingleUser(email);

  await db.from("feedback").insert({ insight_id: insightId, user_id: user.id, action });
  await applyFeedback(user.id, domain, action);

  res.redirect("/");
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Buddy briefing running at http://localhost:${port}`);
});
