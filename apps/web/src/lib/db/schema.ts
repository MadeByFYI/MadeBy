// Drizzle schema — Neon Postgres + pgvector. Private implementation (not the publishable core).
// Mirrors the domain model in @madeby/core (ARCHITECTURE.md §10).
//
// INVARIANTS reflected here:
//  #1 a claim's subject references a native content fingerprint (FK to fingerprints), never a re-hash
//  #3/#4 the EFFECTIVE tier and any "percent authored" are COMPUTED — never stored. Only the
//        claimant's `asserted_tier` is persisted; resolveTier()/computeCoverage() derive the rest.

import { pgTable, text, timestamp, boolean, jsonb, vector, index } from "drizzle-orm/pg-core";

export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const fingerprints = pgTable(
  "fingerprints",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    algorithm: text("algorithm").notNull(),
    target: text("target").notNull(),
    value: text("value").notNull(),
    // Structural/fuzzy embedding for similarity search. Dimensions finalized in #11, where the
    // HNSW similarity index is added alongside real embeddings.
    embedding: vector("embedding", { dimensions: 256 }),
  },
  (t) => [
    index("fingerprints_subject_idx").on(t.subjectId),
    index("fingerprints_lookup_idx").on(t.algorithm, t.value),
  ],
);

export const identities = pgTable("identities", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // individual | organization | ai
  provider: text("provider"), // open fields, never a hardcoded model enum
  model: text("model"),
  modelVersion: text("model_version"),
  operatorId: text("operator_id"), // human/org operator behind an AI identity
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const anchors = pgTable(
  "anchors",
  {
    id: text("id").primaryKey(),
    identityId: text("identity_id")
      .notNull()
      .references(() => identities.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // email | domain | phone | address | key
    value: text("value").notNull(),
    status: text("status").notNull().default("unverified"),
  },
  (t) => [index("anchors_identity_idx").on(t.identityId)],
);

export const carriers = pgTable("carriers", {
  id: text("id").primaryKey(),
  // false ⇒ unknown canonicalization ⇒ claims in it cap at the asserted tier (invariant #3)
  verificationCapable: boolean("verification_capable").notNull().default(false),
});

export const claims = pgTable(
  "claims",
  {
    id: text("id").primaryKey(),
    // INVARIANT #1: subject is a reference to a native content fingerprint.
    subjectFingerprintId: text("subject_fingerprint_id")
      .notNull()
      .references(() => fingerprints.id),
    // attribution (inlined)
    identityId: text("identity_id").references(() => identities.id),
    role: text("role").notNull(),
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    operatorId: text("operator_id"),
    // the tier the claimant ASSERTS; the effective tier is computed, never stored.
    assertedTier: text("asserted_tier").notNull().default("asserted"),
    signature: jsonb("signature"), // { signerKeyId, value, carrierId, signedAt } | null
    sworn: jsonb("sworn"), // { representationCode, signatureName, signedAt } | null
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("claims_subject_fp_idx").on(t.subjectFingerprintId)],
);

export const claimEdges = pgTable(
  "claim_edges",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // PART_OF | DERIVED_FROM
    fromClaimId: text("from_claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    toClaimId: text("to_claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("claim_edges_from_idx").on(t.fromClaimId),
    index("claim_edges_to_idx").on(t.toClaimId),
  ],
);
