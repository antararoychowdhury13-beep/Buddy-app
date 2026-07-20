import { db } from "../db.js";

/**
 * Generic OAuth2 identity-login framework — provider-agnostic, config-driven.
 * Google is wired with real credentials (the same app already used for
 * Calendar), read from .env. Every other provider is resolved from the
 * `oauth_credential` table instead — the user pastes their own client
 * id/secret in from the Me page (after registering a developer app on that
 * platform themselves) rather than an operator editing .env and restarting
 * the server. Env vars are checked as a fallback so an operator-configured
 * deployment still works without a DB row.
 */
export interface OAuthProviderConfig {
  id: string;
  displayName: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
  extraAuthParams?: Record<string, string>;
  userInfoUrl: string;
  /** Maps the provider's raw userinfo JSON to a normalized shape. */
  mapUserInfo: (raw: Record<string, unknown>) => { id: string; name: string | null; email: string | null };
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    id: "google",
    displayName: "Google",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    clientIdEnvVar: "GOOGLE_CLIENT_ID",
    clientSecretEnvVar: "GOOGLE_CLIENT_SECRET",
    extraAuthParams: { prompt: "select_account" },
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    mapUserInfo: (raw) => ({
      id: String(raw.sub ?? ""),
      name: (raw.name as string) ?? null,
      email: (raw.email as string) ?? null,
    }),
  },
  facebook: {
    id: "facebook",
    displayName: "Facebook",
    authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "public_profile,email",
    clientIdEnvVar: "FACEBOOK_CLIENT_ID",
    clientSecretEnvVar: "FACEBOOK_CLIENT_SECRET",
    userInfoUrl: "https://graph.facebook.com/me?fields=id,name,email",
    mapUserInfo: (raw) => ({
      id: String(raw.id ?? ""),
      name: (raw.name as string) ?? null,
      email: (raw.email as string) ?? null,
    }),
  },
  linkedin: {
    id: "linkedin",
    displayName: "LinkedIn",
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "openid profile email",
    clientIdEnvVar: "LINKEDIN_CLIENT_ID",
    clientSecretEnvVar: "LINKEDIN_CLIENT_SECRET",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    mapUserInfo: (raw) => ({
      id: String(raw.sub ?? ""),
      name: (raw.name as string) ?? null,
      email: (raw.email as string) ?? null,
    }),
  },
  github: {
    id: "github",
    displayName: "GitHub",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    clientIdEnvVar: "GITHUB_CLIENT_ID",
    clientSecretEnvVar: "GITHUB_CLIENT_SECRET",
    userInfoUrl: "https://api.github.com/user",
    mapUserInfo: (raw) => ({
      id: String(raw.id ?? ""),
      name: (raw.name as string) ?? (raw.login as string) ?? null,
      email: (raw.email as string) ?? null,
    }),
  },
  // The three below are the only apps from the 90-app roadmap wired into
  // this generic connector — their OAuth2 endpoints are standard,
  // well-documented, and stable enough to state with confidence. Every
  // other "oauth"-tagged app in the roadmap uses a provider with either a
  // non-standard flow (Zerodha, Pocket, TripIt) or an authorization-code
  // exchange that needs something beyond client_id/secret (PKCE for Zoom,
  // HTTP Basic auth for Notion/Fitbit) that this generic exchange doesn't
  // yet handle — so they stay informational rather than risk a form that
  // silently fails.
  microsoft: {
    id: "microsoft",
    displayName: "Microsoft",
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile offline_access",
    clientIdEnvVar: "MICROSOFT_CLIENT_ID",
    clientSecretEnvVar: "MICROSOFT_CLIENT_SECRET",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    mapUserInfo: (raw) => ({
      id: String(raw.id ?? ""),
      name: (raw.displayName as string) ?? null,
      email: (raw.mail as string) ?? (raw.userPrincipalName as string) ?? null,
    }),
  },
  discord: {
    id: "discord",
    displayName: "Discord",
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify email",
    clientIdEnvVar: "DISCORD_CLIENT_ID",
    clientSecretEnvVar: "DISCORD_CLIENT_SECRET",
    userInfoUrl: "https://discord.com/api/users/@me",
    mapUserInfo: (raw) => ({
      id: String(raw.id ?? ""),
      name: (raw.username as string) ?? null,
      email: (raw.email as string) ?? null,
    }),
  },
  spotify: {
    id: "spotify",
    displayName: "Spotify",
    authorizationUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scope: "user-read-email user-read-private",
    clientIdEnvVar: "SPOTIFY_CLIENT_ID",
    clientSecretEnvVar: "SPOTIFY_CLIENT_SECRET",
    userInfoUrl: "https://api.spotify.com/v1/me",
    mapUserInfo: (raw) => ({
      id: String(raw.id ?? ""),
      name: (raw.display_name as string) ?? null,
      email: (raw.email as string) ?? null,
    }),
  },
};

interface ResolvedCredentials {
  clientId: string;
  clientSecret: string;
  /** Where this credential came from — shown in the UI so it's clear a user-entered value is in play, not a mystery env var. */
  source: "database" | "env";
}

/** DB row first (user pasted their own credentials in via the Me page), env vars as a fallback. */
export async function resolveCredentials(userId: string, providerId: string): Promise<ResolvedCredentials | null> {
  const config = OAUTH_PROVIDERS[providerId];
  if (!config) return null;

  const { data: row } = await db
    .from("oauth_credential")
    .select("client_id, client_secret")
    .eq("user_id", userId)
    .eq("provider", providerId)
    .maybeSingle();
  if (row?.client_id && row?.client_secret) {
    return { clientId: row.client_id, clientSecret: row.client_secret, source: "database" };
  }

  const envId = process.env[config.clientIdEnvVar];
  const envSecret = process.env[config.clientSecretEnvVar];
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, source: "env" };
  }

  return null;
}

export async function isProviderConfigured(userId: string, providerId: string): Promise<boolean> {
  return (await resolveCredentials(userId, providerId)) !== null;
}

export async function saveCredentials(userId: string, providerId: string, clientId: string, clientSecret: string): Promise<void> {
  await db
    .from("oauth_credential")
    .upsert({ user_id: userId, provider: providerId, client_id: clientId, client_secret: clientSecret }, { onConflict: "user_id,provider" });
}

/** Generic authorization-code -> access-token exchange, standard OAuth2 form-encoded POST. */
export async function exchangeCodeForToken(
  provider: OAuthProviderConfig,
  code: string,
  redirectUri: string,
  credentials: ResolvedCredentials
): Promise<string> {
  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${provider.displayName} token exchange failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error(`${provider.displayName} did not return an access token.`);
  return data.access_token;
}

export async function fetchUserInfo(
  provider: OAuthProviderConfig,
  accessToken: string
): Promise<{ id: string; name: string | null; email: string | null }> {
  const res = await fetch(provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "buddy-app" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${provider.displayName} profile fetch failed: ${res.status} ${body}`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return provider.mapUserInfo(raw);
}
