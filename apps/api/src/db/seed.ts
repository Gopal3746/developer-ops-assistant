import "dotenv/config";

import { createDatabase } from "./client.js";
import {
  repositories,
  workflowRuns,
} from "./schema.js";

type RepositorySeed = typeof repositories.$inferInsert;
type WorkflowRunStatus =
  (typeof workflowRuns.$inferInsert)["status"];

interface WorkflowSeed {
  githubId: string;
  repositoryName: string;
  name: string;
  branch: string;
  status: WorkflowRunStatus;
  startedAt: Date;
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

const repositorySeeds: RepositorySeed[] = [
  {
    githubId: "sample-repository-1",
    owner: "Gopal3746",
    name: "developer-ops-assistant",
    fullName: "Gopal3746/developer-ops-assistant",
    language: "TypeScript",
    openIssues: 3,
    status: "healthy",
    githubUpdatedAt: minutesAgo(12),
  },
  {
    githubId: "sample-repository-2",
    owner: "Gopal3746",
    name: "open-source-release-intelligence",
    fullName: "Gopal3746/open-source-release-intelligence",
    language: "Python",
    openIssues: 7,
    status: "attention",
    githubUpdatedAt: minutesAgo(240),
  },
  {
    githubId: "sample-repository-3",
    owner: "Gopal3746",
    name: "job-scheduler",
    fullName: "Gopal3746/job-scheduler",
    language: "Python",
    openIssues: 0,
    status: "failing",
    githubUpdatedAt: minutesAgo(1440),
  },
];

const workflowSeeds: WorkflowSeed[] = [
  {
    githubId: "sample-workflow-run-101",
    repositoryName: "developer-ops-assistant",
    name: "verify",
    branch: "main",
    status: "passed",
    startedAt: minutesAgo(18),
  },
  {
    githubId: "sample-workflow-run-102",
    repositoryName: "job-scheduler",
    name: "test",
    branch: "main",
    status: "failed",
    startedAt: minutesAgo(46),
  },
  {
    githubId: "sample-workflow-run-103",
    repositoryName: "open-source-release-intelligence",
    name: "daily-ingestion",
    branch: "main",
    status: "running",
    startedAt: minutesAgo(60),
  },
];

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be defined before seeding the database",
  );
}

const { db, pool } = createDatabase(databaseUrl);

async function seedDatabase(): Promise<void> {
  await db.transaction(async (transaction) => {
    const repositoryIds = new Map<string, number>();

    for (const seed of repositorySeeds) {
      const [savedRepository] = await transaction
        .insert(repositories)
        .values(seed)
        .onConflictDoUpdate({
          target: repositories.githubId,
          set: {
            owner: seed.owner,
            name: seed.name,
            fullName: seed.fullName,
            language: seed.language,
            openIssues: seed.openIssues,
            status: seed.status,
            githubUpdatedAt: seed.githubUpdatedAt,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: repositories.id,
          name: repositories.name,
        });

      if (!savedRepository) {
        throw new Error(
          `Failed to seed repository ${seed.fullName}`,
        );
      }

      repositoryIds.set(
        savedRepository.name,
        savedRepository.id,
      );
    }

    for (const seed of workflowSeeds) {
      const repositoryId = repositoryIds.get(
        seed.repositoryName,
      );

      if (repositoryId === undefined) {
        throw new Error(
          `Missing repository ${seed.repositoryName}`,
        );
      }

      await transaction
        .insert(workflowRuns)
        .values({
          githubId: seed.githubId,
          repositoryId,
          name: seed.name,
          branch: seed.branch,
          status: seed.status,
          startedAt: seed.startedAt,
        })
        .onConflictDoUpdate({
          target: workflowRuns.githubId,
          set: {
            repositoryId,
            name: seed.name,
            branch: seed.branch,
            status: seed.status,
            startedAt: seed.startedAt,
          },
        });
    }
  });
}

try {
  await seedDatabase();
  console.log("Database seeded successfully");
} catch (error) {
  console.error("Database seed failed", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
