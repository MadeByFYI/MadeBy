// Database access. Provider: Neon Postgres + pgvector (OPERATIONS.md §4/§5).
// The Drizzle client + schema are wired in #8 (Core data model); this is the connection stub.

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env (see #7).");
  }
  return url;
}

// TODO(#8): export const db = drizzle(neon(getDatabaseUrl()), { schema });
