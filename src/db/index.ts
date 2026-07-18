import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  // Supabase's Vercel integration injects POSTGRES_URL automatically;
  // DATABASE_URL remains as a manual fallback (local dev, other hosts).
  const databaseUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "No database URL found. Connect the Supabase integration in Vercel (injects POSTGRES_URL) or set DATABASE_URL in .env.local."
    );
  }
  // prepare: false — required for Supabase's transaction-mode pooler (Supavisor).
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) {
      _db = createDb();
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
