import type {
  DashboardOverview,
  RepositoryHealth,
  WorkflowRun,
} from "@developer-ops/shared";
import { count, desc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  repositories,
  workflowRuns,
} from "../db/schema.js";

export interface OverviewStore {
  getOverview(): Promise<DashboardOverview>;
}

export function createPostgresOverviewStore(
  db: Database,
): OverviewStore {
  return {
    async getOverview(): Promise<DashboardOverview> {
      const [
        repositoryRows,
        workflowRows,
        failingWorkflowRows,
      ] = await Promise.all([
        db
          .select({
            id: repositories.id,
            name: repositories.name,
            language: repositories.language,
            openIssues: repositories.openIssues,
            status: repositories.status,
            updatedAt: repositories.githubUpdatedAt,
          })
          .from(repositories)
          .orderBy(desc(repositories.githubUpdatedAt)),

        db
          .select({
            id: workflowRuns.id,
            repository: repositories.name,
            workflow: workflowRuns.name,
            branch: workflowRuns.branch,
            status: workflowRuns.status,
            startedAt: workflowRuns.startedAt,
          })
          .from(workflowRuns)
          .innerJoin(
            repositories,
            eq(workflowRuns.repositoryId, repositories.id),
          )
          .orderBy(desc(workflowRuns.startedAt))
          .limit(10),

        db
          .select({
            value: count(),
          })
          .from(workflowRuns)
          .where(eq(workflowRuns.status, "failed")),
      ]);

      const repositoryHealth: RepositoryHealth[] =
        repositoryRows.map((repository) => ({
          id: repository.id,
          name: repository.name,
          language: repository.language,
          openIssues: repository.openIssues,
          status: repository.status,
          updatedAt: repository.updatedAt.toISOString(),
        }));

      const recentWorkflowRuns: WorkflowRun[] =
        workflowRows.map((run) => ({
          id: run.id,
          repository: run.repository,
          workflow: run.workflow,
          branch: run.branch,
          status: run.status,
          startedAt: run.startedAt.toISOString(),
        }));

      const synchronizationTimes = [
        ...repositoryRows.map(
          (repository) => repository.updatedAt,
        ),
        ...workflowRows.map((run) => run.startedAt),
      ];

      const lastSyncedAt = synchronizationTimes.reduce(
        (latest, timestamp) =>
          timestamp > latest ? timestamp : latest,
        new Date(0),
      );

      return {
        repositoryCount: repositoryHealth.length,
        openIssueCount: repositoryHealth.reduce(
          (total, repository) =>
            total + repository.openIssues,
          0,
        ),
        failingWorkflowCount:
          failingWorkflowRows[0]?.value ?? 0,
        lastSyncedAt: lastSyncedAt.toISOString(),
        repositories: repositoryHealth,
        workflowRuns: recentWorkflowRuns,
      };
    },
  };
}
