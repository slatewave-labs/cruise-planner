# AWS Manual Setup Guide — ShoreExplorer

> Last updated: 2026-02-19
>
> **This guide is written for non-technical users.** Follow each step carefully.
> After completing these manual steps, you can run the automated scripts to create everything else.

---

## What You'll Set Up

| Step | What | Time | Difficulty |
|------|------|------|------------|
| 1 | Create an AWS Account | 10 min | Easy |
| 2 | Install the AWS command-line tool | 5 min | Easy |
| 3 | Create a "robot user" for deployments | 10 min | Medium |
| 4 | Get a Groq API key (for AI plan generation) | 5 min | Easy |
| 5 | Add secrets to GitHub | 5 min | Easy |

**Total time: ~35 minutes**

> **Note:** The database (DynamoDB) is created automatically by the setup scripts in Step 6. No separate database account is needed.

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
   - `CloudWatchFullAccess`
   - `IAMFullAccess`  *(this grants broad permissions, including the EventBridge/IAM actions used by the async callback routine; if you instead build a custom least‑privilege policy make sure it allows **events:CreateConnection, events:CreateApiDestination, events:PutRule, events:PutTargets, iam:CreateRole, iam:PutRolePolicy**)*
   - `AWSCodeDeployFullAccess`  *(required for Blue/Green deployments via CodeDeploy)*
   - `AmazonDynamoDBFullAccess`
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

## Step 4: Get a Groq API Key

> The Groq API powers the AI that generates day plans using the Llama 3.3 70B model. The free tier gives you 14,400 requests per day.

1. Go to **https://console.groq.com/keys**
2. Sign up for a free account (no credit card required)
3. Click **"Create API Key"**
4. Give it a name (e.g., "ShoreExplorer") and click **"Submit"**
5. Your API key will appear (it starts with `gsk_...`)
6. **Copy and save this key** — you'll need it in Step 5

See [GROQ_SETUP.md](/GROQ_SETUP.md) for detailed instructions.

---

## Step 5: Add Secrets to GitHub

> GitHub needs your AWS credentials to deploy the app. The Groq API key is stored in AWS Secrets Manager (not GitHub) — the deployment scripts handle this automatically.

1. Go to your GitHub repository page
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

> **Note:** `GROQ_API_KEY` is stored in **AWS Secrets Manager**, not GitHub. The deployment scripts add it there automatically. See [SECRETS-ARCHITECTURE.md](SECRETS-ARCHITECTURE.md) for details on why.

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

## Step 6: Run the Automated Setup Scripts

> Now that the manual setup is done, you can run scripts to create everything in AWS (including the DynamoDB table).

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

## Step 7: Deploy Your App

> After the infrastructure is ready, deploy using GitHub Actions.

### Automatic Deployment (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Set up AWS infrastructure"
   git push origin main
   ```
2. Go to your repository's **Actions** tab on GitHub
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
./infra/aws/scripts/diagnose-alb.sh prod   # For production
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
- Make sure all 8 policies are attached to the user

#### "Resource already exists" errors
- This is usually fine — the scripts skip resources that already exist
- If you need to start fresh, run: `./infra/aws/scripts/teardown.sh test`

#### Connection closed / Can't access the app
- **Important:** Use `http://` not `https://` (HTTPS not configured by default)
- Run diagnostic script: `./infra/aws/scripts/diagnose-alb.sh test`
- Wait 2-3 minutes for the load balancer to fully provision
- Check security groups allow port 80
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed diagnosis

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| DynamoDB (on-demand, 25 GB free) | ~$0-1 |
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
| Groq Console | https://console.groq.com/keys |
| GitHub Actions | Your repository → Actions tab |
| AWS CLI Docs | https://docs.aws.amazon.com/cli/ |
