# Buddy

A proactive assistant that scores candidate insights for confidence, tiers
them (silent / passive / ambient / proactive), composes a daily briefing
from whatever clears the bar, and can speak that briefing aloud on request.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — the Postgres project backing everything
   - `ANTHROPIC_API_KEY` — used to compose the daily briefing (starts with `sk-ant-`, not `sk-proj-`)
   - `BUDDY_USER_EMAIL` — the single user this prototype runs for
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — only needed to connect Calendar (see below); identify the OAuth app itself, not a user's connection

## Running

```
npm run dev        # serves the app at http://localhost:3000
npm run ingest     # pull calendar/weather events, score them, compose a briefing
```

Run `ingest` at least once so there's a briefing to display. Calendar and
Weather each need to be connected first (from the Me page, or via
`npm run auth:google` for Calendar) — see **Connectors** below.

## Connectors

Calendar and Weather credentials live in the `connector` table, not `.env`
— manage them from the **Me** page in the running app:

- **Weather** — click Connect, paste a free [OpenWeatherMap](https://openweathermap.org/api) API key and a location (`City,CountryCode`).
- **Calendar** — click Connect, sign in and approve on Google's consent screen, you're bounced back connected. Requires a one-time Google Cloud Console setup first:
  1. Create/select a project at [console.cloud.google.com](https://console.cloud.google.com), enable the **Google Calendar API**.
  2. **OAuth consent screen**: External user type, add scope `.../auth/calendar.readonly`, add yourself as a **test user** (the app stays in Testing mode).
  3. **Credentials → Create OAuth client ID**, type **Web application**, add `http://localhost:3939/oauth2callback` under Authorized redirect URIs.
  4. Put the resulting Client ID/Secret in `.env`.

  The app runs its own tiny listener on `localhost:3939` to catch Google's
  redirect (`src/webapp/connect.ts`) — deliberately the same fixed port/path
  for both the in-app Connect button and the `npm run auth:google` CLI
  fallback, so registering that one redirect URI is a one-time setup step
  regardless of which flow you use.

Disconnecting (also from the Me page) clears the stored credentials and
revokes the Google token — ingest will then correctly refuse to run for
that connector until it's reconnected, rather than silently falling back
to anything.

## Tests

```
npm test           # trust engine unit tests (tiering, confidence formula)
npm run test:speech  # /speech endpoint smoke test (see Voice section)
npm run typecheck  # type-checks src/ and scripts/ together
npm run build      # compiles src/ to dist/
```

## Voice (Kokoro)

The briefing page has a "Listen" button that synthesizes the displayed
briefing to speech and plays it back — manual playback only, no autoplay,
no microphone.

**Architecture:** the rest of Buddy never knows which TTS engine is in use.
Everything goes through one interface:

```
src/voice/VoiceService.ts        interface: generateSpeech(text) -> { audio, mimeType }
src/voice/kokoroVoiceService.ts  Kokoro-82M implementation (kokoro-js, runs locally)
src/voice/index.ts               the only wiring point — swap engines by editing this file alone
```

To replace Kokoro with a different provider later, implement `VoiceService`
in a new file and change the one line in `src/voice/index.ts` that
constructs `voiceService`. No other file needs to change.

**Endpoint:** `POST /speech` with `{ "text": "..." }`, returns `audio/wav`.
Rejects empty/non-string text and text over 1500 characters with a `400`.

**First run:** synthesizing speech for the first time downloads Kokoro-82M's
quantized ONNX weights from the Hugging Face Hub (needs network access once)
and caches them under `node_modules/@huggingface/transformers/.cache/`
(already git-ignored via `node_modules/`). Every call after that is fully
offline and reuses the in-memory model, so it's much faster.

**Voice/language:** English only, voice `af_heart`, for v1.

## Web app

A full mobile-style app UI, server-rendered (no build step, no client
framework — plain Express routes + a shared shell in `src/webapp/`):

| Route | What it shows |
|---|---|
| `/` | Home — real briefing, real delivered/silent insight counts, nudge feed |
| `/insight/:id` | Nudge detail — confidence, tier, per-insight Listen, Confirm/Dismiss |
| `/my-day` | Chronological timeline built from real calendar/weather `event` rows |
| `/me` | Real per-domain trust bars, real connected accounts |
| `/notifications` | Real feed from the `feedback` table + newly delivered insights |
| `/voice` | Full-screen "Talk to Buddy" — plays the real briefing aloud (TTS only, no mic) |
| `/chats` | Ask a question; Buddy's reply is the real latest composed briefing |
| `/how-it-works` | Static explanation of the tiering mechanism |

`src/webapp/design.ts` holds the design tokens/CSS/icon sprite, `shell.ts`
wraps every route in the shared header/tabbar/menu-drawer, `helpers.ts` has
the domain→icon/color mapping and small formatting utilities.
