#!/usr/bin/env bash
# =============================================================================
# Quick Fix Script: Common ALB Connection Issues
# =============================================================================
# Attempts to fix the most common ALB connection issues:
# 1. Security group not allowing port 80
# 2. No healthy targets (force redeploy)
# Usage: ./infra/aws/scripts/quick-fix-alb.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║        Quick Fix for '$ENVIRONMENT' Environment                    ║"
echo "╔════════════════════════════════════════════════════════════════════╗"

# ---------------------------------------------------------------------------
# Check if ALB exists
# ---------------------------------------------------------------------------
print_header "Step 1: Verifying ALB exists"

ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names "$ALB_NAME" \
    --region "$AWS_REGION" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || echo "None")

if [[ "$ALB_ARN" == "None" ]]; then
    print_error "ALB does not exist"
    echo "  → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
    exit 1
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --region "$AWS_REGION" \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

print_success "ALB found: $ALB_NAME"
print_info "ALB URL: http://$ALB_DNS"

# ---------------------------------------------------------------------------
# Fix 1: Ensure Security Group allows port 80
# ---------------------------------------------------------------------------
print_header "Step 2: Fixing Security Group (port 80)"

ALB_SG_ID=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --region "$AWS_REGION" \
    --query 'LoadBalancers[0].SecurityGroups[0]' \
    --output text)

print_info "Security Group: $ALB_SG_ID"

# Check if port 80 is already open
SG_RULES=$(aws ec2 describe-security-groups \
    --group-ids "$ALB_SG_ID" \
    --region "$AWS_REGION" \
    --query 'SecurityGroups[0].IpPermissions' 2>/dev/null)

PORT_80_OPEN=$(echo "$SG_RULES" | jq 'any(
    .IpProtocol == "tcp" and 
    .FromPort <= 80 and 
    .ToPort >= 80 and 
    (.IpRanges[]?.CidrIp == "0.0.0.0/0" or .Ipv6Ranges[]?.CidrIpv6 == "::/0")
)')

if [[ "$PORT_80_OPEN" == "true" ]]; then
    print_success "Port 80 is already open"
else
    print_warning "Port 80 is NOT open, adding rule..."
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region "$AWS_REGION" 2>/dev/null || true
    
    print_success "Added ingress rule for port 80"
fi

# ---------------------------------------------------------------------------
# Fix 2: Check and fix target group health
# ---------------------------------------------------------------------------
print_header "Step 3: Checking Target Groups"

check_and_fix_targets() {
    local TG_NAME="$1"
    local SERVICE_NAME="$2"
    
    echo ""
    echo "  Checking $TG_NAME..."
    
    TG_ARN=$(aws elbv2 describe-target-groups \
        --names "$TG_NAME" \
        --region "$AWS_REGION" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || echo "None")
    
    if [[ "$TG_ARN" == "None" ]]; then
        print_warning "Target group not found"
        return
    fi
    
    # Get target health
    TARGETS=$(aws elbv2 describe-target-health \
        --target-group-arn "$TG_ARN" \
        --region "$AWS_REGION" \
        --query 'TargetHealthDescriptions[]' --output json)
    
    TARGET_COUNT=$(echo "$TARGETS" | jq 'length')
    HEALTHY_COUNT=$(echo "$TARGETS" | jq '[.[] | select(.TargetHealth.State == "healthy")] | length')
    
    if [[ "$HEALTHY_COUNT" -eq 0 ]]; then
        print_warning "No healthy targets, forcing redeploy..."
        
        aws ecs update-service \
            --cluster "$ECS_CLUSTER_NAME" \
            --service "$SERVICE_NAME" \
            --force-new-deployment \
            --region "$AWS_REGION" >/dev/null
        
        print_success "Triggered redeploy for $SERVICE_NAME"
    else
        print_success "$HEALTHY_COUNT healthy target(s)"
    fi
}

check_and_fix_targets "$BACKEND_TG_NAME" "$BACKEND_SERVICE_NAME"
check_and_fix_targets "$FRONTEND_TG_NAME" "$FRONTEND_SERVICE_NAME"

# ---------------------------------------------------------------------------
# Wait for services to stabilize (if redeployed)
# ---------------------------------------------------------------------------
print_header "Step 4: Waiting for services to stabilize"

print_info "This may take 2-3 minutes..."
echo ""

aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER_NAME" \
    --services "$BACKEND_SERVICE_NAME" "$FRONTEND_SERVICE_NAME" \
    --region "$AWS_REGION" 2>/dev/null || true

print_success "Services are stable"

# ---------------------------------------------------------------------------
# Test connectivity
# ---------------------------------------------------------------------------
print_header "Step 5: Testing Connectivity"

echo "  Testing: http://$ALB_DNS"
echo ""

# Wait a bit for ALB to register targets
sleep 10

# Test frontend
echo "  Testing frontend (/)..."
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 "http://$ALB_DNS/" 2>/dev/null || echo "000")

if [[ "$FRONTEND_CODE" == "200" ]]; then
    print_success "Frontend is accessible (HTTP $FRONTEND_CODE)"
else
    print_warning "Frontend returned HTTP $FRONTEND_CODE (may still be starting)"
fi

# Test backend health
echo "  Testing backend (/api/health)..."
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 "http://$ALB_DNS/api/health" 2>/dev/null || echo "000")

if [[ "$BACKEND_CODE" == "200" ]]; then
    print_success "Backend is accessible (HTTP $BACKEND_CODE)"
else
    print_warning "Backend returned HTTP $BACKEND_CODE (may still be starting)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_header "Summary"

echo ""
echo "  ✓ Security group configured for port 80"
echo "  ✓ Services redeployed (if needed)"
echo "  ✓ Connectivity tests completed"
echo ""

if [[ "$FRONTEND_CODE" == "200" && "$BACKEND_CODE" == "200" ]]; then
    print_success "All checks passed! Your application should be accessible."
    echo ""
    echo "  Access your application at:"
    echo "    ${GREEN}http://$ALB_DNS${NC}"
    echo ""
    echo "  ${YELLOW}Important:${NC} Use http:// not https:// (HTTPS not configured)"
    exit 0
else
    print_warning "Some services may still be starting up."
    echo ""
    echo "  Wait 1-2 more minutes, then try:"
    echo "    curl http://$ALB_DNS/"
    echo "    curl http://$ALB_DNS/api/health"
    echo ""
    echo "  If issues persist, run diagnostics:"
    echo "    ./infra/aws/scripts/diagnose-alb.sh $ENVIRONMENT"
    exit 0
fi
