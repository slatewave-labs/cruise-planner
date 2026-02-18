#!/usr/bin/env bash
# =============================================================================
# Build and Push Docker Images to ECR
# =============================================================================
# Builds the backend and frontend Docker images and pushes them to ECR.
# Usage: ./infra/aws/scripts/build-and-push.sh <test|prod> [--backend-only|--frontend-only]
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

# Parse optional flags
BUILD_BACKEND=true
BUILD_FRONTEND=true
if [[ "${2:-}" == "--backend-only" ]]; then BUILD_FRONTEND=false; fi
if [[ "${2:-}" == "--frontend-only" ]]; then BUILD_BACKEND=false; fi

ACCOUNT_ID=$(get_account_id)
ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# ---------------------------------------------------------------------------
# Determine backend URL for frontend build
# ---------------------------------------------------------------------------
# Priority:
# 1. REACT_APP_BACKEND_URL environment variable (explicit override)
# 2. TEST_DOMAIN/PROD_DOMAIN environment variable (matches GitHub workflow)
# 3. ALB DNS from .alb-outputs file
# 4. Fallback to localhost

if [[ -n "${REACT_APP_BACKEND_URL:-}" ]]; then
    BACKEND_URL="$REACT_APP_BACKEND_URL"
    print_info "Using explicit REACT_APP_BACKEND_URL: $BACKEND_URL"
elif [[ "$ENVIRONMENT" == "test" && -n "${TEST_DOMAIN:-}" ]]; then
    BACKEND_URL="https://test.${TEST_DOMAIN}"
    print_info "Using TEST_DOMAIN: $BACKEND_URL"
elif [[ "$ENVIRONMENT" == "prod" && -n "${PROD_DOMAIN:-}" ]]; then
    BACKEND_URL="https://${PROD_DOMAIN}"
    print_info "Using PROD_DOMAIN: $BACKEND_URL"
else
    # Fallback to ALB DNS
    ALB_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
    if [[ -f "$ALB_FILE" ]]; then
        source "$ALB_FILE"
        BACKEND_URL="https://${ALB_DNS}"
        print_info "Using ALB DNS: $BACKEND_URL"
    else
        BACKEND_URL="http://localhost:8001"
        print_warning "ALB not created yet. Using fallback: $BACKEND_URL"
    fi
fi

print_status "Building and Pushing Images for '$ENVIRONMENT'"


# ---------------------------------------------------------------------------
# Authenticate Docker to ECR
# ---------------------------------------------------------------------------
print_info "Authenticating Docker with ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "${ECR_BASE}" 2>/dev/null

print_success "Docker authenticated with ECR"

# Get current git SHA for image tagging
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
TIMESTAMP=$(date +%Y%m%d%H%M%S)
IMAGE_TAG="${ENVIRONMENT}-${GIT_SHA}-${TIMESTAMP}"

# ---------------------------------------------------------------------------
# Build and push backend
# ---------------------------------------------------------------------------
if [[ "$BUILD_BACKEND" == "true" ]]; then
    print_info "Building backend image..."

    BACKEND_IMAGE="${ECR_BASE}/${BACKEND_ECR_REPO}"

    docker build \
        --platform linux/amd64 \
        -t "${BACKEND_IMAGE}:${IMAGE_TAG}" \
        -t "${BACKEND_IMAGE}:${ENVIRONMENT}-latest" \
        -t "${BACKEND_IMAGE}:latest" \
        -f "$PROJECT_ROOT/backend/Dockerfile" \
        "$PROJECT_ROOT/backend"

    print_success "Built backend image"

    print_info "Pushing backend image to ECR..."
    docker push "${BACKEND_IMAGE}:${IMAGE_TAG}"
    docker push "${BACKEND_IMAGE}:${ENVIRONMENT}-latest"
    docker push "${BACKEND_IMAGE}:latest"

    print_success "Pushed backend: ${BACKEND_IMAGE}:${IMAGE_TAG}"
fi

# ---------------------------------------------------------------------------
# Build and push frontend
# ---------------------------------------------------------------------------
if [[ "$BUILD_FRONTEND" == "true" ]]; then
    print_info "Building frontend image..."

    FRONTEND_IMAGE="${ECR_BASE}/${FRONTEND_ECR_REPO}"

    # The backend URL is baked into the frontend at build time
    docker build \
        --platform linux/amd64 \
        --build-arg REACT_APP_BACKEND_URL="$BACKEND_URL" \
        -t "${FRONTEND_IMAGE}:${IMAGE_TAG}" \
        -t "${FRONTEND_IMAGE}:${ENVIRONMENT}-latest" \
        -t "${FRONTEND_IMAGE}:latest" \
        -f "$PROJECT_ROOT/frontend/Dockerfile" \
        "$PROJECT_ROOT/frontend"

    print_success "Built frontend image (BACKEND_URL=$BACKEND_URL)"

    print_info "Pushing frontend image to ECR..."
    docker push "${FRONTEND_IMAGE}:${IMAGE_TAG}"
    docker push "${FRONTEND_IMAGE}:${ENVIRONMENT}-latest"
    docker push "${FRONTEND_IMAGE}:latest"

    print_success "Pushed frontend: ${FRONTEND_IMAGE}:${IMAGE_TAG}"
fi

echo ""
echo "  Image tag: $IMAGE_TAG"
echo ""
echo "  Next: Deploy the new images to ECS:"
echo "    ./infra/aws/scripts/deploy.sh $ENVIRONMENT"
echo ""
