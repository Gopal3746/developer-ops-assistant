# Developer Operations Assistant

[![Verify](https://github.com/Gopal3746/developer-ops-assistant/actions/workflows/verify.yml/badge.svg)](https://github.com/Gopal3746/developer-ops-assistant/actions/workflows/verify.yml)

A full-stack TypeScript dashboard for monitoring GitHub repository health,
open issues, and CI workflow activity from one place. Repository data is
synchronized into PostgreSQL, exposed through a Fastify API, and displayed in
a React dashboard. An optional OpenAI integration classifies issues by
category and priority and produces concise triage summaries.

![Repository health dashboard](docs/dashboard-overview.png)

## Highlights

- Synchronizes repositories, open issues, and recent workflow runs through the
  GitHub API.
- Stores normalized repository data in PostgreSQL with versioned Drizzle
  migrations.
- Presents repository health, issue counts, and recent CI status in a
  responsive React dashboard.
- Supports issue filtering by repository, AI status, category, and priority.
- Optionally classifies issues as bugs, features, questions, documentation, or
  other work, with low-to-urgent priority levels.
- Preserves AI classifications across GitHub syncs and resets them only when
  relevant issue content changes.
- Serializes GitHub sync and classification writes to prevent overlapping
  operations.
- Returns safe API errors with request IDs while retaining detailed server
  logs.
- Runs 42 unit/API tests and 3 PostgreSQL integration tests in CI.

## Architecture

```mermaid
flowchart LR
    A[React dashboard] -->|REST| B[Fastify API]
    B --> C[(PostgreSQL)]
    B --> D[GitHub API]
    B -. optional .-> E[OpenAI API]
```

The API owns all external integrations and database access. Shared TypeScript
contracts keep API responses and frontend consumers aligned.

GitHub synchronization is handled as a transactional snapshot replacement:

1. Fetch the configured owner's most recently updated repositories.
2. Fetch open issues and recent workflow runs for each repository.
3. Derive repository health from issue and workflow state.
4. Replace the tracked snapshot in one database transaction.
5. Preserve classifications for unchanged issues and return changed issues to
   the pending queue.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, CSS |
| API | Node.js 22, Fastify, TypeScript |
| Data | PostgreSQL 17, Drizzle ORM, Drizzle Kit |
| Integrations | GitHub API through Octokit, optional OpenAI Responses API |
| Testing | Vitest, Fastify injection tests, PostgreSQL integration tests |
| Tooling | npm workspaces, Docker Compose, ESLint, GitHub Actions |

## Repository structure

```text
.
├── apps
│   ├── api                 # Fastify API, integrations, stores, and migrations
│   └── web                 # React dashboard
├── packages
│   └── shared              # Shared TypeScript request/response contracts
├── compose.yaml            # Local PostgreSQL service
└── .github/workflows       # CI verification pipeline
```

## Prerequisites

- Node.js 22 or newer
- npm
- Docker Desktop or another Docker Compose-compatible runtime
- Optional: a GitHub token for live repository synchronization
- Optional: an OpenAI API key for live issue classification

The application starts without GitHub or OpenAI credentials. You can seed the
database with local sample data to explore the dashboard and API. Actions for
unconfigured optional integrations return controlled `503` responses.

## Local setup

### 1. Install dependencies

```bash
git clone https://github.com/Gopal3746/developer-ops-assistant.git
cd developer-ops-assistant
npm install
```

### 2. Configure the applications

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The copied defaults are sufficient for PostgreSQL-backed local development.
Add both variables in an optional integration pair or leave both blank.

| Variable | Required | Default or purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Local PostgreSQL connection URL |
| `API_HOST` | No | `0.0.0.0` |
| `API_PORT` | No | `3001` |
| `WEB_ORIGIN` | No | `http://localhost:5173` |
| `GITHUB_TOKEN` | No | Enables GitHub synchronization when paired with `GITHUB_OWNER` |
| `GITHUB_OWNER` | No | GitHub user or organization to synchronize |
| `GITHUB_REPOSITORY_LIMIT` | No | Maximum repositories per sync; defaults to `10` |
| `OPENAI_API_KEY` | No | Enables AI triage when paired with `OPENAI_MODEL` |
| `OPENAI_MODEL` | No | Responses API model used for classification |
| `VITE_API_URL` | No | Frontend API URL; defaults to `http://localhost:3001` |

Keep real credentials in local `.env` files. They are ignored by Git and
should never be committed.

### 3. Start PostgreSQL and apply migrations

```bash
docker compose up -d --wait
npm run db:migrate --workspace @developer-ops/api
```

Populate the database with deterministic sample data:

```bash
npm run db:seed --workspace @developer-ops/api
```

Or, after configuring `GITHUB_TOKEN` and `GITHUB_OWNER`, synchronize live
GitHub data:

```bash
npm run github:sync --workspace @developer-ops/api
```

### 4. Start the API and dashboard

```bash
npm run dev
```

- Dashboard: <http://localhost:5173>
- API health check: <http://localhost:3001/health>

## Optional integrations

### GitHub synchronization

Set both values in `apps/api/.env`:

```env
GITHUB_TOKEN=your-token
GITHUB_OWNER=your-user-or-organization
GITHUB_REPOSITORY_LIMIT=10
```

The token must be able to read the repositories, issues, and Actions workflow
runs that you want to monitor. Use **Sync now** in the dashboard or run the
workspace command shown above.

### AI issue triage

Set both values in `apps/api/.env`:

```env
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=your-responses-api-model
```

AI triage is intentionally optional. Without these values, the rest of the
application and all automated tests continue to work. When enabled, the
classifier:

- treats issue text as untrusted input;
- requires schema-constrained category, priority, and summary output;
- validates every response before persistence;
- records per-issue failures for controlled retries; and
- sends requests with response storage disabled.

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | API availability and timestamp |
| `GET` | `/api/overview` | Repository counts, health, and recent workflows |
| `GET` | `/api/issues` | Open issues with optional filters |
| `POST` | `/api/github/sync` | Synchronize configured GitHub data |
| `POST` | `/api/issues/classify` | Classify pending issues or retry failed issues |

Issue filters:

```text
GET /api/issues?repository=owner/repository
                &classificationStatus=classified
                &category=bug
                &priority=high
                &limit=50
```

Classification request:

```bash
curl -X POST http://localhost:3001/api/issues/classify \
  -H 'content-type: application/json' \
  -d '{"status":"pending","limit":25}'
```

Use `"status":"failed"` to retry issues whose previous classification
attempt failed. Limits must be integers between 1 and 100.

## Verification

Run the standard local checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

The regular test command remains database-independent. PostgreSQL integration
tests use a separate database and refuse to run unless its name ends in
`_test`.

Create the test database once in the local Compose container:

```bash
if ! docker exec developer-ops-postgres \
  psql -U developer_ops -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'developer_ops_test'" \
  | grep -q 1; then
  docker exec developer-ops-postgres \
    createdb -U developer_ops developer_ops_test
fi
```

Run the database suite:

```bash
TEST_DATABASE_URL='postgresql://developer_ops:developer_ops@localhost:5432/developer_ops_test' \
  npm run test:integration
```

The integration suite applies the real migrations and verifies issue
filtering, classification preservation and reset behavior, stale issue
removal, and foreign-key cascades.

## Continuous integration

The GitHub Actions `Verify` workflow runs on pushes and pull requests to
`main`. It provisions PostgreSQL 17 and executes:

1. dependency installation with `npm ci`;
2. TypeScript checks and frontend linting;
3. 42 unit and API tests;
4. 3 PostgreSQL integration tests;
5. production builds; and
6. a production dependency audit.

Concurrent runs for the same Git reference are cancelled so only the latest
verification continues.

## Reliability and safety decisions

- GitHub snapshots are persisted inside database transactions.
- Repository deletions cascade to related issues and workflow runs.
- AI metadata is preserved only while classification-relevant content remains
  unchanged.
- GitHub sync and AI classification cannot write concurrently in one API
  process.
- Invalid filters and batch sizes return `400` responses.
- Unconfigured optional integrations return `503` responses.
- Competing write operations return `409` responses.
- Unexpected failures return a generic message and request ID; detailed errors
  remain in server logs.

## Current scope

This repository is a portfolio-oriented internal operations tool, not a
multi-tenant hosted service. The operation coordinator is process-local, and
authentication, durable job queues, webhooks, pagination controls, and
production deployment infrastructure are natural next steps for a hosted
version.
