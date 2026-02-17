#!/usr/bin/env bash
# =============================================================================
# Step 8: Set Up HTTPS for ALB (Optional)
# =============================================================================
# Configures HTTPS listener on ALB using AWS Certificate Manager (ACM).
# Requires a domain name and DNS control for certificate validation.
# Usage: ./infra/aws/scripts/08-setup-https.sh <test|prod> <domain-name> [certificate-arn]
# Example: ./infra/aws/scripts/08-setup-https.sh test shoreexplorer.com
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

# ---------------------------------------------------------------------------
# Validate inputs
# ---------------------------------------------------------------------------
if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <test|prod> <domain-name> [certificate-arn]"
    echo ""
    echo "Examples:"
    echo "  $0 test example.com                                    # Request new certificate"
    echo "  $0 prod example.com arn:aws:acm:...:certificate/...   # Use existing certificate"
    echo ""
    exit 1
fi

DOMAIN_NAME="$2"
CERTIFICATE_ARN="${3:-}"

print_status "Setting up HTTPS for '$ENVIRONMENT' environment with domain: $DOMAIN_NAME"

# Load ALB outputs
ALB_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
if [[ ! -f "$ALB_FILE" ]]; then
    print_error "ALB outputs file not found: $ALB_FILE"
    echo "  → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
    exit 1
fi
source "$ALB_FILE"

# ---------------------------------------------------------------------------
# Step 1: Request or validate certificate
# ---------------------------------------------------------------------------
print_header "Step 1: SSL Certificate"

if [[ -n "$CERTIFICATE_ARN" ]]; then
    print_info "Using provided certificate: $CERTIFICATE_ARN"
    
    # Validate certificate exists and is issued
    CERT_STATUS=$(aws acm describe-certificate \
        --certificate-arn "$CERTIFICATE_ARN" \
        --region "$AWS_REGION" \
        --query 'Certificate.Status' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$CERT_STATUS" == "NOT_FOUND" ]]; then
        print_error "Certificate not found: $CERTIFICATE_ARN"
        exit 1
    elif [[ "$CERT_STATUS" != "ISSUED" ]]; then
        print_error "Certificate is not in ISSUED status. Current status: $CERT_STATUS"
        echo "  → Wait for certificate validation to complete"
        exit 1
    fi
    
    print_success "Certificate is valid and issued"
else
    print_info "Checking for existing certificate for $DOMAIN_NAME..."
    
    # Check for existing certificate
    EXISTING_CERT=$(aws acm list-certificates \
        --region "$AWS_REGION" \
        --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$EXISTING_CERT" && "$EXISTING_CERT" != "None" ]]; then
        CERTIFICATE_ARN="$EXISTING_CERT"
        print_success "Found existing certificate: $CERTIFICATE_ARN"
        
        # Check status
        CERT_STATUS=$(aws acm describe-certificate \
            --certificate-arn "$CERTIFICATE_ARN" \
            --region "$AWS_REGION" \
            --query 'Certificate.Status' \
            --output text)
        
        if [[ "$CERT_STATUS" != "ISSUED" ]]; then
            print_warning "Existing certificate status: $CERT_STATUS"
            if [[ "$CERT_STATUS" == "PENDING_VALIDATION" ]]; then
                echo ""
                echo "  Complete certificate validation:"
                echo "    1. Go to ACM console: https://console.aws.amazon.com/acm/home?region=$AWS_REGION"
                echo "    2. Click on the certificate"
                echo "    3. Follow DNS validation instructions"
                echo "    4. Re-run this script after validation completes"
                exit 1
            fi
        fi
    else
        print_info "Requesting new certificate for $DOMAIN_NAME..."
        
        CERTIFICATE_ARN=$(aws acm request-certificate \
            --domain-name "$DOMAIN_NAME" \
            --validation-method DNS \
            --subject-alternative-names "www.$DOMAIN_NAME" \
            --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value="$TAG_ENVIRONMENT" \
            --region "$AWS_REGION" \
            --query 'CertificateArn' \
            --output text)
        
        print_success "Certificate requested: $CERTIFICATE_ARN"
        
        echo ""
        print_warning "IMPORTANT: You must validate domain ownership"
        echo ""
        echo "  Validation steps:"
        echo "    1. Go to ACM console:"
        echo "       https://console.aws.amazon.com/acm/home?region=$AWS_REGION"
        echo "    2. Click on certificate: $CERTIFICATE_ARN"
        echo "    3. Add DNS validation records using ONE of these methods:"
        echo ""
        echo "       Route 53:     Click 'Create records in Route 53' (automatic)"
        echo ""
        echo "       123-reg.com:  Log in → Control Panel → Manage DNS → Advanced DNS"
        echo "                     Add CNAME records (Hostname = part BEFORE .${DOMAIN_NAME})"
        echo "                     123-reg appends your domain automatically!"
        echo "                     Propagation: 15-45 min (up to 24 hours)"
        echo ""
        echo "       Other DNS:    Add CNAME records at your DNS provider"
        echo ""
        echo "    4. Wait for DNS to propagate (verify with: dig <cname-name>.${DOMAIN_NAME} CNAME)"
        echo "    5. Re-run this script after validation:"
        echo "       $0 $ENVIRONMENT $DOMAIN_NAME $CERTIFICATE_ARN"
        echo ""
        
        # Show validation options
        echo "  Validation details:"
        aws acm describe-certificate \
            --certificate-arn "$CERTIFICATE_ARN" \
            --region "$AWS_REGION" \
            --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
            --output table
        
        exit 0
    fi
fi

# ---------------------------------------------------------------------------
# Step 2: Create HTTPS Listener (port 443)
# ---------------------------------------------------------------------------
print_header "Step 2: HTTPS Listener"

# Check if HTTPS listener already exists
EXISTING_HTTPS_LISTENER=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --query "Listeners[?Port==\`443\`].ListenerArn" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

if [[ -n "$EXISTING_HTTPS_LISTENER" && "$EXISTING_HTTPS_LISTENER" != "None" ]]; then
    HTTPS_LISTENER_ARN="$EXISTING_HTTPS_LISTENER"
    print_skip "HTTPS Listener already exists"
    
    # Update certificate if different
    CURRENT_CERT=$(aws elbv2 describe-listeners \
        --listener-arns "$HTTPS_LISTENER_ARN" \
        --region "$AWS_REGION" \
        --query 'Listeners[0].Certificates[0].CertificateArn' \
        --output text)
    
    if [[ "$CURRENT_CERT" != "$CERTIFICATE_ARN" ]]; then
        print_info "Updating certificate on HTTPS listener..."
        aws elbv2 modify-listener \
            --listener-arn "$HTTPS_LISTENER_ARN" \
            --certificates CertificateArn="$CERTIFICATE_ARN" \
            --region "$AWS_REGION" >/dev/null
        print_success "Updated certificate"
    fi
else
    print_info "Creating HTTPS listener on port 443..."
    
    # Create HTTPS listener with same routing as HTTP
    HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTPS \
        --port 443 \
        --certificates CertificateArn="$CERTIFICATE_ARN" \
        --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
        --default-actions Type=forward,TargetGroupArn="$FRONTEND_TG_ARN" \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value="$TAG_ENVIRONMENT" \
        --query "Listeners[0].ListenerArn" \
        --output text \
        --region "$AWS_REGION")
    
    print_success "Created HTTPS listener"
    
    # Create listener rule for /api/* → backend
    print_info "Creating HTTPS listener rule for /api/*..."
    aws elbv2 create-rule \
        --listener-arn "$HTTPS_LISTENER_ARN" \
        --priority 10 \
        --conditions Field=path-pattern,Values='/api/*' \
        --actions Type=forward,TargetGroupArn="$BACKEND_TG_ARN" \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value="$TAG_ENVIRONMENT" \
        --region "$AWS_REGION" --output text >/dev/null
    
    print_success "Created HTTPS routing rule"
fi

# ---------------------------------------------------------------------------
# Step 3: Create HTTP to HTTPS redirect (optional but recommended)
# ---------------------------------------------------------------------------
print_header "Step 3: HTTP to HTTPS Redirect"

# Check current HTTP listener default action
CURRENT_HTTP_ACTION=$(aws elbv2 describe-listeners \
    --listener-arns "$LISTENER_ARN" \
    --region "$AWS_REGION" \
    --query 'Listeners[0].DefaultActions[0].Type' \
    --output text)

if [[ "$CURRENT_HTTP_ACTION" == "redirect" ]]; then
    print_skip "HTTP to HTTPS redirect already configured"
else
    print_info "Configuring HTTP to HTTPS redirect..."
    
    # Modify HTTP listener to redirect to HTTPS
    aws elbv2 modify-listener \
        --listener-arn "$LISTENER_ARN" \
        --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
        --region "$AWS_REGION" >/dev/null
    
    print_success "HTTP listener now redirects to HTTPS"
    
    # Note: The /api/* rule will still work and forward to backend
    # Only the default action (/) is redirected
fi

# ---------------------------------------------------------------------------
# Step 4: Update outputs
# ---------------------------------------------------------------------------
OUTPUT_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
cat > "$OUTPUT_FILE" <<EOF
# ALB outputs for $ENVIRONMENT - generated by 06-create-alb.sh and 08-setup-https.sh
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
BACKEND_TG_ARN=$BACKEND_TG_ARN
FRONTEND_TG_ARN=$FRONTEND_TG_ARN
LISTENER_ARN=$LISTENER_ARN
HTTPS_LISTENER_ARN=$HTTPS_LISTENER_ARN
CERTIFICATE_ARN=$CERTIFICATE_ARN
DOMAIN_NAME=$DOMAIN_NAME
EOF

print_success "Updated ALB outputs"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_header "HTTPS Setup Complete!"

echo ""
echo "  ✓ SSL Certificate: $CERTIFICATE_ARN"
echo "  ✓ HTTPS Listener: Port 443"
echo "  ✓ HTTP Redirect: Enabled (HTTP → HTTPS)"
echo ""
echo "  Your application URLs:"
echo "    HTTPS:         https://$ALB_DNS"
echo "    HTTP:          http://$ALB_DNS (redirects to HTTPS)"
echo ""

if [[ "$DOMAIN_NAME" != "$ALB_DNS" ]]; then
    print_warning "Next step: Point your domain to the ALB"
    echo ""
    echo "  Choose your DNS provider:"
    echo ""
    echo "  ─── Route 53 (ALIAS record for root domain) ───"
    echo "    aws route53 change-resource-record-sets \\"
    echo "      --hosted-zone-id <your-zone-id> \\"
    echo "      --change-batch '{\"Changes\":[{\"Action\":\"CREATE\",\"ResourceRecordSet\":{\"Name\":\"$DOMAIN_NAME\",\"Type\":\"A\",\"AliasTarget\":{\"HostedZoneId\":\"<alb-zone-id>\",\"DNSName\":\"$ALB_DNS\",\"EvaluateTargetHealth\":false}}}]}'"
    echo ""
    echo "  ─── 123-reg.com (CNAME for www + URL forwarding for root) ───"
    echo "    1. Log in → Control Panel → Manage DNS → Advanced DNS"
    echo "    2. Add a CNAME record:"
    echo "         Hostname:    www"
    echo "         Destination: $ALB_DNS"
    echo "         TTL:         300"
    echo "    3. Set up URL forwarding for root domain:"
    echo "         Manage DNS → Web Forwarding"
    echo "         From: $DOMAIN_NAME → To: https://www.$DOMAIN_NAME (301 redirect)"
    echo "    Note: 123-reg does not support ALIAS records for root domains."
    echo "    The www subdomain + URL forwarding approach is recommended."
    echo ""
    echo "  ─── Other DNS provider (CNAME) ───"
    echo "    Create a CNAME record:"
    echo "       Name:  www (or @ if your provider supports ALIAS flattening)"
    echo "       Type:  CNAME"
    echo "       Value: $ALB_DNS"
    echo "       TTL:   300"
    echo ""
    echo "  After DNS propagates (5-60 minutes), access your app at:"
    echo "    https://www.$DOMAIN_NAME  (or https://$DOMAIN_NAME with Route 53)"
    echo ""
fi

print_info "Don't forget to update frontend environment variable:"
echo "  REACT_APP_BACKEND_URL=https://$DOMAIN_NAME (or https://$ALB_DNS)"
echo ""
echo "  Then rebuild and redeploy:"
echo "    ./infra/aws/scripts/build-and-deploy.sh $ENVIRONMENT"
echo ""
