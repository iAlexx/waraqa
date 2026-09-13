import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 11 review finding — add DB indexes for reviewDueAt to match schema `index: true`.
 *
 * Naming follows Payload/Postgres conventions already used for workflow fields:
 * - live:   tx_workflow_state_idx → tx_review_due_at_idx
 * - versions: _tx_v_version_version_workflow_state_idx
 *             → _tx_v_version_version_review_due_at_idx
 *
 * Safe to run after 20260913_010000_phase_11_report_assignment (IF NOT EXISTS).
 * Local DBs that already received this migration: no-op on re-run.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tx_review_due_at_idx"
      ON "tx" USING btree ("review_due_at");

    CREATE INDEX IF NOT EXISTS "_tx_v_version_version_review_due_at_idx"
      ON "_tx_v" USING btree ("version_review_due_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "_tx_v_version_version_review_due_at_idx";
    DROP INDEX IF EXISTS "tx_review_due_at_idx";
  `)
}
