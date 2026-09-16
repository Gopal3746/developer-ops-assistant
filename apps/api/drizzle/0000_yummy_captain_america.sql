CREATE TYPE "public"."repository_status" AS ENUM('healthy', 'attention', 'failing');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('passed', 'failed', 'running');--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"language" text NOT NULL,
	"open_issues" integer DEFAULT 0 NOT NULL,
	"status" "repository_status" DEFAULT 'healthy' NOT NULL,
	"github_updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "repositories_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"repository_id" integer NOT NULL,
	"name" text NOT NULL,
	"branch" text NOT NULL,
	"status" "workflow_status" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_runs_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_runs_repository_id_index" ON "workflow_runs" USING btree ("repository_id");