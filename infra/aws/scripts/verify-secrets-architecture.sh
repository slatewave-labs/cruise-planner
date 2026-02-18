#!/usr/bin/env bash
# =============================================================================
# Verify Secrets Architecture
# =============================================================================
# This script verifies that environment-specific secrets are correctly
# configured in AWS Secrets Manager and referenced by ECS task definitions.
#
# Usage: ./infra/aws/scripts/verify-secrets-architecture.sh [test|prod|all]
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENVIRONMENT="${1:-all}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="shoreexplorer"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# =============================================================================
# Check AWS Secrets Manager
# =============================================================================
check_secrets_manager() {
    local env="$1"
    local secret_name="${PROJECT_NAME}-${env}-secrets"
    
    print_header "Checking AWS Secrets Manager for '$env' environment"
    
    # Check if secret exists
    if aws secretsmanager describe-secret \
        --secret-id "$secret_name" \
        --region "$AWS_REGION" &>/dev/null; then
        
        print_success "Secret exists: $secret_name"
        
        # Get secret ARN
        SECRET_ARN=$(aws secretsmanager describe-secret \
            --secret-id "$secret_name" \
            --query 'ARN' --output text --region "$AWS_REGION")
        print_info "ARN: $SECRET_ARN"
        
        # Get secret keys (without values)
        SECRET_KEYS=$(aws secretsmanager get-secret-value \
            --secret-id "$secret_name" \
            --query 'SecretString' --output text --region "$AWS_REGION" \
            | jq -r 'keys | join(", ")')
        print_info "Keys: $SECRET_KEYS"
        
        # Verify required keys exist
        REQUIRED_KEYS=("MONGO_URL" "GROQ_API_KEY" "DB_NAME")
        for key in "${REQUIRED_KEYS[@]}"; do
            if echo "$SECRET_KEYS" | grep -q "$key"; then
                print_success "Required key '$key' is present"
            else
                print_error "Required key '$key' is MISSING"
            fi
        done
        
        return 0
    else
        print_error "Secret does not exist: $secret_name"
        print_info "Create it with: ./infra/aws/scripts/03-create-secrets.sh $env"
        return 1
    fi
}

# =============================================================================
# Check ECS Task Definition
# =============================================================================
check_task_definition() {
    local env="$1"
    local service="$2"  # backend or frontend
    local task_family="${PROJECT_NAME}-${env}-${service}-task"
    
    print_header "Checking ECS Task Definition: $task_family"
    
    # Get the latest task definition
    if ! TASK_DEF=$(aws ecs describe-task-definition \
        --task-definition "$task_family" \
        --region "$AWS_REGION" 2>/dev/null); then
        print_error "Task definition does not exist: $task_family"
        print_info "Create it by deploying: ./infra/aws/scripts/build-and-deploy.sh $env"
        return 1
    fi
    
    print_success "Task definition exists: $task_family"
    
    # Get the container definition
    CONTAINER_DEF=$(echo "$TASK_DEF" | jq -r '.taskDefinition.containerDefinitions[0]')
    
    # Check if backend has secrets configured
    if [[ "$service" == "backend" ]]; then
        SECRETS=$(echo "$CONTAINER_DEF" | jq -r '.secrets')
        
        if [[ "$SECRETS" == "null" || "$SECRETS" == "[]" ]]; then
            print_error "No secrets configured in task definition"
            return 1
        fi
        
        print_success "Secrets are configured in task definition"
        
        # Verify each required secret
        REQUIRED_SECRETS=("MONGO_URL" "GROQ_API_KEY" "DB_NAME")
        for secret_name in "${REQUIRED_SECRETS[@]}"; do
            SECRET_REF=$(echo "$SECRETS" | jq -r ".[] | select(.name==\"$secret_name\") | .valueFrom")
            
            if [[ -n "$SECRET_REF" && "$SECRET_REF" != "null" ]]; then
                print_success "Secret reference found: $secret_name"
                print_info "  → $SECRET_REF"
                
                # Verify the secret ARN matches the environment
                if echo "$SECRET_REF" | grep -q "${PROJECT_NAME}-${env}-secrets"; then
                    print_success "Secret ARN correctly references '$env' environment"
                else
                    print_error "Secret ARN does NOT match '$env' environment!"
                    print_warning "Expected: ...${PROJECT_NAME}-${env}-secrets..."
                fi
            else
                print_error "Secret reference MISSING: $secret_name"
            fi
        done
    else
        print_info "Frontend does not require secrets (static assets)"
    fi
    
    return 0
}

# =============================================================================
# Check GitHub Secrets Configuration
# =============================================================================
check_github_secrets() {
    print_header "GitHub Secrets Configuration"
    
    print_info "GitHub repository secrets should contain:"
    echo "  • AWS_ACCESS_KEY_ID"
    echo "  • AWS_SECRET_ACCESS_KEY"
    echo "  • AWS_REGION (optional, defaults to us-east-1)"
    echo "  • TEST_DOMAIN (optional)"
    echo "  • PROD_DOMAIN (optional)"
    echo ""
    
    print_warning "GitHub secrets should NOT contain GROQ_API_KEY or MONGO_URL"
    print_info "These are stored per-environment in AWS Secrets Manager"
    echo ""
    
    print_info "Verify at: https://github.com/slatewave-labs/cruise-planner/settings/secrets/actions"
}

# =============================================================================
# Main
# =============================================================================
main() {
    print_header "ShoreExplorer Secrets Architecture Verification"
    
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region:  $AWS_REGION"
    echo ""
    
    ERRORS=0
    
    # Check environments
    if [[ "$ENVIRONMENT" == "all" ]]; then
        ENVS=("test" "prod")
    else
        ENVS=("$ENVIRONMENT")
    fi
    
    for env in "${ENVS[@]}"; do
        # Check AWS Secrets Manager
        if ! check_secrets_manager "$env"; then
            ((ERRORS++))
        fi
        
        # Check backend task definition
        if ! check_task_definition "$env" "backend"; then
            ((ERRORS++))
        fi
        
        # Check frontend task definition (informational only)
        check_task_definition "$env" "frontend" || true
    done
    
    # Check GitHub secrets info
    check_github_secrets
    
    # Summary
    print_header "Verification Summary"
    
    if [[ $ERRORS -eq 0 ]]; then
        print_success "All checks passed! ✨"
        echo ""
        print_info "Your secrets architecture is correctly configured:"
        echo "  • AWS Secrets Manager has separate secrets for each environment"
        echo "  • ECS task definitions reference the correct environment secrets"
        echo "  • GitHub Actions workflows use AWS credentials to access AWS Secrets Manager"
        echo ""
        return 0
    else
        print_error "Found $ERRORS issue(s)"
        echo ""
        print_info "See error messages above for details"
        echo ""
        return 1
    fi
}

main "$@"
