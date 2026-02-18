# AWS Manual Setup Guide - ShoreExplorer

> **This guide is written for non-technical users.** Follow each step carefully.
> After completing these manual steps, you can run the automated scripts to create everything else.

---

## What You'll Set Up

| Step | What | Time | Difficulty |
|------|------|------|------------|
| 1 | Create an AWS Account | 10 min | Easy |
| 2 | Install the AWS command-line tool | 5 min | Easy |
| 3 | Create a "robot user" for deployments | 10 min | Medium |
| 4 | Set up MongoDB Atlas (free database) | 10 min | Easy |
| 5 | Get a Groq API key | 5 min | Easy |
| 6 | Add secrets to GitHub | 5 min | Easy |

**Total time: ~45 minutes**

---

## Step 1: Create an AWS Account

> You need an AWS account to host the application. AWS has a free tier for 12 months.

1. Open your web browser and go to: **https://aws.amazon.com/**
2. Click the orange **"Create an AWS Account"** button (top-right corner)
3. Enter your email address and choose an account name (e.g., "ShoreExplorer")
4. Click **"Verify email address"** — check your email for a code and enter it
5. Create a password for the account
6. Choose **"Personal"** for account type
7. Enter your full name, phone number, and address
8. Enter your credit card details (you won't be charged for the free tier)
9. Verify your phone number via text or call
10. Choose the **"Basic support - Free"** plan
11. Click **"Complete sign up"**

> **Important:** Write down your account email and password somewhere safe.

### Find Your AWS Account ID

You'll need this number later:

1. Log in to AWS at **https://console.aws.amazon.com/**
2. Click your account name in the top-right corner
3. Your **Account ID** is the 12-digit number shown (e.g., `123456789012`)
4. **Write this number down** — you'll need it later

---

## Step 2: Install the AWS Command-Line Tool (CLI)

> The AWS CLI lets you run commands to create cloud resources. Think of it like a remote control for AWS.

### On Mac:

1. Open the **Terminal** app (search for "Terminal" in Spotlight, or find it in Applications → Utilities)
2. Copy and paste this command, then press Enter:
   ```bash
   brew install awscli
   ```
   > If you don't have `brew`, install it first by pasting this into Terminal:
   > ```bash
   > /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   > ```

3. Verify it installed correctly by running:
   ```bash
   aws --version
   ```
   You should see something like `aws-cli/2.x.x`

### On Windows:

1. Download the installer from: **https://awscli.amazonaws.com/AWSCLIV2.msi**
2. Double-click the downloaded file and follow the installer
3. Open **Command Prompt** and type:
   ```bash
   aws --version
   ```

### On Linux:

1. Open a terminal and run:
   ```bash
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

---

## Step 3: Create an IAM User for Deployments

> This creates a special "robot user" that GitHub will use to deploy your app.
> Think of it like giving a trusted assistant a key to your AWS account, but only the keys they need.

### 3a. Create the IAM User in the AWS Console

1. Go to **https://console.aws.amazon.com/iam/**
2. In the left sidebar, click **"Users"**
3. Click the **"Create user"** button
4. For **User name**, type: `shoreexplorer-deployer`
5. Click **"Next"**
6. Select **"Attach policies directly"**
7. In the search box, search for and **tick the checkbox** next to each of these policies:
   - `AmazonECS_FullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `ElasticLoadBalancingFullAccess`
   - `AmazonVPCFullAccess`
   - `SecretsManagerReadWrite`
   - `CloudWatchLogsFullAccess`
   - `IAMFullAccess`
8. Click **"Next"**
9. Click **"Create user"**

### 3b. Create Access Keys for the User

1. Click on the user name **"shoreexplorer-deployer"** you just created
2. Click the **"Security credentials"** tab
3. Scroll down to **"Access keys"** and click **"Create access key"**
4. Select **"Command Line Interface (CLI)"**
5. Tick the confirmation checkbox at the bottom
6. Click **"Next"** then **"Create access key"**
7. **IMPORTANT:** You will see two values:
   - **Access key ID** (looks like: `AKIAIOSFODNN7EXAMPLE`)
   - **Secret access key** (looks like: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
8. **Copy both values and save them somewhere safe** (you won't be able to see the secret key again!)
9. Click **"Done"**

### 3c. Configure AWS CLI with Your Credentials

1. Open Terminal (or Command Prompt on Windows)
2. Run this command:
   ```bash
   aws configure
   ```
3. When prompted, enter:
   - **AWS Access Key ID:** Paste the Access Key ID from step 3b
   - **AWS Secret Access Key:** Paste the Secret Access Key from step 3b
   - **Default region name:** Type `us-east-1` (or your preferred region)
   - **Default output format:** Type `json`

4. Verify it works by running:
   ```bash
   aws sts get-caller-identity
   ```
   You should see your account ID and user name. If you see an error, double-check your keys.

---

## Step 4: Set Up MongoDB Atlas (Free Database)

> MongoDB Atlas is a cloud database service. The free tier gives you 512MB of storage — more than enough to start.

1. Go to **https://www.mongodb.com/cloud/atlas/register**
2. Create an account (you can sign up with Google)
3. When prompted, choose:
   - **Organization name:** ShoreExplorer
   - **Project name:** shoreexplorer

### 4a. Create a Free Cluster

1. Click **"Build a Database"** (or **"Create"**)
2. Select **"M0 FREE"** (the free forever option)
3. Choose:
   - **Provider:** AWS
   - **Region:** US East (N. Virginia) — or whichever is closest to you
   - **Cluster Name:** `shoreexplorer-cluster`
4. Click **"Create Deployment"**

### 4b. Create a Database User

1. You'll be prompted to create a database user
2. Choose **"Username and Password"**
3. Set:
   - **Username:** `shoreexplorer`
   - **Password:** Click "Autogenerate Secure Password"
4. **Copy the password and save it!**
5. Click **"Create Database User"**

### 4c. Allow Connections from Anywhere

1. Under **"Where would you like to connect from?"**, choose **"My Local Environment"**
2. Click **"Add IP Address"**
3. In the IP Address field, type: `0.0.0.0/0`
   > This allows connections from anywhere. It's fine for getting started.
4. Click **"Add Entry"**
5. Click **"Finish and Close"**

### 4d. Get Your Connection String

1. On the cluster overview page, click **"Connect"**
2. Choose **"Drivers"**
3. Select **Python** and version **3.12 or later**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://shoreexplorer:<password>@shoreexplorer-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>` with the password you saved in step 4b**
6. **Save this complete connection string** — you'll need it in Step 6

---

## Step 5: Get a Groq API Key

> The Groq API powers the AI that generates day plans. The free tier gives you 14,400 requests per day.

1. Go to **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. If prompted, select an existing Google Cloud project or create a new one
5. Your API key will appear (it starts with `AIza...`)
6. **Copy and save this key** — you'll need it in Step 6

---

## Step 6: Add Secrets to GitHub

> GitHub needs your AWS credentials and API keys to deploy the app automatically.

1. Go to your GitHub repository: **https://github.com/billysandle95/cruise-planner**
2. Click **"Settings"** (tab at the top of the repo)
3. In the left sidebar, click **"Secrets and variables"** → **"Actions"**
4. Click the **"New repository secret"** button
5. Add each of these secrets one by one (click "New repository secret" each time):

| Secret Name | What to Put | Where You Got It |
|-------------|-------------|------------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key ID | Step 3b |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret access key | Step 3b |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID | Step 1 |
| `AWS_REGION` | `us-east-1` (or your chosen region) | Step 3c |
| `MONGO_URL` | Your full MongoDB connection string | Step 4d |
| `GROQ_API_KEY` | Your Groq API key | Step 5 |

> **How to add each secret:**
> 1. Click **"New repository secret"**
> 2. Type the secret name exactly as shown in the table above
> 3. Paste the value
> 4. Click **"Add secret"**

> **Optional Domain Secrets:** If you plan to use custom domains (e.g., `test.shoreexplorer.com`), see [GitHub Secrets Guide](GITHUB-SECRETS.md) for configuring `TEST_DOMAIN` and `PROD_DOMAIN` secrets.

### Also Add GitHub Environments

> Environments allow you to have separate test and production deployments.

1. In the same **Settings** page, click **"Environments"** in the left sidebar
2. Click **"New environment"**
3. Type `test` and click **"Configure environment"**
4. No additional settings needed — just click back
5. Click **"New environment"** again
6. Type `production` and click **"Configure environment"**
7. **For production only:** Tick **"Required reviewers"** and add yourself
   > This means someone must click "Approve" before production deploys happen
8. Click **"Save protection rules"**

---

## Step 7: Run the Automated Setup Scripts

> Now that the manual setup is done, you can run scripts to create everything in AWS.

1. Open Terminal
2. Navigate to the project folder:
   ```bash
   cd /path/to/cruise-planner
   ```
3. Make the scripts executable:
   ```bash
   chmod +x infra/aws/scripts/*.sh
   ```
4. Run the setup script for the **test** environment:
   ```bash
   ./infra/aws/scripts/setup-all.sh test
   ```
   > This takes about 5-10 minutes. You'll see progress messages as each resource is created.

5. Once test is working, set up **production**:
   ```bash
   ./infra/aws/scripts/setup-all.sh prod
   ```

---

## Step 8: Deploy Your App

> After the infrastructure is ready, deploy using GitHub Actions.

### Automatic Deployment (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Set up AWS infrastructure"
   git push origin main
   ```
2. Go to **https://github.com/billysandle95/cruise-planner/actions**
3. You'll see the deployment running automatically
4. The **test** environment deploys automatically on every push to `main`
5. The **production** environment deploys when you create a release tag

### Manual Deployment (First Time)

If you want to deploy manually for the first time:
```bash
./infra/aws/scripts/build-and-deploy.sh test
```

---

## What Happens Next?

After deployment, you'll have:

| Environment | URL | When it Deploys |
|-------------|-----|-----------------|
| **Test** | `http://<test-alb-url>` | Every push to `main` |
| **Production** | `http://<prod-alb-url>` | When you create a version tag (e.g., `v1.0.0`) |

The setup script will print the URLs when it finishes.

---

## Troubleshooting

> **For detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

### Quick Diagnostics

Run the automated diagnostic script to check your deployment:

```bash
./infra/aws/scripts/diagnose-alb.sh test   # For test environment
./infra/aws/scripts/diagnose-alb.sh prod  # For production
```

This will check:
- ✓ ALB status and configuration
- ✓ Security group rules
- ✓ Target group health
- ✓ ECS services
- ✓ Connectivity

### Common Issues

#### "Access Denied" errors when running scripts
- Make sure you completed Step 3 (IAM User) correctly
- Run `aws sts get-caller-identity` to verify your credentials
- Make sure all 7 policies are attached to the user

#### "Resource already exists" errors
- This is usually fine — the scripts skip resources that already exist
- If you need to start fresh, run: `./infra/aws/scripts/teardown.sh test`

#### Connection closed / Can't access the app
- **Important:** Use `http://` not `https://` (HTTPS not configured by default)
- Run diagnostic script: `./infra/aws/scripts/diagnose-alb.sh test`
- Wait 2-3 minutes for the load balancer to fully provision
- Check security groups allow port 80
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed diagnosis

#### MongoDB connection errors
- Verify your connection string in Secrets Manager
- Make sure MongoDB Atlas allows connections from `0.0.0.0/0`
- Check: did you replace `<password>` in the connection string?

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| MongoDB Atlas M0 | **Free** |
| Groq API (free tier) | **Free** |
| ECS Fargate (test) | ~$10-15 |
| ECS Fargate (prod) | ~$10-15 |
| ALB (x2) | ~$16 each |
| ECR (storage) | ~$1 |
| **Total (both environments)** | **~$55-65/month** |

> **Tip:** To save money during development, you can tear down the test environment when not in use:
> ```bash
> ./infra/aws/scripts/teardown.sh test
> ```

---

## Quick Reference

| What | Where |
|------|-------|
| AWS Console | https://console.aws.amazon.com |
| MongoDB Atlas | https://cloud.mongodb.com |
| Google AI Studio | https://aistudio.google.com/apikey |
| GitHub Actions | https://github.com/billysandle95/cruise-planner/actions |
| AWS CLI Docs | https://docs.aws.amazon.com/cli/ |
