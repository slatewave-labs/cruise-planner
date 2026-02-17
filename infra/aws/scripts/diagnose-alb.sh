#!/usr/bin/env bash
# =============================================================================
# Diagnostic Script: ALB Connection Issues
# =============================================================================
# Diagnoses common ALB connection issues including:
# - ALB state and configuration
# - Listener configuration
# - Target group health
# - Security group rules
# - ECS service health
# Usage: ./infra/aws/scripts/diagnose-alb.sh <test|prod>
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

# Initialize counters
ISSUES_FOUND=0
WARNINGS_FOUND=0

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║        ALB Diagnostics for '$ENVIRONMENT' Environment              ║"
echo "╔════════════════════════════════════════════════════════════════════╗"

# ---------------------------------------------------------------------------
# 1. Check ALB exists and is active
# ---------------------------------------------------------------------------
print_header "1. Application Load Balancer Status"

ALB_INFO=$(aws elbv2 describe-load-balancers \
    --names "$ALB_NAME" \
    --region "$AWS_REGION" \
    --query 'LoadBalancers[0]' \
    2>/dev/null || echo "{}")

if [[ "$ALB_INFO" == "{}" ]]; then
    print_error "ALB '$ALB_NAME' does not exist"
    echo "  → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    exit 1
fi

ALB_ARN=$(echo "$ALB_INFO" | jq -r '.LoadBalancerArn')
ALB_DNS=$(echo "$ALB_INFO" | jq -r '.DNSName')
ALB_STATE=$(echo "$ALB_INFO" | jq -r '.State.Code')
ALB_SCHEME=$(echo "$ALB_INFO" | jq -r '.Scheme')

echo "  Name:   $ALB_NAME"
echo "  DNS:    $ALB_DNS"
echo "  Scheme: $ALB_SCHEME"
echo "  State:  $ALB_STATE"

if [[ "$ALB_STATE" != "active" ]]; then
    print_error "ALB is not active (current state: $ALB_STATE)"
    echo "  → Wait 3-5 minutes for ALB to become active"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_success "ALB is active"
fi

if [[ "$ALB_SCHEME" != "internet-facing" ]]; then
    print_error "ALB is not internet-facing (current: $ALB_SCHEME)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_success "ALB is internet-facing"
fi

# ---------------------------------------------------------------------------
# 2. Check Security Group allows port 80
# ---------------------------------------------------------------------------
print_header "2. ALB Security Group Configuration"

ALB_SG_IDS=$(echo "$ALB_INFO" | jq -r '.SecurityGroups[]')
echo "  Security Groups: $ALB_SG_IDS"

for SG_ID in $ALB_SG_IDS; do
    echo ""
    echo "  Checking $SG_ID..."
    
    SG_RULES=$(aws ec2 describe-security-groups \
        --group-ids "$SG_ID" \
        --region "$AWS_REGION" \
        --query 'SecurityGroups[0].IpPermissions' 2>/dev/null)
    
    # Check for port 80 ingress
    PORT_80_OPEN=$(echo "$SG_RULES" | jq 'any(
        .IpProtocol == "tcp" and 
        .FromPort <= 80 and 
        .ToPort >= 80 and 
        (.IpRanges[]?.CidrIp == "0.0.0.0/0" or .Ipv6Ranges[]?.CidrIpv6 == "::/0")
    )')
    
    if [[ "$PORT_80_OPEN" == "true" ]]; then
        print_success "Port 80 is open to the internet"
    else
        print_error "Port 80 is NOT open to the internet"
        echo "  → Fix: aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    # Check for port 443 ingress
    PORT_443_OPEN=$(echo "$SG_RULES" | jq 'any(
        .IpProtocol == "tcp" and 
        .FromPort <= 443 and 
        .ToPort >= 443 and 
        (.IpRanges[]?.CidrIp == "0.0.0.0/0" or .Ipv6Ranges[]?.CidrIpv6 == "::/0")
    )')
    
    if [[ "$PORT_443_OPEN" == "true" ]]; then
        print_info "Port 443 is also open (HTTPS ready)"
    else
        print_warning "Port 443 is NOT open (HTTPS not configured)"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
done

# ---------------------------------------------------------------------------
# 3. Check Listeners
# ---------------------------------------------------------------------------
print_header "3. ALB Listeners"

LISTENERS=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --region "$AWS_REGION" \
    --query 'Listeners[].[Port,Protocol,DefaultActions[0].Type,ListenerArn]' \
    --output json)

LISTENER_COUNT=$(echo "$LISTENERS" | jq 'length')
echo "  Found $LISTENER_COUNT listener(s)"

if [[ "$LISTENER_COUNT" -eq 0 ]]; then
    print_error "No listeners configured"
    echo "  → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "$LISTENERS" | jq -r '.[] | "  - Port \(.[0]) (\(.[1])): \(.[2])"'
    
    # Check for HTTP listener on port 80
    HTTP_LISTENER=$(echo "$LISTENERS" | jq -r '.[] | select(.[0] == 80 and .[1] == "HTTP") | .[3]')
    if [[ -z "$HTTP_LISTENER" ]]; then
        print_error "No HTTP listener on port 80"
        echo "  → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        print_success "HTTP listener on port 80 is configured"
        LISTENER_ARN="$HTTP_LISTENER"
    fi
fi

# ---------------------------------------------------------------------------
# 4. Check Listener Rules
# ---------------------------------------------------------------------------
if [[ -n "${LISTENER_ARN:-}" ]]; then
    print_header "4. Listener Rules"
    
    RULES=$(aws elbv2 describe-rules \
        --listener-arn "$LISTENER_ARN" \
        --region "$AWS_REGION" \
        --query 'Rules[]' --output json)
    
    echo "  Rules configured:"
    echo "$RULES" | jq -r '.[] | "  - Priority \(.Priority // "default"): \(.Conditions[0].Field // "default") → \(.Actions[0].Type)"'
    
    # Check for /api/* rule
    API_RULE=$(echo "$RULES" | jq -r '.[] | select(.Conditions[]?.Values[]? == "/api/*") | .RuleArn')
    if [[ -z "$API_RULE" ]]; then
        print_warning "No rule for /api/* path (backend routing may not work)"
        echo "  → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    else
        print_success "Backend routing rule (/api/*) is configured"
    fi
fi

# ---------------------------------------------------------------------------
# 5. Check Target Groups
# ---------------------------------------------------------------------------
print_header "5. Target Group Health"

check_target_group() {
    local TG_NAME="$1"
    local SERVICE_NAME="$2"
    
    echo ""
    echo "  [$TG_NAME]"
    
    TG_ARN=$(aws elbv2 describe-target-groups \
        --names "$TG_NAME" \
        --region "$AWS_REGION" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$TG_ARN" || "$TG_ARN" == "None" ]]; then
        print_error "Target group not found"
        echo "    → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        return
    fi
    
    # Get target health
    TARGETS=$(aws elbv2 describe-target-health \
        --target-group-arn "$TG_ARN" \
        --region "$AWS_REGION" \
        --query 'TargetHealthDescriptions[]' --output json)
    
    TARGET_COUNT=$(echo "$TARGETS" | jq 'length')
    
    if [[ "$TARGET_COUNT" -eq 0 ]]; then
        print_error "No targets registered"
        echo "    → Check ECS service: $SERVICE_NAME"
        echo "    → Run: aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        return
    fi
    
    echo "    Registered targets: $TARGET_COUNT"
    
    HEALTHY_COUNT=$(echo "$TARGETS" | jq '[.[] | select(.TargetHealth.State == "healthy")] | length')
    UNHEALTHY_COUNT=$(echo "$TARGETS" | jq '[.[] | select(.TargetHealth.State == "unhealthy")] | length')
    INITIAL_COUNT=$(echo "$TARGETS" | jq '[.[] | select(.TargetHealth.State == "initial")] | length')
    DRAINING_COUNT=$(echo "$TARGETS" | jq '[.[] | select(.TargetHealth.State == "draining")] | length')
    
    echo "    Healthy:   $HEALTHY_COUNT"
    [[ "$UNHEALTHY_COUNT" -gt 0 ]] && echo "    Unhealthy: $UNHEALTHY_COUNT"
    [[ "$INITIAL_COUNT" -gt 0 ]] && echo "    Initial:   $INITIAL_COUNT"
    [[ "$DRAINING_COUNT" -gt 0 ]] && echo "    Draining:  $DRAINING_COUNT"
    
    if [[ "$HEALTHY_COUNT" -eq 0 ]]; then
        if [[ "$INITIAL_COUNT" -gt 0 ]]; then
            print_warning "Targets still performing initial health checks (wait 60-90 seconds)"
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        else
            print_error "No healthy targets available"
            echo "    Target details:"
            echo "$TARGETS" | jq -r '.[] | "      - \(.Target.Id):\(.Target.Port) → \(.TargetHealth.State) (\(.TargetHealth.Reason // "unknown"))"'
            echo "    → Check service logs: aws logs tail /ecs/${APP_NAME}-${ENVIRONMENT}-backend --follow --region $AWS_REGION"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    else
        print_success "At least one healthy target"
    fi
}

check_target_group "$BACKEND_TG_NAME" "$BACKEND_SERVICE_NAME"
check_target_group "$FRONTEND_TG_NAME" "$FRONTEND_SERVICE_NAME"

# ---------------------------------------------------------------------------
# 6. Check ECS Services
# ---------------------------------------------------------------------------
print_header "6. ECS Service Status"

check_ecs_service() {
    local SERVICE_NAME="$1"
    
    echo ""
    echo "  [$SERVICE_NAME]"
    
    SERVICE_INFO=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0]' 2>/dev/null || echo "{}")
    
    if [[ "$SERVICE_INFO" == "{}" ]]; then
        print_error "Service not found"
        echo "    → Run: ./infra/aws/scripts/07-create-ecs-services.sh $ENVIRONMENT"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        return
    fi
    
    SERVICE_STATUS=$(echo "$SERVICE_INFO" | jq -r '.status')
    DESIRED_COUNT=$(echo "$SERVICE_INFO" | jq -r '.desiredCount')
    RUNNING_COUNT=$(echo "$SERVICE_INFO" | jq -r '.runningCount')
    PENDING_COUNT=$(echo "$SERVICE_INFO" | jq -r '.pendingCount')
    
    echo "    Status:  $SERVICE_STATUS"
    echo "    Desired: $DESIRED_COUNT"
    echo "    Running: $RUNNING_COUNT"
    echo "    Pending: $PENDING_COUNT"
    
    if [[ "$SERVICE_STATUS" != "ACTIVE" ]]; then
        print_error "Service is not active"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    elif [[ "$RUNNING_COUNT" -eq 0 ]]; then
        print_error "No running tasks"
        echo "    Recent events:"
        echo "$SERVICE_INFO" | jq -r '.events[0:3][] | "      [\(.createdAt)] \(.message)"'
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    elif [[ "$RUNNING_COUNT" -lt "$DESIRED_COUNT" ]]; then
        print_warning "Running count ($RUNNING_COUNT) is less than desired ($DESIRED_COUNT)"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    else
        print_success "Service is healthy with $RUNNING_COUNT running task(s)"
    fi
}

check_ecs_service "$BACKEND_SERVICE_NAME"
check_ecs_service "$FRONTEND_SERVICE_NAME"

# ---------------------------------------------------------------------------
# 7. Test Connectivity
# ---------------------------------------------------------------------------
print_header "7. Connectivity Test"

echo "  Testing: http://$ALB_DNS"
echo ""

# Test frontend
echo "  Testing frontend (/)..."
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 "http://$ALB_DNS/" 2>/dev/null || echo "000")

if [[ "$FRONTEND_CODE" == "200" ]]; then
    print_success "Frontend is accessible (HTTP $FRONTEND_CODE)"
elif [[ "$FRONTEND_CODE" == "502" ]]; then
    print_error "Frontend returned 502 Bad Gateway (no healthy targets)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [[ "$FRONTEND_CODE" == "503" ]]; then
    print_error "Frontend returned 503 Service Unavailable (no targets registered)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [[ "$FRONTEND_CODE" == "504" ]]; then
    print_error "Frontend returned 504 Gateway Timeout (targets not responding)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [[ "$FRONTEND_CODE" == "000" ]]; then
    print_error "Connection failed (timeout or network error)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_warning "Frontend returned HTTP $FRONTEND_CODE"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

# Test backend health
echo "  Testing backend (/api/health)..."
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 "http://$ALB_DNS/api/health" 2>/dev/null || echo "000")

if [[ "$BACKEND_CODE" == "200" ]]; then
    print_success "Backend health endpoint is accessible (HTTP $BACKEND_CODE)"
elif [[ "$BACKEND_CODE" == "502" ]]; then
    print_error "Backend returned 502 Bad Gateway (no healthy targets)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [[ "$BACKEND_CODE" == "503" ]]; then
    print_error "Backend returned 503 Service Unavailable (no targets registered)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [[ "$BACKEND_CODE" == "504" ]]; then
    print_error "Backend returned 504 Gateway Timeout (targets not responding)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [[ "$BACKEND_CODE" == "000" ]]; then
    print_error "Connection failed (timeout or network error)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_warning "Backend returned HTTP $BACKEND_CODE"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_header "Summary"

if [[ "$ISSUES_FOUND" -eq 0 ]]; then
    if [[ "$WARNINGS_FOUND" -eq 0 ]]; then
        print_success "No issues found! Environment is healthy."
        echo ""
        echo "  Access your application at:"
        echo "    http://$ALB_DNS"
        exit 0
    else
        print_warning "$WARNINGS_FOUND warning(s) found (non-critical)"
        echo ""
        echo "  Your application should still be accessible at:"
        echo "    http://$ALB_DNS"
        exit 0
    fi
else
    print_error "$ISSUES_FOUND critical issue(s) found"
    [[ "$WARNINGS_FOUND" -gt 0 ]] && print_warning "$WARNINGS_FOUND warning(s) found"
    echo ""
    echo "  Please review the issues above and apply the suggested fixes."
    echo ""
    echo "  Common fixes:"
    echo "    1. Force redeploy: aws ecs update-service --cluster $ECS_CLUSTER_NAME --service $BACKEND_SERVICE_NAME --force-new-deployment --region $AWS_REGION"
    echo "    2. Check logs:    aws logs tail /ecs/${APP_NAME}-${ENVIRONMENT}-backend --follow --region $AWS_REGION"
    echo "    3. Restart infra: ./infra/aws/scripts/setup-all.sh $ENVIRONMENT"
    exit 1
fi
