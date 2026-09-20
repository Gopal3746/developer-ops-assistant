import "dotenv/config";

import { createDatabase } from "../db/client.js";
import { createPostgresGitHubSyncStore } from "../stores/github-sync-store.js";
import { createGitHubClient } from "./client.js";
import { synchronizeGitHubData } from "./sync.js";

function requireEnvironmentVariable(
  name: string,
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} must be defined before synchronizing GitHub`,
    );
  }

  return value;
}

function readRepositoryLimit(): number {
  const value = Number(
    process.env.GITHUB_REPOSITORY_LIMIT ?? 10,
  );

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      "GITHUB_REPOSITORY_LIMIT must be a positive integer",
    );
  }

  return value;
}

const databaseUrl =
  requireEnvironmentVariable("DATABASE_URL");
const githubToken =
  requireEnvironmentVariable("GITHUB_TOKEN");
const githubOwner =
  requireEnvironmentVariable("GITHUB_OWNER");
const repositoryLimit = readRepositoryLimit();

const { db, pool } = createDatabase(databaseUrl);

try {
  const summary = await synchronizeGitHubData({
    client: createGitHubClient({
      token: githubToken,
    }),
    store: createPostgresGitHubSyncStore(db),
    owner: githubOwner,
    repositoryLimit,
  });

  console.log(
    [
      "GitHub synchronization complete",
      `${summary.repositoryCount} repositories`,
      `${summary.openIssueCount} open issues`,
      `${summary.workflowRunCount} workflow runs`,
    ].join(" | "),
  );
} catch (error) {
  console.error("GitHub synchronization failed", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
