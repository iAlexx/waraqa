import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 10 closure — harden FK + add encountered / serviceCenter / lastResolutionSummary.
 * Safe to run after 20260912_220000_phase_10_user_reports on existing DBs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "usr_rpt" ADD COLUMN IF NOT EXISTS "encountered" varchar;
    ALTER TABLE "usr_rpt" ADD COLUMN IF NOT EXISTS "service_center_id" integer;
    ALTER TABLE "usr_rpt" ADD COLUMN IF NOT EXISTS "last_resolution_summary" varchar;

    -- Backfill encountered for rows created before this column existed.
    UPDATE "usr_rpt"
    SET "encountered" = COALESCE(NULLIF(BTRIM("encountered"), ''), "message")
    WHERE "encountered" IS NULL OR BTRIM(COALESCE("encountered", '')) = '';

    DO $$ BEGIN
      ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_service_center_id_fk"
        FOREIGN KEY ("service_center_id") REFERENCES "public"."svc_centers"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "usr_rpt_service_center_idx" ON "usr_rpt" USING btree ("service_center_id");

    -- Replace SET NULL transaction FK with RESTRICT (immutable report history).
    ALTER TABLE "usr_rpt" DROP CONSTRAINT IF EXISTS "usr_rpt_transaction_id_tx_id_fk";

    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "usr_rpt" WHERE "transaction_id" IS NULL) THEN
        RAISE EXCEPTION 'usr_rpt has NULL transaction_id; cannot enforce RESTRICT — fix orphans first';
      END IF;
    END $$;

    ALTER TABLE "usr_rpt" ALTER COLUMN "transaction_id" SET NOT NULL;
    ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_transaction_id_tx_id_fk"
      FOREIGN KEY ("transaction_id") REFERENCES "public"."tx"("id") ON DELETE restrict ON UPDATE no action;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "usr_rpt" DROP CONSTRAINT IF EXISTS "usr_rpt_transaction_id_tx_id_fk";
    ALTER TABLE "usr_rpt" ALTER COLUMN "transaction_id" DROP NOT NULL;
    ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_transaction_id_tx_id_fk"
      FOREIGN KEY ("transaction_id") REFERENCES "public"."tx"("id") ON DELETE set null ON UPDATE no action;

    DROP INDEX IF EXISTS "usr_rpt_service_center_idx";
    ALTER TABLE "usr_rpt" DROP CONSTRAINT IF EXISTS "usr_rpt_service_center_id_fk";
    ALTER TABLE "usr_rpt" DROP COLUMN IF EXISTS "service_center_id";
    ALTER TABLE "usr_rpt" DROP COLUMN IF EXISTS "last_resolution_summary";
    ALTER TABLE "usr_rpt" DROP COLUMN IF EXISTS "encountered";
  `)
}
