import type { DashboardOverview } from "@developer-ops/shared";
import type { FastifyInstance } from "fastify";

import { createSampleOverview } from "../data.js";

export async function registerOverviewRoute(
  app: FastifyInstance,
): Promise<void> {
  app.get("/api/overview", async (): Promise<DashboardOverview> => {
    return createSampleOverview();
  });
}
