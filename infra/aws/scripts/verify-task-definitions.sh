#!/usr/bin/env bash
# =============================================================================
# Verify ECS Task Definitions Use GROQ_API_KEY
# =============================================================================
# This script checks that ECS task definitions are using GROQ_API_KEY
# instead of GOOGLE_API_KEY.
# Usage: ./infra/aws/scripts/verify-task-definitions.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

echo ""
echo "============================================================"
echo "  Verifying Task Definitions for '$ENVIRONMENT'"
echo "============================================================"
echo ""

# Check backend task definition
echo "Checking backend task definition..."
BACKEND_SECRETS=$(aws ecs describe-task-definition \
    --task-definition "$BACKEND_TASK_FAMILY" \
    --region "$AWS_REGION" \
    --query 'taskDefinition.containerDefinitions[0].secrets[*].name' \
    --output json 2>/dev/null || echo "[]")

echo "  Backend secrets: $BACKEND_SECRETS"

if echo "$BACKEND_SECRETS" | grep -q "GROQ_API_KEY"; then
    echo "  ✅ Backend uses GROQ_API_KEY"
else
    echo "  ❌ Backend does NOT use GROQ_API_KEY"
fi

if echo "$BACKEND_SECRETS" | grep -q "GOOGLE_API_KEY"; then
    echo "  ❌ Backend still references GOOGLE_API_KEY (needs update)"
else
    echo "  ✅ Backend does not reference GOOGLE_API_KEY"
fi

echo ""

# Check AWS Secrets Manager
echo "Checking AWS Secrets Manager..."
SECRET_KEYS=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$AWS_REGION" \
    --query 'SecretString' --output text 2>/dev/null | jq -r 'keys | .[]' || echo "")

echo "  Available keys in secret:"
echo "$SECRET_KEYS" | sed 's/^/    - /'

if echo "$SECRET_KEYS" | grep -q "GROQ_API_KEY"; then
    echo "  ✅ Secret contains GROQ_API_KEY"
else
    echo "  ❌ Secret does NOT contain GROQ_API_KEY"
fi

if echo "$SECRET_KEYS" | grep -q "GOOGLE_API_KEY"; then
    echo "  ⚠️  Secret still contains GOOGLE_API_KEY (legacy key, can be removed)"
else
    echo "  ✅ Secret does not contain GOOGLE_API_KEY"
fi

echo ""
echo "============================================================"
echo "  Verification Complete"
echo "============================================================"
echo ""

# Summary
if echo "$BACKEND_SECRETS" | grep -q "GROQ_API_KEY" && echo "$SECRET_KEYS" | grep -q "GROQ_API_KEY"; then
    echo "✅ All checks passed! Task definitions and secrets are configured correctly."
    echo ""
    exit 0
else
    echo "❌ Issues found. Please review the output above."
    echo ""
    echo "To fix, run:"
    echo "  ./infra/aws/scripts/07-create-ecs-services.sh $ENVIRONMENT"
    echo ""
    exit 1
fi
