// Carrier registry (ARCHITECTURE.md §3). The semantic claim is defined once; carriers are
// swappable serializations. All bindings wrap the SAME canonical payload, so a signature
// minted in one carrier verifies after re-encoding into another (carrier-independence).
//
// Self-describing + tier-capped degradation: an envelope names its carrier; an unrecognized
// carrier still parses (best-effort) but is flagged so the caller caps it at the asserted tier.

import type { Claim, Carrier, Signature } from "./model";
import { claimPayload, claimFromPayload, type Json } from "./canonicalize";

export interface ParsedAttestation {
  claim: Claim;
  signature?: Signature;
  /** false ⇒ carrier not recognized ⇒ caller must cap at the asserted tier */
  recognized: boolean;
  carrierId: string;
}

export interface CarrierBinding extends Carrier {
  serialize(claim: Claim, signature?: Signature): Record<string, Json>;
  /** parse this carrier's envelope back into payload + signature */
  parse(envelope: Record<string, Json>): { payload: Json; signature?: Signature };
}

function sigToJson(sig: Signature | undefined): Json | undefined {
  return sig ? { signerKeyId: sig.signerKeyId, value: sig.value, carrierId: sig.carrierId, signedAt: sig.signedAt } : undefined;
}
function sigFromJson(v: Json | undefined): Signature | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const s = v as unknown as { signerKeyId: string; value: string; carrierId: string; signedAt: string };
  return { signerKeyId: s.signerKeyId, value: s.value, carrierId: s.carrierId, signedAt: s.signedAt };
}

const PREDICATE_TYPE = "https://madeby.fyi/attestation/v0";

/** in-toto predicate (the lean default; composes with Sigstore/SLSA). */
const inToto: CarrierBinding = {
  id: "in-toto",
  verificationCapable: true,
  serialize(claim, signature) {
    const payload = claimPayload(claim);
    return {
      carrier: "in-toto",
      _type: "https://in-toto.io/Statement/v1",
      predicateType: PREDICATE_TYPE,
      subject: [{ digest: { [claim.subject.algorithm]: claim.subject.value } }],
      predicate: payload,
      ...(sigToJson(signature) ? { signatures: [sigToJson(signature) as Json] } : {}),
    };
  },
  parse(env) {
    const sigs = env.signatures as Json[] | undefined;
    return { payload: env.predicate as Json, signature: sigFromJson(sigs?.[0]) };
  },
};

/** git-notes-native (closest to where developers already are). */
const gitNotes: CarrierBinding = {
  id: "git-notes",
  verificationCapable: true,
  serialize(claim, signature) {
    return {
      carrier: "git-notes",
      madeby: "v0",
      claim: claimPayload(claim),
      ...(sigToJson(signature) ? { sig: sigToJson(signature) as Json } : {}),
    };
  },
  parse(env) {
    return { payload: env.claim as Json, signature: sigFromJson(env.sig) };
  },
};

/** SPDX 3.0 AI-profile interop/export. Recognized; full SPDX field mapping lands later. */
const spdx: CarrierBinding = {
  id: "spdx",
  verificationCapable: true,
  serialize(claim, signature) {
    return {
      carrier: "spdx",
      spdxVersion: "SPDX-3.0",
      profile: "ai",
      madebyPayload: claimPayload(claim),
      ...(sigToJson(signature) ? { madebySignature: sigToJson(signature) as Json } : {}),
    };
  },
  parse(env) {
    return { payload: env.madebyPayload as Json, signature: sigFromJson(env.madebySignature) };
  },
};

export const CARRIER_REGISTRY: ReadonlyMap<string, CarrierBinding> = new Map([
  [inToto.id, inToto],
  [gitNotes.id, gitNotes],
  [spdx.id, spdx],
]);

/** Carrier map for resolveTier() — unknown carriers are simply absent ⇒ resolveTier caps them. */
export function carriersForResolution(): ReadonlyMap<string, Carrier> {
  return CARRIER_REGISTRY;
}

/**
 * Self-describing parse with graceful degradation. A recognized carrier yields a full
 * ParsedAttestation; an unrecognized one is parsed best-effort and flagged recognized:false
 * (the caller must then cap the effective tier at asserted — TESTING.md §3).
 */
export function parseEnvelope(envelope: Record<string, Json>): ParsedAttestation | null {
  const carrierId = typeof envelope.carrier === "string" ? envelope.carrier : "";
  const binding = CARRIER_REGISTRY.get(carrierId);

  if (binding) {
    const { payload, signature } = binding.parse(envelope);
    return { claim: claimFromPayload(payload), signature, recognized: true, carrierId };
  }

  // Unknown carrier: best-effort extraction of a payload-shaped field, capped at asserted.
  const guess = (envelope.predicate ?? envelope.claim ?? envelope.madebyPayload) as Json | undefined;
  if (guess === undefined) return null;
  return { claim: claimFromPayload(guess), recognized: false, carrierId };
}
