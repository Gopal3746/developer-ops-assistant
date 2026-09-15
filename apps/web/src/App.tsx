type RepositoryStatus = "healthy" | "attention" | "failing";

interface Repository {
  name: string;
  language: string;
  openIssues: number;
  status: RepositoryStatus;
  updated: string;
}

interface WorkflowRun {
  repository: string;
  workflow: string;
  branch: string;
  status: "passed" | "failed" | "running";
  started: string;
}

const repositories: Repository[] = [
  {
    name: "developer-ops-assistant",
    language: "TypeScript",
    openIssues: 3,
    status: "healthy",
    updated: "12 minutes ago",
  },
  {
    name: "open-source-release-intelligence",
    language: "Python",
    openIssues: 7,
    status: "attention",
    updated: "4 hours ago",
  },
  {
    name: "job-scheduler",
    language: "Python",
    openIssues: 0,
    status: "failing",
    updated: "1 day ago",
  },
];

const workflowRuns: WorkflowRun[] = [
  {
    repository: "developer-ops-assistant",
    workflow: "verify",
    branch: "main",
    status: "passed",
    started: "18 minutes ago",
  },
  {
    repository: "job-scheduler",
    workflow: "test",
    branch: "main",
    status: "failed",
    started: "46 minutes ago",
  },
  {
    repository: "open-source-release-intelligence",
    workflow: "daily-ingestion",
    branch: "main",
    status: "running",
    started: "1 hour ago",
  },
];

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-badge--${status}`}>{status}</span>;
}

function App() {
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

          <span className="data-label">Sample data</span>
        </header>

        <section className="summary-grid" aria-label="Repository summary">
          <article className="summary-card">
            <span>Repositories</span>
            <strong>8</strong>
          </article>

          <article className="summary-card">
            <span>Open issues</span>
            <strong>14</strong>
          </article>

          <article className="summary-card summary-card--danger">
            <span>Failed workflows</span>
            <strong>2</strong>
          </article>
        </section>

        <div className="dashboard-grid">
          <section className="panel" id="repositories">
            <header className="panel-header">
              <div>
                <p className="eyebrow">Current state</p>
                <h2>Tracked repositories</h2>
              </div>
              <span>{repositories.length} displayed</span>
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
                  {repositories.map((repository) => (
                    <tr key={repository.name}>
                      <td>
                        <strong>{repository.name}</strong>
                        <small>{repository.language}</small>
                      </td>
                      <td>{repository.openIssues}</td>
                      <td>
                        <StatusBadge status={repository.status} />
                      </td>
                      <td>{repository.updated}</td>
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
              {workflowRuns.map((run) => (
                <article
                  className="workflow"
                  key={`${run.repository}-${run.workflow}`}
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
                    <StatusBadge status={run.status} />
                    <time>{run.started}</time>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
