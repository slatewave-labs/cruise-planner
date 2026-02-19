#!/usr/bin/env bash
# =============================================================================
# Step 7: Create ECS Task Definitions and Services
# =============================================================================
# Creates the container configurations and running services on ECS Fargate.
# Usage: ./infra/aws/scripts/07-create-ecs-services.sh <test|prod>
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

# Load all previous outputs
for F in networking iam ecs alb secrets; do
    OUTPUT_FILE="$SCRIPT_DIR/.${F}-outputs-${ENVIRONMENT}.env"
    if [[ -f "$OUTPUT_FILE" ]]; then
        source "$OUTPUT_FILE"
    else
        echo "  ❌ Missing $OUTPUT_FILE. Run previous setup scripts first."
        exit 1
    fi
done

ACCOUNT_ID=$(get_account_id)
ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

print_status "Creating ECS Services for '$ENVIRONMENT' environment"

# ---------------------------------------------------------------------------
# Backend Task Definition
# ---------------------------------------------------------------------------
print_info "Registering backend task definition..."

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
                    "name": "GROQ_API_KEY",
                    "valueFrom": "${SECRET_ARN}:GROQ_API_KEY::"
                }
            ],
            "environment": [
                {
                    "name": "DYNAMODB_TABLE_NAME",
                    "value": "myapp-${ENVIRONMENT}"
                },
                {
                    "name": "AWS_DEFAULT_REGION",
                    "value": "${AWS_REGION}"
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

# ---------------------------------------------------------------------------
# Frontend Task Definition
# ---------------------------------------------------------------------------
print_info "Registering frontend task definition..."

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
# Create Backend ECS Service
# ---------------------------------------------------------------------------
EXISTING_BACKEND_SVC=$(aws ecs describe-services \
    --cluster "$ECS_CLUSTER_NAME" \
    --services "$BACKEND_SERVICE_NAME" \
    --query "services[?status=='ACTIVE'].serviceName" --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

if [[ -n "$EXISTING_BACKEND_SVC" && "$EXISTING_BACKEND_SVC" != "None" ]]; then
    print_info "Updating existing backend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$BACKEND_SERVICE_NAME" \
        --task-definition "$BACKEND_TASK_FAMILY" \
        --desired-count "$DESIRED_COUNT" \
        --force-new-deployment \
        --region "$AWS_REGION" --output text >/dev/null
    print_success "Updated backend service: $BACKEND_SERVICE_NAME"
else
    aws ecs create-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service-name "$BACKEND_SERVICE_NAME" \
        --task-definition "$BACKEND_TASK_FAMILY" \
        --desired-count "$DESIRED_COUNT" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$PUBLIC_SUBNET_1_ID,$PUBLIC_SUBNET_2_ID],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$BACKEND_TG_ARN,containerName=backend,containerPort=8001" \
        --health-check-grace-period-seconds 120 \
        --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
        --tags key=Project,value="$TAG_PROJECT" key=Environment,value="$TAG_ENVIRONMENT" \
        --region "$AWS_REGION" --output text >/dev/null
    print_success "Created backend service: $BACKEND_SERVICE_NAME"
fi

# ---------------------------------------------------------------------------
# Create Frontend ECS Service
# ---------------------------------------------------------------------------
EXISTING_FRONTEND_SVC=$(aws ecs describe-services \
    --cluster "$ECS_CLUSTER_NAME" \
    --services "$FRONTEND_SERVICE_NAME" \
    --query "services[?status=='ACTIVE'].serviceName" --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

if [[ -n "$EXISTING_FRONTEND_SVC" && "$EXISTING_FRONTEND_SVC" != "None" ]]; then
    print_info "Updating existing frontend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$FRONTEND_SERVICE_NAME" \
        --task-definition "$FRONTEND_TASK_FAMILY" \
        --desired-count "$DESIRED_COUNT" \
        --force-new-deployment \
        --region "$AWS_REGION" --output text >/dev/null
    print_success "Updated frontend service: $FRONTEND_SERVICE_NAME"
else
    aws ecs create-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service-name "$FRONTEND_SERVICE_NAME" \
        --task-definition "$FRONTEND_TASK_FAMILY" \
        --desired-count "$DESIRED_COUNT" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$PUBLIC_SUBNET_1_ID,$PUBLIC_SUBNET_2_ID],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$FRONTEND_TG_ARN,containerName=frontend,containerPort=8080" \
        --health-check-grace-period-seconds 60 \
        --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
        --tags key=Project,value="$TAG_PROJECT" key=Environment,value="$TAG_ENVIRONMENT" \
        --region "$AWS_REGION" --output text >/dev/null
    print_success "Created frontend service: $FRONTEND_SERVICE_NAME"
fi

echo ""
echo "  Services are starting. It may take 2-3 minutes for tasks to become healthy."
echo ""
echo "  Monitor progress:"
echo "    aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $BACKEND_SERVICE_NAME --query 'services[0].deployments' --region $AWS_REGION"
echo ""
echo "  View logs:"
echo "    aws logs tail $BACKEND_LOG_GROUP --follow --region $AWS_REGION"
echo "    aws logs tail $FRONTEND_LOG_GROUP --follow --region $AWS_REGION"
echo ""
