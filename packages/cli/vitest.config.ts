import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Never discover tests from build output (esbuild emits dist/madeby.mjs; a stray dist/*.test.js
    // must never be collected). The integration test spawns that built bin — built by `pretest`.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
