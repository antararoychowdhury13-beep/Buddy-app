import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import { db, getOrCreateSingleUser } from "../db.js";
import { createOAuthClient, GOOGLE_CALENDAR_SCOPES } from "../connectors/googleOAuth.js";
import { escapeHtml, icon } from "./design.js";
import { renderShell } from "./shell.js";
import { exchangeCodeForToken, fetchUserInfo, OAUTH_PROVIDERS, resolveCredentials, saveCredentials } from "./oauthProviders.js";

export const connectRouter = express.Router();

function requireEmail(): string {
  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) throw new Error("BUDDY_USER_EMAIL not set in .env");
  return email;
}

// Fixed redirect target already registered on the OAuth client (originally
// for the CLI auth script) — reusing it means the in-app Connect button
// never needs a new redirect URI added in Google Cloud Console. Both the
// Calendar data-access flow and the Google identity-login flow share this
// one callback, distinguished by "intent" carried in the state map.
const GOOGLE_CALLBACK_PORT = 3939;
const GOOGLE_REDIRECT_URI = `http://localhost:${GOOGLE_CALLBACK_PORT}/oauth2callback`;

type PendingIntent = { expiresAt: number; intent: "calendar" | "login" };

// Short-lived CSRF state for the Google OAuth round trip. Single-process,
// single-user prototype — an in-memory map is enough; entries are pruned
// opportunistically whenever a new one is created.
const PENDING_STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<string, PendingIntent>();

function pruneExpiredStates() {
  const now = Date.now();
  for (const [state, entry] of pendingStates) {
    if (entry.expiresAt < now) pendingStates.delete(state);
  }
}

// ---------------------------------------------------------------- Google Calendar

connectRouter.get("/connect/google", (_req, res) => {
  pruneExpiredStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { expiresAt: Date.now() + PENDING_STATE_TTL_MS, intent: "calendar" });

  const oauth2Client = createOAuthClient(GOOGLE_REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this account has authorized before
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });

  res.redirect(authUrl);
});

// ---------------------------------------------------------------- Google identity ("Sign in with Google")

connectRouter.get("/login/google", (_req, res) => {
  pruneExpiredStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { expiresAt: Date.now() + PENDING_STATE_TTL_MS, intent: "login" });

  const oauth2Client = createOAuthClient(GOOGLE_REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });

  res.redirect(authUrl);
});

connectRouter.post("/login/google/disconnect", async (_req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  await db.from("social_login").delete().eq("user_id", user.id).eq("provider", "google");
  res.redirect("/me?disconnected=google_login");
});

/** Handles the OAuth exchange; returns the /me query string to redirect the browser to. */
async function handleGoogleOAuthCallback(code: string | undefined, state: string | undefined): Promise<string> {
  if (!state || !pendingStates.has(state)) {
    return "/me?connect_error=invalid_state";
  }
  const { intent } = pendingStates.get(state) as PendingIntent;
  pendingStates.delete(state);

  if (!code) {
    return "/me?connect_error=missing_code";
  }

  const user = await getOrCreateSingleUser(requireEmail());
  const oauth2Client = createOAuthClient(GOOGLE_REDIRECT_URI);

  if (intent === "login") {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.access_token) return "/me?connect_error=exchange_failed";
      const profile = await fetchUserInfo(OAUTH_PROVIDERS.google, tokens.access_token);
      await db
        .from("social_login")
        .upsert(
          { user_id: user.id, provider: "google", provider_user_id: profile.id, name: profile.name, email: profile.email },
          { onConflict: "user_id,provider" }
        );
      return "/me?social_connected=google";
    } catch (err) {
      console.error("Google identity login failed:", err);
      return "/me?connect_error=exchange_failed";
    }
  }

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

// ---------------------------------------------------------------- Other social logins (generic, config-driven)
//
// Same OAuth2 pattern as Google, driven entirely by src/webapp/oauthProviders.ts.
// Facebook/LinkedIn/GitHub have no real client id/secret configured — clicking
// Connect explains that honestly instead of pretending to log in. Once someone
// registers a real developer app for one of these and adds the credentials to
// .env, this same route makes it work with no code changes.

function baseUrl(req: express.Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

const genericPendingStates = new Map<string, number>();
function pruneGenericStates() {
  const now = Date.now();
  for (const [state, expiresAt] of genericPendingStates) {
    if (expiresAt < now) genericPendingStates.delete(state);
  }
}

connectRouter.get("/login/:provider", async (req, res) => {
  const providerId = req.params.provider;
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider || providerId === "google") {
    // Google has its own dedicated route above (fixed callback port).
    res.status(404).send("Unknown provider");
    return;
  }

  const user = await getOrCreateSingleUser(requireEmail());
  const credentials = await resolveCredentials(user.id, providerId);
  if (!credentials) {
    res.redirect(`/me?social_error=not_configured&provider=${encodeURIComponent(providerId)}`);
    return;
  }

  pruneGenericStates();
  const state = crypto.randomUUID();
  genericPendingStates.set(state, Date.now() + PENDING_STATE_TTL_MS);

  const redirectUri = `${baseUrl(req)}/login/callback/${providerId}`;
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    scope: provider.scope,
    response_type: "code",
    state,
    ...(provider.extraAuthParams ?? {}),
  });

  res.redirect(`${provider.authorizationUrl}?${params.toString()}`);
});

connectRouter.get("/login/callback/:provider", async (req, res) => {
  const providerId = req.params.provider;
  const provider = OAUTH_PROVIDERS[providerId];
  const { code, state, error: oauthError } = req.query as { code?: string; state?: string; error?: string };

  if (!provider) {
    res.status(404).send("Unknown provider");
    return;
  }
  if (oauthError) {
    res.redirect(`/me?social_error=${encodeURIComponent(oauthError)}`);
    return;
  }
  if (!state || !genericPendingStates.has(state)) {
    res.redirect("/me?social_error=invalid_state");
    return;
  }
  genericPendingStates.delete(state);
  if (!code) {
    res.redirect("/me?social_error=missing_code");
    return;
  }

  try {
    const user = await getOrCreateSingleUser(requireEmail());
    const credentials = await resolveCredentials(user.id, providerId);
    if (!credentials) {
      res.redirect(`/me?social_error=not_configured&provider=${encodeURIComponent(providerId)}`);
      return;
    }

    const redirectUri = `${baseUrl(req)}/login/callback/${providerId}`;
    const accessToken = await exchangeCodeForToken(provider, code, redirectUri, credentials);
    const profile = await fetchUserInfo(provider, accessToken);

    await db
      .from("social_login")
      .upsert(
        { user_id: user.id, provider: providerId, provider_user_id: profile.id, name: profile.name, email: profile.email },
        { onConflict: "user_id,provider" }
      );

    res.redirect(`/me?social_connected=${encodeURIComponent(providerId)}`);
  } catch (err) {
    console.error(`${providerId} identity login failed:`, err);
    res.redirect("/me?social_error=exchange_failed");
  }
});

connectRouter.post("/login/:provider/disconnect", async (req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  await db.from("social_login").delete().eq("user_id", user.id).eq("provider", req.params.provider);
  res.redirect("/me?disconnected=" + encodeURIComponent(req.params.provider) + "_login");
});

// User-supplied OAuth app credentials — filled in from the form on the Me
// page instead of an operator editing .env. Once saved, /login/:provider
// picks them up automatically (resolveCredentials checks the DB first).
connectRouter.post("/oauth-credentials/:provider", async (req, res) => {
  const providerId = req.params.provider;
  if (!OAUTH_PROVIDERS[providerId]) {
    res.status(404).send("Unknown provider");
    return;
  }
  const { clientId, clientSecret } = req.body as { clientId?: string; clientSecret?: string };
  if (!clientId?.trim() || !clientSecret?.trim()) {
    res.redirect(`/me?social_error=missing_credentials&provider=${encodeURIComponent(providerId)}&configureProvider=${encodeURIComponent(providerId)}#configure-oauth`);
    return;
  }

  const user = await getOrCreateSingleUser(requireEmail());
  await saveCredentials(user.id, providerId, clientId.trim(), clientSecret.trim());
  res.redirect(`/me?provider_configured=${encodeURIComponent(providerId)}`);
});

connectRouter.post("/oauth-credentials/:provider/remove", async (req, res) => {
  const user = await getOrCreateSingleUser(requireEmail());
  await db.from("oauth_credential").delete().eq("user_id", user.id).eq("provider", req.params.provider);
  res.redirect("/me?disconnected=" + encodeURIComponent(req.params.provider) + "_credentials");
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
