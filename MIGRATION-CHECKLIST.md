# Migration Checklist - Emergent.sh to AWS

Use this checklist to ensure a smooth migration from Emergent.sh to AWS with MongoDB Atlas M0.

## Pre-Migration

- [ ] Review [HANDOVER.md](/HANDOVER.md) to understand the migration scope
- [ ] Review [AWS-DEPLOYMENT.md](/infra/deployment/AWS-DEPLOYMENT.md) for deployment details
- [ ] Backup any existing data from Emergent MongoDB instance (if applicable)

## MongoDB Atlas M0 Setup

- [ ] Create MongoDB Atlas account at [cloud.mongodb.com](https://cloud.mongodb.com/)
- [ ] Create M0 Cluster (free tier):
  - Provider: AWS
  - Region: Choose based on your target users
  - Tier: M0 Sandbox
  - Cluster name: `shoreexplorer-cluster`
- [ ] Configure Network Access:
  - Add IP whitelist: 0.0.0.0/0 (for development)
  - For production: Restrict to your AWS VPC CIDR
- [ ] Create Database User:
  - Username: `shoreexplorer`
  - Auto-generate secure password
  - Privileges: Read and write to any database
- [ ] Get connection string:
  - Format: `mongodb+srv://shoreexplorer:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`
  - Save this for later use
- [ ] Create database and collections (optional, auto-created on first use):
  - Database: `shoreexplorer`
  - Collections: `trips`, `plans`

## Google Gemini API Setup

- [ ] Go to [Google AI Studio](https://aistudio.google.com/apikey)
- [ ] Sign in with Google account
- [ ] Click "Create API Key"
- [ ] Copy the API key (starts with `AIza...`)
- [ ] Note free tier limits:
  - 15 requests per minute
  - 1500 requests per day

## Local Development Setup

- [ ] Update `backend/.env`:
  ```
  MONGO_URL=mongodb+srv://shoreexplorer:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
  DB_NAME=shoreexplorer
  GOOGLE_API_KEY=AIzaSy...your-key-here
  ```
- [ ] Update `frontend/.env`:
  ```
  REACT_APP_BACKEND_URL=http://localhost:8001
  ```
- [ ] Install backend dependencies:
  ```bash
  cd backend
  pip install -r requirements.txt
  ```
- [ ] Test backend starts:
  ```bash
  cd backend
  uvicorn server:app --host 0.0.0.0 --port 8001 --reload
  ```
- [ ] Verify health endpoint:
  ```bash
  curl http://localhost:8001/api/health
  # Should return: {"status":"ok"}
  ```
- [ ] Install frontend dependencies:
  ```bash
  cd frontend
  yarn install
  ```
- [ ] Test frontend starts:
  ```bash
  cd frontend
  yarn start
  ```
- [ ] Test full application:
  - Create a trip
  - Add a port
  - Generate a plan (this tests the Google Gemini API integration)

## Data Migration (if applicable)

If you have existing data in Emergent MongoDB:

- [ ] Export data from Emergent MongoDB:
  ```bash
  mongodump --uri="mongodb://localhost:27017" --db=shoreexplorer --out=./backup
  ```
- [ ] Import data to MongoDB Atlas:
  ```bash
  mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/shoreexplorer" ./backup/shoreexplorer
  ```
- [ ] Verify data migrated correctly:
  - Check trips collection
  - Check plans collection

## AWS Deployment

Choose one of the deployment options below:

### Option A: Docker Compose on EC2

- [ ] Launch EC2 instance (Ubuntu 22.04, t3.micro)
- [ ] Configure Security Group (ports 22, 80, 443, 3000, 8001)
- [ ] Install Docker and Docker Compose
- [ ] Clone repository to EC2
- [ ] Create `.env` file with production values
- [ ] Update `REACT_APP_BACKEND_URL` with EC2 public IP
- [ ] Run: `docker compose up -d`
- [ ] Verify services are running: `docker compose ps`
- [ ] Test application at `http://ec2-public-ip:3000`

### Option B: AWS App Runner

- [ ] Create ECR repositories for backend and frontend
- [ ] Build and push Docker images to ECR
- [ ] Create App Runner service for backend with environment variables
- [ ] Create App Runner service for frontend with backend URL
- [ ] Update frontend with App Runner backend URL
- [ ] Verify services are running

### Option C: AWS ECS with Fargate

- [ ] Follow ECS setup in AWS-DEPLOYMENT.md
- [ ] Configure task definitions
- [ ] Set up load balancer
- [ ] Deploy services

## Post-Deployment Verification

- [ ] Health check passes: `GET /api/health`
- [ ] Can create a trip: `POST /api/trips`
- [ ] Can add ports to trip: `POST /api/trips/{trip_id}/ports`
- [ ] Weather data loads: `GET /api/weather?latitude=X&longitude=Y`
- [ ] Plan generation works end-to-end:
  - Create trip
  - Add port
  - Generate plan
  - Verify plan contains activities, map works, costs are shown
- [ ] Frontend loads without errors
- [ ] Maps display correctly (OpenStreetMap tiles load)
- [ ] No console errors in browser dev tools
- [ ] Terms & Conditions page shows updated Gemini API reference (not Emergent)

## Documentation Updates

- [ ] Update any internal documentation with new URLs
- [ ] Update any bookmarks to new deployment URL
- [ ] Share new URLs with team/users
- [ ] Document any environment-specific configurations

## Production Hardening (Recommended)

- [ ] Set up HTTPS with SSL/TLS certificate
- [ ] Configure custom domain
- [ ] Restrict MongoDB Atlas IP whitelist to AWS VPC only
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Implement rate limiting on API endpoints
- [ ] Add error tracking (e.g., Sentry)
- [ ] Set up log aggregation (e.g., CloudWatch)
- [ ] Create disaster recovery plan
- [ ] Document runbook for common operations

## Rollback Plan (If Needed)

If you need to rollback to Emergent:

- [ ] Restore `emergentintegrations` dependency in requirements.txt
- [ ] Revert backend/server.py LLM integration code
- [ ] Change `GOOGLE_API_KEY` back to `EMERGENT_LLM_KEY`
- [ ] Update frontend URL back to Emergent preview URL
- [ ] Redeploy application

## Clean Up Old Resources

After successful migration and validation:

- [ ] Archive or delete Emergent project (if no longer needed)
- [ ] Remove old environment variables
- [ ] Update CI/CD pipelines (if applicable)
- [ ] Clean up old documentation

## Notes

- Keep this checklist updated as you discover new steps
- Document any issues encountered for future reference
- Share learnings with the team

---

## Support Resources

- **HANDOVER.md**: Complete migration guide
- **AWS-DEPLOYMENT.md**: Detailed AWS setup instructions
- **README.md**: Local development setup
- **GitHub Issues**: Report problems or ask questions
