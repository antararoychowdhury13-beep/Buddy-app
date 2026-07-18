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

## Running

```
npm run ingest     # pull mock calendar/weather events, score them, compose a briefing
npm run dev        # serve the briefing page at http://localhost:3000
```

Run `ingest` at least once before `dev` so there's a briefing to display.

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
