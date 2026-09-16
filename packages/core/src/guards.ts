// Invariant guards (ARCHITECTURE.md §10).

import type { Fingerprint } from "./fingerprint";
import { isNativeFingerprint } from "./fingerprint";

/**
 * INVARIANT #1: a claim's subject must be a REFERENCE to a native content hash
 * (git SHA, sha256, structural fingerprint, …) — never a re-hash of content into a
 * MadeBy-internal envelope. Reserved internal algorithm namespaces are rejected.
 */
export function assertSubjectIsReference(subject: Fingerprint): void {
  if (!isNativeFingerprint(subject)) {
    throw new Error(
      `subject must reference a native content fingerprint, not an internal envelope ` +
        `(got algorithm "${subject.algorithm}")`,
    );
  }
}
