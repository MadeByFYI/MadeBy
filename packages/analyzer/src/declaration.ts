// Detect a self-hosted MadeBy attestation in a repo and produce a POINTER — we never host the
// declaration (ARCHITECTURE.md §3, the sworn carrier). The declaration lives in the user's repo;
// we read it (from a local checkout or a git tree), recognize the template, and record where it is
// and what tier it currently supports. Fail-safe throughout: absent/modified/draft/unsigned all
// resolve to the asserted tier via @madeby/core's declarationTier (the counsel gate is a code fact
// there, not here). This is the sworn analog of provenance.ts's witnessed-span reading.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectDeclaration, declarationTier, type TrustTier } from "@madeby/core";

/** Repo paths we look for a self-hosted declaration at, in order. */
const CANDIDATE_PATHS = [
  "PROVENANCE",
  "PROVENANCE.md",
  ".madeby/attestation",
  ".madeby/attestation.md",
] as const;

export interface DeclarationEvidence {
  /** whether an attestation block was found at all */
  readonly present: boolean;
  /** the repo path the declaration was found at (the pointer target), if any */
  readonly path: string | null;
  /** the recognized template id, or null if present-but-unrecognized (modified/unknown) */
  readonly templateId: string | null;
  /** the legal signatory name, if the declaration was signed */
  readonly signatory: string | null;
  /** the manifest/repo reference the declaration points at */
  readonly subjectRef: string | null;
  /** the effective tier this declaration currently supports (fail-safe; 'asserted' while draft) */
  readonly tier: TrustTier;
  /** a human-readable reason for the tier — surfaced honestly in the mirror */
  readonly note: string;
}

const ABSENT: DeclarationEvidence = {
  present: false,
  path: null,
  templateId: null,
  signatory: null,
  subjectRef: null,
  tier: "asserted",
  note: "no self-hosted MadeBy attestation found",
};

/** Read the first candidate declaration file from a local checkout, or null. */
export function readDeclarationFromDir(repoDir: string): { path: string; text: string } | null {
  for (const p of CANDIDATE_PATHS) {
    try {
      return { path: p, text: readFileSync(join(repoDir, p), "utf8") };
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** Read the first candidate declaration file committed at HEAD of a (possibly bare) git repo. */
export function readDeclarationFromGit(repoDir: string): { path: string; text: string } | null {
  for (const p of CANDIDATE_PATHS) {
    try {
      const text = execFileSync("git", ["-C", repoDir, "cat-file", "-p", `HEAD:${p}`], {
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"], // absent path → git prints "fatal: path…" to stderr; we catch + try next
      });
      return { path: p, text };
    } catch {
      /* not present at this path */
    }
  }
  return null;
}

/** Turn a located declaration file into pointer evidence. Never throws. */
export async function summarizeDeclaration(found: { path: string; text: string } | null): Promise<DeclarationEvidence> {
  if (!found) return ABSENT;
  const detection = await detectDeclaration(found.text);
  if (!detection) return ABSENT;

  const tier = declarationTier(detection);
  let note: string;
  if (!detection.templateId) {
    note = "declaration present but not a recognized MadeBy template — capped at asserted";
  } else if (tier === "asserted") {
    // recognized template: either still draft (counsel gate) or unsigned
    note = detection.signatureName
      ? "recognized declaration, signed — template pending counsel finalization (asserted)"
      : "recognized declaration but no legal signature — capped at asserted";
  } else {
    note = "recognized, finalized template, legally signed — sworn";
  }

  return {
    present: true,
    path: found.path,
    templateId: detection.templateId,
    signatory: detection.signatureName,
    subjectRef: detection.subjectRef,
    tier,
    note,
  };
}
