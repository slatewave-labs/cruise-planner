# Groq API Key Setup - Complete Solution Summary

## ✅ Problem Solved

Your ShoreExplorer application now has complete support for Groq API keys in AWS test and production environments, with automated tools and comprehensive documentation for non-technical users.

---

## 🔧 What Was Fixed

### 1. **CI/CD Pipeline** ✅
- **File**: `.github/workflows/deploy-prod.yml`
- **Change**: Replaced `GOOGLE_API_KEY` with `GROQ_API_KEY` in test environment variables
- **Impact**: CI tests now use the correct environment variable

### 2. **Automated Update Script** ✅
- **File**: `infra/aws/scripts/update-groq-api-key.sh`
- **Purpose**: Easy, safe updates to AWS Secrets Manager
- **Features**:
  - ✅ Updates only GROQ_API_KEY, preserves MONGO_URL and DB_NAME
  - ✅ Interactive prompts with confirmations
  - ✅ Validates API key format (checks for `gsk_` prefix)
  - ✅ Automatic ECS service restart (optional)
  - ✅ Verification after update
  - ✅ Clear error messages and troubleshooting

### 3. **Comprehensive Documentation** ✅

#### **New Guide**: `infra/aws/AWS_GROQ_SETUP.md`
Complete step-by-step guide for non-technical users including:
- How to get a free Groq API key (with screenshots guidance)
- Automated setup instructions (recommended)
- Manual setup instructions (fallback)
- Verification steps
- Complete troubleshooting section
- IAM permissions requirements with ready-to-use policy JSON
- GitHub secrets configuration (optional)

#### **Updated Files**:
- ✅ `README.md` - Changed GOOGLE_API_KEY to GROQ_API_KEY
- ✅ `GROQ_SETUP.md` - Added reference to AWS-specific guide
- ✅ `QUICKSTART.md` - Updated environment variable examples
- ✅ `infra/deployment/AWS-DEPLOYMENT.md` - Updated all references
- ✅ `infra/aws/scripts/README.md` - Added update-groq-api-key.sh documentation
- ✅ `.github/agents/full-stack-developer.agent.md` - Updated environment variables
- ✅ `.github/agents/security-engineer.agent.md` - Updated API references

---

## 📚 How to Use (For Non-Technical Users)

### Quick Setup - Test Environment

```bash
# 1. Get your free Groq API key
#    Visit: https://console.groq.com/keys
#    Click: "Create API Key"
#    Copy: The key (starts with gsk_)

# 2. Navigate to your project
cd /path/to/cruise-planner

# 3. Run the automated update script
./infra/aws/scripts/update-groq-api-key.sh test gsk_YOUR_KEY_HERE

# 4. Wait 2-3 minutes for restart

# 5. Verify it worked
curl https://test.yourdomain.com/api/health
# Should show: "ai_service": "configured"
```

### Quick Setup - Production Environment

```bash
# Same as test, but use 'prod' instead
./infra/aws/scripts/update-groq-api-key.sh prod gsk_YOUR_KEY_HERE
```

---

## 🔐 IAM Permissions Required

If you're using a dedicated IAM user for deployments (like `shoreexplorer-deployer`), it needs these additional permissions:

### Add This Policy to Your IAM User:

**Policy Name**: `ShoreExplorerSecretsAndECSManagement`

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

### How to Add (AWS Console):
1. Go to [IAM Console](https://console.aws.amazon.com/iam)
2. Click **"Users"** → Find your user → **"Permissions"** tab
3. Click **"Add permissions"** → **"Create policy"**
4. Choose **"JSON"** tab → Paste the policy above
5. Name it `ShoreExplorerSecretsAndECSManagement`
6. Attach it to your user

### How to Add (AWS CLI):
```bash
# Save the policy to a file
cat > /tmp/shoreexplorer-policy.json <<'EOF'
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
  --policy-document file:///tmp/shoreexplorer-policy.json

# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach to your user (replace YOUR_USERNAME)
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/ShoreExplorerSecretsAndECSManagement"
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "AI plan generation service is not configured"

**Cause**: ECS task hasn't restarted yet or secret wasn't updated properly.

**Solution**:
```bash
# 1. Wait 3-5 minutes for ECS to fully restart

# 2. Check the secret was updated
aws secretsmanager get-secret-value \
  --secret-id shoreexplorer-test-secrets \
  --region us-east-1 \
  --query SecretString \
  --output text | jq '.'

# 3. Manually restart if needed
aws ecs update-service \
  --cluster shoreexplorer-test-cluster \
  --service shoreexplorer-test-backend \
  --force-new-deployment \
  --region us-east-1
```

### Issue 2: "ResourceInitializationError: unable to retrieve secret"

**Cause**: The secret exists but has the wrong format (individual values instead of JSON).

**Solution**:
The secret in AWS Secrets Manager MUST be a JSON object with all three keys:
```json
{
  "MONGO_URL": "mongodb+srv://...",
  "GROQ_API_KEY": "gsk_...",
  "DB_NAME": "shoreexplorer"
}
```

**NOT** individual key-value pairs like:
```
MONGO_URL = mongodb+srv://...
GROQ_API_KEY = gsk_...
```

To fix:
```bash
# Get your current MongoDB URL
CURRENT_SECRET=$(aws secretsmanager get-secret-value --secret-id shoreexplorer-test-secrets --region us-east-1 --query SecretString --output text)
MONGO_URL=$(echo "$CURRENT_SECRET" | jq -r '.MONGO_URL')

# Update with correct format
export GROQ_API_KEY="gsk_your_key_here"
aws secretsmanager update-secret \
  --secret-id shoreexplorer-test-secrets \
  --secret-string "{\"MONGO_URL\":\"$MONGO_URL\",\"GROQ_API_KEY\":\"$GROQ_API_KEY\",\"DB_NAME\":\"shoreexplorer\"}" \
  --region us-east-1
```

### Issue 3: "AccessDeniedException" when running update script

**Cause**: Your IAM user doesn't have the required permissions.

**Solution**: Add the IAM policy documented above to your IAM user.

---

## ✅ Verification Checklist

After updating the Groq API key:

- [ ] Wait 2-3 minutes for ECS service to restart
- [ ] Check health endpoint: `curl https://your-app-url/api/health`
- [ ] Verify `"ai_service": "configured"` in health check response
- [ ] Test plan generation in the app (create trip → add port → generate plan)
- [ ] Check ECS task logs if issues persist:
  ```bash
  aws logs tail /ecs/shoreexplorer-test-backend --follow --region us-east-1
  ```

---

## 📖 Complete Documentation

For detailed guides, refer to:

1. **`infra/aws/AWS_GROQ_SETUP.md`** - Complete AWS setup guide with:
   - Step-by-step instructions for non-technical users
   - Automated and manual setup options
   - Complete troubleshooting guide
   - IAM permissions details
   - Verification steps

2. **`GROQ_SETUP.md`** - General Groq setup guide:
   - How to get a Groq API key
   - Local development setup
   - Docker setup
   - Rate limits and monitoring

3. **`infra/aws/scripts/README.md`** - Infrastructure scripts documentation:
   - Overview of all deployment scripts
   - Common tasks and commands
   - When to use each script

---

## 🎯 Next Steps for Users

### For Test Environment:
1. Get your Groq API key from https://console.groq.com/keys
2. Run: `./infra/aws/scripts/update-groq-api-key.sh test gsk_YOUR_KEY`
3. Wait 2-3 minutes
4. Verify: `curl https://test.yourdomain.com/api/health`
5. Test plan generation in the app

### For Production Environment:
1. Use the same or a different Groq API key
2. Run: `./infra/aws/scripts/update-groq-api-key.sh prod gsk_YOUR_KEY`
3. Wait 2-3 minutes
4. Verify: `curl https://yourdomain.com/api/health`
5. Test plan generation in the app

### For IAM User (if needed):
1. Add the `ShoreExplorerSecretsAndECSManagement` policy to your IAM user
2. Test: `aws secretsmanager get-secret-value --secret-id shoreexplorer-test-secrets`
3. You should see the secret JSON with all three keys

---

## 🔄 What Changed Technically

1. **No code changes needed** - The backend already uses `GROQ_API_KEY` via `llm_client.py`
2. **Secrets structure unchanged** - AWS Secrets Manager already uses JSON format with all keys
3. **ECS task definition unchanged** - Already references the correct secret structure
4. **Only documentation and tooling added** - Makes it easier for users to configure

---

## 💡 Why This Solution Works

The original issue was that users were trying to:
1. Add `GROQ_API_KEY` as a **separate** secret in AWS Secrets Manager
2. This caused the ECS task to fail because it expects a **single JSON secret** with all keys

The solution provides:
1. An automated script that updates the **existing** JSON secret
2. Clear documentation explaining the correct structure
3. IAM permissions for users who need them
4. Comprehensive troubleshooting for common issues

---

## 📞 Support

If users still have issues after following this guide:

1. Check the health endpoint and share the output
2. Review ECS task logs: `aws logs tail /ecs/shoreexplorer-test-backend --follow`
3. Verify the secret format: `aws secretsmanager get-secret-value --secret-id shoreexplorer-test-secrets`
4. Open a GitHub issue with:
   - Environment (test/prod)
   - Error message
   - Health check output
   - Relevant ECS task logs (redact sensitive data)

---

## 🎉 Summary

You now have:
- ✅ Automated script for updating Groq API keys
- ✅ Comprehensive documentation for non-technical users
- ✅ IAM policy templates ready to use
- ✅ Complete troubleshooting guide
- ✅ All legacy GOOGLE_API_KEY references updated
- ✅ CI/CD pipeline fixed to use GROQ_API_KEY

The app should work perfectly in test and prod environments once users follow the simple instructions in `infra/aws/AWS_GROQ_SETUP.md`.
