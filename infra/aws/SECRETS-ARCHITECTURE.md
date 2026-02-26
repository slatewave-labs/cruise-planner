# ShoreExplorer Secrets Architecture

This document explains how secrets are managed across test and production environments.

## 🏗️ Architecture Overview

ShoreExplorer uses a **two-tier secret management strategy** that provides both convenience (shared AWS credentials) and security (isolated application secrets).

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Repository Secrets                     │
│                     (Shared Across Workflows)                    │
├─────────────────────────────────────────────────────────────────┤
│  • AWS_ACCESS_KEY_ID                                            │
│  • AWS_SECRET_ACCESS_KEY                                        │
│  • AWS_REGION (optional)                                        │
│  • TEST_DOMAIN (optional)                                       │
│  • PROD_DOMAIN (optional)                                       │
│  • TEST_/PROD_ affiliate IDs (optional)                         │
│  • TEST_/PROD_GA_MEASUREMENT_ID (optional)                      │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             │                                    │
             ▼                                    ▼
┌────────────────────────────┐    ┌────────────────────────────┐
│   Deploy to Test Workflow  │    │  Deploy to Prod Workflow   │
│  (.github/workflows/       │    │  (.github/workflows/       │
│   deploy-test.yml)         │    │   deploy-prod.yml)         │
└────────────┬───────────────┘    └────────────┬───────────────┘
             │                                  │
             │ Authenticates to AWS             │
             │ using GitHub secrets             │
             │                                  │
             ▼                                  ▼
┌────────────────────────────┐    ┌────────────────────────────┐
│  AWS Secrets Manager       │    │  AWS Secrets Manager       │
│  (Test Environment)        │    │  (Prod Environment)        │
├────────────────────────────┤    ├────────────────────────────┤
│  Secret Name:              │    │  Secret Name:              │
│  shoreexplorer-test-       │    │  shoreexplorer-prod-       │
│  secrets                   │    │  secrets                   │
│                            │    │                            │
│  Values:                   │    │  Values:                   │
│  • GROQ_API_KEY (test key) │    │  • GROQ_API_KEY (prod key) │
│  • Affiliate IDs (test)    │    │  • Affiliate IDs (prod)    │
└────────────┬───────────────┘    └────────────┬───────────────┘
             │                                  │
             │ Referenced by ECS                │
             │ task definition                  │
             │                                  │
             ▼                                  ▼
┌────────────────────────────┐    ┌────────────────────────────┐
│  ECS Tasks (Test)          │    │  ECS Tasks (Production)    │
│  • Backend container       │    │  • Backend container       │
│  • Frontend container      │    │  • Frontend container      │
└────────────────────────────┘    └────────────────────────────┘
```

---

## 🔑 Secret Types & Purposes

### Tier 1: GitHub Repository Secrets

**Purpose:** Provide GitHub Actions workflows access to AWS services

**Scope:** Shared across all workflows (test and prod)

**Why shared?** The same AWS account hosts both test and prod environments, so workflows use the same credentials to authenticate to AWS.

| Secret | Used By | Purpose |
|--------|---------|---------|
| `AWS_ACCESS_KEY_ID` | All deployment workflows | AWS API authentication |
| `AWS_SECRET_ACCESS_KEY` | All deployment workflows | AWS API authentication |
| `AWS_REGION` | All deployment workflows | AWS region selection |
| `TEST_DOMAIN` | Test deployment only | Custom domain for test env |
| `PROD_DOMAIN` | Prod deployment only | Custom domain for prod env |
| `TEST_GROQ_API_KEY` | Test setup/deploy | Groq AI API key for test |
| `PROD_GROQ_API_KEY` | Prod setup/deploy | Groq AI API key for production |
| `TEST_VIATOR_AFFILIATE_ID` | Test setup/deploy | Viator affiliate ID |
| `TEST_GETYOURGUIDE_AFFILIATE_ID` | Test setup/deploy | GetYourGuide affiliate ID |
| `TEST_KLOOK_AFFILIATE_ID` | Test setup/deploy | Klook affiliate ID |
| `TEST_TRIPADVISOR_AFFILIATE_ID` | Test setup/deploy | TripAdvisor affiliate ID |
| `TEST_BOOKING_AFFILIATE_ID` | Test setup/deploy | Booking.com affiliate ID |
| `PROD_VIATOR_AFFILIATE_ID` | Prod setup/deploy | Viator affiliate ID |
| `PROD_GETYOURGUIDE_AFFILIATE_ID` | Prod setup/deploy | GetYourGuide affiliate ID |
| `PROD_KLOOK_AFFILIATE_ID` | Prod setup/deploy | Klook affiliate ID |
| `PROD_TRIPADVISOR_AFFILIATE_ID` | Prod setup/deploy | TripAdvisor affiliate ID |
| `PROD_BOOKING_AFFILIATE_ID` | Prod setup/deploy | Booking.com affiliate ID |
| `TEST_GA_MEASUREMENT_ID` | Test frontend build | Google Analytics measurement ID |
| `PROD_GA_MEASUREMENT_ID` | Prod frontend build | Google Analytics measurement ID |

### Tier 2: AWS Secrets Manager

**Purpose:** Store application secrets (API keys, database credentials)

**Scope:** Separate secrets for each environment

**Why separate?** Test and production should never share database credentials or API keys. Complete isolation prevents accidental data mixing or quota sharing.

| Environment | Secret Name | Contains |
|-------------|-------------|----------|
| Test | `shoreexplorer-test-secrets` | Test Groq API key, affiliate IDs |
| Production | `shoreexplorer-prod-secrets` | Prod Groq API key, affiliate IDs |

---

## 📋 How Secrets Flow Through Deployment

### 1. Workflow Triggered

A developer pushes code or creates a release tag.

### 2. Workflow Authenticates to AWS

The workflow uses GitHub secrets to authenticate:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ env.AWS_REGION }}
```

### 3. Workflow Registers Task Definition

The workflow creates an ECS task definition that references AWS Secrets Manager:

```yaml
- name: Register backend task definition
  run: |
    SECRET_ARN=$(aws secretsmanager describe-secret \
      --secret-id "shoreexplorer-${ENVIRONMENT}-secrets" \
      --query 'ARN' --output text)
    
    aws ecs register-task-definition \
      --family "shoreexplorer-${ENVIRONMENT}-backend-task" \
      --container-definitions "[{
        \"name\": \"backend\",
        \"secrets\": [
          {\"name\": \"GROQ_API_KEY\", \"valueFrom\": \"${SECRET_ARN}:GROQ_API_KEY::\"},
          {\"name\": \"VIATOR_AFFILIATE_ID\", \"valueFrom\": \"${SECRET_ARN}:VIATOR_AFFILIATE_ID::\"},
          {\"name\": \"GETYOURGUIDE_AFFILIATE_ID\", \"valueFrom\": \"${SECRET_ARN}:GETYOURGUIDE_AFFILIATE_ID::\"},
          {\"name\": \"KLOOK_AFFILIATE_ID\", \"valueFrom\": \"${SECRET_ARN}:KLOOK_AFFILIATE_ID::\"},
          {\"name\": \"TRIPADVISOR_AFFILIATE_ID\", \"valueFrom\": \"${SECRET_ARN}:TRIPADVISOR_AFFILIATE_ID::\"},
          {\"name\": \"BOOKING_AFFILIATE_ID\", \"valueFrom\": \"${SECRET_ARN}:BOOKING_AFFILIATE_ID::\"}
        ],
        \"environment\": [
          {\"name\": \"DYNAMODB_TABLE_NAME\", \"value\": \"shoreexplorer-${ENVIRONMENT}\"},
          {\"name\": \"AWS_DEFAULT_REGION\", \"value\": \"us-east-1\"}
        ]
      }]"
```

### 4. ECS Tasks Pull Secrets at Runtime

When ECS starts a container, it automatically:
1. Authenticates to AWS Secrets Manager using the task execution role
2. Fetches the secret values from the environment-specific secret
3. Injects them as environment variables into the container

**The application code never sees the secrets in plaintext during deployment.** They're only decrypted and injected at container runtime.

---

## 🛠️ Managing Secrets

### Setting Up Initial Secrets

Use the provided scripts to create secrets in AWS:

```bash
# Set up test environment secrets
export GROQ_API_KEY="gsk_test_key_here"
./infra/aws/scripts/03-create-secrets.sh test

# Set up production environment secrets  
export GROQ_API_KEY="gsk_prod_key_here"
./infra/aws/scripts/03-create-secrets.sh prod
```

### Updating GROQ_API_KEY

Use the dedicated update script:

```bash
# Update test Groq API key
./infra/aws/scripts/update-groq-api-key.sh test gsk_new_test_key

# Update production Groq API key
./infra/aws/scripts/update-groq-api-key.sh prod gsk_new_prod_key
```

After updating, you must redeploy for the change to take effect:

```bash
# For test environment
git push origin main  # Triggers automatic test deployment

# For production
git tag v1.2.3
git push origin v1.2.3  # Triggers production deployment
```

### Updating Secrets

Update the secret JSON in AWS Secrets Manager:

```bash
# Get current secret values
aws secretsmanager get-secret-value \
  --secret-id shoreexplorer-test-secrets \
  --query SecretString --output text | jq .

# Update with new values
aws secretsmanager update-secret \
  --secret-id shoreexplorer-test-secrets \
  --secret-string '{
    "GROQ_API_KEY": "gsk_new_key"
  }' \
  --region us-east-1
```

### Rotating AWS Credentials (GitHub Secrets)

When rotating AWS access keys:

1. Create a new IAM access key for the GitHub Actions user
2. Update both GitHub secrets:
   - `AWS_ACCESS_KEY_ID` → new key ID
   - `AWS_SECRET_ACCESS_KEY` → new secret key
3. Test with a deployment to test environment
4. Delete the old IAM access key

---

## ✅ Verification

### Check Secrets Exist in AWS

```bash
# List all secrets
aws secretsmanager list-secrets --region us-east-1

# View test environment secret (values hidden)
aws secretsmanager describe-secret \
  --secret-id shoreexplorer-test-secrets \
  --region us-east-1

# View production environment secret (values hidden)
aws secretsmanager describe-secret \
  --secret-id shoreexplorer-prod-secrets \
  --region us-east-1
```

### Check ECS Tasks Are Using Secrets

```bash
# Get active task definition for test backend
aws ecs describe-task-definition \
  --task-definition shoreexplorer-test-backend-task \
  --query 'taskDefinition.containerDefinitions[0].secrets' \
  --region us-east-1

# Should show:
# [
#   {"name": "GROQ_API_KEY", "valueFrom": "arn:aws:secretsmanager:...:GROQ_API_KEY::"}
# ]
```

### Test Application Can Access Secrets

```bash
# Check test environment backend logs
aws logs tail /ecs/shoreexplorer-test-backend --follow

# Should NOT show secret values (they're masked)
# Should show successful DynamoDB connection if configured correctly
```

---

## 🔒 Security Considerations

### ✅ What's Secure

1. **Secrets are encrypted at rest** in both GitHub and AWS Secrets Manager
2. **Secrets are encrypted in transit** (TLS) when fetched by ECS
3. **No secrets in source code** - all sensitive data is externalized
4. **No secrets in Docker images** - injected at runtime only
5. **IAM permissions** - only task execution role can read secrets
6. **Audit trail** - CloudTrail logs all secret access

### ⚠️ Risks to Mitigate

1. **Compromised AWS credentials** → Use MFA, rotate keys regularly
2. **Overly permissive IAM** → Use least privilege (task execution role can only read its own secrets)
3. **Leaked secrets in logs** → Application code must never log secret values
4. **Stale secrets** → Rotate API keys and database passwords periodically

### 🛡️ Best Practices

1. **Use separate AWS accounts** for test and prod if budget allows
2. **Enable AWS Secrets Manager rotation** for database credentials
3. **Monitor CloudTrail** for unusual secret access patterns
4. **Never share secrets** between environments (already implemented ✅)
5. **Document secret purpose** using tags in AWS Secrets Manager

---

## 🆘 Troubleshooting

### ECS Task Fails to Start

**Symptom:** Task immediately goes to STOPPED state

**Possible causes:**
1. Secret ARN is incorrect in task definition
2. Task execution role lacks permission to read secret
3. Secret doesn't exist in AWS Secrets Manager

**Solution:**
```bash
# Check if secret exists
aws secretsmanager describe-secret \
  --secret-id shoreexplorer-test-secrets \
  --region us-east-1

# Check task definition
aws ecs describe-task-definition \
  --task-definition shoreexplorer-test-backend-task \
  --region us-east-1

# Check ECS task logs
aws logs tail /ecs/shoreexplorer-test-backend --follow
```

### Application Can't Connect to DynamoDB

**Symptom:** Backend logs show "Could not connect to the endpoint URL" or table not found

**Solution:**
1. Verify the ECS task has the correct environment variables:
   - `DYNAMODB_TABLE_NAME` should match the table name for the environment
   - `AWS_DEFAULT_REGION` should match the region where the table was created

2. Verify the DynamoDB table exists:
   ```bash
   aws dynamodb describe-table \
     --table-name shoreexplorer-test \
     --region us-east-1
   ```

3. Verify the ECS task role has DynamoDB permissions

4. Force ECS to restart:
   ```bash
   aws ecs update-service \
     --cluster shoreexplorer-test-cluster \
     --service shoreexplorer-test-backend \
     --force-new-deployment \
     --region us-east-1
   ```

### Groq API Calls Failing

**Symptom:** Backend logs show "401 Unauthorized" or "Invalid API key"

**Solution:**
1. Get a new API key from [Groq Console](https://console.groq.com/keys)
2. Update the secret:
   ```bash
   ./infra/aws/scripts/update-groq-api-key.sh test gsk_new_key
   ```
3. Redeploy to apply changes

---

## 📚 Related Documentation

- [GITHUB-SECRETS.md](GITHUB-SECRETS.md) - How to configure GitHub repository secrets
- [03-create-secrets.sh](scripts/03-create-secrets.sh) - Script to create AWS secrets
- [update-groq-api-key.sh](scripts/update-groq-api-key.sh) - Script to update Groq API key
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)

---

**Last Updated:** 2026-02-18
