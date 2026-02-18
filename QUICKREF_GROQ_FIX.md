# Quick Reference: ECS GROQ_API_KEY Fix

## The Problem
```
ResourceInitializationError: Secrets Manager did not contain json key GOOGLE_API_KEY
```

## The Fix (3 Files Changed)

### 1. `.github/workflows/deploy-test.yml` and `deploy-prod.yml`

**Added before service update:**
```yaml
- name: Register backend task definition
  run: |
    aws ecs register-task-definition \
      --family "${PROJECT_NAME}-${ENVIRONMENT}-backend-task" \
      # ... with GROQ_API_KEY in secrets
```

### 2. `infra/aws/scripts/deploy.sh`

**Added in existing services branch:**
```bash
# Re-register task definitions to ensure latest configuration
aws ecs register-task-definition --cli-input-json "$BACKEND_TASK_DEF"
aws ecs register-task-definition --cli-input-json "$FRONTEND_TASK_DEF"
```

### 3. New Verification Script

```bash
./infra/aws/scripts/verify-task-definitions.sh test
```

## Why This Works

**Before:** 
- Workflows only called `update-service --force-new-deployment`
- Old task definition (with GOOGLE_API_KEY) still used ❌

**After:**
- Workflows register new task definition first
- Service uses latest task definition (with GROQ_API_KEY) ✅

## Verification

Check task definition:
```bash
aws ecs describe-task-definition \
  --task-definition shoreexplorer-test-backend-task \
  --query 'taskDefinition.containerDefinitions[0].secrets'
```

Should show `GROQ_API_KEY`, not `GOOGLE_API_KEY`.

## Migration

No manual steps needed:
1. ✅ Merge PR
2. ✅ Next deployment automatically applies fix
3. ✅ Verify with script (optional)

## Documentation

- **Full details**: `infra/aws/ECS_TASK_DEFINITION_FIX.md`
- **PR summary**: `PR_FIX_SUMMARY.md`
- **Scripts guide**: `infra/aws/scripts/README.md`
