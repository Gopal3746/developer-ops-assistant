# Developer Operations Assistant

Developer Operations Assistant is a TypeScript internal tool for monitoring
GitHub repository health from one place.

The project will collect repository, issue, pull request, and CI workflow
activity and display it through a centralized operations dashboard.

## Planned architecture

- TypeScript and Fastify API
- React dashboard
- PostgreSQL persistence
- GitHub API and webhook integrations
- LLM-powered issue classification and CI failure summaries
- Docker-based local development
- GitHub Actions continuous integration

## Project status

## Current functionality

- Fastify API with health and repository-overview endpoints
- React dashboard displaying repository and CI workflow health
- Shared TypeScript contracts between the API and frontend
- Automated API tests, type checking, and frontend linting
- One-command local development for both applications

The dashboard currently uses sample repository data returned by the API.
PostgreSQL persistence and GitHub ingestion are planned next.
