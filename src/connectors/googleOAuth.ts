import { google } from "googleapis";

/** Shared between the calendar connector, the CLI auth script, and the in-app connect routes. */
export const GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

/**
 * GOOGLE_CLIENT_ID/SECRET identify the OAuth application itself (registered
 * once in Google Cloud Console) — distinct from a user's refresh token,
 * which is per-connection and lives in the `connector` table.
 */
export function requireGoogleAppCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET must be set in .env — create an OAuth client in Google Cloud Console first."
    );
  }
  return { clientId, clientSecret };
}

export function createOAuthClient(redirectUri?: string) {
  const { clientId, clientSecret } = requireGoogleAppCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
