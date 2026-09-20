import type { HealthResponse } from "@developer-ops/shared";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { createSampleOverview } from "./data.js";
import {
  registerGitHubSyncRoute,
  type GitHubSynchronizer,
} from "./routes/github-sync.js";
import { registerOverviewRoute } from "./routes/overview.js";
import type { OverviewStore } from "./stores/overview-store.js";

export interface BuildAppOptions {
  overviewStore?: OverviewStore;
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
  await registerGitHubSyncRoute(
    app,
    options.githubSynchronizer,
  );

  return app;
}
