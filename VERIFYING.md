# Verifying a MadeBy bound-tier claim

**"Don't trust us — verify."** A `bound`-tier claim is trustworthy because its signature checks
out against an **open spec** with **open tools** — not because anyone can read our resolver. This
document is the end-to-end recipe. It needs **no access to MadeBy's codebase**: everything below
runs with standard crypto tooling (`openssl`, Python `cryptography`, Node, Go, Sigstore/cosign).

A runnable convenience implementation lives in [`@madeby/verifier`](packages/verifier) (itself open,
and built only on the open `@madeby/core` — the "open verifier, closed generator" boundary of
`TESTING.md` §4). You do not have to use it; the generic-tools path here is authoritative.

## What a bound-tier claim asserts, and what you check

The signature suite is **`ed25519-jcs-v0`**: an **Ed25519** signature over the **RFC 8785 (JCS)
canonical form** of the claim payload. Ed25519 is in every mainstream crypto stack and is
deterministic, so the published vectors reproduce byte-for-byte.

To independently confirm a claim reaches `bound`, check **four** things — any failure fails safe to
a lower tier (`asserted` for a crypto failure), never to a falsely-verified one:

1. **Recognized carrier.** The envelope names its carrier (`in-toto`, `git-notes`, `spdx`). An
   unrecognized carrier caps at `asserted` (`ARCHITECTURE.md` §3).
2. **Valid signature.** The Ed25519 signature verifies against the signer's public key, over the
   canonical payload bytes. The signature covers *only* the canonical payload — never the carrier
   framing — so it survives re-encoding between carriers (invariant #2).
3. **Two-hash invariant.** The `subject` references a *native* content hash (e.g. `sha256`,
   `git-blob-sha1`), not a MadeBy-internal re-hash (invariant #1).
4. **Byte-binding** (this is what separates `bound` from `verified`). Re-hash the actual content
   and confirm it equals `subject.value`. Without the content you can confirm at most `verified`.

One step you cannot do with crypto alone: decide that the **public key belongs to a verified
identity**. You bring a key you trust (fetched from the developer's known location, a DID document,
a Sigstore identity, etc.). The signature proves the claim was signed by *that* key; trusting the
key → identity link is yours to make (or MadeBy's registry vouches for it). Until it's vouched for,
the verifier reports `asserted`.

## The canonical payload

The signed bytes are the JCS serialization of the payload: keys sorted by UTF-16 code unit, no
whitespace, integers only (decimals/timestamps as strings). Extract `predicate` (in-toto),
`claim` (git-notes), or `madebyPayload` (spdx) from the envelope and canonicalize it. For the
published vector that is exactly (253 bytes):

```json
{"assertedTier":"bound","attribution":{"identityId":"did:web:alice.example","role":"creator"},"createdAt":"2026-01-01T00:00:00Z","subject":{"algorithm":"sha256","target":"FILE","value":"2b1bce86a0f9e60a5bbdea9447288bc62d7191ff249e562a82f89a2847faf4c8"}}
```

Any RFC 8785 implementation produces these exact bytes; the `jcs` conformance vectors in
`packages/core/src/vectors/conformance-v0.json` pin the rules.

## Recipe A — generic tools, no MadeBy code (`openssl`)

Using the published vector (`packages/verifier/src/vectors/verification-v0.json`):

```bash
PUB=430a77822da381e811654901f1d8f195f6a9a5f2d7c4999b6d962f9da193cc11
SIG=9d0336d37649d9efc94f3f1c2b8da667ee2883e76891f8d6f5f90c73a56f85b639e5a577834b9e6fb5664a5661679bc7474f62e78a9422ad3a7b1448ec427606

# 1. Wrap the raw 32-byte Ed25519 public key in a DER SubjectPublicKeyInfo, then PEM.
printf '302a300506032b6570032100%s' "$PUB" | xxd -r -p > pub.der
openssl pkey -pubin -inform DER -in pub.der -out pub.pem

# 2. Write the canonical payload bytes and the raw 64-byte signature.
printf '%s' '{"assertedTier":"bound","attribution":{"identityId":"did:web:alice.example","role":"creator"},"createdAt":"2026-01-01T00:00:00Z","subject":{"algorithm":"sha256","target":"FILE","value":"2b1bce86a0f9e60a5bbdea9447288bc62d7191ff249e562a82f89a2847faf4c8"}}' > canonical.bin
printf '%s' "$SIG" | xxd -r -p > sig.bin

# 3. Verify the signature (check #2 above).
openssl pkeyutl -verify -pubin -inkey pub.pem -rawin -in canonical.bin -sigfile sig.bin
# -> "Signature Verified Successfully"

# 4. Byte-binding (check #4): re-hash the content and compare to subject.value.
printf 'export const greeting = "hello, provenance";\n' | sha256sum
# -> 2b1bce86a0f9e60a5bbdea9447288bc62d7191ff249e562a82f89a2847faf4c8   (matches subject.value)
```

Both lines matching means: a real Ed25519 signature by `PUB` covers a claim whose `subject` is the
sha256 of the content you hold. If you trust `PUB` as the developer's key, the claim is `bound`.
For a `git-blob-sha1` subject, use `git hash-object <file>` in step 4 instead of `sha256sum`.

## Recipe B — Python (`cryptography`), no MadeBy code

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
import hashlib

PUB = bytes.fromhex("430a77822da381e811654901f1d8f195f6a9a5f2d7c4999b6d962f9da193cc11")
SIG = bytes.fromhex("9d0336d37649d9efc94f3f1c2b8da667ee2883e76891f8d6f5f90c73a56f85b6"
                    "39e5a577834b9e6fb5664a5661679bc7474f62e78a9422ad3a7b1448ec427606")
canonical = b'{"assertedTier":"bound","attribution":{"identityId":"did:web:alice.example","role":"creator"},"createdAt":"2026-01-01T00:00:00Z","subject":{"algorithm":"sha256","target":"FILE","value":"2b1bce86a0f9e60a5bbdea9447288bc62d7191ff249e562a82f89a2847faf4c8"}}'
content = b'export const greeting = "hello, provenance";\n'

Ed25519PublicKey.from_public_bytes(PUB).verify(SIG, canonical)   # raises on failure -> signature OK
assert hashlib.sha256(content).hexdigest() == "2b1bce86a0f9e60a5bbdea9447288bc62d7191ff249e562a82f89a2847faf4c8"
print("bound: signature valid AND content byte-bound")
```

## Recipe C — the reference verifier (`@madeby/verifier`)

```ts
import { verifyAttestation } from "@madeby/verifier";

const result = await verifyAttestation(envelope, {
  content: contentBytes,   // omit to confirm at most 'verified'
  trustSigner: true,       // you vouch the signing key maps to a verified identity
});
// result.confirmedTier === "bound", result.signatureValid === true, result.contentMatches === true
// result.reasons explains every decision/downgrade.
```

It reuses `@madeby/core`'s parsing, canonicalization, and the production `resolveTier` ladder — so
it exercises the same logic prod ships — and adds the content re-hash that `resolveTier` cannot do
offline. It **fails safe**: unrecognized carrier, invalid signature, un-vouched signer, or
non-matching content all degrade the tier; nothing escalates above the evidence.

## Reproduce the vectors yourself

The keypair in the vector file is **test-only** (the private key is published in the clear — never
do this for a real key). Because Ed25519 is deterministic, re-signing the vector claim with that
key reproduces `signature.value` exactly; `packages/verifier/src/verify.test.ts` asserts this, and
runs every vector (including two adversarial tamper cases) through the reference verifier.

## What this does and does not establish

- **Establishes:** the signature is authentic for the given key; the content is byte-identical to
  what was signed; the carrier and subject are well-formed. These need no trust in MadeBy.
- **You supply:** trust that the public key belongs to the claimed creator. MadeBy's registry can
  vouch for that link, but you are free to establish it yourself — the cryptography above is the
  same either way.
- **Residual gap (stated plainly, `TESTING.md` §4):** closed prod source means trusting our
  deployed resolver matches reference behavior on cases the published vectors don't cover. We
  narrow it with broad adversarial vectors, the fail-safe design, and (later, #22) reproducible
  builds + a transparency log. The signature-level verification on this page has **no such gap** —
  it is fully independent.
```
