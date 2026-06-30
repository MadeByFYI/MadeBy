import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Never discover tests from build output (a local `build` emits dist/*.test.js).
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
