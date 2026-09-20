export type RepositoryStatus = "healthy" | "attention" | "failing";

export interface RepositoryHealth {
  id: number;
  name: string;
  language: string;
  openIssues: number;
  status: RepositoryStatus;
  updatedAt: string;
}

export interface WorkflowRun {
  id: number;
  repository: string;
  workflow: string;
  branch: string;
  status: "passed" | "failed" | "running";
  startedAt: string;
}

export interface DashboardOverview {
  repositoryCount: number;
  openIssueCount: number;
  failingWorkflowCount: number;
  lastSyncedAt: string;
  repositories: RepositoryHealth[];
  workflowRuns: WorkflowRun[];
}

export interface HealthResponse {
  status: "ok";
  service: "developer-ops-api";
  timestamp: string;
}

export interface GitHubSyncSummary {
  repositoryCount: number;
  openIssueCount: number;
  workflowRunCount: number;
}
