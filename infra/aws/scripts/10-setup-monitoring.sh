#!/usr/bin/env bash
# =============================================================================
# Step 10: Setup Monitoring — CloudWatch Dashboard, Alarms & SNS Alerting
# =============================================================================
# Creates a CloudWatch dashboard with ECS backend + ALB + S3/CloudFront metrics,
# SNS topic for alerts, and CloudWatch alarms for proactive issue detection.
#
# Usage: ./infra/aws/scripts/10-setup-monitoring.sh <test|prod> [--check-existing]
#
# Options:
#   --check-existing  Only create alarms/SNS if they don't already exist.
#                     Used by deploy workflows to avoid recreating on every deploy.
#                     Setup workflows omit this flag to always create/update.
#
# Prerequisites:
#   - ECS cluster and backend service running (scripts 01-07)
#   - ALB created (script 06)
#   - S3 bucket and CloudFront distribution for frontend (script 09)
#
# What this creates:
#   - SNS topic for alarm notifications
#   - CloudWatch dashboard with ECS backend, ALB, S3/CloudFront, and app metrics
#   - CloudWatch alarms for CPU, memory, 5xx errors, latency, and health
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh" "${1:-test}"

# Parse --check-existing flag
CHECK_EXISTING="${CHECK_EXISTING:-false}"
for arg in "$@"; do
  if [[ "$arg" == "--check-existing" ]]; then
    CHECK_EXISTING="true"
  fi
done

print_status "Setting up Monitoring & Alerting (${ENVIRONMENT})"
if [[ "$CHECK_EXISTING" == "true" ]]; then
  print_info "Running in check-existing mode — skipping resources that already exist"
fi

# ---------------------------------------------------------------------------
# 1. Create SNS topic for alarm notifications
# ---------------------------------------------------------------------------
print_info "Creating SNS alarm topic: ${SNS_ALARM_TOPIC}"

if [[ "$CHECK_EXISTING" == "true" ]]; then
    TOPIC_ARN=$(aws sns list-topics --region "$AWS_REGION" \
        --query "Topics[?ends_with(TopicArn, ':${SNS_ALARM_TOPIC}')].TopicArn | [0]" \
        --output text 2>/dev/null || echo "")
    if [[ -n "$TOPIC_ARN" && "$TOPIC_ARN" != "None" ]]; then
        print_skip "SNS topic exists: ${TOPIC_ARN}"
    else
        TOPIC_ARN=""
    fi
fi

if [[ -z "${TOPIC_ARN:-}" || "$TOPIC_ARN" == "None" ]]; then
    TOPIC_ARN=$(aws sns create-topic \
        --name "$SNS_ALARM_TOPIC" \
        --tags "Key=Project,Value=${TAG_PROJECT}" "Key=Environment,Value=${TAG_ENVIRONMENT}" \
        --query 'TopicArn' --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")

    if [[ -n "$TOPIC_ARN" && "$TOPIC_ARN" != "None" ]]; then
        print_success "SNS topic created: ${TOPIC_ARN}"
    else
        echo "  ⚠️  Could not create SNS topic — alarms will be created without notification target"
        TOPIC_ARN=""
    fi
fi

# Subscribe an email if ALERT_EMAIL is set (e.g. in GitHub Secrets)
ALERT_EMAIL="${ALERT_EMAIL:-}"
if [[ -n "$ALERT_EMAIL" && -n "$TOPIC_ARN" ]]; then
    if [[ "$CHECK_EXISTING" == "true" ]]; then
        # Check if subscription already exists before creating
        EXISTING_SUB=$(aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" \
            --query "Subscriptions[?Endpoint=='${ALERT_EMAIL}'].SubscriptionArn | [0]" \
            --output text --region "$AWS_REGION" 2>/dev/null || echo "")
        if [[ -n "$EXISTING_SUB" && "$EXISTING_SUB" != "None" ]]; then
            print_skip "Email subscription exists for ${ALERT_EMAIL}"
        else
            aws sns subscribe \
                --topic-arn "$TOPIC_ARN" \
                --protocol email \
                --notification-endpoint "$ALERT_EMAIL" \
                --region "$AWS_REGION" 2>/dev/null || true
            print_info "Subscription request sent to ${ALERT_EMAIL} (confirm via email)"
        fi
    else
        aws sns subscribe \
            --topic-arn "$TOPIC_ARN" \
            --protocol email \
            --notification-endpoint "$ALERT_EMAIL" \
            --region "$AWS_REGION" 2>/dev/null || true
        print_info "Subscription request sent to ${ALERT_EMAIL} (confirm via email)"
    fi
fi

# ---------------------------------------------------------------------------
# 2. Discover ALB ARN suffix for metric dimensions
# ---------------------------------------------------------------------------
ALB_ARN_SUFFIX=""
ALB_FULL_NAME=""
BACKEND_TG_ARN_SUFFIX=""

ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names "${ALB_NAME}" \
    --query "LoadBalancers[0].LoadBalancerArn" \
    --output text --region "$AWS_REGION" 2>/dev/null || echo "")

if [[ -n "$ALB_ARN" && "$ALB_ARN" != "None" ]]; then
    # Extract the suffix: app/my-alb/1234567890abcdef
    ALB_ARN_SUFFIX=$(echo "$ALB_ARN" | sed 's|.*:loadbalancer/||')
    ALB_FULL_NAME=$(echo "$ALB_ARN_SUFFIX" | sed 's|^app/||; s|/.*||')
    print_success "ALB found: ${ALB_ARN_SUFFIX}"

    # Get target group ARN suffixes (backend only — frontend is on S3/CloudFront)
    TG_ARNS=$(aws elbv2 describe-target-groups \
        --load-balancer-arn "$ALB_ARN" \
        --query "TargetGroups[].{Name:TargetGroupName,Arn:TargetGroupArn}" \
        --output json --region "$AWS_REGION" 2>/dev/null || echo "[]")

    BACKEND_TG_ARN_SUFFIX=$(echo "$TG_ARNS" | \
        jq -r ".[] | select(.Name | contains(\"backend\")) | .Arn" | \
        sed 's|.*:targetgroup/||' | head -1)

    print_info "Backend TG: ${BACKEND_TG_ARN_SUFFIX:-not found}"
else
    print_info "ALB not found — dashboard will use ECS metrics only"
fi

# ---------------------------------------------------------------------------
# 2b. Discover S3 bucket and CloudFront distribution for frontend metrics
# ---------------------------------------------------------------------------
S3_BUCKET="${APP_NAME}-frontend"
CF_DIST_ID=""

# Check if S3 bucket exists
if aws s3api head-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
    print_success "S3 frontend bucket found: ${S3_BUCKET}"
else
    S3_BUCKET=""
    print_info "S3 frontend bucket not found — skipping S3 metrics"
fi

# Check if CloudFront distribution exists
CF_DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='${APP_NAME}-frontend'].Id | [0]" \
    --output text 2>/dev/null || echo "")

if [[ -n "$CF_DIST_ID" && "$CF_DIST_ID" != "None" ]]; then
    print_success "CloudFront distribution found: ${CF_DIST_ID}"
else
    CF_DIST_ID=""
    print_info "CloudFront distribution not found — skipping CloudFront metrics"
fi

# ---------------------------------------------------------------------------
# 3. Create CloudWatch Dashboard
# ---------------------------------------------------------------------------
print_info "Creating CloudWatch dashboard: ${DASHBOARD_NAME}"

# Build dashboard JSON dynamically
# The dashboard includes:
#   Row 1: ECS CPU & Memory utilization (backend only — frontend is on S3/CloudFront)
#   Row 2: ALB request count, 5xx/4xx error rates
#   Row 3: ALB target response time, healthy/unhealthy host count (backend only)
#   Row 4: S3 & CloudFront metrics (frontend)
#   Row 5: Custom app metrics (API latency, error rate)

# Start building widgets array
WIDGETS='['

# Header
WIDGETS+='{"type":"text","x":0,"y":0,"width":24,"height":1,"properties":{"markdown":"# ShoreExplorer — '"${ENVIRONMENT}"' Environment Dashboard"}},'
WIDGETS+='{"type":"text","x":0,"y":1,"width":24,"height":1,"properties":{"markdown":"## ECS Backend Health"}},'

# Backend CPU
WIDGETS+='{"type":"metric","x":0,"y":2,"width":12,"height":6,"properties":{"title":"Backend CPU Utilization","metrics":[["AWS/ECS","CPUUtilization","ClusterName","'"${ECS_CLUSTER_NAME}"'","ServiceName","'"${BACKEND_SERVICE_NAME}"'",{"stat":"Average","period":60}],["AWS/ECS","CPUUtilization","ClusterName","'"${ECS_CLUSTER_NAME}"'","ServiceName","'"${BACKEND_SERVICE_NAME}"'",{"stat":"Maximum","period":60,"color":"#d62728"}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"max":100,"label":"Percent"}},"annotations":{"horizontal":[{"label":"Alarm threshold","value":80,"color":"#d62728"}]},"period":60}},'

# Backend Memory
WIDGETS+='{"type":"metric","x":12,"y":2,"width":12,"height":6,"properties":{"title":"Backend Memory Utilization","metrics":[["AWS/ECS","MemoryUtilization","ClusterName","'"${ECS_CLUSTER_NAME}"'","ServiceName","'"${BACKEND_SERVICE_NAME}"'",{"stat":"Average","period":60}],["AWS/ECS","MemoryUtilization","ClusterName","'"${ECS_CLUSTER_NAME}"'","ServiceName","'"${BACKEND_SERVICE_NAME}"'",{"stat":"Maximum","period":60,"color":"#d62728"}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"max":100,"label":"Percent"}},"annotations":{"horizontal":[{"label":"Alarm threshold","value":85,"color":"#d62728"}]},"period":60}},'

# ALB section header
WIDGETS+='{"type":"text","x":0,"y":8,"width":24,"height":1,"properties":{"markdown":"## ALB & Traffic Metrics"}},'

if [[ -n "$ALB_ARN_SUFFIX" ]]; then
# Request Count
WIDGETS+='{"type":"metric","x":0,"y":9,"width":8,"height":6,"properties":{"title":"Request Count","metrics":[["AWS/ApplicationELB","RequestCount","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"Sum","period":60}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":60}},'

# HTTP 5xx
WIDGETS+='{"type":"metric","x":8,"y":9,"width":8,"height":6,"properties":{"title":"HTTP 5xx Errors (Server)","metrics":[["AWS/ApplicationELB","HTTPCode_Target_5XX_Count","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"Sum","period":60,"color":"#d62728"}],["AWS/ApplicationELB","HTTPCode_ELB_5XX_Count","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"Sum","period":60,"color":"#ff7f0e"}]],"view":"timeSeries","stacked":true,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":60}},'

# HTTP 4xx
WIDGETS+='{"type":"metric","x":16,"y":9,"width":8,"height":6,"properties":{"title":"HTTP 4xx Errors (Client)","metrics":[["AWS/ApplicationELB","HTTPCode_Target_4XX_Count","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"Sum","period":60,"color":"#ff7f0e"}],["AWS/ApplicationELB","HTTPCode_ELB_4XX_Count","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"Sum","period":60,"color":"#bcbd22"}]],"view":"timeSeries","stacked":true,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":60}},'

# Target Response Time
WIDGETS+='{"type":"metric","x":0,"y":15,"width":12,"height":6,"properties":{"title":"Target Response Time (p50 / p95 / p99)","metrics":[["AWS/ApplicationELB","TargetResponseTime","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"p50","period":60,"label":"p50"}],["AWS/ApplicationELB","TargetResponseTime","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"p95","period":60,"label":"p95","color":"#ff7f0e"}],["AWS/ApplicationELB","TargetResponseTime","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"p99","period":60,"label":"p99","color":"#d62728"}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Seconds"}},"annotations":{"horizontal":[{"label":"SLO (2s)","value":2,"color":"#d62728"}]},"period":60}},'

# Healthy/Unhealthy Backend only (no frontend TG — frontend is S3/CloudFront)
if [[ -n "$BACKEND_TG_ARN_SUFFIX" ]]; then
WIDGETS+='{"type":"metric","x":12,"y":15,"width":12,"height":6,"properties":{"title":"Healthy vs Unhealthy Hosts — Backend","metrics":[["AWS/ApplicationELB","HealthyHostCount","TargetGroup","'"${BACKEND_TG_ARN_SUFFIX}"'","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"Average","period":60,"color":"#2ca02c"}],["AWS/ApplicationELB","UnHealthyHostCount","TargetGroup","'"${BACKEND_TG_ARN_SUFFIX}"'","LoadBalancer","'"${ALB_ARN_SUFFIX}"'",{"stat":"Average","period":60,"color":"#d62728"}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":60}},'
fi
fi

# S3 & CloudFront section
WIDGETS+='{"type":"text","x":0,"y":21,"width":24,"height":1,"properties":{"markdown":"## Frontend — S3 & CloudFront"}},'

if [[ -n "$CF_DIST_ID" ]]; then
# CloudFront Requests
WIDGETS+='{"type":"metric","x":0,"y":22,"width":8,"height":6,"properties":{"title":"CloudFront Requests","metrics":[["AWS/CloudFront","Requests","DistributionId","'"${CF_DIST_ID}"'","Region","Global",{"stat":"Sum","period":300}]],"view":"timeSeries","stacked":false,"region":"us-east-1","yAxis":{"left":{"min":0,"label":"Count"}},"period":300}},'

# CloudFront Error Rate
WIDGETS+='{"type":"metric","x":8,"y":22,"width":8,"height":6,"properties":{"title":"CloudFront Error Rate","metrics":[["AWS/CloudFront","4xxErrorRate","DistributionId","'"${CF_DIST_ID}"'","Region","Global",{"stat":"Average","period":300,"color":"#ff7f0e"}],["AWS/CloudFront","5xxErrorRate","DistributionId","'"${CF_DIST_ID}"'","Region","Global",{"stat":"Average","period":300,"color":"#d62728"}],["AWS/CloudFront","TotalErrorRate","DistributionId","'"${CF_DIST_ID}"'","Region","Global",{"stat":"Average","period":300,"color":"#9467bd"}]],"view":"timeSeries","stacked":false,"region":"us-east-1","yAxis":{"left":{"min":0,"max":100,"label":"Percent"}},"period":300}},'

# CloudFront Bytes Downloaded
WIDGETS+='{"type":"metric","x":16,"y":22,"width":8,"height":6,"properties":{"title":"CloudFront Bytes Transferred","metrics":[["AWS/CloudFront","BytesDownloaded","DistributionId","'"${CF_DIST_ID}"'","Region","Global",{"stat":"Sum","period":300,"label":"Downloaded","color":"#2ca02c"}],["AWS/CloudFront","BytesUploaded","DistributionId","'"${CF_DIST_ID}"'","Region","Global",{"stat":"Sum","period":300,"label":"Uploaded","color":"#1f77b4"}]],"view":"timeSeries","stacked":false,"region":"us-east-1","yAxis":{"left":{"min":0,"label":"Bytes"}},"period":300}},'
fi

if [[ -n "$S3_BUCKET" ]]; then
# S3 Bucket Size
WIDGETS+='{"type":"metric","x":0,"y":28,"width":12,"height":6,"properties":{"title":"S3 Bucket Size","metrics":[["AWS/S3","BucketSizeBytes","BucketName","'"${S3_BUCKET}"'","StorageType","StandardStorage",{"stat":"Average","period":86400}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Bytes"}},"period":86400}},'

# S3 Number of Objects
WIDGETS+='{"type":"metric","x":12,"y":28,"width":12,"height":6,"properties":{"title":"S3 Number of Objects","metrics":[["AWS/S3","NumberOfObjects","BucketName","'"${S3_BUCKET}"'","StorageType","AllStorageTypes",{"stat":"Average","period":86400}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":86400}},'
fi

# Application metrics section
WIDGETS+='{"type":"text","x":0,"y":34,"width":24,"height":1,"properties":{"markdown":"## Application Metrics"}},'

# API Request Count
WIDGETS+='{"type":"metric","x":0,"y":35,"width":8,"height":6,"properties":{"title":"API Request Count (by status)","metrics":[["'"${METRIC_NAMESPACE}"'","RequestCount","StatusClass","2xx",{"stat":"Sum","period":60,"color":"#2ca02c"}],["'"${METRIC_NAMESPACE}"'","RequestCount","StatusClass","4xx",{"stat":"Sum","period":60,"color":"#ff7f0e"}],["'"${METRIC_NAMESPACE}"'","RequestCount","StatusClass","5xx",{"stat":"Sum","period":60,"color":"#d62728"}]],"view":"timeSeries","stacked":true,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":60}},'

# API Response Latency
WIDGETS+='{"type":"metric","x":8,"y":35,"width":8,"height":6,"properties":{"title":"API Response Latency (p50 / p95 / p99)","metrics":[["'"${METRIC_NAMESPACE}"'","ResponseLatency","Service","backend",{"stat":"p50","period":60,"label":"p50"}],["'"${METRIC_NAMESPACE}"'","ResponseLatency","Service","backend",{"stat":"p95","period":60,"label":"p95","color":"#ff7f0e"}],["'"${METRIC_NAMESPACE}"'","ResponseLatency","Service","backend",{"stat":"p99","period":60,"label":"p99","color":"#d62728"}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Milliseconds"}},"annotations":{"horizontal":[{"label":"SLO (2000ms)","value":2000,"color":"#d62728"}]},"period":60}},'

# AI Plan Generation Latency
WIDGETS+='{"type":"metric","x":16,"y":35,"width":8,"height":6,"properties":{"title":"AI Plan Generation Latency","metrics":[["'"${METRIC_NAMESPACE}"'","AIGenerationLatency","Service","backend",{"stat":"Average","period":60,"label":"Average"}],["'"${METRIC_NAMESPACE}"'","AIGenerationLatency","Service","backend",{"stat":"p95","period":60,"label":"p95","color":"#ff7f0e"}],["'"${METRIC_NAMESPACE}"'","AIGenerationLatency","Service","backend",{"stat":"Maximum","period":60,"label":"Max","color":"#d62728"}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Milliseconds"}},"annotations":{"horizontal":[{"label":"SLO (30s)","value":30000,"color":"#d62728"}]},"period":60}},'

# API Requests by Endpoint
WIDGETS+='{"type":"metric","x":0,"y":41,"width":12,"height":6,"properties":{"title":"API Requests by Endpoint","metrics":[["'"${METRIC_NAMESPACE}"'","RequestCount","Endpoint","/api/trips",{"stat":"Sum","period":300}],["'"${METRIC_NAMESPACE}"'","RequestCount","Endpoint","/api/plans/generate",{"stat":"Sum","period":300}],["'"${METRIC_NAMESPACE}"'","RequestCount","Endpoint","/api/weather",{"stat":"Sum","period":300}],["'"${METRIC_NAMESPACE}"'","RequestCount","Endpoint","/api/ports/search",{"stat":"Sum","period":300}],["'"${METRIC_NAMESPACE}"'","RequestCount","Endpoint","/api/health",{"stat":"Sum","period":300}]],"view":"timeSeries","stacked":true,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":300}},'

# AI Success vs Failure
WIDGETS+='{"type":"metric","x":12,"y":41,"width":12,"height":6,"properties":{"title":"AI Plan Generation — Success vs Failure","metrics":[["'"${METRIC_NAMESPACE}"'","AIGenerationCount","Result","success",{"stat":"Sum","period":300,"color":"#2ca02c"}],["'"${METRIC_NAMESPACE}"'","AIGenerationCount","Result","error",{"stat":"Sum","period":300,"color":"#d62728"}]],"view":"timeSeries","stacked":false,"region":"'"${AWS_REGION}"'","yAxis":{"left":{"min":0,"label":"Count"}},"period":300}}'

# Close widgets array
WIDGETS+=']'

# Write dashboard JSON
echo "{\"widgets\":${WIDGETS}}" > /tmp/dashboard-body.json

DASHBOARD_ERROR=""
if DASHBOARD_ERROR=$(aws cloudwatch put-dashboard \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body "file:///tmp/dashboard-body.json" \
    --region "$AWS_REGION" 2>&1); then
    print_success "CloudWatch dashboard created: ${DASHBOARD_NAME}"
else
    print_error "Could not create CloudWatch dashboard — ensure the deployer IAM user has cloudwatch:PutDashboard permission (attach CloudWatchFullAccess policy)"
    if [[ -n "$DASHBOARD_ERROR" ]]; then
        echo "  ↳ AWS error: ${DASHBOARD_ERROR}" >&2
    fi
fi

rm -f /tmp/dashboard-body.json

# ---------------------------------------------------------------------------
# 4. Create CloudWatch Alarms
# ---------------------------------------------------------------------------
print_info "Creating CloudWatch alarms..."

# Helper: create alarm with optional SNS action
# When CHECK_EXISTING is true, skip alarms that already exist
create_alarm() {
    local alarm_name="$1"
    local description="$2"
    local namespace="$3"
    local metric_name="$4"
    local threshold="$5"
    local comparison="$6"
    local period="${7:-60}"
    local eval_periods="${8:-3}"
    local statistic="${9:-Average}"
    shift 9
    local dimensions=("$@")

    # Check if alarm already exists when in check-existing mode
    if [[ "$CHECK_EXISTING" == "true" ]]; then
        EXISTING=$(aws cloudwatch describe-alarms --alarm-names "$alarm_name" \
            --query "MetricAlarms[0].AlarmName" --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "")
        if [[ -n "$EXISTING" && "$EXISTING" != "None" ]]; then
            print_skip "Alarm: $alarm_name"
            return 0
        fi
    fi

    local alarm_args=(
        --alarm-name "$alarm_name"
        --alarm-description "$description"
        --namespace "$namespace"
        --metric-name "$metric_name"
        --threshold "$threshold"
        --comparison-operator "$comparison"
        --period "$period"
        --evaluation-periods "$eval_periods"
        --treat-missing-data "notBreaching"
        --tags "Key=Project,Value=${TAG_PROJECT}" "Key=Environment,Value=${TAG_ENVIRONMENT}"
        --region "$AWS_REGION"
    )

    # Use --extended-statistic for percentile statistics (p50, p95, p99, etc.)
    if [[ "$statistic" =~ ^p[0-9]+\.?[0-9]*$ ]]; then
        alarm_args+=(--extended-statistic "$statistic")
    else
        alarm_args+=(--statistic "$statistic")
    fi

    # Add SNS action if topic exists
    if [[ -n "$TOPIC_ARN" ]]; then
        alarm_args+=(--alarm-actions "$TOPIC_ARN" --ok-actions "$TOPIC_ARN")
    fi

    # Add dimensions
    for dim in "${dimensions[@]}"; do
        alarm_args+=(--dimensions "$dim")
    done

    aws cloudwatch put-metric-alarm "${alarm_args[@]}" 2>/dev/null || {
        print_error "Failed to create alarm: $alarm_name"
        return 0
    }
    print_success "Alarm: $alarm_name"
}

# --- ECS Backend Alarms ---

# Backend CPU > 80% for 3 consecutive minutes
create_alarm \
    "${APP_NAME}-backend-high-cpu" \
    "Backend CPU utilization above 80% for 3 minutes" \
    "AWS/ECS" "CPUUtilization" 80 "GreaterThanThreshold" 60 3 "Average" \
    "Name=ClusterName,Value=${ECS_CLUSTER_NAME}" "Name=ServiceName,Value=${BACKEND_SERVICE_NAME}"

# Backend Memory > 85% for 3 consecutive minutes
create_alarm \
    "${APP_NAME}-backend-high-memory" \
    "Backend memory utilization above 85% for 3 minutes" \
    "AWS/ECS" "MemoryUtilization" 85 "GreaterThanThreshold" 60 3 "Average" \
    "Name=ClusterName,Value=${ECS_CLUSTER_NAME}" "Name=ServiceName,Value=${BACKEND_SERVICE_NAME}"

# --- ALB Alarms (only if ALB exists) ---

if [[ -n "$ALB_ARN_SUFFIX" ]]; then
    # 5xx errors > 10 in 5 minutes
    create_alarm \
        "${APP_NAME}-alb-5xx-errors" \
        "ALB 5xx error count above 10 in 5 minutes — potential backend failure" \
        "AWS/ApplicationELB" "HTTPCode_Target_5XX_Count" 10 "GreaterThanThreshold" 300 1 "Sum" \
        "Name=LoadBalancer,Value=${ALB_ARN_SUFFIX}"

    # Target response time p95 > 2 seconds for 3 periods
    create_alarm \
        "${APP_NAME}-alb-high-latency" \
        "ALB target response time p95 above 2 seconds for 3 consecutive periods" \
        "AWS/ApplicationELB" "TargetResponseTime" 2 "GreaterThanThreshold" 60 3 "Average" \
        "Name=LoadBalancer,Value=${ALB_ARN_SUFFIX}"

    # Unhealthy backend targets > 0 for 2 minutes
    if [[ -n "$BACKEND_TG_ARN_SUFFIX" ]]; then
        create_alarm \
            "${APP_NAME}-backend-unhealthy-hosts" \
            "Backend has unhealthy targets — service may be degraded" \
            "AWS/ApplicationELB" "UnHealthyHostCount" 0 "GreaterThanThreshold" 60 2 "Average" \
            "Name=TargetGroup,Value=${BACKEND_TG_ARN_SUFFIX}" "Name=LoadBalancer,Value=${ALB_ARN_SUFFIX}"
    fi
fi

# --- CloudFront Alarms (frontend — only if distribution exists) ---

if [[ -n "$CF_DIST_ID" ]]; then
    # CloudFront 5xx error rate > 5% for 2 periods
    create_alarm \
        "${APP_NAME}-cloudfront-5xx-errors" \
        "CloudFront 5xx error rate above 5% — frontend serving errors" \
        "AWS/CloudFront" "5xxErrorRate" 5 "GreaterThanThreshold" 300 2 "Average" \
        "Name=DistributionId,Value=${CF_DIST_ID}" "Name=Region,Value=Global"

    # CloudFront total error rate > 10% for 2 periods
    create_alarm \
        "${APP_NAME}-cloudfront-high-error-rate" \
        "CloudFront total error rate above 10% — frontend may be degraded" \
        "AWS/CloudFront" "TotalErrorRate" 10 "GreaterThanThreshold" 300 2 "Average" \
        "Name=DistributionId,Value=${CF_DIST_ID}" "Name=Region,Value=Global"
fi

# --- Application-level Alarms (custom metrics emitted by backend) ---

# API 5xx rate > 5 in 5 minutes
create_alarm \
    "${APP_NAME}-api-5xx-spike" \
    "Application API 5xx error count above 5 in 5 minutes" \
    "${METRIC_NAMESPACE}" "RequestCount" 5 "GreaterThanThreshold" 300 1 "Sum" \
    "Name=StatusClass,Value=5xx"

# API p95 latency > 2000ms for 3 periods
create_alarm \
    "${APP_NAME}-api-high-latency" \
    "Application API p95 response latency above 2000ms" \
    "${METRIC_NAMESPACE}" "ResponseLatency" 2000 "GreaterThanThreshold" 60 3 "p95" \
    "Name=Service,Value=backend"

# AI generation failures > 3 in 15 minutes
create_alarm \
    "${APP_NAME}-ai-generation-failures" \
    "AI plan generation failures above 3 in 15 minutes — LLM service may be degraded" \
    "${METRIC_NAMESPACE}" "AIGenerationCount" 3 "GreaterThanThreshold" 900 1 "Sum" \
    "Name=Result,Value=error"

# AI generation latency > 30s (average over 3 periods)
create_alarm \
    "${APP_NAME}-ai-slow-generation" \
    "AI plan generation average latency above 30 seconds" \
    "${METRIC_NAMESPACE}" "AIGenerationLatency" 30000 "GreaterThanThreshold" 60 3 "Average" \
    "Name=Service,Value=backend"

# ---------------------------------------------------------------------------
# 5. Create CloudWatch log metric filters for error tracking
# ---------------------------------------------------------------------------
print_info "Creating log metric filters for error tracking..."

# Filter for ERROR-level logs in backend
aws logs put-metric-filter \
    --log-group-name "${BACKEND_LOG_GROUP}" \
    --filter-name "${APP_NAME}-backend-errors" \
    --filter-pattern "ERROR" \
    --metric-transformations \
        "metricName=BackendErrorCount,metricNamespace=${METRIC_NAMESPACE},metricValue=1,defaultValue=0" \
    --region "$AWS_REGION" 2>/dev/null || true

print_success "Log metric filter: ${APP_NAME}-backend-errors"

# Alarm on backend errors > 10 in 5 minutes
create_alarm \
    "${APP_NAME}-backend-error-logs" \
    "Backend ERROR log count above 10 in 5 minutes" \
    "${METRIC_NAMESPACE}" "BackendErrorCount" 10 "GreaterThanThreshold" 300 1 "Sum"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_status "Monitoring Setup Complete!"
echo ""
echo "  📊 Dashboard: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${DASHBOARD_NAME}"
echo ""
echo "  🔔 Alarms created:"
echo "     • ${APP_NAME}-backend-high-cpu (CPU > 80%)"
echo "     • ${APP_NAME}-backend-high-memory (Memory > 85%)"
if [[ -n "$ALB_ARN_SUFFIX" ]]; then
echo "     • ${APP_NAME}-alb-5xx-errors (5xx > 10/5min)"
echo "     • ${APP_NAME}-alb-high-latency (response > 2s)"
echo "     • ${APP_NAME}-backend-unhealthy-hosts"
fi
if [[ -n "$CF_DIST_ID" ]]; then
echo "     • ${APP_NAME}-cloudfront-5xx-errors (5xx rate > 5%)"
echo "     • ${APP_NAME}-cloudfront-high-error-rate (total errors > 10%)"
fi
echo "     • ${APP_NAME}-api-5xx-spike (app 5xx > 5/5min)"
echo "     • ${APP_NAME}-api-high-latency (p95 > 2000ms)"
echo "     • ${APP_NAME}-ai-generation-failures (failures > 3/15min)"
echo "     • ${APP_NAME}-ai-slow-generation (avg > 30s)"
echo "     • ${APP_NAME}-backend-error-logs (errors > 10/5min)"
echo ""
if [[ -n "$TOPIC_ARN" ]]; then
    echo "  📬 SNS topic: ${TOPIC_ARN}"
    if [[ -n "$ALERT_EMAIL" ]]; then
        echo "     Subscription pending confirmation: ${ALERT_EMAIL}"
    else
        echo "     No email subscription. Set ALERT_EMAIL env var and re-run, or subscribe manually."
    fi
fi
echo ""
