import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
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

export const issueState = pgEnum("issue_state", [
  "open",
  "closed",
]);

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull().unique(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull().unique(),
  language: text("language").notNull(),
  openIssues: integer("open_issues").notNull().default(0),
  status: repositoryStatus("status")
    .notNull()
    .default("healthy"),
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
    index("workflow_runs_repository_id_index").on(
      table.repositoryId,
    ),
  ],
);

export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    githubId: text("github_id").notNull().unique(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id, {
        onDelete: "cascade",
      }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    author: text("author"),
    state: issueState("state").notNull(),
    labels: jsonb("labels")
      .$type<string[]>()
      .notNull()
      .default([]),
    htmlUrl: text("html_url").notNull(),
    githubCreatedAt: timestamp("github_created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
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
  },
  (table) => [
    uniqueIndex("issues_repository_number_unique").on(
      table.repositoryId,
      table.number,
    ),
    index("issues_repository_id_index").on(
      table.repositoryId,
    ),
    index("issues_state_index").on(table.state),
  ],
);
