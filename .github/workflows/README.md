# GitHub Actions CI/CD Workflows

This directory contains the GitHub Actions workflows for ShoreExplorer.

## Workflows

### CI Workflow (`ci.yml`)

**Triggers:** Pull requests and pushes to `main` and `develop` branches

**Purpose:** Ensures code quality, security, and functionality before merge

**Jobs:**

1. **Backend Linting** - Validates Python code style and quality
   - Black (code formatting)
   - isort (import sorting)
   - flake8 (linting)
   - mypy (type checking - advisory)

2. **Backend Tests** - Runs Python unit tests
   - Uses DynamoDB Local service container
   - Generates code coverage reports
   - Runs pytest with coverage

3. **Frontend Linting** - Validates JavaScript/React code style
   - ESLint with React and React Hooks plugins
   - Zero warnings tolerance

4. **Frontend Tests** - Runs JavaScript unit tests
   - Jest with React Testing Library
   - Generates code coverage reports
   - CI mode (non-interactive)

5. **Frontend Build** - Validates production build
   - Ensures the React app builds successfully
   - Creates production bundle
   - Uploads build artifacts

6. **Backend Build** - Validates Docker image build
   - Builds backend Docker image
   - Uses BuildKit cache for speed
   - Validates Dockerfile

7. **SAST (Security)** - Static Application Security Testing
   - Uses Semgrep for vulnerability scanning
   - Scans for OWASP Top 10 vulnerabilities
   - Language-specific security patterns (Python, JavaScript)
   - Uploads results to GitHub Security tab

8. **SCA (Security)** - Software Composition Analysis
   - Uses Trivy for dependency vulnerability scanning
   - Scans both backend and frontend dependencies
   - Detects critical, high, and medium severity vulnerabilities
   - Scans for secrets and misconfigurations
   - Uploads results to GitHub Security tab

9. **CI Success** - Final gate
   - Requires all critical jobs to pass
   - Blocks PR merge if any job fails

## Required GitHub Secrets

While the workflows are designed to work out-of-the-box, the following optional secrets enhance functionality:

- `SEMGREP_APP_TOKEN` - Optional: For Semgrep Cloud features and enhanced reporting

## Branch Protection Rules

To enforce the CI checks, configure these branch protection rules for `main` and `develop`:

1. Require pull request reviews before merging
2. Require status checks to pass before merging:
   - Backend Linting
   - Backend Tests
   - Backend Docker Build
   - Frontend Linting
   - Frontend Tests
   - Frontend Build
   - SAST (Semgrep)
   - SCA (Trivy)
   - CI Success
3. Require branches to be up to date before merging
4. Require conversation resolution before merging

## Security Scanning

### SAST (Semgrep)
- Scans code for security vulnerabilities
- Checks against OWASP Top 10
- Language-specific rules for Python and JavaScript
- Results visible in GitHub Security → Code scanning alerts

### SCA (Trivy)
- Scans dependencies for known vulnerabilities
- Checks for exposed secrets
- Validates configuration files
- Separate scans for backend (Python) and frontend (Node.js)
- Results visible in GitHub Security → Dependabot alerts

## Local Development

### Running checks locally before pushing:

**Backend:**
```bash
cd backend
black --check .
isort --check-only .
flake8 . --max-line-length=88 --extend-ignore=E203,W503
mypy . --ignore-missing-imports
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
yarn lint
yarn test --watchAll=false
yarn build
```

## Workflow Optimization

The workflows use several optimizations for speed:

1. **Dependency Caching** - pip and yarn caches are reused
2. **Docker BuildKit Cache** - Docker builds use GitHub Actions cache
3. **Parallel Jobs** - Independent jobs run in parallel
4. **Concurrency Control** - Cancels in-progress runs when new commits are pushed

## Troubleshooting

### Backend tests fail
- Ensure DynamoDB Local service is healthy
- Check environment variables are set correctly
- Verify Python dependencies are installed

### Frontend tests fail
- Check for console errors in test output
- Ensure all mocks are properly configured
- Verify `CI=true` environment variable is set

### Linting fails
- Run linters locally to see specific issues
- Backend: Run `black .` and `isort .` to auto-fix
- Frontend: ESLint can auto-fix some issues with `yarn lint --fix`

### Security scans fail
- Review the SARIF results in GitHub Security tab
- High/Critical vulnerabilities should be addressed
- False positives can be suppressed with inline comments

## Adding New Checks

To add new checks to the CI pipeline:

1. Add a new job to `ci.yml`
2. Add the job to the `needs` array in `ci-success` job
3. Update branch protection rules to include the new check
4. Document the new check in this README

## Performance

Typical CI run times:
- Backend lint: ~1-2 minutes
- Backend test: ~2-3 minutes
- Frontend lint: ~1-2 minutes
- Frontend test: ~2-3 minutes
- Frontend build: ~2-3 minutes
- Backend build: ~3-4 minutes
- SAST: ~2-3 minutes
- SCA: ~2-3 minutes

**Total (parallel):** ~5-8 minutes

## Cost

All workflows use GitHub-hosted runners (free for public repositories, included minutes for private repositories). Security scanning tools (Semgrep, Trivy) are free for open source projects.

---

## Deployment Workflows

### Test Deployment (`deploy-test.yml`)

**Triggers:** 
- Automatic: When CI passes on `main` branch
- Manual: Via workflow dispatch

**Environment:** `test`

**Purpose:** Deploys to test environment after CI validation

**Domain Configuration:**
- Default: Uses ALB DNS name (e.g., `shoreexplorer-test-alb-123.us-east-1.elb.amazonaws.com`)
- Custom: Uses `test.yourdomain.com` subdomain if `TEST_DOMAIN` secret is configured

**Jobs:**
1. Build backend and frontend Docker images
2. Push images to Amazon ECR
3. Update ECS services with new images
4. Run smoke tests
5. Generate deployment summary

### Production Deployment (`deploy-prod.yml`)

**Triggers:**
- Automatic: When a version tag is pushed (e.g., `v1.0.0`)
- Manual: Via workflow dispatch with optional image tag

**Environment:** `production`

**Purpose:** Deploys to production with additional safeguards

**Domain Configuration:**
- Default: Uses ALB DNS name (e.g., `shoreexplorer-prod-alb-456.us-east-1.elb.amazonaws.com`)
- Custom: Uses apex domain `yourdomain.com` if `PROD_DOMAIN` secret is configured

**Jobs:**
1. **CI Validation** - Runs full CI suite before deployment
2. **Deploy** - Builds, pushes, and deploys to production
3. **Smoke Tests** - Validates deployment with retries
4. **Rollback** (if failed) - Automatically rolls back to previous task definition

---

## Configuring Custom Domains

To use custom domains instead of ALB DNS names, configure these GitHub secrets:

### For Test Environment

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add a new repository secret:
   - **Name:** `TEST_DOMAIN`
   - **Value:** Your base domain (e.g., `shoreexplorer.com`)
3. The workflow will automatically use `test.shoreexplorer.com`

### For Production Environment

1. Add a new repository secret:
   - **Name:** `PROD_DOMAIN`
   - **Value:** Your base domain (e.g., `shoreexplorer.com`)
2. The workflow will automatically use `shoreexplorer.com` (apex domain)

### Important Notes

- Domain must be properly configured in Route 53 (see [DNS Setup Guide](../../infra/aws/DNS-SETUP.md))
- HTTPS requires additional setup (see [HTTPS Setup Guide](../../infra/aws/HTTPS-SETUP.md))
- If secrets are not configured, workflows fall back to ALB DNS
- Custom domains apply to both frontend build-time `REACT_APP_BACKEND_URL` and smoke tests

### Example Domain Configuration

Without custom domain secrets:
```
Test:       http://shoreexplorer-test-alb-123.us-east-1.elb.amazonaws.com
Production: http://shoreexplorer-prod-alb-456.us-east-1.elb.amazonaws.com
```

With custom domain secrets (`shoreexplorer.com`):
```
Test:       http://test.shoreexplorer.com
Production: http://shoreexplorer.com
```

---

## Required Secrets for Deployment

### AWS Credentials

Both deployment workflows require:
- `AWS_ACCESS_KEY_ID` - AWS IAM access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM secret key
- `AWS_REGION` (optional) - Defaults to `us-east-1`

### Optional Domain Secrets

- `TEST_DOMAIN` - Base domain for test environment (creates `test.yourdomain.com`)
- `PROD_DOMAIN` - Base domain for production environment (uses `yourdomain.com`)

---

## Deployment Environments

GitHub environments are used for additional protection:

### Test Environment (`test`)
- No approval required
- Deploys automatically when CI passes
- Uses test resources (lower CPU/memory)

### Production Environment (`production`)
- Optional: Configure manual approval in repository settings
- Deploys on version tags or manual trigger
- Uses production resources (higher CPU/memory, 2+ replicas)
- Runs full CI validation before deployment
- Automatic rollback on failure

