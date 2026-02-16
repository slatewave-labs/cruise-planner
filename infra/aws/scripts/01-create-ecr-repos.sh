#!/usr/bin/env bash
# =============================================================================
# Step 1: Create ECR Repositories
# =============================================================================
# Creates container image repositories in AWS (like a private Docker Hub).
# These are shared across test and prod environments.
# Usage: ./infra/aws/scripts/01-create-ecr-repos.sh
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

print_status "Creating ECR Repositories"

ACCOUNT_ID=$(get_account_id)

# ---------------------------------------------------------------------------
# Backend repository
# ---------------------------------------------------------------------------
if resource_exists "ecr-repo" "$BACKEND_ECR_REPO"; then
    print_skip "ECR repo: $BACKEND_ECR_REPO"
else
    aws ecr create-repository \
        --repository-name "$BACKEND_ECR_REPO" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --image-tag-mutability MUTABLE \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value=shared \
        --output text --query 'repository.repositoryUri'
    print_success "Created ECR repo: $BACKEND_ECR_REPO"
fi

# ---------------------------------------------------------------------------
# Frontend repository
# ---------------------------------------------------------------------------
if resource_exists "ecr-repo" "$FRONTEND_ECR_REPO"; then
    print_skip "ECR repo: $FRONTEND_ECR_REPO"
else
    aws ecr create-repository \
        --repository-name "$FRONTEND_ECR_REPO" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --image-tag-mutability MUTABLE \
        --tags Key=Project,Value="$TAG_PROJECT" Key=Environment,Value=shared \
        --output text --query 'repository.repositoryUri'
    print_success "Created ECR repo: $FRONTEND_ECR_REPO"
fi

# ---------------------------------------------------------------------------
# Set lifecycle policy (keep only last 10 images to save storage costs)
# ---------------------------------------------------------------------------
LIFECYCLE_POLICY='{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep only last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}'

for REPO in "$BACKEND_ECR_REPO" "$FRONTEND_ECR_REPO"; do
    aws ecr put-lifecycle-policy \
        --repository-name "$REPO" \
        --lifecycle-policy-text "$LIFECYCLE_POLICY" \
        --region "$AWS_REGION" \
        --output text >/dev/null
done

print_success "Lifecycle policies set (keep last 10 images)"

echo ""
echo "  ECR URIs:"
echo "    Backend:  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPO}"
echo "    Frontend: ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPO}"
echo ""
