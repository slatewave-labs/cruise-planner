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
| `update-secrets.sh` | Update secrets in Secrets Manager | When API keys or DB credentials change |

---

## Common Tasks

### First-Time Setup

1. **Prerequisites:**
   - AWS CLI installed and configured
   - Docker installed
   - MongoDB Atlas cluster created
   - Google Gemini API key obtained

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

### Update Environment Variables

If you need to change MongoDB connection, API keys, etc.:

```bash
./update-secrets.sh test
# Follow prompts to update values

# Then redeploy to pick up new values
./deploy.sh test
```

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
