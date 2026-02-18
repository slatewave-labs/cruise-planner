# Migration Guide: Google Gemini → Groq LLM

This guide helps you migrate an existing ShoreExplorer deployment from Google Gemini to Groq.

## Why Migrate?

Groq offers significant advantages over Google Gemini for ShoreExplorer:

| Feature | Google Gemini (Old) | Groq (New) | Improvement |
|---------|---------------------|------------|-------------|
| **Free tier requests/day** | 1,500 | 14,400 | **9.6x more** |
| **Requests per minute** | 15 | 30 | 2x more |
| **Sign-up requirement** | Google account | Free sign-up | Easier |
| **Credit card required** | Yes (for billing) | No | Simpler |
| **Response speed** | ~2-5s | <1s | **Faster** |
| **Model quality** | Gemini 2.0 Flash | Llama 3.1 70B | Comparable |

## Pre-Migration Checklist

- [ ] Code changes have been deployed (PR merged to main)
- [ ] You have admin access to your AWS account (for production)
- [ ] You have a Groq account and API key ready
- [ ] Backup your existing secrets (optional but recommended)

---

## Step 1: Get Your Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up for a free account (no credit card required)
3. Navigate to [API Keys](https://console.groq.com/keys)
4. Click **"Create API Key"**
5. Give it a name (e.g., `shoreexplorer-production`)
6. Click **"Submit"**
7. **IMPORTANT**: Copy the key immediately (it starts with `gsk_`)
8. Store it securely (you'll need it in the next steps)

---

## Step 2: Migrate Local Development

### Update your backend/.env file

**Old:**
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=shoreexplorer
GOOGLE_API_KEY=AIza...
```

**New:**
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=shoreexplorer
GROQ_API_KEY=gsk_...
```

### Test locally

```bash
# Restart backend server
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# In another terminal, test the API
curl -X GET http://localhost:8001/api/health

# Should show: "ai_service": "configured"
```

---

## Step 3: Migrate Test Environment (AWS)

### Update secrets in AWS Secrets Manager

```bash
# Set your new Groq API key
export GROQ_API_KEY="gsk_your_actual_groq_key_here"

# Get your existing MongoDB URL (if you don't have it)
aws secretsmanager get-secret-value \
  --secret-id /shoreexplorer/test/secrets \
  --query SecretString --output text | jq -r '.MONGO_URL'

# Update the secret
aws secretsmanager update-secret \
  --secret-id /shoreexplorer/test/secrets \
  --secret-string "{
    \"MONGO_URL\": \"mongodb+srv://user:pass@cluster.mongodb.net/\",
    \"GROQ_API_KEY\": \"$GROQ_API_KEY\",
    \"DB_NAME\": \"shoreexplorer\"
  }" \
  --region us-east-1
```

### Restart ECS services

The ECS tasks will automatically pick up the new secret on the next restart, but you can force it:

```bash
# Find your cluster and service names
aws ecs list-clusters --region us-east-1
aws ecs list-services --cluster shoreexplorer-test-cluster --region us-east-1

# Force new deployment (will pull latest secrets)
aws ecs update-service \
  --cluster shoreexplorer-test-cluster \
  --service shoreexplorer-test-backend \
  --force-new-deployment \
  --region us-east-1

# Monitor deployment
aws ecs describe-services \
  --cluster shoreexplorer-test-cluster \
  --services shoreexplorer-test-backend \
  --query 'services[0].deployments' \
  --region us-east-1
```

### Verify test environment

```bash
# Get your test URL
TEST_URL=$(aws elbv2 describe-load-balancers \
  --names shoreexplorer-test-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region us-east-1)

# Test health endpoint
curl -X GET http://$TEST_URL/api/health

# Should show: "ai_service": "configured"
```

---

## Step 4: Migrate Production Environment (AWS)

**IMPORTANT**: Only proceed after thoroughly testing in the test environment.

### Update production secrets

```bash
# Set your Groq API key (use a different key for production if desired)
export GROQ_API_KEY="gsk_your_production_groq_key_here"

# Get your existing MongoDB URL
aws secretsmanager get-secret-value \
  --secret-id /shoreexplorer/prod/secrets \
  --query SecretString --output text | jq -r '.MONGO_URL'

# Update the secret
aws secretsmanager update-secret \
  --secret-id /shoreexplorer/prod/secrets \
  --secret-string "{
    \"MONGO_URL\": \"mongodb+srv://user:pass@cluster.mongodb.net/\",
    \"GROQ_API_KEY\": \"$GROQ_API_KEY\",
    \"DB_NAME\": \"shoreexplorer\"
  }" \
  --region us-east-1
```

### Restart production services

```bash
# Force new deployment
aws ecs update-service \
  --cluster shoreexplorer-prod-cluster \
  --service shoreexplorer-prod-backend \
  --force-new-deployment \
  --region us-east-1

# Monitor deployment
watch -n 5 'aws ecs describe-services \
  --cluster shoreexplorer-prod-cluster \
  --services shoreexplorer-prod-backend \
  --query "services[0].deployments" \
  --region us-east-1'
```

### Verify production

```bash
# Get your production URL
PROD_URL=$(aws elbv2 describe-load-balancers \
  --names shoreexplorer-prod-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region us-east-1)

# Test health endpoint
curl -X GET http://$PROD_URL/api/health

# Test plan generation (replace with actual IDs from your database)
curl -X POST http://$PROD_URL/api/plans/generate \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device" \
  -d '{
    "trip_id": "your-trip-id",
    "port_id": "your-port-id",
    "preferences": {
      "party_type": "couple",
      "activity_level": "moderate",
      "transport_mode": "mixed",
      "budget": "medium",
      "currency": "GBP"
    }
  }'
```

---

## Step 5: Update GitHub Actions Secrets (for CI/CD)

If you use GitHub Actions for deployments:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Find `GOOGLE_API_KEY` (if it exists)
4. Click **"Update"** or **"Delete"** (delete if you want to rename)
5. Click **"New repository secret"**
6. Name: `GROQ_API_KEY`
7. Value: Your Groq API key
8. Click **"Add secret"**

Update your workflow files if needed (the new code already uses `GROQ_API_KEY`).

---

## Step 6: Clean Up Old API Keys (Optional)

### Revoke old Google Gemini API keys

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your old Gemini API key
4. Click **Delete** or **Disable**

This prevents accidental billing if you had moved past the free tier.

---

## Troubleshooting

### Error: "ai_service_not_configured"

**Cause**: The `GROQ_API_KEY` environment variable is not set or empty.

**Fix**:
```bash
# Check if the secret is set correctly
aws secretsmanager get-secret-value \
  --secret-id /shoreexplorer/prod/secrets \
  --query SecretString --output text | jq .

# Should show GROQ_API_KEY with a value starting with "gsk_"

# If not, update the secret (see Step 4 above)
```

### Error: "API key is invalid" or "401 unauthorized"

**Cause**: The Groq API key is incorrect or expired.

**Fix**:
1. Go to [https://console.groq.com/keys](https://console.groq.com/keys)
2. Verify your API key is active
3. If needed, create a new API key
4. Update the secret in AWS Secrets Manager
5. Restart the ECS service

### Error: "Rate limit exceeded"

**Cause**: You've hit the free tier limits (30 req/min or 14,400 req/day).

**Fix**:
- **Short-term**: Wait 1 minute (for per-minute limit) or until next day (for daily limit)
- **Long-term**: Add a payment method at [https://console.groq.com/settings/billing](https://console.groq.com/settings/billing)

### Plans are lower quality or incorrect

**Cause**: The Llama 3.1 70B model might need adjustment for your use case.

**Fix**:
You can adjust the model or temperature in `backend/llm_client.py`:

```python
# Try the faster 8B model
self.model = "llama-3.1-8b-instant"

# Or adjust temperature (lower = more deterministic)
temperature=0.5  # default is 0.7
```

---

## Rollback Plan

If you need to roll back to Google Gemini:

### 1. Revert code changes

```bash
git checkout <commit-before-groq-migration>
git push -f origin main  # CAUTION: Force push
```

### 2. Update secrets back to GOOGLE_API_KEY

```bash
export GOOGLE_API_KEY="AIza_your_old_key"

aws secretsmanager update-secret \
  --secret-id /shoreexplorer/prod/secrets \
  --secret-string "{
    \"MONGO_URL\": \"mongodb+srv://...\",
    \"GOOGLE_API_KEY\": \"$GOOGLE_API_KEY\",
    \"DB_NAME\": \"shoreexplorer\"
  }" \
  --region us-east-1
```

### 3. Restart services

```bash
aws ecs update-service \
  --cluster shoreexplorer-prod-cluster \
  --service shoreexplorer-prod-backend \
  --force-new-deployment \
  --region us-east-1
```

---

## Monitoring After Migration

### Check usage in Groq Console

1. Go to [https://console.groq.com/settings/limits](https://console.groq.com/settings/limits)
2. Monitor your daily usage
3. Set up alerts if approaching limits

### Check CloudWatch Logs

```bash
# View recent backend logs
aws logs tail /ecs/shoreexplorer-prod-backend --follow --region us-east-1

# Look for:
# - "LLM client initialized with model: llama-3.1-70b-versatile"
# - "Calling LLM API for plan generation"
# - "LLM API call successful"
```

### Monitor error rates

```bash
# Count errors in last hour
aws logs filter-log-events \
  --log-group-name /ecs/shoreexplorer-prod-backend \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1 \
  | jq '.events | length'
```

---

## Support

- **Groq Documentation**: [https://console.groq.com/docs](https://console.groq.com/docs)
- **Groq Discord**: [https://groq.com/discord](https://groq.com/discord)
- **Groq Status**: [https://status.groq.com](https://status.groq.com)
- **ShoreExplorer Setup Guide**: See `GROQ_SETUP.md`

---

## Summary

✅ **Migration Complete!**

You've successfully migrated from Google Gemini to Groq. Enjoy:
- **9.6x more free API requests** (14,400/day vs 1,500/day)
- **Faster response times** (< 1 second vs 2-5 seconds)
- **No credit card required** for free tier
- **Same high-quality day plans** powered by Llama 3.1 70B

Happy cruising! ⛴️🗺️
