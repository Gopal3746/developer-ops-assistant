import type {
  IssueCategory,
  IssueClassificationStatus,
  IssuePriority,
} from "@developer-ops/shared";
import type { FastifyInstance } from "fastify";

import type {
  IssueQuery,
  IssueStore,
} from "../stores/issue-store.js";

interface IssueRouteQuerystring {
  repository?: string;
  classificationStatus?: string;
  category?: string;
  priority?: string;
  limit?: string;
}

const defaultLimit = 50;
const maximumLimit = 100;

function isClassificationStatus(
  value: string | undefined,
): value is IssueClassificationStatus {
  return (
    value === "pending" ||
    value === "classified" ||
    value === "failed"
  );
}

function isCategory(
  value: string | undefined,
): value is IssueCategory {
  return (
    value === "bug" ||
    value === "feature" ||
    value === "question" ||
    value === "documentation" ||
    value === "other"
  );
}

function isPriority(
  value: string | undefined,
): value is IssuePriority {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  );
}

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
    const classificationStatusValue =
      request.query.classificationStatus?.trim();
    const categoryValue = request.query.category?.trim();
    const priorityValue = request.query.priority?.trim();

    if (
      classificationStatusValue &&
      !isClassificationStatus(classificationStatusValue)
    ) {
      return reply.code(400).send({
        message:
          "classificationStatus must be pending, classified, or failed",
      });
    }

    if (categoryValue && !isCategory(categoryValue)) {
      return reply.code(400).send({
        message:
          "category must be bug, feature, question, documentation, or other",
      });
    }

    if (priorityValue && !isPriority(priorityValue)) {
      return reply.code(400).send({
        message:
          "priority must be low, medium, high, or urgent",
      });
    }

    const classificationStatus =
      isClassificationStatus(
        classificationStatusValue,
      )
        ? classificationStatusValue
        : undefined;
    const category = isCategory(categoryValue)
      ? categoryValue
      : undefined;
    const priority = isPriority(priorityValue)
      ? priorityValue
      : undefined;

    const query: IssueQuery = {
      limit,
      ...(repository
        ? {
            repository,
          }
        : {}),
      ...(classificationStatus
        ? {
            classificationStatus,
          }
        : {}),
      ...(category
        ? {
            category,
          }
        : {}),
      ...(priority
        ? {
            priority,
          }
        : {}),
    };

    return store.listIssues(query);
  });
}
