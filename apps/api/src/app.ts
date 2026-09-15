import Fastify, { type FastifyInstance } from "fastify";

interface HealthResponse {
  status: "ok";
  service: "developer-ops-api";
  timestamp: string;
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      service: "developer-ops-api",
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
