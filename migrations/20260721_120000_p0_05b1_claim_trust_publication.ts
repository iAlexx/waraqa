import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * P0-05B1 — transaction claim bindings + denormalized claimTrustOk for public fail-closed.
 * claimTrustOk → claim_trust_ok; claimBindings dbName → clm_b; coveredSection → covered_section.
 * Idempotent for DBs that already received schema via PAYLOAD_DATABASE_PUSH or earlier drafts.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tx" ADD COLUMN IF NOT EXISTS "claim_trust_ok" boolean DEFAULT false;
    ALTER TABLE "_tx_v" ADD COLUMN IF NOT EXISTS "version_claim_trust_ok" boolean DEFAULT false;

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tx' AND column_name = 'clm_ok'
      ) THEN
        UPDATE "tx" SET "claim_trust_ok" = COALESCE("claim_trust_ok", "clm_ok", false);
        ALTER TABLE "tx" DROP COLUMN "clm_ok";
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '_tx_v' AND column_name = 'version_clm_ok'
      ) THEN
        UPDATE "_tx_v" SET "version_claim_trust_ok" = COALESCE("version_claim_trust_ok", "version_clm_ok", false);
        ALTER TABLE "_tx_v" DROP COLUMN "version_clm_ok";
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "clm_b" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "claim_id" integer,
      "required" boolean DEFAULT true,
      "covered_section" "tx_cov_sec"
    );

    CREATE TABLE IF NOT EXISTS "_clm_b_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "claim_id" integer,
      "required" boolean DEFAULT true,
      "covered_section" "tx_cov_sec",
      "_uuid" varchar
    );

    -- Compat: rename clm_sec → covered_section if an earlier draft used dbName.
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clm_b' AND column_name = 'clm_sec'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clm_b' AND column_name = 'covered_section'
      ) THEN
        ALTER TABLE "clm_b" RENAME COLUMN "clm_sec" TO "covered_section";
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clm_b' AND column_name = 'clm_sec'
      ) THEN
        ALTER TABLE "clm_b" DROP COLUMN "clm_sec";
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '_clm_b_v' AND column_name = 'clm_sec'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '_clm_b_v' AND column_name = 'covered_section'
      ) THEN
        ALTER TABLE "_clm_b_v" RENAME COLUMN "clm_sec" TO "covered_section";
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '_clm_b_v' AND column_name = 'clm_sec'
      ) THEN
        ALTER TABLE "_clm_b_v" DROP COLUMN "clm_sec";
      END IF;
    END $$;

    -- Ensure covered_section exists even if table was created earlier without it.
    ALTER TABLE "clm_b" ADD COLUMN IF NOT EXISTS "covered_section" "tx_cov_sec";
    ALTER TABLE "_clm_b_v" ADD COLUMN IF NOT EXISTS "covered_section" "tx_cov_sec";

    DO $$ BEGIN
      ALTER TABLE "clm_b" ADD CONSTRAINT "clm_b_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "clm_b" ADD CONSTRAINT "clm_b_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_clm_b_v" ADD CONSTRAINT "_clm_b_v_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_clm_b_v" ADD CONSTRAINT "_clm_b_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "tx_claim_trust_ok_idx" ON "tx" USING btree ("claim_trust_ok");
    CREATE INDEX IF NOT EXISTS "clm_b_order_idx" ON "clm_b" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "clm_b_parent_id_idx" ON "clm_b" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "clm_b_claim_idx" ON "clm_b" USING btree ("claim_id");
    CREATE INDEX IF NOT EXISTS "_clm_b_v_order_idx" ON "_clm_b_v" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_clm_b_v_parent_id_idx" ON "_clm_b_v" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_clm_b_v_claim_idx" ON "_clm_b_v" USING btree ("claim_id");

    UPDATE "tx" SET "claim_trust_ok" = false WHERE "claim_trust_ok" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_clm_b_v" CASCADE;
    DROP TABLE IF EXISTS "clm_b" CASCADE;
    ALTER TABLE "_tx_v" DROP COLUMN IF EXISTS "version_claim_trust_ok";
    ALTER TABLE "tx" DROP COLUMN IF EXISTS "claim_trust_ok";
    ALTER TABLE "_tx_v" DROP COLUMN IF EXISTS "version_clm_ok";
    ALTER TABLE "tx" DROP COLUMN IF EXISTS "clm_ok";
  `)
}
