import { db } from "./db.js";
import type { FactCategory, FactRecord } from "./types.js";

export async function getFacts(userId: string): Promise<FactRecord[]> {
  const { data, error } = await db.from("fact").select("*").eq("user_id", userId).order("category");
  if (error) throw error;
  return data;
}

/** Saving the same `key` again updates the value rather than duplicating it. */
export async function upsertFact(
  userId: string,
  fact: { category: FactCategory; key: string; value: string }
): Promise<FactRecord> {
  const { data, error } = await db
    .from("fact")
    .upsert(
      {
        user_id: userId,
        category: fact.category,
        key: fact.key,
        value: fact.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFact(userId: string, factId: string): Promise<void> {
  const { error } = await db.from("fact").delete().eq("user_id", userId).eq("id", factId);
  if (error) throw error;
}
