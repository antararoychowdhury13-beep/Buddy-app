-- Buddy — optional seed for a real Supabase project
-- =============================================================================
-- Mirrors the built-in demo day (see src/demoData.ts) so a freshly migrated
-- Supabase database isn't empty on first run. Runs automatically on
-- `supabase db reset`, or paste it into the SQL Editor once.
--
-- Idempotent: it only seeds when the demo user doesn't already exist, so it's
-- safe to run more than once and won't clobber real data you've since added.
-- Times are anchored to "today" so the day always looks current.
-- =============================================================================

do $$
declare
  uid       uuid := '00000000-0000-0000-0000-000000000001';
  now_ts    timestamptz := now();
  demo_email text := 'you@buddy.app';
begin
  if exists (select 1 from public.app_user where email = demo_email) then
    return; -- already seeded
  end if;

  insert into public.app_user (id, email, display_name) values (uid, demo_email, 'Anupam');

  insert into public.connector (user_id, type, status, metadata) values
    (uid, 'google_calendar', 'connected', '{}'::jsonb),
    (uid, 'weather', 'connected', '{"location":"Bengaluru,IN"}'::jsonb);

  insert into public.social_login (user_id, provider, name, email) values
    (uid, 'google', 'Anupam', demo_email);

  insert into public.event (user_id, type, domain, occurred_at, raw) values
    (uid, 'calendar_event', 'work',    current_date + time '09:00', '{"id":"gcal-standup","summary":"Morning standup"}'::jsonb),
    (uid, 'calendar_event', 'work',    current_date + time '11:30', '{"id":"gcal-review","summary":"Design review with Rahul"}'::jsonb),
    (uid, 'calendar_event', 'family',  current_date + time '13:00', '{"id":"gcal-lunch","summary":"Lunch with Mum"}'::jsonb),
    (uid, 'calendar_event', 'work',    current_date + time '16:00', '{"id":"gcal-1v1","summary":"1:1 with your manager"}'::jsonb),
    (uid, 'calendar_event', 'family',  current_date + time '18:00', '{"id":"gcal-airport","summary":"Pick up Mum from the airport"}'::jsonb),
    (uid, 'weather_forecast','commute', current_date + time '17:00', '{"condition":"Light rain","window":"5–7pm"}'::jsonb);

  insert into public.insight (user_id, domain, source_event_ids, candidate_text, confidence, tier, delivered_at) values
    (uid, 'family',  '{}', 'Mum''s flight lands at 6:40pm. I set a leave-by reminder for 5:15 so you beat the airport rush.', 0.86, 'proactive', now_ts),
    (uid, 'work',    '{}', 'I declined the 2pm ''weekly sync'' — it overlapped your focus block and had no owner. You can undo that if you want it back.', 0.83, 'proactive', now_ts),
    (uid, 'work',    '{}', 'Your 11:30 design review with Rahul still has no agenda. I drafted three talking points from the thread.', 0.78, 'ambient', now_ts),
    (uid, 'health',  '{}', 'You slept 7h 42m — only 15 minutes short of your target. I kept your morning light.', 0.72, 'ambient', now_ts),
    (uid, 'finance', '{}', 'Your electricity bill (₹2,340) is due tomorrow. I can remind you at 9am.', 0.70, 'ambient', now_ts),
    (uid, 'commute', '{}', 'Light rain is expected 5–7pm. Leaving 10 minutes earlier should keep the airport run smooth.', 0.66, 'passive', now_ts),
    (uid, 'work',    '{}', 'A recruiter emailed about a role — low urgency, so I held it back.', 0.31, 'silent', null),
    (uid, 'other',   '{}', 'A show you follow added a new season.', 0.26, 'silent', null),
    (uid, 'health',  '{}', 'Screen time was a little high last night — nothing worth a nudge.', 0.38, 'silent', null);

  insert into public.briefing (user_id, composed_text) values
    (uid, 'Good morning — I''ve already handled the busywork. Your day has four meetings, and I moved things so your morning stays protected: I declined a 2pm sync with no owner and drafted talking points for the 11:30 review with Rahul. The big one is this evening — Mum''s flight lands at 6:40pm, so I''ve set a leave-by reminder for 5:15, a little earlier because light rain is expected around then. Your electricity bill is due tomorrow; say the word and I''ll remind you at 9am. You don''t have to do it all — just the next right thing.');

  insert into public.trust_score (user_id, domain, confirmed_count, dismissed_count, ignored_count, evidence_count, accuracy) values
    (uid, 'work',    14, 2, 3, 19, 0.875),
    (uid, 'family',   9, 0, 1, 10, 1.0),
    (uid, 'health',   6, 3, 2, 11, 0.667),
    (uid, 'commute',  5, 4, 1, 10, 0.556),
    (uid, 'finance',  3, 1, 0, 4,  0.75),
    (uid, 'other',    2, 2, 1, 5,  0.5);

  insert into public.fact (user_id, category, key, value) values
    (uid, 'family',  'Partner''s phone number', '+91 98765 43210'),
    (uid, 'home',    'Home address', '42 Brigade Road, Bengaluru 560001'),
    (uid, 'office',  'Office commute route', 'Via Old Airport Road — about 35 minutes'),
    (uid, 'festival','Diwali', 'November 12 — book train tickets home by early October');
end $$;
