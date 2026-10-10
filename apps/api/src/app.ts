import type { HealthResponse } from "@developer-ops/shared";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { createSampleOverview } from "./data.js";
import {
  createOperationCoordinator,
  OperationConflictError,
} from "./operations/operation-coordinator.js";
import {
  registerGitHubSyncRoute,
  type GitHubSynchronizer,
} from "./routes/github-sync.js";
import {
  registerIssueClassificationRoute,
  type IssueClassificationRunner,
} from "./routes/issue-classification.js";
import { registerIssuesRoute } from "./routes/issues.js";
import { registerOverviewRoute } from "./routes/overview.js";
import type { IssueStore } from "./stores/issue-store.js";
import type { OverviewStore } from "./stores/overview-store.js";

export interface BuildAppOptions {
  overviewStore?: OverviewStore;
  issueStore?: IssueStore;
  githubSynchronizer?: GitHubSynchronizer;
  issueClassificationRunner?: IssueClassificationRunner;
  logger?: boolean;
}

function getClientErrorStatus(
  error: unknown,
): number | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("statusCode" in error)
  ) {
    return null;
  }

  const statusCode = error.statusCode;

  return (
    typeof statusCode === "number" &&
    statusCode >= 400 &&
    statusCode < 500
  )
    ? statusCode
    : null;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  });
  const operationCoordinator =
    createOperationCoordinator();

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

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof OperationConflictError) {
      return reply.code(409).send({
        message:
          "Another write operation is already running",
        activeOperation: error.activeOperation,
        requestedOperation: error.requestedOperation,
      });
    }

    request.log.error(
      {
        err: error,
        requestId: request.id,
      },
      "Unhandled API request error",
    );

    const statusCode = getClientErrorStatus(error) ?? 500;

    return reply.code(statusCode).send({
      message:
        statusCode === 500
          ? "Internal server error"
          : error instanceof Error
            ? error.message
            : "Invalid request",
      requestId: request.id,
    });
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
  await registerIssueClassificationRoute(
    app,
    operationCoordinator,
    options.issueClassificationRunner,
  );
  await registerGitHubSyncRoute(
    app,
    operationCoordinator,
    options.githubSynchronizer,
  );

  return app;
}
