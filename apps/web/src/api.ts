import type {
  DashboardOverview,
  GitHubSyncSummary,
  IssueClassificationBatchSummary,
  IssueListFilters,
  IssueListResponse,
} from "@developer-ops/shared";

const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function fetchOverview(
  signal?: AbortSignal,
): Promise<DashboardOverview> {
  const response = await fetch(
    `${apiBaseUrl}/api/overview`,
    signal ? { signal } : undefined,
  );

  if (!response.ok) {
    throw new Error(
      `Overview request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as DashboardOverview;
}

export async function fetchIssues(
  filters: IssueListFilters = {},
  signal?: AbortSignal,
): Promise<IssueListResponse> {
  const parameters = new URLSearchParams({
    limit: "50",
  });

  if (filters.repository) {
    parameters.set("repository", filters.repository);
  }

  if (filters.classificationStatus) {
    parameters.set(
      "classificationStatus",
      filters.classificationStatus,
    );
  }

  if (filters.category) {
    parameters.set("category", filters.category);
  }

  if (filters.priority) {
    parameters.set("priority", filters.priority);
  }

  const response = await fetch(
    `${apiBaseUrl}/api/issues?${parameters.toString()}`,
    signal ? { signal } : undefined,
  );

  if (!response.ok) {
    throw new Error(
      `Issue request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as IssueListResponse;
}

export async function synchronizeGitHub(): Promise<GitHubSyncSummary> {
  const response = await fetch(
    `${apiBaseUrl}/api/github/sync`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub synchronization failed with status ${response.status}`,
    );
  }

  return (await response.json()) as GitHubSyncSummary;
}

export async function classifyIssues(
  status: "pending" | "failed" = "pending",
): Promise<
  IssueClassificationBatchSummary
> {
  const response = await fetch(
    `${apiBaseUrl}/api/issues/classify`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Issue classification failed with status ${response.status}`,
    );
  }

  return (await response.json()) as IssueClassificationBatchSummary;
}
