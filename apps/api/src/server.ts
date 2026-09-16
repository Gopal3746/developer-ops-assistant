import { buildApp } from "./app.js";

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3001);

const app = await buildApp();

try {
  await app.listen({ host, port });
  console.log(`Developer Operations API running at http://localhost:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
