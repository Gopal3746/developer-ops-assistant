import type { DashboardOverview } from "@developer-ops/shared";
import type { FastifyInstance } from "fastify";

import type { OverviewStore } from "../stores/overview-store.js";

export async function registerOverviewRoute(
  app: FastifyInstance,
  overviewStore: OverviewStore,
): Promise<void> {
  app.get(
    "/api/overview",
    async (): Promise<DashboardOverview> => {
      return overviewStore.getOverview();
    },
  );
}
