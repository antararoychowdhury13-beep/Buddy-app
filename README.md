# Buddy

A proactive assistant that scores candidate insights for confidence, tiers
them (silent / passive / ambient / proactive), composes a daily briefing
from whatever clears the bar, and can speak that briefing aloud on request.

## Quick start (demo mode — no setup)

```
npm install
npm run dev        # serves the app at http://localhost:3000
```

With no `.env` at all, Buddy boots in **demo mode**: an in-memory store seeded
with a full, believable day (calendar, weather, nudges across every life
domain, a composed briefing, per-domain trust history, remembered facts, and
notification history). Every screen is populated immediately, confirm/dismiss
and the Ask/Chat responder all work, and nothing external is required. This is
the fastest way to see the whole app. Real integrations layer in on top — set
the env vars below to replace the demo, one piece at a time.

## Setup (real data)

1. `npm install`
2. Copy `.env.example` to `.env` and fill in what you want (all optional — see
   the comments in that file):
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — set **both** to leave demo mode and
     persist to a real Postgres project
   - `ANTHROPIC_API_KEY` — turns on full conversational Ask/Chat and
     LLM-composed briefings (starts with `sk-ant-`). Without it, Buddy answers
     from your day's data with a built-in local responder.
   - `BUDDY_USER_EMAIL` — the single user this prototype runs for
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — only needed to connect Calendar (see below); identify the OAuth app itself, not a user's connection

## Running (with Supabase)

```
npm run dev        # serves the app at http://localhost:3000
npm run ingest     # pull calendar/weather events, score them, compose a briefing
```

Run `ingest` at least once so there's a briefing to display. Calendar and
Weather each need to be connected first (from the Me page, or via
`npm run auth:google` for Calendar) — see **Connectors** below. (In demo mode
none of this is needed — the seeded briefing and events are already there.)

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
npm run test:stt   # local Whisper round-trip test (see Voice section)
npm run typecheck  # type-checks src/ and scripts/ together
npm run build      # compiles src/ to dist/
```

## Voice (Kokoro for speech out, Whisper for speech in)

Every page with a "Listen" button synthesizes that text to speech and plays
it back — manual playback only, triggered by a click, never autoplay.

The `/voice` screen additionally takes microphone input: tap the orb, ask a
question out loud. Recording, resampling to 16kHz, and transcription all
happen locally — no cloud speech API. This was a deliberate choice over the
browser's built-in `SpeechRecognition`: that API silently depends on
reaching Google's speech servers in the background, which fails
unpredictably behind ad-blockers, VPNs, or non-Chrome browsers (Brave/Arc
disable it outright) with an unhelpful "network" error that's outside any
app code's control to fix. A local Whisper model has no such dependency.
See **Ask Buddy** below for how the answer itself is generated.

**Speech-to-text architecture:**
```
src/voice/speechToText.ts   transcribeAudio(samples) -> text, via @huggingface/transformers'
                             automatic-speech-recognition pipeline (Xenova/whisper-tiny.en, local, quantized)
POST /transcribe             raw 32-bit float PCM mono @ 16kHz in the body -> { transcript }
```
The browser captures mic audio via `getUserMedia` + `ScriptProcessorNode`,
resamples it to 16kHz with an `OfflineAudioContext`, and posts the raw
Float32 samples directly (no WAV wrapping needed) — gracefully disabled
with a message if `getUserMedia` isn't available at all.

Run `npm run test:stt` to verify the pipeline without needing a live human
voice: it has Kokoro synthesize a sentence, feeds that audio into Whisper,
and checks the transcript round-trips correctly.

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

## Ask Buddy

`POST /ask` with `{ "question": "..." }` returns `{ "answer": "..." }`. It's
used by both `/chats` (typed) and `/voice` (spoken) — one real Claude call
(`answerQuestion` in `src/reasoning.ts`) grounded in the user's actual data:
today's delivered insights, per-domain trust scores, and raw calendar/weather
events. It won't invent meetings or numbers that aren't in that context, and
it can't take actions (confirm/dismiss, create events) on the user's behalf —
it'll say so and point back to the app instead of pretending to have done it.

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
| `/voice` | Full-screen "Talk to Buddy" — tap the orb, ask by voice, get a real spoken answer |
| `/chats` | Ask a question by typing; same real Q&A as `/voice` |
| `/how-it-works` | Static explanation of the tiering mechanism |

`src/webapp/design.ts` holds the design tokens/CSS/icon sprite, `shell.ts`
wraps every route in the shared header/tabbar/menu-drawer, `helpers.ts` has
the domain→icon/color mapping and small formatting utilities.
