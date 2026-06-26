import { defineConfig } from "drizzle-kit";

// Migrations are generated here and applied during provisioning (#7 handoff).
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
