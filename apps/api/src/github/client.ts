import { Octokit } from "octokit";

export interface GitHubRepository {
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  language: string;
  updatedAt: Date;
}

export interface GitHubIssue {
  githubId: string;
  repositoryFullName: string;
  number: number;
  title: string;
  body: string | null;
  author: string | null;
  state: "open" | "closed";
  labels: string[];
  htmlUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubWorkflowRun {
  githubId: string;
  repositoryFullName: string;
  name: string;
  branch: string;
  status: "passed" | "failed" | "running";
  startedAt: Date;
}

export interface GitHubClient {
  listRepositories(
    owner: string,
  ): Promise<GitHubRepository[]>;

  listOpenIssues(
    owner: string,
    repository: string,
  ): Promise<GitHubIssue[]>;

  listWorkflowRuns(
    owner: string,
    repository: string,
  ): Promise<GitHubWorkflowRun[]>;
}

export interface GitHubClientOptions {
  token: string;
  requestFetch?: typeof fetch;
}

function mapWorkflowStatus(
  status: string | null,
  conclusion: string | null,
): GitHubWorkflowRun["status"] {
  if (status !== "completed") {
    return "running";
  }

  return conclusion === "success" ? "passed" : "failed";
}

function mapIssueLabels(
  labels: readonly (
    | string
    | {
        name?: string | null;
      }
  )[],
): string[] {
  return labels.flatMap((label) => {
    if (typeof label === "string") {
      return [label];
    }

    return label.name ? [label.name] : [];
  });
}

export function createGitHubClient(
  options: GitHubClientOptions,
): GitHubClient {
  const octokit = new Octokit({
    auth: options.token,
    userAgent: "developer-ops-assistant/0.1.0",
    ...(options.requestFetch
      ? {
          request: {
            fetch: options.requestFetch,
          },
        }
      : {}),
  });

  return {
    async listRepositories(
      owner: string,
    ): Promise<GitHubRepository[]> {
      const repositoryData = await octokit.paginate(
        octokit.rest.repos.listForUser,
        {
          username: owner,
          type: "owner",
          sort: "updated",
          direction: "desc",
          per_page: 100,
        },
      );

      return repositoryData
        .filter(
          (repository) =>
            !repository.archived && !repository.fork,
        )
        .map((repository) => ({
          githubId: String(repository.id),
          owner: repository.owner.login,
          name: repository.name,
          fullName: repository.full_name,
          language: repository.language ?? "Unknown",
          updatedAt: new Date(
            repository.updated_at ??
              repository.created_at ??
              0,
          ),
        }));
    },

    async listOpenIssues(
      owner: string,
      repository: string,
    ): Promise<GitHubIssue[]> {
      const issueData = await octokit.paginate(
        octokit.rest.issues.listForRepo,
        {
          owner,
          repo: repository,
          state: "open",
          per_page: 100,
        },
      );

      return issueData
        .filter(
          (issue) => issue.pull_request === undefined,
        )
        .map((issue) => ({
          githubId: String(issue.id),
          repositoryFullName: `${owner}/${repository}`,
          number: issue.number,
          title: issue.title,
          body: issue.body ?? null,
          author: issue.user?.login ?? null,
          state:
            issue.state === "closed"
              ? "closed"
              : "open",
          labels: mapIssueLabels(issue.labels),
          htmlUrl: issue.html_url,
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
        }));
    },

    async listWorkflowRuns(
      owner: string,
      repository: string,
    ): Promise<GitHubWorkflowRun[]> {
      const response =
        await octokit.rest.actions.listWorkflowRunsForRepo({
          owner,
          repo: repository,
          per_page: 10,
        });

      return response.data.workflow_runs.map((run) => ({
        githubId: String(run.id),
        repositoryFullName: `${owner}/${repository}`,
        name: run.name ?? "Unnamed workflow",
        branch: run.head_branch ?? "unknown",
        status: mapWorkflowStatus(
          run.status,
          run.conclusion,
        ),
        startedAt: new Date(
          run.run_started_at ?? run.created_at,
        ),
      }));
    },
  };
}
