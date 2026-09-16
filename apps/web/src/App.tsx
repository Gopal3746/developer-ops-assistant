import type { DashboardOverview } from "@developer-ops/shared";
import { useEffect, useState } from "react";

import { fetchOverview } from "./api";

function formatRelativeTime(timestamp: string): string {
  const elapsedMilliseconds = Date.now() - new Date(timestamp).getTime();
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
  return <span className={`status-badge status-badge--${status}`}>{status}</span>;
}

function App() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview(): Promise<void> {
      try {
        const result = await fetchOverview(controller.signal);

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

  const connectionLabel = errorMessage
    ? "API unavailable"
    : overview
      ? "API connected · sample data"
      : "Connecting to API";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">DO</span>
          <span>Developer Ops</span>
        </div>

        <nav aria-label="Primary navigation">
          <a className="nav-link nav-link--active" href="#overview">
            Overview
          </a>
          <a className="nav-link" href="#repositories">
            Repositories
          </a>
          <a className="nav-link" href="#workflows">
            Workflows
          </a>
        </nav>

        <div className="connection-status">
          <span className="connection-dot" />
          GitHub connection pending
        </div>
      </aside>

      <main id="overview">
        <header className="page-header">
          <div>
            <p className="eyebrow">Developer operations</p>
            <h1>Repository health</h1>
            <p className="page-description">
              Monitor issues and CI activity across your projects.
            </p>
          </div>

          <span
            className={[
              "data-label",
              overview ? "data-label--connected" : "",
              errorMessage ? "data-label--error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {connectionLabel}
          </span>
        </header>

        {!overview ? (
          <section
            className={`panel dashboard-state ${
              errorMessage ? "dashboard-state--error" : ""
            }`}
            role={errorMessage ? "alert" : "status"}
          >
            <h2>{errorMessage ? "Could not load dashboard" : "Loading dashboard"}</h2>
            <p>{errorMessage ?? "Requesting repository data from the API…"}</p>
          </section>
        ) : (
          <>
            <section className="summary-grid" aria-label="Repository summary">
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
                <strong>{overview.failingWorkflowCount}</strong>
              </article>
            </section>

            <div className="dashboard-grid">
              <section className="panel" id="repositories">
                <header className="panel-header">
                  <div>
                    <p className="eyebrow">Current state</p>
                    <h2>Tracked repositories</h2>
                  </div>

                  <span>
                    Synced {formatRelativeTime(overview.lastSyncedAt)}
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
                      {overview.repositories.map((repository) => (
                        <tr key={repository.id}>
                          <td>
                            <strong>{repository.name}</strong>
                            <small>{repository.language}</small>
                          </td>
                          <td>{repository.openIssues}</td>
                          <td>
                            <StatusBadge status={repository.status} />
                          </td>
                          <td>{formatRelativeTime(repository.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel" id="workflows">
                <header className="panel-header">
                  <div>
                    <p className="eyebrow">Latest automation</p>
                    <h2>Workflow runs</h2>
                  </div>
                </header>

                <div className="workflow-list">
                  {overview.workflowRuns.map((run) => (
                    <article className="workflow" key={run.id}>
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
                        <StatusBadge status={run.status} />
                        <time dateTime={run.startedAt}>
                          {formatRelativeTime(run.startedAt)}
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
