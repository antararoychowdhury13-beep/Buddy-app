# Ask Buddy — agentic orchestration module

A production-quality prototype of Buddy's conversational + agentic layer. It
demonstrates the full loop: understand a request → confirm context → plan
before acting → show assumptions & side effects → approve → execute across
simulated enterprise apps → show evidence → recover from partial failure →
monitor follow-ups → convert the conversation into a reusable workflow.

Every integration here is **simulated / demonstration only** — no real emails,
Jira tasks, or calendar events are created.

## Setup

Part of the Buddy repo. It's a browser module compiled to a static bundle:

```
npm run build:homeai      # compiles src/homeai/** → public/home-ai/bundle/**
npm run dev               # Express serves the app
```

Open `http://localhost:3000/home-ai/` and tap the **center mic FAB** to enter
Ask Buddy. The bottom nav switches between **Home**, **Today** and (via the
FAB) **Ask Buddy** — three coherent modules in one shell.

## Architecture

Vanilla TypeScript modules (no framework) — matching the existing Buddy stack.
Domain logic is kept out of the presentation layer.

```
src/homeai/ask/
  models.ts     Typed domain models + the journey/meeting state machines
  mock.ts       The single Project Phoenix scenario (people, decisions, plan)
  services.ts   Service interfaces + simulated implementations + step runner
  store.ts      State-machine reducer + localStorage persistence + guards
  app.ts        Command-centre renderer (composer, context bar, conversation)
  sheets.ts     Flow overlays (consent → … → workflow builder)
```

Shared with the other modules: `ui/dom.ts` (accessible sheet primitives with
focus-trap + Escape), `ui/icons.ts`, and the design tokens in
`public/home-ai/home.css`.

## Route map (as internal states)

The phone-frame is mobile-first, so the spec's routes map to states/overlays
that preserve scenario state in localStorage:

| Spec route | Here |
|---|---|
| `/buddy` | Command centre (`AskApp`) |
| `/buddy/meeting/project-phoenix` | Consent + live companion sheets |
| `…/mom` | MOM workspace sheet (4 recipient versions) |
| `…/plan` | Plan-before-action + previews + approval |
| `/buddy/activity` | Activity & audit sheet |
| `/buddy/automations[/new]` | Workflow builder sheet |

## State model

Top-level journey: `idle → request_understood → plan_ready →
waiting_for_approval → executing → partially_completed → completed →
monitoring → workflow_saved`.

Meeting: `upcoming → consent_pending → recording/ready → processing →
review_ready → approved`.

**Guards prevent impossible states** (`store.ts`): external sends require
per-step approval before `canExecute()` returns true; recording needs an
accepted consent path; disabled steps never run; a failed step pauses only
downstream work (completed steps are preserved).

## Mock integrations

`services.ts` exposes `AskServices` (email / jira / calendar / timeline /
monitor) returning typed `Evidence`. `runnerFor(step)` maps each plan step to
its simulated call. The **deliberate partial failure** lives here: assigning
`p-priya` returns `{ ok: false }` because she has no Project Phoenix access.

### Replacing mocks with real integrations

Swap the method bodies in `AskServices` (and `runnerFor`) for real API clients
returning the same typed shapes. `GRANTED` (the held permissions) becomes a
real permission check. No UI changes required.

## Accessibility

Semantic headings, keyboard-operable controls, visible focus, focus-trapped
sheets with Escape-to-close, ARIA live regions for execution progress
(`announce()`), non-colour status (labels + icons on every badge), ≥44px touch
targets, reduced-motion honoured in the processing animation, and an accessible
action-items table.

## Verified primary journey (browser-tested)

Open → Work→Phoenix → submit request → consent → simulate meeting → generate
MOM → correct launch date (18→28 Aug) → redact confidential from the external
version → review plan → approve 3 high-impact steps → execute (3 succeed with
evidence) → resolve Priya failure → completion evidence → activate workflow.
Journey ends at `workflow_saved` with a 14-entry audit trail and no console
errors.

## Known limitations

- Deterministic simulation, not real AI/APIs.
- Mobile phone-frame only (the spec's desktop 3-pane layout isn't built — the
  conversation-first mobile layout is the primary target here).
- Voice uses the browser SpeechRecognition when present, else a scripted
  fallback.
