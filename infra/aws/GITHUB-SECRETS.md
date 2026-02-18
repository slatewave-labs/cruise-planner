# GitHub Secrets Configuration Guide

This guide explains how to configure GitHub repository secrets for ShoreExplorer CI/CD deployments.

## 📋 Overview

GitHub Actions workflows use repository secrets to securely store sensitive information like AWS credentials and domain names. These secrets are encrypted and only exposed to authorized workflows.

---

## 🔑 Required Secrets

These secrets are **required** for GitHub Actions deployments to work:

### AWS Credentials

| Secret Name | Description | Where to Get It |
|-------------|-------------|-----------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key ID | Created in Step 3b of [Manual Setup Guide](MANUAL-SETUP-GUIDE.md#step-3-create-iam-user-for-github-actions) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret access key | Created in Step 3b of [Manual Setup Guide](MANUAL-SETUP-GUIDE.md#step-3-create-iam-user-for-github-actions) |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) | **Optional** - Defaults to `us-east-1` |

---

## 🌐 Optional Domain Secrets

These secrets configure custom domains for each environment. **Without these secrets, deployments use ALB DNS names** (e.g., `shoreexplorer-test-alb-123.us-east-1.elb.amazonaws.com`).

### Test Environment Domain

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `TEST_DOMAIN` | Base domain for test environment | `shore-explorer.com` |

**Effect:** The workflow automatically configures:
- Frontend `REACT_APP_BACKEND_URL` = `http://test.shore-explorer.com`
- Smoke tests run against `http://test.shore-explorer.com`

### Production Environment Domain

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `PROD_DOMAIN` | Base domain for production | `shore-explorer.com` |

**Effect:** The workflow automatically configures:
- Frontend `REACT_APP_BACKEND_URL` = `http://shore-explorer.com`
- Smoke tests run against `http://shore-explorer.com`

---

## 📝 How to Add Secrets

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/slatewave-labs/cruise-planner`
2. Click **"Settings"** (top menu bar)
3. In the left sidebar, click **"Secrets and variables"** → **"Actions"**

### Step 2: Add Each Secret

For each secret you need to add:

1. Click **"New repository secret"** (green button)
2. Enter the **Name** (exactly as shown in the tables above)
3. Enter the **Value** (paste the actual value)
4. Click **"Add secret"**

### Step 3: Verify Secrets

After adding all secrets, you should see them listed on the "Actions secrets" page. The values will be hidden (showing only `***`).

---

## 🚀 Quick Start: Domain Configuration

If you've just completed DNS setup and want to configure your custom domain:

### For Test Environment

After running `./09-setup-dns-subdomain.sh test shore-explorer.com`:

1. Go to repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add:
   - **Name:** `TEST_DOMAIN`
   - **Value:** `shore-explorer.com` (your base domain, **without** the `test.` prefix)
4. Click **"Add secret"**

### For Production

After running `./09-setup-dns-subdomain.sh prod shore-explorer.com`:

1. In the same location, click **"New repository secret"**
2. Add:
   - **Name:** `PROD_DOMAIN`
   - **Value:** `shore-explorer.com` (your base domain)
3. Click **"Add secret"**

### Trigger Deployment

After adding the domain secrets, trigger a new deployment to apply the changes:

**For Test:**
```bash
# Push to main branch to trigger automatic deployment
git commit --allow-empty -m "Trigger deployment with new domain"
git push origin main
```

**For Production:**
```bash
# Create and push a release tag
git tag v1.0.1
git push origin v1.0.1
```

The workflows will automatically use your custom domains when building the frontend.

---

## 🔍 Verification

### Check Workflow Runs

1. Go to your repository → **Actions** tab
2. Click on the latest workflow run
3. Expand the **"Get ALB DNS"** or **"Build frontend image"** step
4. Verify the output shows your custom domain:
   ```
   Using custom domain: test.shore-explorer.com
   ```

### Test the Deployment

After deployment completes:

```bash
# Test the health endpoint
curl -I http://test.shore-explorer.com/api/health

# Should return: HTTP/1.1 200 OK
```

---

## 🛠️ Troubleshooting

### Secret Not Working

**Problem:** Added `TEST_DOMAIN` but workflow still uses ALB DNS

**Solutions:**
1. Verify secret name is **exactly** `TEST_DOMAIN` (all caps, underscore, no spaces)
2. Verify secret value is just the base domain (e.g., `shore-explorer.com`, not `test.shore-explorer.com`)
3. Trigger a new deployment (secrets are only read when workflow runs)
4. Check workflow logs for error messages

### DNS Not Resolving

**Problem:** Added domain secret but site not accessible

**Causes:**
1. DNS not yet propagated (can take 5-60 minutes)
2. Route 53 DNS record not created yet - Run `./09-setup-dns-subdomain.sh` first
3. Domain typo in secret value

**Solutions:**
1. Wait for DNS propagation and test with `dig test.shore-explorer.com`
2. Verify Route 53 has the correct A/ALIAS record
3. Check workflow logs to confirm the domain being used

### Access Denied Errors

**Problem:** Workflow fails with "Access Denied" or "Unauthorized"

**Causes:**
1. AWS credentials are incorrect or expired
2. IAM user lacks necessary permissions

**Solutions:**
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
2. Verify IAM user has the policies from [Manual Setup Guide](MANUAL-SETUP-GUIDE.md#step-3-create-iam-user-for-github-actions)
3. Check if IAM access keys have expired

---

## 📚 Related Documentation

- [DNS Setup Guide](DNS-SETUP.md) - Configure Route 53 DNS records
- [HTTPS Setup Guide](HTTPS-SETUP.md) - Enable SSL/TLS certificates
- [GitHub Workflows README](../../.github/workflows/README.md) - CI/CD pipeline details
- [Manual Setup Guide](MANUAL-SETUP-GUIDE.md) - Complete infrastructure setup

---

## 🔐 Security Best Practices

1. **Never commit secrets** - Always use GitHub secrets, never hardcode credentials
2. **Use environment-specific secrets** - Separate test and prod credentials
3. **Rotate credentials periodically** - Update AWS access keys every 90 days
4. **Principle of least privilege** - IAM users should have only necessary permissions
5. **Enable MFA** - Require multi-factor authentication for AWS root and IAM users
6. **Monitor usage** - Check CloudTrail logs for unusual API activity

---

## ❓ FAQ

### Do I need both TEST_DOMAIN and PROD_DOMAIN?

No. You can configure just one if you only use one environment. Without a domain secret, the workflow falls back to the ALB DNS name.

### Can I use different domain names for test and prod?

Yes! You can set:
- `TEST_DOMAIN` = `staging.myapp.com`
- `PROD_DOMAIN` = `myapp.com`

The workflow will use `test.staging.myapp.com` for test and `myapp.com` for prod.

### What if I don't want to use custom domains?

That's fine! Simply don't add the `TEST_DOMAIN` or `PROD_DOMAIN` secrets. The workflows will use the ALB DNS names which work perfectly well.

### Can I update a secret after it's been added?

Yes! Just repeat the process:
1. Go to Settings → Secrets and variables → Actions
2. Click on the secret name
3. Click **"Update secret"**
4. Enter the new value
5. Trigger a new deployment to apply the change

### Does changing a secret trigger a deployment?

No. Changing a secret does **not** automatically trigger a deployment. You need to:
- For test: Push to main or manually trigger the workflow
- For prod: Create a new release tag or manually trigger the workflow

---

## 🆘 Getting Help

If you encounter issues:

1. **Check workflow logs** - GitHub Actions → Latest run → Failed step
2. **Verify DNS** - Use `dig` or `nslookup` to check DNS resolution
3. **Test manually** - Try building with `./build-and-deploy.sh` locally
4. **Review documentation** - Check the guides in `/infra/aws/`
5. **Open an issue** - [GitHub Issues](https://github.com/slatewave-labs/cruise-planner/issues)

---

**Last Updated:** 2026-02-18
