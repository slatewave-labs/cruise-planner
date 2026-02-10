# TODO: Monitoring & Observability Setup for ShoreExplorer

## Overview
This document outlines the recommended monitoring and observability stack for ShoreExplorer.
All items below are **TODO** - to be implemented when moving to production.

---

## Recommended Free/Low-Cost Observability Stack

### 1. Application Performance Monitoring (APM)
**Recommended: Grafana Cloud (Free Tier)**
- URL: https://grafana.com/products/cloud/
- Free tier: 10K metrics, 50GB logs, 50GB traces per month
- Includes Grafana dashboards, Loki (logs), Tempo (traces), Prometheus (metrics)

**Alternative: New Relic (Free Tier)**
- URL: https://newrelic.com/pricing
- Free tier: 100GB/month data ingest, 1 full-platform user
- APM, infrastructure monitoring, logs, distributed tracing

### 2. Error Tracking
**Recommended: Sentry (Free Tier)**
- URL: https://sentry.io/pricing/
- Free tier: 5K errors/month, 10K performance transactions
- SDKs available for both Python (FastAPI) and React

**TODO: Install Sentry SDKs**
```bash
# Backend
pip install sentry-sdk[fastapi]

# Frontend
yarn add @sentry/react
```

### 3. Uptime Monitoring
**Recommended: UptimeRobot (Free Tier)**
- URL: https://uptimerobot.com/
- Free tier: 50 monitors, 5-minute check intervals
- HTTP(S), keyword, ping monitors
- Email/SMS/Slack alerts

### 4. Log Aggregation
**Recommended: Grafana Loki (via Grafana Cloud)**
- Already included in Grafana Cloud free tier
- Structured logging with labels
- LogQL query language

**TODO: Structured logging setup**
```python
# Backend: Use Python's structured logging
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        return json.dumps(log_data)
```

### 5. Health Checks
**Already implemented**: `GET /api/health`

**TODO: Enhanced health checks**
- MongoDB connection status
- External API reachability (Open-Meteo, Gemini)
- Response time metrics
- Memory/CPU usage

### 6. Custom Metrics to Track
- API response times (p50, p95, p99)
- Plan generation success/failure rate
- Weather API call success rate
- Active trips count
- Plans generated per day
- Error rate by endpoint
- Frontend page load times
- Map render times

### 7. Alerting Rules (TODO)
- API error rate > 5% for 5 minutes
- Response time p95 > 3 seconds
- MongoDB connection failures
- External API (Open-Meteo, Gemini) failures > 3 consecutive
- Plan generation failure rate > 10%
- Disk usage > 80%

---

## Implementation Priority
1. **P0**: Sentry error tracking (backend + frontend)
2. **P0**: Structured logging
3. **P1**: Health check endpoints (enhanced)
4. **P1**: UptimeRobot for endpoint monitoring
5. **P2**: Grafana Cloud for metrics and dashboards
6. **P2**: Custom business metrics
7. **P3**: Distributed tracing
