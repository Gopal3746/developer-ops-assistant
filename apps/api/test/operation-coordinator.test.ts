import { describe, expect, it } from "vitest";

import {
  createOperationCoordinator,
  OperationConflictError,
} from "../src/operations/operation-coordinator.js";

function createDeferred() {
  let resolve: (() => void) | undefined;

  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return {
    promise,
    resolve() {
      resolve?.();
    },
  };
}

describe("operation coordinator", () => {
  it("rejects an overlapping write operation", async () => {
    const coordinator = createOperationCoordinator();
    const deferred = createDeferred();

    const activeOperation = coordinator.runExclusive(
      "github-sync",
      async () => {
        await deferred.promise;
        return "complete";
      },
    );

    await expect(
      coordinator.runExclusive(
        "issue-classification",
        async () => "unexpected",
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "OperationConflictError",
        activeOperation: "github-sync",
        requestedOperation: "issue-classification",
      }),
    );

    deferred.resolve();
    await expect(activeOperation).resolves.toBe("complete");
  });

  it("releases the lock after a failed operation", async () => {
    const coordinator = createOperationCoordinator();

    await expect(
      coordinator.runExclusive(
        "github-sync",
        async () => {
          throw new Error("synchronization failed");
        },
      ),
    ).rejects.toThrow("synchronization failed");

    await expect(
      coordinator.runExclusive(
        "issue-classification",
        async () => "classified",
      ),
    ).resolves.toBe("classified");
  });

  it("uses a typed conflict error", () => {
    const error = new OperationConflictError(
      "github-sync",
      "issue-classification",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("github-sync");
  });
});
