# Conformance test vectors

Frozen, versioned `input → expected output` vectors for the deterministic core —
canonicalization, signature verify/reject, tier resolution, fingerprints — **with adversarial
negatives first-class** (forgeries that MUST reject, unknown carriers that MUST cap at
asserted, canonicalization mismatches that MUST fail).

This is the **publishable artifact** that makes the implementation's correctness checkable
without open-sourcing it (`TESTING.md` §4). Populated by **#17**; wired into the CI trust-gate
by **#21**.
