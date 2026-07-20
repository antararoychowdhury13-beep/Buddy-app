# Buddy — Feature Inventory

Everything currently built, what's real vs. informational, and where to find it in the code. Grouped by capability, not by build order.

---

## 1. Core briefing loop

- **Connectors → Trust Engine → Reasoning → Delivery**: candidate events from Calendar/Weather are scored, tiered, and only the ones that clear the bar get surfaced.
- **Trust engine** (`src/trustEngine.ts`): `confidence = sourceDirectness × evidenceMaturity × domainAccuracy × stakesMultiplier`, mapped to four tiers — `silent` (held back), `passive`, `ambient`, `proactive` (delivered) — via fixed thresholds (0.3 / 0.5 / 0.75).
- **Daily briefing composition** (`src/reasoning.ts` → `composeBriefing()`): Claude writes the actual briefing text from whatever insights cleared the bar.
- **Feedback loop**: Confirm/Dismiss buttons on every delivered insight write back to `trust_score`, adjusting future confidence per domain (`src/trustScoreStore.ts`).
- **Ingest pipeline** (`scripts/ingest.ts`): pulls from real Calendar/Weather connectors, runs scoring, writes a `briefing` row every run — `npm run ingest`.

## 2. Voice interface

- **Text-to-speech**: Kokoro-82M (`onnx-community/Kokoro-82M-v1.0-ONNX`), voice `af_heart`, runs locally on-device — no cloud TTS API.
- **Speech-to-text**: Whisper `tiny.en`, also local/on-device (`Xenova/whisper-tiny.en`, quantized), replacing the old browser `SpeechRecognition` API entirely (that depended on reaching Google's speech servers and failed unpredictably). Handles recordings up to 20s with chunked transcription.
- **Mic capture**: raw `getUserMedia` + Web Audio API, resampled client-side to 16kHz — no `MediaRecorder`, no server-side transcoding.
- **Voice orb states**: the orb visibly changes color/motion per stage — violet idle, **green ring** while listening, **spinning amber dashed ring** while thinking, back to violet while speaking — so the state is legible without reading the caption.
- **Wake word ("Buddy")**: opt-in, off by default. When enabled, greets you personally ("Hi Anupam, how can I help?") instead of requiring a tap. Auto-disables after 3 consecutive mic-access failures rather than retrying forever.
- **General-knowledge Q&A**: Buddy answers ordinary questions ("what time is it," general knowledge) directly, not just questions about your calendar/weather data — `answerQuestion()` in `src/reasoning.ts`, exposed via `POST /ask`.

## 3. Personal memory

- **`fact` table**: category (home / office / family / contact / festival / other), key, value — free-form personal facts.
- **Real Claude tool-calling**: Buddy decides *on its own* when something you say should be remembered (via a `remember_fact` tool in the Q&A loop), not a hardcoded keyword match.
- **Facts feed every answer**: known facts are injected into the Q&A system prompt, so "what's my wife's number" works in Chats or Voice.
- **Manual add/delete**: "Personal info Buddy remembers" section on the Me page — add a fact directly, or delete any Buddy stored automatically.

## 4. Connected accounts (real, working data connectors)

| Connector | Status | Notes |
|---|---|---|
| **Google Calendar** | ✅ Real | OAuth2, refresh token stored in DB, in-app Connect/Disconnect, no `.env` editing needed after initial setup |
| **Weather** | ✅ Real | OpenWeatherMap, API key + location entered via an in-app form |

Both migrate credentials out of `.env` into the DB automatically on first connect, and never silently re-migrate after an explicit disconnect.

## 5. Sign in with (real identity OAuth)

Seven providers, each backed by a generic, config-driven OAuth2 framework (`src/webapp/oauthProviders.ts`):

| Provider | Status |
|---|---|
| Google | ✅ Real — tested end-to-end against the actual `accounts.google.com` consent screen |
| Facebook, LinkedIn, GitHub, Microsoft, Discord, Spotify | 🔧 User-configurable — tap **Set up**, paste in a client ID/secret from your own developer app registration, and it becomes a real **Sign in** button. No `.env` edits or server restart needed. |

Credentials are stored per-user in the `oauth_credential` table (Google keeps using its existing `.env`-based app). The in-app form shows the exact redirect URI to register on each platform's developer console.

**Important honesty note**: signing in with one of these only proves *identity* (name/email). It does **not** mean Buddy is pulling data from that platform — there's no Outlook Calendar/Discord/Spotify data connector built. Only Google Calendar and Weather actually fetch and use data today.

## 6. 90-app integration roadmap

`src/webapp/integrationRegistry.ts` — a real, researched analysis of how each of 90 apps across 10 categories (Work, Email, Commute, Finance, Health, Family, Shopping, Entertainment, Travel, Career) would actually connect, not a generic "Coming soon" list.

- Each app is tagged with a real auth method: **OAuth available**, **API key**, **Regulated aggregator** (e.g. Indian banks via RBI Account Aggregator), **Device-only** (e.g. Apple HealthKit), **Unofficial only**, **API deprecated**, or **No public API**.
- **Me page UI**: categories are collapsed by default, showing a count summary (e.g. "8 OAuth · 1 API key") — tap to expand and see every app with its method, a one-line explanation of *why*, and a differentiated action:
  - **API key apps** (Trello, Google Maps, Zerodha...) → **Add API key**, pre-fills a note with a "paste your key here" prompt.
  - **No public API apps** (WhatsApp, Netflix...) → **Save a note**, for anything you want Buddy to remember manually.
  - **OAuth apps not yet wired** (Slack, Notion, Zoom, Zerodha...) → honestly labeled "Needs developer app" — these use non-standard flows (PKCE, Basic-auth token exchange, OAuth 1.0a) that the generic framework doesn't support yet, so no misleading form is shown.
  - Aggregator / device-only / unofficial / deprecated apps → labeled with why, no dead-end button.

## 7. Web app & design system

- Server-rendered, no client framework — shared CSS/icon/shell system in `src/webapp/design.ts` and `shell.ts`.
- 8 screens: Home, Chats, Voice, My Day, Notifications, Me, Insight detail, plus a slide-out menu drawer.
- **Carbon-inspired motion**: real Carbon expressive easing curves and duration tokens (`--ease-standard`, `--ease-entrance`, `--dur-fast/moderate/slow`) applied to the drawer, chevrons, and button press feedback (every button now scales down on `:active` for tactile confirmation).
- **Segmented trust "Meter"**: the "How Buddy is learning" section on the Me page shows confirmed/dismissed/ignored as a proportional stacked bar with a legend, replacing a single accuracy percentage that used to show a misleading 50%-filled bar when a domain had zero feedback. Domains with no data now get an honest "No data yet" state instead.
- **Time-of-day-aware greeting**: Home screen says "Good morning/afternoon/evening" (or "Still up," late at night) based on the actual hour, not a static "Good day."
- **Human-readable stats**: average confidence shown as `66%`, not `0.66`.

## Known limitations (by design, stated honestly)

- Only **Google Calendar** and **Weather** actually fetch live data — every other integration is either identity-only (the 7 sign-in providers) or a personal note (API key / manual entries in the 90-app list).
- **Row Level Security is disabled** on every Supabase table (`app_user`, `connector`, `event`, `insight`, `trust_score`, `feedback`, `briefing`, `fact`, `social_login`, `oauth_credential`) — fine for a local single-user prototype talking to itself, but the anon key currently has full read/write access to every row. Worth fixing with real policies before this touches any shared or public deployment.
- This is a **single-user prototype** — no account system, no sign-in gate on the app itself (the "Sign in with" section is about *identity linking*, not *access control*).

## Tech stack

Node.js/TypeScript, Express, Supabase (Postgres), Anthropic Claude (`claude-sonnet-5`) for reasoning and briefing composition, Kokoro-82M for TTS, Whisper `tiny.en` for STT — both running locally via `@huggingface/transformers`, no cloud speech APIs.
