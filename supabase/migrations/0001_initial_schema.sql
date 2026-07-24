-- Buddy — initial schema
-- =============================================================================
-- Creates every table the app reads and writes, matching the shapes used in
-- src/ (see src/types.ts, src/db.ts, src/webapp/connect.ts, scripts/ingest.ts).
--
-- Apply this to a fresh Supabase project (SQL Editor, or `supabase db push`),
-- then set SUPABASE_URL / SUPABASE_ANON_KEY in .env to leave demo mode and run
-- against real Postgres. The UNIQUE constraints below are load-bearing: the app
-- relies on them for its PostgREST upserts (`onConflict: "..."`).
--
-- RLS note: this single-user prototype talks to Supabase with the anon key and
-- no end-user auth, so Row Level Security is intentionally left DISABLED here.
-- Before any multi-user or production use, enable RLS on every table and add
-- policies scoped to the authenticated user.
-- =============================================================================

-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+); no extension needed.

-- ---- Users -----------------------------------------------------------------
create table if not exists public.app_user (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now()
);

-- ---- Connectors (Calendar / Weather) ---------------------------------------
create table if not exists public.connector (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.app_user (id) on delete cascade,
  type          text not null,                    -- 'google_calendar' | 'weather'
  status        text not null default 'disconnected', -- 'connected' | 'error' | 'disconnected'
  metadata      jsonb not null default '{}'::jsonb,
  refresh_token text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, type)                          -- upsert onConflict: "user_id,type"
);

-- ---- Raw events (calendar + weather) ---------------------------------------
create table if not exists public.event (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.app_user (id) on delete cascade,
  connector_id uuid references public.connector (id) on delete set null,
  type         text not null,                     -- 'calendar_event' | 'weather_forecast'
  domain       text not null,                     -- work | commute | health | family | finance | other
  occurred_at  timestamptz not null,
  raw          jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists event_user_created_idx on public.event (user_id, created_at desc);

-- ---- Scored insights (trust-engine output) ---------------------------------
create table if not exists public.insight (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.app_user (id) on delete cascade,
  domain            text not null,
  source_event_ids  text[] not null default '{}',
  candidate_text    text not null,
  confidence        numeric not null,
  tier              text not null,                 -- silent | passive | ambient | proactive
  composed_text     text,
  delivered_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists insight_user_created_idx on public.insight (user_id, created_at desc);

-- ---- Composed daily briefing -----------------------------------------------
create table if not exists public.briefing (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.app_user (id) on delete cascade,
  composed_text text not null,
  insight_ids   text[] not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists briefing_user_created_idx on public.briefing (user_id, created_at desc);

-- ---- Per-domain trust scores -----------------------------------------------
create table if not exists public.trust_score (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.app_user (id) on delete cascade,
  domain          text not null,
  confirmed_count integer not null default 0,
  dismissed_count integer not null default 0,
  ignored_count   integer not null default 0,
  evidence_count  integer not null default 0,
  accuracy        numeric not null default 0.5,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, domain)                         -- upsert onConflict: "user_id,domain"
);

-- ---- Remembered personal facts ---------------------------------------------
create table if not exists public.fact (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.app_user (id) on delete cascade,
  category   text not null default 'other',        -- home | office | family | contact | festival | other
  key        text not null,
  value      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)                            -- upsert onConflict: "user_id,key"
);

-- ---- Feedback (confirm / dismiss / ignore) ---------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.app_user (id) on delete cascade,
  insight_id uuid references public.insight (id) on delete set null,
  action     text not null,                        -- confirmed | dismissed | ignored
  created_at timestamptz not null default now()
);
create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);

-- ---- Social sign-in (identity) ---------------------------------------------
create table if not exists public.social_login (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.app_user (id) on delete cascade,
  provider         text not null,                  -- google | github | ...
  provider_user_id text,
  name             text,
  email            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, provider)                       -- upsert onConflict: "user_id,provider"
);

-- ---- User-supplied OAuth app credentials -----------------------------------
create table if not exists public.oauth_credential (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.app_user (id) on delete cascade,
  provider      text not null,
  client_id     text not null,
  client_secret text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)                       -- upsert onConflict: "user_id,provider"
);
