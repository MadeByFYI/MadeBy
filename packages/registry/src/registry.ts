// The registry lookup behind the asker-pull resolver. The Registry INTERFACE is the seam:
// v0 ships an in-memory store; the Drizzle/Neon-backed store (apps/web) implements the same
// interface once provisioned (#7). The resolution policy itself lives in @madeby/core.

import {
  resolve,
  carriersForResolution,
  recognizesSwornRepresentation,
  type Resolution,
  type ResolutionContext,
  type Subject,
  type Claim,
} from "@madeby/core";

export interface Registry {
  findSubjectByFingerprint(algorithm: string, value: string): Subject | undefined;
  claimsForSubject(subjectId: string): Claim[];
}

const key = (algorithm: string, value: string) => `${algorithm}:${value}`;

export class InMemoryRegistry implements Registry {
  private subjects = new Map<string, Subject>();
  private byFingerprint = new Map<string, string>();
  private claims = new Map<string, Claim[]>();

  add(subject: Subject, claims: Claim[]): void {
    this.subjects.set(subject.id, subject);
    this.claims.set(subject.id, claims);
    for (const fp of subject.fingerprints) this.byFingerprint.set(key(fp.algorithm, fp.value), subject.id);
  }

  findSubjectByFingerprint(algorithm: string, value: string): Subject | undefined {
    const id = this.byFingerprint.get(key(algorithm, value));
    return id ? this.subjects.get(id) : undefined;
  }

  claimsForSubject(subjectId: string): Claim[] {
    return this.claims.get(subjectId) ?? [];
  }
}

/**
 * v0 resolution context: signatures cannot be cryptographically verified until the verification
 * path (#18), so verify/signer both return false ⇒ everything caps at the asserted tier. Honest
 * and fail-safe — the resolver never over-claims a tier it can't yet check. The sworn recognizer is
 * the real one (declaration.ts): the seed template is 'draft', so sworn also caps at asserted until
 * counsel finalizes it — the counsel gate holds through the resolver too.
 */
export function resolutionContext(): ResolutionContext {
  return {
    knownCarriers: carriersForResolution(),
    verifySignature: () => false,
    isSignerVerified: () => false,
    recognizesSwornRepresentation,
  };
}

/** Look up a subject by one of its content fingerprints and resolve its claims. */
export function resolveByFingerprint(
  registry: Registry,
  algorithm: string,
  value: string,
  ctx: ResolutionContext = resolutionContext(),
): Resolution | null {
  const subject = registry.findSubjectByFingerprint(algorithm, value);
  if (!subject) return null;
  const fp =
    subject.fingerprints.find((f) => f.algorithm === algorithm && f.value === value) ??
    subject.fingerprints[0]!;
  return resolve(fp, registry.claimsForSubject(subject.id), ctx);
}

/**
 * A placeholder registry with one example subject, so the resolver UI is demonstrable before
 * ingestion (#10) populates the real registry. NOT real provenance — a fixture.
 */
export function demoRegistry(): InMemoryRegistry {
  const reg = new InMemoryRegistry();
  const fp = { algorithm: "git-blob-sha1", target: "FILE", value: "ce013625030ba8dba906f756967f9e9ca394464a" };
  reg.add(
    { id: "example", fingerprints: [fp] },
    [
      {
        id: "example-claim",
        subject: fp,
        attribution: { identityId: "MacDougherty", role: "creator", aiProvider: "anthropic", aiModel: "claude", operatorId: "MacDougherty" },
        assertedTier: "asserted",
        createdAt: "2026-06-26T00:00:00Z",
      },
    ],
  );
  return reg;
}
