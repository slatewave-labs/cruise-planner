# Static Site Template — Copilot Instructions

## Project Overview

This is a **template repository** for hosting static websites on AWS S3 + CloudFront, with a production-grade CI/CD pipeline powered by GitHub Actions.

**Key features:**
- React 18 + Tailwind CSS frontend
- 9 GitHub Actions workflows (CI, deploy, setup, teardown, E2E)
- AWS S3 + CloudFront with OAC (Origin Access Control)
- Optional custom domain via Route 53 + ACM
- Semgrep + Trivy security scanning
- Playwright E2E testing

---

## Tech Stack

### Frontend
- **Framework:** React 18.2.0 (Create React App)
- **Styling:** Tailwind CSS 3.4.0
- **Routing:** React Router v6
- **Icons:** lucide-react
- **Testing:** Jest + React Testing Library
- **E2E:** Playwright
- **Linting:** ESLint
- **Package Manager:** Yarn

### Infrastructure
- **Hosting:** AWS S3 (private bucket, versioned, encrypted)
- **CDN:** CloudFront (HTTP/2+3, gzip, HTTPS)
- **Access Control:** CloudFront OAC (Origin Access Control)
- **DNS:** Route 53 (optional)
- **SSL:** ACM (optional)
- **CI/CD:** GitHub Actions

---

## Project Structure

```
├── .github/workflows/          # 9 GitHub Actions workflows
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.js              # Router (Home, About, 404)
│   │   ├── pages/              # Page components
│   │   ├── components/         # Layout (header + footer)
│   │   └── __tests__/          # Jest tests
│   ├── public/                 # Static assets
│   ├── package.json
│   └── tailwind.config.js
├── tests/e2e/                  # Playwright specs
├── infra/aws/                  # AWS documentation
├── .gitignore
├── .yamllint.yml
└── README.md
```

---

## Coding Standards

### JavaScript/React

- Use ES6+ syntax (arrow functions, destructuring, template literals)
- Functional components with hooks only (no class components)
- One component per file, PascalCase filenames
- `const` over `let`, never `var`
- 2-space indentation, single quotes
- Tailwind utility classes (no custom CSS unless necessary)
- ESLint with zero-warning policy

### Styling

- Use Tailwind classes from `tailwind.config.js`
- Primary colour: `bg-primary` (#0F172A)
- Accent colour: `bg-accent` (#3B82F6)
- Background: `bg-secondary` (#F5F5F4)
- Headings: `font-heading` (Playfair Display)
- Body: `font-body` (Plus Jakarta Sans)
- Minimum 48px touch targets for accessibility
- Rounded buttons: `rounded-full`
- Cards: `rounded-2xl shadow-sm bg-white`

### Testing

- Unit tests: `frontend/src/__tests__/` (Jest + React Testing Library)
- E2E tests: `tests/e2e/specs/` (Playwright)
- Run: `cd frontend && yarn test --watchAll=false`
- Lint: `cd frontend && yarn lint`
- Build: `cd frontend && yarn build`

---

## GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR / push to main | Lint → Test → Build → E2E → Security → YAML Lint |
| `deploy-test.yml` | CI passes on main | Build → S3 → CloudFront invalidation |
| `deploy-prod.yml` | Tag `v*` / manual | Full CI → Build → S3 → CloudFront |
| `setup-test.yml` | Manual | Create S3 + CloudFront + OAC + DNS |
| `setup-prod.yml` | Manual | Same for production |
| `teardown-test.yml` | Manual (confirmation required) | Destroy test infrastructure |
| `teardown-prod.yml` | Manual (confirmation required) | Destroy prod infrastructure |
| `e2e-test.yml` | Manual | Playwright against test env |
| `e2e-prod.yml` | Manual | Playwright against prod env |

### Required GitHub Secrets

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (required)
- `AWS_REGION` (optional, defaults to us-east-1)
- `TEST_DOMAIN`, `PROD_DOMAIN` (optional custom domains)
- `TEST_ACM_CERT_ARN`, `PROD_ACM_CERT_ARN` (optional SSL certs)

### Repository Variable

- `PROJECT_NAME` (default: `static-site`) — prefix for AWS resources

---

## When Making Changes

1. Follow existing code patterns
2. Run `yarn lint` and `yarn test --watchAll=false` before committing
3. Keep components focused and single-purpose
4. Use descriptive names (`generatePlan()` not `doThing()`)
5. Handle loading and error states in the UI
6. Test at 375px width (mobile-first)
7. Maintain AA contrast ratios for accessibility
8. Never hardcode secrets or API keys
