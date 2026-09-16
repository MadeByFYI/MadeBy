import { describe, it, expect } from "vitest";
import {
  DISCLOSURE_KINDS,
  recognizeDcoSignoffs,
  hasDcoSignoff,
  hasAiTrailer,
  hasHumanAttestation,
  hasAiAuthorship,
  recognizeSpdxIdentifiers,
  recognizeSpdxAiDisclosures,
  hasSpdxAiDisclosure,
  spdxAiDisclosureCategory,
  aiDisclosureDefault,
  disclosureKindsPresent,
  commitDisclosureKinds,
} from "./disclosure";

describe("disclosure vocabulary", () => {
  it("marks MadeBy-native vs external signals and parser status", () => {
    expect(DISCLOSURE_KINDS["dco-signoff"].nativeness).toBe("external");
    expect(DISCLOSURE_KINDS["madeby-declaration"].nativeness).toBe("madeby");
    // vocabulary is complete even where a parser hasn't landed (honest harness)
    expect(DISCLOSURE_KINDS["in-toto"].parser).toBe("planned");
    expect(DISCLOSURE_KINDS["dco-signoff"].parser).toBe("recognized");
  });
});

describe("recognizeDcoSignoffs — existing external disclosure", () => {
  it("recognizes one signal per Signed-off-by line", () => {
    const msg = "fix: thing\n\nSigned-off-by: Jane Dev <jane@x.org>\nSigned-off-by: Sam Rev <sam@y.org>";
    const s = recognizeDcoSignoffs(msg);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ kind: "dco-signoff", tier: "asserted", subjectRef: "Jane Dev <jane@x.org>" });
  });

  it("hasDcoSignoff is a stable boolean (regex state does not leak between calls)", () => {
    const signed = "x\n\nSigned-off-by: A <a@b.c>";
    expect(hasDcoSignoff(signed)).toBe(true);
    expect(hasDcoSignoff(signed)).toBe(true); // global-regex lastIndex reset — not flaky
    expect(hasDcoSignoff("no sign-off here")).toBe(false);
  });
});

describe("recognizeSpdxIdentifiers", () => {
  it("recognizes SPDX license ids and copyright text", () => {
    const s = recognizeSpdxIdentifiers("// SPDX-License-Identifier: MIT\n// SPDX-FileCopyrightText: 2026 Acme");
    expect(s.some((x) => x.kind === "spdx-license" && x.subjectRef === "MIT")).toBe(true);
    expect(s.some((x) => x.evidence.includes("FileCopyrightText"))).toBe(true);
  });

  it("finds nothing in plain source", () => {
    expect(recognizeSpdxIdentifiers("const x = 1;")).toEqual([]);
  });
});

describe("recognizeSpdxAiDisclosures — the ggfevans/ai-disclosure convention (ACO §5)", () => {
  it("recognizes each of the four values across language-specific header comment styles", () => {
    expect(recognizeSpdxAiDisclosures("// SPDX-AI-Disclosure: ai-generated\n// SPDX-AI-Model: claude-opus-4-6")).toMatchObject([
      { kind: "spdx-ai-disclosure", tier: "asserted", subjectRef: "ai-generated" },
    ]);
    expect(recognizeSpdxAiDisclosures("# SPDX-AI-Disclosure: ai-assisted")[0]).toMatchObject({ subjectRef: "ai-assisted" });
    expect(recognizeSpdxAiDisclosures(" * SPDX-AI-Disclosure: none")[0]).toMatchObject({ subjectRef: "none" });
    expect(recognizeSpdxAiDisclosures("SPDX-AI-Disclosure: autonomous")[0]).toMatchObject({ subjectRef: "autonomous" });
  });

  it("ignores unknown values, unrelated text, and the SPDX *license* tag", () => {
    expect(recognizeSpdxAiDisclosures("SPDX-AI-Disclosure: maybe")).toEqual([]);
    expect(recognizeSpdxAiDisclosures("const x = 1;")).toEqual([]);
    expect(recognizeSpdxAiDisclosures("SPDX-License-Identifier: MIT")).toEqual([]);
  });

  it("hasSpdxAiDisclosure is a stable boolean (global-regex lastIndex reset — not flaky)", () => {
    const h = "// SPDX-AI-Disclosure: ai-assisted";
    expect(hasSpdxAiDisclosure(h)).toBe(true);
    expect(hasSpdxAiDisclosure(h)).toBe(true);
    expect(hasSpdxAiDisclosure("no tag here")).toBe(false);
  });

  it("maps values onto the three-way taxonomy", () => {
    expect(spdxAiDisclosureCategory("none")).toBe("human");
    expect(spdxAiDisclosureCategory("ai-assisted")).toBe("with_ai");
    expect(spdxAiDisclosureCategory("ai-generated")).toBe("ai");
    expect(spdxAiDisclosureCategory("autonomous")).toBe("ai");
    expect(spdxAiDisclosureCategory("bogus")).toBe("unknown");
  });

  it("reads the repo-level disclosure-default from AI_DISCLOSURE.md frontmatter", () => {
    const md = "---\ndisclosure-default: ai-assisted\nmodels-used:\n  - claude-opus-4-6\n---\n";
    expect(aiDisclosureDefault(md)).toBe("ai-assisted");
    expect(aiDisclosureDefault("no frontmatter here")).toBeNull();
  });

  it("registers the kind as recognized (external, asserted ceiling)", () => {
    expect(DISCLOSURE_KINDS["spdx-ai-disclosure"]).toMatchObject({ parser: "recognized", ceiling: "asserted", nativeness: "external" });
  });
});

describe("hasAiAuthorship — the Authored-by-ai trailer (honest log-free `ai` disclosure)", () => {
  it("recognizes Authored-by-ai and counts it as an ai-trailer disclosure", () => {
    expect(hasAiAuthorship("feat\n\nAuthored-by-ai: Claude Code")).toBe(true);
    expect(hasAiAuthorship("feat\n\nAuthored-by-ai: SomeAgent")).toBe(true); // key is the disclosure, not the tool name
    expect(hasAiAuthorship("feat\n\nAuthored-by-human: Mac")).toBe(false);
    expect(hasAiAuthorship("plain commit")).toBe(false);
    expect(commitDisclosureKinds({ message: "feat\n\nAuthored-by-ai: Claude Code", signed: false })).toEqual(["ai-trailer"]);
  });
});

describe("hasAiTrailer + commitDisclosureKinds", () => {
  it("recognizes an AI-authorship trailer that names a known tool", () => {
    expect(hasAiTrailer("feat\n\nCo-Authored-By: Claude <noreply@anthropic.com>")).toBe(true);
    expect(hasAiTrailer("feat\n\nCo-Authored-By: Jane Human <jane@x.org>")).toBe(false); // a human co-author is not AI disclosure
  });

  it("maps a commit's message + signature to its disclosure kinds", () => {
    expect(commitDisclosureKinds({ message: "x\n\nSigned-off-by: A <a@b.c>", signed: true }).sort()).toEqual([
      "commit-signature",
      "dco-signoff",
    ]);
    expect(commitDisclosureKinds({ message: "x\n\nGenerated-by: Cursor", signed: false })).toEqual(["ai-trailer"]);
    expect(commitDisclosureKinds({ message: "plain commit", signed: false })).toEqual([]); // undisclosed
  });

  it("recognizes the affirmative human-authorship trailer (symmetric with the AI trailer)", () => {
    expect(hasHumanAttestation("feat\n\nAuthored-by-human: Jane Dev <jane@x.org>")).toBe(true);
    expect(hasHumanAttestation("feat\n\nHuman-authored-by: Jane Dev <jane@x.org>")).toBe(true);
    expect(hasHumanAttestation("feat\n\nCo-Authored-By: Claude <noreply@anthropic.com>")).toBe(false);
    // it's a disclosure kind; signing climbs the same ladder (the signature is a separate kind)
    expect(commitDisclosureKinds({ message: "feat\n\nAuthored-by-human: Jane <j@x>", signed: false })).toEqual(["human-attestation"]);
    expect(commitDisclosureKinds({ message: "feat\n\nAuthored-by-human: Jane <j@x>", signed: true }).sort()).toEqual([
      "commit-signature",
      "human-attestation",
    ]);
  });
});

describe("disclosureKindsPresent", () => {
  it("dedupes to the distinct kinds", () => {
    const kinds = disclosureKindsPresent([
      { kind: "dco-signoff", evidence: "a", tier: "asserted" },
      { kind: "dco-signoff", evidence: "b", tier: "asserted" },
      { kind: "spdx-license", evidence: "c", tier: "asserted" },
    ]);
    expect(kinds.sort()).toEqual(["dco-signoff", "spdx-license"]);
  });
});
