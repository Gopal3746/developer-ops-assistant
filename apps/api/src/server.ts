import "dotenv/config";

import { buildApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import { createGitHubClient } from "./github/client.js";
import { synchronizeGitHubData } from "./github/sync.js";
import { createPostgresGitHubSyncStore } from "./stores/github-sync-store.js";
import { createPostgresOverviewStore } from "./stores/overview-store.js";

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3001);
const databaseUrl = process.env.DATABASE_URL;
const githubToken = process.env.GITHUB_TOKEN;
const githubOwner = process.env.GITHUB_OWNER;
const repositoryLimit = Number(
  process.env.GITHUB_REPOSITORY_LIMIT ?? 10,
);

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be defined before starting the API",
  );
}

if (
  (githubToken && !githubOwner) ||
  (!githubToken && githubOwner)
) {
  throw new Error(
    "GITHUB_TOKEN and GITHUB_OWNER must be configured together",
  );
}

if (
  !Number.isInteger(repositoryLimit) ||
  repositoryLimit < 1
) {
  throw new Error(
    "GITHUB_REPOSITORY_LIMIT must be a positive integer",
  );
}

const { db, pool } = createDatabase(databaseUrl);

const githubSynchronizer =
  githubToken && githubOwner
    ? {
        async synchronize() {
          return synchronizeGitHubData({
            client: createGitHubClient({
              token: githubToken,
            }),
            store: createPostgresGitHubSyncStore(db),
            owner: githubOwner,
            repositoryLimit,
          });
        },
      }
    : undefined;

const app = await buildApp({
  overviewStore: createPostgresOverviewStore(db),
  ...(githubSynchronizer
    ? {
        githubSynchronizer,
      }
    : {}),
});

app.addHook("onClose", async () => {
  await pool.end();
});

try {
  await app.listen({ host, port });

  console.log(
    `Developer Operations API running at http://localhost:${port}`,
  );
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
