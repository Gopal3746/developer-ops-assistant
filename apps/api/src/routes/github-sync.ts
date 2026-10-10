import type { GitHubSyncSummary } from "@developer-ops/shared";
import type { FastifyInstance } from "fastify";

import type { OperationCoordinator } from "../operations/operation-coordinator.js";

export interface GitHubSynchronizer {
  synchronize(): Promise<GitHubSyncSummary>;
}

export async function registerGitHubSyncRoute(
  app: FastifyInstance,
  operationCoordinator: OperationCoordinator,
  synchronizer?: GitHubSynchronizer,
): Promise<void> {
  app.post("/api/github/sync", async (_request, reply) => {
    if (!synchronizer) {
      return reply.code(503).send({
        message:
          "GitHub synchronization is not configured",
      });
    }

    return operationCoordinator.runExclusive(
      "github-sync",
      () => synchronizer.synchronize(),
    );
  });
}
