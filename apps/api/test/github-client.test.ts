import { describe, expect, it } from "vitest";

import { createGitHubClient } from "../src/github/client.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

describe("GitHub client", () => {
  it("lists active, non-fork repositories", async () => {
    const requestFetch: typeof fetch = async (input) => {
      const url = getRequestUrl(input);

      expect(url).toContain(
        "/users/Gopal3746/repos",
      );

      return jsonResponse([
        {
          id: 101,
          name: "developer-ops-assistant",
          full_name:
            "Gopal3746/developer-ops-assistant",
          owner: {
            login: "Gopal3746",
          },
          language: "TypeScript",
          archived: false,
          fork: false,
          created_at: "2026-09-01T12:00:00Z",
          updated_at: "2026-09-17T12:00:00Z",
        },
        {
          id: 102,
          name: "archived-project",
          full_name: "Gopal3746/archived-project",
          owner: {
            login: "Gopal3746",
          },
          language: "Python",
          archived: true,
          fork: false,
          created_at: "2025-01-01T12:00:00Z",
          updated_at: "2025-02-01T12:00:00Z",
        },
        {
          id: 103,
          name: "forked-project",
          full_name: "Gopal3746/forked-project",
          owner: {
            login: "Gopal3746",
          },
          language: "Java",
          archived: false,
          fork: true,
          created_at: "2025-01-01T12:00:00Z",
          updated_at: "2025-02-01T12:00:00Z",
        },
      ]);
    };

    const client = createGitHubClient({
      token: "test-token",
      requestFetch,
    });

    const repositories =
      await client.listRepositories("Gopal3746");

    expect(repositories).toEqual([
      {
        githubId: "101",
        owner: "Gopal3746",
        name: "developer-ops-assistant",
        fullName:
          "Gopal3746/developer-ops-assistant",
        language: "TypeScript",
        updatedAt: new Date(
          "2026-09-17T12:00:00Z",
        ),
      },
    ]);
  });

  it("counts issues without counting pull requests", async () => {
    const requestFetch: typeof fetch = async () =>
      jsonResponse([
        {
          id: 201,
          number: 1,
          title: "API failure",
        },
        {
          id: 202,
          number: 2,
          title: "Dependency update",
          pull_request: {
            url: "https://api.github.com/pulls/2",
          },
        },
      ]);

    const client = createGitHubClient({
      token: "test-token",
      requestFetch,
    });

    const count = await client.countOpenIssues(
      "Gopal3746",
      "developer-ops-assistant",
    );

    expect(count).toBe(1);
  });

  it("maps GitHub workflow states to dashboard states", async () => {
    const requestFetch: typeof fetch = async () =>
      jsonResponse({
        total_count: 3,
        workflow_runs: [
          {
            id: 301,
            name: "verify",
            head_branch: "main",
            status: "completed",
            conclusion: "success",
            run_started_at: "2026-09-17T11:00:00Z",
            created_at: "2026-09-17T11:00:00Z",
          },
          {
            id: 302,
            name: "test",
            head_branch: "main",
            status: "completed",
            conclusion: "failure",
            run_started_at: "2026-09-17T10:00:00Z",
            created_at: "2026-09-17T10:00:00Z",
          },
          {
            id: 303,
            name: "deploy",
            head_branch: "main",
            status: "in_progress",
            conclusion: null,
            run_started_at: "2026-09-17T09:00:00Z",
            created_at: "2026-09-17T09:00:00Z",
          },
        ],
      });

    const client = createGitHubClient({
      token: "test-token",
      requestFetch,
    });

    const workflowRuns = await client.listWorkflowRuns(
      "Gopal3746",
      "developer-ops-assistant",
    );

    expect(
      workflowRuns.map((run) => run.status),
    ).toEqual(["passed", "failed", "running"]);
  });
});
