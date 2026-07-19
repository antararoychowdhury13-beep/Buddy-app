import "dotenv/config";
import express from "express";
import { db, getOrCreateSingleUser } from "./db.js";
import { applyFeedback } from "./trustScoreStore.js";
import type { Domain, Insight, InsightRow, Tier } from "./types.js";
import { toInsight } from "./types.js";
import { voiceService } from "./voice/index.js";
import { transcribeAudio } from "./voice/speechToText.js";
import { answerQuestion, type QuestionContext, type RememberFactInput } from "./reasoning.js";
import { deleteFact, getFacts, upsertFact } from "./factStore.js";
import { escapeHtml, icon } from "./webapp/design.js";
import { renderShell } from "./webapp/shell.js";
import { connectRouter, startGoogleOAuthCallbackServer } from "./webapp/connect.js";
import {
  DOMAIN_META,
  formatClockTime,
  PLANNED_INTEGRATIONS,
  relativeTime,
  safeInternalPath,
  tierPillHtml,
} from "./webapp/helpers.js";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(connectRouter);

function requireEmail(): string {
  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) throw new Error("BUDDY_USER_EMAIL not set in .env");
  return email;
}

/** Real context for answerQuestion() — delivered insights, trust scores, saved facts, and today's raw events. */
async function gatherQuestionContext(userId: string): Promise<QuestionContext> {
  const [{ data: insightRows }, { data: trustRows }, { data: eventRows }, factRows] = await Promise.all([
    db.from("insight").select("*").eq("user_id", userId).neq("tier", "silent").order("created_at", { ascending: false }).limit(10),
    db.from("trust_score").select("*").eq("user_id", userId),
    db.from("event").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    getFacts(userId),
  ]);

  const deliveredInsights = ((insightRows ?? []) as InsightRow[]).map(toInsight).map((i) => ({
    domain: i.domain,
    tier: i.tier,
    confidence: i.confidence,
    text: i.candidateText,
  }));

  const trustScores = (trustRows ?? []).map((t) => ({
    domain: t.domain as string,
    accuracy: Number(t.accuracy),
    confirmed: t.confirmed_count as number,
    dismissed: t.dismissed_count as number,
  }));

  const todaysEvents = (eventRows ?? []).map((e) => {
    const raw = e.raw as Record<string, unknown>;
    const summary =
      e.type === "calendar_event"
        ? String(raw.summary ?? "Event")
        : `Weather: ${String(raw.condition ?? "forecast")} (${String(raw.window ?? "")})`;
    return { type: e.type as string, domain: e.domain as string, summary, at: e.occurred_at as string };
  });

  const facts = factRows.map((f) => ({ category: f.category, key: f.key, value: f.value }));

  return { now: new Date().toISOString(), deliveredInsights, trustScores, todaysEvents, facts };
}

function makeRememberFactHandler(userId: string) {
  return async (fact: RememberFactInput) => {
    await upsertFact(userId, fact);
  };
}

function nudgeCardHtml(i: Insight, opts: { showDetailsLink?: boolean } = {}): string {
  const meta = DOMAIN_META[i.domain];
  return `
    <div class="nudge-card">
      <div class="chip ${meta.chip}">${icon(meta.icon)}</div>
      <div class="nudge-body">
        <div class="nudge-top">
          <span class="nudge-domain ${i.domain}">${meta.label}</span>
          <span class="nudge-time mono">${relativeTime(i.createdAt)}</span>
        </div>
        <div class="nudge-msg">${escapeHtml(i.candidateText)}</div>
        <div class="nudge-foot">
          ${tierPillHtml(i.tier)}
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-ghost btn-sm listen-btn" type="button" data-text="${escapeHtml(i.candidateText)}">${icon("wave", "i i-sm")}</button>
            ${opts.showDetailsLink ? `<a href="/insight/${i.id}" class="btn btn-ghost btn-sm">Details</a>` : ""}
          </div>
        </div>
        <form method="post" action="/feedback" style="display:flex; gap:6px; margin-top:8px;">
          <input type="hidden" name="insightId" value="${i.id}" />
          <input type="hidden" name="domain" value="${i.domain}" />
          <input type="hidden" name="returnTo" value="/" />
          <button class="btn btn-outline-good btn-sm" name="action" value="confirmed">${icon("check", "i i-sm")}Confirm</button>
          <button class="btn btn-ghost btn-sm" name="action" value="dismissed">Dismiss</button>
        </form>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- Home

app.get("/", async (_req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());

  const [{ data: briefing }, { data: insightRows }, { data: trustScores }, { data: connectors }, { data: recentCalendarEvents }] =
    await Promise.all([
      db.from("briefing").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("insight").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      db.from("trust_score").select("*").eq("user_id", user.id),
      db.from("connector").select("*").eq("user_id", user.id),
      db
        .from("event")
        .select("raw, created_at")
        .eq("user_id", user.id)
        .eq("type", "calendar_event")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Only count events from the most recent ingest run. A briefing row is
  // always written every run (even when the calendar connector returns zero
  // events), so anchor to it rather than to the calendar rows themselves —
  // otherwise a real, empty calendar run would fall back to whatever older
  // batch of (now-stale) rows happens to be most recent.
  const runAnchor = briefing ? new Date(briefing.created_at).getTime() : null;
  const meetingsToday = new Set(
    (recentCalendarEvents ?? [])
      .filter((row) => {
        if (runAnchor === null) return false;
        const age = runAnchor - new Date(row.created_at).getTime();
        return age >= 0 && age < 60_000;
      })
      .map((row) => (row.raw as Record<string, unknown>).id as string)
  ).size;

  // All rows from one ingest run share the same created_at timestamp (one
  // INSERT statement); keep only the latest run so repeated test runs don't
  // pile up near-duplicate cards.
  const allInsights = ((insightRows ?? []) as InsightRow[]).map(toInsight);
  const latestBatchAt = allInsights[0]?.createdAt;
  const insights = latestBatchAt ? allInsights.filter((i) => i.createdAt === latestBatchAt) : allInsights;
  const delivered = insights.filter((i) => i.tier !== "silent");
  const silent = insights.filter((i) => i.tier === "silent");
  const avgConfidence =
    delivered.length > 0 ? delivered.reduce((sum, i) => sum + i.confidence, 0) / delivered.length : null;

  const emailPrefix = user.email.split("@")[0];
  const displayName = user.display_name ?? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

  const headerHtml = `
    <button class="icon-btn" id="menu-toggle" aria-label="Open menu">${icon("menu")}</button>
    <div class="spacer">
      <div style="font-size:14px; color:var(--mist);">Good day,</div>
      <div style="font-size:20px; font-weight:700;">${escapeHtml(displayName)}</div>
      <div style="font-size:11.5px; color:var(--faint);">I've connected your world.</div>
    </div>
    <a href="/notifications" class="icon-btn" aria-label="Notifications">${icon("bell")}</a>`;

  const bodyHtml = `
    <a href="/chats" style="display:flex; align-items:center; gap:10px; background:var(--layer-01); border:1px solid var(--line); border-radius:var(--r-pill); padding:11px 14px; margin-top:6px; color:var(--faint);">
      ${icon("search", "i i-sm")}<span style="font-size:13px; flex:1;">Ask Buddy anything…</span>
    </a>
    <div style="display:flex; gap:8px; margin-top:12px;">
      <a href="/voice" class="btn btn-primary" style="flex:1; justify-content:center;">${icon("wave", "i i-sm")}Talk to Buddy</a>
      <a href="/how-it-works" class="btn btn-ghost">${icon("play", "i i-sm")}How it works</a>
    </div>

    ${
      briefing
        ? `<div class="card" style="margin-top:20px;">
            <div style="font-size:13px; line-height:1.6;" id="briefing-text">${escapeHtml(briefing.composed_text).replace(/\n/g, "<br/>")}</div>
            <button class="btn btn-ghost btn-sm listen-btn" type="button" data-text="${escapeHtml(briefing.composed_text)}" style="margin-top:10px;">${icon("wave", "i i-sm")}Listen</button>
          </div>`
        : `<div class="card" style="margin-top:20px; color:var(--faint); font-size:13px;">No briefing yet — run <code>npm run ingest</code>.</div>`
    }

    <div class="section-head"><h2>Today at a glance</h2></div>
    <div class="tile-grid">
      <div class="tile">
        <div class="chip iris">${icon("calendar", "i i-sm")}</div>
        <div class="num mono">${meetingsToday}</div>
        <div class="lbl">Meetings today</div>
      </div>
      <div class="tile">
        <div class="chip good">${icon("check", "i i-sm")}</div>
        <div class="num mono" style="color:var(--good)">${delivered.length}</div>
        <div class="lbl">Delivered</div>
      </div>
      <div class="tile">
        <div class="chip violet">${icon("grid", "i i-sm")}</div>
        <div class="num mono">${silent.length}</div>
        <div class="lbl">Stayed silent</div>
        <div class="sub" style="color:var(--faint)">correctly held back</div>
      </div>
      <div class="tile">
        <div class="chip warn">${icon("sliders", "i i-sm")}</div>
        <div class="num mono">${avgConfidence !== null ? avgConfidence.toFixed(2) : "—"}</div>
        <div class="lbl">Avg. confidence</div>
      </div>
    </div>

    <div class="section-head"><h2>Top nudges for you</h2>${delivered.length > 5 ? `<a href="/notifications">View all</a>` : ""}</div>
    ${delivered.length > 0 ? delivered.slice(0, 5).map((i) => nudgeCardHtml(i, { showDetailsLink: true })).join("") : `<div style="color:var(--faint); font-size:13px;">Nothing cleared the bar yet.</div>`}

    ${
      silent.length > 0
        ? `<div class="section-head"><h2>Stayed quiet (${silent.length})</h2></div>
           ${silent.slice(0, 3).map((i) => nudgeCardHtml(i)).join("")}`
        : ""
    }

    <div class="card" style="margin-top:20px;">
      <div style="font-size:13px; font-weight:600;">I've connected your world</div>
      <div style="font-size:11px; color:var(--faint); margin-bottom:10px;">Everything in sync and in context.</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${(connectors ?? [])
          .map(
            (c) =>
              `<div class="chip ${c.type === "google_calendar" ? "iris" : "warn"}" style="width:32px; height:32px; border-radius:10px;" title="${c.type} — ${c.status}">${icon(c.type === "google_calendar" ? "calendar" : "cloud", "i i-sm")}</div>`
          )
          .join("")}
        <a href="/me" class="chip" style="width:32px; height:32px; border-radius:10px; border:1px solid var(--line); color:var(--faint);">${icon("grid", "i i-sm")}</a>
      </div>
    </div>
  `;

  res.send(renderShell({ title: "Home", activeTab: "home", headerHtml, bodyHtml }));
});

// ---------------------------------------------------------------- Insight detail

app.get("/insight/:id", async (req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  const { data: row } = await db
    .from("insight")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    res.status(404).send(
      renderShell({
        title: "Not found",
        showTabbar: false,
        headerHtml: `<a href="/" class="icon-btn">${icon("chevron-l")}</a><div class="spacer"><h1>Not found</h1></div>`,
        bodyHtml: `<div class="card" style="margin-top:16px;">That insight doesn't exist (or isn't yours).</div>`,
      })
    );
    return;
  }

  const i = toInsight(row as InsightRow);
  const meta = DOMAIN_META[i.domain];

  const headerHtml = `
    <a href="/" class="icon-btn" aria-label="Back">${icon("chevron-l")}</a>
    <div class="spacer" style="text-align:center;"><span class="nudge-domain ${i.domain}">${meta.label}</span></div>
    ${tierPillHtml(i.tier)}`;

  const bodyHtml = `
    <div style="text-align:center; margin:18px 0 8px;">
      <div class="mono" style="font-size:36px; font-weight:700; color:var(--violet);">${i.confidence.toFixed(2)}</div>
      <div style="font-size:11px; color:var(--faint); text-transform:uppercase; letter-spacing:0.08em;">confidence</div>
    </div>

    <div class="card" style="font-size:14.5px; line-height:1.6;">${escapeHtml(i.candidateText)}</div>

    <div class="card" style="margin-top:10px; display:flex; align-items:center; justify-content:space-between;">
      <span style="font-size:12px; color:var(--faint);">Hear this nudge read aloud</span>
      <button class="btn btn-primary btn-sm listen-btn" type="button" data-text="${escapeHtml(i.candidateText)}">${icon("wave", "i i-sm")}Listen</button>
    </div>

    <form method="post" action="/feedback" style="display:flex; gap:8px; margin-top:18px;">
      <input type="hidden" name="insightId" value="${i.id}" />
      <input type="hidden" name="domain" value="${i.domain}" />
      <input type="hidden" name="returnTo" value="/" />
      <button class="btn btn-outline-good" style="flex:1; justify-content:center;" name="action" value="confirmed">${icon("check", "i i-sm")}Confirm</button>
      <button class="btn btn-ghost" style="flex:1; justify-content:center;" name="action" value="dismissed">Dismiss</button>
    </form>
  `;

  res.send(renderShell({ title: meta.label, showTabbar: false, headerHtml, bodyHtml }));
});

// ---------------------------------------------------------------- Me

const CONNECTOR_META: Record<
  "google_calendar" | "weather",
  { label: string; icon: string; chip: string; connectHref: string; disconnectAction: string }
> = {
  google_calendar: { label: "Calendar", icon: "calendar", chip: "iris", connectHref: "/connect/google", disconnectAction: "/connect/google/disconnect" },
  weather: { label: "Weather", icon: "cloud", chip: "warn", connectHref: "/connect/weather", disconnectAction: "/connect/weather/disconnect" },
};

const CONNECT_BANNER_LABEL: Record<string, string> = { google_calendar: "Calendar", weather: "Weather" };
const CONNECT_ERROR_MESSAGE: Record<string, string> = {
  no_refresh_token: "Google didn't return a refresh token. If you've connected before, revoke access at myaccount.google.com/permissions and try again.",
  exchange_failed: "Couldn't complete the Google sign-in. Please try again.",
  missing_code: "Google didn't return an authorization code. Please try again.",
};

app.get("/me", async (req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  const [{ data: trustScores }, { data: connectorRows }] = await Promise.all([
    db.from("trust_score").select("*").eq("user_id", user.id).order("domain"),
    db.from("connector").select("*").eq("user_id", user.id),
  ]);

  const headerHtml = `
    <button class="icon-btn" id="menu-toggle" aria-label="Open menu">${icon("menu")}</button>
    <div class="spacer"><h1>Me</h1></div>`;

  const initials = user.email.slice(0, 2).toUpperCase();

  const trustHtml = (trustScores ?? [])
    .map((t) => {
      const meta = DOMAIN_META[t.domain as Domain];
      const pct = Math.round(Number(t.accuracy) * 100);
      const barColor = `var(--${meta.chip === "iris" ? "iris" : meta.chip === "violet" ? "violet" : meta.chip === "good" ? "good" : meta.chip === "warn" ? "warn" : "rose"})`;
      return `
      <div class="trust-row">
        <div class="top"><span style="font-weight:600;">${meta.label}</span><span class="mono">${pct}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${barColor};"></div></div>
        <div class="caption">${t.confirmed_count} confirmed · ${t.dismissed_count} dismissed · evidence ${t.evidence_count}</div>
      </div>`;
    })
    .join("");

  const connectorsByType = new Map((connectorRows ?? []).map((c) => [c.type as "google_calendar" | "weather", c]));

  const connectorHtml = (Object.keys(CONNECTOR_META) as ("google_calendar" | "weather")[])
    .map((type) => {
      const meta = CONNECTOR_META[type];
      const row = connectorsByType.get(type);
      const isConnected = row?.status === "connected";
      return `
      <div class="list-row">
        <div class="chip ${meta.chip}" style="width:32px; height:32px; border-radius:9px;">${icon(meta.icon, "i i-sm")}</div>
        <div style="flex:1; font-size:12.5px; font-weight:600;">${meta.label}</div>
        ${
          isConnected
            ? `<span style="font-size:10px; font-weight:600; color:var(--good); margin-right:8px;">Connected</span>
               <form method="post" action="${meta.disconnectAction}"><button class="btn btn-ghost btn-sm" type="submit">Disconnect</button></form>`
            : `<a href="${meta.connectHref}" class="btn btn-primary btn-sm">Connect</a>`
        }
      </div>`;
    })
    .join("");

  const connected = typeof req.query.connected === "string" ? req.query.connected : null;
  const disconnected = typeof req.query.disconnected === "string" ? req.query.disconnected : null;
  const connectError = typeof req.query.connect_error === "string" ? req.query.connect_error : null;

  let bannerHtml = "";
  if (connected) {
    bannerHtml = `<div class="card" style="margin-top:12px; border-color:var(--good); color:var(--good); font-size:13px;">${CONNECT_BANNER_LABEL[connected] ?? connected} connected.</div>`;
  } else if (disconnected) {
    bannerHtml = `<div class="card" style="margin-top:12px; font-size:13px; color:var(--mist);">${CONNECT_BANNER_LABEL[disconnected] ?? disconnected} disconnected.</div>`;
  } else if (connectError) {
    bannerHtml = `<div class="card" style="margin-top:12px; border-color:var(--crit); color:var(--crit); font-size:13px;">${escapeHtml(CONNECT_ERROR_MESSAGE[connectError] ?? "Something went wrong connecting that.")}</div>`;
  }

  const bodyHtml = `
    <div style="display:flex; align-items:center; gap:12px; margin-top:6px;">
      <div style="width:52px; height:52px; border-radius:50%; background:var(--grad-brand); display:flex; align-items:center; justify-content:center; font-weight:700; color:#0A0B14; font-size:16px;">${initials}</div>
      <div><div style="font-size:15.5px; font-weight:700;">${escapeHtml(user.display_name ?? user.email.split("@")[0])}</div><div style="font-size:11px; color:var(--faint);">${escapeHtml(user.email)}</div></div>
    </div>

    ${bannerHtml}

    <div class="section-head"><h2>Connected accounts</h2></div>
    ${connectorHtml}

    <div class="section-head"><h2>More integrations</h2><span style="font-size:11px; color:var(--faint);">Coming soon</span></div>
    <div class="card">
      ${PLANNED_INTEGRATIONS.map(
        (group) => `
        <div class="planned-category">${escapeHtml(group.category)}</div>
        <div class="planned-chips">${group.apps.map((app) => `<span class="planned-chip">${escapeHtml(app)}</span>`).join("")}</div>`
      ).join("")}
    </div>

    <div class="section-head"><h2>How Buddy is learning</h2></div>
    <div class="card">${trustHtml || `<div style="color:var(--faint); font-size:12.5px;">No trust history yet.</div>`}</div>

    <div class="section-head"><h2>Preferences</h2></div>
    <div class="list-row"><span style="flex:1; font-weight:600; font-size:12.5px;">Voice</span><span style="color:var(--mist); font-size:12px;">af_heart · English</span></div>
    <div class="list-row"><span style="flex:1; font-weight:600; font-size:12.5px;">Single-user prototype</span><span style="color:var(--faint); font-size:11px;">no sign-in</span></div>
  `;

  res.send(renderShell({ title: "Me", activeTab: "me", headerHtml, bodyHtml }));
});

// ---------------------------------------------------------------- My Day

app.get("/my-day", async (_req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  // Ingest can run repeatedly, and each run does two inserts (calendar, then
  // weather) a moment apart; group everything within 10s of the latest
  // insert as "this run" so repeated test runs don't pile up duplicates.
  const [{ data: recentEvents }, { data: insightRows }] = await Promise.all([
    db.from("event").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    db.from("insight").select("*").eq("user_id", user.id).neq("tier", "silent"),
  ]);
  const rows = recentEvents ?? [];
  const latestCreatedAt = rows[0] ? new Date(rows[0].created_at).getTime() : null;
  const events = rows
    .filter((r) => latestCreatedAt !== null && Math.abs(new Date(r.created_at).getTime() - latestCreatedAt) < 10_000)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  const insights = ((insightRows ?? []) as InsightRow[]).map(toInsight);
  const insightsByEventId = new Map<string, Insight[]>();
  for (const i of insights) {
    for (const eventId of i.sourceEventIds) {
      const list = insightsByEventId.get(eventId) ?? [];
      list.push(i);
      insightsByEventId.set(eventId, list);
    }
  }

  const headerHtml = `
    <button class="icon-btn" id="menu-toggle" aria-label="Open menu">${icon("menu")}</button>
    <div class="spacer"><h1>My Day</h1><div class="mono" style="font-size:11px; color:var(--faint);">${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div></div>`;

  const itemsHtml = (events ?? [])
    .map((e) => {
      const raw = e.raw as Record<string, unknown>;
      const title = e.type === "calendar_event" ? String(raw.summary ?? "Event") : `Weather: ${String(raw.condition ?? "forecast")} (${String(raw.window ?? "")})`;
      const related = insightsByEventId.get(e.id) ?? [];
      const meta = DOMAIN_META[e.domain as Domain];
      const annotations = related
        .map((i) => `<div style="font-size:11px; color:var(--mist); margin-top:4px;">${tierPillHtml(i.tier)} ${escapeHtml(i.candidateText)}</div>`)
        .join("");
      return `
      <div class="timeline-item">
        <div class="timeline-time mono">${formatClockTime(e.occurred_at)}</div>
        <div class="timeline-card" style="border-left-color:var(--${meta.chip === "iris" ? "iris" : meta.chip === "violet" ? "violet" : meta.chip === "good" ? "good" : meta.chip === "warn" ? "warn" : "rose"});">
          <div class="t">${escapeHtml(title)}</div>
          <div class="d">${meta.label}</div>
          ${annotations}
        </div>
      </div>`;
    })
    .join("");

  const bodyHtml = `
    <div class="timeline">
      ${itemsHtml || `<div style="color:var(--faint); font-size:12.5px;">No events yet — run <code>npm run ingest</code>.</div>`}
    </div>
  `;

  res.send(renderShell({ title: "My Day", activeTab: "myday", headerHtml, bodyHtml }));
});

// ---------------------------------------------------------------- Notifications

app.get("/notifications", async (_req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());

  const [{ data: feedbackRows }, { data: deliveredRows }] = await Promise.all([
    db
      .from("feedback")
      .select("*, insight:insight_id(domain, candidate_text, tier)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    db
      .from("insight")
      .select("*")
      .eq("user_id", user.id)
      .not("delivered_at", "is", null)
      .order("delivered_at", { ascending: false })
      .limit(15),
  ]);

  type Item = { at: string; html: string };
  const items: Item[] = [];

  for (const f of feedbackRows ?? []) {
    const rel = f.insight as { domain: Domain; candidate_text: string; tier: Tier } | null;
    if (!rel) continue;
    const meta = DOMAIN_META[rel.domain];
    const verb = f.action === "confirmed" ? "confirmed" : f.action === "dismissed" ? "dismissed" : "saw";
    items.push({
      at: f.created_at,
      html: `<div class="chip ${meta.chip}">${icon(f.action === "confirmed" ? "check" : "x", "i i-sm")}</div>
        <div style="flex:1;"><div style="font-size:12.5px;">You ${verb} a <b>${meta.label}</b> nudge: "${escapeHtml(rel.candidate_text)}"</div><div style="font-size:10.5px; color:var(--faint);">${relativeTime(f.created_at)}</div></div>`,
    });
  }

  for (const row of (deliveredRows ?? []) as InsightRow[]) {
    const i = toInsight(row);
    const meta = DOMAIN_META[i.domain];
    items.push({
      at: i.deliveredAt ?? i.createdAt,
      html: `<div class="chip violet">${icon("wave", "i i-sm")}</div>
        <div style="flex:1;"><div style="font-size:12.5px;">New ${i.tier} nudge in <b>${meta.label}</b>: "${escapeHtml(i.candidateText)}"</div><div style="font-size:10.5px; color:var(--faint);">${relativeTime(i.deliveredAt ?? i.createdAt)}</div></div>`,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const headerHtml = `
    <a href="/" class="icon-btn" aria-label="Back">${icon("chevron-l")}</a>
    <div class="spacer"><h1>Notifications</h1></div>`;

  const bodyHtml = `
    ${items.length > 0 ? items.map((it) => `<div class="list-row" style="align-items:flex-start;">${it.html}</div>`).join("") : `<div style="color:var(--faint); font-size:12.5px; margin-top:12px;">Nothing yet.</div>`}
  `;

  res.send(renderShell({ title: "Notifications", showTabbar: false, headerHtml, bodyHtml }));
});

// ---------------------------------------------------------------- Voice

app.get("/voice", async (_req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  const { data: briefing } = await db
    .from("briefing")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const headerHtml = `<div class="spacer"></div><a href="/" class="icon-btn" aria-label="Close">${icon("x")}</a>`;

  const text = briefing?.composed_text ?? "";

  const bodyHtml = `
    <div class="voice-stage">
      <div class="orb-lg" id="voice-orb" role="button" tabindex="0" aria-label="Ask Buddy a question" style="cursor:pointer;">
        <div class="glow orb-glow"></div>
        <div class="ring"></div>
        <div class="core">
          <span class="wave-bar" style="width:3px; height:14px; background:#0A0B14; border-radius:2px;"></span>
          <span class="wave-bar" style="width:3px; height:26px; background:#0A0B14; border-radius:2px; animation-delay:.15s;"></span>
          <span class="wave-bar" style="width:3px; height:18px; background:#0A0B14; border-radius:2px; animation-delay:.3s;"></span>
          <span class="wave-bar" style="width:3px; height:30px; background:#0A0B14; border-radius:2px; animation-delay:.45s;"></span>
          <span class="wave-bar" style="width:3px; height:16px; background:#0A0B14; border-radius:2px; animation-delay:.6s;"></span>
        </div>
      </div>
      <div class="mono" style="font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mist);" id="voice-state">Tap to ask</div>
      <div id="voice-default-text" style="max-width:280px; font-size:14.5px; line-height:1.55;">
        ${text ? escapeHtml(text) : "No briefing yet — run <code>npm run ingest</code>."}
      </div>
      <div id="voice-transcript" hidden style="max-width:300px; font-size:13.5px; line-height:1.55; text-align:left; display:flex; flex-direction:column; gap:8px;"></div>
      <div id="voice-error" hidden style="max-width:280px; font-size:12px; line-height:1.5; color:var(--crit); background:var(--crit-dim); border-radius:var(--r-md); padding:10px 12px;"></div>
      ${
        text
          ? `<button class="btn btn-ghost btn-sm listen-btn" type="button" data-text="${escapeHtml(text)}" style="margin-top:6px;">${icon("wave", "i i-sm")}Play today's briefing</button>`
          : ""
      }
      <div style="font-size:10.5px; color:var(--faint); max-width:240px;">Tap the orb and ask a question out loud — Buddy answers from your real data.</div>
    </div>
  `;

  const extraScript = `
  (function () {
    var orb = document.getElementById("voice-orb");
    var state = document.getElementById("voice-state");
    var audioEl = document.getElementById("app-audio");
    var transcriptBox = document.getElementById("voice-transcript");
    var defaultText = document.getElementById("voice-default-text");
    if (!orb || !audioEl) return;

    audioEl.addEventListener("play", function () { orb.style.transform = "scale(1.06)"; setState("Speaking…"); });
    audioEl.addEventListener("pause", function () { orb.style.transform = "scale(1)"; setState("Tap to ask"); });
    audioEl.addEventListener("ended", function () { orb.style.transform = "scale(1)"; setState("Tap to ask"); });

    function setState(text) { if (state) state.textContent = text; }
    function escapeForDisplay(s) {
      var div = document.createElement("div");
      div.textContent = s;
      return div.innerHTML;
    }

    function speak(text) {
      return fetch("/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Speech failed: " + res.status);
          return res.blob();
        })
        .then(function (blob) {
          audioEl.pause();
          audioEl.src = URL.createObjectURL(blob);
          return audioEl.play();
        });
    }

    function askAndSpeak(question) {
      if (defaultText) defaultText.hidden = true;
      if (transcriptBox) {
        transcriptBox.hidden = false;
        transcriptBox.innerHTML = '<div><span class="mono" style="color:var(--iris); font-size:10.5px;">YOU</span><br/>' + escapeForDisplay(question) + "</div>";
      }
      setState("Thinking…");
      fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question }),
      })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (e) { throw new Error(e.error || "Ask failed"); });
          return res.json();
        })
        .then(function (data) {
          if (transcriptBox) {
            transcriptBox.innerHTML += '<div><span class="mono" style="color:var(--violet); font-size:10.5px;">BUDDY</span><br/>' + escapeForDisplay(data.answer) + "</div>";
          }
          return speak(data.answer);
        })
        .catch(function (err) {
          console.error(err);
          setState("Tap to ask");
          alert("Could not get an answer — please try again.");
        });
    }

    var errorBox = document.getElementById("voice-error");
    function showError(html) {
      if (!errorBox) return;
      errorBox.innerHTML = html;
      errorBox.hidden = false;
    }
    function clearError() {
      if (!errorBox) return;
      errorBox.hidden = true;
      errorBox.innerHTML = "";
    }

    // Records raw mic audio locally and sends it to /transcribe (a local
    // Whisper model) instead of the browser's built-in SpeechRecognition,
    // which depends on reaching Google's speech servers and can fail
    // unpredictably depending on network/browser/extensions. This has no
    // external network dependency at all once the model is cached.
    var TARGET_SAMPLE_RATE = 16000;
    var mediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (mediaSupported) {
      var MAX_RECORDING_SECONDS = 20; // keeps each question snappy to transcribe locally
      var recording = false;
      var audioCtx = null;
      var stream = null;
      var sourceNode = null;
      var processorNode = null;
      var gainNode = null;
      var chunks = [];
      var countdownIntervalId = null;
      var secondsLeft = 0;

      function clearCountdown() {
        if (countdownIntervalId) {
          clearInterval(countdownIntervalId);
          countdownIntervalId = null;
        }
      }

      function startRecording() {
        clearError();
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(function (s) {
            stream = s;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            sourceNode = audioCtx.createMediaStreamSource(stream);
            processorNode = audioCtx.createScriptProcessor(4096, 1, 1);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0; // silence the loopback so the user doesn't hear themselves
            chunks = [];
            processorNode.onaudioprocess = function (e) {
              chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            };
            sourceNode.connect(processorNode);
            processorNode.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            recording = true;

            secondsLeft = MAX_RECORDING_SECONDS;
            setState("Listening… " + secondsLeft + "s (tap to stop)");
            countdownIntervalId = setInterval(function () {
              secondsLeft -= 1;
              if (secondsLeft <= 0) {
                stopRecordingAndTranscribe();
                return;
              }
              setState("Listening… " + secondsLeft + "s (tap to stop)");
            }, 1000);
          })
          .catch(function (err) {
            console.error(err);
            showError("Microphone access is blocked for this site. Allow it in your browser's site settings, then reload.");
          });
      }

      function stopRecordingAndTranscribe() {
        if (!recording) return;
        recording = false;
        clearCountdown();
        var nativeRate = audioCtx.sampleRate;
        processorNode.disconnect();
        sourceNode.disconnect();
        gainNode.disconnect();
        stream.getTracks().forEach(function (t) { t.stop(); });

        var totalLength = chunks.reduce(function (sum, c) { return sum + c.length; }, 0);
        var merged = new Float32Array(totalLength);
        var offset = 0;
        chunks.forEach(function (c) { merged.set(c, offset); offset += c.length; });
        chunks = [];

        var ctxToClose = audioCtx;
        audioCtx = null;
        setState("Thinking…");

        var OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        var outLength = Math.max(1, Math.ceil((merged.length * TARGET_SAMPLE_RATE) / nativeRate));
        var offlineCtx = new OfflineCtor(1, outLength, TARGET_SAMPLE_RATE);
        var buffer = offlineCtx.createBuffer(1, merged.length, nativeRate);
        buffer.copyToChannel(merged, 0);
        var src = offlineCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(offlineCtx.destination);
        src.start();

        offlineCtx
          .startRendering()
          .then(function (rendered) {
            ctxToClose.close();
            var resampled = rendered.getChannelData(0);
            return fetch("/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body: resampled,
            });
          })
          .then(function (res) {
            if (!res.ok) return res.json().then(function (e) { throw new Error(e.error || "Transcription failed"); });
            return res.json();
          })
          .then(function (data) {
            var transcript = (data.transcript || "").trim();
            if (!transcript) {
              setState("Tap to ask");
              showError("Didn't catch that — try again and speak clearly.");
              return;
            }
            askAndSpeak(transcript);
          })
          .catch(function (err) {
            console.error(err);
            setState("Tap to ask");
            showError("Couldn't transcribe that. Please try again.");
          });
      }

      orb.addEventListener("click", function () {
        if (recording) { stopRecordingAndTranscribe(); return; }
        startRecording();
      });
      orb.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          orb.click();
        }
      });
    } else {
      setState("No mic in this browser");
      orb.style.cursor = "default";
      orb.setAttribute("aria-disabled", "true");
      orb.removeAttribute("tabindex");
    }
  })();`;

  res.send(renderShell({ title: "Talk to Buddy", activeTab: "voice", showTabbar: false, headerHtml, bodyHtml, extraScript }));
});

// ---------------------------------------------------------------- Chats

app.get("/chats", async (req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  const q = typeof req.query.q === "string" ? req.query.q : "";

  const headerHtml = `
    <a href="/" class="icon-btn" aria-label="Back">${icon("chevron-l")}</a>
    <div class="spacer" style="display:flex; align-items:center; gap:8px;">
      <div style="width:26px; height:26px; border-radius:50%; background:var(--grad-brand);"></div>
      <div><div style="font-size:14px; font-weight:700;">Buddy</div></div>
    </div>`;

  let conversationHtml = `<div style="color:var(--faint); font-size:12.5px; margin-top:20px;">Ask something like "what's on my plate today" or "will it rain later" — Buddy answers from your real data.</div>`;

  if (q.trim()) {
    let reply: string;
    try {
      const context = await gatherQuestionContext(user.id);
      reply = await answerQuestion(q, context, makeRememberFactHandler(user.id));
    } catch (err) {
      console.error("Chats answer failed:", err);
      reply = "I couldn't work that out just now — try again in a moment.";
    }

    conversationHtml = `
      <div class="bubble-row user"><div class="bubble user">${escapeHtml(q)}</div></div>
      <div class="bot-row">
        <div class="bot-avatar"></div>
        <div class="bubble bot">
          ${escapeHtml(reply).replace(/\n/g, "<br/>")}
          <div style="margin-top:8px;"><button class="btn btn-ghost btn-sm listen-btn" type="button" data-text="${escapeHtml(reply)}">${icon("wave", "i i-sm")}Listen</button></div>
        </div>
      </div>`;
  }

  const bodyHtml = `
    ${conversationHtml}
    <form method="get" action="/chats" class="chat-input-bar">
      <input type="text" name="q" placeholder="Message Buddy…" autocomplete="off" value="${q ? "" : ""}" />
      <button class="icon-btn" style="background:var(--grad-brand); border-color:transparent; color:#0A0B14;" type="submit" aria-label="Send">${icon("send", "i i-sm")}</button>
    </form>
  `;

  res.send(renderShell({ title: "Chats", activeTab: "chats", headerHtml, bodyHtml }));
});

// ---------------------------------------------------------------- How it works

app.get("/how-it-works", (_req, res) => {
  const headerHtml = `<a href="/" class="icon-btn" aria-label="Back">${icon("chevron-l")}</a><div class="spacer"><h1>How Buddy works</h1></div>`;
  const bodyHtml = `
    <div class="card" style="margin-top:10px; font-size:13.5px; line-height:1.65;">
      <p>Every candidate insight gets a <b>confidence score</b>:</p>
      <p class="mono" style="font-size:12px; color:var(--mist);">confidence = directness × maturity × domain accuracy × stakes</p>
      <p>That score decides which of four tiers it's allowed to reach:</p>
      <ul style="padding-left:18px; color:var(--mist);">
        <li><b style="color:var(--faint)">Silent</b> — held back, never shown</li>
        <li><b style="color:var(--mist)">Passive</b> — shown quietly if you look</li>
        <li><b style="color:var(--iris)">Ambient</b> — surfaced gently</li>
        <li><b style="color:var(--violet)">Proactive</b> — surfaced up front</li>
      </ul>
      <p>Trust is tracked independently <b>per domain</b> — confirming or dismissing a nudge only moves that domain's accuracy, so a mistake about your commute doesn't cost trust with your family reminders.</p>
    </div>
  `;
  res.send(renderShell({ title: "How it works", showTabbar: false, headerHtml, bodyHtml }));
});

// ---------------------------------------------------------------- Feedback

app.post("/feedback", async (req, res) => {
  const { insightId, domain, action, returnTo } = req.body as {
    insightId: string;
    domain: Domain;
    action: "confirmed" | "dismissed";
    returnTo?: string;
  };

  const user = await getOrCreateSingleUser(requireEmail());

  await db.from("feedback").insert({ insight_id: insightId, user_id: user.id, action });
  await applyFeedback(user.id, domain, action);

  res.redirect(safeInternalPath(returnTo));
});

// ---------------------------------------------------------------- Transcribe (local Whisper)

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // ~5 min of mono 16kHz float32 audio

app.post(
  "/transcribe",
  express.raw({ type: "application/octet-stream", limit: MAX_AUDIO_BYTES }),
  async (req, res) => {
    const buf = req.body as Buffer;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      res.status(400).json({ error: "audio body is required" });
      return;
    }
    if (buf.length % 4 !== 0) {
      res.status(400).json({ error: "audio body must be raw 32-bit float PCM samples" });
      return;
    }

    try {
      const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT);
      const transcript = await transcribeAudio(samples);
      res.json({ transcript });
    } catch (err) {
      console.error("Transcription failed:", err);
      res.status(502).json({ error: "Could not transcribe audio" });
    }
  }
);

// ---------------------------------------------------------------- Ask (real Q&A)

const MAX_QUESTION_LENGTH = 500;

app.post("/ask", async (req, res) => {
  const { question } = (req.body ?? {}) as { question?: unknown };

  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "question is required and must be a non-empty string" });
    return;
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    res.status(400).json({ error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer` });
    return;
  }

  try {
    const user = await getOrCreateSingleUser(requireEmail());
    const context = await gatherQuestionContext(user.id);
    const answer = await answerQuestion(question, context, makeRememberFactHandler(user.id));
    res.json({ answer });
  } catch (err) {
    console.error("Answering question failed:", err);
    res.status(502).json({ error: "Could not answer that right now" });
  }
});

// ---------------------------------------------------------------- Speech

const MAX_SPEECH_TEXT_LENGTH = 1500;

app.post("/speech", async (req, res) => {
  const { text } = (req.body ?? {}) as { text?: unknown };

  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text is required and must be a non-empty string" });
    return;
  }
  if (text.length > MAX_SPEECH_TEXT_LENGTH) {
    res.status(400).json({ error: `text must be ${MAX_SPEECH_TEXT_LENGTH} characters or fewer` });
    return;
  }

  try {
    const { audio, mimeType } = await voiceService.generateSpeech(text);
    res.setHeader("Content-Type", mimeType);
    res.send(audio);
  } catch (err) {
    console.error("Speech generation failed:", err);
    res.status(502).json({ error: "Speech generation failed" });
  }
});

// Catches malformed JSON bodies and any other unexpected synchronous error so
// a raw stack trace is never sent to the browser, regardless of NODE_ENV.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled request error:", err);
  if (!res.headersSent) {
    res.status(400).json({ error: "Invalid request" });
  }
});

const port = Number(process.env.PORT ?? 3000);
export const server = app.listen(port, () => {
  console.log(`Buddy briefing running at http://localhost:${port}`);
});

startGoogleOAuthCallbackServer(`http://localhost:${port}`);
