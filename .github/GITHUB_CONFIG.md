# ShoreExplorer — CI/CD & GitHub Configuration

> Last updated: 2026-02-19

This directory contains the CI/CD pipelines, branch protection configuration, and developer guides for ShoreExplorer.

---

## Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| [`ci.yml`](workflows/ci.yml) | Every PR to `main` | Lint, test, build, and security scan (9 parallel jobs) |
| [`deploy-test.yml`](workflows/deploy-test.yml) | Push to `main` / manual | Deploy to AWS test environment (ECS) |
| [`deploy-prod.yml`](workflows/deploy-prod.yml) | Git tags / manual | Deploy to AWS production environment (ECS) |
| [`e2e-test.yml`](workflows/e2e-test.yml) | After test deploy / manual | Playwright E2E tests against test environment |
| [`e2e-prod.yml`](workflows/e2e-prod.yml) | After prod deploy / manual | Playwright E2E tests against production |

See [workflows/README.md](workflows/README.md) for full workflow documentation.

## CI Pipeline Overview

When a PR is opened against `main`, the CI pipeline runs these jobs in parallel:

| Job | What It Checks |
|-----|----------------|
| **Backend Linting** | black, isort, flake8, mypy |
| **Backend Tests** | pytest with DynamoDB Local |
| **Backend Integrity** | E2E tests against live server |
| **Backend Docker Build** | Dockerfile builds successfully |
| **Frontend Linting** | ESLint |
| **Frontend Tests** | Jest + React Testing Library |
| **Frontend Build** | Production bundle compiles |
| **Frontend E2E** | Playwright browser tests |
| **Security** | Semgrep (SAST) + Trivy (SCA) |

All checks must pass before a PR can be merged.

## Documentation

| File | Audience | Description |
|------|----------|-------------|
| [CI_DEVELOPER_GUIDE.md](CI_DEVELOPER_GUIDE.md) | Developers | Local commands, pre-push checklist, common issues |
| [CI_PIPELINE_DIAGRAM.md](CI_PIPELINE_DIAGRAM.md) | Developers | Visual diagram of CI job flow |
| [CI_CD_IMPLEMENTATION_SUMMARY.md](CI_CD_IMPLEMENTATION_SUMMARY.md) | DevOps | Full implementation details and design decisions |
| [BRANCH_PROTECTION_SETUP.md](BRANCH_PROTECTION_SETUP.md) | Admins | How to configure branch protection rules |
| [workflows/README.md](workflows/README.md) | DevOps | Detailed workflow reference |

## Run CI Checks Locally

```bash
# Backend
cd backend
black . && isort . && flake8 . && mypy .
pytest tests/

# Frontend
cd frontend
yarn lint
yarn test

# Integration & E2E
cd tests/e2e && npx playwright test
```

## Cost

- **Public repos:** Free (GitHub Actions, Semgrep, Trivy)
- **Private repos:** 2,000 free GitHub Actions minutes/month (~100 PRs)
