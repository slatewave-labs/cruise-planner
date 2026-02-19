# Branch Protection Configuration Guide

This guide explains how to configure branch protection rules to enforce CI checks before merging to production branches.

## Why Branch Protection?

Branch protection ensures that:
- All code is reviewed before merging
- All CI checks pass (tests, linting, security scans)
- Code quality standards are maintained
- Production deployments are safe

## Quick Setup

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Branches**
3. Click **Add branch protection rule**
4. Configure as described below

## Recommended Protection Rules

### For `main` Branch (Production)

**Branch name pattern:** `main`

**Required Settings:**

✅ **Require a pull request before merging**
- Require approvals: 1
- Dismiss stale pull request approvals when new commits are pushed: ✅
- Require review from Code Owners: ⬜ (optional)

✅ **Require status checks to pass before merging**
- Require branches to be up to date before merging: ✅
- **Status checks that are required:**
  - `Backend Linting`
  - `Backend Tests`
  - `Backend Docker Build`
  - `Frontend Linting`
  - `Frontend Tests`
  - `Frontend Build`
  - `SAST (Semgrep)`
  - `SCA (Trivy)`
  - `CI Success`

✅ **Require conversation resolution before merging**

✅ **Do not allow bypassing the above settings**
- Include administrators: ✅ (recommended)

⬜ **Restrict who can push to matching branches** (optional)
- Use this if you want to limit who can approve and merge

### For `develop` Branch (Staging)

**Branch name pattern:** `develop`

Use the same settings as `main`, but you may:
- Reduce required approvals to 0 for faster iteration
- Keep all CI checks required

### Optional: For Feature Branches

**Branch name pattern:** `feature/*` or `fix/*`

You may want lighter requirements:
- Require status checks but not reviews
- Allow self-review and merge

## Status Check Names

The CI workflow defines the following status checks:

| Job Name | Purpose | Can Fail Build? |
|----------|---------|----------------|
| Backend Linting | Python code style (black, isort, flake8, mypy) | ✅ Yes |
| Backend Tests | Python unit tests with DynamoDB Local | ✅ Yes |
| Backend Docker Build | Validate Dockerfile builds | ✅ Yes |
| Frontend Linting | JavaScript/React code style (ESLint) | ✅ Yes |
| Frontend Tests | JavaScript unit tests (Jest) | ✅ Yes |
| Frontend Build | Validate production build | ✅ Yes |
| SAST (Semgrep) | Security vulnerability scan | ⚠️ No (reports only) |
| SCA (Trivy) | Dependency vulnerability scan | ⚠️ No (reports only) |
| CI Success | Aggregated pass/fail gate | ✅ Yes |

**Note:** Security scans (SAST/SCA) are set to `continue-on-error: true` so they don't block merges but still report findings to GitHub Security tab. You can review and address findings at your pace.

## Verifying Protection Rules

After configuring, test by:

1. Creating a new branch:
   ```bash
   git checkout -b test/branch-protection
   ```

2. Make a small change that will fail linting:
   ```python
   # In backend/server.py, add a long line:
   x = "This is an intentionally very long line that exceeds the 88 character limit and should fail flake8"
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "Test branch protection"
   git push origin test/branch-protection
   ```

4. Open a PR and verify:
   - CI checks run automatically
   - The lint check fails
   - You cannot merge until checks pass

5. Fix the issue and verify checks pass:
   ```bash
   # Remove the long line
   git add .
   git commit -m "Fix linting"
   git push
   ```

## Temporarily Disabling Protection (Emergency)

If you need to deploy an urgent hotfix:

1. Go to **Settings** → **Branches**
2. Click **Edit** on the branch rule
3. Temporarily disable **"Include administrators"**
4. Use **"Merge without waiting for requirements"** on your PR
5. **Re-enable protection immediately after**

⚠️ **Warning:** This should be rare and documented in your incident log.

## Monitoring CI Performance

Track your CI performance in GitHub Actions:
- **Settings** → **Actions** → **Management**
- View run times, success rates, and usage

**Target Performance:**
- CI should complete in **under 10 minutes**
- Success rate should be **>90%** (excluding legitimate failures)
- Failed checks should provide clear error messages

## Troubleshooting

### "Required status check is missing"

**Symptom:** Protection rule shows a check as required, but it doesn't appear on PRs.

**Cause:** The status check name in protection rules doesn't match the job name in the workflow.

**Fix:** 
1. Open a test PR and see which checks actually run
2. Update protection rules to match exact job names
3. Job names are case-sensitive

### "Checks never start running"

**Symptom:** PR is opened but no CI checks start.

**Cause:** Workflow file has syntax errors or isn't on the target branch.

**Fix:**
1. Ensure `.github/workflows/ci.yml` exists on the base branch (e.g., `develop` or `main`)
2. Check for YAML syntax errors: `yamllint .github/workflows/ci.yml`
3. Check workflow runs in **Actions** tab for error messages

### "Checks are always skipped"

**Symptom:** Checks show as "skipped" instead of running.

**Cause:** The `on:` trigger doesn't match the PR or push event.

**Fix:** Verify the workflow triggers match your branch names:
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

## Best Practices

1. **Test protection rules on a feature branch first** before applying to `main`
2. **Start with fewer required checks** and add more as your team adapts
3. **Monitor CI performance** and optimize slow jobs
4. **Review security findings regularly** even though they don't block PRs
5. **Update dependencies** when SCA finds vulnerabilities
6. **Document exceptions** when protection rules are bypassed

## Further Reading

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [CODEOWNERS File](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
