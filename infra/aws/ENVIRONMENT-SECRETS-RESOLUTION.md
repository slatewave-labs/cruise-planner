# Environment Secrets Configuration - Resolution Summary

## Question

> I want to setup the prod env infra, however at present the Github actions secrets do not appear to differentiate the `GROQ_API_KEY` or `MONGO_URL` between environments.
>
> Is this an issue you can resolve? Or is it not actually a problem as these are set as per env secrets in AWS?

## Answer

**This is NOT an issue.** Your intuition is correct — the environment-specific secrets (`GROQ_API_KEY` and `MONGO_URL`) are already properly isolated per environment in AWS Secrets Manager.

### Why This Works

ShoreExplorer uses a **two-tier secret management architecture**:

#### Tier 1: GitHub Repository Secrets (Shared)

These secrets are **shared** across all workflows (test and prod):

- `AWS_ACCESS_KEY_ID` - AWS API credentials
- `AWS_SECRET_ACCESS_KEY` - AWS API credentials  
- `AWS_REGION` - AWS region (optional)
- `TEST_DOMAIN` - Custom domain for test (optional)
- `PROD_DOMAIN` - Custom domain for prod (optional)

**Why shared?** Both test and prod environments are in the same AWS account, so they use the same AWS credentials.

#### Tier 2: AWS Secrets Manager (Per-Environment)

These secrets are **separate** for each environment:

**Test Environment:**
- Secret name: `shoreexplorer-test-secrets`
- Contains: Test MongoDB URL, test Groq API key, DB name

**Production Environment:**
- Secret name: `shoreexplorer-prod-secrets`
- Contains: Production MongoDB URL, production Groq API key, DB name

### How It Works

1. **GitHub Actions workflow runs** (test or prod)
2. **Workflow authenticates to AWS** using shared GitHub secrets
3. **Workflow looks up the environment-specific secret** in AWS Secrets Manager:
   - Test: `shoreexplorer-test-secrets`
   - Prod: `shoreexplorer-prod-secrets`
4. **Workflow registers ECS task definition** referencing the correct secret ARN
5. **ECS tasks pull secrets at runtime** from AWS Secrets Manager

### Evidence from the Code

#### Deploy Test Workflow

```yaml
# .github/workflows/deploy-test.yml
env:
  ENVIRONMENT: test  # ← Differentiates the environment

- name: Get secrets ARN
  run: |
    SECRET_ARN=$(aws secretsmanager describe-secret \
      --secret-id "${PROJECT_NAME}-${ENVIRONMENT}-secrets" \  # ← test
      --query 'ARN' --output text)
```

Result: `shoreexplorer-test-secrets`

#### Deploy Prod Workflow

```yaml
# .github/workflows/deploy-prod.yml
env:
  ENVIRONMENT: prod  # ← Differentiates the environment

- name: Get secrets ARN
  run: |
    SECRET_ARN=$(aws secretsmanager describe-secret \
      --secret-id "${PROJECT_NAME}-${ENVIRONMENT}-secrets" \  # ← prod
      --query 'ARN' --output text)
```

Result: `shoreexplorer-prod-secrets`

### Configuration Script

The infrastructure setup script also creates separate secrets:

```bash
# infra/aws/scripts/03-create-secrets.sh
SECRET_NAME="${APP_NAME}-secrets"  # ${APP_NAME} = shoreexplorer-test or shoreexplorer-prod
```

When you run:
- `./03-create-secrets.sh test` → Creates `shoreexplorer-test-secrets`
- `./03-create-secrets.sh prod` → Creates `shoreexplorer-prod-secrets`

## What You Need to Do

### 1. Set up GitHub Repository Secrets (Once)

Add these secrets to your GitHub repository at:
**Settings → Secrets and variables → Actions**

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key ID | Same for test and prod |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | Same for test and prod |
| `AWS_REGION` | `us-east-1` (or your region) | Optional |
| `TEST_DOMAIN` | `your-domain.com` | Optional |
| `PROD_DOMAIN` | `your-domain.com` | Optional |

**Important:** Do NOT add `GROQ_API_KEY` or `MONGO_URL` to GitHub secrets!

### 2. Create AWS Secrets (Per Environment)

Run the setup scripts for each environment:

```bash
# Test environment
export MONGO_URL="mongodb+srv://test-user:pass@test-cluster.mongodb.net/shoreexplorer"
export GROQ_API_KEY="gsk_test_api_key_here"
./infra/aws/scripts/03-create-secrets.sh test

# Production environment
export MONGO_URL="mongodb+srv://prod-user:pass@prod-cluster.mongodb.net/shoreexplorer"
export GROQ_API_KEY="gsk_prod_api_key_here"
./infra/aws/scripts/03-create-secrets.sh prod
```

This creates separate secrets in AWS Secrets Manager.

### 3. Verify the Configuration

Run the verification script to confirm everything is set up correctly:

```bash
./infra/aws/scripts/verify-secrets-architecture.sh all
```

This will check:
- ✅ AWS Secrets Manager has `shoreexplorer-test-secrets`
- ✅ AWS Secrets Manager has `shoreexplorer-prod-secrets`
- ✅ Each secret contains MONGO_URL, GROQ_API_KEY, DB_NAME
- ✅ ECS task definitions reference the correct environment secret

## Summary

**You do NOT need to:**
- Create separate GitHub secrets for test and prod
- Worry about GROQ_API_KEY or MONGO_URL in GitHub
- Make any changes to the workflows

**The architecture already provides:**
- ✅ Complete isolation between test and prod environments
- ✅ Separate MongoDB databases for test and prod
- ✅ Separate Groq API keys for test and prod (or same key if you prefer)
- ✅ Secure secret management with AWS Secrets Manager
- ✅ No secrets in source code or Docker images

## Additional Resources

For more details, see:

1. **[SECRETS-ARCHITECTURE.md](SECRETS-ARCHITECTURE.md)** - Detailed explanation with diagrams
2. **[GITHUB-SECRETS.md](GITHUB-SECRETS.md)** - How to configure GitHub secrets
3. **[scripts/verify-secrets-architecture.sh](scripts/verify-secrets-architecture.sh)** - Verification script
4. **[scripts/update-groq-api-key.sh](scripts/update-groq-api-key.sh)** - Update Groq API key per environment

## Questions?

If you have any questions or issues:

1. Run the verification script: `./verify-secrets-architecture.sh all`
2. Check the detailed documentation: `infra/aws/SECRETS-ARCHITECTURE.md`
3. Review the workflow logs in GitHub Actions
4. Open an issue with the verification script output

---

**Last Updated:** 2026-02-18  
**Status:** ✅ No changes needed - architecture is correct as-is
