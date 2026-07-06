# MadeBy Attestation — v1

> **⚠️ DRAFT — NOT FINAL LEGAL TEXT.** The legally-operative wording below is a placeholder
> pending counsel review (see `COMPLIANCE.md`). This version is registered with status `draft`,
> which means MadeBy will **detect and point to** a declaration that adopts it, but it confers
> **no trust tier** (it resolves to `asserted`) until the wording is finalized. Do not rely on
> this text as a legal instrument yet.

## How to use this

MadeBy does **not** host your declaration. You adopt this standardized language by committing it
to **your own repository** (e.g. as `PROVENANCE`, or `.madeby/attestation.md`). MadeBy detects the
block below in your repo and records a **pointer** to it — we never store a copy. Delete the file
and the pointer degrades to `asserted` on the next check. This is the OSI/SPDX model applied to
provenance: we publish the template; you self-host the signed declaration; we detect and point.

- Copy the block between the `BEGIN`/`END` markers **verbatim** (do not alter the wording — any
  change breaks recognition and the tier is not granted).
- Fill in the signature block **below** the `END` marker (those fields are outside the recognized
  text, so they don't affect recognition).
- The **signature is a legal one** — your assent as a named party who bears the consequences of a
  false declaration. A cryptographic signature (e.g. a signed commit over this file) is an optional
  addition that further binds the declaration to a verified identity and is the in-band upgrade to
  the `verified` tier.

## The declaration

```
-----BEGIN MADEBY ATTESTATION v1-----
[DRAFT — NOT FINAL LEGAL TEXT; PENDING COUNSEL REVIEW (COMPLIANCE.md). This placeholder
fixes the format so the detector and carrier can be built and tested; it confers NO trust
tier until finalized.]

I, the undersigned, declare that the authorship and AI-assistance breakdown recorded in the
MadeBy manifest referenced below is accurate and complete to the best of my knowledge, and I
make this declaration understanding that others may rely on it.
-----END MADEBY ATTESTATION v1-----
Signed: <your full legal name>
Date: <YYYY-MM-DD>
Subject: <your repo URL @ commit, or the .madeby manifest path this covers>
```
