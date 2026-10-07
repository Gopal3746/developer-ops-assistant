import type {
  IssueClassificationBatchSummary,
} from "@developer-ops/shared";

import type {
  IssueClassification,
  IssueClassifier,
} from "./issue-classifier.js";
import type { IssueClassificationStore } from "../stores/issue-classification-store.js";

const DEFAULT_BATCH_LIMIT = 25;
const MAX_BATCH_LIMIT = 100;
const MAX_ERROR_LENGTH = 1_000;

export interface ClassifyPendingIssuesOptions {
  classifier: IssueClassifier;
  store: IssueClassificationStore;
  limit?: number;
}

function getErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown classification error";

  return message.slice(0, MAX_ERROR_LENGTH);
}

export async function classifyPendingIssues(
  options: ClassifyPendingIssuesOptions,
): Promise<IssueClassificationBatchSummary> {
  const limit = options.limit ?? DEFAULT_BATCH_LIMIT;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_BATCH_LIMIT
  ) {
    throw new RangeError(
      `Classification limit must be an integer between 1 and ${MAX_BATCH_LIMIT}`,
    );
  }

  const pendingIssues =
    await options.store.listPendingIssues(limit);

  let classifiedCount = 0;
  let failedCount = 0;

  for (const issue of pendingIssues) {
    let classification: IssueClassification;

    try {
      classification = await options.classifier.classify({
        repository: issue.repository,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
      });
    } catch (error) {
      await options.store.saveFailure(
        issue.id,
        getErrorMessage(error),
      );
      failedCount += 1;
      continue;
    }

    await options.store.saveClassification(
      issue.id,
      classification,
    );
    classifiedCount += 1;
  }

  return {
    attemptedCount: pendingIssues.length,
    classifiedCount,
    failedCount,
  };
}
