import "dotenv/config";

import { classifyPendingIssues } from "./ai/classify-pending-issues.js";
import { createIssueClassifier } from "./ai/issue-classifier.js";
import { createOpenAIClassificationClient } from "./ai/openai-classification-client.js";
import { buildApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import { createGitHubClient } from "./github/client.js";
import { synchronizeGitHubData } from "./github/sync.js";
import { createPostgresGitHubSyncStore } from "./stores/github-sync-store.js";
import {
  createPostgresIssueClassificationStore,
} from "./stores/issue-classification-store.js";
import { createPostgresIssueStore } from "./stores/issue-store.js";
import { createPostgresOverviewStore } from "./stores/overview-store.js";

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3001);
const databaseUrl = process.env.DATABASE_URL;
const githubToken = process.env.GITHUB_TOKEN;
const githubOwner = process.env.GITHUB_OWNER;
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL;
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
  (openaiApiKey && !openaiModel) ||
  (!openaiApiKey && openaiModel)
) {
  throw new Error(
    "OPENAI_API_KEY and OPENAI_MODEL must be configured together",
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

const issueClassificationRunner =
  openaiApiKey && openaiModel
    ? {
        async classify(limit: number) {
          return classifyPendingIssues({
            classifier: createIssueClassifier(
              createOpenAIClassificationClient({
                apiKey: openaiApiKey,
                model: openaiModel,
              }),
            ),
            store:
              createPostgresIssueClassificationStore(
                db,
              ),
            limit,
          });
        },
      }
    : undefined;

const app = await buildApp({
  overviewStore: createPostgresOverviewStore(db),
  issueStore: createPostgresIssueStore(db),
  ...(githubSynchronizer
    ? {
        githubSynchronizer,
      }
    : {}),
  ...(issueClassificationRunner
    ? {
        issueClassificationRunner,
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
