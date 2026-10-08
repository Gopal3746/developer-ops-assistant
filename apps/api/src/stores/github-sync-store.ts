import {
  and,
  eq,
  notInArray,
  or,
} from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  issues as githubIssues,
  repositories,
  workflowRuns,
} from "../db/schema.js";
import { needsIssueReclassification } from "../github/issue-content.js";
import type {
  GitHubSyncStore,
  SynchronizedRepository,
} from "../github/sync.js";

export function createPostgresGitHubSyncStore(
  db: Database,
): GitHubSyncStore {
  return {
    async replaceOwnerSnapshot(
      owner: string,
      snapshots:
        readonly SynchronizedRepository[],
    ): Promise<void> {
      await db.transaction(async (transaction) => {
        const synchronizedAt = new Date();
        const trackedRepositoryNames = snapshots.map(
          (snapshot) => snapshot.repository.fullName,
        );

        if (trackedRepositoryNames.length === 0) {
          await transaction
            .delete(repositories)
            .where(eq(repositories.owner, owner));

          return;
        }

        await transaction
          .delete(repositories)
          .where(
            and(
              eq(repositories.owner, owner),
              notInArray(
                repositories.fullName,
                trackedRepositoryNames,
              ),
            ),
          );

        for (const snapshot of snapshots) {
          const repository = snapshot.repository;

          const [existingRepository] =
            await transaction
              .select({
                id: repositories.id,
              })
              .from(repositories)
              .where(
                or(
                  eq(
                    repositories.githubId,
                    repository.githubId,
                  ),
                  eq(
                    repositories.fullName,
                    repository.fullName,
                  ),
                ),
              )
              .limit(1);

          let repositoryId: number;

          if (existingRepository) {
            repositoryId = existingRepository.id;

            await transaction
              .update(repositories)
              .set({
                githubId: repository.githubId,
                owner: repository.owner,
                name: repository.name,
                fullName: repository.fullName,
                language: repository.language,
                openIssues: snapshot.openIssues,
                status: snapshot.status,
                githubUpdatedAt: repository.updatedAt,
                updatedAt: synchronizedAt,
              })
              .where(
                eq(
                  repositories.id,
                  existingRepository.id,
                ),
              );
          } else {
            const [insertedRepository] =
              await transaction
                .insert(repositories)
                .values({
                  githubId: repository.githubId,
                  owner: repository.owner,
                  name: repository.name,
                  fullName: repository.fullName,
                  language: repository.language,
                  openIssues: snapshot.openIssues,
                  status: snapshot.status,
                  githubUpdatedAt:
                    repository.updatedAt,
                  updatedAt: synchronizedAt,
                })
                .returning({
                  id: repositories.id,
                });

            if (!insertedRepository) {
              throw new Error(
                `Failed to save ${repository.fullName}`,
              );
            }

            repositoryId = insertedRepository.id;
          }

          const existingIssues = await transaction
            .select({
              id: githubIssues.id,
              githubId: githubIssues.githubId,
              title: githubIssues.title,
              body: githubIssues.body,
              labels: githubIssues.labels,
            })
            .from(githubIssues)
            .where(
              eq(
                githubIssues.repositoryId,
                repositoryId,
              ),
            );

          const incomingIssueIds = snapshot.issues.map(
            (issue) => issue.githubId,
          );

          if (incomingIssueIds.length === 0) {
            await transaction
              .delete(githubIssues)
              .where(
                eq(
                  githubIssues.repositoryId,
                  repositoryId,
                ),
              );
          } else {
            await transaction
              .delete(githubIssues)
              .where(
                and(
                  eq(
                    githubIssues.repositoryId,
                    repositoryId,
                  ),
                  notInArray(
                    githubIssues.githubId,
                    incomingIssueIds,
                  ),
                ),
              );
          }

          await transaction
            .delete(workflowRuns)
            .where(
              eq(
                workflowRuns.repositoryId,
                repositoryId,
              ),
            );

          const existingIssuesByGitHubId = new Map(
            existingIssues.map((issue) => [
              issue.githubId,
              issue,
            ]),
          );

          for (const issue of snapshot.issues) {
            const existingIssue =
              existingIssuesByGitHubId.get(
                issue.githubId,
              );

            const synchronizedIssue = {
              githubId: issue.githubId,
              repositoryId,
              number: issue.number,
              title: issue.title,
              body: issue.body,
              author: issue.author,
              state: issue.state,
              labels: issue.labels,
              htmlUrl: issue.htmlUrl,
              githubCreatedAt: issue.createdAt,
              githubUpdatedAt: issue.updatedAt,
              updatedAt: synchronizedAt,
            };

            if (!existingIssue) {
              await transaction
                .insert(githubIssues)
                .values(synchronizedIssue);

              continue;
            }

            const shouldReclassify =
              needsIssueReclassification(
                existingIssue,
                issue,
              );

            await transaction
              .update(githubIssues)
              .set({
                ...synchronizedIssue,
                ...(shouldReclassify
                  ? {
                      classificationStatus:
                        "pending" as const,
                      category: null,
                      priority: null,
                      aiSummary: null,
                      classificationModel: null,
                      classificationError: null,
                      classifiedAt: null,
                    }
                  : {}),
              })
              .where(
                eq(
                  githubIssues.id,
                  existingIssue.id,
                ),
              );
          }

          if (snapshot.workflowRuns.length > 0) {
            await transaction
              .insert(workflowRuns)
              .values(
                snapshot.workflowRuns.map(
                  (workflowRun) => ({
                    githubId: workflowRun.githubId,
                    repositoryId,
                    name: workflowRun.name,
                    branch: workflowRun.branch,
                    status: workflowRun.status,
                    startedAt:
                      workflowRun.startedAt,
                  }),
                ),
              );
          }
        }
      });
    },
  };
}
