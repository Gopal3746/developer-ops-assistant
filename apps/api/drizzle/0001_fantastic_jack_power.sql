CREATE TYPE "public"."issue_state" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"repository_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"author" text,
	"state" "issue_state" NOT NULL,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"html_url" text NOT NULL,
	"github_created_at" timestamp with time zone NOT NULL,
	"github_updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issues_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issues_repository_number_unique" ON "issues" USING btree ("repository_id","number");--> statement-breakpoint
CREATE INDEX "issues_repository_id_index" ON "issues" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "issues_state_index" ON "issues" USING btree ("state");