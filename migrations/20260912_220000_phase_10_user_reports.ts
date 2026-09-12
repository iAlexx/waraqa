import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 10 — user-reports collection + privacy-preserving rate-limit buckets.
 * Idempotent for DBs that already received schema via PAYLOAD_DATABASE_PUSH.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."usr_rpt_section" AS ENUM(
        'documents', 'fees', 'steps', 'location', 'duration', 'source', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."usr_rpt_status" AS ENUM(
        'open', 'in_review', 'resolved', 'rejected', 'spam'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- Extend audit_action enum with report lifecycle values (idempotent).
    DO $$ BEGIN ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_received'; EXCEPTION WHEN others THEN NULL; END $$;
    DO $$ BEGIN ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_in_review'; EXCEPTION WHEN others THEN NULL; END $$;
    DO $$ BEGIN ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_resolved'; EXCEPTION WHEN others THEN NULL; END $$;
    DO $$ BEGIN ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_rejected'; EXCEPTION WHEN others THEN NULL; END $$;
    DO $$ BEGIN ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_marked_spam'; EXCEPTION WHEN others THEN NULL; END $$;
    DO $$ BEGIN ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_status_changed'; EXCEPTION WHEN others THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "usr_rpt" (
      "id" serial PRIMARY KEY NOT NULL,
      "transaction_id" integer,
      "section" "usr_rpt_section",
      "message" varchar,
      "source_url" varchar,
      "contact_email" varchar,
      "contact_phone" varchar,
      "consent_accepted" boolean DEFAULT false,
      "status" "usr_rpt_status" DEFAULT 'open',
      "review_notes" varchar,
      "resolution_summary" varchar,
      "resolved_at" timestamp(3) with time zone,
      "resolved_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_transaction_id_tx_id_fk"
        FOREIGN KEY ("transaction_id") REFERENCES "public"."tx"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_resolved_by_id_users_id_fk"
        FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "usr_rpt_transaction_idx" ON "usr_rpt" USING btree ("transaction_id");
    CREATE INDEX IF NOT EXISTS "usr_rpt_status_idx" ON "usr_rpt" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "usr_rpt_created_at_idx" ON "usr_rpt" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "usr_rpt_updated_at_idx" ON "usr_rpt" USING btree ("updated_at");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "usr_rpt_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usr_rpt_fk"
        FOREIGN KEY ("usr_rpt_id") REFERENCES "public"."usr_rpt"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_usr_rpt_id_idx"
      ON "payload_locked_documents_rels" USING btree ("usr_rpt_id");

    -- Pseudonymous rate-limit buckets (no raw IP).
    CREATE TABLE IF NOT EXISTS "report_rate_buckets" (
      "identity_hash" varchar(64) NOT NULL,
      "window_start" timestamp(3) with time zone NOT NULL,
      "hit_count" integer NOT NULL DEFAULT 0,
      PRIMARY KEY ("identity_hash", "window_start")
    );
    CREATE INDEX IF NOT EXISTS "report_rate_buckets_window_idx"
      ON "report_rate_buckets" USING btree ("window_start");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_usr_rpt_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_usr_rpt_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "usr_rpt_id";

    DROP TABLE IF EXISTS "report_rate_buckets";
    DROP TABLE IF EXISTS "usr_rpt";

    DROP TYPE IF EXISTS "public"."usr_rpt_section";
    DROP TYPE IF EXISTS "public"."usr_rpt_status";
  `)
}
