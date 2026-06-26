# Conformance test vectors

Frozen, versioned `input → expected output` vectors for the deterministic core —
JCS canonicalization, exact fingerprints (git-blob-sha1, sha256), and tier resolution —
**with adversarial negatives first-class** (forgeries that MUST reject, unknown carriers that
MUST cap at asserted, canonicalization-mismatch that MUST fail).

This is the **publishable artifact** that makes the implementation's correctness checkable
without open-sourcing it (`TESTING.md` §4). The set is `conformance-v0.json`; the runner is
`../conformance.ts` (`runConformance()`), exercised by `../conformance.test.ts` and the CI
trust-gate (via `pnpm test`). A third party can run their own implementation against the same
JSON. Fingerprint expecteds are independently verifiable (`git hash-object`, `sha256sum`).

Bump the `version` and add a new file when the vector set changes; never edit a frozen set in
place. Signature-verification vectors arrive with the verification path (#18); structural
fingerprint vectors arrive once that algorithm is formally specced.
