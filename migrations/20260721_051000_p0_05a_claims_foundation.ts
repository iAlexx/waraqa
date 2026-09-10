import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * P0-05A — Claim / Evidence architecture foundation.
 * Idempotent for DBs that already received schema via PAYLOAD_DATABASE_PUSH.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN CREATE TYPE "public"."claim_status" AS ENUM('DRAFT', 'NEEDS_REVIEW', 'VERIFIED', 'UNKNOWN', 'CONFLICTED', 'NEEDS_OFFICIAL_CONFIRMATION', 'OUTDATED', 'SUPERSEDED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."claim_pub" AS ENUM('INTERNAL_ONLY', 'PUBLIC', 'PUBLIC_WITH_WARNING', 'BLOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."claim_rel" AS ENUM('SUPPORTS', 'CONTRADICTS', 'PARTIALLY_SUPPORTS', 'SUPERSEDES', 'CONTEXT_ONLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."ckind" AS ENUM('requirement', 'fee', 'step', 'eligibility', 'process', 'duration', 'location', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."scope_k" AS ENUM('transaction_section', 'document_key', 'step_key', 'fee_key', 'guide_rule', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_claims_status" AS ENUM('draft', 'published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum__claims_v_version_status" AS ENUM('draft', 'published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum__claims_v_published_locale" AS ENUM('ar', 'en'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "claims" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar,
      "transaction_id" integer,
      "kind" "ckind",
      "scope_kind" "scope_k",
      "scope_key" varchar,
      "status" "claim_status" DEFAULT 'DRAFT',
      "publication_permission" "claim_pub" DEFAULT 'INTERNAL_ONLY',
      "reviewed_by_id" integer,
      "verified_at" timestamp(3) with time zone,
      "valid_from" timestamp(3) with time zone,
      "valid_until" timestamp(3) with time zone,
      "review_due_at" timestamp(3) with time zone,
      "active" boolean DEFAULT true,
      "created_by_id" integer,
      "last_updated_by_id" integer,
      "published_by_id" integer,
      "published_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "_status" "enum_claims_status" DEFAULT 'draft'
    );

    CREATE TABLE IF NOT EXISTS "claims_locales" (
      "statement" varchar,
      "editorial_notes" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "claim_ev" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "source_id" integer,
      "relation_type" "claim_rel",
      "quote_or_locator" varchar,
      "checked_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "claim_ev_locales" (
      "note" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "_claims_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "version_key" varchar,
      "version_transaction_id" integer,
      "version_kind" "ckind",
      "version_scope_kind" "scope_k",
      "version_scope_key" varchar,
      "version_status" "claim_status" DEFAULT 'DRAFT',
      "version_publication_permission" "claim_pub" DEFAULT 'INTERNAL_ONLY',
      "version_reviewed_by_id" integer,
      "version_verified_at" timestamp(3) with time zone,
      "version_valid_from" timestamp(3) with time zone,
      "version_valid_until" timestamp(3) with time zone,
      "version_review_due_at" timestamp(3) with time zone,
      "version_active" boolean DEFAULT true,
      "version_created_by_id" integer,
      "version_last_updated_by_id" integer,
      "version_published_by_id" integer,
      "version_published_at" timestamp(3) with time zone,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "version__status" "enum__claims_v_version_status" DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "snapshot" boolean,
      "published_locale" "enum__claims_v_published_locale",
      "latest" boolean
    );

    CREATE TABLE IF NOT EXISTS "_claims_v_locales" (
      "version_statement" varchar,
      "version_editorial_notes" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "_claim_ev_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "source_id" integer,
      "relation_type" "claim_rel",
      "quote_or_locator" varchar,
      "checked_at" timestamp(3) with time zone,
      "_uuid" varchar
    );

    CREATE TABLE IF NOT EXISTS "_claim_ev_v_locales" (
      "note" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "claims_id" integer;

    DO $$ BEGIN
      ALTER TABLE "claims" ADD CONSTRAINT "claims_transaction_id_tx_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."tx"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claims" ADD CONSTRAINT "claims_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claims" ADD CONSTRAINT "claims_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claims" ADD CONSTRAINT "claims_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claims" ADD CONSTRAINT "claims_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claims_locales" ADD CONSTRAINT "claims_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claim_ev" ADD CONSTRAINT "claim_ev_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claim_ev" ADD CONSTRAINT "claim_ev_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "claim_ev_locales" ADD CONSTRAINT "claim_ev_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."claim_ev"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claims_v" ADD CONSTRAINT "_claims_v_parent_id_claims_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."claims"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claims_v" ADD CONSTRAINT "_claims_v_version_transaction_id_tx_id_fk" FOREIGN KEY ("version_transaction_id") REFERENCES "public"."tx"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claims_v" ADD CONSTRAINT "_claims_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claims_v" ADD CONSTRAINT "_claims_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claims_v" ADD CONSTRAINT "_claims_v_version_last_updated_by_id_users_id_fk" FOREIGN KEY ("version_last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claims_v" ADD CONSTRAINT "_claims_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claims_v_locales" ADD CONSTRAINT "_claims_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_claims_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claim_ev_v" ADD CONSTRAINT "_claim_ev_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_claims_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claim_ev_v" ADD CONSTRAINT "_claim_ev_v_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_claim_ev_v_locales" ADD CONSTRAINT "_claim_ev_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_claim_ev_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "claims_key_idx" ON "claims" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "claims_transaction_idx" ON "claims" USING btree ("transaction_id");
    CREATE INDEX IF NOT EXISTS "claims_reviewed_by_idx" ON "claims" USING btree ("reviewed_by_id");
    CREATE INDEX IF NOT EXISTS "claims_created_by_idx" ON "claims" USING btree ("created_by_id");
    CREATE INDEX IF NOT EXISTS "claims_last_updated_by_idx" ON "claims" USING btree ("last_updated_by_id");
    CREATE INDEX IF NOT EXISTS "claims_published_by_idx" ON "claims" USING btree ("published_by_id");
    CREATE INDEX IF NOT EXISTS "claims_updated_at_idx" ON "claims" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "claims_created_at_idx" ON "claims" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "claims__status_idx" ON "claims" USING btree ("_status");
    CREATE UNIQUE INDEX IF NOT EXISTS "claims_locales_locale_parent_id_unique" ON "claims_locales" USING btree ("_locale","_parent_id");
    CREATE INDEX IF NOT EXISTS "claim_ev_order_idx" ON "claim_ev" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "claim_ev_parent_id_idx" ON "claim_ev" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "claim_ev_source_idx" ON "claim_ev" USING btree ("source_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "claim_ev_locales_locale_parent_id_unique" ON "claim_ev_locales" USING btree ("_locale","_parent_id");
    CREATE INDEX IF NOT EXISTS "_claims_v_parent_idx" ON "_claims_v" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_key_idx" ON "_claims_v" USING btree ("version_key");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_transaction_idx" ON "_claims_v" USING btree ("version_transaction_id");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_reviewed_by_idx" ON "_claims_v" USING btree ("version_reviewed_by_id");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_created_by_idx" ON "_claims_v" USING btree ("version_created_by_id");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_last_updated_by_idx" ON "_claims_v" USING btree ("version_last_updated_by_id");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_published_by_idx" ON "_claims_v" USING btree ("version_published_by_id");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_updated_at_idx" ON "_claims_v" USING btree ("version_updated_at");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version_created_at_idx" ON "_claims_v" USING btree ("version_created_at");
    CREATE INDEX IF NOT EXISTS "_claims_v_version_version__status_idx" ON "_claims_v" USING btree ("version__status");
    CREATE INDEX IF NOT EXISTS "_claims_v_created_at_idx" ON "_claims_v" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "_claims_v_updated_at_idx" ON "_claims_v" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "_claims_v_snapshot_idx" ON "_claims_v" USING btree ("snapshot");
    CREATE INDEX IF NOT EXISTS "_claims_v_published_locale_idx" ON "_claims_v" USING btree ("published_locale");
    CREATE INDEX IF NOT EXISTS "_claims_v_latest_idx" ON "_claims_v" USING btree ("latest");
    CREATE UNIQUE INDEX IF NOT EXISTS "_claims_v_locales_locale_parent_id_unique" ON "_claims_v_locales" USING btree ("_locale","_parent_id");
    CREATE INDEX IF NOT EXISTS "_claim_ev_v_order_idx" ON "_claim_ev_v" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_claim_ev_v_parent_id_idx" ON "_claim_ev_v" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_claim_ev_v_source_idx" ON "_claim_ev_v" USING btree ("source_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "_claim_ev_v_locales_locale_parent_id_unique" ON "_claim_ev_v_locales" USING btree ("_locale","_parent_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("claims_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_claims_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_claims_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "claims_id";

    DROP TABLE IF EXISTS "_claim_ev_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_claim_ev_v" CASCADE;
    DROP TABLE IF EXISTS "_claims_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_claims_v" CASCADE;
    DROP TABLE IF EXISTS "claim_ev_locales" CASCADE;
    DROP TABLE IF EXISTS "claim_ev" CASCADE;
    DROP TABLE IF EXISTS "claims_locales" CASCADE;
    DROP TABLE IF EXISTS "claims" CASCADE;

    DROP TYPE IF EXISTS "public"."enum__claims_v_published_locale";
    DROP TYPE IF EXISTS "public"."enum__claims_v_version_status";
    DROP TYPE IF EXISTS "public"."enum_claims_status";
    DROP TYPE IF EXISTS "public"."scope_k";
    DROP TYPE IF EXISTS "public"."ckind";
    DROP TYPE IF EXISTS "public"."claim_rel";
    DROP TYPE IF EXISTS "public"."claim_pub";
    DROP TYPE IF EXISTS "public"."claim_status";
  `)
}
