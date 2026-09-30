import type {
  GitHubSyncSummary,
  RepositoryStatus,
} from "@developer-ops/shared";

import type {
  GitHubClient,
  GitHubIssue,
  GitHubRepository,
  GitHubWorkflowRun,
} from "./client.js";

export interface SynchronizedRepository {
  repository: GitHubRepository;
  issues: GitHubIssue[];
  openIssues: number;
  status: RepositoryStatus;
  workflowRuns: GitHubWorkflowRun[];
}

export interface GitHubSyncStore {
  replaceOwnerSnapshot(
    owner: string,
    repositories: readonly SynchronizedRepository[],
  ): Promise<void>;
}

export interface GitHubSyncOptions {
  client: GitHubClient;
  store: GitHubSyncStore;
  owner: string;
  repositoryLimit: number;
}

function determineRepositoryStatus(
  openIssues: number,
  workflowRuns: readonly GitHubWorkflowRun[],
): RepositoryStatus {
  if (
    workflowRuns.some(
      (workflowRun) => workflowRun.status === "failed",
    )
  ) {
    return "failing";
  }

  if (
    openIssues > 0 ||
    workflowRuns.some(
      (workflowRun) => workflowRun.status === "running",
    )
  ) {
    return "attention";
  }

  return "healthy";
}

export async function synchronizeGitHubData(
  options: GitHubSyncOptions,
): Promise<GitHubSyncSummary> {
  const {
    client,
    store,
    owner,
    repositoryLimit,
  } = options;

  if (
    !Number.isInteger(repositoryLimit) ||
    repositoryLimit < 1
  ) {
    throw new RangeError(
      "repositoryLimit must be a positive integer",
    );
  }

  const repositories = (
    await client.listRepositories(owner)
  ).slice(0, repositoryLimit);

  const synchronizedRepositories: SynchronizedRepository[] =
    [];

  for (const repository of repositories) {
    const [issues, workflowRuns] = await Promise.all([
      client.listOpenIssues(
        repository.owner,
        repository.name,
      ),
      client.listWorkflowRuns(
        repository.owner,
        repository.name,
      ),
    ]);

    const openIssues = issues.length;

    synchronizedRepositories.push({
      repository,
      issues,
      openIssues,
      status: determineRepositoryStatus(
        openIssues,
        workflowRuns,
      ),
      workflowRuns,
    });
  }

  await store.replaceOwnerSnapshot(
    owner,
    synchronizedRepositories,
  );

  return {
    repositoryCount: synchronizedRepositories.length,
    openIssueCount: synchronizedRepositories.reduce(
      (total, repository) =>
        total + repository.openIssues,
      0,
    ),
    workflowRunCount: synchronizedRepositories.reduce(
      (total, repository) =>
        total + repository.workflowRuns.length,
      0,
    ),
  };
}
