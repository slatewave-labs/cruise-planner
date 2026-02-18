# Quick Reference: Groq API Setup for AWS

## 🚀 For Urgent Fixes

### Test Environment
```bash
./infra/aws/scripts/update-groq-api-key.sh test gsk_YOUR_GROQ_API_KEY
```

### Production Environment  
```bash
./infra/aws/scripts/update-groq-api-key.sh prod gsk_YOUR_GROQ_API_KEY
```

## 📖 Documentation Links

- **Complete AWS Setup Guide**: [`infra/aws/AWS_GROQ_SETUP.md`](infra/aws/AWS_GROQ_SETUP.md)
- **General Groq Setup**: [`GROQ_SETUP.md`](GROQ_SETUP.md)
- **Solution Summary**: [`GROQ_AWS_SOLUTION_SUMMARY.md`](GROQ_AWS_SOLUTION_SUMMARY.md)

## 🔑 Get Your Free Groq API Key

1. Visit: https://console.groq.com/keys
2. Sign up (free, no credit card)
3. Click "Create API Key"
4. Copy the key (starts with `gsk_`)

## ✅ Verify It Works

```bash
# Check health endpoint
curl https://test.yourdomain.com/api/health

# Should show:
# {
#   "status": "healthy",
#   "checks": {
#     "ai_service": "configured"  ← This should say "configured"
#   }
# }
```

## 🔐 IAM Permissions (If Needed)

If you get `AccessDeniedException`, your IAM user needs the `ShoreExplorerSecretsAndECSManagement` policy.

**Quick Add (AWS CLI)**:
```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach policy (it's already created in AWS)
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/ShoreExplorerSecretsAndECSManagement"
```

If the policy doesn't exist, see complete instructions in [`infra/aws/AWS_GROQ_SETUP.md`](infra/aws/AWS_GROQ_SETUP.md).

## ⚠️ Common Issues

### "AI plan generation service is not configured"
Wait 2-3 minutes for ECS to restart. If still failing, manually restart:
```bash
aws ecs update-service \
  --cluster shoreexplorer-test-cluster \
  --service shoreexplorer-test-backend \
  --force-new-deployment \
  --region us-east-1
```

### "ResourceInitializationError: unable to retrieve secret"
Your secret format is wrong. It must be a JSON object:
```json
{
  "MONGO_URL": "mongodb+srv://...",
  "GROQ_API_KEY": "gsk_...",
  "DB_NAME": "shoreexplorer"
}
```

Fix it:
```bash
./infra/aws/scripts/update-groq-api-key.sh test gsk_YOUR_KEY
```

## 📞 Still Need Help?

See complete troubleshooting in [`infra/aws/AWS_GROQ_SETUP.md`](infra/aws/AWS_GROQ_SETUP.md)
