CREATE TABLE "anchors" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" text PRIMARY KEY NOT NULL,
	"verification_capable" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"from_claim_id" text NOT NULL,
	"to_claim_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_fingerprint_id" text NOT NULL,
	"identity_id" text,
	"role" text NOT NULL,
	"ai_provider" text,
	"ai_model" text,
	"operator_id" text,
	"asserted_tier" text DEFAULT 'asserted' NOT NULL,
	"signature" jsonb,
	"sworn" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fingerprints" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"algorithm" text NOT NULL,
	"target" text NOT NULL,
	"value" text NOT NULL,
	"embedding" vector(256)
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"provider" text,
	"model" text,
	"model_version" text,
	"operator_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anchors" ADD CONSTRAINT "anchors_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_edges" ADD CONSTRAINT "claim_edges_from_claim_id_claims_id_fk" FOREIGN KEY ("from_claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_edges" ADD CONSTRAINT "claim_edges_to_claim_id_claims_id_fk" FOREIGN KEY ("to_claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_subject_fingerprint_id_fingerprints_id_fk" FOREIGN KEY ("subject_fingerprint_id") REFERENCES "public"."fingerprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fingerprints" ADD CONSTRAINT "fingerprints_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anchors_identity_idx" ON "anchors" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "claim_edges_from_idx" ON "claim_edges" USING btree ("from_claim_id");--> statement-breakpoint
CREATE INDEX "claim_edges_to_idx" ON "claim_edges" USING btree ("to_claim_id");--> statement-breakpoint
CREATE INDEX "claims_subject_fp_idx" ON "claims" USING btree ("subject_fingerprint_id");--> statement-breakpoint
CREATE INDEX "fingerprints_subject_idx" ON "fingerprints" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "fingerprints_lookup_idx" ON "fingerprints" USING btree ("algorithm","value");