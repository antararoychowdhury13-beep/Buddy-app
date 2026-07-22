import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMemoryDb } from "./memoryDb.js";
import { DEMO_EMAIL, seedDemoData } from "./demoData.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

/**
 * True when no Supabase project is configured. In that case Buddy runs fully
 * self-contained against an in-memory store seeded with demo data, so the app
 * is usable the moment it starts — real Supabase (and the connectors/keys it
 * unlocks) can be wired in later just by setting the env vars.
 */
export const IS_DEMO = !(url && key);

/** The user Buddy runs as. Real Supabase mode uses BUDDY_USER_EMAIL; demo mode
 *  falls back to the seeded demo user so nothing has to be configured first. */
export const DEFAULT_USER_EMAIL = process.env.BUDDY_USER_EMAIL || DEMO_EMAIL;

let dbInstance: SupabaseClient;

if (url && key) {
  dbInstance = createClient(url, key);
} else {
  const memory = createMemoryDb();
  seedDemoData(memory, DEFAULT_USER_EMAIL);
  // The memory store implements exactly the query surface the app uses; cast so
  // every existing `db.from(...)` call site stays typed against SupabaseClient.
  dbInstance = memory as unknown as SupabaseClient;
  console.warn(
    "[buddy] No SUPABASE_URL/SUPABASE_ANON_KEY set — running in DEMO MODE " +
      "with in-memory seeded data. Set the Supabase env vars to use a real database."
  );
}

export const db = dbInstance;

export async function getOrCreateSingleUser(email: string) {
  const { data: existing, error: findErr } = await db
    .from("app_user")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: created, error: createErr } = await db
    .from("app_user")
    .insert({ email })
    .select("*")
    .single();

  if (createErr) throw createErr;
  return created;
}
