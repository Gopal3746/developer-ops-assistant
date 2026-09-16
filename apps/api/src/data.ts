import type {
  DashboardOverview,
  RepositoryHealth,
  WorkflowRun,
} from "@developer-ops/shared";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function createSampleOverview(): DashboardOverview {
  const repositories: RepositoryHealth[] = [
    {
      id: 1,
      name: "developer-ops-assistant",
      language: "TypeScript",
      openIssues: 3,
      status: "healthy",
      updatedAt: minutesAgo(12),
    },
    {
      id: 2,
      name: "open-source-release-intelligence",
      language: "Python",
      openIssues: 7,
      status: "attention",
      updatedAt: minutesAgo(240),
    },
    {
      id: 3,
      name: "job-scheduler",
      language: "Python",
      openIssues: 0,
      status: "failing",
      updatedAt: minutesAgo(1440),
    },
  ];

  const workflowRuns: WorkflowRun[] = [
    {
      id: 101,
      repository: "developer-ops-assistant",
      workflow: "verify",
      branch: "main",
      status: "passed",
      startedAt: minutesAgo(18),
    },
    {
      id: 102,
      repository: "job-scheduler",
      workflow: "test",
      branch: "main",
      status: "failed",
      startedAt: minutesAgo(46),
    },
    {
      id: 103,
      repository: "open-source-release-intelligence",
      workflow: "daily-ingestion",
      branch: "main",
      status: "running",
      startedAt: minutesAgo(60),
    },
  ];

  return {
    repositoryCount: repositories.length,
    openIssueCount: repositories.reduce(
      (total, repository) => total + repository.openIssues,
      0,
    ),
    failingWorkflowCount: workflowRuns.filter(
      (run) => run.status === "failed",
    ).length,
    lastSyncedAt: new Date().toISOString(),
    repositories,
    workflowRuns,
  };
}
