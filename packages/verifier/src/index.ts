// @madeby/verifier — the standalone, OPEN reference verifier (TESTING.md §4).
// "Open verifier, closed generator": this package + @madeby/core are publishable and let any
// third party independently confirm a bound-tier claim. The resolver service, ingestion, and
// classifier stay closed. The bound-tier signature suite is pinned in suite.ts (Ed25519/JCS v0).

export { SIGNATURE_SUITE_V0, SUITE_ALG, bytesToHex, hexToBytes, importPublicKey, importPrivateKey } from "./suite";

export { generateSigningKeyPair, signClaim } from "./sign";
export type { SigningKeyPair, SignOptions } from "./sign";

export { verifyClaimSignature, verifyAttestation } from "./verify";
export type { VerifyOptions, VerificationResult } from "./verify";
