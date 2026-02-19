#!/usr/bin/env bash
# =============================================================================
# Deploy: Update ECS Services with Latest Images
# =============================================================================
# Forces ECS to pull the latest images and restart containers.
# Usage: ./infra/aws/scripts/deploy.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

# Load ALB outputs for URL display
ALB_FILE="$SCRIPT_DIR/.alb-outputs-${ENVIRONMENT}.env"
if [[ -f "$ALB_FILE" ]]; then
    source "$ALB_FILE"
fi

print_status "Deploying to '$ENVIRONMENT' environment"

# ---------------------------------------------------------------------------
# Check if ECS services exist — if not, create them first
# ---------------------------------------------------------------------------
service_exists() {
    local SVC_NAME="$1"
    local STATUS
    STATUS=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$SVC_NAME" \
        --query "services[?status=='ACTIVE'].serviceName" --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    [[ -n "$STATUS" && "$STATUS" != "None" ]]
}

BACKEND_EXISTS=true
FRONTEND_EXISTS=true
service_exists "$BACKEND_SERVICE_NAME"  || BACKEND_EXISTS=false
service_exists "$FRONTEND_SERVICE_NAME" || FRONTEND_EXISTS=false

if [[ "$BACKEND_EXISTS" == "false" || "$FRONTEND_EXISTS" == "false" ]]; then
    print_info "ECS services not found — creating them now..."
    "$SCRIPT_DIR/07-create-ecs-services.sh" "$ENVIRONMENT"
else
    # ---------------------------------------------------------------------------
    # Re-register task definitions to ensure they have the latest configuration
    # ---------------------------------------------------------------------------
    print_info "Registering updated task definitions..."
    
    # Load required outputs for task definition
    for F in iam secrets; do
        OUTPUT_FILE="$SCRIPT_DIR/.${F}-outputs-${ENVIRONMENT}.env"
        if [[ -f "$OUTPUT_FILE" ]]; then
            source "$OUTPUT_FILE"
        fi
    done
    
    ACCOUNT_ID=$(get_account_id)
    ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Register backend task definition with GROQ_API_KEY
    BACKEND_TASK_DEF=$(cat <<EOF
{
    "family": "${BACKEND_TASK_FAMILY}",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "${BACKEND_CPU}",
    "memory": "${BACKEND_MEMORY}",
    "executionRoleArn": "${ECS_TASK_EXECUTION_ROLE_ARN}",
    "taskRoleArn": "${ECS_TASK_ROLE_ARN}",
    "containerDefinitions": [
        {
            "name": "backend",
            "image": "${ECR_BASE}/${BACKEND_ECR_REPO}:latest",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 8001,
                    "protocol": "tcp"
                }
            ],
            "secrets": [
                {
                    "name": "MONGO_URL",
                    "valueFrom": "${SECRET_ARN}:MONGO_URL::"
                },
                {
                    "name": "GROQ_API_KEY",
                    "valueFrom": "${SECRET_ARN}:GROQ_API_KEY::"
                },
                {
                    "name": "DB_NAME",
                    "valueFrom": "${SECRET_ARN}:DB_NAME::"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "${BACKEND_LOG_GROUP}",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "python -c \"import urllib.request; exit(0 if urllib.request.urlopen('http://localhost:8001/api/health').status == 200 else 1)\""],
                "interval": 30,
                "timeout": 10,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
EOF
)
    
    aws ecs register-task-definition \
        --cli-input-json "$BACKEND_TASK_DEF" \
        --tags key=Project,value="$TAG_PROJECT" key=Environment,value="$TAG_ENVIRONMENT" \
        --region "$AWS_REGION" --output text >/dev/null
    
    print_success "Registered backend task definition: $BACKEND_TASK_FAMILY"
    
    # Register frontend task definition
    FRONTEND_TASK_DEF=$(cat <<EOF
{
    "family": "${FRONTEND_TASK_FAMILY}",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "${FRONTEND_CPU}",
    "memory": "${FRONTEND_MEMORY}",
    "executionRoleArn": "${ECS_TASK_EXECUTION_ROLE_ARN}",
    "taskRoleArn": "${ECS_TASK_ROLE_ARN}",
    "containerDefinitions": [
        {
            "name": "frontend",
            "image": "${ECR_BASE}/${FRONTEND_ECR_REPO}:latest",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 8080,
                    "protocol": "tcp"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "${FRONTEND_LOG_GROUP}",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1"],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 30
            }
        }
    ]
}
EOF
)
    
    aws ecs register-task-definition \
        --cli-input-json "$FRONTEND_TASK_DEF" \
        --tags key=Project,value="$TAG_PROJECT" key=Environment,value="$TAG_ENVIRONMENT" \
        --region "$AWS_REGION" --output text >/dev/null
    
    print_success "Registered frontend task definition: $FRONTEND_TASK_FAMILY"
    
    # ---------------------------------------------------------------------------
    # Force new deployment of backend
    # ---------------------------------------------------------------------------
    print_info "Deploying backend..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$BACKEND_SERVICE_NAME" \
        --task-definition "$BACKEND_TASK_FAMILY" \
        --force-new-deployment \
        --region "$AWS_REGION" --output text >/dev/null

    print_success "Backend deployment started"

    # ---------------------------------------------------------------------------
    # Force new deployment of frontend
    # ---------------------------------------------------------------------------
    print_info "Deploying frontend..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$FRONTEND_SERVICE_NAME" \
        --task-definition "$FRONTEND_TASK_FAMILY" \
        --force-new-deployment \
        --region "$AWS_REGION" --output text >/dev/null

    print_success "Frontend deployment started"
fi

# ---------------------------------------------------------------------------
# Wait for services to stabilize (optional)
# ---------------------------------------------------------------------------
if [[ "${WAIT_FOR_STABLE:-true}" == "true" ]]; then
    print_info "Waiting for services to stabilize (this can take 3-5 minutes)..."

    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$BACKEND_SERVICE_NAME" "$FRONTEND_SERVICE_NAME" \
        --region "$AWS_REGION" 2>/dev/null \
        && print_success "All services are stable and healthy!" \
        || print_error "Timeout waiting for services. Check logs for issues."
fi

echo ""
echo "  Deployment complete!"
if [[ -n "${ALB_DNS:-}" ]]; then
    echo ""
    echo "  🌐 Application URL:  http://$ALB_DNS"
    echo "  🔧 API Health:       http://$ALB_DNS/api/health"
fi
echo ""
echo "  View logs:"
echo "    aws logs tail $BACKEND_LOG_GROUP --follow --region $AWS_REGION"
echo "    aws logs tail $FRONTEND_LOG_GROUP --follow --region $AWS_REGION"
echo ""
