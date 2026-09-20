import type { GitHubSyncSummary } from "@developer-ops/shared";
import type { FastifyInstance } from "fastify";

export interface GitHubSynchronizer {
  synchronize(): Promise<GitHubSyncSummary>;
}

export async function registerGitHubSyncRoute(
  app: FastifyInstance,
  synchronizer?: GitHubSynchronizer,
): Promise<void> {
  app.post("/api/github/sync", async (_request, reply) => {
    if (!synchronizer) {
      return reply.code(503).send({
        message:
          "GitHub synchronization is not configured",
      });
    }

    return synchronizer.synchronize();
  });
}
