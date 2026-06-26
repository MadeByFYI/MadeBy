// Conformance runner over the frozen vector set (TESTING.md §4). The vectors
// (vectors/conformance-v0.json) are the **publishable artifact**: inputs → expected outputs
// that anyone can run our implementation — or their own — against, so correctness is checkable
// without open-sourcing the implementation. The CI trust-gate runs runConformance() via `pnpm test`.

import vectorsJson from "./vectors/conformance-v0.json";
import { jcs, canonicalize, type Json } from "./canonicalize";
import { sha256Fingerprint, gitBlobFingerprint } from "./fingerprint";
import { resolveTier, type ResolutionContext } from "./resolve";
import type { Claim, Carrier } from "./model";

export const CONFORMANCE_VERSION: string = (vectorsJson as { version: string }).version;

interface JcsVector { name: string; input: Json; expected?: string; expectError?: boolean }
interface CanonVector { name: string; claim: Claim; expected: string }
interface FpVector { name: string; algorithm: string; content: string; expected: string }
interface TierVector {
  name: string;
  claim: Claim;
  env: { knownCarriers: string[]; verifySignature: boolean; signerVerified: boolean };
  expected: string;
}
interface Vectors {
  version: string;
  jcs: JcsVector[];
  canonicalize: CanonVector[];
  fingerprint: FpVector[];
  tierResolution: TierVector[];
}

const V = vectorsJson as unknown as Vectors;

export interface ConformanceResult {
  category: string;
  name: string;
  pass: boolean;
  detail?: string;
}

function ctxFromEnv(env: TierVector["env"]): ResolutionContext {
  const knownCarriers = new Map<string, Carrier>(
    env.knownCarriers.map((id) => [id, { id, verificationCapable: true }]),
  );
  return {
    knownCarriers,
    verifySignature: () => env.verifySignature,
    isSignerVerified: () => env.signerVerified,
  };
}

const dec = (u: Uint8Array) => new TextDecoder().decode(u);
const enc = (s: string) => new TextEncoder().encode(s);

/** Run every vector against this implementation; returns one result per vector. */
export async function runConformance(): Promise<ConformanceResult[]> {
  const results: ConformanceResult[] = [];

  for (const v of V.jcs) {
    if (v.expectError) {
      let threw = false;
      try {
        jcs(v.input);
      } catch {
        threw = true;
      }
      results.push({ category: "jcs", name: v.name, pass: threw, detail: threw ? undefined : "expected an error" });
    } else {
      const got = jcs(v.input);
      results.push({ category: "jcs", name: v.name, pass: got === v.expected, detail: got === v.expected ? undefined : got });
    }
  }

  for (const v of V.canonicalize) {
    const got = dec(canonicalize(v.claim));
    results.push({ category: "canonicalize", name: v.name, pass: got === v.expected, detail: got === v.expected ? undefined : got });
  }

  for (const v of V.fingerprint) {
    const fp = v.algorithm === "git-blob-sha1" ? await gitBlobFingerprint(enc(v.content)) : await sha256Fingerprint(enc(v.content));
    results.push({ category: "fingerprint", name: v.name, pass: fp.value === v.expected, detail: fp.value === v.expected ? undefined : fp.value });
  }

  for (const v of V.tierResolution) {
    const got = resolveTier(v.claim, ctxFromEnv(v.env));
    results.push({ category: "tierResolution", name: v.name, pass: got === v.expected, detail: got === v.expected ? undefined : got });
  }

  return results;
}
