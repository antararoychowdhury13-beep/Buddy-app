/**
 * In-memory, zero-dependency stand-in for the Supabase client, used when no
 * Supabase project is configured (SUPABASE_URL / SUPABASE_ANON_KEY unset).
 *
 * It implements exactly the PostgREST query surface the app actually uses —
 * `from(table).select/insert/update/delete/upsert(...)` with
 * `.eq / .neq / .not / .order / .limit / .single / .maybeSingle` and embedded
 * resource selects (`select("*, insight:insight_id(col, ...)")`) — so every
 * existing call site keeps working unchanged. `db.ts` casts this to the
 * Supabase client type, so nothing downstream knows the difference.
 *
 * This is what makes Buddy fully runnable out of the box: `npm run dev` boots
 * into a seeded demo (see `seedDemoData`) with no external services. Wiring in
 * real Supabase later is just a matter of setting the two env vars.
 */
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type Filter =
  | { kind: "eq"; col: string; val: unknown }
  | { kind: "neq"; col: string; val: unknown }
  | { kind: "notNull"; col: string };

interface QueryResult {
  data: any;
  error: { message: string } | null;
}

export interface MemoryDb {
  from(table: string): QueryBuilder;
  /** Seed a table with rows (demo bootstrap only). */
  seed(table: string, rows: Row[]): void;
}

class QueryBuilder implements PromiseLike<QueryResult> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private mutated = false;
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private payload: Row[] = [];
  private conflictCols: string[] = [];
  private cols = "*";
  private wantReturn = false;
  private singleMode: "none" | "single" | "maybe" = "none";

  constructor(private readonly tables: Map<string, Row[]>, private readonly table: string) {}

  private rows(): Row[] {
    let list = this.tables.get(this.table);
    if (!list) {
      list = [];
      this.tables.set(this.table, list);
    }
    return list;
  }

  // ---- query shaping ----
  select(cols = "*"): this {
    this.cols = cols;
    this.wantReturn = true;
    if (!this.mutated) this.op = "select";
    return this;
  }
  insert(payload: Row | Row[]): this {
    this.op = "insert";
    this.mutated = true;
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }
  update(payload: Row): this {
    this.op = "update";
    this.mutated = true;
    this.payload = [payload];
    return this;
  }
  delete(): this {
    this.op = "delete";
    this.mutated = true;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }): this {
    this.op = "upsert";
    this.mutated = true;
    this.payload = Array.isArray(payload) ? payload : [payload];
    this.conflictCols = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : [];
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ kind: "eq", col, val });
    return this;
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ kind: "neq", col, val });
    return this;
  }
  /** Supports the one shape used: .not("col", "is", null) -> "col is not null". */
  not(col: string, _op: string, _val: unknown): this {
    this.filters.push({ kind: "notNull", col });
    return this;
  }
  is(col: string, val: unknown): this {
    // Only null-checks are used in practice.
    if (val === null) this.filters.push({ kind: "notNull", col }); // negated form never needed
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  single(): this {
    this.singleMode = "single";
    this.wantReturn = true;
    return this;
  }
  maybeSingle(): this {
    this.singleMode = "maybe";
    this.wantReturn = true;
    return this;
  }

  // ---- execution ----
  private match(row: Row): boolean {
    return this.filters.every((f) => {
      if (f.kind === "eq") return row[f.col] === f.val;
      if (f.kind === "neq") return row[f.col] !== f.val;
      return row[f.col] !== null && row[f.col] !== undefined;
    });
  }

  private project(row: Row): Row {
    if (this.cols === "*") return { ...row };
    const out: Row = {};
    for (const part of splitTopLevel(this.cols)) {
      if (part === "*") {
        Object.assign(out, row);
        continue;
      }
      const embed = part.match(/^(\w+)\s*:\s*(\w+)\s*\(([^)]*)\)$/);
      if (embed) {
        const [, alias, fkCol, embedCols] = embed;
        const parentVal = row[fkCol];
        const related = (this.tables.get(alias) ?? []).find((r) => r.id === parentVal) ?? null;
        out[alias] = related ? pick(related, embedCols) : null;
        continue;
      }
      out[part] = row[part];
    }
    return out;
  }

  private applyOrderAndLimit(list: Row[]): Row[] {
    let result = list;
    if (this.orderCol) {
      const col = this.orderCol;
      result = [...result].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return av < bv ? -1 : 1;
      });
      if (!this.orderAsc) result.reverse();
    }
    if (this.limitN !== null) result = result.slice(0, this.limitN);
    return result;
  }

  private execute(): QueryResult {
    const store = this.rows();

    if (this.op === "insert" || this.op === "upsert") {
      const affected: Row[] = [];
      for (const incoming of this.payload) {
        let existing: Row | undefined;
        if (this.op === "upsert" && this.conflictCols.length > 0) {
          existing = store.find((r) => this.conflictCols.every((c) => r[c] === incoming[c]));
        }
        if (existing) {
          Object.assign(existing, incoming);
          affected.push(existing);
        } else {
          const row = withDefaults(incoming);
          store.push(row);
          affected.push(row);
        }
      }
      const data = this.returnShape(affected);
      return { data, error: null };
    }

    if (this.op === "update") {
      const matched = store.filter((r) => this.match(r));
      for (const r of matched) Object.assign(r, this.payload[0]);
      return { data: this.returnShape(matched), error: null };
    }

    if (this.op === "delete") {
      const matched = store.filter((r) => this.match(r));
      const kept = store.filter((r) => !this.match(r));
      this.tables.set(this.table, kept);
      return { data: this.returnShape(matched), error: null };
    }

    // select
    const filtered = this.applyOrderAndLimit(store.filter((r) => this.match(r))).map((r) => this.project(r));
    return { data: this.returnShape(filtered), error: null };
  }

  private returnShape(rows: Row[]): any {
    if (this.singleMode !== "none") {
      const projected = this.op === "select" ? rows : rows.map((r) => this.project(r));
      return projected[0] ?? null;
    }
    if (!this.wantReturn && this.op !== "select") return null;
    return this.op === "select" ? rows : rows.map((r) => this.project(r));
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    let result: QueryResult;
    try {
      result = this.execute();
    } catch (err) {
      result = { data: null, error: { message: (err as Error).message } };
    }
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function pick(row: Row, cols: string): Row {
  const out: Row = {};
  for (const c of cols.split(",").map((s) => s.trim())) {
    if (c) out[c] = row[c];
  }
  return out;
}

function withDefaults(row: Row): Row {
  const nowIso = new Date().toISOString();
  const out: Row = { ...row };
  if (out.id === undefined) out.id = randomUUID();
  if (out.created_at === undefined) out.created_at = nowIso;
  return out;
}

export function createMemoryDb(): MemoryDb {
  const tables = new Map<string, Row[]>();
  return {
    from(table: string) {
      return new QueryBuilder(tables, table);
    },
    seed(table: string, rows: Row[]) {
      const list = tables.get(table) ?? [];
      for (const r of rows) list.push(r);
      tables.set(table, list);
    },
  };
}
