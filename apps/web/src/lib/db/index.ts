// Database client — Postgres via Drizzle.
// Lazily constructed so the app builds/typechecks without a database (migrations + a live
// connection are part of the #7 provisioning handoff).

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export { schema };

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env (see #7).");
  }
  return url;
}

function createDb() {
  return drizzle(neon(getDatabaseUrl()), { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

/** The Drizzle client. Constructed on first use, not at import time. */
export function getDb() {
  return (_db ??= createDb());
}
