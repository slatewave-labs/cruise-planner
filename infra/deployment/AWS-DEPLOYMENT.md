# AWS Deployment Guide - ShoreExplorer

This guide covers deploying ShoreExplorer to AWS using a lean, cost-effective architecture with MongoDB Atlas M0 (free tier).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     AWS Infrastructure                   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Amazon ECS / EC2 / App Runner                   │  │
│  │                                                   │  │
│  │  ┌──────────────┐        ┌──────────────┐       │  │
│  │  │   Frontend    │        │   Backend    │       │  │
│  │  │  React (SPA)  │        │   FastAPI    │       │  │
│  │  │  Port 80      │        │  Port 8001   │       │  │
│  │  └──────────────┘        └──────────────┘       │  │
│  │                                │                  │  │
│  └────────────────────────────────┼──────────────────┘  │
│                                   │                     │
└───────────────────────────────────┼─────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   MongoDB Atlas M0        │
                    │   (Free Tier - 512MB)     │
                    │   Managed by MongoDB      │
                    └───────────────────────────┘
                                    │
                    ┌───────────────────────────┐
                    │   Google Gemini API       │
                    │   (AI Plan Generation)    │
                    └───────────────────────────┘
```

## Prerequisites

1. **AWS Account**: [Create an AWS account](https://aws.amazon.com/)
2. **MongoDB Atlas Account**: [Create an Atlas account](https://www.mongodb.com/cloud/atlas/register)
3. **Google Cloud Account**: For Gemini API key
4. **Docker**: For local testing and building images

## Step 1: Set Up MongoDB Atlas M0 (Free Tier)

### 1.1 Create a Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Click "Create" → "Shared Cluster"
3. Select:
   - **Provider**: AWS
   - **Region**: Choose the region where you plan to deploy your application or closest to your target users (e.g., us-east-1 for US East Coast)
   - **Tier**: M0 Sandbox (Free)
   - **Cluster Name**: shoreexplorer-cluster
4. Click "Create Cluster"

### 1.2 Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
   - For production, restrict to your AWS VPC CIDR block
4. Click "Confirm"

### 1.3 Create Database User

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Set username: `shoreexplorer`
5. Auto-generate a secure password and save it
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### 1.4 Get Connection String

1. Go to "Clusters" and click "Connect"
2. Select "Connect your application"
3. Choose "Driver: Python" and "Version: 3.12 or later"
4. Copy the connection string:
   ```
   mongodb+srv://shoreexplorer:<password>@shoreexplorer-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your database user password

### 1.5 Create Database and Collections

The application will auto-create collections, but you can pre-create them:

1. Click "Browse Collections"
2. Click "Add My Own Data"
3. Database name: `shoreexplorer`
4. Collection name: `trips`
5. Create another collection: `plans`

## Step 2: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy your key (starts with `AIza...`) and paste it into the `.env` file
5. Free tier limits: 15 requests per minute, 1500 requests per day (verify current limits at [Google AI Studio](https://aistudio.google.com/apikey))

## Step 3: Deployment Options

### Option A: Docker Compose on EC2 (Recommended for Simple Setup)

**Cost**: ~$5-10/month for t3.micro instance

#### 3.1 Launch EC2 Instance

1. Launch Ubuntu 22.04 LTS t3.micro instance
2. Security Group rules:
   - SSH (22): Your IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
3. Create or select a key pair

#### 3.2 Install Docker

SSH into your instance and run:

```bash
# Update packages
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Log out and back in for group changes to take effect
exit
```

#### 3.3 Deploy Application

```bash
# Clone repository
git clone https://github.com/billysandle95/cruise-planner.git
cd cruise-planner

# Create .env file
cat > .env << EOF
GROQ_API_KEY=gsk_your-groq-api-key-here
MONGO_URL=mongodb+srv://shoreexplorer:yourpassword@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=shoreexplorer
REACT_APP_BACKEND_URL=http://your-ec2-public-ip:8001
EOF

# Start services
docker compose up -d

# Check logs
docker compose logs -f
```

#### 3.4 Access Application

- Frontend: `http://your-ec2-public-ip:3000`
- Backend API: `http://your-ec2-public-ip:8001`
- Health check: `http://your-ec2-public-ip:8001/api/health`

### Option B: AWS App Runner (Serverless)

**Cost**: Pay per use, ~$5-25/month depending on traffic

#### 3.1 Create ECR Repositories

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name shoreexplorer-backend --region us-east-1
aws ecr create-repository --repository-name shoreexplorer-frontend --region us-east-1

# Build and push backend
cd backend
docker build -t shoreexplorer-backend .
docker tag shoreexplorer-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/shoreexplorer-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/shoreexplorer-backend:latest

# Build and push frontend
cd ../frontend
docker build --build-arg REACT_APP_BACKEND_URL=https://your-backend-url.com -t shoreexplorer-frontend .
docker tag shoreexplorer-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/shoreexplorer-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/shoreexplorer-frontend:latest
```

#### 3.2 Create App Runner Services

1. Go to AWS App Runner console
2. Create backend service:
   - Source: Container registry → ECR
   - Container image: Select backend image
   - Port: 8001
   - Environment variables:
     - `GROQ_API_KEY`
     - `MONGO_URL`
     - `DB_NAME`
3. Create frontend service:
   - Source: Container registry → ECR
   - Container image: Select frontend image
   - Port: 80

### Option C: AWS ECS with Fargate

**Cost**: ~$15-30/month for small workloads

This provides auto-scaling and load balancing. See AWS ECS documentation for detailed setup.

## Step 4: Configure Domain and HTTPS (Optional)

### 4.1 Register Domain

Use Route 53 or any domain registrar.

### 4.2 Set Up SSL with AWS Certificate Manager

1. Request a certificate in ACM for your domain
2. Validate domain ownership
3. Configure ALB to use the certificate

### 4.3 Update DNS

Point your domain to:
- EC2 public IP, or
- ALB DNS name, or
- App Runner default domain

## Step 5: Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key for AI plan generation | `gsk_abc123...` |
| `MONGO_URL` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/...` |
| `DB_NAME` | Database name | `shoreexplorer` |
| `REACT_APP_BACKEND_URL` | Backend URL for frontend | `https://api.yourdomain.com` |

## Step 6: Monitoring and Maintenance

### Health Checks

- Backend: `GET /api/health` → `{"status":"ok"}`
- Frontend: `GET /` → Returns index.html

### Logs

For Docker Compose:
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

For App Runner:
- View logs in CloudWatch Logs console

### Backups

MongoDB Atlas provides:
- Continuous backups (on M0: snapshots)
- Point-in-time recovery (paid tiers)

Download backups:
```bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/shoreexplorer" --out=./backup
```

## Step 7: Cost Optimization

### Current Architecture Costs

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| MongoDB Atlas M0 | Free | $0 |
| Google Gemini API | Free tier | $0 (up to 1500 requests/day) |
| EC2 t3.micro | On-demand | ~$7.50 |
| **Total** | | **~$7.50/month** |

### Scaling Up

When you outgrow free tiers:
- MongoDB: M10 cluster ($9/month for 2GB storage)
- Gemini: Pay-as-you-go ($0.001-0.002 per 1K tokens)
- EC2: Use reserved instances for 30-40% savings

## Troubleshooting

> **For comprehensive AWS infrastructure troubleshooting, see [../aws/TROUBLESHOOTING.md](../aws/TROUBLESHOOTING.md)**

### Quick Diagnostics (AWS ECS Deployments)

Run the automated diagnostic script:

```bash
./infra/aws/scripts/diagnose-alb.sh test   # For test environment
./infra/aws/scripts/diagnose-alb.sh prod  # For production
```

This checks:
- ALB status and security groups
- Target group health
- ECS service status
- Connectivity tests

### Backend fails to start

**Check MongoDB connection:**
```bash
docker compose logs backend | grep -i mongo
```

**For AWS ECS:**
```bash
aws logs tail "/ecs/shoreexplorer-test-backend" --follow --region us-east-1
```

**Verify Atlas IP whitelist includes 0.0.0.0/0 or your AWS VPC CIDR**

### Plan generation fails

**Check Gemini API key:**
```bash
curl -X POST "http://localhost:8001/api/plans/generate" \
  -H "Content-Type: application/json" \
  -d '{"trip_id":"test","port_id":"test","preferences":{"party_type":"couple","activity_level":"moderate","transport_mode":"mixed","budget":"low"}}'
```

**Verify rate limits haven't been exceeded**

### Connection closed / Can't access deployment

**Important:** AWS ALB uses HTTP (port 80) by default, not HTTPS.

- Use `http://` not `https://` when accessing the ALB URL
- Run diagnostics: `./infra/aws/scripts/diagnose-alb.sh test`
- Check security groups allow port 80 from 0.0.0.0/0
- See [../aws/TROUBLESHOOTING.md](../aws/TROUBLESHOOTING.md) for detailed diagnosis

### Frontend can't reach backend

**Check CORS configuration in backend/server.py:**
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

**Update frontend environment:**
```bash
# In frontend/.env
REACT_APP_BACKEND_URL=http://your-actual-backend-url:8001
```

## Security Best Practices

1. **Environment Variables**: Never commit .env files
2. **MongoDB**: Restrict IP whitelist to your AWS VPC
3. **API Keys**: Rotate keys periodically
4. **HTTPS**: Always use SSL/TLS in production
5. **Secrets**: Use AWS Secrets Manager for sensitive data

## Next Steps

- [ ] Set up custom domain
- [ ] Configure HTTPS with Let's Encrypt or ACM
- [ ] Set up CloudWatch monitoring
- [ ] Configure automated backups
- [ ] Implement CI/CD pipeline (see `/infra/github-actions/`)
- [ ] Add rate limiting for API endpoints
- [ ] Set up error tracking (Sentry, Rollbar)

## Support

For issues or questions:
- GitHub Issues: [cruise-planner/issues](https://github.com/billysandle95/cruise-planner/issues)
- Documentation: [HANDOVER.md](/HANDOVER.md)
