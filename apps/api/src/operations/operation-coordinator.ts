export type OperationName =
  | "github-sync"
  | "issue-classification";

export class OperationConflictError extends Error {
  readonly activeOperation: OperationName;
  readonly requestedOperation: OperationName;

  constructor(
    activeOperation: OperationName,
    requestedOperation: OperationName,
  ) {
    super(
      `Cannot start ${requestedOperation} while ${activeOperation} is running`,
    );
    this.name = "OperationConflictError";
    this.activeOperation = activeOperation;
    this.requestedOperation = requestedOperation;
  }
}

export interface OperationCoordinator {
  runExclusive<T>(
    operation: OperationName,
    task: () => Promise<T>,
  ): Promise<T>;
}

export function createOperationCoordinator(): OperationCoordinator {
  let activeOperation: OperationName | null = null;

  return {
    async runExclusive<T>(
      operation: OperationName,
      task: () => Promise<T>,
    ): Promise<T> {
      if (activeOperation) {
        throw new OperationConflictError(
          activeOperation,
          operation,
        );
      }

      activeOperation = operation;

      try {
        return await task();
      } finally {
        activeOperation = null;
      }
    },
  };
}
