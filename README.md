# Static Site Template — S3 + CloudFront + GitHub Actions

> A production-ready template for hosting static websites on AWS, with a best-in-class CI/CD pipeline.

---

## What You Get

- **React 18** with Tailwind CSS, React Router, and Lucide icons
- **Full CI pipeline** — lint, test, build, E2E, security scan, YAML lint on every PR
- **AWS infrastructure as workflows** — setup, deploy, and teardown test & prod environments with a single click
- **S3 + CloudFront** — private bucket, Origin Access Control, HTTPS, HTTP/2+3, gzip
- **Custom domain support** — optional Route 53 + ACM integration
- **Smart cache headers** — immutable hashed assets, no-cache for index.html
- **Security scanning** — Semgrep (SAST) + Trivy (SCA) on every PR
- **Playwright E2E** — browser tests against built bundle and deployed environments

---

## Quick Start

### 1. Use this template

Click **"Use this template"** on GitHub, or clone directly:

```bash
git clone <your-repo-url> my-site
cd my-site
```

### 2. Install dependencies

```bash
cd frontend
yarn install
```

### 3. Start developing

```bash
yarn start
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run tests

```bash
yarn test --watchAll=false
yarn lint
yarn build
```

---

## Project Structure

```
├── .github/
│   ├── workflows/              # GitHub Actions (9 workflows)
│   │   ├── ci.yml              # CI: lint → test → build → E2E → security → YAML lint
│   │   ├── deploy-test.yml     # Deploy to test (auto on main)
│   │   ├── deploy-prod.yml     # Deploy to prod (on tag v*)
│   │   ├── setup-test.yml      # Provision test infrastructure
│   │   ├── setup-prod.yml      # Provision prod infrastructure
│   │   ├── teardown-test.yml   # Destroy test environment
│   │   ├── teardown-prod.yml   # Destroy prod environment
│   │   ├── e2e-test.yml        # E2E against test deployment
│   │   └── e2e-prod.yml        # E2E against prod deployment
│   ├── agents/                 # GitHub Copilot agent configs
│   └── copilot-instructions.md # Copilot context
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.js              # Router setup
│   │   ├── pages/              # Home, About, NotFound
│   │   ├── components/         # Layout (header + footer)
│   │   ├── __tests__/          # Jest unit tests
│   │   └── index.css           # Tailwind + global styles
│   ├── public/                 # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   └── .eslintrc.json
│
├── tests/
│   └── e2e/                    # Playwright E2E tests
│       ├── specs/              # Test specs
│       ├── playwright.config.ts
│       └── package.json
│
├── infra/
│   └── aws/
│       └── README.md           # AWS architecture, IAM policy, costs
│
├── .gitignore
├── .yamllint.yml
└── README.md                   # This file
```

---

## CI/CD Pipeline

### On Every PR

| Job | What it does |
|-----|-------------|
| **Lint** | ESLint with zero-warning policy |
| **Test** | Jest with coverage report |
| **Build** | Production bundle |
| **E2E** | Playwright against served build (desktop + mobile) |
| **Security** | Semgrep (SAST) + Trivy (SCA) |
| **YAML Lint** | Validates workflow files |
| **CI Success** | Gate — all above must pass |

### Deployment

| Trigger | Workflow | What happens |
|---------|----------|-------------|
| CI passes on `main` | `deploy-test` | Build → S3 → CloudFront invalidation → smoke test |
| Tag `v*` pushed | `deploy-prod` | Full CI → build → S3 → CloudFront → smoke test |
| Manual | `deploy-test`/`deploy-prod` | Same as above |

### Infrastructure

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `setup-test` | Manual | Creates S3 bucket, CloudFront, OAC, DNS, initial deploy |
| `setup-prod` | Manual | Same for production |
| `teardown-test` | Manual (type "DESTROY TEST") | Deletes all test resources |
| `teardown-prod` | Manual (type "DESTROY PROD") | Deletes all prod resources |

---

## AWS Setup

### Prerequisites

1. An AWS account with an IAM user (see [infra/aws/README.md](./infra/aws/README.md) for required permissions)
2. GitHub repository secrets configured

### Required Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |

### Optional Secrets

| Secret | Description |
|--------|-------------|
| `AWS_REGION` | AWS region (default: `us-east-1`) |
| `TEST_DOMAIN` | Custom domain for test (e.g., `example.com` → `test.example.com`) |
| `PROD_DOMAIN` | Custom domain for prod (e.g., `example.com`) |
| `TEST_ACM_CERT_ARN` | ACM certificate ARN for test domain |
| `PROD_ACM_CERT_ARN` | ACM certificate ARN for prod domain |

### Repository Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | `static-site` | Prefix for all AWS resources |

### First Deploy

1. Add AWS secrets to your repository
2. Go to **Actions** → **Setup Test Environment** → **Run workflow**
3. Wait for infrastructure to be created (~2 minutes)
4. Push to `main` — deployments happen automatically

---

## Customisation

### Change the project name

Set the `PROJECT_NAME` repository variable. All AWS resources will be prefixed with this name.

### Add pages

1. Create a new component in `frontend/src/pages/`
2. Add a route in `frontend/src/App.js`
3. Add a link in `frontend/src/components/Layout.js`
4. Add tests in `frontend/src/__tests__/`

### Change styling

Edit `frontend/tailwind.config.js` for colours, fonts, and spacing.
Edit `frontend/src/index.css` for global styles.

### Add dependencies

```bash
cd frontend
yarn add <package-name>
```

---

## Testing

### Unit tests (Jest)

```bash
cd frontend
yarn test --watchAll=false
```

### E2E tests (Playwright)

```bash
# Build the site first
cd frontend && yarn build && cd ..

# Serve and test
npx serve -s frontend/build -l 3000 &
cd tests/e2e && npm ci && npx playwright test
```

### Lint

```bash
cd frontend && yarn lint
```

---

## Architecture

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
                    │  CloudFront  │  CDN (400+ edge locations)
                    │  HTTP/2+3    │  gzip, HTTPS, custom domain
                    └──────┬───────┘
                           │ OAC (signed requests)
                    ┌──────▼───────┐
                    │  S3 Bucket   │  Private, versioned, encrypted
                    │  (static     │  AES-256 encryption
                    │   files)     │  Smart cache headers
                    └──────────────┘
```

**Estimated cost:** $1–5/month for low-traffic sites. See [infra/aws/README.md](./infra/aws/README.md) for details.

---

## License

MIT
