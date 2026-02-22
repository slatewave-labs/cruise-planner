# Groq API Setup for AWS (Test & Production)

## Quick Start (Non-Technical Users)

This guide will help you set up the Groq API key for your ShoreExplorer deployment on AWS, even if you're not a developer.

### Prerequisites

✅ You need:
1. A Groq API key (free - instructions below)
2. AWS CLI installed and configured with your credentials
3. Access to your terminal/command prompt

### Step 1: Get Your Groq API Key (5 minutes)

1. **Go to Groq Console**: Open [https://console.groq.com/keys](https://console.groq.com/keys)
2. **Sign up** (free, no credit card required):
   - Use your email, Google account, or GitHub account
   - Verify your email if prompted
3. **Create API key**:
   - Click the **"Create API Key"** button
   - Give it a name like `shoreexplorer-prod` or `shoreexplorer-test`
   - Click **"Submit"**
4. **Copy the key immediately**:
   - It starts with `gsk_`
   - Example: `gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5`
   - ⚠️ **IMPORTANT**: Save it now! It won't be shown again.
   - Store it safely (password manager, secure note, etc.)

---

## Option A: Automated Setup (Recommended - Easiest)

### For Test Environment

```bash
# Navigate to your cruise-planner directory
cd /path/to/cruise-planner

# Run the automated script
./infra/aws/scripts/update-groq-api-key.sh test gsk_YOUR_API_KEY_HERE
```

**Replace `gsk_YOUR_API_KEY_HERE` with your actual API key from Step 1.**

The script will:
- ✅ Update your AWS secret safely
- ✅ Keep your existing database settings intact
- ✅ Ask before making changes
- ✅ Optionally restart your ECS service automatically
- ✅ Verify everything worked

### For Production Environment

```bash
# Same as test, but use 'prod' instead
./infra/aws/scripts/update-groq-api-key.sh prod gsk_YOUR_API_KEY_HERE
```

**That's it!** Skip to "Step 3: Verify" below.

---

## Option B: Manual Setup (If automated script doesn't work)

### For Test Environment

1. **Open your terminal** and paste this command (replace `gsk_YOUR_KEY_HERE` with your actual key):

```bash
export GROQ_API_KEY="gsk_YOUR_KEY_HERE"
export AWS_REGION="us-east-1"  # or your AWS region

# Get current secret
CURRENT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id shoreexplorer-test-secrets \
  --query SecretString \
  --output text \
  --region $AWS_REGION)

# Extract existing values (if any other keys exist)
# Update with new Groq key
aws secretsmanager update-secret \
  --secret-id shoreexplorer-test-secrets \
  --secret-string "{\"GROQ_API_KEY\":\"$GROQ_API_KEY\"}" \
  --region $AWS_REGION

echo "✅ Secret updated!"
```

2. **Restart the backend service**:

```bash
aws ecs update-service \
  --cluster shoreexplorer-test-cluster \
  --service shoreexplorer-test-backend \
  --force-new-deployment \
  --region $AWS_REGION

echo "✅ Service restarting... (takes 2-3 minutes)"
```

### For Production Environment

Same as test, but replace `test` with `prod`:

```bash
export GROQ_API_KEY="gsk_YOUR_KEY_HERE"
export AWS_REGION="us-east-1"

CURRENT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id shoreexplorer-prod-secrets \
  --query SecretString \
  --output text \
  --region $AWS_REGION)

MONGO_URL=$(echo "$CURRENT_SECRET" | jq -r '.MONGO_URL // empty')
DB_NAME=$(echo "$CURRENT_SECRET" | jq -r '.DB_NAME // empty')

aws secretsmanager update-secret \
  --secret-id shoreexplorer-prod-secrets \
  --secret-string "{\"GROQ_API_KEY\":\"$GROQ_API_KEY\"}" \
  --region $AWS_REGION

aws ecs update-service \
  --cluster shoreexplorer-prod-cluster \
  --service shoreexplorer-prod-backend \
  --force-new-deployment \
  --region $AWS_REGION

echo "✅ Done!"
```

---

## Step 3: Verify It's Working

Wait 2-3 minutes for the service to restart, then:

### Check Health Endpoint

```bash
# For test environment
curl https://test.yourdomain.com/api/health

# For production
curl https://yourdomain.com/api/health
```

**Look for this in the response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "ai_service": "configured"   ← Should say "configured"
  }
}
```

✅ If `ai_service` is `"configured"`, you're done!  
❌ If it says `"not_configured"`, see Troubleshooting below.

### Test in the App

1. Go to your ShoreExplorer app
2. Create a trip and add a port
3. Click "Generate Day Plan"
4. You should see a generated itinerary (not an error)

---

## Troubleshooting

### Error: "AI plan generation service is not configured"

**Cause**: The ECS task hasn't restarted yet, or the secret wasn't updated.

**Fix**:
1. **Wait 3-5 minutes** for the ECS service to fully restart
2. **Check the secret was updated**:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id shoreexplorer-test-secrets \
     --region us-east-1 \
     --query SecretString \
     --output text | jq '.'
   ```
   You should see `"GROQ_API_KEY": "gsk_..."` in the output.

3. **Manually restart the service** if it's been >5 minutes:
   ```bash
   aws ecs update-service \
     --cluster shoreexplorer-test-cluster \
     --service shoreexplorer-test-backend \
     --force-new-deployment \
     --region us-east-1
   ```

4. **Check ECS task logs** for errors:
   ```bash
   # Get the latest task
   TASK_ARN=$(aws ecs list-tasks \
     --cluster shoreexplorer-test-cluster \
     --service-name shoreexplorer-test-backend \
     --desired-status RUNNING \
     --region us-east-1 \
     --query 'taskArns[0]' \
     --output text)
   
   # View logs
   aws logs tail /ecs/shoreexplorer-test-backend --follow --region us-east-1
   ```

### Error: "ResourceInitializationError: unable to retrieve secret"

**Cause**: The secret exists but is missing the expected JSON key, or IAM permissions are wrong.

**Fix**:

1. **Check secret format**:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id shoreexplorer-test-secrets \
     --region us-east-1 \
     --query SecretString \
     --output text
   ```
   
   It should contain a `GROQ_API_KEY`:
   ```json
   {
     "GROQ_API_KEY": "gsk_..."
   }
   ```

2. **If format is wrong, fix it**:
   ```bash
   export GROQ_API_KEY="gsk_your_key"
   
   # Update secret with correct JSON format
   aws secretsmanager update-secret \
     --secret-id shoreexplorer-test-secrets \
     --secret-string "{\"GROQ_API_KEY\":\"$GROQ_API_KEY\"}" \
     --region us-east-1
   ```

3. **Verify IAM permissions** (see IAM section below)

### Error: "Invalid API key" or "401 unauthorized"

**Cause**: The Groq API key is incorrect or expired.

**Fix**:
1. Go to [https://console.groq.com/keys](https://console.groq.com/keys)
2. Create a **new** API key
3. Run the update script again with the new key

### Error: "An error occurred (AccessDeniedException)"

**Cause**: Your AWS IAM user doesn't have permission to update secrets.

**Fix**: See "IAM Permissions" section below.

---

## IAM Permissions for CLI User (`shoreexplorer-deployer`)

If you're using a dedicated IAM user (like `shoreexplorer-deployer`) for deployments, it needs these permissions.  The deployer is also responsible for provisioning the EventBridge-to-GitHub callback infrastructure, so the policy below includes the extra EventBridge and IAM actions required for creating connections, API destinations, rules, and roles:

If you're using a dedicated IAM user (like `shoreexplorer-deployer`) for deployments, it needs these permissions:

### Required IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:shoreexplorer-*"
      ]
    },
    {
      "Sid": "ECSServiceManagement",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:ListTasks",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EventBridgeCallbackPermissions",
      "Effect": "Allow",
      "Action": [
        "events:CreateConnection",
        "events:DescribeConnection",
        "events:CreateApiDestination",
        "events:DescribeApiDestination",
        "events:PutRule",
        "events:PutTargets",
        "iam:GetRole",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:PutUserPolicy"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogsRead",
      "Effect": "Allow",
      "Action": [
        "logs:GetLogEvents",
        "logs:FilterLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ecs/shoreexplorer-*"
    }
  ]
}
```

### How to Add This Policy (AWS Console - Non-Technical)

1. **Go to AWS Console**: [https://console.aws.amazon.com/iam](https://console.aws.amazon.com/iam)
2. **Click "Users"** in the left sidebar
3. **Find and click** `shoreexplorer-deployer` (or your IAM user name)
4. **Click "Add permissions"** → **"Attach policies directly"**
5. **Click "Create policy"** (opens new tab)
6. **Click "JSON"** tab
7. **Paste the policy above** (replace everything)
8. **Click "Next: Tags"** → **"Next: Review"**
9. **Name**: `ShoreExplorerSecretsAndECSManagement`
10. **Click "Create policy"**
11. **Go back to the user tab** and **refresh** the policy list
12. **Search for** `ShoreExplorerSecretsAndECSManagement`
13. **Check the box** next to it
14. **Click "Add permissions"**

### How to Add This Policy (AWS CLI)

```bash
# Save the policy to a file
cat > /tmp/shoreexplorer-deployer-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:shoreexplorer-*"
      ]
    },
    {
      "Sid": "ECSServiceManagement",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:ListTasks",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EventBridgeCallbackPermissions",
      "Effect": "Allow",
      "Action": [
        "events:CreateConnection",
        "events:DescribeConnection",
        "events:CreateApiDestination",
        "events:DescribeApiDestination",
        "events:PutRule",
        "events:PutTargets",
        "iam:GetRole",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:PutUserPolicy"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogsRead",
      "Effect": "Allow",
      "Action": [
        "logs:GetLogEvents",
        "logs:FilterLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ecs/shoreexplorer-*"
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name ShoreExplorerSecretsAndECSManagement \
  --policy-document file:///tmp/shoreexplorer-deployer-policy.json

# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach to user
aws iam attach-user-policy \
  --user-name shoreexplorer-deployer \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/ShoreExplorerSecretsAndECSManagement"

echo "✅ Policy attached!"
```

---

## GitHub Secrets (For CI/CD Deployments)

If you're using GitHub Actions for deployments, you should also add the Groq API key there:

### Add to GitHub Secrets

1. **Go to your repository** on GitHub
2. **Click "Settings"** → **"Secrets and variables"** → **"Actions"**
3. **Click "New repository secret"**
4. **Name**: `GROQ_API_KEY_TEST` (for test environment)
5. **Value**: `gsk_your_groq_api_key_here`
6. **Click "Add secret"**
7. **Repeat** for production:
   - Name: `GROQ_API_KEY_PROD`
   - Value: (same or different key)

> **Note**: The current deployment workflows handle secrets via AWS Secrets Manager at runtime, so GitHub secrets are optional. However, adding them provides a backup method and allows the CI tests to run properly.

---

## Summary: Complete Checklist

For **Test Environment**:
- [ ] Get Groq API key from https://console.groq.com/keys
- [ ] Run: `./infra/aws/scripts/update-groq-api-key.sh test gsk_YOUR_KEY`
- [ ] Wait 2-3 minutes
- [ ] Verify: `curl https://test.yourdomain.com/api/health`
- [ ] Test plan generation in app

For **Production Environment**:
- [ ] Use same or separate Groq API key
- [ ] Run: `./infra/aws/scripts/update-groq-api-key.sh prod gsk_YOUR_KEY`
- [ ] Wait 2-3 minutes
- [ ] Verify: `curl https://yourdomain.com/api/health`
- [ ] Test plan generation in app

For **IAM User** (if using `shoreexplorer-deployer`):
- [ ] Add SecretsManagerAccess policy
- [ ] Add ECSServiceManagement policy
- [ ] Test: `aws secretsmanager get-secret-value --secret-id shoreexplorer-test-secrets`

---

## Support

**Still having issues?**

1. Check the [GROQ_SETUP.md](../../GROQ_SETUP.md) for general Groq setup
2. Check [AWS Troubleshooting Guide](./TROUBLESHOOTING.md) for AWS-specific issues
3. Review ECS task logs for detailed error messages
4. Open an issue on GitHub with:
   - Environment (test/prod)
   - Error message
   - Output of health check endpoint
   - ECS task logs (without sensitive data)

**Quick diagnostic commands:**

```bash
# Check secret exists and has correct format
aws secretsmanager get-secret-value --secret-id shoreexplorer-test-secrets --region us-east-1 --query SecretString --output text | jq '.'

# Check ECS service status
aws ecs describe-services --cluster shoreexplorer-test-cluster --services shoreexplorer-test-backend --region us-east-1

# Check task is running
aws ecs list-tasks --cluster shoreexplorer-test-cluster --service-name shoreexplorer-test-backend --desired-status RUNNING --region us-east-1

# View logs
aws logs tail /ecs/shoreexplorer-test-backend --follow --region us-east-1
```
