# ShoreExplorer — Monitoring & Observability

> Last updated: 2026-02-19

This document describes the monitoring, dashboarding, and alerting infrastructure for ShoreExplorer.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CloudWatch                                                      │
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐    │
│  │  Dashboard    │   │  Alarms      │   │  Log Metric       │    │
│  │  (per env)    │   │  (13 total)  │   │  Filters          │    │
│  └──────────────┘   └──────┬───────┘   └───────────────────┘    │
│                            │                                      │
│                     ┌──────▼───────┐                              │
│                     │  SNS Topic   │                              │
│                     │  (alerts)    │                              │
│                     └──────┬───────┘                              │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Email / Slack  │
                    │  (subscribers)  │
                    └─────────────────┘
```

## What's Monitored

### Infrastructure Metrics (automatic — via AWS)

| Metric | Source | Dashboard Panel |
|--------|--------|-----------------|
| CPU utilization | ECS/Fargate | Backend CPU |
| Memory utilization | ECS/Fargate | Backend Memory |
| Request count | ALB | Request Count |
| HTTP 5xx errors | ALB | 5xx Errors (Server) |
| HTTP 4xx errors | ALB | 4xx Errors (Client) |
| Target response time (p50/p95/p99) | ALB | Target Response Time |
| Healthy/unhealthy host count | ALB target groups | Host Health |
| CloudFront requests | CloudFront | Frontend Request Count |
| CloudFront error rate | CloudFront | Frontend Error Rate |

### Application Metrics (custom — emitted by backend)

| Metric | Namespace | Dimensions |
|--------|-----------|------------|
| `RequestCount` | `shoreexplorer/<env>` | `StatusClass` (2xx/4xx/5xx), `Endpoint` |
| `ResponseLatency` | `shoreexplorer/<env>` | `Service` (backend) |
| `AIGenerationCount` | `shoreexplorer/<env>` | `Result` (success/error) |
| `AIGenerationLatency` | `shoreexplorer/<env>` | `Service` (backend) |
| `BackendErrorCount` | `shoreexplorer/<env>` | (from log metric filter) |

Custom metrics are published by the `backend/metrics.py` module using a background
thread that batches and flushes to CloudWatch every 60 seconds.  This is controlled
by the `ENABLE_CLOUDWATCH_METRICS=true` environment variable (set automatically in
ECS task definitions by the deploy workflows).

## Alarms

| Alarm | Condition | Severity |
|-------|-----------|----------|
| `*-backend-high-cpu` | CPU > 80% for 3 min | Warning |
| `*-backend-high-memory` | Memory > 85% for 3 min | Warning |
| `*-alb-5xx-errors` | 5xx > 10 in 5 min | Critical |
| `*-alb-high-latency` | Response time > 2s for 3 min | Warning |
| `*-backend-unhealthy-hosts` | Unhealthy > 0 for 2 min | Critical |
| `*-api-5xx-spike` | App 5xx > 5 in 5 min | Critical |
| `*-api-high-latency` | App p95 latency > 2s for 3 min | Warning |
| `*-ai-generation-failures` | AI failures > 3 in 15 min | Warning |
| `*-ai-slow-generation` | AI avg latency > 30s for 3 min | Warning |
| `*-backend-error-logs` | ERROR logs > 10 in 5 min | Warning |

All alarms notify via the `shoreexplorer-<env>-alarms` SNS topic.

## Setup

### Automatic (via CD pipeline)

Monitoring is automatically provisioned during every deployment via the
`Setup monitoring (dashboard + alarms)` step in both:

- `.github/workflows/deploy-test.yml`
- `.github/workflows/deploy-prod.yml`

The step runs `infra/aws/scripts/10-setup-monitoring.sh` and is idempotent.

### Manual

```bash
# Set up monitoring for test environment
./infra/aws/scripts/10-setup-monitoring.sh test

# Set up monitoring for production (optionally with email alerts)
ALERT_EMAIL=oncall@example.com ./infra/aws/scripts/10-setup-monitoring.sh prod
```

### Subscribing to Alerts

1. **Email**: Set the `ALERT_EMAIL` GitHub Secret (or env var) and re-run the
   monitoring setup. Confirm the subscription via the email AWS sends.

2. **Slack**: Create an SNS → Lambda → Slack integration, or subscribe a
   [Slack email channel](https://slack.com/help/articles/206819278) to the
   SNS topic.

3. **PagerDuty / Opsgenie**: Subscribe their HTTPS endpoint to the SNS topic.

## Dashboard Access

After deployment, the dashboard URL is shown in the GitHub Actions job summary:

```
https://<region>.console.aws.amazon.com/cloudwatch/home?region=<region>#dashboards:name=shoreexplorer-<env>-dashboard
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_CLOUDWATCH_METRICS` | Enable custom metric publishing | `false` |
| `ENVIRONMENT` | Environment name for metric namespace | `dev` |
| `AWS_DEFAULT_REGION` | AWS region for CloudWatch client | `us-east-1` |
| `ALERT_EMAIL` | Email for SNS alarm subscriptions | (none) |

## Troubleshooting

### Metrics not appearing in CloudWatch

1. Verify `ENABLE_CLOUDWATCH_METRICS=true` is set in the ECS task definition
2. Check the ECS task role has `cloudwatch:PutMetricData` permission
3. Check backend logs for "Failed to publish CloudWatch metrics batch" messages

### Alarms stuck in INSUFFICIENT_DATA

This is normal for new alarms — they enter INSUFFICIENT_DATA until the first
metric data arrives.  For custom application metrics, this resolves once the
backend receives its first requests.

### Dashboard shows no data for ALB widgets

Ensure the ALB and target groups exist before running the monitoring setup script.
Re-run `10-setup-monitoring.sh` after creating the ALB to populate the dashboard
with correct ARN suffixes.
