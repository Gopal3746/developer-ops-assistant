import type {
  DashboardOverview,
  IssueListResponse,
} from "@developer-ops/shared";
import { useEffect, useState } from "react";

import {
  fetchIssues,
  fetchOverview,
  synchronizeGitHub,
} from "./api";

type ActiveView = "overview" | "issues";

interface SyncNotice {
  type: "success" | "error";
  message: string;
}

interface IssueReviewProps {
  overview: DashboardOverview;
  issueResponse: IssueListResponse | null;
  issueError: string | null;
  isLoading: boolean;
  selectedRepository: string;
  onRepositoryChange(repository: string): void;
}

function formatRelativeTime(timestamp: string): string {
  const elapsedMilliseconds =
    Date.now() - new Date(timestamp).getTime();
  const elapsedMinutes = Math.max(
    0,
    Math.floor(elapsedMilliseconds / 60_000),
  );

  if (elapsedMinutes < 1) {
    return "just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  return `${Math.floor(elapsedHours / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`status-badge status-badge--${status}`}
    >
      {status}
    </span>
  );
}

function IssueReview({
  overview,
  issueResponse,
  issueError,
  isLoading,
  selectedRepository,
  onRepositoryChange,
}: IssueReviewProps) {
  return (
    <section className="panel issues-panel" id="issues">
      <header className="panel-header issue-panel-header">
        <div>
          <p className="eyebrow">Support queue</p>
          <h2>Open GitHub issues</h2>
        </div>

        <div className="issue-toolbar">
          <span>
            {isLoading
              ? "Loading issues"
              : `${issueResponse?.total ?? 0} open`}
          </span>

          <label className="repository-filter">
            <span>Repository</span>
            <select
              value={selectedRepository}
              onChange={(event) => {
                onRepositoryChange(event.target.value);
              }}
            >
              <option value="">All repositories</option>

              {overview.repositories.map((repository) => (
                <option
                  key={repository.id}
                  value={repository.name}
                >
                  {repository.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {isLoading ? (
        <div className="issue-state" role="status">
          <h3>Loading issues</h3>
          <p>Requesting the latest issue data from the API…</p>
        </div>
      ) : issueError ? (
        <div
          className="issue-state issue-state--error"
          role="alert"
        >
          <h3>Could not load issues</h3>
          <p>{issueError}</p>
        </div>
      ) : !issueResponse || issueResponse.issues.length === 0 ? (
        <div className="issue-state">
          <h3>No open issues</h3>
          <p>
            {selectedRepository
              ? "This repository currently has no open GitHub issues."
              : "The tracked repositories currently have no open GitHub issues."}
          </p>
        </div>
      ) : (
        <div className="issue-list">
          {issueResponse.issues.map((issue) => (
            <article className="issue-card" key={issue.id}>
              <div className="issue-card-header">
                <span>
                  {issue.repository} #{issue.number}
                </span>

                <time dateTime={issue.updatedAt}>
                  Updated {formatRelativeTime(issue.updatedAt)}
                </time>
              </div>

              <div className="issue-title-row">
                <a
                  className="issue-title"
                  href={issue.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {issue.title}
                </a>

                <StatusBadge status={issue.state} />
              </div>

              <p className="issue-description">
                {issue.body?.trim() ||
                  "No description was provided for this issue."}
              </p>

              <footer className="issue-card-footer">
                <div
                  className="issue-label-list"
                  aria-label="Issue labels"
                >
                  {issue.labels.length > 0 ? (
                    issue.labels.map((label) => (
                      <span className="issue-label" key={label}>
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="issue-label issue-label--empty">
                      No labels
                    </span>
                  )}
                </div>

                <span className="issue-author">
                  Opened by {issue.author ?? "unknown author"}
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function App() {
  const [activeView, setActiveView] =
    useState<ActiveView>("overview");
  const [overview, setOverview] =
    useState<DashboardOverview | null>(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [issueResponse, setIssueResponse] =
    useState<IssueListResponse | null>(null);
  const [issueError, setIssueError] =
    useState<string | null>(null);
  const [isLoadingIssues, setIsLoadingIssues] =
    useState(false);
  const [selectedRepository, setSelectedRepository] =
    useState("");

  const [isSynchronizing, setIsSynchronizing] =
    useState(false);
  const [syncNotice, setSyncNotice] =
    useState<SyncNotice | null>(null);

  function showOverviewSection(
    sectionId: "overview" | "repositories" | "workflows",
  ): void {
    setActiveView("overview");

    window.requestAnimationFrame(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  async function handleSynchronization(): Promise<void> {
    setIsSynchronizing(true);
    setSyncNotice(null);

    try {
      const summary = await synchronizeGitHub();
      const refreshedOverview = await fetchOverview();

      setOverview(refreshedOverview);
      setErrorMessage(null);

      if (activeView === "issues") {
        const refreshedIssues = await fetchIssues(
          selectedRepository || undefined,
        );

        setIssueResponse(refreshedIssues);
        setIssueError(null);
      }

      setSyncNotice({
        type: "success",
        message:
          `Synced ${summary.repositoryCount} repositories, ` +
          `${summary.openIssueCount} open issues, and ` +
          `${summary.workflowRunCount} workflow runs.`,
      });
    } catch {
      setSyncNotice({
        type: "error",
        message:
          "GitHub synchronization failed. Check the API logs and credentials.",
      });
    } finally {
      setIsSynchronizing(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview(): Promise<void> {
      try {
        const result = await fetchOverview(
          controller.signal,
        );

        setOverview(result);
        setErrorMessage(null);
      } catch {
        if (!controller.signal.aborted) {
          setErrorMessage(
            "The dashboard API is unavailable. Confirm the API is running on port 3001.",
          );
        }
      }
    }

    void loadOverview();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (activeView !== "issues") {
      return;
    }

    const controller = new AbortController();

    async function loadIssues(): Promise<void> {
      setIsLoadingIssues(true);
      setIssueError(null);

      try {
        const result = await fetchIssues(
          selectedRepository || undefined,
          controller.signal,
        );

        setIssueResponse(result);
      } catch {
        if (!controller.signal.aborted) {
          setIssueResponse(null);
          setIssueError(
            "The issue API is unavailable. Confirm PostgreSQL and the API are running.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingIssues(false);
        }
      }
    }

    void loadIssues();

    return () => {
      controller.abort();
    };
  }, [activeView, selectedRepository]);

  const connectionLabel = errorMessage
    ? "API unavailable"
    : overview
      ? "API connected · PostgreSQL"
      : "Connecting to API";

  const pageTitle =
    activeView === "issues"
      ? "Issue review"
      : "Repository health";

  const pageDescription =
    activeView === "issues"
      ? "Review incoming GitHub issues across tracked repositories."
      : "Monitor issues and CI activity across your projects.";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">DO</span>
          <span>Developer Ops</span>
        </div>

        <nav aria-label="Primary navigation">
          <button
            className={[
              "nav-link",
              activeView === "overview"
                ? "nav-link--active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            onClick={() => {
              showOverviewSection("overview");
            }}
          >
            Overview
          </button>

          <button
            className="nav-link"
            type="button"
            onClick={() => {
              showOverviewSection("repositories");
            }}
          >
            Repositories
          </button>

          <button
            className={[
              "nav-link",
              activeView === "issues"
                ? "nav-link--active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            onClick={() => {
              setActiveView("issues");
            }}
          >
            Issues
          </button>

          <button
            className="nav-link"
            type="button"
            onClick={() => {
              showOverviewSection("workflows");
            }}
          >
            Workflows
          </button>
        </nav>

        <div className="connection-status">
          <span className="connection-dot" />
          GitHub sync configured
        </div>
      </aside>

      <main id="overview">
        <header className="page-header">
          <div>
            <p className="eyebrow">
              Developer operations
            </p>
            <h1>{pageTitle}</h1>
            <p className="page-description">
              {pageDescription}
            </p>
          </div>

          <div className="page-actions">
            <span
              className={[
                "data-label",
                overview
                  ? "data-label--connected"
                  : "",
                errorMessage
                  ? "data-label--error"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {connectionLabel}
            </span>

            <button
              className="sync-button"
              type="button"
              disabled={isSynchronizing || !overview}
              onClick={() => {
                void handleSynchronization();
              }}
            >
              {isSynchronizing
                ? "Synchronizing…"
                : "Sync now"}
            </button>
          </div>
        </header>

        {syncNotice ? (
          <div
            className={`sync-notice sync-notice--${syncNotice.type}`}
            role={
              syncNotice.type === "error"
                ? "alert"
                : "status"
            }
          >
            {syncNotice.message}
          </div>
        ) : null}

        {!overview ? (
          <section
            className={`panel dashboard-state ${
              errorMessage
                ? "dashboard-state--error"
                : ""
            }`}
            role={errorMessage ? "alert" : "status"}
          >
            <h2>
              {errorMessage
                ? "Could not load dashboard"
                : "Loading dashboard"}
            </h2>
            <p>
              {errorMessage ??
                "Requesting repository data from the API…"}
            </p>
          </section>
        ) : activeView === "issues" ? (
          <IssueReview
            overview={overview}
            issueResponse={issueResponse}
            issueError={issueError}
            isLoading={isLoadingIssues}
            selectedRepository={selectedRepository}
            onRepositoryChange={setSelectedRepository}
          />
        ) : (
          <>
            <section
              className="summary-grid"
              aria-label="Repository summary"
            >
              <article className="summary-card">
                <span>Repositories</span>
                <strong>{overview.repositoryCount}</strong>
              </article>

              <article className="summary-card">
                <span>Open issues</span>
                <strong>{overview.openIssueCount}</strong>
              </article>

              <article className="summary-card summary-card--danger">
                <span>Failed workflows</span>
                <strong>
                  {overview.failingWorkflowCount}
                </strong>
              </article>
            </section>

            <div className="dashboard-grid">
              <section
                className="panel"
                id="repositories"
              >
                <header className="panel-header">
                  <div>
                    <p className="eyebrow">
                      Current state
                    </p>
                    <h2>Tracked repositories</h2>
                  </div>

                  <span>
                    Synced{" "}
                    {formatRelativeTime(
                      overview.lastSyncedAt,
                    )}
                  </span>
                </header>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Repository</th>
                        <th>Issues</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>

                    <tbody>
                      {overview.repositories.map(
                        (repository) => (
                          <tr key={repository.id}>
                            <td>
                              <strong>
                                {repository.name}
                              </strong>
                              <small>
                                {repository.language}
                              </small>
                            </td>
                            <td>
                              {repository.openIssues}
                            </td>
                            <td>
                              <StatusBadge
                                status={
                                  repository.status
                                }
                              />
                            </td>
                            <td>
                              {formatRelativeTime(
                                repository.updatedAt,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section
                className="panel"
                id="workflows"
              >
                <header className="panel-header">
                  <div>
                    <p className="eyebrow">
                      Latest automation
                    </p>
                    <h2>Workflow runs</h2>
                  </div>
                </header>

                <div className="workflow-list">
                  {overview.workflowRuns.map((run) => (
                    <article
                      className="workflow"
                      key={run.id}
                    >
                      <span
                        className={`workflow-indicator workflow-indicator--${run.status}`}
                      />

                      <div>
                        <strong>{run.workflow}</strong>
                        <span>
                          {run.repository} · {run.branch}
                        </span>
                      </div>

                      <div className="workflow-meta">
                        <StatusBadge
                          status={run.status}
                        />
                        <time dateTime={run.startedAt}>
                          {formatRelativeTime(
                            run.startedAt,
                          )}
                        </time>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
