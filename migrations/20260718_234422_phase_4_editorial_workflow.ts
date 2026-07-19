import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."tx_cov_sec" AS ENUM('summary', 'eligibility', 'required_documents', 'steps', 'fees', 'duration', 'service_centers', 'outcome', 'other');
  CREATE TYPE "public"."tx_wf_state" AS ENUM('draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived');
  CREATE TYPE "public"."audit_action" AS ENUM('draft_created', 'submitted_for_review', 'changes_requested', 'resubmitted_for_review', 'approved', 'approval_invalidated', 'published', 'unpublished', 'archived', 'archive_restored', 'revision_restored', 'review_date_overridden', 'marked_outdated');
  CREATE TABLE "cov_sec" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "tx_cov_sec",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_cov_sec_v" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "tx_cov_sec",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "audit_ev" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" integer,
  	"action" "audit_action" NOT NULL,
  	"entity_type" varchar NOT NULL,
  	"entity_id" varchar NOT NULL,
  	"transaction_id" integer,
  	"entity_version_id" varchar,
  	"summary" varchar NOT NULL,
  	"before_reference" varchar,
  	"after_reference" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "tx" ADD COLUMN "workflow_state" "tx_wf_state" DEFAULT 'draft';
  ALTER TABLE "tx" ADD COLUMN "submitted_for_review_at" timestamp(3) with time zone;
  ALTER TABLE "tx" ADD COLUMN "submitted_for_review_by_id" integer;
  ALTER TABLE "tx" ADD COLUMN "change_requested_at" timestamp(3) with time zone;
  ALTER TABLE "tx" ADD COLUMN "change_requested_by_id" integer;
  ALTER TABLE "tx" ADD COLUMN "change_request_comment" varchar;
  ALTER TABLE "tx" ADD COLUMN "approved_at" timestamp(3) with time zone;
  ALTER TABLE "tx" ADD COLUMN "approved_by_id" integer;
  ALTER TABLE "tx" ADD COLUMN "approved_content_hash" varchar;
  ALTER TABLE "tx" ADD COLUMN "approved_version_id" varchar;
  ALTER TABLE "tx" ADD COLUMN "review_interval_days" numeric;
  ALTER TABLE "tx" ADD COLUMN "review_due_at" timestamp(3) with time zone;
  ALTER TABLE "tx" ADD COLUMN "review_due_override_reason" varchar;
  ALTER TABLE "tx" ADD COLUMN "marked_outdated" boolean DEFAULT false;
  ALTER TABLE "tx" ADD COLUMN "archived_at" timestamp(3) with time zone;
  ALTER TABLE "tx" ADD COLUMN "archived_by_id" integer;
  ALTER TABLE "tx" ADD COLUMN "archive_reason" varchar;
  ALTER TABLE "tx" ADD COLUMN "workflow_schema_version" numeric DEFAULT 1;
  ALTER TABLE "_tx_v" ADD COLUMN "version_workflow_state" "tx_wf_state" DEFAULT 'draft';
  ALTER TABLE "_tx_v" ADD COLUMN "version_submitted_for_review_at" timestamp(3) with time zone;
  ALTER TABLE "_tx_v" ADD COLUMN "version_submitted_for_review_by_id" integer;
  ALTER TABLE "_tx_v" ADD COLUMN "version_change_requested_at" timestamp(3) with time zone;
  ALTER TABLE "_tx_v" ADD COLUMN "version_change_requested_by_id" integer;
  ALTER TABLE "_tx_v" ADD COLUMN "version_change_request_comment" varchar;
  ALTER TABLE "_tx_v" ADD COLUMN "version_approved_at" timestamp(3) with time zone;
  ALTER TABLE "_tx_v" ADD COLUMN "version_approved_by_id" integer;
  ALTER TABLE "_tx_v" ADD COLUMN "version_approved_content_hash" varchar;
  ALTER TABLE "_tx_v" ADD COLUMN "version_approved_version_id" varchar;
  ALTER TABLE "_tx_v" ADD COLUMN "version_review_interval_days" numeric;
  ALTER TABLE "_tx_v" ADD COLUMN "version_review_due_at" timestamp(3) with time zone;
  ALTER TABLE "_tx_v" ADD COLUMN "version_review_due_override_reason" varchar;
  ALTER TABLE "_tx_v" ADD COLUMN "version_marked_outdated" boolean DEFAULT false;
  ALTER TABLE "_tx_v" ADD COLUMN "version_archived_at" timestamp(3) with time zone;
  ALTER TABLE "_tx_v" ADD COLUMN "version_archived_by_id" integer;
  ALTER TABLE "_tx_v" ADD COLUMN "version_archive_reason" varchar;
  ALTER TABLE "_tx_v" ADD COLUMN "version_workflow_schema_version" numeric DEFAULT 1;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_ev_id" integer;
  ALTER TABLE "cov_sec" ADD CONSTRAINT "cov_sec_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."srcs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cov_sec_v" ADD CONSTRAINT "_cov_sec_v_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_srcs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_ev" ADD CONSTRAINT "audit_ev_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_ev" ADD CONSTRAINT "audit_ev_transaction_id_tx_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."tx"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cov_sec_order_idx" ON "cov_sec" USING btree ("order");
  CREATE INDEX "cov_sec_parent_idx" ON "cov_sec" USING btree ("parent_id");
  CREATE INDEX "_cov_sec_v_order_idx" ON "_cov_sec_v" USING btree ("order");
  CREATE INDEX "_cov_sec_v_parent_idx" ON "_cov_sec_v" USING btree ("parent_id");
  CREATE INDEX "audit_ev_actor_idx" ON "audit_ev" USING btree ("actor_id");
  CREATE INDEX "audit_ev_entity_id_idx" ON "audit_ev" USING btree ("entity_id");
  CREATE INDEX "audit_ev_transaction_idx" ON "audit_ev" USING btree ("transaction_id");
  CREATE INDEX "audit_ev_updated_at_idx" ON "audit_ev" USING btree ("updated_at");
  CREATE INDEX "audit_ev_created_at_idx" ON "audit_ev" USING btree ("created_at");
  ALTER TABLE "tx" ADD CONSTRAINT "tx_submitted_for_review_by_id_users_id_fk" FOREIGN KEY ("submitted_for_review_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_change_requested_by_id_users_id_fk" FOREIGN KEY ("change_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_archived_by_id_users_id_fk" FOREIGN KEY ("archived_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_submitted_for_review_by_id_users_id_fk" FOREIGN KEY ("version_submitted_for_review_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_change_requested_by_id_users_id_fk" FOREIGN KEY ("version_change_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_approved_by_id_users_id_fk" FOREIGN KEY ("version_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_archived_by_id_users_id_fk" FOREIGN KEY ("version_archived_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_events_fk" FOREIGN KEY ("audit_ev_id") REFERENCES "public"."audit_ev"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tx_workflow_state_idx" ON "tx" USING btree ("workflow_state");
  CREATE INDEX "tx_submitted_for_review_by_idx" ON "tx" USING btree ("submitted_for_review_by_id");
  CREATE INDEX "tx_change_requested_by_idx" ON "tx" USING btree ("change_requested_by_id");
  CREATE INDEX "tx_approved_by_idx" ON "tx" USING btree ("approved_by_id");
  CREATE INDEX "tx_archived_by_idx" ON "tx" USING btree ("archived_by_id");
  CREATE INDEX "_tx_v_version_version_workflow_state_idx" ON "_tx_v" USING btree ("version_workflow_state");
  CREATE INDEX "_tx_v_version_version_submitted_for_review_by_idx" ON "_tx_v" USING btree ("version_submitted_for_review_by_id");
  CREATE INDEX "_tx_v_version_version_change_requested_by_idx" ON "_tx_v" USING btree ("version_change_requested_by_id");
  CREATE INDEX "_tx_v_version_version_approved_by_idx" ON "_tx_v" USING btree ("version_approved_by_id");
  CREATE INDEX "_tx_v_version_version_archived_by_idx" ON "_tx_v" USING btree ("version_archived_by_id");
  CREATE INDEX "payload_locked_documents_rels_audit_ev_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_ev_id");`)

  // Backfill: published Phase 3 rows → workflow published
  await db.execute(sql`
    UPDATE "tx" SET "workflow_state" = 'published'
    WHERE "_status" = 'published' AND ("workflow_state" IS NULL OR "workflow_state" = 'draft');
    UPDATE "_tx_v" SET "version_workflow_state" = 'published'
    WHERE "version__status" = 'published'
      AND ("version_workflow_state" IS NULL OR "version_workflow_state" = 'draft');
  `)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cov_sec" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cov_sec_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_ev" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cov_sec" CASCADE;
  DROP TABLE "_cov_sec_v" CASCADE;
  DROP TABLE "audit_ev" CASCADE;
  ALTER TABLE "tx" DROP CONSTRAINT "tx_submitted_for_review_by_id_users_id_fk";
  
  ALTER TABLE "tx" DROP CONSTRAINT "tx_change_requested_by_id_users_id_fk";
  
  ALTER TABLE "tx" DROP CONSTRAINT "tx_approved_by_id_users_id_fk";
  
  ALTER TABLE "tx" DROP CONSTRAINT "tx_archived_by_id_users_id_fk";
  
  ALTER TABLE "_tx_v" DROP CONSTRAINT "_tx_v_version_submitted_for_review_by_id_users_id_fk";
  
  ALTER TABLE "_tx_v" DROP CONSTRAINT "_tx_v_version_change_requested_by_id_users_id_fk";
  
  ALTER TABLE "_tx_v" DROP CONSTRAINT "_tx_v_version_approved_by_id_users_id_fk";
  
  ALTER TABLE "_tx_v" DROP CONSTRAINT "_tx_v_version_archived_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_events_fk";
  
  DROP INDEX "tx_workflow_state_idx";
  DROP INDEX "tx_submitted_for_review_by_idx";
  DROP INDEX "tx_change_requested_by_idx";
  DROP INDEX "tx_approved_by_idx";
  DROP INDEX "tx_archived_by_idx";
  DROP INDEX "_tx_v_version_version_workflow_state_idx";
  DROP INDEX "_tx_v_version_version_submitted_for_review_by_idx";
  DROP INDEX "_tx_v_version_version_change_requested_by_idx";
  DROP INDEX "_tx_v_version_version_approved_by_idx";
  DROP INDEX "_tx_v_version_version_archived_by_idx";
  DROP INDEX "payload_locked_documents_rels_audit_ev_id_idx";
  ALTER TABLE "tx" DROP COLUMN "workflow_state";
  ALTER TABLE "tx" DROP COLUMN "submitted_for_review_at";
  ALTER TABLE "tx" DROP COLUMN "submitted_for_review_by_id";
  ALTER TABLE "tx" DROP COLUMN "change_requested_at";
  ALTER TABLE "tx" DROP COLUMN "change_requested_by_id";
  ALTER TABLE "tx" DROP COLUMN "change_request_comment";
  ALTER TABLE "tx" DROP COLUMN "approved_at";
  ALTER TABLE "tx" DROP COLUMN "approved_by_id";
  ALTER TABLE "tx" DROP COLUMN "approved_content_hash";
  ALTER TABLE "tx" DROP COLUMN "approved_version_id";
  ALTER TABLE "tx" DROP COLUMN "review_interval_days";
  ALTER TABLE "tx" DROP COLUMN "review_due_at";
  ALTER TABLE "tx" DROP COLUMN "review_due_override_reason";
  ALTER TABLE "tx" DROP COLUMN "marked_outdated";
  ALTER TABLE "tx" DROP COLUMN "archived_at";
  ALTER TABLE "tx" DROP COLUMN "archived_by_id";
  ALTER TABLE "tx" DROP COLUMN "archive_reason";
  ALTER TABLE "tx" DROP COLUMN "workflow_schema_version";
  ALTER TABLE "_tx_v" DROP COLUMN "version_workflow_state";
  ALTER TABLE "_tx_v" DROP COLUMN "version_submitted_for_review_at";
  ALTER TABLE "_tx_v" DROP COLUMN "version_submitted_for_review_by_id";
  ALTER TABLE "_tx_v" DROP COLUMN "version_change_requested_at";
  ALTER TABLE "_tx_v" DROP COLUMN "version_change_requested_by_id";
  ALTER TABLE "_tx_v" DROP COLUMN "version_change_request_comment";
  ALTER TABLE "_tx_v" DROP COLUMN "version_approved_at";
  ALTER TABLE "_tx_v" DROP COLUMN "version_approved_by_id";
  ALTER TABLE "_tx_v" DROP COLUMN "version_approved_content_hash";
  ALTER TABLE "_tx_v" DROP COLUMN "version_approved_version_id";
  ALTER TABLE "_tx_v" DROP COLUMN "version_review_interval_days";
  ALTER TABLE "_tx_v" DROP COLUMN "version_review_due_at";
  ALTER TABLE "_tx_v" DROP COLUMN "version_review_due_override_reason";
  ALTER TABLE "_tx_v" DROP COLUMN "version_marked_outdated";
  ALTER TABLE "_tx_v" DROP COLUMN "version_archived_at";
  ALTER TABLE "_tx_v" DROP COLUMN "version_archived_by_id";
  ALTER TABLE "_tx_v" DROP COLUMN "version_archive_reason";
  ALTER TABLE "_tx_v" DROP COLUMN "version_workflow_schema_version";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_ev_id";
  DROP TYPE "public"."tx_cov_sec";
  DROP TYPE "public"."tx_wf_state";
  DROP TYPE "public"."audit_action";`)
}
