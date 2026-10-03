CREATE TYPE "public"."issue_category" AS ENUM('bug', 'feature', 'question', 'documentation', 'other');--> statement-breakpoint
CREATE TYPE "public"."issue_classification_status" AS ENUM('pending', 'classified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "classification_status" "issue_classification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "category" "issue_category";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "priority" "issue_priority";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "classification_model" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "classification_error" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "classified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "issues_classification_status_index" ON "issues" USING btree ("classification_status");