#!/usr/bin/env bash
# =============================================================================
# Step 2: Create VPC and Networking
# =============================================================================
# Creates the virtual network (VPC), subnets, internet gateway, and route tables.
# Think of this as building the "roads and buildings" for your app in the cloud.
# Usage: ./infra/aws/scripts/02-create-networking.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

print_status "Creating Networking for '$ENVIRONMENT' environment"

# ---------------------------------------------------------------------------
# Determine Availability Zones
# ---------------------------------------------------------------------------
AZ1="${AWS_REGION}a"
AZ2="${AWS_REGION}b"

# ---------------------------------------------------------------------------
# Create VPC
# ---------------------------------------------------------------------------
EXISTING_VPC=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=${APP_NAME}-vpc" \
    --query "Vpcs[0].VpcId" --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

if [[ "$EXISTING_VPC" != "None" && "$EXISTING_VPC" != "" ]]; then
    VPC_ID="$EXISTING_VPC"
    print_skip "VPC: ${APP_NAME}-vpc ($VPC_ID)"
else
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block "$VPC_CIDR" \
        --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${APP_NAME}-vpc},{Key=Project,Value=$TAG_PROJECT},{Key=Environment,Value=$TAG_ENVIRONMENT}]" \
        --query "Vpc.VpcId" --output text --region "$AWS_REGION")

    # Enable DNS hostnames (required for ECS)
    aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames '{"Value":true}' --region "$AWS_REGION"
    aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support '{"Value":true}' --region "$AWS_REGION"
    print_success "Created VPC: $VPC_ID"
fi

# ---------------------------------------------------------------------------
# Create Internet Gateway
# ---------------------------------------------------------------------------
EXISTING_IGW=$(aws ec2 describe-internet-gateways \
    --filters "Name=tag:Name,Values=${APP_NAME}-igw" \
    --query "InternetGateways[0].InternetGatewayId" --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

if [[ "$EXISTING_IGW" != "None" && "$EXISTING_IGW" != "" ]]; then
    IGW_ID="$EXISTING_IGW"
    print_skip "Internet Gateway: ${APP_NAME}-igw ($IGW_ID)"
else
    IGW_ID=$(aws ec2 create-internet-gateway \
        --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${APP_NAME}-igw},{Key=Project,Value=$TAG_PROJECT},{Key=Environment,Value=$TAG_ENVIRONMENT}]" \
        --query "InternetGateway.InternetGatewayId" --output text --region "$AWS_REGION")

    aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$AWS_REGION"
    print_success "Created & attached Internet Gateway: $IGW_ID"
fi

# ---------------------------------------------------------------------------
# Create Public Subnets
# ---------------------------------------------------------------------------
create_subnet() {
    local SUBNET_NAME="$1"
    local CIDR="$2"
    local AZ="$3"
    local MAP_PUBLIC_IP="${4:-true}"

    local EXISTING
    EXISTING=$(aws ec2 describe-subnets \
        --filters "Name=tag:Name,Values=$SUBNET_NAME" "Name=vpc-id,Values=$VPC_ID" \
        --query "Subnets[0].SubnetId" --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

    if [[ "$EXISTING" != "None" && "$EXISTING" != "" ]]; then
        print_skip "Subnet: $SUBNET_NAME ($EXISTING)"
        echo "$EXISTING"
        return
    fi

    local SUBNET_ID
    SUBNET_ID=$(aws ec2 create-subnet \
        --vpc-id "$VPC_ID" \
        --cidr-block "$CIDR" \
        --availability-zone "$AZ" \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$SUBNET_NAME},{Key=Project,Value=$TAG_PROJECT},{Key=Environment,Value=$TAG_ENVIRONMENT}]" \
        --query "Subnet.SubnetId" --output text --region "$AWS_REGION")

    if [[ "$MAP_PUBLIC_IP" == "true" ]]; then
        aws ec2 modify-subnet-attribute --subnet-id "$SUBNET_ID" --map-public-ip-on-launch --region "$AWS_REGION"
    fi

    print_success "Created subnet: $SUBNET_NAME ($SUBNET_ID) in $AZ"
    echo "$SUBNET_ID"
}

PUBLIC_SUBNET_1_ID=$(create_subnet "${APP_NAME}-public-1" "$PUBLIC_SUBNET_1_CIDR" "$AZ1" "true")
PUBLIC_SUBNET_2_ID=$(create_subnet "${APP_NAME}-public-2" "$PUBLIC_SUBNET_2_CIDR" "$AZ2" "true")
PRIVATE_SUBNET_1_ID=$(create_subnet "${APP_NAME}-private-1" "$PRIVATE_SUBNET_1_CIDR" "$AZ1" "false")
PRIVATE_SUBNET_2_ID=$(create_subnet "${APP_NAME}-private-2" "$PRIVATE_SUBNET_2_CIDR" "$AZ2" "false")

# ---------------------------------------------------------------------------
# Create Route Table for Public Subnets
# ---------------------------------------------------------------------------
EXISTING_RT=$(aws ec2 describe-route-tables \
    --filters "Name=tag:Name,Values=${APP_NAME}-public-rt" "Name=vpc-id,Values=$VPC_ID" \
    --query "RouteTables[0].RouteTableId" --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

if [[ "$EXISTING_RT" != "None" && "$EXISTING_RT" != "" ]]; then
    PUBLIC_RT_ID="$EXISTING_RT"
    print_skip "Route Table: ${APP_NAME}-public-rt ($PUBLIC_RT_ID)"
else
    PUBLIC_RT_ID=$(aws ec2 create-route-table \
        --vpc-id "$VPC_ID" \
        --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${APP_NAME}-public-rt},{Key=Project,Value=$TAG_PROJECT},{Key=Environment,Value=$TAG_ENVIRONMENT}]" \
        --query "RouteTable.RouteTableId" --output text --region "$AWS_REGION")

    # Add route to internet
    aws ec2 create-route \
        --route-table-id "$PUBLIC_RT_ID" \
        --destination-cidr-block "0.0.0.0/0" \
        --gateway-id "$IGW_ID" \
        --region "$AWS_REGION" >/dev/null

    print_success "Created route table with internet access: $PUBLIC_RT_ID"
fi

# Associate public subnets with route table
for SUBNET_ID in "$PUBLIC_SUBNET_1_ID" "$PUBLIC_SUBNET_2_ID"; do
    # Check if already associated
    ASSOC=$(aws ec2 describe-route-tables \
        --filters "Name=association.subnet-id,Values=$SUBNET_ID" "Name=route-table-id,Values=$PUBLIC_RT_ID" \
        --query "RouteTables[0].RouteTableId" --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

    if [[ "$ASSOC" == "None" || "$ASSOC" == "" ]]; then
        aws ec2 associate-route-table \
            --subnet-id "$SUBNET_ID" \
            --route-table-id "$PUBLIC_RT_ID" \
            --region "$AWS_REGION" >/dev/null
    fi
done

print_success "Associated public subnets with route table"

# ---------------------------------------------------------------------------
# Create Security Groups
# ---------------------------------------------------------------------------
create_security_group() {
    local SG_NAME="$1"
    local DESCRIPTION="$2"

    local EXISTING
    EXISTING=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
        --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

    if [[ "$EXISTING" != "None" && "$EXISTING" != "" ]]; then
        print_skip "Security Group: $SG_NAME ($EXISTING)"
        echo "$EXISTING"
        return
    fi

    local SG_ID
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SG_NAME" \
        --description "$DESCRIPTION" \
        --vpc-id "$VPC_ID" \
        --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$SG_NAME},{Key=Project,Value=$TAG_PROJECT},{Key=Environment,Value=$TAG_ENVIRONMENT}]" \
        --query "GroupId" --output text --region "$AWS_REGION")

    print_success "Created security group: $SG_NAME ($SG_ID)"
    echo "$SG_ID"
}

ALB_SG_ID=$(create_security_group "${APP_NAME}-alb-sg" "ALB security group - allows HTTP/HTTPS from internet")
ECS_SG_ID=$(create_security_group "${APP_NAME}-ecs-sg" "ECS tasks security group - allows traffic from ALB")

# ALB Security Group Rules: Allow HTTP and HTTPS from anywhere
for PORT in 80 443; do
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp --port "$PORT" --cidr "0.0.0.0/0" \
        --region "$AWS_REGION" &>/dev/null 2>&1 || true
done
print_success "ALB security group: allows HTTP (80) and HTTPS (443) from internet"

# ECS Security Group Rules: Allow traffic from ALB only
aws ec2 authorize-security-group-ingress \
    --group-id "$ECS_SG_ID" \
    --protocol tcp --port 8001 --source-group "$ALB_SG_ID" \
    --region "$AWS_REGION" &>/dev/null 2>&1 || true

aws ec2 authorize-security-group-ingress \
    --group-id "$ECS_SG_ID" \
    --protocol tcp --port 80 --source-group "$ALB_SG_ID" \
    --region "$AWS_REGION" &>/dev/null 2>&1 || true

print_success "ECS security group: allows traffic from ALB on ports 80 and 8001"

# ECS tasks need outbound internet for MongoDB Atlas, Gemini API, ECR pulls
# Default SG allows all outbound, so no action needed.

# ---------------------------------------------------------------------------
# Save outputs for other scripts
# ---------------------------------------------------------------------------
OUTPUT_FILE="$SCRIPT_DIR/.networking-outputs-${ENVIRONMENT}.env"
cat > "$OUTPUT_FILE" <<EOF
# Networking outputs for $ENVIRONMENT - generated by 02-create-networking.sh
VPC_ID=$VPC_ID
IGW_ID=$IGW_ID
PUBLIC_SUBNET_1_ID=$PUBLIC_SUBNET_1_ID
PUBLIC_SUBNET_2_ID=$PUBLIC_SUBNET_2_ID
PRIVATE_SUBNET_1_ID=$PRIVATE_SUBNET_1_ID
PRIVATE_SUBNET_2_ID=$PRIVATE_SUBNET_2_ID
PUBLIC_RT_ID=$PUBLIC_RT_ID
ALB_SG_ID=$ALB_SG_ID
ECS_SG_ID=$ECS_SG_ID
EOF

print_success "Networking outputs saved to $OUTPUT_FILE"

echo ""
echo "  Summary:"
echo "    VPC:              $VPC_ID"
echo "    Public Subnets:   $PUBLIC_SUBNET_1_ID, $PUBLIC_SUBNET_2_ID"
echo "    Private Subnets:  $PRIVATE_SUBNET_1_ID, $PRIVATE_SUBNET_2_ID"
echo "    ALB Sec Group:    $ALB_SG_ID"
echo "    ECS Sec Group:    $ECS_SG_ID"
echo ""
