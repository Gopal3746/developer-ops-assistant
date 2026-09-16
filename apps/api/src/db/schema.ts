import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const repositoryStatus = pgEnum("repository_status", [
  "healthy",
  "attention",
  "failing",
]);

export const workflowStatus = pgEnum("workflow_status", [
  "passed",
  "failed",
  "running",
]);

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull().unique(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull().unique(),
  language: text("language").notNull(),
  openIssues: integer("open_issues").notNull().default(0),
  status: repositoryStatus("status").notNull().default("healthy"),
  githubUpdatedAt: timestamp("github_updated_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: serial("id").primaryKey(),
    githubId: text("github_id").notNull().unique(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id, {
        onDelete: "cascade",
      }),
    name: text("name").notNull(),
    branch: text("branch").notNull(),
    status: workflowStatus("status").notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("workflow_runs_repository_id_index").on(table.repositoryId),
  ],
);
