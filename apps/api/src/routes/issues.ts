import type { FastifyInstance } from "fastify";

import type {
  IssueQuery,
  IssueStore,
} from "../stores/issue-store.js";

interface IssueRouteQuerystring {
  repository?: string;
  limit?: string;
}

const defaultLimit = 50;
const maximumLimit = 100;

export async function registerIssuesRoute(
  app: FastifyInstance,
  store: IssueStore,
): Promise<void> {
  app.get<{
    Querystring: IssueRouteQuerystring;
  }>("/api/issues", async (request, reply) => {
    const limit =
      request.query.limit === undefined
        ? defaultLimit
        : Number(request.query.limit);

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > maximumLimit
    ) {
      return reply.code(400).send({
        message:
          "limit must be an integer between 1 and 100",
      });
    }

    const repository =
      request.query.repository?.trim();

    const query: IssueQuery = {
      limit,
      ...(repository
        ? {
            repository,
          }
        : {}),
    };

    return store.listIssues(query);
  });
}
