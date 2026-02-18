#!/usr/bin/env bash
# =============================================================================
# Step 9: Set Up DNS Subdomain for Environment
# =============================================================================
# Configures Route 53 DNS records with subdomain for test environment.
# - Test environment: test.yourdomain.com
# - Production environment: yourdomain.com (no subdomain)
#
# Usage: ./infra/aws/scripts/09-setup-dns-subdomain.sh <test|prod> <domain-name>
# Example: ./infra/aws/scripts/09-setup-dns-subdomain.sh test shoreexplorer.com
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
    echo "Usage: $0 <test|prod> <domain-name>"
    echo ""
    echo "Examples:"
    echo "  $0 test shoreexplorer.com    # Creates test.shoreexplorer.com"
    echo "  $0 prod shoreexplorer.com    # Creates shoreexplorer.com (no subdomain)"
    echo ""
    exit 1
fi

DOMAIN_NAME="$2"

# Determine full domain based on environment using config helper
FULL_DOMAIN=$(get_full_domain "$DOMAIN_NAME")

if [[ "$ENVIRONMENT" == "test" ]]; then
    print_status "Setting up DNS subdomain for test: $FULL_DOMAIN"
else
    print_status "Setting up DNS for production: $FULL_DOMAIN"
fi

# Load ALB outputs
ALB_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
if [[ ! -f "$ALB_FILE" ]]; then
    print_error "ALB outputs file not found: $ALB_FILE"
    echo "  → Run: ./infra/aws/scripts/06-create-alb.sh $ENVIRONMENT"
    exit 1
fi
source "$ALB_FILE"

# ---------------------------------------------------------------------------
# Step 1: Find Route 53 Hosted Zone
# ---------------------------------------------------------------------------
print_header "Step 1: Find Route 53 Hosted Zone"

print_info "Looking for hosted zone for $DOMAIN_NAME..."

ZONE_ID=$(aws route53 list-hosted-zones-by-name \
    --query "HostedZones[?Name=='${DOMAIN_NAME}.'].Id" \
    --output text 2>/dev/null | cut -d'/' -f3)

if [[ -z "$ZONE_ID" || "$ZONE_ID" == "None" ]]; then
    print_error "No hosted zone found for $DOMAIN_NAME"
    echo ""
    echo "  To create a hosted zone:"
    echo ""
    echo "    aws route53 create-hosted-zone \\"
    echo "      --name $DOMAIN_NAME \\"
    echo "      --caller-reference $(date +%s)"
    echo ""
    echo "  Then update your domain's nameservers at your registrar to use Route 53."
    echo ""
    exit 1
fi

print_success "Found hosted zone: $ZONE_ID"

# ---------------------------------------------------------------------------
# Step 2: Get ALB Hosted Zone ID
# ---------------------------------------------------------------------------
print_header "Step 2: Get ALB Information"

ALB_ZONE_ID=$(aws elbv2 describe-load-balancers \
    --names "$ALB_NAME" \
    --region "$AWS_REGION" \
    --query "LoadBalancers[0].CanonicalHostedZoneId" \
    --output text)

if [[ -z "$ALB_ZONE_ID" || "$ALB_ZONE_ID" == "None" ]]; then
    print_error "Could not retrieve ALB hosted zone ID"
    exit 1
fi

print_success "ALB DNS: $ALB_DNS"
print_success "ALB Zone ID: $ALB_ZONE_ID"

# ---------------------------------------------------------------------------
# Step 3: Create or Update DNS Record
# ---------------------------------------------------------------------------
print_header "Step 3: Create DNS Record"

print_info "Creating ALIAS record for $FULL_DOMAIN → $ALB_DNS..."

# Create Route 53 change batch JSON
CHANGE_BATCH=$(cat <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$FULL_DOMAIN",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$ALB_ZONE_ID",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF
)

# Apply the change
CHANGE_ID=$(aws route53 change-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --change-batch "$CHANGE_BATCH" \
    --query 'ChangeInfo.Id' \
    --output text)

print_success "DNS record created/updated: $FULL_DOMAIN"
print_info "Change ID: $CHANGE_ID"

# ---------------------------------------------------------------------------
# Step 4: Wait for DNS propagation (optional)
# ---------------------------------------------------------------------------
print_header "Step 4: Wait for DNS Propagation"

print_info "Waiting for Route 53 to sync..."

aws route53 wait resource-record-sets-changed --id "$CHANGE_ID" 2>/dev/null || true

print_success "Route 53 change synced"
print_warning "Note: DNS propagation to clients may take 5-60 minutes"

# ---------------------------------------------------------------------------
# Step 5: Update outputs
# ---------------------------------------------------------------------------
OUTPUT_FILE="$SCRIPT_DIR/.dns-outputs-${ENVIRONMENT}.env"
cat > "$OUTPUT_FILE" <<EOF
# DNS outputs for $ENVIRONMENT - generated by 09-setup-dns-subdomain.sh
DOMAIN_NAME=$DOMAIN_NAME
FULL_DOMAIN=$FULL_DOMAIN
ZONE_ID=$ZONE_ID
ALB_DNS=$ALB_DNS
ALB_ZONE_ID=$ALB_ZONE_ID
EOF

print_success "Saved DNS configuration to $OUTPUT_FILE"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_header "DNS Setup Complete!"

echo ""
echo "  ✓ Domain: $FULL_DOMAIN"
echo "  ✓ Points to: $ALB_DNS"
echo "  ✓ Record Type: ALIAS (A record)"
echo ""
echo "  Your application will be accessible at:"
echo "    http://$FULL_DOMAIN"
echo ""

if [[ "$ENVIRONMENT" == "test" ]]; then
    echo "  Test environment uses subdomain: test.$DOMAIN_NAME"
else
    echo "  Production environment uses apex domain: $DOMAIN_NAME"
fi

echo ""
print_warning "Next steps:"
echo ""
echo "  1. Wait 5-60 minutes for DNS propagation"
echo ""
echo "  2. Test DNS resolution:"
echo "     dig $FULL_DOMAIN"
echo "     nslookup $FULL_DOMAIN"
echo ""
echo "  3. Configure domain in GitHub Secrets (for CI/CD deployments):"
if [[ "$ENVIRONMENT" == "test" ]]; then
    echo "     - Go to: GitHub repo → Settings → Secrets → Actions"
    echo "     - Add secret: TEST_DOMAIN = $DOMAIN_NAME"
else
    echo "     - Go to: GitHub repo → Settings → Secrets → Actions"
    echo "     - Add secret: PROD_DOMAIN = $DOMAIN_NAME"
fi
echo "     - This automatically sets REACT_APP_BACKEND_URL=http://$FULL_DOMAIN"
echo ""
echo "  4. If using HTTPS, run:"
echo "     ./08-setup-https.sh $ENVIRONMENT $FULL_DOMAIN"
echo ""
echo "  5. Rebuild and redeploy with new backend URL:"
echo "     - GitHub Actions: Push to main (test) or create release tag (prod)"
echo "     - Manual: ./build-and-deploy.sh $ENVIRONMENT"
echo ""
