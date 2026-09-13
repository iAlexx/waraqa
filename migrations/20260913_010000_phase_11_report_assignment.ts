import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 11 — user-report assignment + audit action.
 * assignedTo → users (SET NULL on user delete).
 * Audit enum: report_assigned (ADD VALUE IF NOT EXISTS; not removed in down).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'report_assigned';

    ALTER TABLE "usr_rpt" ADD COLUMN IF NOT EXISTS "assigned_to_id" integer;

    DO $$ BEGIN
      ALTER TABLE "usr_rpt" ADD CONSTRAINT "usr_rpt_assigned_to_id_users_id_fk"
        FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "usr_rpt_assigned_to_idx" ON "usr_rpt" USING btree ("assigned_to_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "usr_rpt_assigned_to_idx";
    ALTER TABLE "usr_rpt" DROP CONSTRAINT IF EXISTS "usr_rpt_assigned_to_id_users_id_fk";
    ALTER TABLE "usr_rpt" DROP COLUMN IF EXISTS "assigned_to_id";

    -- NOTE: audit_action value 'report_assigned' is NOT removed.
    -- PostgreSQL cannot drop enum values safely without table rewrites.
  `)
}
