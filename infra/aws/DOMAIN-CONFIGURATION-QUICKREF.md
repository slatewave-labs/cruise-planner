# Quick Reference: Custom Domain Configuration

This document provides a quick reference for configuring `REACT_APP_BACKEND_URL` with your custom domain after running the DNS setup script.

## ✅ Recommended Approach: GitHub Secrets

**Best for:** CI/CD deployments via GitHub Actions

### For Test Environment (test.shore-explorer.com)

1. **Add GitHub Secret:**
   - Go to: https://github.com/slatewave-labs/cruise-planner/settings/secrets/actions
   - Click "New repository secret"
   - Name: `TEST_DOMAIN`
   - Value: `shore-explorer.com` (your base domain, without "test." prefix)
   - Click "Add secret"

2. **Trigger Deployment:**
   ```bash
   # Push to main branch to trigger automatic deployment
   git commit --allow-empty -m "Trigger deployment with new domain"
   git push origin main
   ```

3. **Verify:**
   - Check GitHub Actions → Latest workflow run → "Get ALB DNS" step
   - Should show: "Using custom domain: test.shore-explorer.com"
   - After deployment, test: `curl -I http://test.shore-explorer.com/api/health`

### For Production (shore-explorer.com)

1. **Add GitHub Secret:**
   - Same location as above
   - Name: `PROD_DOMAIN`
   - Value: `shore-explorer.com`
   - Click "Add secret"

2. **Trigger Deployment:**
   ```bash
   # Create and push a release tag
   git tag v1.0.1
   git push origin v1.0.1
   ```

---

## 🔧 Alternative: Manual Build

**Best for:** Local builds or manual deployments

### Option A: Use Environment Variable

```bash
# Set the domain
export TEST_DOMAIN="shore-explorer.com"

# Or for explicit URL:
export REACT_APP_BACKEND_URL="http://test.shore-explorer.com"

# Build and deploy
cd /path/to/cruise-planner/infra/aws/scripts
./build-and-deploy.sh test
```

### Option B: Build Script Auto-Detection

The build script automatically detects custom domains in this priority:

1. `REACT_APP_BACKEND_URL` environment variable (highest priority)
2. `TEST_DOMAIN` or `PROD_DOMAIN` environment variable
3. ALB DNS from `.alb-outputs-{env}.env` file
4. Fallback to `http://localhost:8001`

---

## 📖 Full Documentation

For complete details, see:
- [GitHub Secrets Configuration Guide](GITHUB-SECRETS.md) - Complete guide
- [DNS Setup Guide](DNS-SETUP.md) - DNS configuration details
- [GitHub Workflows README](../../.github/workflows/README.md) - CI/CD details

---

## ❓ Quick Troubleshooting

**Domain not working after adding secret?**
- Wait for DNS propagation (5-60 minutes)
- Verify Route 53 has the DNS record: Run `dig test.shore-explorer.com`
- Trigger a new deployment (secrets are only read when workflow runs)

**Still using ALB DNS?**
- Check secret name is exactly `TEST_DOMAIN` or `PROD_DOMAIN` (all caps)
- Check secret value is just the base domain (e.g., `shore-explorer.com`)
- Check workflow logs: GitHub Actions → Latest run → "Get ALB DNS" step

---

**Last Updated:** 2026-02-18
