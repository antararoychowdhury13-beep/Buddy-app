import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { google } from "googleapis";
import http from "node:http";

/**
 * One-time interactive OAuth flow for Google Calendar (installed-app / desktop
 * flow). Run with `npm run auth:google`. Opens a consent screen in your
 * browser, catches the redirect on a local port, exchanges the code for a
 * refresh token, and writes it into .env as GOOGLE_REFRESH_TOKEN.
 */

const REDIRECT_PORT = 3939;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const ENV_PATH = path.resolve(process.cwd(), ".env");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Create an OAuth client (Desktop app) in Google Cloud Console and add its Client ID/Secret to .env first.`
    );
  }
  return value;
}

function writeRefreshTokenToEnv(token: string) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  if (/^GOOGLE_REFRESH_TOKEN=.*$/m.test(content)) {
    content = content.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${token}`);
  } else {
    content += `${content.endsWith("\n") || content === "" ? "" : "\n"}GOOGLE_REFRESH_TOKEN=${token}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
}

async function main() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this account has authorized before
    scope: SCOPES,
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

  writeRefreshTokenToEnv(tokens.refresh_token);
  console.log("\nSaved GOOGLE_REFRESH_TOKEN to .env. You're ready to run `npm run ingest`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
