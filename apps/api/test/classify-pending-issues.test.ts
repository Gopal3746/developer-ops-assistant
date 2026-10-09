import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { classifyPendingIssues } from "../src/ai/classify-pending-issues.js";
import type { IssueClassificationStore } from "../src/stores/issue-classification-store.js";

const pendingIssues = [
  {
    id: 10,
    repository: "Gopal3746/developer-ops-assistant",
    number: 42,
    title: "Synchronization fails",
    body: "The API returns an error.",
    labels: ["bug"],
  },
  {
    id: 11,
    repository: "Gopal3746/developer-ops-assistant",
    number: 43,
    title: "Document local setup",
    body: null,
    labels: ["documentation"],
  },
];

function createStore() {
  const listClassifiableIssues = vi
    .fn()
    .mockResolvedValue(pendingIssues);
  const saveClassification = vi
    .fn()
    .mockResolvedValue(undefined);
  const saveFailure = vi
    .fn()
    .mockResolvedValue(undefined);

  const store: IssueClassificationStore = {
    listClassifiableIssues,
    saveClassification,
    saveFailure,
  };

  return {
    store,
    listClassifiableIssues,
    saveClassification,
    saveFailure,
  };
}

describe("classify pending issues", () => {
  it("classifies and persists pending issues", async () => {
    const {
      store,
      listClassifiableIssues,
      saveClassification,
      saveFailure,
    } = createStore();
    const classify = vi
      .fn()
      .mockResolvedValueOnce({
        category: "bug",
        priority: "high",
        summary: "Synchronization returns an error.",
        model: "test-model",
      })
      .mockResolvedValueOnce({
        category: "documentation",
        priority: "low",
        summary: "Local setup documentation is requested.",
        model: "test-model",
      });

    const summary = await classifyPendingIssues({
      classifier: {
        classify,
      },
      store,
      limit: 10,
    });

    expect(summary).toEqual({
      attemptedCount: 2,
      classifiedCount: 2,
      failedCount: 0,
    });
    expect(listClassifiableIssues).toHaveBeenCalledWith(
      10,
      "pending",
    );
    expect(classify).toHaveBeenCalledTimes(2);
    expect(saveClassification).toHaveBeenCalledTimes(2);
    expect(saveClassification).toHaveBeenNthCalledWith(
      1,
      10,
      {
        category: "bug",
        priority: "high",
        summary: "Synchronization returns an error.",
        model: "test-model",
      },
    );
    expect(saveFailure).not.toHaveBeenCalled();
  });

  it("selects failed issues for a retry batch", async () => {
    const {
      store,
      listClassifiableIssues,
    } = createStore();

    await classifyPendingIssues({
      classifier: {
        async classify() {
          return {
            category: "bug",
            priority: "medium",
            summary: "The issue needs another review.",
            model: "test-model",
          };
        },
      },
      store,
      limit: 5,
      status: "failed",
    });

    expect(listClassifiableIssues).toHaveBeenCalledWith(
      5,
      "failed",
    );
  });

  it("records a model failure and continues the batch", async () => {
    const {
      store,
      saveClassification,
      saveFailure,
    } = createStore();
    const classify = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("provider unavailable"),
      )
      .mockResolvedValueOnce({
        category: "documentation",
        priority: "low",
        summary: "Local setup documentation is requested.",
        model: "test-model",
      });

    const summary = await classifyPendingIssues({
      classifier: {
        classify,
      },
      store,
    });

    expect(summary).toEqual({
      attemptedCount: 2,
      classifiedCount: 1,
      failedCount: 1,
    });
    expect(saveFailure).toHaveBeenCalledWith(
      10,
      "provider unavailable",
    );
    expect(saveClassification).toHaveBeenCalledWith(
      11,
      expect.objectContaining({
        category: "documentation",
      }),
    );
  });

  it("rejects an invalid batch limit", async () => {
    const { store, listClassifiableIssues } =
      createStore();

    await expect(
      classifyPendingIssues({
        classifier: {
          classify: vi.fn(),
        },
        store,
        limit: 0,
      }),
    ).rejects.toThrowError(
      "Classification limit must be an integer between 1 and 100",
    );

    expect(listClassifiableIssues).not.toHaveBeenCalled();
  });

  it("does not hide a persistence failure", async () => {
    const { store, saveClassification } = createStore();
    saveClassification.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(
      classifyPendingIssues({
        classifier: {
          async classify() {
            return {
              category: "bug",
              priority: "high",
              summary: "Synchronization returns an error.",
              model: "test-model",
            };
          },
        },
        store,
      }),
    ).rejects.toThrowError("database unavailable");
  });
});
