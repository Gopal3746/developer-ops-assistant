import type { FastifyInstance } from "fastify";
import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import { buildApp } from "../src/app.js";

const applications: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(
    applications
      .splice(0)
      .map((application) => application.close()),
  );
});

describe("developer operations API", () => {
  it("reports that the API is available", async () => {
    const app = await buildApp();
    applications.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "developer-ops-api",
    });
  });

  it("returns a repository health overview", async () => {
    const app = await buildApp();
    applications.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/overview",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      repositoryCount: 3,
      openIssueCount: 10,
      failingWorkflowCount: 1,
    });
  });

  it("returns filtered issues", async () => {
    let receivedQuery: unknown;

    const app = await buildApp({
      issueStore: {
        async listIssues(query) {
          receivedQuery = query;

          return {
            total: 1,
            issues: [
              {
                id: 1,
                repository:
                  "developer-ops-assistant",
                repositoryFullName:
                  "Gopal3746/developer-ops-assistant",
                number: 4,
                title: "API synchronization failure",
                body:
                  "Synchronization returned an error.",
                author: "Gopal3746",
                state: "open",
                labels: ["bug", "api"],
                htmlUrl:
                  "https://github.com/Gopal3746/developer-ops-assistant/issues/4",
                createdAt:
                  "2026-09-30T12:00:00.000Z",
                updatedAt:
                  "2026-09-30T13:00:00.000Z",
                  classificationStatus:
                    "classified",
                  category: "bug",
                  priority: "high",
                  aiSummary:
                    "GitHub synchronization is returning an API error.",
                  classificationModel:
                    "test-classifier",
                  classificationError: null,
                  classifiedAt:
                    "2026-09-30T13:01:00.000Z",
              },
            ],
          };
        },
      },
    });

    applications.push(app);

    const response = await app.inject({
      method: "GET",
      url:
        "/api/issues" +
        "?repository=developer-ops-assistant" +
        "&limit=5",
    });

    expect(response.statusCode).toBe(200);
    expect(receivedQuery).toEqual({
      repository: "developer-ops-assistant",
      limit: 5,
    });
    expect(response.json()).toMatchObject({
      total: 1,
      issues: [
        {
          repository:
            "developer-ops-assistant",
          number: 4,
          title: "API synchronization failure",
          classificationStatus:
            "classified",
          category: "bug",
          priority: "high",
          aiSummary:
            "GitHub synchronization is returning an API error.",
        },
      ],
    });
  });

  it("rejects an invalid issue limit", async () => {
    const app = await buildApp();
    applications.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/issues?limit=0",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message:
        "limit must be an integer between 1 and 100",
    });
  });

  it("reports when issue classification is unavailable", async () => {
    const app = await buildApp();
    applications.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/issues/classify",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      message:
        "Issue classification is not configured",
    });
  });

  it("classifies pending issues with the default limit", async () => {
    let receivedLimit: number | undefined;

    const app = await buildApp({
      issueClassificationRunner: {
        async classify(limit) {
          receivedLimit = limit;

          return {
            attemptedCount: 3,
            classifiedCount: 2,
            failedCount: 1,
          };
        },
      },
    });

    applications.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/issues/classify",
    });

    expect(response.statusCode).toBe(200);
    expect(receivedLimit).toBe(25);
    expect(response.json()).toEqual({
      attemptedCount: 3,
      classifiedCount: 2,
      failedCount: 1,
    });
  });

  it("rejects an invalid classification limit", async () => {
    const app = await buildApp({
      issueClassificationRunner: {
        async classify() {
          return {
            attemptedCount: 0,
            classifiedCount: 0,
            failedCount: 0,
          };
        },
      },
    });

    applications.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/issues/classify",
      payload: {
        limit: 0,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message:
        "limit must be an integer between 1 and 100",
    });
  });

  it("reports when GitHub synchronization is unavailable", async () => {
    const app = await buildApp();
    applications.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/github/sync",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      message:
        "GitHub synchronization is not configured",
    });
  });

  it("runs configured GitHub synchronization", async () => {
    const app = await buildApp({
      githubSynchronizer: {
        async synchronize() {
          return {
            repositoryCount: 10,
            openIssueCount: 2,
            workflowRunCount: 14,
          };
        },
      },
    });

    applications.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/github/sync",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      repositoryCount: 10,
      openIssueCount: 2,
      workflowRunCount: 14,
    });
  });
});
