import { describe, it, expect } from "vitest";
import { redactSample } from "./redact-sample";

// The contract that makes this safe to share: NO code, prompt, path, or secret survives; the log's
// STRUCTURE (keys, markers, fence shape) and model identifiers do. Allow-list by construction, so the
// safe failure mode is over-redaction, never a leak.
describe("redactSample — content-free format skeletons", () => {
  it("JSONL (Claude Code): keeps keys/type/model, redacts content, path, and secrets", () => {
    const secret = "sk-SUPERSECRET-9f8e7d";
    const code = `const apiKey = '${secret}';`;
    const log = JSON.stringify({
      type: "assistant",
      message: {
        model: "claude-opus-4-8",
        content: [{ type: "tool_use", name: "Write", input: { file_path: "/Users/me/proj/src/secret.ts", content: code } }],
      },
    });
    const out = redactSample(log);
    // nothing sensitive survives
    expect(out).not.toContain(secret);
    expect(out).not.toContain(code);
    expect(out).not.toContain("/Users/me/proj");
    // the shape a parser author needs does survive
    expect(out).toContain('"type":"assistant"');
    expect(out).toContain('"model":"claude-opus-4-8"');
    expect(out).toContain('"name":"Write"');
    expect(out).toContain("<path>.ts");
    expect(out).toContain("<redacted>");
  });

  it("markdown (aider): keeps fence + SEARCH/REPLACE shape + model, redacts code, prompt, and path", () => {
    const secret = "TOKEN=deadbeefcafe";
    const log = [
      "# aider chat started at 2026-08-13",
      "> Model: gpt-4o with diff edit format",
      "#### wire up the secret token please",
      "src/config.ts",
      "```ts",
      "<<<<<<< SEARCH",
      "=======",
      `export const cfg = { ${secret} };`,
      ">>>>>>> REPLACE",
      "```",
    ].join("\n");
    const out = redactSample(log);
    expect(out).not.toContain(secret);
    expect(out).not.toContain("wire up the secret token"); // the user's prompt is gone
    expect(out).not.toContain("src/config.ts"); // the real path is gone
    // the edit SHAPE survives
    expect(out).toContain("> Model: gpt-4o with diff edit format");
    expect(out).toContain("<<<<<<< SEARCH");
    expect(out).toContain(">>>>>>> REPLACE");
    expect(out).toContain("<path>.ts"); // filename-line shape kept
    expect(out).toMatch(/```/); // fence shape kept
    expect(out).toContain("#"); // heading marker kept, its text redacted
  });

  it("SpecStory: redacts absolute paths in <summary> lines but keeps the tag AND a model id's slash", () => {
    // Regression: SpecStory summaries embed absolute paths; a `provider/model` id also has a slash and
    // must survive. (Found against a real langwatch/better-agents log.)
    const log = [
      "> Model: anthropic/claude-4.5-sonnet with diff edit format",
      "<details><summary>Tool use: **code_edit** • Edit file: /Users/rchaves/Projects/app/src/index.ts</summary>",
      "```diff",
      "+ const secret = 'nope';",
      "```",
      "</details>",
    ].join("\n");
    const out = redactSample(log);
    expect(out).not.toContain("/Users/rchaves"); // absolute path gone
    expect(out).not.toContain("const secret"); // diff body gone
    expect(out).toContain("</summary>"); // HTML structure intact
    expect(out).toContain("Edit file: <path>.ts"); // edit-target shape kept
    expect(out).toContain("anthropic/claude-4.5-sonnet"); // model id's slash preserved
  });

  it("over-redacts an unknown text format safely (nothing escapes the allow-list)", () => {
    const out = redactSample("PROPRIETARY-LOG v9\nuser typed a secret: hunter2\nagent ran: rm -rf /tmp/x");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("rm -rf");
    expect(out).toContain("<redacted>");
  });
});
