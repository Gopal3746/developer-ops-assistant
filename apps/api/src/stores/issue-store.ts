import type {
  IssueListResponse,
  IssueRecord,
} from "@developer-ops/shared";
import {
  count,
  desc,
  eq,
  or,
} from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  issues,
  repositories,
} from "../db/schema.js";

export interface IssueQuery {
  repository?: string;
  limit: number;
}

export interface IssueStore {
  listIssues(
    query: IssueQuery,
  ): Promise<IssueListResponse>;
}

export function createPostgresIssueStore(
  db: Database,
): IssueStore {
  return {
    async listIssues(
      query: IssueQuery,
    ): Promise<IssueListResponse> {
      const repositoryFilter = query.repository
        ? or(
            eq(
              repositories.name,
              query.repository,
            ),
            eq(
              repositories.fullName,
              query.repository,
            ),
          )
        : undefined;

      const [issueRows, totalRows] =
        await Promise.all([
          db
            .select({
              id: issues.id,
              repository: repositories.name,
              repositoryFullName:
                repositories.fullName,
              number: issues.number,
              title: issues.title,
              body: issues.body,
              author: issues.author,
              state: issues.state,
              labels: issues.labels,
              htmlUrl: issues.htmlUrl,
              createdAt: issues.githubCreatedAt,
              updatedAt: issues.githubUpdatedAt,
              classificationStatus:
                issues.classificationStatus,
              category: issues.category,
              priority: issues.priority,
              aiSummary: issues.aiSummary,
              classificationModel:
                issues.classificationModel,
              classificationError:
                issues.classificationError,
              classifiedAt: issues.classifiedAt,
            })
            .from(issues)
            .innerJoin(
              repositories,
              eq(
                issues.repositoryId,
                repositories.id,
              ),
            )
            .where(repositoryFilter)
            .orderBy(
              desc(issues.githubUpdatedAt),
            )
            .limit(query.limit),

          db
            .select({
              value: count(),
            })
            .from(issues)
            .innerJoin(
              repositories,
              eq(
                issues.repositoryId,
                repositories.id,
              ),
            )
            .where(repositoryFilter),
        ]);

      const issueRecords: IssueRecord[] =
        issueRows.map((issue) => ({
          id: issue.id,
          repository: issue.repository,
          repositoryFullName:
            issue.repositoryFullName,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          author: issue.author,
          state: issue.state,
          labels: issue.labels,
          htmlUrl: issue.htmlUrl,
          createdAt:
            issue.createdAt.toISOString(),
          updatedAt:
            issue.updatedAt.toISOString(),
          classificationStatus:
            issue.classificationStatus,
          category: issue.category,
          priority: issue.priority,
          aiSummary: issue.aiSummary,
          classificationModel:
            issue.classificationModel,
          classificationError:
            issue.classificationError,
          classifiedAt:
            issue.classifiedAt?.toISOString() ?? null,
        }));

      return {
        total: totalRows[0]?.value ?? 0,
        issues: issueRecords,
      };
    },
  };
}
