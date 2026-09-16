import type {
  HealthResponse,
} from "@developer-ops/shared";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { registerOverviewRoute } from "./routes/overview.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  });

  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      service: "developer-ops-api",
      timestamp: new Date().toISOString(),
    };
  });

  await app.register(registerOverviewRoute);

  return app;
}
