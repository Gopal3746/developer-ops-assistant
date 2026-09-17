import "dotenv/config";

import { buildApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import { createPostgresOverviewStore } from "./stores/overview-store.js";

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3001);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be defined before starting the API",
  );
}

const { db, pool } = createDatabase(databaseUrl);

const app = await buildApp({
  overviewStore: createPostgresOverviewStore(db),
});

app.addHook("onClose", async () => {
  await pool.end();
});

try {
  await app.listen({ host, port });

  console.log(
    `Developer Operations API running at http://localhost:${port}`,
  );
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
