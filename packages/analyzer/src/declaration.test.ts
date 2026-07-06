import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MADEBY_ATTESTATION_V1_OPERATIVE, canonicalizeOperative } from "@madeby/core";
import { readDeclarationFromDir, summarizeDeclaration } from "./declaration";

describe("published template ↔ code (no drift)", () => {
  it("MADEBY-ATTESTATION-v1.md embeds the operative constant verbatim", () => {
    const path = fileURLToPath(new URL("../../core/templates/MADEBY-ATTESTATION-v1.md", import.meta.url));
    const md = readFileSync(path, "utf8");
    const block = /-----BEGIN MADEBY ATTESTATION v1-----\n([\s\S]*?)\n-----END MADEBY ATTESTATION v1-----/.exec(md);
    expect(block).not.toBeNull();
    expect(canonicalizeOperative(block![1]!)).toBe(canonicalizeOperative(MADEBY_ATTESTATION_V1_OPERATIVE));
  });
});

function declarationFile(signed = true): string {
  const sig = signed
    ? "Signed: Jane Q. Coder\nDate: 2026-07-06\nSubject: github.com/acme/widget @ abc123"
    : "Signed: <your full legal name>\nDate: <YYYY-MM-DD>";
  return `# Provenance\n\n-----BEGIN MADEBY ATTESTATION v1-----\n${MADEBY_ATTESTATION_V1_OPERATIVE}\n-----END MADEBY ATTESTATION v1-----\n${sig}\n`;
}

describe("self-hosted declaration reading + pointer (the sworn carrier)", () => {
  it("returns absent evidence when no declaration file exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-decl-"));
    try {
      const ev = await summarizeDeclaration(readDeclarationFromDir(dir));
      expect(ev.present).toBe(false);
      expect(ev.tier).toBe("asserted");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("points to a recognized, signed declaration but stays asserted while the template is draft", async () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-decl-"));
    try {
      writeFileSync(join(dir, "PROVENANCE"), declarationFile(true));
      const ev = await summarizeDeclaration(readDeclarationFromDir(dir));
      expect(ev.present).toBe(true);
      expect(ev.path).toBe("PROVENANCE");
      expect(ev.templateId).toBe("madeby-attestation-v1");
      expect(ev.signatory).toBe("Jane Q. Coder");
      expect(ev.subjectRef).toBe("github.com/acme/widget @ abc123");
      expect(ev.tier).toBe("asserted"); // counsel gate: v1 is draft
      expect(ev.note).toMatch(/pending counsel/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags a present-but-unrecognized (modified) declaration and caps at asserted", async () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-decl-"));
    try {
      const tampered = MADEBY_ATTESTATION_V1_OPERATIVE.replace("accurate and complete", "vaguely accurate");
      writeFileSync(
        join(dir, "PROVENANCE"),
        `-----BEGIN MADEBY ATTESTATION v1-----\n${tampered}\n-----END MADEBY ATTESTATION v1-----\nSigned: Someone\n`,
      );
      const ev = await summarizeDeclaration(readDeclarationFromDir(dir));
      expect(ev.present).toBe(true);
      expect(ev.templateId).toBeNull();
      expect(ev.tier).toBe("asserted");
      expect(ev.note).toMatch(/not a recognized/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("finds a declaration under .madeby/ too", async () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-decl-"));
    try {
      mkdirSync(join(dir, ".madeby"), { recursive: true });
      writeFileSync(join(dir, ".madeby", "attestation.md"), declarationFile(false));
      const ev = await summarizeDeclaration(readDeclarationFromDir(dir));
      expect(ev.present).toBe(true);
      expect(ev.path).toBe(".madeby/attestation.md");
      expect(ev.signatory).toBeNull(); // unfilled placeholder → not signed
      expect(ev.note).toMatch(/no legal signature/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
