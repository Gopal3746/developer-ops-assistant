import type { DashboardOverview } from "@developer-ops/shared";

const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function fetchOverview(
  signal: AbortSignal,
): Promise<DashboardOverview> {
  const response = await fetch(`${apiBaseUrl}/api/overview`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Overview request failed with status ${response.status}`);
  }

  return (await response.json()) as DashboardOverview;
}
