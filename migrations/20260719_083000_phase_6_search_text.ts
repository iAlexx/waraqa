import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 6 — add normalized searchText on transactions + trigram index for contains prefilter.
 * Does not alter editorial title/summary storage.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    ALTER TABLE "tx" ADD COLUMN IF NOT EXISTS "search_text" varchar;
    ALTER TABLE "_tx_v" ADD COLUMN IF NOT EXISTS "version_search_text" varchar;

    CREATE INDEX IF NOT EXISTS "tx_search_text_trgm_idx"
      ON "tx" USING gin ("search_text" gin_trgm_ops);

    CREATE INDEX IF NOT EXISTS "tx_search_text_idx"
      ON "tx" USING btree ("search_text");

    CREATE INDEX IF NOT EXISTS "_tx_v_version_search_text_idx"
      ON "_tx_v" USING btree ("version_search_text");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "tx_search_text_trgm_idx";
    DROP INDEX IF EXISTS "tx_search_text_idx";
    DROP INDEX IF EXISTS "_tx_v_version_search_text_idx";
    ALTER TABLE "tx" DROP COLUMN IF EXISTS "search_text";
    ALTER TABLE "_tx_v" DROP COLUMN IF EXISTS "version_search_text";
  `)
}
