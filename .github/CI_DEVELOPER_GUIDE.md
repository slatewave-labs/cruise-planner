# CI/CD Developer Quick Reference

Quick commands for running CI checks locally before pushing.

## Prerequisites

```bash
# Backend
cd backend
pip install -r requirements.txt
pip install black isort flake8 mypy pytest pytest-asyncio pytest-cov httpx

# Frontend
cd frontend
yarn install
```

## Run All Checks

### Backend

```bash
cd backend

# Format code
black .
isort .

# Lint
flake8 . --max-line-length=88 --extend-ignore=E203,W503
mypy . --ignore-missing-imports

# Test
pytest tests/ -v

# Test with coverage
pytest tests/ -v --cov=. --cov-report=term
```

### Frontend

```bash
cd frontend

# Lint
yarn lint

# Lint with auto-fix
yarn lint --fix

# Test
CI=true yarn test --watchAll=false

# Build
yarn build
```

## Common Issues

### Backend

**Black fails:**
```bash
# Auto-fix
black .
```

**Isort fails:**
```bash
# Auto-fix
isort .
```

**Flake8 fails with "line too long":**
- Break long lines into multiple lines
- Use parentheses for implicit line continuation
- Max line length is 88 characters

**Tests fail to import modules:**
```bash
# Ensure you're in the backend directory
cd backend
pip install -r requirements.txt
```

### Frontend

**ESLint fails:**
```bash
# Auto-fix what can be fixed
yarn lint --fix

# Then manually fix remaining issues
```

**Tests fail with module not found:**
```bash
# Reinstall dependencies
rm -rf node_modules
yarn install
```

**Build fails:**
```bash
# Clear cache and rebuild
rm -rf build
yarn build
```

## Pre-Push Checklist

✅ Run linters and auto-fix:
```bash
cd backend && black . && isort .
cd ../frontend && yarn lint --fix
```

✅ Run tests:
```bash
cd backend && pytest tests/ -v
cd ../frontend && CI=true yarn test --watchAll=false
```

✅ Verify builds:
```bash
cd backend && docker build -t test .  # Optional: test Docker build
cd ../frontend && yarn build
```

✅ Check git status:
```bash
git status
git diff
```

✅ Commit and push:
```bash
git add .
git commit -m "Your commit message"
git push
```

## CI Workflow Stages

When you push, GitHub Actions runs:

1. **Linting** (2-3 min)
   - Backend: black, isort, flake8, mypy
   - Frontend: ESLint

2. **Testing** (3-5 min)
   - Backend: pytest with DynamoDB Local
   - Frontend: Jest with React Testing Library

3. **Building** (3-5 min)
   - Backend: Docker image
   - Frontend: Production bundle

4. **Security** (3-5 min)
   - SAST: Semgrep
   - SCA: Trivy

**Total CI time: ~5-8 minutes** (stages run in parallel)

## Need Help?

- Check `.github/workflows/README.md` for detailed workflow documentation
- Check `.github/BRANCH_PROTECTION_SETUP.md` for branch protection configuration
- Review the Actions tab on GitHub for detailed logs
