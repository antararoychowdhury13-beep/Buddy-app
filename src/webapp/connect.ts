import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import { db, getOrCreateSingleUser } from "../db.js";
import { createOAuthClient, GOOGLE_CALENDAR_SCOPES } from "../connectors/googleOAuth.js";
import { escapeHtml, icon } from "./design.js";
import { renderShell } from "./shell.js";

export const connectRouter = express.Router();

function requireEmail(): string {
  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) throw new Error("BUDDY_USER_EMAIL not set in .env");
  return email;
}

// Fixed redirect target already registered on the OAuth client (originally
// for the CLI auth script) — reusing it means the in-app Connect button
// never needs a new redirect URI added in Google Cloud Console.
const GOOGLE_CALLBACK_PORT = 3939;
const GOOGLE_REDIRECT_URI = `http://localhost:${GOOGLE_CALLBACK_PORT}/oauth2callback`;

// Short-lived CSRF state for the Google OAuth round trip. Single-process,
// single-user prototype — an in-memory map is enough; entries are pruned
// opportunistically whenever a new one is created.
const PENDING_STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<string, number>();

function pruneExpiredStates() {
  const now = Date.now();
  for (const [state, expiresAt] of pendingStates) {
    if (expiresAt < now) pendingStates.delete(state);
  }
}

// ---------------------------------------------------------------- Google Calendar

connectRouter.get("/connect/google", (_req, res) => {
  pruneExpiredStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, Date.now() + PENDING_STATE_TTL_MS);

  const oauth2Client = createOAuthClient(GOOGLE_REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this account has authorized before
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });

  res.redirect(authUrl);
});

/** Handles the OAuth exchange; returns the /me query string to redirect the browser to. */
async function handleGoogleOAuthCallback(code: string | undefined, state: string | undefined): Promise<string> {
  if (!state || !pendingStates.has(state)) {
    return "/me?connect_error=invalid_state";
  }
  pendingStates.delete(state);

  if (!code) {
    return "/me?connect_error=missing_code";
  }

  const user = await getOrCreateSingleUser(requireEmail());
  const oauth2Client = createOAuthClient(GOOGLE_REDIRECT_URI);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      return "/me?connect_error=no_refresh_token";
    }

    await db
      .from("connector")
      .upsert(
        { user_id: user.id, type: "google_calendar", status: "connected", refresh_token: tokens.refresh_token },
        { onConflict: "user_id,type" }
      );

    return "/me?connected=google_calendar";
  } catch (err) {
    console.error("Google OAuth exchange failed:", err);
    return "/me?connect_error=exchange_failed";
  }
}

/**
 * Google redirects to this fixed local port after consent. Runs as its own
 * tiny HTTP server (not an Express route) so it can bind exactly the
 * already-registered redirect URI regardless of which port the main app
 * listens on, then bounces the browser back into the real app.
 */
export function startGoogleOAuthCallbackServer(appBaseUrl: string): void {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const url = new URL(req.url, GOOGLE_REDIRECT_URI);
    if (url.pathname !== "/oauth2callback") {
      res.statusCode = 404;
      res.end();
      return;
    }

    const oauthError = url.searchParams.get("error");
    const code = url.searchParams.get("code") ?? undefined;
    const state = url.searchParams.get("state") ?? undefined;

    const redirect = (path: string) => {
      res.statusCode = 302;
      res.setHeader("Location", `${appBaseUrl}${path}`);
      res.end();
    };

    if (oauthError) {
      redirect(`/me?connect_error=${encodeURIComponent(oauthError)}`);
      return;
    }

    handleGoogleOAuthCallback(code, state)
      .then(redirect)
      .catch((err) => {
        console.error("Google OAuth callback failed:", err);
        redirect("/me?connect_error=exchange_failed");
      });
  });

  server.listen(GOOGLE_CALLBACK_PORT, () => {
    console.log(`Google OAuth callback listener on http://localhost:${GOOGLE_CALLBACK_PORT}`);
  });
}

connectRouter.post("/connect/google/disconnect", async (_req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());

  const { data: connector } = await db
    .from("connector")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "google_calendar")
    .maybeSingle();

  if (connector?.refresh_token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(connector.refresh_token)}`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Google token revoke failed (disconnecting locally anyway):", err);
    }
  }

  await db
    .from("connector")
    .update({ status: "disconnected", refresh_token: null })
    .eq("user_id", user.id)
    .eq("type", "google_calendar");

  res.redirect("/me?disconnected=google_calendar");
});

// ---------------------------------------------------------------- Weather

connectRouter.get("/connect/weather", async (_req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  const { data: connector } = await db
    .from("connector")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "weather")
    .maybeSingle();

  const metadata = (connector?.metadata ?? {}) as { apiKey?: string; location?: string };
  const currentLocation = metadata.location ?? "Bengaluru,IN";
  const hasKey = Boolean(metadata.apiKey);

  const headerHtml = `<a href="/me" class="icon-btn" aria-label="Back">${icon("chevron-l")}</a><div class="spacer"><h1>Connect Weather</h1></div>`;

  const bodyHtml = `
    <div class="card" style="margin-top:16px;">
      <p style="font-size:13px; color:var(--mist); margin-top:0;">
        Get a free API key at <a href="https://openweathermap.org/api" style="color:var(--iris)">openweathermap.org/api</a>,
        then paste it below.
      </p>
      <form method="post" action="/connect/weather" style="display:flex; flex-direction:column; gap:12px;">
        <label style="font-size:12px; color:var(--mist);">API key
          <input type="text" name="apiKey" placeholder="${hasKey ? "•••••••••••••••••••••• (saved — paste a new one to replace)" : "your OpenWeatherMap API key"}"
            style="width:100%; margin-top:6px; background:var(--layer-01); border:1px solid var(--line); border-radius:var(--r-md); padding:10px 12px; color:var(--text); font-family:inherit; font-size:13px;" />
        </label>
        <label style="font-size:12px; color:var(--mist);">Location
          <input type="text" name="location" value="${escapeHtml(currentLocation)}" placeholder="City,CountryCode"
            style="width:100%; margin-top:6px; background:var(--layer-01); border:1px solid var(--line); border-radius:var(--r-md); padding:10px 12px; color:var(--text); font-family:inherit; font-size:13px;" />
        </label>
        <button class="btn btn-primary" type="submit" style="justify-content:center;">${hasKey ? "Update" : "Connect"}</button>
      </form>
    </div>
  `;

  res.send(renderShell({ title: "Connect Weather", showTabbar: false, headerHtml, bodyHtml }));
});

connectRouter.post("/connect/weather", async (req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  const { apiKey, location } = req.body as { apiKey?: string; location?: string };

  const { data: connector } = await db
    .from("connector")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "weather")
    .maybeSingle();

  const existingMetadata = (connector?.metadata ?? {}) as { apiKey?: string; location?: string };
  const nextApiKey = apiKey?.trim() ? apiKey.trim() : existingMetadata.apiKey;
  const nextLocation = location?.trim() ? location.trim() : (existingMetadata.location ?? "Bengaluru,IN");

  if (!nextApiKey) {
    res.redirect("/connect/weather?error=missing_key");
    return;
  }

  await db.from("connector").upsert(
    {
      user_id: user.id,
      type: "weather",
      status: "connected",
      metadata: { apiKey: nextApiKey, location: nextLocation },
    },
    { onConflict: "user_id,type" }
  );

  res.redirect("/me?connected=weather");
});

connectRouter.post("/connect/weather/disconnect", async (req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  await db
    .from("connector")
    .update({ status: "disconnected", metadata: {} })
    .eq("user_id", user.id)
    .eq("type", "weather");

  res.redirect("/me?disconnected=weather");
});
