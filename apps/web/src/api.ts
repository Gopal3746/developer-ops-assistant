import type {
  DashboardOverview,
  GitHubSyncSummary,
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
