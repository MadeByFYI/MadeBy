import { describe, it, expect } from "vitest";
import {
  DISCLOSURE_KINDS,
  recognizeDcoSignoffs,
  hasDcoSignoff,
  hasAiTrailer,
  hasHumanAttestation,
  recognizeSpdxIdentifiers,
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
