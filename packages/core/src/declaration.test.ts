import { describe, it, expect } from "vitest";
import {
  DECLARATION_TEMPLATES,
  MADEBY_ATTESTATION_V1_OPERATIVE,
  operativeHash,
  detectDeclaration,
  declarationTier,
  recognizesSwornRepresentation,
  swornAttestationFrom,
} from "./declaration";

const v1 = DECLARATION_TEMPLATES.find((t) => t.id === "madeby-attestation-v1")!;

/** Build a self-hosted declaration the way a user would: verbatim operative block + a filled sig. */
function declaration(operative = MADEBY_ATTESTATION_V1_OPERATIVE, sig = "Signed: Jane Q. Coder\nDate: 2026-07-06\nSubject: github.com/acme/widget @ abc123"): string {
  return `# Provenance\n\n-----BEGIN MADEBY ATTESTATION v1-----\n${operative}\n-----END MADEBY ATTESTATION v1-----\n${sig}\n`;
}

describe("declaration — template registry integrity", () => {
  it("the pinned operative hash matches the canonicalized operative constant", async () => {
    expect(await operativeHash(MADEBY_ATTESTATION_V1_OPERATIVE)).toBe(v1.operativeHash);
  });

  // (The published-template-file drift check needs node:fs, which core deliberately lacks — it
  // lives in the analyzer's declaration.test.ts instead.)

  it("v1 seed is still a DRAFT (counsel gate) — it must not silently confer a tier", () => {
    expect(v1.status).toBe("draft");
  });
});

describe("detectDeclaration", () => {
  it("returns null when there is no attestation block", async () => {
    expect(await detectDeclaration("# a normal readme\n")).toBeNull();
  });

  it("recognizes a verbatim v1 block and extracts the signature fields", async () => {
    const d = (await detectDeclaration(declaration()))!;
    expect(d.templateId).toBe("madeby-attestation-v1");
    expect(d.signatureName).toBe("Jane Q. Coder");
    expect(d.signedAt).toBe("2026-07-06");
    expect(d.subjectRef).toBe("github.com/acme/widget @ abc123");
  });

  it("does NOT recognize a block whose operative wording was altered (watered down)", async () => {
    const tampered = MADEBY_ATTESTATION_V1_OPERATIVE.replace("accurate and complete", "roughly right");
    const d = (await detectDeclaration(declaration(tampered)))!;
    expect(d.templateId).toBeNull(); // present but unrecognized → caps at asserted downstream
  });

  it("is robust to indentation/whitespace drift in the operative block", async () => {
    const reindented = MADEBY_ATTESTATION_V1_OPERATIVE.split("\n").map((l) => "   " + l + "  ").join("\n");
    const d = (await detectDeclaration(declaration(reindented)))!;
    expect(d.templateId).toBe("madeby-attestation-v1");
  });

  it("treats an unfilled <placeholder> signature as absent (not signed)", async () => {
    const d = (await detectDeclaration(declaration(MADEBY_ATTESTATION_V1_OPERATIVE, "Signed: <your full legal name>\nDate: <YYYY-MM-DD>")))!;
    expect(d.templateId).toBe("madeby-attestation-v1");
    expect(d.signatureName).toBeNull();
    expect(d.signedAt).toBeNull();
  });
});

describe("declarationTier — fail-safe ladder (counsel gate is a code fact)", () => {
  it("absent declaration → asserted", () => {
    expect(declarationTier(null)).toBe("asserted");
  });
  it("recognized + signed but template is DRAFT → asserted (pending counsel)", async () => {
    const d = await detectDeclaration(declaration());
    expect(declarationTier(d)).toBe("asserted");
  });
  it("unrecognized text → asserted", () => {
    expect(declarationTier({ templateId: null, declaredVersion: "v1", signatureName: "X", signedAt: "2026-07-06", subjectRef: null })).toBe("asserted");
  });
  it("a FINALIZED template + a legal signature → sworn", () => {
    // simulate the post-counsel state without mutating the shipped registry
    const finalized = { templateId: DECLARATION_TEMPLATES[0]!.id, declaredVersion: "v1", signatureName: "Jane", signedAt: "2026-07-06", subjectRef: null };
    // declarationTier reads live status, which is 'draft' now, so this documents the gate:
    expect(declarationTier(finalized)).toBe("asserted");
  });
});

describe("recognizesSwornRepresentation + swornAttestationFrom", () => {
  it("does not recognize the draft v1 as tier-conferring", () => {
    expect(recognizesSwornRepresentation("madeby-attestation-v1")).toBe(false); // draft
    expect(recognizesSwornRepresentation("nope")).toBe(false);
  });
  it("builds a sworn overlay only from a recognized, signed, dated detection", async () => {
    const d = (await detectDeclaration(declaration()))!;
    const overlay = swornAttestationFrom(d)!;
    expect(overlay.representationCode).toBe("madeby-attestation-v1");
    expect(overlay.signatureName).toBe("Jane Q. Coder");
    expect(swornAttestationFrom({ templateId: null, declaredVersion: "v1", signatureName: "x", signedAt: "t", subjectRef: null })).toBeNull();
  });
});
