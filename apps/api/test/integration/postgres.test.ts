import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  createDatabase,
  type DatabaseConnection,
} from "../../src/db/client.js";
import {
  issues,
  repositories,
} from "../../src/db/schema.js";
import type {
  GitHubIssue,
  GitHubRepository,
} from "../../src/github/client.js";
import type { SynchronizedRepository } from "../../src/github/sync.js";
import { createPostgresGitHubSyncStore } from "../../src/stores/github-sync-store.js";
import { createPostgresIssueStore } from "../../src/stores/issue-store.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required for PostgreSQL integration tests",
  );
}

const databaseName = new URL(databaseUrl).pathname.slice(1);

if (!databaseName.endsWith("_test")) {
  throw new Error(
    "PostgreSQL integration tests require a dedicated *_test database",
  );
}

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

const synchronizedAt = new Date(
  "2026-10-10T12:00:00.000Z",
);

function createRepository(
  overrides: Partial<GitHubRepository> = {},
): GitHubRepository {
  return {
    githubId: "repository-1",
    owner: "Gopal3746",
    name: "developer-ops-assistant",
    fullName: "Gopal3746/developer-ops-assistant",
    language: "TypeScript",
    updatedAt: synchronizedAt,
    ...overrides,
  };
}

function createIssue(
  githubId: string,
  number: number,
  overrides: Partial<GitHubIssue> = {},
): GitHubIssue {
  return {
    githubId,
    repositoryFullName:
      "Gopal3746/developer-ops-assistant",
    number,
    title: `Issue ${number}`,
    body: `Issue ${number} body`,
    author: "Gopal3746",
    state: "open",
    labels: ["bug"],
    htmlUrl: `https://github.com/Gopal3746/developer-ops-assistant/issues/${number}`,
    createdAt: synchronizedAt,
    updatedAt: synchronizedAt,
    ...overrides,
  };
}

function createSnapshot(
  synchronizedIssues: GitHubIssue[],
): SynchronizedRepository {
  return {
    repository: createRepository(),
    issues: synchronizedIssues,
    openIssues: synchronizedIssues.length,
    status:
      synchronizedIssues.length > 0
        ? "attention"
        : "healthy",
    workflowRuns: [],
  };
}

describe("PostgreSQL stores", () => {
  let connection: DatabaseConnection;

  beforeAll(async () => {
    connection = createDatabase(databaseUrl);

    await migrate(connection.db, {
      migrationsFolder,
    });
  });

  beforeEach(async () => {
    await connection.pool.query(
      "TRUNCATE TABLE repositories RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    await connection.pool.end();
  });

  it("filters persisted issues and returns classification metadata", async () => {
    const [repository] = await connection.db
      .insert(repositories)
      .values({
        githubId: "repository-1",
        owner: "Gopal3746",
        name: "developer-ops-assistant",
        fullName:
          "Gopal3746/developer-ops-assistant",
        language: "TypeScript",
        openIssues: 2,
        status: "attention",
        githubUpdatedAt: synchronizedAt,
      })
      .returning({
        id: repositories.id,
      });

    if (!repository) {
      throw new Error("Failed to create test repository");
    }

    await connection.db.insert(issues).values([
      {
        githubId: "issue-1",
        repositoryId: repository.id,
        number: 1,
        title: "Synchronization fails",
        body: "The sync endpoint returns an error.",
        author: "Gopal3746",
        state: "open",
        labels: ["bug", "api"],
        htmlUrl:
          "https://github.com/Gopal3746/developer-ops-assistant/issues/1",
        githubCreatedAt: synchronizedAt,
        githubUpdatedAt: synchronizedAt,
        classificationStatus: "classified",
        category: "bug",
        priority: "high",
        aiSummary:
          "GitHub synchronization is failing.",
        classificationModel: "test-model",
        classifiedAt: synchronizedAt,
      },
      {
        githubId: "issue-2",
        repositoryId: repository.id,
        number: 2,
        title: "Add repository search",
        body: null,
        author: "Gopal3746",
        state: "open",
        labels: ["enhancement"],
        htmlUrl:
          "https://github.com/Gopal3746/developer-ops-assistant/issues/2",
        githubCreatedAt: synchronizedAt,
        githubUpdatedAt: synchronizedAt,
        classificationStatus: "classified",
        category: "feature",
        priority: "medium",
        aiSummary: "Add repository search.",
        classificationModel: "test-model",
        classifiedAt: synchronizedAt,
      },
    ]);

    const store = createPostgresIssueStore(
      connection.db,
    );
    const result = await store.listIssues({
      repository:
        "Gopal3746/developer-ops-assistant",
      classificationStatus: "classified",
      category: "bug",
      priority: "high",
      limit: 10,
    });

    expect(result).toEqual({
      total: 1,
      issues: [
        expect.objectContaining({
          repository: "developer-ops-assistant",
          repositoryFullName:
            "Gopal3746/developer-ops-assistant",
          number: 1,
          classificationStatus: "classified",
          category: "bug",
          priority: "high",
          classificationModel: "test-model",
        }),
      ],
    });
  });

  it("preserves unchanged classifications and resets changed issues", async () => {
    const store = createPostgresGitHubSyncStore(
      connection.db,
    );
    const unchangedIssue = createIssue(
      "issue-unchanged",
      1,
    );
    const changedIssue = createIssue(
      "issue-changed",
      2,
    );
    const removedIssue = createIssue(
      "issue-removed",
      3,
    );

    await store.replaceOwnerSnapshot("Gopal3746", [
      createSnapshot([
        unchangedIssue,
        changedIssue,
        removedIssue,
      ]),
    ]);

    await connection.db
      .update(issues)
      .set({
        classificationStatus: "classified",
        category: "bug",
        priority: "high",
        aiSummary: "Classified issue summary.",
        classificationModel: "test-model",
        classifiedAt: synchronizedAt,
      });

    await store.replaceOwnerSnapshot("Gopal3746", [
      createSnapshot([
        unchangedIssue,
        {
          ...changedIssue,
          title: "Issue 2 changed",
          updatedAt: new Date(
            "2026-10-10T13:00:00.000Z",
          ),
        },
      ]),
    ]);

    const persistedIssues = await connection.db
      .select({
        githubId: issues.githubId,
        classificationStatus:
          issues.classificationStatus,
        category: issues.category,
        priority: issues.priority,
        aiSummary: issues.aiSummary,
        classificationModel:
          issues.classificationModel,
        classifiedAt: issues.classifiedAt,
      })
      .from(issues);

    expect(persistedIssues).toHaveLength(2);
    expect(
      persistedIssues.find(
        (issue) =>
          issue.githubId === "issue-unchanged",
      ),
    ).toMatchObject({
      classificationStatus: "classified",
      category: "bug",
      priority: "high",
      aiSummary: "Classified issue summary.",
      classificationModel: "test-model",
      classifiedAt: synchronizedAt,
    });
    expect(
      persistedIssues.find(
        (issue) =>
          issue.githubId === "issue-changed",
      ),
    ).toEqual({
      githubId: "issue-changed",
      classificationStatus: "pending",
      category: null,
      priority: null,
      aiSummary: null,
      classificationModel: null,
      classifiedAt: null,
    });
    expect(
      persistedIssues.some(
        (issue) =>
          issue.githubId === "issue-removed",
      ),
    ).toBe(false);
  });

  it("cascades issue deletion when a repository is removed", async () => {
    const store = createPostgresGitHubSyncStore(
      connection.db,
    );

    await store.replaceOwnerSnapshot("Gopal3746", [
      createSnapshot([
        createIssue("issue-1", 1),
      ]),
    ]);

    await connection.db
      .delete(repositories)
      .where(
        eq(
          repositories.fullName,
          "Gopal3746/developer-ops-assistant",
        ),
      );

    const remainingIssues =
      await connection.db.select().from(issues);

    expect(remainingIssues).toEqual([]);
  });
});
