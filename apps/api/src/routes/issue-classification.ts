import type { IssueClassificationBatchSummary } from "@developer-ops/shared";
import type { FastifyInstance } from "fastify";

const DEFAULT_CLASSIFICATION_LIMIT = 25;
const MAX_CLASSIFICATION_LIMIT = 100;

interface IssueClassificationRequestBody {
  limit?: unknown;
}

export interface IssueClassificationRunner {
  classify(
    limit: number,
  ): Promise<IssueClassificationBatchSummary>;
}

export async function registerIssueClassificationRoute(
  app: FastifyInstance,
  runner?: IssueClassificationRunner,
): Promise<void> {
  app.post<{
    Body: IssueClassificationRequestBody;
  }>("/api/issues/classify", async (request, reply) => {
    if (!runner) {
      return reply.code(503).send({
        message:
          "Issue classification is not configured",
      });
    }

    const limit =
      request.body?.limit ??
      DEFAULT_CLASSIFICATION_LIMIT;

    if (
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_CLASSIFICATION_LIMIT
    ) {
      return reply.code(400).send({
        message:
          "limit must be an integer between 1 and 100",
      });
    }

    return runner.classify(limit);
  });
}
