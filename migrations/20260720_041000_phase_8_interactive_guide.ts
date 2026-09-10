import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 8 - interactive guide schema: questions/variants/notices/decision rules/effects,
 * version mirrors, stable keys on req_docs/steps/fees, guide_enabled flags.
 * Idempotent for DBs that already received schema via PAYLOAD_DATABASE_PUSH.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN CREATE TYPE "public"."qtype" AS ENUM('single', 'multi', 'boolean'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."op" AS ENUM('equals', 'notEquals', 'includes', 'exists'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."sev" AS ENUM('info', 'warning'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."fx_type" AS ENUM('includeDocument', 'excludeDocument', 'includeStep', 'excludeStep', 'includeFee', 'excludeFee', 'includeNotice', 'excludeNotice', 'selectVariant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "req_docs" ADD COLUMN IF NOT EXISTS "key" varchar;
    ALTER TABLE "steps" ADD COLUMN IF NOT EXISTS "key" varchar;
    ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "key" varchar;
    ALTER TABLE "_req_docs_v" ADD COLUMN IF NOT EXISTS "key" varchar;
    ALTER TABLE "_steps_v" ADD COLUMN IF NOT EXISTS "key" varchar;
    ALTER TABLE "_fees_v" ADD COLUMN IF NOT EXISTS "key" varchar;
    ALTER TABLE "tx" ADD COLUMN IF NOT EXISTS "guide_enabled" boolean DEFAULT false;
    ALTER TABLE "_tx_v" ADD COLUMN IF NOT EXISTS "version_guide_enabled" boolean DEFAULT false;

    CREATE INDEX IF NOT EXISTS "req_docs_key_idx" ON "req_docs" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "steps_key_idx" ON "steps" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "fees_key_idx" ON "fees" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "_req_docs_v_key_idx" ON "_req_docs_v" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "_steps_v_key_idx" ON "_steps_v" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "_fees_v_key_idx" ON "_fees_v" USING btree ("key");

    CREATE TABLE IF NOT EXISTS "questions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar NOT NULL,
      "key" varchar,
      "question_type" "qtype" DEFAULT 'single'::qtype,
      "required" boolean DEFAULT true,
      "active" boolean DEFAULT true,
      CONSTRAINT "questions_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "questions_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "questions_locales" (
      "prompt" varchar,
      "help_text" varchar,
      "id" integer NOT NULL DEFAULT nextval('questions_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL,
      CONSTRAINT "questions_locales_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "questions_visible_when_all" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar NOT NULL,
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      CONSTRAINT "questions_visible_when_all_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "questions_visible_when_any" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar NOT NULL,
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      CONSTRAINT "questions_visible_when_any_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "qopts" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar NOT NULL,
      "key" varchar,
      CONSTRAINT "qopts_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "qopts_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "qopts_locales" (
      "label" varchar,
      "id" integer NOT NULL DEFAULT nextval('qopts_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL,
      CONSTRAINT "qopts_locales_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "variants" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar NOT NULL,
      "key" varchar,
      "active" boolean DEFAULT true,
      CONSTRAINT "variants_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "variants_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "variants_locales" (
      "title" varchar,
      "explanation" varchar,
      "id" integer NOT NULL DEFAULT nextval('variants_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL,
      CONSTRAINT "variants_locales_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "notices" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar NOT NULL,
      "key" varchar,
      "severity" "sev" DEFAULT 'info'::sev,
      "active" boolean DEFAULT true,
      CONSTRAINT "notices_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "notices_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "notices_locales" (
      "title" varchar,
      "body" varchar,
      "id" integer NOT NULL DEFAULT nextval('notices_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL,
      CONSTRAINT "notices_locales_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "dec_rules" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar NOT NULL,
      "key" varchar,
      "priority" numeric DEFAULT 100,
      "active" boolean DEFAULT true,
      CONSTRAINT "dec_rules_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "dec_rules_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "dec_rules_locales" (
      "explanation" varchar,
      "id" integer NOT NULL DEFAULT nextval('dec_rules_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL,
      CONSTRAINT "dec_rules_locales_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "dec_rules_when_all" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar NOT NULL,
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      CONSTRAINT "dec_rules_when_all_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "dec_rules_when_any" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar NOT NULL,
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      CONSTRAINT "dec_rules_when_any_pkey" PRIMARY KEY("id")
    );

    CREATE TABLE IF NOT EXISTS "fx" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar NOT NULL,
      "type" "fx_type",
      "target_key" varchar,
      CONSTRAINT "fx_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_questions_v_id_seq";
    CREATE TABLE IF NOT EXISTS "_questions_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_questions_v_id_seq'::regclass),
      "key" varchar,
      "question_type" "qtype" DEFAULT 'single'::qtype,
      "required" boolean DEFAULT true,
      "active" boolean DEFAULT true,
      "_uuid" varchar,
      CONSTRAINT "_questions_v_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_questions_v_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "_questions_v_locales" (
      "prompt" varchar,
      "help_text" varchar,
      "id" integer NOT NULL DEFAULT nextval('_questions_v_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL,
      CONSTRAINT "_questions_v_locales_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_questions_v_visible_when_all_id_seq";
    CREATE TABLE IF NOT EXISTS "_questions_v_visible_when_all" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_questions_v_visible_when_all_id_seq'::regclass),
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      "_uuid" varchar,
      CONSTRAINT "_questions_v_visible_when_all_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_questions_v_visible_when_any_id_seq";
    CREATE TABLE IF NOT EXISTS "_questions_v_visible_when_any" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_questions_v_visible_when_any_id_seq'::regclass),
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      "_uuid" varchar,
      CONSTRAINT "_questions_v_visible_when_any_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_qopts_v_id_seq";
    CREATE TABLE IF NOT EXISTS "_qopts_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_qopts_v_id_seq'::regclass),
      "key" varchar,
      "_uuid" varchar,
      CONSTRAINT "_qopts_v_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_qopts_v_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "_qopts_v_locales" (
      "label" varchar,
      "id" integer NOT NULL DEFAULT nextval('_qopts_v_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL,
      CONSTRAINT "_qopts_v_locales_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_variants_v_id_seq";
    CREATE TABLE IF NOT EXISTS "_variants_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_variants_v_id_seq'::regclass),
      "key" varchar,
      "active" boolean DEFAULT true,
      "_uuid" varchar,
      CONSTRAINT "_variants_v_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_variants_v_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "_variants_v_locales" (
      "title" varchar,
      "explanation" varchar,
      "id" integer NOT NULL DEFAULT nextval('_variants_v_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL,
      CONSTRAINT "_variants_v_locales_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_notices_v_id_seq";
    CREATE TABLE IF NOT EXISTS "_notices_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_notices_v_id_seq'::regclass),
      "key" varchar,
      "severity" "sev" DEFAULT 'info'::sev,
      "active" boolean DEFAULT true,
      "_uuid" varchar,
      CONSTRAINT "_notices_v_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_notices_v_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "_notices_v_locales" (
      "title" varchar,
      "body" varchar,
      "id" integer NOT NULL DEFAULT nextval('_notices_v_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL,
      CONSTRAINT "_notices_v_locales_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_dec_rules_v_id_seq";
    CREATE TABLE IF NOT EXISTS "_dec_rules_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_dec_rules_v_id_seq'::regclass),
      "key" varchar,
      "priority" numeric DEFAULT 100,
      "active" boolean DEFAULT true,
      "_uuid" varchar,
      CONSTRAINT "_dec_rules_v_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_dec_rules_v_locales_id_seq";
    CREATE TABLE IF NOT EXISTS "_dec_rules_v_locales" (
      "explanation" varchar,
      "id" integer NOT NULL DEFAULT nextval('_dec_rules_v_locales_id_seq'::regclass),
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL,
      CONSTRAINT "_dec_rules_v_locales_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_dec_rules_v_when_all_id_seq";
    CREATE TABLE IF NOT EXISTS "_dec_rules_v_when_all" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_dec_rules_v_when_all_id_seq'::regclass),
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      "_uuid" varchar,
      CONSTRAINT "_dec_rules_v_when_all_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_dec_rules_v_when_any_id_seq";
    CREATE TABLE IF NOT EXISTS "_dec_rules_v_when_any" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_dec_rules_v_when_any_id_seq'::regclass),
      "question_key" varchar,
      "operator" "op",
      "value" varchar,
      "_uuid" varchar,
      CONSTRAINT "_dec_rules_v_when_any_pkey" PRIMARY KEY("id")
    );

    CREATE SEQUENCE IF NOT EXISTS "_fx_v_id_seq";
    CREATE TABLE IF NOT EXISTS "_fx_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" integer NOT NULL DEFAULT nextval('_fx_v_id_seq'::regclass),
      "type" "fx_type",
      "target_key" varchar,
      "_uuid" varchar,
      CONSTRAINT "_fx_v_pkey" PRIMARY KEY("id")
    );

    ALTER SEQUENCE "questions_locales_id_seq" OWNED BY "questions_locales"."id";
    ALTER SEQUENCE "qopts_locales_id_seq" OWNED BY "qopts_locales"."id";
    ALTER SEQUENCE "variants_locales_id_seq" OWNED BY "variants_locales"."id";
    ALTER SEQUENCE "notices_locales_id_seq" OWNED BY "notices_locales"."id";
    ALTER SEQUENCE "dec_rules_locales_id_seq" OWNED BY "dec_rules_locales"."id";
    ALTER SEQUENCE "_questions_v_id_seq" OWNED BY "_questions_v"."id";
    ALTER SEQUENCE "_questions_v_locales_id_seq" OWNED BY "_questions_v_locales"."id";
    ALTER SEQUENCE "_questions_v_visible_when_all_id_seq" OWNED BY "_questions_v_visible_when_all"."id";
    ALTER SEQUENCE "_questions_v_visible_when_any_id_seq" OWNED BY "_questions_v_visible_when_any"."id";
    ALTER SEQUENCE "_qopts_v_id_seq" OWNED BY "_qopts_v"."id";
    ALTER SEQUENCE "_qopts_v_locales_id_seq" OWNED BY "_qopts_v_locales"."id";
    ALTER SEQUENCE "_variants_v_id_seq" OWNED BY "_variants_v"."id";
    ALTER SEQUENCE "_variants_v_locales_id_seq" OWNED BY "_variants_v_locales"."id";
    ALTER SEQUENCE "_notices_v_id_seq" OWNED BY "_notices_v"."id";
    ALTER SEQUENCE "_notices_v_locales_id_seq" OWNED BY "_notices_v_locales"."id";
    ALTER SEQUENCE "_dec_rules_v_id_seq" OWNED BY "_dec_rules_v"."id";
    ALTER SEQUENCE "_dec_rules_v_locales_id_seq" OWNED BY "_dec_rules_v_locales"."id";
    ALTER SEQUENCE "_dec_rules_v_when_all_id_seq" OWNED BY "_dec_rules_v_when_all"."id";
    ALTER SEQUENCE "_dec_rules_v_when_any_id_seq" OWNED BY "_dec_rules_v_when_any"."id";
    ALTER SEQUENCE "_fx_v_id_seq" OWNED BY "_fx_v"."id";

    DO $$ BEGIN
     ALTER TABLE "questions" ADD CONSTRAINT "questions_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "tx"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "questions_locales" ADD CONSTRAINT "questions_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "questions"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "questions_visible_when_all" ADD CONSTRAINT "questions_visible_when_all_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "questions"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "questions_visible_when_any" ADD CONSTRAINT "questions_visible_when_any_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "questions"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "qopts" ADD CONSTRAINT "qopts_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "questions"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "qopts_locales" ADD CONSTRAINT "qopts_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "qopts"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "variants" ADD CONSTRAINT "variants_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "tx"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "variants_locales" ADD CONSTRAINT "variants_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "variants"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "notices" ADD CONSTRAINT "notices_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "tx"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "notices_locales" ADD CONSTRAINT "notices_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "notices"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "dec_rules" ADD CONSTRAINT "dec_rules_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "tx"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "dec_rules_locales" ADD CONSTRAINT "dec_rules_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "dec_rules"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "dec_rules_when_all" ADD CONSTRAINT "dec_rules_when_all_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "dec_rules"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "dec_rules_when_any" ADD CONSTRAINT "dec_rules_when_any_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "dec_rules"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "fx" ADD CONSTRAINT "fx_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "dec_rules"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_questions_v" ADD CONSTRAINT "_questions_v_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_tx_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_questions_v_locales" ADD CONSTRAINT "_questions_v_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_questions_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_questions_v_visible_when_all" ADD CONSTRAINT "_questions_v_visible_when_all_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_questions_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_questions_v_visible_when_any" ADD CONSTRAINT "_questions_v_visible_when_any_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_questions_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_qopts_v" ADD CONSTRAINT "_qopts_v_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_questions_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_qopts_v_locales" ADD CONSTRAINT "_qopts_v_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_qopts_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_tx_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_variants_v_locales" ADD CONSTRAINT "_variants_v_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_variants_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_notices_v" ADD CONSTRAINT "_notices_v_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_tx_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_notices_v_locales" ADD CONSTRAINT "_notices_v_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_notices_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_dec_rules_v" ADD CONSTRAINT "_dec_rules_v_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_tx_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_dec_rules_v_locales" ADD CONSTRAINT "_dec_rules_v_locales_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_dec_rules_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_dec_rules_v_when_all" ADD CONSTRAINT "_dec_rules_v_when_all_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_dec_rules_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_dec_rules_v_when_any" ADD CONSTRAINT "_dec_rules_v_when_any_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_dec_rules_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
     ALTER TABLE "_fx_v" ADD CONSTRAINT "_fx_v_parent_id_fk" FOREIGN KEY("_parent_id") REFERENCES "_dec_rules_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS questions_key_idx ON questions USING btree (key);
    CREATE INDEX IF NOT EXISTS questions_order_idx ON questions USING btree (_order);
    CREATE INDEX IF NOT EXISTS questions_parent_id_idx ON questions USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS questions_locales_locale_parent_id_unique ON questions_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS questions_visible_when_all_order_idx ON questions_visible_when_all USING btree (_order);
    CREATE INDEX IF NOT EXISTS questions_visible_when_all_parent_id_idx ON questions_visible_when_all USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS questions_visible_when_any_order_idx ON questions_visible_when_any USING btree (_order);
    CREATE INDEX IF NOT EXISTS questions_visible_when_any_parent_id_idx ON questions_visible_when_any USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS qopts_key_idx ON qopts USING btree (key);
    CREATE INDEX IF NOT EXISTS qopts_order_idx ON qopts USING btree (_order);
    CREATE INDEX IF NOT EXISTS qopts_parent_id_idx ON qopts USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS qopts_locales_locale_parent_id_unique ON qopts_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS variants_key_idx ON variants USING btree (key);
    CREATE INDEX IF NOT EXISTS variants_order_idx ON variants USING btree (_order);
    CREATE INDEX IF NOT EXISTS variants_parent_id_idx ON variants USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS variants_locales_locale_parent_id_unique ON variants_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS notices_key_idx ON notices USING btree (key);
    CREATE INDEX IF NOT EXISTS notices_order_idx ON notices USING btree (_order);
    CREATE INDEX IF NOT EXISTS notices_parent_id_idx ON notices USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS notices_locales_locale_parent_id_unique ON notices_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS dec_rules_key_idx ON dec_rules USING btree (key);
    CREATE INDEX IF NOT EXISTS dec_rules_order_idx ON dec_rules USING btree (_order);
    CREATE INDEX IF NOT EXISTS dec_rules_parent_id_idx ON dec_rules USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS dec_rules_locales_locale_parent_id_unique ON dec_rules_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS dec_rules_when_all_order_idx ON dec_rules_when_all USING btree (_order);
    CREATE INDEX IF NOT EXISTS dec_rules_when_all_parent_id_idx ON dec_rules_when_all USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS dec_rules_when_any_order_idx ON dec_rules_when_any USING btree (_order);
    CREATE INDEX IF NOT EXISTS dec_rules_when_any_parent_id_idx ON dec_rules_when_any USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS fx_order_idx ON fx USING btree (_order);
    CREATE INDEX IF NOT EXISTS fx_parent_id_idx ON fx USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS _questions_v_key_idx ON _questions_v USING btree (key);
    CREATE INDEX IF NOT EXISTS _questions_v_order_idx ON _questions_v USING btree (_order);
    CREATE INDEX IF NOT EXISTS _questions_v_parent_id_idx ON _questions_v USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS _questions_v_locales_locale_parent_id_unique ON _questions_v_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS _questions_v_visible_when_all_order_idx ON _questions_v_visible_when_all USING btree (_order);
    CREATE INDEX IF NOT EXISTS _questions_v_visible_when_all_parent_id_idx ON _questions_v_visible_when_all USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS _questions_v_visible_when_any_order_idx ON _questions_v_visible_when_any USING btree (_order);
    CREATE INDEX IF NOT EXISTS _questions_v_visible_when_any_parent_id_idx ON _questions_v_visible_when_any USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS _qopts_v_key_idx ON _qopts_v USING btree (key);
    CREATE INDEX IF NOT EXISTS _qopts_v_order_idx ON _qopts_v USING btree (_order);
    CREATE INDEX IF NOT EXISTS _qopts_v_parent_id_idx ON _qopts_v USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS _qopts_v_locales_locale_parent_id_unique ON _qopts_v_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS _variants_v_key_idx ON _variants_v USING btree (key);
    CREATE INDEX IF NOT EXISTS _variants_v_order_idx ON _variants_v USING btree (_order);
    CREATE INDEX IF NOT EXISTS _variants_v_parent_id_idx ON _variants_v USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS _variants_v_locales_locale_parent_id_unique ON _variants_v_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS _notices_v_key_idx ON _notices_v USING btree (key);
    CREATE INDEX IF NOT EXISTS _notices_v_order_idx ON _notices_v USING btree (_order);
    CREATE INDEX IF NOT EXISTS _notices_v_parent_id_idx ON _notices_v USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS _notices_v_locales_locale_parent_id_unique ON _notices_v_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS _dec_rules_v_key_idx ON _dec_rules_v USING btree (key);
    CREATE INDEX IF NOT EXISTS _dec_rules_v_order_idx ON _dec_rules_v USING btree (_order);
    CREATE INDEX IF NOT EXISTS _dec_rules_v_parent_id_idx ON _dec_rules_v USING btree (_parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS _dec_rules_v_locales_locale_parent_id_unique ON _dec_rules_v_locales USING btree (_locale, _parent_id);
    CREATE INDEX IF NOT EXISTS _dec_rules_v_when_all_order_idx ON _dec_rules_v_when_all USING btree (_order);
    CREATE INDEX IF NOT EXISTS _dec_rules_v_when_all_parent_id_idx ON _dec_rules_v_when_all USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS _dec_rules_v_when_any_order_idx ON _dec_rules_v_when_any USING btree (_order);
    CREATE INDEX IF NOT EXISTS _dec_rules_v_when_any_parent_id_idx ON _dec_rules_v_when_any USING btree (_parent_id);
    CREATE INDEX IF NOT EXISTS _fx_v_order_idx ON _fx_v USING btree (_order);
    CREATE INDEX IF NOT EXISTS _fx_v_parent_id_idx ON _fx_v USING btree (_parent_id);

    UPDATE req_docs SET key = 'doc_' || id WHERE key IS NULL;
    UPDATE steps SET key = 'step_' || id WHERE key IS NULL;
    UPDATE fees SET key = 'fee_' || id WHERE key IS NULL;
    UPDATE _req_docs_v SET key = 'doc_' || COALESCE(_uuid, id::text) WHERE key IS NULL;
    UPDATE _steps_v SET key = 'step_' || COALESCE(_uuid, id::text) WHERE key IS NULL;
    UPDATE _fees_v SET key = 'fee_' || COALESCE(_uuid, id::text) WHERE key IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_fx_v" CASCADE;
    DROP TABLE IF EXISTS "_dec_rules_v_when_any" CASCADE;
    DROP TABLE IF EXISTS "_dec_rules_v_when_all" CASCADE;
    DROP TABLE IF EXISTS "_dec_rules_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_dec_rules_v" CASCADE;
    DROP TABLE IF EXISTS "_notices_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_notices_v" CASCADE;
    DROP TABLE IF EXISTS "_variants_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_variants_v" CASCADE;
    DROP TABLE IF EXISTS "_qopts_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_qopts_v" CASCADE;
    DROP TABLE IF EXISTS "_questions_v_visible_when_any" CASCADE;
    DROP TABLE IF EXISTS "_questions_v_visible_when_all" CASCADE;
    DROP TABLE IF EXISTS "_questions_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_questions_v" CASCADE;
    DROP TABLE IF EXISTS "fx" CASCADE;
    DROP TABLE IF EXISTS "dec_rules_when_any" CASCADE;
    DROP TABLE IF EXISTS "dec_rules_when_all" CASCADE;
    DROP TABLE IF EXISTS "dec_rules_locales" CASCADE;
    DROP TABLE IF EXISTS "dec_rules" CASCADE;
    DROP TABLE IF EXISTS "notices_locales" CASCADE;
    DROP TABLE IF EXISTS "notices" CASCADE;
    DROP TABLE IF EXISTS "variants_locales" CASCADE;
    DROP TABLE IF EXISTS "variants" CASCADE;
    DROP TABLE IF EXISTS "qopts_locales" CASCADE;
    DROP TABLE IF EXISTS "qopts" CASCADE;
    DROP TABLE IF EXISTS "questions_visible_when_any" CASCADE;
    DROP TABLE IF EXISTS "questions_visible_when_all" CASCADE;
    DROP TABLE IF EXISTS "questions_locales" CASCADE;
    DROP TABLE IF EXISTS "questions" CASCADE;

    ALTER TABLE "tx" DROP COLUMN IF EXISTS "guide_enabled";
    ALTER TABLE "_tx_v" DROP COLUMN IF EXISTS "version_guide_enabled";
    ALTER TABLE "req_docs" DROP COLUMN IF EXISTS "key";
    ALTER TABLE "steps" DROP COLUMN IF EXISTS "key";
    ALTER TABLE "fees" DROP COLUMN IF EXISTS "key";
    ALTER TABLE "_req_docs_v" DROP COLUMN IF EXISTS "key";
    ALTER TABLE "_steps_v" DROP COLUMN IF EXISTS "key";
    ALTER TABLE "_fees_v" DROP COLUMN IF EXISTS "key";

    DROP TYPE IF EXISTS "public"."fx_type";
    DROP TYPE IF EXISTS "public"."sev";
    DROP TYPE IF EXISTS "public"."op";
    DROP TYPE IF EXISTS "public"."qtype";
  `)
}
