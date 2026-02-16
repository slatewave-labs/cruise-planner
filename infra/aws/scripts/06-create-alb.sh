#!/usr/bin/env bash
# =============================================================================
# Step 6: Create Application Load Balancer (ALB)
# =============================================================================
# Creates the load balancer that distributes traffic to your containers.
# The ALB routes /api/* requests to the backend and everything else to frontend.
# Usage: ./infra/aws/scripts/06-create-alb.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

# Load networking outputs
NETWORK_FILE="$SCRIPT_DIR/.networking-outputs-${ENVIRONMENT}.env"
if [[ ! -f "$NETWORK_FILE" ]]; then
    echo "  ❌ Run 02-create-networking.sh first"
    exit 1
fi
source "$NETWORK_FILE"

print_status "Creating Application Load Balancer for '$ENVIRONMENT' environment"

# ---------------------------------------------------------------------------
# Create ALB
# ---------------------------------------------------------------------------
EXISTING_ALB=$(aws elbv2 describe-load-balancers \
    --names "$ALB_NAME" \
    --query "LoadBalancers[0].LoadBalancerArn" --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "None")

if [[ "$EXISTING_ALB" != "None" && "$EXISTING_ALB" != "" ]]; then
    ALB_ARN="$EXISTING_ALB"
    print_skip "ALB: $ALB_NAME"
else
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name "$ALB_NAME" \
        --subnets "$PUBLIC_SUBNET_1_ID" "$PUBLIC_SUBNET_2_ID" \
        --security-groups "$ALB_SG_ID" \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value="$TAG_ENVIRONMENT" \
        --query "LoadBalancers[0].LoadBalancerArn" --output text --region "$AWS_REGION")
    print_success "Created ALB: $ALB_NAME"
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --query "LoadBalancers[0].DNSName" --output text --region "$AWS_REGION")

# ---------------------------------------------------------------------------
# Create Target Groups
# ---------------------------------------------------------------------------
create_target_group() {
    local TG_NAME="$1"
    local PORT="$2"
    local HEALTH_PATH="$3"

    local EXISTING
    EXISTING=$(aws elbv2 describe-target-groups \
        --names "$TG_NAME" \
        --query "TargetGroups[0].TargetGroupArn" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "None")

    if [[ "$EXISTING" != "None" && "$EXISTING" != "" ]]; then
        print_skip "Target Group: $TG_NAME ($EXISTING)"
        echo "$EXISTING"
        return
    fi

    local TG_ARN
    TG_ARN=$(aws elbv2 create-target-group \
        --name "$TG_NAME" \
        --protocol HTTP \
        --port "$PORT" \
        --vpc-id "$VPC_ID" \
        --target-type ip \
        --health-check-protocol HTTP \
        --health-check-path "$HEALTH_PATH" \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 10 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --matcher HttpCode=200 \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value="$TAG_ENVIRONMENT" \
        --query "TargetGroups[0].TargetGroupArn" --output text --region "$AWS_REGION")

    print_success "Created target group: $TG_NAME"
    echo "$TG_ARN"
}

BACKEND_TG_ARN=$(create_target_group "$BACKEND_TG_NAME" 8001 "/api/health")
FRONTEND_TG_ARN=$(create_target_group "$FRONTEND_TG_NAME" 80 "/")

# ---------------------------------------------------------------------------
# Create HTTP Listener (port 80)
# ---------------------------------------------------------------------------
EXISTING_LISTENER=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --query "Listeners[?Port==\`80\`].ListenerArn" --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

if [[ -n "$EXISTING_LISTENER" && "$EXISTING_LISTENER" != "None" ]]; then
    LISTENER_ARN="$EXISTING_LISTENER"
    print_skip "HTTP Listener (port 80)"
else
    # Default action: forward to frontend
    LISTENER_ARN=$(aws elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTP \
        --port 80 \
        --default-actions Type=forward,TargetGroupArn="$FRONTEND_TG_ARN" \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value="$TAG_ENVIRONMENT" \
        --query "Listeners[0].ListenerArn" --output text --region "$AWS_REGION")
    print_success "Created HTTP listener on port 80 (default → frontend)"
fi

# ---------------------------------------------------------------------------
# Create Listener Rule: /api/* → Backend
# ---------------------------------------------------------------------------
EXISTING_RULES=$(aws elbv2 describe-rules \
    --listener-arn "$LISTENER_ARN" \
    --query "Rules[?Conditions[?Field=='path-pattern' && Values[0]=='/api/*']].RuleArn" \
    --output text --region "$AWS_REGION" 2>/dev/null || echo "")

if [[ -n "$EXISTING_RULES" && "$EXISTING_RULES" != "None" ]]; then
    print_skip "Listener rule: /api/* → backend"
else
    aws elbv2 create-rule \
        --listener-arn "$LISTENER_ARN" \
        --priority 10 \
        --conditions Field=path-pattern,Values='/api/*' \
        --actions Type=forward,TargetGroupArn="$BACKEND_TG_ARN" \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value="$TAG_ENVIRONMENT" \
        --region "$AWS_REGION" --output text >/dev/null
    print_success "Created listener rule: /api/* → backend"
fi

# ---------------------------------------------------------------------------
# Save outputs
# ---------------------------------------------------------------------------
OUTPUT_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
cat > "$OUTPUT_FILE" <<EOF
# ALB outputs for $ENVIRONMENT - generated by 06-create-alb.sh
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
BACKEND_TG_ARN=$BACKEND_TG_ARN
FRONTEND_TG_ARN=$FRONTEND_TG_ARN
LISTENER_ARN=$LISTENER_ARN
EOF

print_success "ALB outputs saved to $OUTPUT_FILE"

echo ""
echo "  ALB DNS:          http://$ALB_DNS"
echo "  Frontend:         http://$ALB_DNS/"
echo "  Backend API:      http://$ALB_DNS/api/"
echo "  Health check:     http://$ALB_DNS/api/health"
echo ""
echo "  ⚠️  The ALB URL won't work until services are deployed (step 7+8)."
echo ""
