# GitHub Actions Workflows

This directory contains the complete CI/CD pipeline for the static site template.

## Pipeline Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   CI (PR)   │────▶│ Deploy Test  │────▶│ Deploy Prod  │
│ lint/test/  │     │  S3 + CF     │     │  S3 + CF     │
│ build/e2e/  │     │ (auto on     │     │ (tag v* or   │
│ security    │     │  main)       │     │  manual)     │
└─────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐    ┌──────────────┐
│ Setup Test   │    │ Setup Prod   │    One-time infra provisioning
│ S3+CF+OAC   │    │ S3+CF+OAC   │    (manual dispatch)
└──────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────┐
│Teardown Test │    │Teardown Prod │    Destroy infrastructure
│ (DESTROY     │    │ (DESTROY     │    (requires confirmation)
│  TEST)       │    │  PROD)       │
└──────────────┘    └──────────────┘
```

## Workflows

### CI (`ci.yml`)

**Triggers:** PRs and pushes to `main`/`develop`

| Job | Description |
|-----|-------------|
| **Lint** | ESLint |
| **Test** | Jest with coverage |
| **Build** | Production build |
| **E2E** | Playwright (against built bundle) |
| **Security** | Semgrep (SAST) + Trivy (SCA) |
| **YAML Lint** | Validates workflow files |
| **CI Success** | Gate — requires all above to pass |

### Deploy Test (`deploy-test.yml`)

**Triggers:** Auto when CI passes on `main`, or manual dispatch

1. Checks S3 bucket exists (run `setup-test` first)
2. Builds frontend
3. Syncs to S3 with smart caching
4. Invalidates CloudFront
5. Runs smoke test

### Deploy Production (`deploy-prod.yml`)

**Triggers:** Version tags (`v*`) or manual dispatch

1. Runs full CI validation
2. Checks infrastructure exists
3. Builds and deploys to S3
4. Invalidates CloudFront
5. Deploys production `robots.txt`
6. Runs smoke test

### Setup Test / Prod (`setup-test.yml`, `setup-prod.yml`)

**Trigger:** Manual only

Provisions from scratch (self-healing — skips existing resources):

1. **S3 Bucket** — Private, versioned, encrypted
2. **CloudFront OAC** — Origin Access Control
3. **CloudFront Distribution** — HTTPS, HTTP/2+3, gzip
4. **S3 Bucket Policy** — CloudFront-only access
5. **DNS** (optional) — Route 53 alias record
6. **Initial Deploy** — Builds and deploys the site

### Teardown Test / Prod (`teardown-test.yml`, `teardown-prod.yml`)

**Trigger:** Manual only — requires confirmation string

Destroys in order:

1. CloudFront distribution + OAC
2. S3 bucket (empties all versions first)
3. DNS record

**Preserved:** ACM certificates, Route 53 hosted zone

### E2E Test / Prod (`e2e-test.yml`, `e2e-prod.yml`)

**Trigger:** Manual — run Playwright against deployed environments

## Required Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS IAM secret key |
| `AWS_REGION` | No | Defaults to `us-east-1` |
| `TEST_DOMAIN` | No | Custom domain for test (e.g., `example.com` → `test.example.com`) |
| `PROD_DOMAIN` | No | Custom domain for prod (e.g., `example.com`) |
| `TEST_ACM_CERT_ARN` | No | ACM cert ARN for test custom domain |
| `PROD_ACM_CERT_ARN` | No | ACM cert ARN for prod custom domain |

## Required Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | `static-site` | Used as prefix for all AWS resources |

## Branch Protection

Recommended status checks for `main`:

- `Lint`
- `Test`
- `Build`
- `E2E (Playwright)`
- `Security Scan`
- `YAML Lint`
- `CI Success`

## Local Development

```bash
# Lint
cd frontend && yarn lint

# Test
cd frontend && yarn test --watchAll=false

# Build
cd frontend && yarn build

# E2E (requires built bundle)
npx serve -s frontend/build -l 3000 &
cd tests/e2e && npm ci && npx playwright test
```
