import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_search_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "site_settings_search_examples_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "home_page_sections_show_categories" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "home_page_sections_show_featured" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "home_page_sections_show_how_it_works" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "home_page_sections_show_trust" boolean DEFAULT true;
  ALTER TABLE "site_settings_search_examples" ADD CONSTRAINT "site_settings_search_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_search_examples_locales" ADD CONSTRAINT "site_settings_search_examples_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_search_examples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links_locales" ADD CONSTRAINT "site_settings_social_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_social_links"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_search_examples_order_idx" ON "site_settings_search_examples" USING btree ("_order");
  CREATE INDEX "site_settings_search_examples_parent_id_idx" ON "site_settings_search_examples" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_search_examples_locales_locale_parent_id_uniqu" ON "site_settings_search_examples_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_social_links_locales_locale_parent_id_unique" ON "site_settings_social_links_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_search_examples" CASCADE;
  DROP TABLE "site_settings_search_examples_locales" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings_social_links_locales" CASCADE;
  ALTER TABLE "site_settings" DROP COLUMN "home_page_sections_show_categories";
  ALTER TABLE "site_settings" DROP COLUMN "home_page_sections_show_featured";
  ALTER TABLE "site_settings" DROP COLUMN "home_page_sections_show_how_it_works";
  ALTER TABLE "site_settings" DROP COLUMN "home_page_sections_show_trust";`)
}
