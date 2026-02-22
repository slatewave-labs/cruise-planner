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
    # Deploy via CodeDeploy Blue/Green
    # ---------------------------------------------------------------------------
    CODEDEPLOY_APP="${APP_NAME}-codedeploy"

    deploy_via_codedeploy() {
        local DG_NAME="$1" TASK_FAMILY="$2" CONTAINER_NAME="$3" CONTAINER_PORT="$4"
        local TASK_DEF_ARN

        TASK_DEF_ARN=$(aws ecs describe-task-definition \
            --task-definition "$TASK_FAMILY" \
            --query 'taskDefinition.taskDefinitionArn' --output text \
            --region "$AWS_REGION")

        APPSPEC=$(cat <<EOF
{
  "version": 0.0,
  "Resources": [{
    "TargetService": {
      "Type": "AWS::ECS::Service",
      "Properties": {
        "TaskDefinition": "${TASK_DEF_ARN}",
        "LoadBalancerInfo": {
          "ContainerName": "${CONTAINER_NAME}",
          "ContainerPort": ${CONTAINER_PORT}
        }
      }
    }
  }]
}
EOF
)

        aws deploy create-deployment \
            --application-name "$CODEDEPLOY_APP" \
            --deployment-group-name "$DG_NAME" \
            --revision "revisionType=AppSpecContent,appSpecContent={content='$(echo "$APPSPEC" | jq -c .)'}" \
            --description "Local deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --region "$AWS_REGION" --output text >/dev/null
    }

    print_info "Deploying backend via CodeDeploy..."
    deploy_via_codedeploy "${APP_NAME}-backend-dg" "$BACKEND_TASK_FAMILY" "backend" 8001
    print_success "Backend CodeDeploy deployment started"

    print_info "Deploying frontend via CodeDeploy..."
    deploy_via_codedeploy "${APP_NAME}-frontend-dg" "$FRONTEND_TASK_FAMILY" "frontend" 8080
    print_success "Frontend CodeDeploy deployment started"
fi

# ---------------------------------------------------------------------------
# Wait for CodeDeploy deployments to complete (optional)
# ---------------------------------------------------------------------------
if [[ "${WAIT_FOR_STABLE:-true}" == "true" ]]; then
    print_info "Waiting for CodeDeploy deployments to complete (this can take 3-5 minutes)..."

    all_success=true
    for DG in "${APP_NAME}-backend-dg" "${APP_NAME}-frontend-dg"; do
        DEPLOY_ID=$(aws deploy list-deployments \
            --application-name "$CODEDEPLOY_APP" \
            --deployment-group-name "$DG" \
            --query "deployments[0]" --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "")

        if [[ -n "$DEPLOY_ID" && "$DEPLOY_ID" != "None" ]]; then
            aws deploy wait deployment-successful --deployment-id "$DEPLOY_ID" \
                --region "$AWS_REGION" 2>/dev/null \
                && print_success "${DG}: deployment succeeded" \
                || { print_error "${DG}: deployment failed"; all_success=false; }
        fi
    done

    if $all_success; then
        print_success "All CodeDeploy deployments completed successfully!"
    else
        print_error "One or more deployments failed. Check CodeDeploy console."
    fi
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
