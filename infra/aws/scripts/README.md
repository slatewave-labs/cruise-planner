# AWS Infrastructure Scripts

This directory contains automated scripts for deploying ShoreExplorer to AWS ECS with Fargate.

## Quick Start

### Initial Setup

```bash
# Run complete setup for test environment
./setup-all.sh test

# Run complete setup for production environment
./setup-all.sh prod
```

### Deploy Updates

```bash
# Build and deploy (after code changes)
./build-and-deploy.sh test

# Or just deploy (if images already in ECR)
./deploy.sh test
```

### Troubleshooting

```bash
# Run diagnostics to check ALB, target groups, and services
./diagnose-alb.sh test

# Quick fix for common issues (security groups, redeploy)
./quick-fix-alb.sh test
```

---

## Scripts Overview

### Setup Scripts (Run Once)

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-all.sh` | Complete infrastructure setup | First-time setup or full rebuild |
| `01-create-ecr.sh` | Create ECR repositories | Rarely needed (included in setup-all) |
| `02-create-networking.sh` | Create VPC, subnets, security groups | Rarely needed (included in setup-all) |
| `03-create-iam-roles.sh` | Create IAM roles for ECS tasks | Rarely needed (included in setup-all) |
| `04-create-ecs-cluster.sh` | Create ECS cluster | Rarely needed (included in setup-all) |
| `05-create-secrets.sh` | Create Secrets Manager secrets | Rarely needed (included in setup-all) |
| `06-create-alb.sh` | Create ALB, target groups, listeners | Rarely needed (included in setup-all) |
| `07-create-ecs-services.sh` | Create ECS services and task definitions | Rarely needed (included in setup-all) |
| `08-setup-https.sh` | Configure HTTPS with SSL certificate | Optional - when you have a domain |
| `09-setup-dns-subdomain.sh` | Configure Route 53 subdomain (test) or apex domain (prod) | Optional - when you have a Route 53 hosted zone |

### Deployment Scripts (Run Often)

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `build-and-push.sh` | Build Docker images and push to ECR | After code changes |
| `deploy.sh` | Update ECS services with latest images | After pushing new images |
| `build-and-deploy.sh` | Build + push + deploy in one command | **Most common** - after code changes |

### Diagnostic Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `diagnose-alb.sh` | Complete ALB/ECS diagnostics | When app is not accessible |
| `quick-fix-alb.sh` | Auto-fix common issues | When having connection problems |

### Utility Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `config.sh` | Shared configuration (sourced by other scripts) | N/A - not run directly |
| `update-groq-api-key.sh` | Update GROQ_API_KEY in Secrets Manager | When you need to change or add your Groq API key |
| `verify-task-definitions.sh` | Verify task definitions use GROQ_API_KEY | After deployment to verify configuration is correct |

---

## Common Tasks

### First-Time Setup

1. **Prerequisites:**
   - AWS CLI installed and configured
   - Docker installed
   - Groq API key obtained (free at https://console.groq.com/keys)

2. **Run setup:**
   ```bash
   ./setup-all.sh test
   ```

3. **Build and deploy:**
   ```bash
   ./build-and-deploy.sh test
   ```

4. **Get your app URL:**
   ```bash
   cat .alb-outputs-test.env
   # Look for ALB_DNS value
   ```

### Deploy Code Changes

```bash
# From infra/aws/scripts directory
./build-and-deploy.sh test
```

This will:
- Build new Docker images
- Push to ECR
- Update ECS services
- Wait for deployment to complete

### Update Groq API Key

If you need to change or add your Groq API key:

```bash
# For test environment
./update-groq-api-key.sh test gsk_your_new_api_key_here

# For production environment
./update-groq-api-key.sh prod gsk_your_new_api_key_here
```

This automated script will:
- Update only the GROQ_API_KEY in AWS Secrets Manager
- Optionally restart your ECS backend service
- Verify the update was successful

> **Note**: Get a free Groq API key at https://console.groq.com/keys

### Verify Task Definitions

After deployment or environment variable changes, verify your task definitions are configured correctly:

```bash
# Verify test environment
./verify-task-definitions.sh test

# Verify production environment
./verify-task-definitions.sh prod
```

This will check:
- ECS task definitions reference `GROQ_API_KEY`
- AWS Secrets Manager contains `GROQ_API_KEY`
- All required secrets are present

**Example output:**
```
Checking backend task definition...
  Backend secrets: ["GROQ_API_KEY"]
  ✅ Backend uses GROQ_API_KEY

Checking AWS Secrets Manager...
  Available keys in secret:
    - GROQ_API_KEY
  ✅ Secret contains GROQ_API_KEY
```

### Verify Secrets Architecture

To verify that your environment-specific secrets are correctly configured:

```bash
# Verify both test and production environments
./verify-secrets-architecture.sh all

# Or verify a specific environment
./verify-secrets-architecture.sh test
./verify-secrets-architecture.sh prod
```

This comprehensive verification checks:
- AWS Secrets Manager has separate secrets for each environment
- Each secret contains required keys (GROQ_API_KEY)
- ECS task definitions reference the correct environment-specific secrets
- Secret ARNs in task definitions match the environment

**Example output:**
```
╔════════════════════════════════════════════════════════════╗
║  Checking AWS Secrets Manager for 'test' environment
╚════════════════════════════════════════════════════════════╝

✅ Secret exists: shoreexplorer-test-secrets
ℹ️  ARN: arn:aws:secretsmanager:us-east-1:123456789:secret:shoreexplorer-test-secrets
ℹ️  Keys: GROQ_API_KEY
✅ Required key 'GROQ_API_KEY' is present

╔════════════════════════════════════════════════════════════╗
║  Checking ECS Task Definition: shoreexplorer-test-backend-task
╚════════════════════════════════════════════════════════════╝

✅ Task definition exists: shoreexplorer-test-backend-task
✅ Secrets are configured in task definition
✅ Secret reference found: GROQ_API_KEY
  → arn:aws:secretsmanager:us-east-1:123:secret:shoreexplorer-test-secrets:GROQ_API_KEY::
✅ Secret ARN correctly references 'test' environment
```

> **Why is this important?** This verifies that test and production use separate secrets in AWS Secrets Manager, preventing accidental data mixing between environments.

✅ All checks passed! Task definitions and secrets are configured correctly.
```

### Update Other Environment Variables

If you need to update secrets:

```bash
# Update Groq API key
export GROQ_API_KEY="your-groq-key"

./03-create-secrets.sh test  # This will update the existing secret

# Then redeploy to pick up new values
./deploy.sh test
```

### Set Up HTTPS (Optional)

To enable HTTPS on your ALB with a free SSL certificate:

1. **Get a domain name** (if you don't have one):
   - Register at Route 53, GoDaddy, Namecheap, etc.
   - Cost: ~$12/year

2. **Run HTTPS setup script:**
   ```bash
   ./08-setup-https.sh test yourdomain.com
   ```

3. **Follow prompts to validate certificate** (DNS validation required)

4. **Re-run after validation completes:**
   ```bash
   ./08-setup-https.sh test yourdomain.com <certificate-arn>
   ```

5. **Point your domain to ALB** (script will show instructions)

**Full guide:** See [../HTTPS-SETUP.md](../HTTPS-SETUP.md)

### Set Up DNS Subdomain (Optional)

To configure a subdomain for test environment (test.yourdomain.com) or apex domain for production:

**Prerequisites:**
- A registered domain name
- Route 53 hosted zone for your domain

**Usage:**
```bash
# For test environment (creates test.yourdomain.com)
./09-setup-dns-subdomain.sh test yourdomain.com

# For production (creates yourdomain.com)
./09-setup-dns-subdomain.sh prod yourdomain.com
```

This script will:
- Automatically find your Route 53 hosted zone
- Create an ALIAS record pointing to your ALB
- Configure the appropriate subdomain based on environment:
  - **Test**: `test.yourdomain.com`
  - **Production**: `yourdomain.com` (no subdomain)

**Example:**
```bash
# Setup test environment subdomain
./09-setup-dns-subdomain.sh test shoreexplorer.com
# Result: test.shoreexplorer.com → ALB DNS

# Setup production apex domain
./09-setup-dns-subdomain.sh prod shoreexplorer.com
# Result: shoreexplorer.com → ALB DNS
```

**Note:** DNS propagation may take 5-60 minutes.

### Troubleshoot Connection Issues

If you can't access your application:

```bash
# Run diagnostics
./diagnose-alb.sh test

# If issues found, try quick fix
./quick-fix-alb.sh test
```

Common issues:
- **Connection closed**: Usually means HTTPS instead of HTTP (use `http://` not `https://`)
- **502 Bad Gateway**: No healthy targets (wait 1-2 minutes or run quick-fix)
- **503 Service Unavailable**: No targets registered (run quick-fix to redeploy)

### Check Logs

```bash
# Backend logs
aws logs tail "/ecs/shoreexplorer-test-backend" --follow --region us-east-1

# Frontend logs
aws logs tail "/ecs/shoreexplorer-test-frontend" --follow --region us-east-1

# Filter for errors
aws logs filter-log-events \
  --log-group-name "/ecs/shoreexplorer-test-backend" \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --region us-east-1
```

### Force Redeploy (Without Code Changes)

```bash
./deploy.sh test
```

This forces ECS to pull the latest images and restart tasks.

---

## Script Environments

All scripts accept an environment parameter:

- `test` - Test environment (lower resources, automatic deployments)
- `prod` - Production environment (higher resources, manual deployments)

### Environment Differences

| Aspect | Test | Production |
|--------|------|------------|
| Backend CPU/Memory | 256 vCPU / 512 MB | 512 vCPU / 1024 MB |
| Frontend CPU/Memory | 256 vCPU / 512 MB | 256 vCPU / 512 MB |
| Task Count | 1 | 2 (high availability) |
| Deployment | Automatic on push to main | Manual (via GitHub Release) |

---

## Output Files

Scripts save configuration to `.env` files for reuse:

```
.ecr-outputs-test.env          # ECR repository URLs
.networking-outputs-test.env   # VPC, subnet, security group IDs
.iam-outputs-test.env          # IAM role ARNs
.ecs-outputs-test.env          # ECS cluster name
.secrets-outputs-test.env      # Secrets Manager ARN
.alb-outputs-test.env          # ALB DNS, target group ARNs
```

**Do not commit these files** - they contain environment-specific IDs.

---

## Script Features

All scripts include:

- ✓ Idempotency - safe to run multiple times
- ✓ Error handling - exit on failure
- ✓ Colored output - easy to read
- ✓ Progress indicators
- ✓ Resource tagging - all resources tagged with Project and Environment

---

## Troubleshooting Scripts

### Permission Errors

```bash
# Make scripts executable
chmod +x *.sh

# Verify AWS credentials
aws sts get-caller-identity
```

### "Resource already exists" Errors

This is usually fine - scripts skip existing resources. If you need to recreate:

```bash
# Delete specific resources manually via AWS Console or CLI
# Then re-run the script
```

### Script Fails Partway Through

Scripts are designed to be resumable. Simply re-run the same script - it will skip completed steps and continue from where it failed.

---

## Advanced Usage

### Custom Configuration

Edit `config.sh` to change:
- CPU/Memory allocations
- Desired task counts
- Health check settings
- Timeout values

### Manual Step-by-Step Setup

Instead of `setup-all.sh`, you can run each script individually:

```bash
./01-create-ecr.sh test
./02-create-networking.sh test
./03-create-iam-roles.sh test
./04-create-ecs-cluster.sh test
./05-create-secrets.sh test
./06-create-alb.sh test
./build-and-push.sh test
./07-create-ecs-services.sh test
```

This is useful for:
- Understanding what each step does
- Debugging specific issues
- Customizing individual components

---

## CI/CD Integration

These scripts are used by GitHub Actions:

- `.github/workflows/deploy-test.yml` - Deploys to test on push to main
- `.github/workflows/deploy-prod.yml` - Deploys to prod on release tag

You can also run them manually via:

```bash
# Trigger test deployment
gh workflow run deploy-test.yml

# Trigger production deployment (requires release)
gh workflow run deploy-prod.yml
```

---

## Getting Help

1. **Run diagnostics:**
   ```bash
   ./diagnose-alb.sh test > diagnostics.txt
   ```

2. **Check logs:**
   ```bash
   aws logs tail "/ecs/shoreexplorer-test-backend" --since 30m > backend.log
   ```

3. **Read troubleshooting guide:**
   - [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)

4. **Check AWS resources:**
   - ECS Console: https://console.aws.amazon.com/ecs
   - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/logs
   - Load Balancers: https://console.aws.amazon.com/ec2/v2/home#LoadBalancers

---

## Clean Up

To delete all resources and avoid charges:

```bash
# Scale down to zero (keeps infrastructure)
aws ecs update-service --cluster shoreexplorer-test-cluster --service shoreexplorer-test-backend --desired-count 0 --region us-east-1
aws ecs update-service --cluster shoreexplorer-test-cluster --service shoreexplorer-test-frontend --desired-count 0 --region us-east-1

# Complete teardown (deletes everything)
# NOTE: No automated teardown script yet - delete via AWS Console:
# 1. Delete ECS services
# 2. Delete ECS cluster
# 3. Delete ALB
# 4. Delete target groups
# 5. Delete VPC (and associated resources)
# 6. Delete ECR repositories
# 7. Delete Secrets Manager secrets
# 8. Delete CloudWatch log groups
```

---

## Security Notes

- Never commit `.env` files or output files
- Secrets are stored in AWS Secrets Manager, not in code
- Security groups restrict traffic appropriately
- IAM roles follow least-privilege principle
- All resources are tagged for easy identification

---

## Support

For issues or questions:

1. Check [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
2. Run diagnostic scripts
3. Review CloudWatch logs
4. Open a GitHub issue with diagnostics output
