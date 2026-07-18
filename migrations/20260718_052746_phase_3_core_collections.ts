import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'reviewer', 'researcher', 'viewer');
  CREATE TYPE "public"."enum_users_preferred_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_categories_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__categories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__categories_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_agencies_type" AS ENUM('ministry', 'directorate', 'public_institution', 'municipality', 'syndicate', 'university', 'other');
  CREATE TYPE "public"."enum_agencies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__agencies_v_version_type" AS ENUM('ministry', 'directorate', 'public_institution', 'municipality', 'syndicate', 'university', 'other');
  CREATE TYPE "public"."enum__agencies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__agencies_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."gov" AS ENUM('damascus', 'rif_dimashq', 'aleppo', 'homs', 'hama', 'latakia', 'tartus', 'idlib', 'deir_ez_zor', 'al_hasakah', 'al_raqqah', 'daraa', 'as_suwayda', 'quneitra');
  CREATE TYPE "public"."enum_svc_centers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__svc_centers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__svc_centers_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."dtype" AS ENUM('identity', 'civil_record', 'application', 'photograph', 'receipt', 'certificate', 'approval', 'contract', 'form', 'other');
  CREATE TYPE "public"."enum_documents_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__documents_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__documents_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."stype" AS ENUM('official_webpage', 'law', 'decree', 'decision', 'circular', 'official_form', 'official_pdf', 'announcement', 'other');
  CREATE TYPE "public"."vstatus" AS ENUM('needs_review', 'verified', 'outdated', 'unavailable');
  CREATE TYPE "public"."enum_sources_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."tx_audience" AS ENUM('citizen', 'resident', 'student', 'employee', 'business', 'visitor', 'other');
  CREATE TYPE "public"."rtype" AS ENUM('required', 'conditional', 'alternative');
  CREATE TYPE "public"."cur" AS ENUM('SYP', 'USD', 'EUR', 'other');
  CREATE TYPE "public"."unit" AS ENUM('minutes', 'hours', 'business_days', 'calendar_days', 'weeks');
  CREATE TYPE "public"."enum_tx_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tx_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tx_v_published_locale" AS ENUM('ar', 'en');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"display_name" varchar,
  	"role" "enum_users_role" DEFAULT 'researcher' NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"preferred_locale" "enum_users_preferred_locale" DEFAULT 'ar',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"parent_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"featured" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"last_updated_by_id" integer,
  	"published_by_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_categories_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "categories_locales" (
  	"name" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_categories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_parent_id" integer,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_featured" boolean DEFAULT false,
  	"version_active" boolean DEFAULT true,
  	"version_created_by_id" integer,
  	"version_last_updated_by_id" integer,
  	"version_published_by_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__categories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__categories_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_categories_v_locales" (
  	"version_name" varchar,
  	"version_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "agencies_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar
  );
  
  CREATE TABLE "agencies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"type" "enum_agencies_type",
  	"official_website" varchar,
  	"contact_email" varchar,
  	"active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"last_updated_by_id" integer,
  	"published_by_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_agencies_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "agencies_locales" (
  	"name" varchar,
  	"short_name" varchar,
  	"description" varchar,
  	"main_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_agencies_v_version_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_agencies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_type" "enum__agencies_v_version_type",
  	"version_official_website" varchar,
  	"version_contact_email" varchar,
  	"version_active" boolean DEFAULT true,
  	"version_created_by_id" integer,
  	"version_last_updated_by_id" integer,
  	"version_published_by_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__agencies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__agencies_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_agencies_v_locales" (
  	"version_name" varchar,
  	"version_short_name" varchar,
  	"version_description" varchar,
  	"version_main_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "svc_centers_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar
  );
  
  CREATE TABLE "svc_centers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"agency_id" integer,
  	"governorate" "gov",
  	"latitude" numeric,
  	"longitude" numeric,
  	"active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"last_updated_by_id" integer,
  	"published_by_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_svc_centers_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "svc_centers_locales" (
  	"name" varchar,
  	"city" varchar,
  	"address" varchar,
  	"working_hours" varchar,
  	"accessibility_notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_svc_centers_v_version_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_svc_centers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_agency_id" integer,
  	"version_governorate" "gov",
  	"version_latitude" numeric,
  	"version_longitude" numeric,
  	"version_active" boolean DEFAULT true,
  	"version_created_by_id" integer,
  	"version_last_updated_by_id" integer,
  	"version_published_by_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__svc_centers_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__svc_centers_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_svc_centers_v_locales" (
  	"version_name" varchar,
  	"version_city" varchar,
  	"version_address" varchar,
  	"version_working_hours" varchar,
  	"version_accessibility_notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "documents_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "documents_aliases_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"document_type" "dtype",
  	"reusable" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"last_updated_by_id" integer,
  	"published_by_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_documents_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "documents_locales" (
  	"name" varchar,
  	"description" varchar,
  	"validity_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_documents_v_version_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_documents_v_version_aliases_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_documents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_document_type" "dtype",
  	"version_reusable" boolean DEFAULT false,
  	"version_active" boolean DEFAULT true,
  	"version_created_by_id" integer,
  	"version_last_updated_by_id" integer,
  	"version_published_by_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__documents_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__documents_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_documents_v_locales" (
  	"version_name" varchar,
  	"version_description" varchar,
  	"version_validity_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"source_type" "stype",
  	"agency_id" integer,
  	"official_url" varchar,
  	"archive_url" varchar,
  	"reference_number" varchar,
  	"issued_at" timestamp(3) with time zone,
  	"last_verified_at" timestamp(3) with time zone,
  	"verification_status" "vstatus" DEFAULT 'needs_review',
  	"active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"last_updated_by_id" integer,
  	"published_by_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_sources_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "sources_locales" (
  	"title" varchar,
  	"notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_sources_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_source_type" "stype",
  	"version_agency_id" integer,
  	"version_official_url" varchar,
  	"version_archive_url" varchar,
  	"version_reference_number" varchar,
  	"version_issued_at" timestamp(3) with time zone,
  	"version_last_verified_at" timestamp(3) with time zone,
  	"version_verification_status" "vstatus" DEFAULT 'needs_review',
  	"version_active" boolean DEFAULT true,
  	"version_created_by_id" integer,
  	"version_last_updated_by_id" integer,
  	"version_published_by_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__sources_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__sources_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_sources_v_locales" (
  	"version_title" varchar,
  	"version_notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tx_audiences" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "tx_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tx_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tx_aliases_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "req_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"document_id" integer,
  	"requirement_type" "rtype",
  	"quantity" numeric DEFAULT 1,
  	"original_required" boolean DEFAULT false,
  	"copies_required" numeric DEFAULT 0,
  	"certification_required" boolean DEFAULT false
  );
  
  CREATE TABLE "req_docs_locales" (
  	"condition" varchar,
  	"notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "steps_locales" (
  	"title" varchar,
  	"description" varchar,
  	"location_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "fees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"amount" numeric,
  	"currency" "cur"
  );
  
  CREATE TABLE "fees_locales" (
  	"label" varchar,
  	"amount_text" varchar,
  	"notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "srcs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"primary" boolean DEFAULT false
  );
  
  CREATE TABLE "srcs_locales" (
  	"citation_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tx" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"category_id" integer,
  	"agency_id" integer,
  	"estimated_duration_minimum" numeric,
  	"estimated_duration_maximum" numeric,
  	"estimated_duration_unit" "unit",
  	"last_reviewed_at" timestamp(3) with time zone,
  	"internal_notes" varchar,
  	"active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"last_updated_by_id" integer,
  	"published_by_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tx_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "tx_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"eligibility" varchar,
  	"estimated_duration_note" varchar,
  	"outcome" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tx_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"svc_centers_id" integer,
  	"tx_id" integer
  );
  
  CREATE TABLE "_tx_v_version_audiences" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "tx_audience",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_tx_v_version_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tx_v_version_aliases_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_req_docs_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"document_id" integer,
  	"requirement_type" "rtype",
  	"quantity" numeric DEFAULT 1,
  	"original_required" boolean DEFAULT false,
  	"copies_required" numeric DEFAULT 0,
  	"certification_required" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_req_docs_v_locales" (
  	"condition" varchar,
  	"notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_steps_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_steps_v_locales" (
  	"title" varchar,
  	"description" varchar,
  	"location_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_fees_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"amount" numeric,
  	"currency" "cur",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_fees_v_locales" (
  	"label" varchar,
  	"amount_text" varchar,
  	"notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_srcs_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"primary" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_srcs_v_locales" (
  	"citation_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tx_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_category_id" integer,
  	"version_agency_id" integer,
  	"version_estimated_duration_minimum" numeric,
  	"version_estimated_duration_maximum" numeric,
  	"version_estimated_duration_unit" "unit",
  	"version_last_reviewed_at" timestamp(3) with time zone,
  	"version_internal_notes" varchar,
  	"version_active" boolean DEFAULT true,
  	"version_created_by_id" integer,
  	"version_last_updated_by_id" integer,
  	"version_published_by_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tx_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__tx_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_tx_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_eligibility" varchar,
  	"version_estimated_duration_note" varchar,
  	"version_outcome" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tx_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"svc_centers_id" integer,
  	"tx_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"categories_id" integer,
  	"agencies_id" integer,
  	"svc_centers_id" integer,
  	"documents_id" integer,
  	"sources_id" integer,
  	"tx_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_parent_id_categories_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_last_updated_by_id_users_id_fk" FOREIGN KEY ("version_last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v_locales" ADD CONSTRAINT "_categories_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_categories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agencies_phones" ADD CONSTRAINT "agencies_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agencies" ADD CONSTRAINT "agencies_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agencies" ADD CONSTRAINT "agencies_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agencies" ADD CONSTRAINT "agencies_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agencies_locales" ADD CONSTRAINT "agencies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_agencies_v_version_phones" ADD CONSTRAINT "_agencies_v_version_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_agencies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_agencies_v" ADD CONSTRAINT "_agencies_v_parent_id_agencies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agencies_v" ADD CONSTRAINT "_agencies_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agencies_v" ADD CONSTRAINT "_agencies_v_version_last_updated_by_id_users_id_fk" FOREIGN KEY ("version_last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agencies_v" ADD CONSTRAINT "_agencies_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_agencies_v_locales" ADD CONSTRAINT "_agencies_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_agencies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "svc_centers_phones" ADD CONSTRAINT "svc_centers_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."svc_centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "svc_centers" ADD CONSTRAINT "svc_centers_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "svc_centers" ADD CONSTRAINT "svc_centers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "svc_centers" ADD CONSTRAINT "svc_centers_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "svc_centers" ADD CONSTRAINT "svc_centers_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "svc_centers_locales" ADD CONSTRAINT "svc_centers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."svc_centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_svc_centers_v_version_phones" ADD CONSTRAINT "_svc_centers_v_version_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_svc_centers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_svc_centers_v" ADD CONSTRAINT "_svc_centers_v_parent_id_svc_centers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."svc_centers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_svc_centers_v" ADD CONSTRAINT "_svc_centers_v_version_agency_id_agencies_id_fk" FOREIGN KEY ("version_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_svc_centers_v" ADD CONSTRAINT "_svc_centers_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_svc_centers_v" ADD CONSTRAINT "_svc_centers_v_version_last_updated_by_id_users_id_fk" FOREIGN KEY ("version_last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_svc_centers_v" ADD CONSTRAINT "_svc_centers_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_svc_centers_v_locales" ADD CONSTRAINT "_svc_centers_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_svc_centers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents_aliases" ADD CONSTRAINT "documents_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents_aliases_locales" ADD CONSTRAINT "documents_aliases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."documents_aliases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents_locales" ADD CONSTRAINT "documents_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_documents_v_version_aliases" ADD CONSTRAINT "_documents_v_version_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_documents_v_version_aliases_locales" ADD CONSTRAINT "_documents_v_version_aliases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_documents_v_version_aliases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_parent_id_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_last_updated_by_id_users_id_fk" FOREIGN KEY ("version_last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v_locales" ADD CONSTRAINT "_documents_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sources" ADD CONSTRAINT "sources_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources" ADD CONSTRAINT "sources_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources" ADD CONSTRAINT "sources_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources_locales" ADD CONSTRAINT "sources_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_parent_id_sources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_version_agency_id_agencies_id_fk" FOREIGN KEY ("version_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_version_last_updated_by_id_users_id_fk" FOREIGN KEY ("version_last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v_locales" ADD CONSTRAINT "_sources_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_sources_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tx_audiences" ADD CONSTRAINT "tx_audiences_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tx_aliases" ADD CONSTRAINT "tx_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tx_aliases_locales" ADD CONSTRAINT "tx_aliases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx_aliases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "req_docs" ADD CONSTRAINT "req_docs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "req_docs" ADD CONSTRAINT "req_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "req_docs_locales" ADD CONSTRAINT "req_docs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."req_docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "steps" ADD CONSTRAINT "steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "steps_locales" ADD CONSTRAINT "steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fees" ADD CONSTRAINT "fees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fees_locales" ADD CONSTRAINT "fees_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."fees"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "srcs" ADD CONSTRAINT "srcs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "srcs" ADD CONSTRAINT "srcs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "srcs_locales" ADD CONSTRAINT "srcs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."srcs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_last_updated_by_id_users_id_fk" FOREIGN KEY ("last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx" ADD CONSTRAINT "tx_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tx_locales" ADD CONSTRAINT "tx_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tx_rels" ADD CONSTRAINT "tx_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tx_rels" ADD CONSTRAINT "tx_rels_service_centers_fk" FOREIGN KEY ("svc_centers_id") REFERENCES "public"."svc_centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tx_rels" ADD CONSTRAINT "tx_rels_transactions_fk" FOREIGN KEY ("tx_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tx_v_version_audiences" ADD CONSTRAINT "_tx_v_version_audiences_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tx_v_version_aliases" ADD CONSTRAINT "_tx_v_version_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tx_v_version_aliases_locales" ADD CONSTRAINT "_tx_v_version_aliases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v_version_aliases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_req_docs_v" ADD CONSTRAINT "_req_docs_v_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_req_docs_v" ADD CONSTRAINT "_req_docs_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_req_docs_v_locales" ADD CONSTRAINT "_req_docs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_req_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_steps_v" ADD CONSTRAINT "_steps_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_steps_v_locales" ADD CONSTRAINT "_steps_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_steps_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_fees_v" ADD CONSTRAINT "_fees_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_fees_v_locales" ADD CONSTRAINT "_fees_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_fees_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_srcs_v" ADD CONSTRAINT "_srcs_v_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_srcs_v" ADD CONSTRAINT "_srcs_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_srcs_v_locales" ADD CONSTRAINT "_srcs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_srcs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_parent_id_tx_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tx"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_agency_id_agencies_id_fk" FOREIGN KEY ("version_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_last_updated_by_id_users_id_fk" FOREIGN KEY ("version_last_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v" ADD CONSTRAINT "_tx_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tx_v_locales" ADD CONSTRAINT "_tx_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tx_v_rels" ADD CONSTRAINT "_tx_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tx_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tx_v_rels" ADD CONSTRAINT "_tx_v_rels_service_centers_fk" FOREIGN KEY ("svc_centers_id") REFERENCES "public"."svc_centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tx_v_rels" ADD CONSTRAINT "_tx_v_rels_transactions_fk" FOREIGN KEY ("tx_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agencies_fk" FOREIGN KEY ("agencies_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_service_centers_fk" FOREIGN KEY ("svc_centers_id") REFERENCES "public"."svc_centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("tx_id") REFERENCES "public"."tx"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_sort_order_idx" ON "categories" USING btree ("sort_order");
  CREATE INDEX "categories_created_by_idx" ON "categories" USING btree ("created_by_id");
  CREATE INDEX "categories_last_updated_by_idx" ON "categories" USING btree ("last_updated_by_id");
  CREATE INDEX "categories_published_by_idx" ON "categories" USING btree ("published_by_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "categories__status_idx" ON "categories" USING btree ("_status");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_categories_v_parent_idx" ON "_categories_v" USING btree ("parent_id");
  CREATE INDEX "_categories_v_version_version_slug_idx" ON "_categories_v" USING btree ("version_slug");
  CREATE INDEX "_categories_v_version_version_parent_idx" ON "_categories_v" USING btree ("version_parent_id");
  CREATE INDEX "_categories_v_version_version_sort_order_idx" ON "_categories_v" USING btree ("version_sort_order");
  CREATE INDEX "_categories_v_version_version_created_by_idx" ON "_categories_v" USING btree ("version_created_by_id");
  CREATE INDEX "_categories_v_version_version_last_updated_by_idx" ON "_categories_v" USING btree ("version_last_updated_by_id");
  CREATE INDEX "_categories_v_version_version_published_by_idx" ON "_categories_v" USING btree ("version_published_by_id");
  CREATE INDEX "_categories_v_version_version_updated_at_idx" ON "_categories_v" USING btree ("version_updated_at");
  CREATE INDEX "_categories_v_version_version_created_at_idx" ON "_categories_v" USING btree ("version_created_at");
  CREATE INDEX "_categories_v_version_version__status_idx" ON "_categories_v" USING btree ("version__status");
  CREATE INDEX "_categories_v_created_at_idx" ON "_categories_v" USING btree ("created_at");
  CREATE INDEX "_categories_v_updated_at_idx" ON "_categories_v" USING btree ("updated_at");
  CREATE INDEX "_categories_v_snapshot_idx" ON "_categories_v" USING btree ("snapshot");
  CREATE INDEX "_categories_v_published_locale_idx" ON "_categories_v" USING btree ("published_locale");
  CREATE INDEX "_categories_v_latest_idx" ON "_categories_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_categories_v_locales_locale_parent_id_unique" ON "_categories_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "agencies_phones_order_idx" ON "agencies_phones" USING btree ("_order");
  CREATE INDEX "agencies_phones_parent_id_idx" ON "agencies_phones" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "agencies_slug_idx" ON "agencies" USING btree ("slug");
  CREATE INDEX "agencies_created_by_idx" ON "agencies" USING btree ("created_by_id");
  CREATE INDEX "agencies_last_updated_by_idx" ON "agencies" USING btree ("last_updated_by_id");
  CREATE INDEX "agencies_published_by_idx" ON "agencies" USING btree ("published_by_id");
  CREATE INDEX "agencies_updated_at_idx" ON "agencies" USING btree ("updated_at");
  CREATE INDEX "agencies_created_at_idx" ON "agencies" USING btree ("created_at");
  CREATE INDEX "agencies__status_idx" ON "agencies" USING btree ("_status");
  CREATE UNIQUE INDEX "agencies_locales_locale_parent_id_unique" ON "agencies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_agencies_v_version_phones_order_idx" ON "_agencies_v_version_phones" USING btree ("_order");
  CREATE INDEX "_agencies_v_version_phones_parent_id_idx" ON "_agencies_v_version_phones" USING btree ("_parent_id");
  CREATE INDEX "_agencies_v_parent_idx" ON "_agencies_v" USING btree ("parent_id");
  CREATE INDEX "_agencies_v_version_version_slug_idx" ON "_agencies_v" USING btree ("version_slug");
  CREATE INDEX "_agencies_v_version_version_created_by_idx" ON "_agencies_v" USING btree ("version_created_by_id");
  CREATE INDEX "_agencies_v_version_version_last_updated_by_idx" ON "_agencies_v" USING btree ("version_last_updated_by_id");
  CREATE INDEX "_agencies_v_version_version_published_by_idx" ON "_agencies_v" USING btree ("version_published_by_id");
  CREATE INDEX "_agencies_v_version_version_updated_at_idx" ON "_agencies_v" USING btree ("version_updated_at");
  CREATE INDEX "_agencies_v_version_version_created_at_idx" ON "_agencies_v" USING btree ("version_created_at");
  CREATE INDEX "_agencies_v_version_version__status_idx" ON "_agencies_v" USING btree ("version__status");
  CREATE INDEX "_agencies_v_created_at_idx" ON "_agencies_v" USING btree ("created_at");
  CREATE INDEX "_agencies_v_updated_at_idx" ON "_agencies_v" USING btree ("updated_at");
  CREATE INDEX "_agencies_v_snapshot_idx" ON "_agencies_v" USING btree ("snapshot");
  CREATE INDEX "_agencies_v_published_locale_idx" ON "_agencies_v" USING btree ("published_locale");
  CREATE INDEX "_agencies_v_latest_idx" ON "_agencies_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_agencies_v_locales_locale_parent_id_unique" ON "_agencies_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "svc_centers_phones_order_idx" ON "svc_centers_phones" USING btree ("_order");
  CREATE INDEX "svc_centers_phones_parent_id_idx" ON "svc_centers_phones" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "svc_centers_slug_idx" ON "svc_centers" USING btree ("slug");
  CREATE INDEX "svc_centers_agency_idx" ON "svc_centers" USING btree ("agency_id");
  CREATE INDEX "svc_centers_created_by_idx" ON "svc_centers" USING btree ("created_by_id");
  CREATE INDEX "svc_centers_last_updated_by_idx" ON "svc_centers" USING btree ("last_updated_by_id");
  CREATE INDEX "svc_centers_published_by_idx" ON "svc_centers" USING btree ("published_by_id");
  CREATE INDEX "svc_centers_updated_at_idx" ON "svc_centers" USING btree ("updated_at");
  CREATE INDEX "svc_centers_created_at_idx" ON "svc_centers" USING btree ("created_at");
  CREATE INDEX "svc_centers__status_idx" ON "svc_centers" USING btree ("_status");
  CREATE UNIQUE INDEX "svc_centers_locales_locale_parent_id_unique" ON "svc_centers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_svc_centers_v_version_phones_order_idx" ON "_svc_centers_v_version_phones" USING btree ("_order");
  CREATE INDEX "_svc_centers_v_version_phones_parent_id_idx" ON "_svc_centers_v_version_phones" USING btree ("_parent_id");
  CREATE INDEX "_svc_centers_v_parent_idx" ON "_svc_centers_v" USING btree ("parent_id");
  CREATE INDEX "_svc_centers_v_version_version_slug_idx" ON "_svc_centers_v" USING btree ("version_slug");
  CREATE INDEX "_svc_centers_v_version_version_agency_idx" ON "_svc_centers_v" USING btree ("version_agency_id");
  CREATE INDEX "_svc_centers_v_version_version_created_by_idx" ON "_svc_centers_v" USING btree ("version_created_by_id");
  CREATE INDEX "_svc_centers_v_version_version_last_updated_by_idx" ON "_svc_centers_v" USING btree ("version_last_updated_by_id");
  CREATE INDEX "_svc_centers_v_version_version_published_by_idx" ON "_svc_centers_v" USING btree ("version_published_by_id");
  CREATE INDEX "_svc_centers_v_version_version_updated_at_idx" ON "_svc_centers_v" USING btree ("version_updated_at");
  CREATE INDEX "_svc_centers_v_version_version_created_at_idx" ON "_svc_centers_v" USING btree ("version_created_at");
  CREATE INDEX "_svc_centers_v_version_version__status_idx" ON "_svc_centers_v" USING btree ("version__status");
  CREATE INDEX "_svc_centers_v_created_at_idx" ON "_svc_centers_v" USING btree ("created_at");
  CREATE INDEX "_svc_centers_v_updated_at_idx" ON "_svc_centers_v" USING btree ("updated_at");
  CREATE INDEX "_svc_centers_v_snapshot_idx" ON "_svc_centers_v" USING btree ("snapshot");
  CREATE INDEX "_svc_centers_v_published_locale_idx" ON "_svc_centers_v" USING btree ("published_locale");
  CREATE INDEX "_svc_centers_v_latest_idx" ON "_svc_centers_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_svc_centers_v_locales_locale_parent_id_unique" ON "_svc_centers_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "documents_aliases_order_idx" ON "documents_aliases" USING btree ("_order");
  CREATE INDEX "documents_aliases_parent_id_idx" ON "documents_aliases" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "documents_aliases_locales_locale_parent_id_unique" ON "documents_aliases_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "documents_slug_idx" ON "documents" USING btree ("slug");
  CREATE INDEX "documents_created_by_idx" ON "documents" USING btree ("created_by_id");
  CREATE INDEX "documents_last_updated_by_idx" ON "documents" USING btree ("last_updated_by_id");
  CREATE INDEX "documents_published_by_idx" ON "documents" USING btree ("published_by_id");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE INDEX "documents__status_idx" ON "documents" USING btree ("_status");
  CREATE UNIQUE INDEX "documents_locales_locale_parent_id_unique" ON "documents_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_documents_v_version_aliases_order_idx" ON "_documents_v_version_aliases" USING btree ("_order");
  CREATE INDEX "_documents_v_version_aliases_parent_id_idx" ON "_documents_v_version_aliases" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_documents_v_version_aliases_locales_locale_parent_id_unique" ON "_documents_v_version_aliases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_documents_v_parent_idx" ON "_documents_v" USING btree ("parent_id");
  CREATE INDEX "_documents_v_version_version_slug_idx" ON "_documents_v" USING btree ("version_slug");
  CREATE INDEX "_documents_v_version_version_created_by_idx" ON "_documents_v" USING btree ("version_created_by_id");
  CREATE INDEX "_documents_v_version_version_last_updated_by_idx" ON "_documents_v" USING btree ("version_last_updated_by_id");
  CREATE INDEX "_documents_v_version_version_published_by_idx" ON "_documents_v" USING btree ("version_published_by_id");
  CREATE INDEX "_documents_v_version_version_updated_at_idx" ON "_documents_v" USING btree ("version_updated_at");
  CREATE INDEX "_documents_v_version_version_created_at_idx" ON "_documents_v" USING btree ("version_created_at");
  CREATE INDEX "_documents_v_version_version__status_idx" ON "_documents_v" USING btree ("version__status");
  CREATE INDEX "_documents_v_created_at_idx" ON "_documents_v" USING btree ("created_at");
  CREATE INDEX "_documents_v_updated_at_idx" ON "_documents_v" USING btree ("updated_at");
  CREATE INDEX "_documents_v_snapshot_idx" ON "_documents_v" USING btree ("snapshot");
  CREATE INDEX "_documents_v_published_locale_idx" ON "_documents_v" USING btree ("published_locale");
  CREATE INDEX "_documents_v_latest_idx" ON "_documents_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_documents_v_locales_locale_parent_id_unique" ON "_documents_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "sources_slug_idx" ON "sources" USING btree ("slug");
  CREATE INDEX "sources_agency_idx" ON "sources" USING btree ("agency_id");
  CREATE INDEX "sources_created_by_idx" ON "sources" USING btree ("created_by_id");
  CREATE INDEX "sources_last_updated_by_idx" ON "sources" USING btree ("last_updated_by_id");
  CREATE INDEX "sources_published_by_idx" ON "sources" USING btree ("published_by_id");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "sources__status_idx" ON "sources" USING btree ("_status");
  CREATE UNIQUE INDEX "sources_locales_locale_parent_id_unique" ON "sources_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_sources_v_parent_idx" ON "_sources_v" USING btree ("parent_id");
  CREATE INDEX "_sources_v_version_version_slug_idx" ON "_sources_v" USING btree ("version_slug");
  CREATE INDEX "_sources_v_version_version_agency_idx" ON "_sources_v" USING btree ("version_agency_id");
  CREATE INDEX "_sources_v_version_version_created_by_idx" ON "_sources_v" USING btree ("version_created_by_id");
  CREATE INDEX "_sources_v_version_version_last_updated_by_idx" ON "_sources_v" USING btree ("version_last_updated_by_id");
  CREATE INDEX "_sources_v_version_version_published_by_idx" ON "_sources_v" USING btree ("version_published_by_id");
  CREATE INDEX "_sources_v_version_version_updated_at_idx" ON "_sources_v" USING btree ("version_updated_at");
  CREATE INDEX "_sources_v_version_version_created_at_idx" ON "_sources_v" USING btree ("version_created_at");
  CREATE INDEX "_sources_v_version_version__status_idx" ON "_sources_v" USING btree ("version__status");
  CREATE INDEX "_sources_v_created_at_idx" ON "_sources_v" USING btree ("created_at");
  CREATE INDEX "_sources_v_updated_at_idx" ON "_sources_v" USING btree ("updated_at");
  CREATE INDEX "_sources_v_snapshot_idx" ON "_sources_v" USING btree ("snapshot");
  CREATE INDEX "_sources_v_published_locale_idx" ON "_sources_v" USING btree ("published_locale");
  CREATE INDEX "_sources_v_latest_idx" ON "_sources_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_sources_v_locales_locale_parent_id_unique" ON "_sources_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tx_audiences_order_idx" ON "tx_audiences" USING btree ("order");
  CREATE INDEX "tx_audiences_parent_idx" ON "tx_audiences" USING btree ("parent_id");
  CREATE INDEX "tx_aliases_order_idx" ON "tx_aliases" USING btree ("_order");
  CREATE INDEX "tx_aliases_parent_id_idx" ON "tx_aliases" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tx_aliases_locales_locale_parent_id_unique" ON "tx_aliases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "req_docs_order_idx" ON "req_docs" USING btree ("_order");
  CREATE INDEX "req_docs_parent_id_idx" ON "req_docs" USING btree ("_parent_id");
  CREATE INDEX "req_docs_document_idx" ON "req_docs" USING btree ("document_id");
  CREATE UNIQUE INDEX "req_docs_locales_locale_parent_id_unique" ON "req_docs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "steps_order_idx" ON "steps" USING btree ("_order");
  CREATE INDEX "steps_parent_id_idx" ON "steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "steps_locales_locale_parent_id_unique" ON "steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "fees_order_idx" ON "fees" USING btree ("_order");
  CREATE INDEX "fees_parent_id_idx" ON "fees" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "fees_locales_locale_parent_id_unique" ON "fees_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "srcs_order_idx" ON "srcs" USING btree ("_order");
  CREATE INDEX "srcs_parent_id_idx" ON "srcs" USING btree ("_parent_id");
  CREATE INDEX "srcs_source_idx" ON "srcs" USING btree ("source_id");
  CREATE UNIQUE INDEX "srcs_locales_locale_parent_id_unique" ON "srcs_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "tx_slug_idx" ON "tx" USING btree ("slug");
  CREATE INDEX "tx_category_idx" ON "tx" USING btree ("category_id");
  CREATE INDEX "tx_agency_idx" ON "tx" USING btree ("agency_id");
  CREATE INDEX "tx_created_by_idx" ON "tx" USING btree ("created_by_id");
  CREATE INDEX "tx_last_updated_by_idx" ON "tx" USING btree ("last_updated_by_id");
  CREATE INDEX "tx_published_by_idx" ON "tx" USING btree ("published_by_id");
  CREATE INDEX "tx_updated_at_idx" ON "tx" USING btree ("updated_at");
  CREATE INDEX "tx_created_at_idx" ON "tx" USING btree ("created_at");
  CREATE INDEX "tx__status_idx" ON "tx" USING btree ("_status");
  CREATE UNIQUE INDEX "tx_locales_locale_parent_id_unique" ON "tx_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tx_rels_order_idx" ON "tx_rels" USING btree ("order");
  CREATE INDEX "tx_rels_parent_idx" ON "tx_rels" USING btree ("parent_id");
  CREATE INDEX "tx_rels_path_idx" ON "tx_rels" USING btree ("path");
  CREATE INDEX "tx_rels_svc_centers_id_idx" ON "tx_rels" USING btree ("svc_centers_id");
  CREATE INDEX "tx_rels_tx_id_idx" ON "tx_rels" USING btree ("tx_id");
  CREATE INDEX "_tx_v_version_audiences_order_idx" ON "_tx_v_version_audiences" USING btree ("order");
  CREATE INDEX "_tx_v_version_audiences_parent_idx" ON "_tx_v_version_audiences" USING btree ("parent_id");
  CREATE INDEX "_tx_v_version_aliases_order_idx" ON "_tx_v_version_aliases" USING btree ("_order");
  CREATE INDEX "_tx_v_version_aliases_parent_id_idx" ON "_tx_v_version_aliases" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tx_v_version_aliases_locales_locale_parent_id_unique" ON "_tx_v_version_aliases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_req_docs_v_order_idx" ON "_req_docs_v" USING btree ("_order");
  CREATE INDEX "_req_docs_v_parent_id_idx" ON "_req_docs_v" USING btree ("_parent_id");
  CREATE INDEX "_req_docs_v_document_idx" ON "_req_docs_v" USING btree ("document_id");
  CREATE UNIQUE INDEX "_req_docs_v_locales_locale_parent_id_unique" ON "_req_docs_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_steps_v_order_idx" ON "_steps_v" USING btree ("_order");
  CREATE INDEX "_steps_v_parent_id_idx" ON "_steps_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_steps_v_locales_locale_parent_id_unique" ON "_steps_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_fees_v_order_idx" ON "_fees_v" USING btree ("_order");
  CREATE INDEX "_fees_v_parent_id_idx" ON "_fees_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_fees_v_locales_locale_parent_id_unique" ON "_fees_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_srcs_v_order_idx" ON "_srcs_v" USING btree ("_order");
  CREATE INDEX "_srcs_v_parent_id_idx" ON "_srcs_v" USING btree ("_parent_id");
  CREATE INDEX "_srcs_v_source_idx" ON "_srcs_v" USING btree ("source_id");
  CREATE UNIQUE INDEX "_srcs_v_locales_locale_parent_id_unique" ON "_srcs_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tx_v_parent_idx" ON "_tx_v" USING btree ("parent_id");
  CREATE INDEX "_tx_v_version_version_slug_idx" ON "_tx_v" USING btree ("version_slug");
  CREATE INDEX "_tx_v_version_version_category_idx" ON "_tx_v" USING btree ("version_category_id");
  CREATE INDEX "_tx_v_version_version_agency_idx" ON "_tx_v" USING btree ("version_agency_id");
  CREATE INDEX "_tx_v_version_version_created_by_idx" ON "_tx_v" USING btree ("version_created_by_id");
  CREATE INDEX "_tx_v_version_version_last_updated_by_idx" ON "_tx_v" USING btree ("version_last_updated_by_id");
  CREATE INDEX "_tx_v_version_version_published_by_idx" ON "_tx_v" USING btree ("version_published_by_id");
  CREATE INDEX "_tx_v_version_version_updated_at_idx" ON "_tx_v" USING btree ("version_updated_at");
  CREATE INDEX "_tx_v_version_version_created_at_idx" ON "_tx_v" USING btree ("version_created_at");
  CREATE INDEX "_tx_v_version_version__status_idx" ON "_tx_v" USING btree ("version__status");
  CREATE INDEX "_tx_v_created_at_idx" ON "_tx_v" USING btree ("created_at");
  CREATE INDEX "_tx_v_updated_at_idx" ON "_tx_v" USING btree ("updated_at");
  CREATE INDEX "_tx_v_snapshot_idx" ON "_tx_v" USING btree ("snapshot");
  CREATE INDEX "_tx_v_published_locale_idx" ON "_tx_v" USING btree ("published_locale");
  CREATE INDEX "_tx_v_latest_idx" ON "_tx_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_tx_v_locales_locale_parent_id_unique" ON "_tx_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tx_v_rels_order_idx" ON "_tx_v_rels" USING btree ("order");
  CREATE INDEX "_tx_v_rels_parent_idx" ON "_tx_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tx_v_rels_path_idx" ON "_tx_v_rels" USING btree ("path");
  CREATE INDEX "_tx_v_rels_svc_centers_id_idx" ON "_tx_v_rels" USING btree ("svc_centers_id");
  CREATE INDEX "_tx_v_rels_tx_id_idx" ON "_tx_v_rels" USING btree ("tx_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_agencies_id_idx" ON "payload_locked_documents_rels" USING btree ("agencies_id");
  CREATE INDEX "payload_locked_documents_rels_svc_centers_id_idx" ON "payload_locked_documents_rels" USING btree ("svc_centers_id");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_tx_id_idx" ON "payload_locked_documents_rels" USING btree ("tx_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "_categories_v" CASCADE;
  DROP TABLE "_categories_v_locales" CASCADE;
  DROP TABLE "agencies_phones" CASCADE;
  DROP TABLE "agencies" CASCADE;
  DROP TABLE "agencies_locales" CASCADE;
  DROP TABLE "_agencies_v_version_phones" CASCADE;
  DROP TABLE "_agencies_v" CASCADE;
  DROP TABLE "_agencies_v_locales" CASCADE;
  DROP TABLE "svc_centers_phones" CASCADE;
  DROP TABLE "svc_centers" CASCADE;
  DROP TABLE "svc_centers_locales" CASCADE;
  DROP TABLE "_svc_centers_v_version_phones" CASCADE;
  DROP TABLE "_svc_centers_v" CASCADE;
  DROP TABLE "_svc_centers_v_locales" CASCADE;
  DROP TABLE "documents_aliases" CASCADE;
  DROP TABLE "documents_aliases_locales" CASCADE;
  DROP TABLE "documents" CASCADE;
  DROP TABLE "documents_locales" CASCADE;
  DROP TABLE "_documents_v_version_aliases" CASCADE;
  DROP TABLE "_documents_v_version_aliases_locales" CASCADE;
  DROP TABLE "_documents_v" CASCADE;
  DROP TABLE "_documents_v_locales" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "sources_locales" CASCADE;
  DROP TABLE "_sources_v" CASCADE;
  DROP TABLE "_sources_v_locales" CASCADE;
  DROP TABLE "tx_audiences" CASCADE;
  DROP TABLE "tx_aliases" CASCADE;
  DROP TABLE "tx_aliases_locales" CASCADE;
  DROP TABLE "req_docs" CASCADE;
  DROP TABLE "req_docs_locales" CASCADE;
  DROP TABLE "steps" CASCADE;
  DROP TABLE "steps_locales" CASCADE;
  DROP TABLE "fees" CASCADE;
  DROP TABLE "fees_locales" CASCADE;
  DROP TABLE "srcs" CASCADE;
  DROP TABLE "srcs_locales" CASCADE;
  DROP TABLE "tx" CASCADE;
  DROP TABLE "tx_locales" CASCADE;
  DROP TABLE "tx_rels" CASCADE;
  DROP TABLE "_tx_v_version_audiences" CASCADE;
  DROP TABLE "_tx_v_version_aliases" CASCADE;
  DROP TABLE "_tx_v_version_aliases_locales" CASCADE;
  DROP TABLE "_req_docs_v" CASCADE;
  DROP TABLE "_req_docs_v_locales" CASCADE;
  DROP TABLE "_steps_v" CASCADE;
  DROP TABLE "_steps_v_locales" CASCADE;
  DROP TABLE "_fees_v" CASCADE;
  DROP TABLE "_fees_v_locales" CASCADE;
  DROP TABLE "_srcs_v" CASCADE;
  DROP TABLE "_srcs_v_locales" CASCADE;
  DROP TABLE "_tx_v" CASCADE;
  DROP TABLE "_tx_v_locales" CASCADE;
  DROP TABLE "_tx_v_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_preferred_locale";
  DROP TYPE "public"."enum_categories_status";
  DROP TYPE "public"."enum__categories_v_version_status";
  DROP TYPE "public"."enum__categories_v_published_locale";
  DROP TYPE "public"."enum_agencies_type";
  DROP TYPE "public"."enum_agencies_status";
  DROP TYPE "public"."enum__agencies_v_version_type";
  DROP TYPE "public"."enum__agencies_v_version_status";
  DROP TYPE "public"."enum__agencies_v_published_locale";
  DROP TYPE "public"."gov";
  DROP TYPE "public"."enum_svc_centers_status";
  DROP TYPE "public"."enum__svc_centers_v_version_status";
  DROP TYPE "public"."enum__svc_centers_v_published_locale";
  DROP TYPE "public"."dtype";
  DROP TYPE "public"."enum_documents_status";
  DROP TYPE "public"."enum__documents_v_version_status";
  DROP TYPE "public"."enum__documents_v_published_locale";
  DROP TYPE "public"."stype";
  DROP TYPE "public"."vstatus";
  DROP TYPE "public"."enum_sources_status";
  DROP TYPE "public"."enum__sources_v_version_status";
  DROP TYPE "public"."enum__sources_v_published_locale";
  DROP TYPE "public"."tx_audience";
  DROP TYPE "public"."rtype";
  DROP TYPE "public"."cur";
  DROP TYPE "public"."unit";
  DROP TYPE "public"."enum_tx_status";
  DROP TYPE "public"."enum__tx_v_version_status";
  DROP TYPE "public"."enum__tx_v_published_locale";`)
}
