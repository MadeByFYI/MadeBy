import { describe, it, expect } from "vitest";
import { classifyCommit, summarize, isBotIdentity } from "./index";
import type { CommitMeta } from "./index";

describe("bot / automation recognition (a disclosed machine committer, not inferred, not AI)", () => {
  it("classifies a [bot] committer as bot, not human", () => {
    expect(
      classifyCommit({ message: "bump", authorName: "dependabot[bot]", authorEmail: "49699333+dependabot[bot]@users.noreply.github.com" }).class,
    ).toBe("bot");
    expect(classifyCommit({ message: "regen sdk", authorName: "stainless-app[bot]" }).class).toBe("bot");
  });
  it("recognizes known automation identities + github-actions", () => {
    expect(isBotIdentity("renovate[bot]")).toBe(true);
    expect(isBotIdentity("GitHub Actions", "actions@github.com")).toBe(true);
    expect(isBotIdentity("snyk-bot")).toBe(true);
  });
  it("does NOT misfire on human names containing 'bot'", () => {
    expect(isBotIdentity("Botond Nagy", "botond@example.com")).toBe(false);
    expect(isBotIdentity("Robert Bott", "rbott@x.com")).toBe(false);
    expect(classifyCommit({ message: "fix", authorName: "Jane Dev", authorEmail: "jane@x.org" }).class).toBe("human");
  });

  it("classifies a [bot] identity that IS a named AI agent as ai, not generic bot", () => {
    // Real autonomous-agent commits whose GitHub noreply email embeds `[bot]` — the AI signal is
    // disclosed in the identity and must not be discarded to bot-precedence (GROUND-TRUTH.md).
    const devin = classifyCommit({
      message: "feat: scaffold backend",
      authorName: "Devin AI",
      authorEmail: "158243242+devin-ai-integration[bot]@users.noreply.github.com",
    });
    expect(devin.class).toBe("ai");
    expect(devin.aiContributors[0]?.provider).toBe("cognition");
    expect(
      classifyCommit({ message: "fix", authorName: "Copilot", authorEmail: "1+copilot-swe-agent[bot]@users.noreply.github.com" }).class,
    ).toBe("ai");
  });

  it("keeps NON-AI automation as bot (an AI-agent [bot] is the exception, not the rule)", () => {
    // dependabot / renovate / stainless match no AI pattern → still bot, unchanged.
    expect(classifyCommit({ message: "bump", authorName: "dependabot[bot]", authorEmail: "49699333+dependabot[bot]@users.noreply.github.com" }).class).toBe("bot");
    expect(classifyCommit({ message: "regen", authorName: "renovate[bot]" }).class).toBe("bot");
  });
});

const human: CommitMeta = { message: "Fix off-by-one in pager", authorName: "Mac", authorEmail: "mac@example.com" };
const withAi: CommitMeta = {
  message: "Refactor registration form\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
  authorName: "Mac",
  authorEmail: "mac@example.com",
};
const copilot: CommitMeta = {
  message: "Add tests\n\nCo-authored-by: GitHub Copilot <copilot@github.com>",
  authorName: "Dev",
  authorEmail: "dev@example.com",
};
const aiAuthored: CommitMeta = {
  message: "Automated dependency bump",
  authorName: "Claude",
  authorEmail: "noreply@anthropic.com",
};

describe("classifyCommit", () => {
  it("flags a Co-Authored-By AI trailer as with_ai + detects the provider", () => {
    const c = classifyCommit(withAi);
    expect(c.class).toBe("with_ai");
    expect(c.aiContributors[0]?.provider).toBe("anthropic");
    expect(c.signals).toContain("co-authored-by:anthropic");
  });

  it("recognizes other AI co-authors (Copilot)", () => {
    expect(classifyCommit(copilot).class).toBe("with_ai");
    expect(classifyCommit(copilot).aiContributors[0]?.provider).toBe("github-copilot");
  });

  it("classifies an AI-authored commit with no human as ai", () => {
    expect(classifyCommit(aiAuthored).class).toBe("ai");
  });

  it("classifies a plain commit as human", () => {
    expect(classifyCommit(human).class).toBe("human");
  });

  it("is honest: 'human' (absence of signal) is LESS confident than an explicit AI signal", () => {
    expect(classifyCommit(human).confidence).toBeLessThan(classifyCommit(withAi).confidence);
  });

  it("always surfaces a confidence in (0,1]", () => {
    for (const c of [human, withAi, copilot, aiAuthored]) {
      const { confidence } = classifyCommit(c);
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("evidence-grade signals (#78) — wider trailers + agent identities, no false positives", () => {
  it("recognizes Generated-by: and Assisted-by: trailers, not just Co-authored-by", () => {
    expect(classifyCommit({ message: "x\n\nGenerated-by: Cursor", authorName: "Mac", authorEmail: "m@x.com" }).class).toBe("with_ai");
    expect(classifyCommit({ message: "x\n\nAssisted-by: Claude", authorName: "Mac", authorEmail: "m@x.com" }).class).toBe("with_ai");
  });

  it("recognizes the Cursor agent identity (cursoragent / cursor.com)", () => {
    expect(classifyCommit({ message: "Regenerate types", authorName: "Cursor Agent", authorEmail: "agent@cursor.com" }).class).toBe("ai");
  });

  it("recognizes additional named AI coding tools", () => {
    for (const who of ["Generated-by: aider", "Co-authored-by: Codeium", "Co-authored-by: Windsurf", "Co-authored-by: CodeWhisperer", "Co-authored-by: TabNine"]) {
      expect(classifyCommit({ message: `x\n\n${who} <bot@tool.dev>`, authorName: "Mac", authorEmail: "m@x.com" }).class, who).toBe("with_ai");
    }
  });

  it("honors an explicit generic AI disclosure in a trailer (madeby me --with-ai, unnamed tool)", () => {
    // `Assisted-by: AI` is a disclosure, not an inference — count it as AI involvement (with_ai).
    for (const v of ["AI", "an AI", "AI assistant", "AI tool", "artificial intelligence"]) {
      const c = classifyCommit({ message: `feat: x\n\nAuthored-by-human: Mac <m@x.com>\nAssisted-by: ${v}`, authorName: "Mac", authorEmail: "m@x.com" });
      expect(c.class, v).toBe("with_ai");
      expect(c.aiContributors[0]?.provider, v).toBe("unspecified");
    }
  });

  it("does NOT sweep in a human whose NAME merely starts with 'AI' (exact-match guard)", () => {
    // a human co-author literally named "AI Team", and the artist "Ai Weiwei" as author — both human.
    expect(classifyCommit({ message: "x\n\nCo-authored-by: AI Team <team@co.com>", authorName: "Mac", authorEmail: "m@x.com" }).class).toBe("human");
    expect(classifyCommit({ message: "install sunflower seeds", authorName: "Ai Weiwei", authorEmail: "ai@example.cn" }).class).toBe("human");
  });

  it("does NOT false-positive on human names/words that merely contain a tool substring", () => {
    // 'precursor' must not match cursor; 'Aiden' must not match aider; 'codex' is openai (expected).
    expect(classifyCommit({ message: "precursor cleanup", authorName: "Aiden Cody", authorEmail: "aiden@x.com" }).class).toBe("human");
    // a Generated-by naming a non-AI tool is still human (no AI match)
    expect(classifyCommit({ message: "x\n\nGenerated-by: protoc", authorName: "Mac", authorEmail: "m@x.com" }).class).toBe("human");
  });
});

describe("summarize", () => {
  it("is a labeled estimate with class counts and mean confidence", () => {
    const s = summarize([human, withAi, copilot, aiAuthored].map(classifyCommit));
    expect(s.isEstimate).toBe(true);
    expect(s.methodology.length).toBeGreaterThan(0);
    expect(s.total).toBe(4);
    expect(s.byClass.with_ai).toBe(2);
    expect(s.byClass.human).toBe(1);
    expect(s.byClass.ai).toBe(1);
    expect(s.meanConfidence).toBeGreaterThan(0);
  });

  it("empty input yields zero mean confidence, not NaN", () => {
    expect(summarize([]).meanConfidence).toBe(0);
  });
});
