# AWS Deployment Guide — ShoreExplorer

> Last updated: 2026-02-22

This guide covers deploying ShoreExplorer to AWS. The application uses **DynamoDB** (AWS-managed, serverless) for storage and **Groq** (Llama 3.3 70B) for AI plan generation.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      AWS Infrastructure                       │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Amazon CloudFront (CDN)                              │    │
│  │  ┌────────────────┐   ┌──────────────────────┐       │    │
│  │  │  S3 Origin      │   │  ALB Origin (/api/*) │       │    │
│  │  │  (Default: /*)  │   │                      │       │    │
│  │  └──────┬─────────┘   └──────────┬───────────┘       │    │
│  └─────────┼────────────────────────┼───────────────────┘    │
│            │                        │                         │
│  ┌─────────┴─────────┐   ┌─────────┴──────────────────┐     │
│  │  S3 Bucket         │   │  ALB → ECS (Fargate)       │     │
│  │  (React SPA)       │   │  ┌──────────────┐          │     │
│  │  Static files      │   │  │   Backend    │          │     │
│  └────────────────────┘   │  │   FastAPI    │          │     │
│                           │  │  Port 8001   │          │     │
│                           │  └──────┬───────┘          │     │
│                           └─────────┼──────────────────┘     │
│                                     │                         │
│  ┌──────────────────────────────────┼───────────────────┐    │
│  │  Amazon DynamoDB (on-demand)     │                   │    │
│  │  Single table: shoreexplorer     │                   │    │
│  └──────────────────────────────────┘                   │    │
│                                                               │
│  AWS Secrets Manager → GROQ_API_KEY                           │
└───────────────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌──────────┐
   │  Groq API  │ │ Open-Meteo │ │ OSM Maps │
   │  (LLM)     │ │ (Weather)  │ │ (Tiles)  │
   └────────────┘ └────────────┘ └──────────┘
```

### Frontend: S3 + CloudFront

The React SPA is built as static files and deployed to an **S3 bucket**. A **CloudFront distribution** serves the content globally with:
- **Default behavior (`/*`)**: Serves static files from S3
- **Ordered behavior (`/api/*`)**: Proxies API requests to the ALB backend
- **Custom error responses**: 403/404 → `/index.html` (SPA client-side routing)
- **Origin Access Control (OAC)**: S3 bucket is not publicly accessible; only CloudFront can read it

### Backend: ECS Fargate + ALB

The FastAPI backend runs on ECS Fargate behind an ALB. CodeDeploy Blue/Green deployments provide zero-downtime updates.

### Zero-Downtime Deployment

- **Frontend**: Content-hashed assets (JS/CSS) uploaded to S3, then CloudFront invalidation for `/index.html` only. Old cached assets remain available until browsers fetch the new `index.html`.
- **Backend**: CodeDeploy Blue/Green swaps traffic between two target groups.

## Prerequisites

1. **AWS Account** — [Create an AWS account](https://aws.amazon.com/)
2. **Groq API Key** — Free from [Groq Console](https://console.groq.com/keys). See [GROQ_SETUP.md](/GROQ_SETUP.md) for details.
3. **Docker** — For building container images
4. **AWS CLI** — [Install AWS CLI](https://aws.amazon.com/cli/)

## Step 1: Set Up DynamoDB

DynamoDB is fully managed by AWS — no server to provision or maintain.

### Option A: Use the setup script (recommended)

```bash
./infra/aws/scripts/create-dynamodb-tables.sh <env>   # env = dev, test, or prod
```

### Option B: Manual setup via AWS Console

See [../aws/DYNAMODB-SETUP.md](../aws/DYNAMODB-SETUP.md) for a step-by-step guide.

The table uses a single-table design with composite keys (PK, SK) and a GSI for device-based queries.

## Step 2: Get a Groq API Key

1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign up for free (no credit card required)
3. Click **"Create API Key"**
4. Copy your key (starts with `gsk_...`)
5. Free tier: 30 requests/minute, 14,400 requests/day

See [GROQ_SETUP.md](/GROQ_SETUP.md) for detailed instructions.

## Step 3: Deployment Options

### Option A: Docker Compose on EC2 (Simple)

**Cost**: ~$7.50/month (t3.micro)

#### Launch and configure EC2

1. Launch Ubuntu 22.04 LTS t3.micro instance
2. Security Group rules: SSH (22) from your IP, HTTP (80) from 0.0.0.0/0, HTTPS (443) from 0.0.0.0/0
3. SSH in and install Docker:

```bash
sudo apt-get update
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
sudo apt-get install -y docker-compose-plugin
exit  # Log out and back in
```

#### Deploy

```bash
git clone https://github.com/slatewave-labs/cruise-planner.git
cd cruise-planner

# Create backend env
cat > backend/.env << EOF
DYNAMODB_TABLE_NAME=shoreexplorer
AWS_DEFAULT_REGION=us-east-1
GROQ_API_KEY=gsk_your-key-here
EOF

# Create frontend env
cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=http://your-ec2-public-ip:8001
EOF

docker compose up -d
```

Access: `http://your-ec2-public-ip:3000`

### Option B: AWS ECS with Fargate (Production)

**Cost**: ~$15-65/month depending on configuration

This is the recommended production setup with auto-scaling, load balancing, and CI/CD integration. The repository includes setup scripts:

```bash
# Run prerequisites check
./infra/aws/scripts/00-check-prerequisites.sh

# Step-by-step infrastructure setup (scripts 01-09)
./infra/aws/scripts/01-create-ecr-repos.sh
# ... see infra/aws/scripts/README.md for full list
```

See [../aws/scripts/README.md](../aws/scripts/README.md) for the complete deployment script reference.

### Option C: AWS App Runner (Serverless)

**Cost**: Pay per use, ~$5-25/month

1. Push Docker images to ECR
2. Create App Runner services pointing to the ECR images
3. Configure environment variables

## Step 4: Configure Domain and HTTPS (Optional)

1. **DNS:** See [../aws/DNS-SETUP.md](../aws/DNS-SETUP.md) for Route 53 configuration
2. **HTTPS:** See [../aws/HTTPS-SETUP.md](../aws/HTTPS-SETUP.md) for ACM certificate setup
3. **Quick ref:** See [../aws/DOMAIN-CONFIGURATION-QUICKREF.md](../aws/DOMAIN-CONFIGURATION-QUICKREF.md)

## Environment Variables Reference

### Backend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DYNAMODB_TABLE_NAME` | Yes | DynamoDB table name | `shoreexplorer` |
| `AWS_DEFAULT_REGION` | Yes | AWS region | `us-east-1` |
| `GROQ_API_KEY` | Yes | Groq API key for AI generation | `gsk_abc123...` |
| `DYNAMODB_ENDPOINT_URL` | No | DynamoDB Local endpoint (dev only) | `http://localhost:8000` |

### Frontend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL | `https://api.yourdomain.com` |

### Secrets Management

For ECS deployments, secrets are managed via AWS Secrets Manager — not GitHub Secrets. See [../aws/SECRETS-ARCHITECTURE.md](../aws/SECRETS-ARCHITECTURE.md) for the two-tier architecture.

## Monitoring & Maintenance

### Health Checks

```bash
curl http://your-backend-url:8001/api/health
```

### Logs

```bash
# Docker Compose
docker compose logs -f backend

# AWS ECS
aws logs tail "/ecs/shoreexplorer-test-backend" --follow --region us-east-1
```

### Cost Summary

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| DynamoDB | On-demand (25 GB free) | ~$0-1 |
| Groq API | Free tier (14,400 req/day) | $0 |
| EC2 t3.micro (Option A) | On-demand | ~$7.50 |
| ECS Fargate (Option B) | On-demand | ~$15-65 |
| **Total (Option A)** | | **~$7.50/month** |
| **Total (Option B)** | | **~$15-65/month** |

## Troubleshooting

For AWS infrastructure issues (502/503/504 errors, ALB, ECS), see [../aws/TROUBLESHOOTING.md](../aws/TROUBLESHOOTING.md).

Quick diagnostics:

```bash
./infra/aws/scripts/diagnose-alb.sh test   # Test environment
./infra/aws/scripts/diagnose-alb.sh prod   # Production
```

## Security Best Practices

1. **Secrets**: Use AWS Secrets Manager — never commit `.env` files or API keys
2. **Network**: Restrict security groups to necessary ports
3. **HTTPS**: Always use TLS in production — see [../aws/HTTPS-SETUP.md](../aws/HTTPS-SETUP.md)
4. **IAM**: Use least-privilege IAM roles for ECS tasks
5. **API Keys**: Rotate Groq API keys periodically
