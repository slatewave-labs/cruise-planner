#!/usr/bin/env bash
# =============================================================================
# Teardown: Delete all AWS resources for an environment
# =============================================================================
# Removes all infrastructure created by the setup scripts.
# Usage: ./infra/aws/scripts/teardown.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ⚠️  WARNING: This will DELETE all '$ENVIRONMENT' resources     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  This will remove:"
echo "    - ECS services and task definitions"
echo "    - Application Load Balancer"
echo "    - Target groups"
echo "    - ECS cluster"
echo "    - Security groups"
echo "    - Subnets and route tables"
echo "    - VPC"
echo "    - CloudWatch log groups"
echo "    - Secrets Manager secret"
echo "    - IAM roles and policies"
echo ""
echo "  This will NOT remove:"
echo "    - ECR repositories (shared across environments)"
echo "    - Your MongoDB Atlas data"
echo "    - Your Google API key"
echo ""

read -rp "  Type 'DELETE $ENVIRONMENT' to confirm: " CONFIRM
if [[ "$CONFIRM" != "DELETE $ENVIRONMENT" ]]; then
    echo "  Aborted. Nothing was deleted."
    exit 0
fi

echo ""
print_status "Tearing down '$ENVIRONMENT' environment"

# Load outputs if available
for F in networking alb ecs iam secrets; do
    OUTPUT_FILE="$SCRIPT_DIR/.${F}-outputs-${ENVIRONMENT}.env"
    if [[ -f "$OUTPUT_FILE" ]]; then
        source "$OUTPUT_FILE"
    fi
done

ACCOUNT_ID=$(get_account_id)

# ---------------------------------------------------------------------------
# 1. Delete ECS Services
# ---------------------------------------------------------------------------
print_info "Deleting ECS services..."

for SERVICE in "$BACKEND_SERVICE_NAME" "$FRONTEND_SERVICE_NAME"; do
    # Scale to 0 first
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$SERVICE" \
        --desired-count 0 \
        --region "$AWS_REGION" --output text &>/dev/null 2>&1 || true

    aws ecs delete-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$SERVICE" \
        --force \
        --region "$AWS_REGION" --output text &>/dev/null 2>&1 || true

    print_success "Deleted service: $SERVICE"
done

# Wait briefly for tasks to drain
sleep 5

# ---------------------------------------------------------------------------
# 2. Delete ALB, Listeners, Target Groups
# ---------------------------------------------------------------------------
print_info "Deleting load balancer..."

if [[ -n "${ALB_ARN:-}" ]]; then
    # Delete listeners first
    LISTENERS=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$ALB_ARN" \
        --query "Listeners[].ListenerArn" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")

    for LISTENER in $LISTENERS; do
        # Delete rules on the listener (except default)
        RULES=$(aws elbv2 describe-rules --listener-arn "$LISTENER" \
            --query "Rules[?!IsDefault].RuleArn" --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "")
        for RULE in $RULES; do
            aws elbv2 delete-rule --rule-arn "$RULE" --region "$AWS_REGION" 2>/dev/null || true
        done
        aws elbv2 delete-listener --listener-arn "$LISTENER" --region "$AWS_REGION" 2>/dev/null || true
    done

    aws elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN" --region "$AWS_REGION" 2>/dev/null || true
    print_success "Deleted ALB: $ALB_NAME"

    # Wait for ALB to fully delete before removing target groups
    echo "  Waiting for ALB to finish deleting..."
    aws elbv2 wait load-balancers-deleted --load-balancer-arns "$ALB_ARN" --region "$AWS_REGION" 2>/dev/null || sleep 30
fi

# Delete target groups
for TG_NAME_VAR in "$BACKEND_TG_NAME" "$FRONTEND_TG_NAME"; do
    TG_ARN=$(aws elbv2 describe-target-groups \
        --names "$TG_NAME_VAR" \
        --query "TargetGroups[0].TargetGroupArn" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "None")

    if [[ "$TG_ARN" != "None" && -n "$TG_ARN" ]]; then
        aws elbv2 delete-target-group --target-group-arn "$TG_ARN" --region "$AWS_REGION" 2>/dev/null || true
        print_success "Deleted target group: $TG_NAME_VAR"
    fi
done

# ---------------------------------------------------------------------------
# 3. Delete ECS Cluster
# ---------------------------------------------------------------------------
print_info "Deleting ECS cluster..."
aws ecs delete-cluster --cluster "$ECS_CLUSTER_NAME" --region "$AWS_REGION" --output text &>/dev/null 2>&1 || true
print_success "Deleted cluster: $ECS_CLUSTER_NAME"

# ---------------------------------------------------------------------------
# 4. Delete CloudWatch Log Groups
# ---------------------------------------------------------------------------
print_info "Deleting log groups..."
for LOG_GROUP in "$BACKEND_LOG_GROUP" "$FRONTEND_LOG_GROUP"; do
    aws logs delete-log-group --log-group-name "$LOG_GROUP" --region "$AWS_REGION" 2>/dev/null || true
    print_success "Deleted log group: $LOG_GROUP"
done

# ---------------------------------------------------------------------------
# 5. Delete Secrets Manager Secret
# ---------------------------------------------------------------------------
print_info "Deleting secrets..."
aws secretsmanager delete-secret \
    --secret-id "$SECRET_NAME" \
    --force-delete-without-recovery \
    --region "$AWS_REGION" 2>/dev/null || true
print_success "Deleted secret: $SECRET_NAME"

# ---------------------------------------------------------------------------
# 6. Delete IAM Roles and Policies
# ---------------------------------------------------------------------------
print_info "Deleting IAM roles..."

for ROLE in "$ECS_TASK_EXECUTION_ROLE" "$ECS_TASK_ROLE"; do
    # Detach managed policies
    POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE" \
        --query "AttachedPolicies[].PolicyArn" --output text 2>/dev/null || echo "")
    for POLICY in $POLICIES; do
        aws iam detach-role-policy --role-name "$ROLE" --policy-arn "$POLICY" 2>/dev/null || true
    done

    # Delete inline policies
    INLINE=$(aws iam list-role-policies --role-name "$ROLE" \
        --query "PolicyNames[]" --output text 2>/dev/null || echo "")
    for POLICY in $INLINE; do
        aws iam delete-role-policy --role-name "$ROLE" --policy-name "$POLICY" 2>/dev/null || true
    done

    aws iam delete-role --role-name "$ROLE" 2>/dev/null || true
    print_success "Deleted role: $ROLE"
done

# ---------------------------------------------------------------------------
# 7. Delete Networking (VPC, subnets, etc.)
# ---------------------------------------------------------------------------
if [[ -n "${VPC_ID:-}" ]]; then
    print_info "Deleting networking resources..."

    # Delete security groups (except default)
    for SG_NAME_VAR in "${APP_NAME}-alb-sg" "${APP_NAME}-ecs-sg"; do
        SG_ID=$(aws ec2 describe-security-groups \
            --filters "Name=group-name,Values=$SG_NAME_VAR" "Name=vpc-id,Values=$VPC_ID" \
            --query "SecurityGroups[0].GroupId" --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "None")

        if [[ "$SG_ID" != "None" && -n "$SG_ID" ]]; then
            aws ec2 delete-security-group --group-id "$SG_ID" --region "$AWS_REGION" 2>/dev/null || true
            print_success "Deleted security group: $SG_NAME_VAR"
        fi
    done

    # Disassociate and delete route tables
    RT_ID=$(aws ec2 describe-route-tables \
        --filters "Name=tag:Name,Values=${APP_NAME}-public-rt" "Name=vpc-id,Values=$VPC_ID" \
        --query "RouteTables[0].RouteTableId" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "None")

    if [[ "$RT_ID" != "None" && -n "$RT_ID" ]]; then
        ASSOCS=$(aws ec2 describe-route-tables --route-table-ids "$RT_ID" \
            --query "RouteTables[0].Associations[?!Main].RouteTableAssociationId" --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "")
        for ASSOC in $ASSOCS; do
            aws ec2 disassociate-route-table --association-id "$ASSOC" --region "$AWS_REGION" 2>/dev/null || true
        done
        aws ec2 delete-route-table --route-table-id "$RT_ID" --region "$AWS_REGION" 2>/dev/null || true
        print_success "Deleted route table: $RT_ID"
    fi

    # Delete subnets
    for SUBNET_TAG in "public-1" "public-2" "private-1" "private-2"; do
        SUBNET_ID=$(aws ec2 describe-subnets \
            --filters "Name=tag:Name,Values=${APP_NAME}-${SUBNET_TAG}" "Name=vpc-id,Values=$VPC_ID" \
            --query "Subnets[0].SubnetId" --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "None")

        if [[ "$SUBNET_ID" != "None" && -n "$SUBNET_ID" ]]; then
            aws ec2 delete-subnet --subnet-id "$SUBNET_ID" --region "$AWS_REGION" 2>/dev/null || true
            print_success "Deleted subnet: ${APP_NAME}-${SUBNET_TAG}"
        fi
    done

    # Detach and delete internet gateway
    IGW_ID=$(aws ec2 describe-internet-gateways \
        --filters "Name=tag:Name,Values=${APP_NAME}-igw" \
        --query "InternetGateways[0].InternetGatewayId" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "None")

    if [[ "$IGW_ID" != "None" && -n "$IGW_ID" ]]; then
        aws ec2 detach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$AWS_REGION" 2>/dev/null || true
        aws ec2 delete-internet-gateway --internet-gateway-id "$IGW_ID" --region "$AWS_REGION" 2>/dev/null || true
        print_success "Deleted internet gateway: $IGW_ID"
    fi

    # Delete VPC
    aws ec2 delete-vpc --vpc-id "$VPC_ID" --region "$AWS_REGION" 2>/dev/null || true
    print_success "Deleted VPC: $VPC_ID"
fi

# ---------------------------------------------------------------------------
# 8. Clean up output files
# ---------------------------------------------------------------------------
rm -f "$SCRIPT_DIR"/.*-outputs-${ENVIRONMENT}.env
print_success "Cleaned up output files"

# ---------------------------------------------------------------------------
# Deregister task definitions
# ---------------------------------------------------------------------------
print_info "Deregistering task definitions..."
for FAMILY in "$BACKEND_TASK_FAMILY" "$FRONTEND_TASK_FAMILY"; do
    TASK_DEFS=$(aws ecs list-task-definitions \
        --family-prefix "$FAMILY" \
        --query "taskDefinitionArns[]" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")

    for TD in $TASK_DEFS; do
        aws ecs deregister-task-definition --task-definition "$TD" --region "$AWS_REGION" --output text &>/dev/null 2>&1 || true
    done
    if [[ -n "$TASK_DEFS" ]]; then
        print_success "Deregistered task definitions: $FAMILY"
    fi
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Teardown Complete for '$ENVIRONMENT'                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Note: ECR repositories were NOT deleted (shared resource)."
echo "  To delete them manually:"
echo "    aws ecr delete-repository --repository-name $BACKEND_ECR_REPO --force --region $AWS_REGION"
echo "    aws ecr delete-repository --repository-name $FRONTEND_ECR_REPO --force --region $AWS_REGION"
echo ""
