#!/usr/bin/env bash
# =============================================================================
# Setup All: Run all infrastructure scripts in order
# =============================================================================
# Creates the complete AWS infrastructure for a given environment.
# Usage: ./infra/aws/scripts/setup-all.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENVIRONMENT="${1:-test}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  My App — Full AWS Infrastructure Setup              ║"
echo "║  Environment: $ENVIRONMENT                                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
"$SCRIPT_DIR/00-check-prerequisites.sh"

echo ""
read -rp "  Continue with setup for '$ENVIRONMENT'? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "  Aborted."
    exit 0
fi

# ---------------------------------------------------------------------------
# Run each step in order
# ---------------------------------------------------------------------------
STEPS=(
    "01-create-ecr-repos.sh"
    "02-create-networking.sh"
    "03-create-secrets.sh"
    "04-create-iam-roles.sh"
    "05-create-ecs-cluster.sh"
    "06-create-alb.sh"
)

for STEP in "${STEPS[@]}"; do
    "$SCRIPT_DIR/$STEP" "$ENVIRONMENT"
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Infrastructure Setup Complete!                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Build and push Docker images:"
echo "     ./infra/aws/scripts/build-and-push.sh $ENVIRONMENT"
echo ""
echo "  2. Create ECS services (starts the containers):"
echo "     ./infra/aws/scripts/07-create-ecs-services.sh $ENVIRONMENT"
echo ""
echo "  3. Or do both at once:"
echo "     ./infra/aws/scripts/build-and-deploy.sh $ENVIRONMENT"
echo ""

# Load and display the ALB URL
ALB_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
if [[ -f "$ALB_FILE" ]]; then
    source "$ALB_FILE"
    echo "  Your application will be available at:"
    echo "    http://$ALB_DNS"
    echo ""
fi
