import type { HealthResponse } from "@developer-ops/shared";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { createSampleOverview } from "./data.js";
import {
  registerGitHubSyncRoute,
  type GitHubSynchronizer,
} from "./routes/github-sync.js";
import { registerIssuesRoute } from "./routes/issues.js";
import { registerOverviewRoute } from "./routes/overview.js";
import type { IssueStore } from "./stores/issue-store.js";
import type { OverviewStore } from "./stores/overview-store.js";

export interface BuildAppOptions {
  overviewStore?: OverviewStore;
  issueStore?: IssueStore;
  githubSynchronizer?: GitHubSynchronizer;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  const overviewStore: OverviewStore =
    options.overviewStore ?? {
      async getOverview() {
        return createSampleOverview();
      },
    };

  const issueStore: IssueStore =
    options.issueStore ?? {
      async listIssues() {
        return {
          total: 0,
          issues: [],
        };
      },
    };

  await app.register(cors, {
    origin:
      process.env.WEB_ORIGIN ??
      "http://localhost:5173",
  });

  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      service: "developer-ops-api",
      timestamp: new Date().toISOString(),
    };
  });

  await registerOverviewRoute(app, overviewStore);
  await registerIssuesRoute(app, issueStore);
  await registerGitHubSyncRoute(
    app,
    options.githubSynchronizer,
  );

  return app;
}
