import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * P0-06 — contentClass isolation (PRODUCTION | DEMO | QA_TEST).
 * Column name follows Payload field name → content_class / version_content_class.
 * Fail-safe: existing rows → QA_TEST. Idempotent for push/migrate drafts.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."content_class" AS ENUM('PRODUCTION', 'DEMO', 'QA_TEST');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "tx" ADD COLUMN IF NOT EXISTS "content_class" "content_class" DEFAULT 'QA_TEST';
    ALTER TABLE "_tx_v" ADD COLUMN IF NOT EXISTS "version_content_class" "content_class" DEFAULT 'QA_TEST';
    ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "content_class" "content_class" DEFAULT 'QA_TEST';
    ALTER TABLE "_claims_v" ADD COLUMN IF NOT EXISTS "version_content_class" "content_class" DEFAULT 'QA_TEST';
    ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "content_class" "content_class" DEFAULT 'QA_TEST';
    ALTER TABLE "_sources_v" ADD COLUMN IF NOT EXISTS "version_content_class" "content_class" DEFAULT 'QA_TEST';

    -- Compat: rename c_class → content_class if an earlier draft used dbName.
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tx' AND column_name = 'c_class'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tx' AND column_name = 'content_class'
      ) THEN
        ALTER TABLE "tx" RENAME COLUMN "c_class" TO "content_class";
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tx' AND column_name = 'c_class'
      ) THEN
        UPDATE "tx" SET "content_class" = COALESCE("content_class", "c_class", 'QA_TEST');
        ALTER TABLE "tx" DROP COLUMN "c_class";
      END IF;
    END $$;

    -- Legacy / any prior value → QA_TEST (never accidentally public).
    UPDATE "tx" SET "content_class" = 'QA_TEST';
    UPDATE "_tx_v" SET "version_content_class" = 'QA_TEST';
    UPDATE "claims" SET "content_class" = 'QA_TEST';
    UPDATE "_claims_v" SET "version_content_class" = 'QA_TEST';
    UPDATE "sources" SET "content_class" = 'QA_TEST';
    UPDATE "_sources_v" SET "version_content_class" = 'QA_TEST';

    CREATE INDEX IF NOT EXISTS "tx_content_class_idx" ON "tx" USING btree ("content_class");
    CREATE INDEX IF NOT EXISTS "claims_content_class_idx" ON "claims" USING btree ("content_class");
    CREATE INDEX IF NOT EXISTS "sources_content_class_idx" ON "sources" USING btree ("content_class");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "tx_content_class_idx";
    DROP INDEX IF EXISTS "claims_content_class_idx";
    DROP INDEX IF EXISTS "sources_content_class_idx";
    ALTER TABLE "tx" DROP COLUMN IF EXISTS "content_class";
    ALTER TABLE "_tx_v" DROP COLUMN IF EXISTS "version_content_class";
    ALTER TABLE "claims" DROP COLUMN IF EXISTS "content_class";
    ALTER TABLE "_claims_v" DROP COLUMN IF EXISTS "version_content_class";
    ALTER TABLE "sources" DROP COLUMN IF EXISTS "content_class";
    ALTER TABLE "_sources_v" DROP COLUMN IF EXISTS "version_content_class";
    ALTER TABLE "tx" DROP COLUMN IF EXISTS "c_class";
    ALTER TABLE "_tx_v" DROP COLUMN IF EXISTS "version_c_class";
    DROP TYPE IF EXISTS "public"."content_class";
  `)
}
