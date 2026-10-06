import { desc, eq } from "drizzle-orm";

import type { IssueClassification } from "../ai/issue-classifier.js";
import type { Database } from "../db/client.js";
import {
  issues,
  repositories,
} from "../db/schema.js";

export interface PendingIssue {
  id: number;
  repository: string;
  number: number;
  title: string;
  body: string | null;
  labels: string[];
}

export interface IssueClassificationStore {
  listPendingIssues(
    limit: number,
  ): Promise<PendingIssue[]>;
  saveClassification(
    issueId: number,
    classification: IssueClassification,
  ): Promise<void>;
  saveFailure(
    issueId: number,
    message: string,
  ): Promise<void>;
}

export function createPostgresIssueClassificationStore(
  db: Database,
): IssueClassificationStore {
  return {
    async listPendingIssues(
      limit: number,
    ): Promise<PendingIssue[]> {
      return db
        .select({
          id: issues.id,
          repository: repositories.fullName,
          number: issues.number,
          title: issues.title,
          body: issues.body,
          labels: issues.labels,
        })
        .from(issues)
        .innerJoin(
          repositories,
          eq(
            issues.repositoryId,
            repositories.id,
          ),
        )
        .where(
          eq(
            issues.classificationStatus,
            "pending",
          ),
        )
        .orderBy(
          desc(issues.githubUpdatedAt),
        )
        .limit(limit);
    },

    async saveClassification(
      issueId: number,
      classification: IssueClassification,
    ): Promise<void> {
      await db
        .update(issues)
        .set({
          classificationStatus: "classified",
          category: classification.category,
          priority: classification.priority,
          aiSummary: classification.summary,
          classificationModel: classification.model,
          classificationError: null,
          classifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(issues.id, issueId));
    },

    async saveFailure(
      issueId: number,
      message: string,
    ): Promise<void> {
      await db
        .update(issues)
        .set({
          classificationStatus: "failed",
          category: null,
          priority: null,
          aiSummary: null,
          classificationModel: null,
          classificationError: message,
          classifiedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(issues.id, issueId));
    },
  };
}
