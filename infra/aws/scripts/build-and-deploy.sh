#!/usr/bin/env bash
# =============================================================================
# Build and Deploy: All-in-one script
# =============================================================================
# Builds Docker images, pushes to ECR, and deploys to ECS.
# Usage: ./infra/aws/scripts/build-and-deploy.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENVIRONMENT="${1:-test}"

echo ""
echo "============================================================"
echo "  ShoreExplorer — Build & Deploy to '$ENVIRONMENT'"
echo "============================================================"
echo ""

# Step 1: Build and push images
"$SCRIPT_DIR/build-and-push.sh" "$ENVIRONMENT"

# Step 2: Deploy to ECS
"$SCRIPT_DIR/deploy.sh" "$ENVIRONMENT"
