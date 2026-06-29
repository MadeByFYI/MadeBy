import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Never discover tests from build output or a leftover Stryker sandbox.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.stryker-tmp/**"],
  },
});
