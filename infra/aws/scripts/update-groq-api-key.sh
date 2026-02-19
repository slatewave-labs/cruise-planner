#!/usr/bin/env bash
# =============================================================================
# Update Groq API Key in AWS Secrets Manager
# =============================================================================
# This script updates the GROQ_API_KEY in your existing AWS Secrets Manager
# secret without affecting other values (MONGO_URL, DB_NAME).
#
# Usage: ./infra/aws/scripts/update-groq-api-key.sh <test|prod> <your-groq-api-key>
#
# Example:
#   ./infra/aws/scripts/update-groq-api-key.sh test gsk_abc123...
#   ./infra/aws/scripts/update-groq-api-key.sh prod gsk_xyz789...
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-}"

# ---------------------------------------------------------------------------
# Validate inputs
# ---------------------------------------------------------------------------
if [[ -z "${1:-}" ]]; then
    echo ""
    echo "  ❌ Error: Environment not specified"
    echo ""
    echo "  Usage: $0 <test|prod> <groq-api-key>"
    echo ""
    echo "  Examples:"
    echo "    $0 test gsk_abc123def456..."
    echo "    $0 prod gsk_xyz789uvw012..."
    echo ""
    exit 1
fi

if [[ -z "${2:-}" ]]; then
    echo ""
    echo "  ❌ Error: Groq API key not provided"
    echo ""
    echo "  Usage: $0 <test|prod> <groq-api-key>"
    echo ""
    echo "  To get a Groq API key:"
    echo "    1. Go to https://console.groq.com/keys"
    echo "    2. Sign up or log in (free, no credit card required)"
    echo "    3. Click 'Create API Key'"
    echo "    4. Copy the key (starts with 'gsk_')"
    echo ""
    exit 1
fi

GROQ_API_KEY="$2"

# Validate API key format
if [[ ! "$GROQ_API_KEY" =~ ^gsk_ ]]; then
    echo ""
    echo "  ⚠️  Warning: Groq API keys typically start with 'gsk_'"
    echo "  Your key: $GROQ_API_KEY"
    echo ""
    read -p "  Continue anyway? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "  Cancelled."
        exit 1
    fi
fi

print_status "Updating GROQ_API_KEY in '$ENVIRONMENT' environment"

# ---------------------------------------------------------------------------
# Check if secret exists
# ---------------------------------------------------------------------------
if ! resource_exists "secret" "$SECRET_NAME"; then
    echo ""
    echo "  ❌ Error: Secret '$SECRET_NAME' does not exist in AWS Secrets Manager"
    echo ""
    echo "  This secret should have been created during initial setup."
    echo "  Please run the full setup first:"
    echo ""
    echo "    ./infra/aws/scripts/03-create-secrets.sh $ENVIRONMENT"
    echo ""
    exit 1
fi

# ---------------------------------------------------------------------------
# Get current secret value
# ---------------------------------------------------------------------------
print_info "Fetching current secret value..."

CURRENT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query "SecretString" \
    --output text \
    --region "$AWS_REGION")

# Parse existing values
MONGO_URL=$(echo "$CURRENT_SECRET" | jq -r '.MONGO_URL // empty')
DB_NAME=$(echo "$CURRENT_SECRET" | jq -r '.DB_NAME // "myapp"')
CURRENT_GROQ_KEY=$(echo "$CURRENT_SECRET" | jq -r '.GROQ_API_KEY // empty')

if [[ -z "$MONGO_URL" ]]; then
    echo ""
    echo "  ❌ Error: Existing secret does not contain MONGO_URL"
    echo "  The secret may be corrupted or in an unexpected format."
    echo ""
    echo "  Current secret contents:"
    echo "$CURRENT_SECRET" | jq '.' 2>/dev/null || echo "$CURRENT_SECRET"
    echo ""
    exit 1
fi

# ---------------------------------------------------------------------------
# Show what will change
# ---------------------------------------------------------------------------
echo ""
echo "  📋 Current Configuration:"
echo "  ├─ MONGO_URL: ${MONGO_URL:0:30}..." 
echo "  ├─ DB_NAME: $DB_NAME"
if [[ -n "$CURRENT_GROQ_KEY" ]]; then
    echo "  └─ GROQ_API_KEY: ${CURRENT_GROQ_KEY:0:10}...${CURRENT_GROQ_KEY: -4} (will be replaced)"
else
    echo "  └─ GROQ_API_KEY: (not set - will be added)"
fi
echo ""
echo "  🔄 New GROQ_API_KEY: ${GROQ_API_KEY:0:10}...${GROQ_API_KEY: -4}"
echo ""

read -p "  Continue with update? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "  Cancelled."
    exit 0
fi

# ---------------------------------------------------------------------------
# Update the secret
# ---------------------------------------------------------------------------
print_info "Updating secret in AWS Secrets Manager..."

NEW_SECRET_VALUE=$(cat <<EOF
{
    "MONGO_URL": "$MONGO_URL",
    "GROQ_API_KEY": "$GROQ_API_KEY",
    "DB_NAME": "$DB_NAME"
}
EOF
)

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$NEW_SECRET_VALUE" \
    --region "$AWS_REGION" \
    --output text >/dev/null

print_success "Secret updated successfully!"

# ---------------------------------------------------------------------------
# Restart ECS services to pick up new secret
# ---------------------------------------------------------------------------
echo ""
echo "  🔄 ECS services need to be restarted to pick up the new secret."
echo ""
read -p "  Restart ECS services now? (y/N): " restart_confirm

if [[ "$restart_confirm" == "y" || "$restart_confirm" == "Y" ]]; then
    print_info "Restarting backend service..."
    
    CLUSTER_NAME="${APP_NAME}-${ENVIRONMENT}-cluster"
    BACKEND_SERVICE="${APP_NAME}-${ENVIRONMENT}-backend"
    
    if aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$BACKEND_SERVICE" \
        --region "$AWS_REGION" \
        --query "services[0].serviceName" \
        --output text 2>/dev/null | grep -q "$BACKEND_SERVICE"; then
        
        aws ecs update-service \
            --cluster "$CLUSTER_NAME" \
            --service "$BACKEND_SERVICE" \
            --force-new-deployment \
            --region "$AWS_REGION" \
            --output text >/dev/null
        
        print_success "Backend service restart initiated"
        
        echo ""
        echo "  ⏳ Service is restarting... this may take 2-3 minutes."
        echo "  You can monitor progress with:"
        echo ""
        echo "    aws ecs describe-services \\"
        echo "      --cluster $CLUSTER_NAME \\"
        echo "      --services $BACKEND_SERVICE \\"
        echo "      --region $AWS_REGION"
        echo ""
    else
        echo "  ⚠️  Backend service not found or not running."
        echo "  The secret has been updated, but you'll need to deploy the service."
    fi
else
    echo ""
    echo "  ⚠️  Secret updated but ECS services not restarted."
    echo "  To apply changes, restart manually:"
    echo ""
    echo "    aws ecs update-service \\"
    echo "      --cluster ${APP_NAME}-${ENVIRONMENT}-cluster \\"
    echo "      --service ${APP_NAME}-${ENVIRONMENT}-backend \\"
    echo "      --force-new-deployment \\"
    echo "      --region $AWS_REGION"
    echo ""
fi

# ---------------------------------------------------------------------------
# Verify secret is correct
# ---------------------------------------------------------------------------
echo ""
print_info "Verifying updated secret..."

VERIFY_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query "SecretString" \
    --output text \
    --region "$AWS_REGION")

VERIFY_GROQ_KEY=$(echo "$VERIFY_SECRET" | jq -r '.GROQ_API_KEY // empty')

if [[ "$VERIFY_GROQ_KEY" == "$GROQ_API_KEY" ]]; then
    print_success "Verification passed! GROQ_API_KEY is correctly set."
else
    echo "  ❌ Verification failed!"
    echo "  Expected: ${GROQ_API_KEY:0:10}...${GROQ_API_KEY: -4}"
    echo "  Got: ${VERIFY_GROQ_KEY:0:10}...${VERIFY_GROQ_KEY: -4}"
    exit 1
fi

# ---------------------------------------------------------------------------
# Success summary
# ---------------------------------------------------------------------------
echo ""
echo "  ═══════════════════════════════════════════════════════════════"
echo "  ✅ GROQ_API_KEY successfully updated for '$ENVIRONMENT' environment"
echo "  ═══════════════════════════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "  1. Wait 2-3 minutes for ECS service to restart (if you chose to restart)"
echo "  2. Test the deployment:"
echo "     - Health check: https://your-alb-url/api/health"
echo "     - Check ai_service is 'configured'"
echo "  3. Test plan generation in the app"
echo ""
echo "  If you see 'AI plan generation service is not configured' error:"
echo "  - Wait for service restart to complete"
echo "  - Check ECS task logs for any startup errors"
echo "  - Verify the secret with: aws secretsmanager get-secret-value --secret-id $SECRET_NAME --region $AWS_REGION"
echo ""
