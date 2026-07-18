import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env");
}

export const db = createClient(url, key);

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
