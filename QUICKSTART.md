# Quick Start - ShoreExplorer on AWS

Get ShoreExplorer running on AWS in under 30 minutes!

## Prerequisites

- AWS Account
- MongoDB Atlas Account (free)
- Google Account (for Gemini API)
- Docker installed locally (for testing)

## Step 1: Set Up MongoDB Atlas M0 (5 minutes)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com/) and sign up/in
2. Click **"Create"** → **"Shared Cluster"**
3. Select:
   - Provider: **AWS**
   - Region: **us-east-1** (or closest to you)
   - Tier: **M0 Sandbox** (FREE)
4. Click **"Create Cluster"**
5. While cluster creates, click **"Database Access"** → **"Add New Database User"**:
   - Username: `shoreexplorer`
   - Password: Click **"Autogenerate Secure Password"** and save it
   - Privileges: **Read and write to any database**
   - Click **"Add User"**
6. Click **"Network Access"** → **"Add IP Address"**:
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Click **"Confirm"**
7. Go back to **"Clusters"** → Click **"Connect"**:
   - Choose **"Connect your application"**
   - Copy the connection string (looks like `mongodb+srv://shoreexplorer:<password>@...`)
   - Replace `<password>` with your database password

## Step 2: Get Google Gemini API Key (2 minutes)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with Google
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

## Step 3: Deploy to AWS EC2 (15 minutes)

### Launch EC2 Instance

1. Go to AWS EC2 Console → **"Launch Instance"**
2. Choose:
   - Name: `shoreexplorer`
   - AMI: **Ubuntu Server 22.04 LTS**
   - Instance type: **t3.micro** (eligible for free tier)
   - Key pair: Create new or use existing
   - Security group: Allow **SSH (22)**, **HTTP (80)**, **Custom TCP (3000, 8001)**
3. Click **"Launch Instance"**
4. Wait for instance to start, note the **Public IPv4 address**

### Install Docker

SSH into your instance:

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

Install Docker:

```bash
# Update packages
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Log out and back in for group changes
exit
```

SSH back in:

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Deploy ShoreExplorer

```bash
# Clone repository
git clone https://github.com/billysandle95/cruise-planner.git
cd cruise-planner

# Create environment file
cat > .env << 'EOF'
GOOGLE_API_KEY=your-google-api-key-here
MONGO_URL=mongodb+srv://shoreexplorer:your-password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=shoreexplorer
REACT_APP_BACKEND_URL=http://your-ec2-public-ip:8001
EOF

# Edit the .env file with your actual values
nano .env
# Press Ctrl+X, then Y, then Enter to save

# Start services
docker compose up -d

# Check logs
docker compose logs -f
```

## Step 4: Access Your Application (2 minutes)

Open your browser and go to:

```
http://your-ec2-public-ip:3000
```

You should see the ShoreExplorer landing page!

### Test It Out

1. Click **"Plan Your Cruise"**
2. Create a trip (e.g., "Mediterranean Cruise")
3. Add a port (e.g., Barcelona)
4. Click **"Generate Day Plan"**
5. Watch the AI create your custom itinerary!

## Troubleshooting

### Backend won't start

Check MongoDB connection:

```bash
docker compose logs backend | grep -i mongo
```

Make sure:
- MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Connection string password is correct (no special characters need URL encoding)

### Plan generation fails

Check Google API key:

```bash
docker compose logs backend | grep -i google
```

Make sure:
- API key is correct (starts with `AIza`)
- You haven't exceeded free tier limits

### Can't access from browser

Check security group:
- Port 3000 must be open to 0.0.0.0/0
- Port 8001 must be open to 0.0.0.0/0

### Frontend shows connection error

Update backend URL in `.env`:

```bash
nano .env
# Change REACT_APP_BACKEND_URL to include your EC2 public IP
# Save and restart:
docker compose down
docker compose up -d
```

## Next Steps

- **Set up HTTPS**: Use Let's Encrypt with Nginx reverse proxy
- **Custom Domain**: Point your domain to EC2 IP
- **Monitoring**: Set up CloudWatch logs
- **Backups**: Configure automated MongoDB Atlas backups
- **Scale**: Move to ECS or App Runner for auto-scaling

## Full Documentation

- **Complete Setup**: See [AWS-DEPLOYMENT.md](/infra/deployment/AWS-DEPLOYMENT.md)
- **Migration Guide**: See [HANDOVER.md](/HANDOVER.md)
- **Migration Checklist**: See [MIGRATION-CHECKLIST.md](/MIGRATION-CHECKLIST.md)
- **Local Development**: See [README.md](/README.md)

## Support

Having issues? Check:
1. [HANDOVER.md](/HANDOVER.md) - Complete technical details
2. [GitHub Issues](https://github.com/billysandle95/cruise-planner/issues) - Report problems

---

**Estimated Total Cost**: ~$7.50/month for EC2 t3.micro + $0 for MongoDB Atlas M0 + $0 for Gemini API free tier = **~$7.50/month**
