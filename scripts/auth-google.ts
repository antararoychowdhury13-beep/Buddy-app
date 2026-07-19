import "dotenv/config";
import http from "node:http";
import { db, getOrCreateSingleUser } from "../src/db.js";
import { createOAuthClient, GOOGLE_CALENDAR_SCOPES } from "../src/connectors/googleOAuth.js";

/**
 * CLI fallback for the one-time Google Calendar OAuth consent flow —
 * the primary path is now the in-app Connect button on the Me page
 * (GET /connect/google), which does the same exchange without leaving
 * the browser. Run this only if you'd rather do it from the terminal.
 * Saves the refresh token onto the `connector` row in Postgres, same
 * place the in-app flow writes it.
 */

const REDIRECT_PORT = 3939;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

async function main() {
  const email = process.env.BUDDY_USER_EMAIL;
  if (!email) throw new Error("BUDDY_USER_EMAIL must be set in .env");
  const user = await getOrCreateSingleUser(email);

  const oauth2Client = createOAuthClient(REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this account has authorized before
    scope: GOOGLE_CALENDAR_SCOPES,
  });

  console.log("\nOpen this URL in your browser and approve access:\n");
  console.log(authUrl);
  console.log(`\nWaiting for the redirect on ${REDIRECT_URI} ...`);

  const code: string = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, REDIRECT_URI);
      if (url.pathname !== "/oauth2callback") return;

      const err = url.searchParams.get("error");
      const authCode = url.searchParams.get("code");

      res.setHeader("Content-Type", "text/html");
      if (err || !authCode) {
        res.end("<h1>Authorization failed</h1>You can close this tab and check the terminal.");
        server.close();
        reject(new Error(err ?? "No authorization code returned"));
        return;
      }

      res.end("<h1>Buddy is connected to Google Calendar</h1>You can close this tab.");
      server.close();
      resolve(authCode);
    });
    server.listen(REDIRECT_PORT);
  });

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token returned. If you've authorized this app before, revoke access at https://myaccount.google.com/permissions and run this again."
    );
  }

  const { error } = await db
    .from("connector")
    .upsert(
      { user_id: user.id, type: "google_calendar", status: "connected", refresh_token: tokens.refresh_token },
      { onConflict: "user_id,type" }
    );
  if (error) throw error;

  console.log("\nSaved the refresh token to the connector table. You're ready to run `npm run ingest`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
