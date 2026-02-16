#!/usr/bin/env bash
# =============================================================================
# Deploy: Update ECS Services with Latest Images
# =============================================================================
# Forces ECS to pull the latest images and restart containers.
# Usage: ./infra/aws/scripts/deploy.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

# Load ALB outputs for URL display
ALB_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
if [[ -f "$ALB_FILE" ]]; then
    source "$ALB_FILE"
fi

print_status "Deploying to '$ENVIRONMENT' environment"

# ---------------------------------------------------------------------------
# Check if ECS services exist — if not, create them first
# ---------------------------------------------------------------------------
service_exists() {
    local SVC_NAME="$1"
    local STATUS
    STATUS=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$SVC_NAME" \
        --query "services[?status=='ACTIVE'].serviceName" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    [[ -n "$STATUS" && "$STATUS" != "None" ]]
}

BACKEND_EXISTS=true
FRONTEND_EXISTS=true
service_exists "$BACKEND_SERVICE_NAME"  || BACKEND_EXISTS=false
service_exists "$FRONTEND_SERVICE_NAME" || FRONTEND_EXISTS=false

if [[ "$BACKEND_EXISTS" == "false" || "$FRONTEND_EXISTS" == "false" ]]; then
    print_info "ECS services not found — creating them now..."
    "$SCRIPT_DIR/07-create-ecs-services.sh" "$ENVIRONMENT"
else
    # ---------------------------------------------------------------------------
    # Force new deployment of backend
    # ---------------------------------------------------------------------------
    print_info "Deploying backend..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$BACKEND_SERVICE_NAME" \
        --force-new-deployment \
        --region "$AWS_REGION" --output text >/dev/null

    print_success "Backend deployment started"

    # ---------------------------------------------------------------------------
    # Force new deployment of frontend
    # ---------------------------------------------------------------------------
    print_info "Deploying frontend..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$FRONTEND_SERVICE_NAME" \
        --force-new-deployment \
        --region "$AWS_REGION" --output text >/dev/null

    print_success "Frontend deployment started"
fi

# ---------------------------------------------------------------------------
# Wait for services to stabilize (optional)
# ---------------------------------------------------------------------------
if [[ "${WAIT_FOR_STABLE:-true}" == "true" ]]; then
    print_info "Waiting for services to stabilize (this can take 3-5 minutes)..."

    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$BACKEND_SERVICE_NAME" "$FRONTEND_SERVICE_NAME" \
        --region "$AWS_REGION" 2>/dev/null \
        && print_success "All services are stable and healthy!" \
        || print_error "Timeout waiting for services. Check logs for issues."
fi

echo ""
echo "  Deployment complete!"
if [[ -n "${ALB_DNS:-}" ]]; then
    echo ""
    echo "  🌐 Application URL:  http://$ALB_DNS"
    echo "  🔧 API Health:       http://$ALB_DNS/api/health"
fi
echo ""
echo "  View logs:"
echo "    aws logs tail $BACKEND_LOG_GROUP --follow --region $AWS_REGION"
echo "    aws logs tail $FRONTEND_LOG_GROUP --follow --region $AWS_REGION"
echo ""
