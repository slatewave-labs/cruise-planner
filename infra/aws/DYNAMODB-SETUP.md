# DynamoDB Setup Guide for ShoreExplorer

> Last updated: 2026-02-19

This guide helps you set up AWS DynamoDB for ShoreExplorer. It's written for non-technical users and includes step-by-step instructions.

## What is DynamoDB?

Amazon DynamoDB is a fully managed NoSQL database service provided by AWS. It is:
- **Serverless**: No servers to manage or maintain
- **Auto-scaling**: Automatically handles traffic spikes
- **Cost-effective**: Pay only for what you use (on-demand billing)
- **Highly available**: Built-in redundancy across multiple AWS data centers

## Prerequisites

Before you begin, make sure you have:
1. ✅ An AWS account (free tier is sufficient for development/testing)
2. ✅ AWS CLI installed on your computer
3. ✅ AWS credentials configured (access key ID and secret access key)

### Installing AWS CLI

**On macOS:**
```bash
brew install awscli
```

**On Windows:**
Download and run the installer from: https://aws.amazon.com/cli/

**On Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Configuring AWS Credentials

Run this command and follow the prompts:
```bash
aws configure
```

You'll need:
- **AWS Access Key ID**: Get from AWS IAM Console
- **AWS Secret Access Key**: Get from AWS IAM Console
- **Default region**: Use `us-east-1` (recommended) or your preferred region
- **Default output format**: Enter `json`

---

## Step 1: Create DynamoDB Table

### Option A: Using the Automated Script (Recommended)

We've created a script that does all the heavy lifting for you.

1. **Open Terminal** (macOS/Linux) or **Command Prompt** (Windows)

2. **Navigate to the scripts directory:**
   ```bash
   cd infra/aws/scripts
   ```

3. **Run the script for your environment:**

   For **development** (local testing):
   ```bash
   ./create-dynamodb-tables.sh dev
   ```

   For **test** environment (staging):
   ```bash
   ./create-dynamodb-tables.sh test
   ```

   For **production** environment:
   ```bash
   ./create-dynamodb-tables.sh prod
   ```

4. **Wait for completion** - The script will:
   - ✅ Create the DynamoDB table with the correct structure
   - ✅ Set up the Global Secondary Index (GSI) for device-based queries
   - ✅ Enable point-in-time recovery (for production only)
   - ✅ Display the table details

5. **Note the table name** - It will be `shoreexplorer-dev`, `shoreexplorer-test`, or `shoreexplorer-prod`

### Option B: Manual Creation via AWS Console

If you prefer using the AWS web interface:

1. **Go to AWS Console**: https://console.aws.amazon.com/dynamodb/
2. **Click "Create table"**
3. **Configure the table:**
   - **Table name**: `shoreexplorer-dev` (or `test`/`prod`)
   - **Partition key**: `PK` (Type: String)
   - **Sort key**: `SK` (Type: String)
   - **Table settings**: Select "Customize settings"
   - **Table class**: Standard
   - **Capacity mode**: On-demand
4. **Add Global Secondary Index:**
   - Click "Create global index"
   - **Partition key**: `GSI1PK` (Type: String)
   - **Sort key**: `GSI1SK` (Type: String)
   - **Index name**: `GSI1`
   - **Projected attributes**: All
5. **Add tags** (optional but recommended):
   - `Environment`: `dev`/`test`/`prod`
   - `Application`: `ShoreExplorer`
6. **Click "Create table"**
7. **Wait** for status to change from "Creating..." to "Active" (1-2 minutes)

---

## Step 2: Update Application Environment Variables

After creating the table, you need to tell your application how to connect to it.

### For Local Development (.env file)

1. **Create or edit** `backend/.env` file:
   ```bash
   cd backend
   nano .env  # or use your favorite text editor
   ```

2. **Add these lines** (replace values as needed):
   ```env
   # DynamoDB Configuration
   DYNAMODB_TABLE_NAME=shoreexplorer-dev
   AWS_DEFAULT_REGION=us-east-1
   
   # For local DynamoDB (optional - only if using DynamoDB Local)
   # DYNAMODB_ENDPOINT_URL=http://localhost:8000
   
   # Keep existing variables
   GROQ_API_KEY=your-groq-api-key-here
   ```

3. **Save and close** the file

### For Docker Compose

The `docker-compose.yml` will read from the `.env` file automatically. No changes needed!

### For AWS ECS (Production/Test)

Environment variables for ECS are managed through AWS Secrets Manager. You'll update them in **Step 3**.

---

## Step 3: Update AWS Secrets Manager (For ECS Deployments)

If you're deploying to AWS ECS (test or production environments), you need to update the secrets.

### Using AWS CLI (Recommended)

1. **For test environment:**
   ```bash
   aws secretsmanager update-secret \
     --secret-id shoreexplorer-test-secrets \
     --secret-string '{
       "GROQ_API_KEY": "your-groq-api-key",
       "DYNAMODB_TABLE_NAME": "shoreexplorer-test",
       "AWS_DEFAULT_REGION": "us-east-1"
     }'
   ```

2. **For production environment:**
   ```bash
   aws secretsmanager update-secret \
     --secret-id shoreexplorer-prod-secrets \
     --secret-string '{
       "GROQ_API_KEY": "your-groq-api-key",
       "DYNAMODB_TABLE_NAME": "shoreexplorer-prod",
       "AWS_DEFAULT_REGION": "us-east-1"
     }'
   ```

### Using AWS Console

1. Go to: https://console.aws.amazon.com/secretsmanager/
2. Click on `shoreexplorer-test-secrets` (or `prod`)
3. Click "Retrieve secret value"
4. Click "Edit"
5. Ensure the secret contains:
   - ✅ `GROQ_API_KEY`: (your Groq API key)
6. Click "Save"

> **Note:** `DYNAMODB_TABLE_NAME` and `AWS_DEFAULT_REGION` are set as environment variables in the ECS task definition, not as secrets.

---

## Step 4: Update ECS Task IAM Role

Your ECS tasks need permission to access DynamoDB.

### Find Your Task Role

1. Go to: https://console.aws.amazon.com/ecs/
2. Click on your cluster (e.g., `shoreexplorer-test-cluster`)
3. Click on "Task Definitions"
4. Click on `shoreexplorer-test-backend` (or `prod`)
5. Click on the latest revision
6. Scroll down to "Task role" and note the ARN (e.g., `shoreexplorer-test-task-role`)

### Add DynamoDB Permissions

1. Go to: https://console.aws.amazon.com/iam/
2. Click "Roles" in the sidebar
3. Search for your task role name (e.g., `shoreexplorer-test-task-role`)
4. Click on the role
5. Click "Add permissions" → "Attach policies"
6. Search for `AmazonDynamoDBFullAccess`
7. Check the box next to it
8. Click "Add permissions"

**Note**: For production, you should create a custom policy with minimal permissions instead of using `FullAccess`. See the "Security Best Practices" section below.

---

## Step 5: Deploy Updated Application

After updating secrets and IAM roles, redeploy your application:

### For Local Development
```bash
# Stop existing containers
docker-compose down

# Rebuild and start
docker-compose up --build
```

### For AWS ECS
```bash
cd infra/aws/scripts

# For test environment
./build-and-deploy.sh test

# For production environment
./build-and-deploy.sh prod
```

Or use GitHub Actions workflows:
- Push to `main` branch to trigger test deployment
- Create a version tag (e.g., `v1.2.0`) to trigger prod deployment

---

## Step 6: Verify the Setup

### Check DynamoDB Table

```bash
# List tables
aws dynamodb list-tables

# Describe your table
aws dynamodb describe-table --table-name shoreexplorer-dev
```

### Check Application Health

1. **Local**: http://localhost:8001/api/health
2. **Test**: https://test.yourdomain.com/api/health
3. **Production**: https://yourdomain.com/api/health

You should see:
```json
{
  "status": "ok",
  "checks": {
    "database": "healthy",
    "ai_service": "configured"
  }
}
```

### Create a Test Trip

Use the frontend or make a curl request:
```bash
curl -X POST http://localhost:8001/api/trips \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: test-device-123" \
  -d '{
    "ship_name": "Test Ship",
    "cruise_line": "Test Cruise Line"
  }'
```

---

## Troubleshooting

### Error: "Database service is currently unavailable"

**Cause**: Application can't connect to DynamoDB.

**Solutions**:
1. Check environment variables are set correctly
2. Verify table exists: `aws dynamodb describe-table --table-name shoreexplorer-dev`
3. Check IAM permissions (for ECS)
4. Verify AWS region matches between table and app config

### Error: "AccessDeniedException"

**Cause**: IAM role doesn't have DynamoDB permissions.

**Solution**: Follow Step 4 to add DynamoDB permissions to your ECS task role.

### Error: "ResourceNotFoundException"

**Cause**: Table doesn't exist or name mismatch.

**Solutions**:
1. Verify table exists: `aws dynamodb list-tables`
2. Check `DYNAMODB_TABLE_NAME` matches exactly (case-sensitive)
3. Verify you're in the correct AWS region

### Application starts but no data appears

**Cause**: DynamoDB starts empty when first created.

**Solution**: Create new trips through the frontend.

---

## Security Best Practices

### 1. Use Least-Privilege IAM Policies

Instead of `AmazonDynamoDBFullAccess`, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/shoreexplorer-*",
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/shoreexplorer-*/index/*"
      ]
    }
  ]
}
```

### 2. Enable Point-in-Time Recovery (Production)

The script enables this automatically for production. To verify:
```bash
aws dynamodb describe-continuous-backups \
  --table-name shoreexplorer-prod
```

### 3. Set Up CloudWatch Alarms

Monitor DynamoDB metrics:
- User errors (4xx)
- System errors (5xx)
- Consumed read/write capacity
- Throttled requests

### 4. Tag Your Resources

All resources should be tagged for cost tracking:
- `Environment`: `dev`/`test`/`prod`
- `Application`: `ShoreExplorer`
- `ManagedBy`: `Terraform`/`Script`/`Manual`

---

## Cost Estimation

DynamoDB pricing is based on:
1. **Storage**: $0.25/GB per month
2. **Read/Write requests**: $0.25 per million writes, $0.25 per million reads
3. **Data transfer**: OUT to internet (standard AWS rates)

**Typical MVP costs (test environment):**
- Storage (< 1GB): $0.25/month
- API requests (100K/month): $0.03/month
- **Total**: < $1/month

**Free Tier** (first 12 months):
- 25 GB storage
- 25 write capacity units
- 25 read capacity units
- More than enough for early development!

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review AWS DynamoDB documentation: https://docs.aws.amazon.com/dynamodb/
3. Open a GitHub issue in the repository
4. Contact the development team

---

## Summary Checklist

- [ ] AWS CLI installed and configured
- [ ] DynamoDB table created (`shoreexplorer-dev/test/prod`)
- [ ] Environment variables updated (`.env` or AWS Secrets Manager)
- [ ] IAM roles have DynamoDB permissions
- [ ] Application redeployed
- [ ] Health check returns "healthy" for database
- [ ] Test trip created successfully

**Congratulations! Your ShoreExplorer application is now running on AWS DynamoDB! 🎉**
