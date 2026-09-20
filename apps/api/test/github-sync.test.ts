import { describe, expect, it } from "vitest";

import type {
  GitHubClient,
  GitHubRepository,
  GitHubWorkflowRun,
} from "../src/github/client.js";
import {
  type GitHubSyncStore,
  type SynchronizedRepository,
  synchronizeGitHubData,
} from "../src/github/sync.js";

const repositories: GitHubRepository[] = [
  {
    githubId: "101",
    owner: "Gopal3746",
    name: "failing-project",
    fullName: "Gopal3746/failing-project",
    language: "TypeScript",
    updatedAt: new Date("2026-09-19T12:00:00Z"),
  },
  {
    githubId: "102",
    owner: "Gopal3746",
    name: "attention-project",
    fullName: "Gopal3746/attention-project",
    language: "Python",
    updatedAt: new Date("2026-09-19T11:00:00Z"),
  },
  {
    githubId: "103",
    owner: "Gopal3746",
    name: "healthy-project",
    fullName: "Gopal3746/healthy-project",
    language: "Java",
    updatedAt: new Date("2026-09-19T10:00:00Z"),
  },
];

function workflowRun(
  githubId: string,
  repository: string,
  status: GitHubWorkflowRun["status"],
): GitHubWorkflowRun {
  return {
    githubId,
    repositoryFullName: `Gopal3746/${repository}`,
    name: "verify",
    branch: "main",
    status,
    startedAt: new Date("2026-09-19T12:00:00Z"),
  };
}

describe("GitHub synchronization", () => {
  it("classifies repositories and saves one snapshot", async () => {
    const openIssueCounts = new Map([
      ["failing-project", 0],
      ["attention-project", 5],
      ["healthy-project", 0],
    ]);

    const workflowRuns = new Map<
      string,
      GitHubWorkflowRun[]
    >([
      [
        "failing-project",
        [
          workflowRun(
            "201",
            "failing-project",
            "failed",
          ),
        ],
      ],
      [
        "attention-project",
        [
          workflowRun(
            "202",
            "attention-project",
            "running",
          ),
        ],
      ],
      [
        "healthy-project",
        [
          workflowRun(
            "203",
            "healthy-project",
            "passed",
          ),
        ],
      ],
    ]);

    const client: GitHubClient = {
      async listRepositories(owner) {
        expect(owner).toBe("Gopal3746");
        return repositories;
      },

      async countOpenIssues(_owner, repository) {
        return openIssueCounts.get(repository) ?? 0;
      },

      async listWorkflowRuns(_owner, repository) {
        return workflowRuns.get(repository) ?? [];
      },
    };

    let savedOwner = "";
    let savedRepositories:
      readonly SynchronizedRepository[] = [];

    const store: GitHubSyncStore = {
      async replaceOwnerSnapshot(owner, snapshot) {
        savedOwner = owner;
        savedRepositories = snapshot;
      },
    };

    const summary = await synchronizeGitHubData({
      client,
      store,
      owner: "Gopal3746",
      repositoryLimit: 3,
    });

    expect(savedOwner).toBe("Gopal3746");

    expect(
      savedRepositories.map(
        (repository) => repository.status,
      ),
    ).toEqual(["failing", "attention", "healthy"]);

    expect(summary).toEqual({
      repositoryCount: 3,
      openIssueCount: 5,
      workflowRunCount: 3,
    });
  });

  it("rejects an invalid repository limit", async () => {
    const client: GitHubClient = {
      async listRepositories() {
        return [];
      },

      async countOpenIssues() {
        return 0;
      },

      async listWorkflowRuns() {
        return [];
      },
    };

    const store: GitHubSyncStore = {
      async replaceOwnerSnapshot() {
        return;
      },
    };

    await expect(
      synchronizeGitHubData({
        client,
        store,
        owner: "Gopal3746",
        repositoryLimit: 0,
      }),
    ).rejects.toThrow(
      "repositoryLimit must be a positive integer",
    );
  });
});
