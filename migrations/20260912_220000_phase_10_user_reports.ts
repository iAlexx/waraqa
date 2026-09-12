import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 10 — user-reports collection + privacy-preserving rate-limit buckets.
 * Idempotent for DBs that already received schema via PAYLOAD_DATABASE_PUSH.
 *
 * Transaction FK uses ON DELETE RESTRICT so hard-deleting a Transaction that
 * still has reports fails loudly (immutable report history).
 *
 * Down migration limitation: PostgreSQL cannot easily remove values from
 * `audit_action` once added; down drops report tables/types but leaves the
 * audit enum extensions in place (documented intentional).
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

    -- Idempotent enum extensions (ADD VALUE IF NOT EXISTS). Do not swallow other errors.
    ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_received';
    ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_in_review';
    ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_resolved';
    ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_rejected';
    ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_marked_spam';
    ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_status_changed';

    CREATE TABLE IF NOT EXISTS "usr_rpt" (
      "id" serial PRIMARY KEY NOT NULL,
      "transaction_id" integer NOT NULL,
      "section" "usr_rpt_section",
      "message" varchar,
      "encountered" varchar,
      "service_center_id" integer,
      "source_url" varchar,
      "contact_email" varchar,
      "contact_phone" varchar,
      "consent_accepted" boolean DEFAULT false,
      "status" "usr_rpt_status" DEFAULT 'open',
      "review_notes" varchar,
      "resolution_summary" varchar,
      "last_resolution_summary" varchar,
      "resolved_at" timestamp(3) with time zone,
      "resolved_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_transaction_id_tx_id_fk"
        FOREIGN KEY ("transaction_id") REFERENCES "public"."tx"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_service_center_id_fk"
        FOREIGN KEY ("service_center_id") REFERENCES "public"."svc_centers"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_resolved_by_id_users_id_fk"
        FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "usr_rpt_transaction_idx" ON "usr_rpt" USING btree ("transaction_id");
    CREATE INDEX IF NOT EXISTS "usr_rpt_status_idx" ON "usr_rpt" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "usr_rpt_created_at_idx" ON "usr_rpt" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "usr_rpt_updated_at_idx" ON "usr_rpt" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "usr_rpt_service_center_idx" ON "usr_rpt" USING btree ("service_center_id");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "usr_rpt_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usr_rpt_fk"
        FOREIGN KEY ("usr_rpt_id") REFERENCES "public"."usr_rpt"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_usr_rpt_id_idx"
      ON "payload_locked_documents_rels" USING btree ("usr_rpt_id");

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

    -- NOTE: audit_action enum values added in up() are NOT removed.
    -- PostgreSQL cannot drop enum values safely without table rewrites.
  `)
}
