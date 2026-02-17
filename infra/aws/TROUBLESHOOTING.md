# AWS Infrastructure Troubleshooting Guide

This guide helps diagnose and fix common issues with the ShoreExplorer AWS deployment.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
  - [Connection Closed / Connection Refused](#connection-closed--connection-refused)
  - [502 Bad Gateway](#502-bad-gateway)
  - [503 Service Unavailable](#503-service-unavailable)
  - [504 Gateway Timeout](#504-gateway-timeout)
- [Diagnostic Tools](#diagnostic-tools)
- [Logs and Monitoring](#logs-and-monitoring)
- [Emergency Procedures](#emergency-procedures)

---

## Quick Diagnostics

### Automated Diagnostic Script

The fastest way to diagnose ALB and deployment issues:

```bash
./infra/aws/scripts/diagnose-alb.sh test   # For test environment
./infra/aws/scripts/diagnose-alb.sh prod  # For production environment
```

This script checks:
- ✓ ALB existence and state
- ✓ Security group configuration
- ✓ Listener configuration
- ✓ Target group health
- ✓ ECS service status
- ✓ Actual connectivity tests

### Manual Quick Check

```bash
# Set your environment
ENV=test  # or prod
REGION=us-east-1

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "shoreexplorer-${ENV}-alb" \
  --region "$REGION" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB URL: http://$ALB_DNS"

# Test connectivity
curl -v "http://$ALB_DNS/"
curl -v "http://$ALB_DNS/api/health"
```

---

## Common Issues

### Connection Closed / Connection Refused

**Symptoms:**
- Browser shows "connection closed" or "connection refused"
- `curl` returns "Connection reset by peer" or "Failed to connect"

**Causes and Fixes:**

#### 1. ALB Security Group Not Allowing Port 80

**Diagnosis:**
```bash
ENV=test
SG_ID=$(aws elbv2 describe-load-balancers \
  --names "shoreexplorer-${ENV}-alb" \
  --region us-east-1 \
  --query 'LoadBalancers[0].SecurityGroups[0]' \
  --output text)

aws ec2 describe-security-groups \
  --group-ids "$SG_ID" \
  --region us-east-1 \
  --query 'SecurityGroups[0].IpPermissions[].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]'
```

**Look for:** A rule with protocol `tcp`, FromPort `80`, ToPort `80`, CIDR `0.0.0.0/0`

**Fix:**
```bash
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-1
```

#### 2. Using HTTPS Instead of HTTP

The ALB is configured for HTTP only (port 80) by default. HTTPS requires additional setup.

**Fix:**
- Use `http://` not `https://` in your browser
- Example: `http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/`

#### 3. ALB Still Provisioning

**Diagnosis:**
```bash
aws elbv2 describe-load-balancers \
  --names "shoreexplorer-${ENV}-alb" \
  --region us-east-1 \
  --query 'LoadBalancers[0].State.Code' \
  --output text
```

**Expected:** `active`

**Fix:** Wait 3-5 minutes for ALB to fully provision

#### 4. DNS Not Propagated

**Diagnosis:**
```bash
nslookup shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com
```

**Fix:** 
- Wait 5-10 minutes for DNS propagation
- Try from a different network (mobile hotspot)
- Clear DNS cache:
  - macOS: `sudo dscacheutil -flushcache`
  - Windows: `ipconfig /flushdns`
  - Linux: `sudo systemd-resolve --flush-caches`

---

### 502 Bad Gateway

**Symptoms:**
- Browser shows "502 Bad Gateway"
- ALB is accessible but returns 502 error

**Causes:**
- No healthy targets in target group
- ECS tasks failing health checks
- Container not listening on correct port

**Diagnosis:**

Check target health:
```bash
ENV=test

# Backend target group
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names "shoreexplorer-${ENV}-backend-tg" \
    --region us-east-1 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region us-east-1

# Frontend target group
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names "shoreexplorer-${ENV}-frontend-tg" \
    --region us-east-1 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region us-east-1
```

**Fixes:**

1. **Force redeploy:**
```bash
aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-backend" \
  --force-new-deployment \
  --region us-east-1

aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-frontend" \
  --force-new-deployment \
  --region us-east-1
```

2. **Check ECS task logs:**
```bash
# Backend logs
aws logs tail "/ecs/shoreexplorer-${ENV}-backend" \
  --follow \
  --region us-east-1

# Frontend logs
aws logs tail "/ecs/shoreexplorer-${ENV}-frontend" \
  --follow \
  --region us-east-1
```

3. **Check for missing environment variables:**
```bash
# Check secrets are configured
aws secretsmanager get-secret-value \
  --secret-id "shoreexplorer-${ENV}-secrets" \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | jq .
```

Required secrets:
- `MONGO_URL`
- `GOOGLE_API_KEY`
- `DB_NAME`

---

### 503 Service Unavailable

**Symptoms:**
- ALB returns 503 error
- "Service temporarily unavailable"

**Cause:** No targets registered in target group (ECS service not running)

**Diagnosis:**
```bash
aws ecs describe-services \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --services "shoreexplorer-${ENV}-backend" "shoreexplorer-${ENV}-frontend" \
  --region us-east-1 \
  --query 'services[].[serviceName,desiredCount,runningCount,pendingCount]' \
  --output table
```

**Expected:** `runningCount >= 1`

**Fix:**

1. **Check recent service events:**
```bash
aws ecs describe-services \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --services "shoreexplorer-${ENV}-backend" \
  --region us-east-1 \
  --query 'services[0].events[0:5].[createdAt,message]' \
  --output table
```

2. **Scale up if needed:**
```bash
aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-backend" \
  --desired-count 1 \
  --region us-east-1
```

3. **Re-create service if necessary:**
```bash
./infra/aws/scripts/07-create-ecs-services.sh $ENV
```

---

### 504 Gateway Timeout

**Symptoms:**
- Request times out
- ALB returns 504 error

**Causes:**
- Application not responding to health checks
- Container startup taking too long
- Application hanging/crashing

**Fix:**

1. **Check task definition health check:**
```bash
aws ecs describe-task-definition \
  --task-definition "shoreexplorer-${ENV}-backend-task" \
  --region us-east-1 \
  --query 'taskDefinition.containerDefinitions[0].healthCheck'
```

2. **Increase health check grace period:**
Already set to 120 seconds for backend, 60 for frontend in `07-create-ecs-services.sh`

3. **Check application logs for startup errors:**
```bash
aws logs tail "/ecs/shoreexplorer-${ENV}-backend" \
  --since 10m \
  --region us-east-1
```

---

## Diagnostic Tools

### Get ALB DNS Name

```bash
aws elbv2 describe-load-balancers \
  --names "shoreexplorer-${ENV}-alb" \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

### Check All Resources Exist

```bash
# VPC
aws ec2 describe-vpcs \
  --filters "Name=tag:Project,Values=ShoreExplorer" \
  --region us-east-1

# ECR Repositories
aws ecr describe-repositories --region us-east-1

# ECS Cluster
aws ecs describe-clusters \
  --clusters "shoreexplorer-${ENV}-cluster" \
  --region us-east-1

# ALB
aws elbv2 describe-load-balancers \
  --names "shoreexplorer-${ENV}-alb" \
  --region us-east-1

# Secrets
aws secretsmanager describe-secret \
  --secret-id "shoreexplorer-${ENV}-secrets" \
  --region us-east-1
```

### Test Locally with Docker

To rule out AWS infrastructure issues, test the containers locally:

```bash
# Build images
docker build -t shoreexplorer-backend:local -f backend/Dockerfile backend/
docker build -t shoreexplorer-frontend:local --build-arg REACT_APP_BACKEND_URL=http://localhost:8001 -f frontend/Dockerfile frontend/

# Run backend
docker run -p 8001:8001 \
  -e MONGO_URL="your-mongo-url" \
  -e GOOGLE_API_KEY="your-api-key" \
  -e DB_NAME="shoreexplorer" \
  shoreexplorer-backend:local

# In another terminal, run frontend
docker run -p 3000:80 shoreexplorer-frontend:local

# Test
curl http://localhost:8001/api/health
curl http://localhost:3000/
```

---

## Logs and Monitoring

### CloudWatch Logs

**Backend logs:**
```bash
aws logs tail "/ecs/shoreexplorer-${ENV}-backend" --follow --region us-east-1
```

**Frontend logs:**
```bash
aws logs tail "/ecs/shoreexplorer-${ENV}-frontend" --follow --region us-east-1
```

**Filter for errors:**
```bash
aws logs filter-log-events \
  --log-group-name "/ecs/shoreexplorer-${ENV}-backend" \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --region us-east-1
```

### ECS Task Logs

Get recent task IDs and check their logs:

```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service-name "shoreexplorer-${ENV}-backend" \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --tasks "$TASK_ARN" \
  --region us-east-1
```

### Check Deployment Status

```bash
aws ecs describe-services \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --services "shoreexplorer-${ENV}-backend" \
  --region us-east-1 \
  --query 'services[0].deployments'
```

---

## Emergency Procedures

### Complete Service Restart

```bash
ENV=test  # or prod

# Scale down to 0
aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-backend" \
  --desired-count 0 \
  --region us-east-1

aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-frontend" \
  --desired-count 0 \
  --region us-east-1

# Wait 30 seconds
sleep 30

# Scale back up
aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-backend" \
  --desired-count 1 \
  --region us-east-1

aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-frontend" \
  --desired-count 1 \
  --region us-east-1

# Wait for stability
aws ecs wait services-stable \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --services "shoreexplorer-${ENV}-backend" "shoreexplorer-${ENV}-frontend" \
  --region us-east-1
```

### Re-run Infrastructure Setup

If all else fails, re-run the setup scripts (safe to run multiple times):

```bash
cd infra/aws/scripts

# Re-create ALB and target groups
./06-create-alb.sh $ENV

# Re-create ECS services
./07-create-ecs-services.sh $ENV

# Or run full setup (skips existing resources)
./setup-all.sh $ENV
```

### Clean Slate (Nuclear Option)

⚠️ **WARNING:** This will delete all infrastructure. Use only as last resort.

```bash
ENV=test  # ONLY use this on test environment

# Delete services
aws ecs update-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-backend" \
  --desired-count 0 \
  --region us-east-1

aws ecs delete-service \
  --cluster "shoreexplorer-${ENV}-cluster" \
  --service "shoreexplorer-${ENV}-backend" \
  --region us-east-1

# Delete cluster, ALB, target groups, etc.
# Then re-run setup-all.sh
```

---

## Getting Help

If you're still stuck after trying these steps:

1. **Run the diagnostic script:**
   ```bash
   ./infra/aws/scripts/diagnose-alb.sh $ENV > diagnostics.txt 2>&1
   ```

2. **Collect logs:**
   ```bash
   aws logs tail "/ecs/shoreexplorer-${ENV}-backend" --since 30m > backend-logs.txt
   aws logs tail "/ecs/shoreexplorer-${ENV}-frontend" --since 30m > frontend-logs.txt
   ```

3. **Check recent deployments:**
   ```bash
   gh run list --workflow=deploy-test.yml --limit 5
   ```

4. **Share:**
   - Output of diagnostic script
   - Recent logs
   - Error messages you're seeing
   - What you've already tried

---

## Prevention

To avoid common issues:

1. **Always test locally first:**
   ```bash
   docker-compose up
   ```

2. **Use the deployment scripts:**
   - Don't manually create/modify AWS resources
   - Let the scripts handle configuration

3. **Monitor deployments:**
   ```bash
   # Watch GitHub Actions
   gh run watch
   
   # Watch ECS deployment
   watch -n 5 'aws ecs describe-services --cluster shoreexplorer-test-cluster --services shoreexplorer-test-backend --region us-east-1 --query "services[0].[runningCount,desiredCount]"'
   ```

4. **Check health before and after changes:**
   ```bash
   ./infra/aws/scripts/diagnose-alb.sh test
   ```
