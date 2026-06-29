// Reproducible red-team harness (TESTING.md §3/§7). Runnable adversarial attacks against the
// deterministic trust core. Each attack ATTEMPTS to break a guarantee and reports whether the
// system resisted. runRedTeam() is exported so anyone can re-run the audit — it's "re-run our
// audit," not "trust our audit." redteam.test.ts asserts every coded attack is resisted; the
// human-readable report (incl. vectors deferred to unbuilt components) is RED-TEAM.md.

import { resolveTier, type ResolutionContext } from "./resolve";
import { canonicalize } from "./canonicalize";
import { assertSubjectIsReference } from "./guards";
import { carriersForResolution, parseEnvelope, CARRIER_REGISTRY } from "./carriers";
import type { Claim, Signature } from "./model";
import type { Fingerprint } from "./fingerprint";

export interface AttackResult {
  name: string;
  category: string;
  /** true = the system resisted the attack (the safe outcome) */
  resisted: boolean;
  detail: string;
}

const exactFp: Fingerprint = { algorithm: "sha256", target: "FILE", value: "deadbeef" };
const fuzzyFp: Fingerprint = { algorithm: "structural-v1", target: "FILE", value: "deadbeef" };
const dec = (u: Uint8Array) => new TextDecoder().decode(u);

function sig(carrierId = "in-toto"): Signature {
  return { signerKeyId: "k", value: "v", carrierId, signedAt: "2026-01-01T00:00:00Z" };
}
function claim(over: Partial<Claim> = {}): Claim {
  return {
    id: "c",
    subject: exactFp,
    attribution: { identityId: "a", role: "creator" },
    assertedTier: "asserted",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}
// Strongest attacker assumptions: signatures "verify" and signer is "verified" unless the
// attack is specifically about those — so a pass means the OTHER defenses held.
function ctx(over: Partial<ResolutionContext> = {}): ResolutionContext {
  return {
    knownCarriers: carriersForResolution(),
    verifySignature: () => true,
    isSignerVerified: () => true,
    ...over,
  };
}

/** Run every coded attack against this implementation. */
export function runRedTeam(): AttackResult[] {
  const out: AttackResult[] = [];
  const safe = (name: string, category: string, resisted: boolean, detail: string) =>
    out.push({ name, category, resisted, detail });

  // 1. Forge a high tier by naming an unrecognized carrier.
  {
    const t = resolveTier(claim({ assertedTier: "bound", signature: sig("totally-made-up-carrier") }), ctx());
    safe("carrier-confusion", "tier-escalation", t === "asserted", `unknown carrier → ${t} (want asserted)`);
  }
  // 2. Forge a signature (sig present, but it doesn't verify).
  {
    const t = resolveTier(claim({ assertedTier: "bound", signature: sig() }), ctx({ verifySignature: () => false }));
    safe("forged-signature", "tier-escalation", t === "asserted", `invalid signature → ${t} (want asserted)`);
  }
  // 3. Sign with an anonymous (unverified) key.
  {
    const t = resolveTier(claim({ assertedTier: "verified", signature: sig() }), ctx({ isSignerVerified: () => false }));
    safe("anonymous-signer", "tier-escalation", t === "asserted", `unverified signer → ${t} (want asserted)`);
  }
  // 4. Claim a high tier with no evidence at all (the "forged badge" defense: claims grant nothing).
  {
    const t = resolveTier(claim({ assertedTier: "bound" }), ctx());
    safe("unsigned-escalation", "tier-escalation", t === "asserted", `no signature, asserts bound → ${t} (want asserted)`);
  }
  // 5. Claim byte-binding ('bound') over a fuzzy fingerprint (no exact byte binding possible).
  {
    const t = resolveTier(claim({ assertedTier: "bound", subject: fuzzyFp, signature: sig() }), ctx());
    safe("fuzzy-bound", "tier-escalation", t === "verified", `bound over fuzzy fp → ${t} (want verified, not bound)`);
  }
  // 6. Inject a MadeBy-internal envelope hash as the subject (break the two-hash invariant).
  {
    let threw = false;
    try {
      assertSubjectIsReference({ algorithm: "madeby-envelope-sha256", target: "FILE", value: "x" });
    } catch {
      threw = true;
    }
    safe("subject-envelope-injection", "two-hash-invariant", threw, threw ? "rejected internal-envelope subject" : "accepted a re-hash subject");
  }
  // 7. Replay a signature over altered content / attribution (canonical bytes must change).
  {
    const base = dec(canonicalize(claim()));
    const tamperedContent = dec(canonicalize(claim({ subject: { ...exactFp, value: "tampered" } })));
    const tamperedAttrib = dec(canonicalize(claim({ attribution: { identityId: "attacker", role: "creator" } })));
    const resisted = base !== tamperedContent && base !== tamperedAttrib;
    safe("canonicalization-tamper", "signature-binding", resisted, resisted ? "altering signed fields changes the canonical bytes" : "tamper did not change canonical bytes");
  }
  // 8. Smuggle a claim in an unrecognized carrier and have it treated as recognized.
  {
    const env = { carrier: "unknown-vendor-format", predicate: CARRIER_REGISTRY.get("in-toto")!.serialize(claim()).predicate! };
    const parsed = parseEnvelope(env);
    const resisted = parsed?.recognized === false;
    safe("malformed-carrier", "carrier-degradation", resisted, `recognized=${parsed?.recognized} (want false → caps at asserted)`);
  }

  return out;
}
