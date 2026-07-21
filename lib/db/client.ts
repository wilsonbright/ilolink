import { env } from "@/lib/cf";

// Thin sugar over env().DB so call sites stay short. Every query still parametrizes
// via .bind(...) — never string-concatenate values into SQL.

// The bound D1 database handle.
export function db(): D1Database {
  return env().DB;
}

// First row (or null) for a query.
export function queryFirst<T>(
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  return env()
    .DB.prepare(sql)
    .bind(...params)
    .first<T>();
}

// All rows for a query.
export async function queryAll<T>(
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const res = await env()
    .DB.prepare(sql)
    .bind(...params)
    .all<T>();
  return res.results;
}

// Run a write statement.
export function execute(
  sql: string,
  ...params: unknown[]
): Promise<D1Result> {
  return env()
    .DB.prepare(sql)
    .bind(...params)
    .run();
}
