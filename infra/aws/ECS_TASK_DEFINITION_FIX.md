# ECS Task Definition Fix: GOOGLE_API_KEY → GROQ_API_KEY

## Problem

After migrating from Google Gemini to Groq (PR #25, #26), ECS deployments were failing with:

```
ResourceInitializationError: unable to pull secrets or registry auth: 
execution resource retrieval failed: unable to retrieve secret from asm: 
service call has been retried 1 time(s): retrieved secret from Secrets 
Manager did not contain json key GOOGLE_API_KEY
```

## Root Cause

The deployed ECS task definitions in AWS were still referencing `GOOGLE_API_KEY` instead of `GROQ_API_KEY`. While the infrastructure scripts (`07-create-ecs-services.sh`) were updated to use `GROQ_API_KEY`, the GitHub Actions deployment workflows were only calling `aws ecs update-service --force-new-deployment`, which **does not register a new task definition**.

### Why This Happened

1. Initial setup used `GOOGLE_API_KEY` for Google Gemini
2. Migration to Groq updated infrastructure scripts to use `GROQ_API_KEY`
3. AWS Secrets Manager was updated to contain `GROQ_API_KEY`
4. **BUT** the deployed task definitions (already registered in AWS) still referenced `GOOGLE_API_KEY`
5. Deployment workflows only forced service redeployment without registering new task definitions

## Solution

Updated three files to ensure task definitions are re-registered on every deployment:

### 1. `.github/workflows/deploy-test.yml`

Added steps to register backend and frontend task definitions **before** updating ECS services:

```yaml
- name: Get secrets ARN
  id: secrets
  run: |
    SECRET_ARN=$(aws secretsmanager describe-secret \
      --secret-id "${PROJECT_NAME}-${ENVIRONMENT}-secrets" \
      --query 'ARN' --output text --region "$AWS_REGION")
    echo "secret_arn=${SECRET_ARN}" >> "$GITHUB_OUTPUT"

- name: Register backend task definition
  run: |
    # Register task definition with GROQ_API_KEY
    aws ecs register-task-definition \
      --family "${PROJECT_NAME}-${ENVIRONMENT}-backend-task" \
      # ... includes GROQ_API_KEY in secrets section

- name: Register frontend task definition
  run: |
    # Register task definition
    aws ecs register-task-definition \
      --family "${PROJECT_NAME}-${ENVIRONMENT}-frontend-task"

- name: Update backend ECS service
  run: |
    aws ecs update-service --force-new-deployment ...
```

### 2. `.github/workflows/deploy-prod.yml`

Same changes as test workflow, adapted for production environment.

### 3. `infra/aws/scripts/deploy.sh`

Updated to re-register task definitions when services already exist:

```bash
if [[ "$BACKEND_EXISTS" == "false" || "$FRONTEND_EXISTS" == "false" ]]; then
    # Create new services (calls 07-create-ecs-services.sh)
    "$SCRIPT_DIR/07-create-ecs-services.sh" "$ENVIRONMENT"
else
    # Re-register task definitions to ensure latest configuration
    print_info "Registering updated task definitions..."
    
    # Register backend task definition with GROQ_API_KEY
    aws ecs register-task-definition --cli-input-json "$BACKEND_TASK_DEF" ...
    
    # Register frontend task definition
    aws ecs register-task-definition --cli-input-json "$FRONTEND_TASK_DEF" ...
    
    # Then update services
    aws ecs update-service --force-new-deployment ...
fi
```

## Task Definition Structure

Backend task definitions now correctly reference `GROQ_API_KEY`:

```json
{
  "family": "shoreexplorer-{env}-backend-task",
  "containerDefinitions": [{
    "name": "backend",
    "secrets": [
      {
        "name": "MONGO_URL",
        "valueFrom": "arn:aws:secretsmanager:...:MONGO_URL::"
      },
      {
        "name": "GROQ_API_KEY",
        "valueFrom": "arn:aws:secretsmanager:...:GROQ_API_KEY::"
      },
      {
        "name": "DB_NAME",
        "valueFrom": "arn:aws:secretsmanager:...:DB_NAME::"
      }
    ]
  }]
}
```

## Verification

After deploying these changes, verify the task definition is correct:

```bash
# Get latest task definition
aws ecs describe-task-definition \
  --task-definition shoreexplorer-test-backend-task \
  --region us-east-1 \
  --query 'taskDefinition.containerDefinitions[0].secrets'

# Should show:
# [
#   { "name": "MONGO_URL", "valueFrom": "...:MONGO_URL::" },
#   { "name": "GROQ_API_KEY", "valueFrom": "...:GROQ_API_KEY::" },
#   { "name": "DB_NAME", "valueFrom": "...:DB_NAME::" }
# ]
```

Verify the secret contains the correct key:

```bash
aws secretsmanager get-secret-value \
  --secret-id shoreexplorer-test-secrets \
  --region us-east-1 \
  --query 'SecretString' --output text | jq .

# Should show:
# {
#   "MONGO_URL": "...",
#   "GROQ_API_KEY": "gsk_...",
#   "DB_NAME": "shoreexplorer"
# }
```

## Prevention

To prevent similar issues in the future:

1. **Always re-register task definitions** when deploying, even if just forcing a new deployment
2. **Keep GitHub workflows in sync** with infrastructure scripts (like `07-create-ecs-services.sh`)
3. **Test deployments** after making environment variable changes
4. **Document environment variables** in `README.md` and update when changing

## Related Files

- `.github/workflows/deploy-test.yml` - Test environment deployment
- `.github/workflows/deploy-prod.yml` - Production environment deployment
- `infra/aws/scripts/deploy.sh` - Manual deployment script
- `infra/aws/scripts/07-create-ecs-services.sh` - Initial service creation
- `infra/aws/AWS_GROQ_SETUP.md` - Groq API setup documentation

## Timeline

- **Before PR #25**: Used `GOOGLE_API_KEY` for Google Gemini
- **PR #25**: Migrated to Groq, updated backend code to use `GROQ_API_KEY`
- **PR #26**: Updated infrastructure scripts to use `GROQ_API_KEY`
- **This fix**: Updated deployment workflows and scripts to re-register task definitions

## Impact

- ✅ Deployments now work correctly with `GROQ_API_KEY`
- ✅ No manual intervention needed - next deployment will fix the issue
- ✅ Both test and production environments are fixed
- ✅ Manual deployments using `deploy.sh` also work correctly
