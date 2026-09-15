import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const applications: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(
    applications.splice(0).map((application) => application.close()),
  );
});

describe("health endpoint", () => {
  it("reports that the API is available", async () => {
    const app = buildApp();
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
});
