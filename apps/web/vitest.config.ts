import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit-test the pure lib modules; never discover build output.
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
  },
});
