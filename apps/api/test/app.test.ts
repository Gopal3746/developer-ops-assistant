import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const applications: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(
    applications.splice(0).map((application) => application.close()),
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
});
