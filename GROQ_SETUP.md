# Groq API Setup Guide

## Overview

ShoreExplorer uses [Groq](https://groq.com/) for AI-powered day plan generation. Groq provides:

- **14,400 requests per day** on the free tier (vs. 1,500/day with Google Gemini)
- **Fast inference speeds**: Sub-second response times with Llama 3.1 70B
- **No credit card required** for free tier
- **High-quality structured JSON output** for cruise port itineraries

---

## Getting Your Groq API Key

### Step 1: Sign Up for Groq

1. Go to [https://console.groq.com](https://console.groq.com)
2. Click **"Sign Up"** in the top right
3. Sign up with:
   - Your email address, OR
   - Your Google account, OR
   - Your GitHub account
4. Verify your email address (if using email signup)

### Step 2: Create an API Key

1. Once logged in, go to [https://console.groq.com/keys](https://console.groq.com/keys)
2. Click **"Create API Key"** button
3. Give your key a descriptive name (e.g., `shoreexplorer-production` or `shoreexplorer-dev`)
4. Click **"Submit"**
5. **IMPORTANT**: Copy the API key immediately! It will only be shown once.
   - The key starts with `gsk_`
   - It's approximately 56 characters long
   - Example format: `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`

6. Store the key securely (e.g., in a password manager)

> **Security Note**: Never commit your API key to version control. Always use environment variables.

---

## Configuring ShoreExplorer

### Local Development

1. **Create a `.env` file** in the `backend/` directory:
   ```bash
   cd backend
   touch .env
   ```

2. **Add your Groq API key** to the `.env` file:
   ```bash
   # Groq LLM API for plan generation
   GROQ_API_KEY=gsk_your_actual_api_key_here
   
   # MongoDB connection (local development)
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=shoreexplorer
   ```

3. **Verify the setup** by starting the backend:
   ```bash
   # Activate virtual environment
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Start the server
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

4. **Test the API** by generating a plan:
   - Create a trip and port via the frontend, or
   - Use the API directly with `curl` or Postman

### Testing Environment

For running tests, you can use a mock API key:

```bash
# In your test environment or CI/CD pipeline
export GROQ_API_KEY=mock-key-for-testing
```

The tests mock the Groq API client, so no real API calls are made during testing.

### Production Deployment (AWS ECS)

#### Option 1: Using AWS Secrets Manager (Recommended)

1. **Store the API key in AWS Secrets Manager**:
   ```bash
   aws secretsmanager create-secret \
     --name /shoreexplorer/prod/groq-api-key \
     --description "Groq API key for ShoreExplorer production" \
     --secret-string "gsk_your_actual_api_key_here" \
     --region us-east-1
   ```

2. **Update ECS task definition** to reference the secret:
   ```json
   {
     "name": "GROQ_API_KEY",
     "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:/shoreexplorer/prod/groq-api-key"
   }
   ```

3. **Grant ECS task role permission** to read the secret:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "secretsmanager:GetSecretValue"
     ],
     "Resource": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:/shoreexplorer/prod/groq-api-key*"
   }
   ```

#### Option 2: Using Environment Variables in ECS Task Definition

In your ECS task definition JSON:

```json
{
  "containerDefinitions": [
    {
      "name": "backend",
      "environment": [
        {
          "name": "GROQ_API_KEY",
          "value": "gsk_your_actual_api_key_here"
        }
      ]
    }
  ]
}
```

> **Warning**: This stores the key in plain text in your task definition. Use Secrets Manager for better security.

#### Option 3: Using GitHub Actions Secrets (for CI/CD)

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Name: `GROQ_API_KEY`
4. Value: `gsk_your_actual_api_key_here`
5. Click **"Add secret"**

6. Update your `.github/workflows/deploy-prod.yml`:
   ```yaml
   - name: Deploy to ECS
     env:
       GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
     run: |
       # Your deployment script
   ```

### Docker Deployment

In your `docker-compose.yml`:

```yaml
services:
  backend:
    build: ./backend
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - MONGO_URL=mongodb://mongo:27017
      - DB_NAME=shoreexplorer
    env_file:
      - ./backend/.env  # Load from .env file
```

Then run:
```bash
docker-compose up
```

---

## Understanding Free Tier Limits

### Groq Free Tier (as of 2024)

| Metric | Limit |
|--------|-------|
| **Requests per day** | 14,400 |
| **Requests per minute** | 30 |
| **Tokens per minute** | 15,000 |
| **Models available** | Llama 3.1 (8B, 70B), Mixtral 8x7B, Gemma 7B |

### What This Means for ShoreExplorer

- **Average plan generation**: ~1,500 tokens (input + output)
- **Plans per day**: 14,400 (free tier)
- **Plans per month**: ~432,000 (more than enough for most use cases)
- **Cost**: $0 (completely free on the free tier)

### If You Hit Rate Limits

If you exceed the free tier limits, you'll receive a 503 error with `ai_service_quota_exceeded`. Options:

1. **Wait**: Rate limits reset every minute/day
2. **Upgrade**: Add a payment method at [https://console.groq.com/settings/billing](https://console.groq.com/settings/billing)
   - Pay-as-you-go pricing (very affordable)
   - Llama 3.1 70B: $0.59 per 1M tokens
3. **Optimize**: Reduce prompt size or switch to faster 8B model

---

## Monitoring Your Usage

1. **Check usage in Groq Console**:
   - Go to [https://console.groq.com/settings/limits](https://console.groq.com/settings/limits)
   - View real-time usage statistics
   - See requests per day/minute

2. **Check application logs**:
   ```bash
   # View backend logs
   docker logs -f shoreexplorer-backend
   
   # Or in ECS
   aws logs tail /ecs/shoreexplorer-backend --follow
   ```

3. **Application-level monitoring**:
   - The backend logs all LLM API calls
   - Look for messages like: `"Calling LLM API for plan generation"`
   - Errors are logged with full details

---

## Troubleshooting

### Error: "Groq API key not configured"

**Cause**: The `GROQ_API_KEY` environment variable is not set.

**Fix**:
1. Verify the `.env` file exists in `backend/`
2. Verify the key is present: `cat backend/.env | grep GROQ_API_KEY`
3. Restart the backend server
4. For Docker: `docker-compose down && docker-compose up`

### Error: "API key is invalid" or "401 unauthorized"

**Cause**: The API key is incorrect or expired.

**Fix**:
1. Verify the key starts with `gsk_`
2. Go to [https://console.groq.com/keys](https://console.groq.com/keys)
3. Regenerate a new API key
4. Update your `.env` file or AWS Secrets Manager
5. Restart the application

### Error: "Rate limit exceeded" or "Quota exceeded"

**Cause**: You've hit the free tier limits (30 req/min or 14,400 req/day).

**Fix**:
1. **Short-term**: Wait 1 minute (for per-minute limit) or until next day (for daily limit)
2. **Long-term**: Add a payment method to upgrade beyond free tier
3. **Optimization**: Consider caching plans or rate-limiting user requests

### Plans are low quality or incorrect format

**Cause**: The model might need adjustment or the prompt is unclear.

**Fix**:
1. The default model is `llama-3.1-70b-versatile` (best quality)
2. You can change it in `backend/llm_client.py`:
   ```python
   self.model = "llama-3.1-8b-instant"  # Faster, less expensive
   ```
3. Adjust the temperature in the plan generation call (lower = more deterministic)

---

## Migration from Google Gemini

If you were previously using Google Gemini:

1. **Old environment variable**: `GOOGLE_API_KEY` → **New**: `GROQ_API_KEY`
2. **Update `.env` file**:
   ```bash
   # Remove this line:
   # GOOGLE_API_KEY=your-old-gemini-key
   
   # Add this line:
   GROQ_API_KEY=gsk_your_new_groq_key
   ```
3. **Update AWS Secrets Manager** (if applicable):
   ```bash
   # Delete old secret
   aws secretsmanager delete-secret \
     --secret-id /shoreexplorer/prod/google-api-key \
     --force-delete-without-recovery
   
   # Create new secret
   aws secretsmanager create-secret \
     --name /shoreexplorer/prod/groq-api-key \
     --secret-string "gsk_your_groq_key"
   ```
4. **Update GitHub Actions secrets**: Replace `GOOGLE_API_KEY` with `GROQ_API_KEY`
5. **Redeploy** the application

---

## Support

- **Groq Documentation**: [https://console.groq.com/docs](https://console.groq.com/docs)
- **Groq Discord**: [https://groq.com/discord](https://groq.com/discord)
- **API Status**: [https://status.groq.com](https://status.groq.com)
- **ShoreExplorer Issues**: [GitHub Issues](https://github.com/slatewave-labs/cruise-planner/issues)

---

## Security Best Practices

1. ✅ **Never commit API keys** to version control
2. ✅ **Use `.env` files** for local development (already in `.gitignore`)
3. ✅ **Use AWS Secrets Manager** for production deployments
4. ✅ **Rotate keys periodically** (every 90 days recommended)
5. ✅ **Use separate keys** for dev, test, and production environments
6. ✅ **Monitor usage** to detect unauthorized access
7. ✅ **Revoke compromised keys** immediately at [https://console.groq.com/keys](https://console.groq.com/keys)

---

## Summary

- **Sign up**: [https://console.groq.com](https://console.groq.com)
- **Get API key**: [https://console.groq.com/keys](https://console.groq.com/keys)
- **Set environment variable**: `GROQ_API_KEY=gsk_...`
- **Restart** the backend server
- **Enjoy**: 14,400 free plan generations per day! 🎉
