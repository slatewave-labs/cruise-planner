#!/usr/bin/env bash
# =============================================================================
# ShoreExplorer AWS Infrastructure - Shared Configuration
# =============================================================================
# This file is sourced by all other scripts. Do NOT run it directly.
# Usage: source ./infra/aws/scripts/config.sh <environment>
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Environment (test or prod)
# ---------------------------------------------------------------------------
ENVIRONMENT="${1:-test}"
if [[ "$ENVIRONMENT" != "test" && "$ENVIRONMENT" != "prod" ]]; then
    echo "ERROR: Environment must be 'test' or 'prod'. Got: $ENVIRONMENT"
    exit 1
fi

# ---------------------------------------------------------------------------
# AWS Settings — Change these if needed
# ---------------------------------------------------------------------------
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="shoreexplorer"
APP_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_1_CIDR="10.0.1.0/24"
PUBLIC_SUBNET_2_CIDR="10.0.2.0/24"
PRIVATE_SUBNET_1_CIDR="10.0.3.0/24"
PRIVATE_SUBNET_2_CIDR="10.0.4.0/24"

# Use different CIDRs for prod to avoid conflicts if in same account
if [[ "$ENVIRONMENT" == "prod" ]]; then
    VPC_CIDR="10.1.0.0/16"
    PUBLIC_SUBNET_1_CIDR="10.1.1.0/24"
    PUBLIC_SUBNET_2_CIDR="10.1.2.0/24"
    PRIVATE_SUBNET_1_CIDR="10.1.3.0/24"
    PRIVATE_SUBNET_2_CIDR="10.1.4.0/24"
fi

# ---------------------------------------------------------------------------
# DNS Configuration
# ---------------------------------------------------------------------------
# Test environment uses subdomain "test", prod uses apex domain (no subdomain)
if [[ "$ENVIRONMENT" == "test" ]]; then
    SUBDOMAIN="test"
else
    SUBDOMAIN=""
fi

# ---------------------------------------------------------------------------
# ECR Repositories (shared across environments)
# ---------------------------------------------------------------------------
BACKEND_ECR_REPO="${PROJECT_NAME}-backend"
FRONTEND_ECR_REPO="${PROJECT_NAME}-frontend"

# ---------------------------------------------------------------------------
# ECS Settings
# ---------------------------------------------------------------------------
ECS_CLUSTER_NAME="${APP_NAME}-cluster"
BACKEND_SERVICE_NAME="${APP_NAME}-backend"
FRONTEND_SERVICE_NAME="${APP_NAME}-frontend"
BACKEND_TASK_FAMILY="${APP_NAME}-backend-task"
FRONTEND_TASK_FAMILY="${APP_NAME}-frontend-task"

# Container resources (Fargate)
if [[ "$ENVIRONMENT" == "prod" ]]; then
    BACKEND_CPU="512"      # 0.5 vCPU
    BACKEND_MEMORY="1024"  # 1 GB
    FRONTEND_CPU="256"     # 0.25 vCPU
    FRONTEND_MEMORY="512"  # 0.5 GB
    DESIRED_COUNT="2"      # 2 tasks for high availability
else
    BACKEND_CPU="256"      # 0.25 vCPU
    BACKEND_MEMORY="512"   # 0.5 GB
    FRONTEND_CPU="256"     # 0.25 vCPU
    FRONTEND_MEMORY="512"  # 0.5 GB
    DESIRED_COUNT="1"      # 1 task for test
fi

# ---------------------------------------------------------------------------
# ALB Settings
# ---------------------------------------------------------------------------
ALB_NAME="${APP_NAME}-alb"
BACKEND_TG_NAME="${APP_NAME}-backend-tg"
FRONTEND_TG_NAME="${APP_NAME}-frontend-tg"

# ---------------------------------------------------------------------------
# Secrets Manager
# ---------------------------------------------------------------------------
SECRET_NAME="${APP_NAME}-secrets"

# ---------------------------------------------------------------------------
# IAM Roles
# ---------------------------------------------------------------------------
ECS_TASK_EXECUTION_ROLE="${APP_NAME}-ecs-task-execution-role"
ECS_TASK_ROLE="${APP_NAME}-ecs-task-role"

# ---------------------------------------------------------------------------
# CloudWatch
# ---------------------------------------------------------------------------
BACKEND_LOG_GROUP="/ecs/${APP_NAME}-backend"
FRONTEND_LOG_GROUP="/ecs/${APP_NAME}-frontend"

# ---------------------------------------------------------------------------
# Resource Tags
# ---------------------------------------------------------------------------
TAG_PROJECT="$PROJECT_NAME"
TAG_ENVIRONMENT="$ENVIRONMENT"

# ---------------------------------------------------------------------------
# Helper: Get AWS Account ID
# ---------------------------------------------------------------------------
get_account_id() {
    aws sts get-caller-identity --query Account --output text
}

# ---------------------------------------------------------------------------
# Helper: Get full domain name based on environment
# ---------------------------------------------------------------------------
# Usage: get_full_domain <base-domain>
# Example: get_full_domain "shoreexplorer.com" → "test.shoreexplorer.com" (test) or "shoreexplorer.com" (prod)
get_full_domain() {
    local base_domain="$1"
    if [[ "$ENVIRONMENT" == "test" ]]; then
        echo "test.${base_domain}"
    else
        echo "$base_domain"
    fi
}

# ---------------------------------------------------------------------------
# Helper: Print a coloured status message
# ---------------------------------------------------------------------------
print_status() {
    echo "" >&2
    echo "============================================================" >&2
    echo "  $1" >&2
    echo "============================================================" >&2
    echo "" >&2
}

print_success() {
    echo "  ✅ $1" >&2
}

print_skip() {
    echo "  ⏭️  $1 (already exists)" >&2
}

print_error() {
    echo "  ❌ $1" >&2
}

print_info() {
    echo "  ℹ️  $1" >&2
}

# ---------------------------------------------------------------------------
# Helper: Check if a resource exists (returns 0 if exists, 1 if not)
# ---------------------------------------------------------------------------
resource_exists() {
    local resource_type="$1"
    local resource_name="$2"

    case "$resource_type" in
        "ecr-repo")
            aws ecr describe-repositories --repository-names "$resource_name" --region "$AWS_REGION" &>/dev/null
            ;;
        "ecs-cluster")
            local status
            status=$(aws ecs describe-clusters --clusters "$resource_name" --region "$AWS_REGION" \
                --query "clusters[0].status" --output text 2>/dev/null)
            [[ "$status" == "ACTIVE" ]]
            ;;
        "secret")
            aws secretsmanager describe-secret --secret-id "$resource_name" --region "$AWS_REGION" &>/dev/null
            ;;
        "log-group")
            aws logs describe-log-groups --log-group-name-prefix "$resource_name" --region "$AWS_REGION" \
                --query "logGroups[?logGroupName=='$resource_name']" --output text | grep -q "$resource_name"
            ;;
        "iam-role")
            aws iam get-role --role-name "$resource_name" &>/dev/null
            ;;
        *)
            return 1
            ;;
    esac
}
