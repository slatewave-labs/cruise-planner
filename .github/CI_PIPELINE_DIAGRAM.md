# CI/CD Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Create feature branch                                               │
│  2. Make code changes                                                   │
│  3. Run local checks (optional but recommended):                        │
│     Backend:  black . && isort . && flake8 . && pytest tests/         │
│     Frontend: yarn lint && yarn test && yarn build                     │
│  4. Commit and push                                                     │
│  5. Open Pull Request → Triggers CI Pipeline                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS CI PIPELINE                           │
│                      (Runs on PR to main/develop)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │   PARALLEL EXECUTION STARTS   │
                    └───────────────────────────────┘
                                    ↓
        ┌───────────┬───────────┬──────────┬───────────────┐
        ↓           ↓           ↓          ↓               ↓
┏━━━━━━━━━━━┓ ┏━━━━━━━━━━┓ ┏━━━━━━━━┓ ┏━━━━━━━━━━━┓ ┏━━━━━━━━━━┓
┃  Backend  ┃ ┃ Backend  ┃ ┃Frontend┃ ┃ Frontend  ┃ ┃ Security ┃
┃  Linting  ┃ ┃  Tests   ┃ ┃Linting ┃ ┃  Tests    ┃ ┃   SAST   ┃
┃  (~2min)  ┃ ┃  (~3min) ┃ ┃(~2min) ┃ ┃  (~3min)  ┃ ┃  (~3min) ┃
┗━━━━━━━━━━━┛ ┗━━━━━━━━━━┛ ┗━━━━━━━━┛ ┗━━━━━━━━━━━┛ ┗━━━━━━━━━━┛
     │             │            │           │             │
     │             │            │           │             │
     ↓             ↓            ↓           ↓             │
┏━━━━━━━━━━━┓      │       ┏━━━━━━━━━━┓    │             │
┃  Backend  ┃      │       ┃ Frontend ┃    │             │
┃  Docker   ┃      │       ┃  Build   ┃    │             │
┃  Build    ┃      │       ┃  (~3min) ┃    │             │
┃  (~4min)  ┃      │       ┗━━━━━━━━━━┛    │             │
┗━━━━━━━━━━━┛      │            │           │             │
     │             │            │           │             │
     │             │            │           │        ┏━━━━━━━━━━┓
     │             │            │           │        ┃ Security ┃
     │             │            │           │        ┃   SCA    ┃
     │             │            │           │        ┃ (~3min)  ┃
     │             │            │           │        ┗━━━━━━━━━━┛
     │             │            │           │             │
     └─────────────┴────────────┴───────────┴─────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │   ALL JOBS MUST COMPLETE      │
                    └───────────────────────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │      CI SUCCESS CHECK         │
                    │  (Fails if any job failed)    │
                    └───────────────────────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │   BRANCH PROTECTION CHECK     │
                    └───────────────────────────────┘
                                    ↓
                    ┌───────────────┴──────────────┐
                    ↓                              ↓
            ┌───────────────┐            ┌────────────────┐
            │  ✅ ALL PASS  │            │  ❌ ANY FAILED │
            └───────────────┘            └────────────────┘
                    ↓                              ↓
            ┌───────────────┐            ┌────────────────┐
            │  PR READY TO  │            │  FIX ERRORS    │
            │  BE REVIEWED  │            │  AND PUSH      │
            └───────────────┘            └────────────────┘
                    ↓                              ↓
            ┌───────────────┐                     ↓
            │  CODE REVIEW  │            ┌────────────────┐
            │  & APPROVAL   │            │  CI RE-RUNS    │
            └───────────────┘            │  AUTOMATICALLY │
                    ↓                    └────────────────┘
            ┌───────────────┐                     │
            │  MERGE TO     │←────────────────────┘
            │  MAIN/DEVELOP │
            └───────────────┘

```

## Job Details

### Backend Linting
- **Tools:** black, isort, flake8, mypy
- **Checks:** Code formatting, import order, style violations, type hints
- **Fails if:** Any linting error found
- **Fix:** Run `black . && isort .` in backend/

### Backend Tests
- **Tools:** pytest with DynamoDB Local
- **Checks:** Unit tests, integration tests, code coverage
- **Fails if:** Any test fails
- **Fix:** Run `pytest tests/ -v` in backend/ and fix failing tests

### Backend Docker Build
- **Tools:** Docker Buildx
- **Checks:** Dockerfile validity, image builds successfully
- **Fails if:** Docker build fails
- **Fix:** Test locally with `docker build -t test .` in backend/

### Frontend Linting
- **Tools:** ESLint with React plugins
- **Checks:** Code style, React best practices, unused variables
- **Fails if:** Any lint error or warning found
- **Fix:** Run `yarn lint --fix` in frontend/

### Frontend Tests
- **Tools:** Jest, React Testing Library
- **Checks:** Component tests, utility tests, snapshot tests
- **Fails if:** Any test fails
- **Fix:** Run `yarn test` in frontend/ and fix failing tests

### Frontend Build
- **Tools:** Create React App production build
- **Checks:** Build completes, assets generated, no build errors
- **Fails if:** Build fails
- **Fix:** Run `yarn build` in frontend/ and fix errors

### Security SAST (Semgrep)
- **Tools:** Semgrep with multiple rulesets
- **Checks:** Code vulnerabilities, OWASP Top 10, security patterns
- **Fails if:** Never (continue-on-error: true)
- **Reports:** GitHub Security → Code scanning alerts
- **Action:** Review findings and address high-severity issues

### Security SCA (Trivy)
- **Tools:** Trivy scanner
- **Checks:** Dependency vulnerabilities, exposed secrets, config issues
- **Fails if:** Never (continue-on-error: true)
- **Reports:** GitHub Security → Dependabot alerts
- **Action:** Update vulnerable dependencies

## Timeline

```
Time    0min    2min    4min    6min    8min    10min
        |-------|-------|-------|-------|-------|
Backend Lint    █████
Backend Test        ██████
Backend Build                ████████
Frontend Lint   █████
Frontend Test       ██████
Frontend Build           ██████
SAST                ██████
SCA                     ██████
        |-------|-------|-------|-------|-------|
        ↑                                       ↑
      START                            TYPICAL END
                                      (5-8 minutes)
```

## Status Icons

- ⏳ **Queued** - Job is waiting to run
- 🔄 **In Progress** - Job is currently running
- ✅ **Success** - Job passed all checks
- ❌ **Failed** - Job found issues
- ⚠️ **Warning** - Job has warnings but didn't fail
- 🚫 **Cancelled** - Job was cancelled
- ⏭️ **Skipped** - Job was skipped (dependency failed)

## Quick Reference

### View CI Status
- In PR: Scroll to bottom → "Checks" section
- Click "Details" on any check to view logs

### Common Failure Causes
1. **Linting fails** → Run formatters locally
2. **Tests fail** → Fix the failing test
3. **Build fails** → Check for syntax errors
4. **Security issues** → Review and address findings

### Get Help
- Check logs in GitHub Actions tab
- Read `.github/workflows/README.md` for detailed info
- Read `.github/CI_DEVELOPER_GUIDE.md` for commands
- Ask in team chat if stuck
