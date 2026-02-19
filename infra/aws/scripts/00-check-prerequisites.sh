#!/usr/bin/env bash
# =============================================================================
# Step 0: Check Prerequisites
# =============================================================================
# Verifies that all required tools are installed and AWS credentials are valid.
# Usage: ./infra/aws/scripts/00-check-prerequisites.sh
# =============================================================================

set -euo pipefail

echo ""
echo "============================================================"
echo "  My App — Checking Prerequisites"
echo "============================================================"
echo ""

ERRORS=0

# ---------------------------------------------------------------------------
# Check: AWS CLI
# ---------------------------------------------------------------------------
if command -v aws &>/dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | head -1)
    echo "  ✅ AWS CLI installed: $AWS_VERSION"
else
    echo "  ❌ AWS CLI not installed."
    echo "     Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    ERRORS=$((ERRORS + 1))
fi

# ---------------------------------------------------------------------------
# Check: Docker
# ---------------------------------------------------------------------------
if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version 2>&1)
    echo "  ✅ Docker installed: $DOCKER_VERSION"

    if docker info &>/dev/null; then
        echo "  ✅ Docker daemon is running"
    else
        echo "  ❌ Docker is installed but the daemon is not running. Start Docker Desktop."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ❌ Docker not installed."
    echo "     Install: https://docs.docker.com/get-docker/"
    ERRORS=$((ERRORS + 1))
fi

# ---------------------------------------------------------------------------
# Check: jq (JSON processor)
# ---------------------------------------------------------------------------
if command -v jq &>/dev/null; then
    echo "  ✅ jq installed: $(jq --version)"
else
    echo "  ❌ jq not installed."
    echo "     Install: brew install jq (Mac) or sudo apt-get install jq (Linux)"
    ERRORS=$((ERRORS + 1))
fi

# ---------------------------------------------------------------------------
# Check: AWS Credentials
# ---------------------------------------------------------------------------
if aws sts get-caller-identity &>/dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo "  ✅ AWS credentials valid"
    echo "     Account ID: $ACCOUNT_ID"
    echo "     User:       $USER_ARN"
else
    echo "  ❌ AWS credentials not configured or invalid."
    echo "     Run: aws configure"
    ERRORS=$((ERRORS + 1))
fi

# ---------------------------------------------------------------------------
# Check: AWS Region
# ---------------------------------------------------------------------------
REGION=$(aws configure get region 2>/dev/null || echo "")
if [[ -n "$REGION" ]]; then
    echo "  ✅ AWS region: $REGION"
else
    echo "  ⚠️  No default AWS region set. Will use us-east-1."
    echo "     To change: aws configure set region <your-region>"
fi

# ---------------------------------------------------------------------------
# Check: Git
# ---------------------------------------------------------------------------
if command -v git &>/dev/null; then
    echo "  ✅ Git installed: $(git --version)"
else
    echo "  ❌ Git not installed."
    ERRORS=$((ERRORS + 1))
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
if [[ $ERRORS -eq 0 ]]; then
    echo "============================================================"
    echo "  ✅ All prerequisites met! You're ready to go."
    echo "============================================================"
    echo ""
    echo "  Next step: ./infra/aws/scripts/setup-all.sh test"
    echo ""
else
    echo "============================================================"
    echo "  ❌ $ERRORS prerequisite(s) missing. Fix them before continuing."
    echo "============================================================"
    exit 1
fi
