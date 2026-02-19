# DNS Setup Guide for ShoreExplorer

This guide explains how to configure DNS for ShoreExplorer's test and production environments.

## 🎯 Environment-Specific Domains

ShoreExplorer uses different domain configurations for each environment:

| Environment | Domain Pattern | Example |
|-------------|----------------|---------|
| **Test** | `test.yourdomain.com` | `test.shoreexplorer.com` |
| **Production** | `yourdomain.com` | `shoreexplorer.com` |

This separation allows you to:
- Test changes safely without affecting production
- Use different configurations per environment
- Easily identify which environment you're accessing

---

## 📋 Prerequisites

Before setting up DNS, you need:

1. **A registered domain name**
   - Register at Route 53, GoDaddy, Namecheap, or any registrar
   - Cost: ~$12/year for common TLDs (.com, .net, etc.)

2. **Route 53 hosted zone**
   - The script requires Route 53 for automated setup
   - If you don't have one, see "Create Route 53 Hosted Zone" below

3. **Infrastructure deployed**
   - ALB must be created (step 6 in setup-all.sh)
   - Run `./06-create-alb.sh <environment>` if not done

---

## 🚀 Quick Setup

### Step 1: Create Route 53 Hosted Zone (if needed)

If you don't already have a Route 53 hosted zone:

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name shoreexplorer.com \
  --caller-reference $(date +%s) \
  --hosted-zone-config Comment="ShoreExplorer DNS"

# Get nameservers
aws route53 get-hosted-zone \
  --id /hostedzone/YOUR_ZONE_ID \
  --query "DelegationSet.NameServers" \
  --output table
```

Then update your domain's nameservers at your registrar to use the Route 53 nameservers.

**Note:** Nameserver updates take 24-48 hours to propagate fully.

### Step 2: Run DNS Setup Script

For **test environment** (creates `test.yourdomain.com`):
```bash
cd /path/to/cruise-planner/infra/aws/scripts
./09-setup-dns-subdomain.sh test shoreexplorer.com
```

For **production** (creates `yourdomain.com`):
```bash
cd /path/to/cruise-planner/infra/aws/scripts
./09-setup-dns-subdomain.sh prod shoreexplorer.com
```

### Step 3: Wait for DNS Propagation

DNS changes typically propagate within:
- **Route 53 internal**: ~1 minute
- **Most DNS servers**: 5-30 minutes
- **Global propagation**: Up to 60 minutes

Check propagation:
```bash
# Test DNS resolution
dig test.shoreexplorer.com
nslookup test.shoreexplorer.com

# Or use online tools
# https://dnschecker.org
```

### Step 4: Test Your Application

```bash
# Test environment
curl -I http://test.shoreexplorer.com/api/health

# Production
curl -I http://shoreexplorer.com/api/health
```

---

## 🔧 What the Script Does

The `09-setup-dns-subdomain.sh` script automatically:

1. **Determines full domain** based on environment:
   - Test: `test.${DOMAIN_NAME}`
   - Prod: `${DOMAIN_NAME}`

2. **Finds Route 53 hosted zone** for your domain

3. **Retrieves ALB information**:
   - ALB DNS name
   - ALB hosted zone ID

4. **Creates ALIAS record**:
   - Record type: A (ALIAS)
   - Points to: ALB DNS
   - Benefits: No additional cost, automatic updates if ALB IP changes

5. **Saves configuration** to `.dns-outputs-<environment>.env`

---

## 📝 Manual DNS Configuration

If you prefer to configure DNS manually or use a different DNS provider:

### Using Route 53 Console

1. Go to [Route 53 Console](https://console.aws.amazon.com/route53/)
2. Select your hosted zone
3. Click "Create record"
4. Configure:
   - **Record name**: `test` (for test env) or leave blank (for prod)
   - **Record type**: A
   - **Alias**: Yes
   - **Route traffic to**: Application and Classic Load Balancer
   - **Region**: Your AWS region (e.g., us-east-1)
   - **Load balancer**: Select your ALB (shoreexplorer-test-alb or shoreexplorer-prod-alb)
5. Click "Create records"

### Using AWS CLI

```bash
# Get your ALB DNS and zone ID
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "shoreexplorer-test-alb" \
  --query "LoadBalancers[0].DNSName" \
  --output text)

ALB_ZONE_ID=$(aws elbv2 describe-load-balancers \
  --names "shoreexplorer-test-alb" \
  --query "LoadBalancers[0].CanonicalHostedZoneId" \
  --output text)

# Get your hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --query "HostedZones[?Name=='shoreexplorer.com.'].Id" \
  --output text | cut -d'/' -f3)

# Create ALIAS record for test subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "test.shoreexplorer.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE_ID'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

### Using Other DNS Providers (CNAME)

If you're not using Route 53, create a CNAME record:

**Test environment:**
- **Type**: CNAME
- **Name**: `test`
- **Value**: Your ALB DNS (e.g., `shoreexplorer-test-alb-123456789.us-east-1.elb.amazonaws.com`)
- **TTL**: 300

**Production (with www):**
- **Type**: CNAME
- **Name**: `www`
- **Value**: Your ALB DNS
- **TTL**: 300

**Note:** Most DNS providers don't support ALIAS records for apex domains. For production, use `www.yourdomain.com` or migrate DNS to Route 53.

---

## 🔐 Adding HTTPS

After DNS is configured, set up HTTPS with a **wildcard certificate** (recommended):

```bash
# Single command for wildcard certificate covering all subdomains
# This certificate will work for both test.yourdomain.com AND yourdomain.com
./08-setup-https.sh test yourdomain.com
```

The wildcard certificate (*.yourdomain.com) covers:
- test.yourdomain.com (test environment)
- www.yourdomain.com (production with www)
- yourdomain.com (apex domain via SAN)
- Any other subdomains you create in the future

**Benefits:**
- Single certificate for all environments and subdomains
- Simplified management and renewal
- Still completely free with AWS Certificate Manager
- Automatic coverage for new subdomains

See [HTTPS-SETUP.md](HTTPS-SETUP.md) for detailed HTTPS configuration and wildcard certificate setup.

---

## 🔄 Updating Backend URL

After DNS is configured, you need to configure your deployments to use the custom domain instead of the ALB DNS name.

### Option 1: GitHub Secrets (Recommended for CI/CD)

**This is the best approach if you're using GitHub Actions for deployments.**

The GitHub workflows automatically configure `REACT_APP_BACKEND_URL` based on domain secrets. Simply add the base domain to your GitHub repository secrets:

#### For Test Environment:

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add the secret:
   - **Name:** `TEST_DOMAIN`
   - **Value:** `shore-explorer.com` (your base domain, without the subdomain)
4. The workflow will automatically use `http://test.shore-explorer.com` for `REACT_APP_BACKEND_URL`

#### For Production Environment:

1. In the same location, click **"New repository secret"**
2. Add the secret:
   - **Name:** `PROD_DOMAIN`
   - **Value:** `shore-explorer.com` (your base domain)
3. The workflow will automatically use `http://shore-explorer.com` for `REACT_APP_BACKEND_URL`

**Next:** Trigger a new deployment to apply the changes:
```bash
# For test: Push to main branch or manually trigger workflow
git push origin main

# For production: Create a release tag
git tag v1.0.1
git push origin v1.0.1
```

See [GitHub Workflows README](../../.github/workflows/README.md#configuring-custom-domains) for more details.

### Option 2: Manual Build with Environment Variable

**Use this for local builds or manual deployments outside GitHub Actions.**

```bash
# Set backend URL as environment variable
export REACT_APP_BACKEND_URL="http://test.shore-explorer.com"

# Rebuild and deploy
cd /path/to/cruise-planner/infra/aws/scripts
./build-and-deploy.sh test
```

The build script will use this environment variable when building the frontend Docker image.

### Option 3: Update AWS Secrets Manager (Advanced)

**Not typically needed** - Use this only if you're managing secrets directly in AWS.

Update the secrets in AWS Secrets Manager:
```bash
# Get current secrets
SECRETS_ARN=$(cat .secrets-outputs-test.env | grep SECRET_ARN | cut -d'=' -f2)

# Update secrets including REACT_APP_BACKEND_URL
aws secretsmanager put-secret-value \
  --secret-id "$SECRETS_ARN" \
  --secret-string '{
    "GROQ_API_KEY": "your-key",
    "REACT_APP_BACKEND_URL": "http://test.shore-explorer.com"
  }'
```

**Note:** This approach requires you to rebuild and redeploy manually.

---

## 🧪 Testing DNS Configuration

### Verify DNS Resolution

```bash
# Using dig
dig test.shoreexplorer.com

# Using nslookup
nslookup test.shoreexplorer.com

# Using host
host test.shoreexplorer.com

# Check specific nameserver
dig @8.8.8.8 test.shoreexplorer.com
```

Expected output should show:
- **ANSWER SECTION** with A record
- **IP address** that matches your ALB

### Test Application Endpoints

```bash
# Health check
curl http://test.shoreexplorer.com/api/health

# Frontend
curl -I http://test.shoreexplorer.com/

# With HTTPS (after HTTPS setup)
curl https://test.shoreexplorer.com/api/health
```

---

## 🐛 Troubleshooting

### DNS Not Resolving

**Problem:** `dig` or `nslookup` returns no results

**Solutions:**
1. Verify hosted zone exists:
   ```bash
   aws route53 list-hosted-zones-by-name \
     --query "HostedZones[?Name=='shoreexplorer.com.']"
   ```

2. Check nameservers are updated at registrar
3. Wait up to 48 hours for nameserver propagation
4. Verify record exists in hosted zone:
   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id YOUR_ZONE_ID \
     --query "ResourceRecordSets[?Name=='test.shoreexplorer.com.']"
   ```

### NXDOMAIN Error

**Problem:** DNS query returns NXDOMAIN (domain doesn't exist)

**Solutions:**
1. Check domain name spelling
2. Verify hosted zone has correct domain
3. Ensure nameservers are correctly configured
4. Check record type (should be A with ALIAS)

### DNS Resolves But Site Not Accessible

**Problem:** DNS works but HTTP requests fail

**Solutions:**
1. Verify ALB is running:
   ```bash
   aws elbv2 describe-load-balancers \
     --names shoreexplorer-test-alb
   ```

2. Check target health:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn $(cat .alb-outputs-test.env | grep BACKEND_TG_ARN | cut -d'=' -f2)
   ```

3. Run diagnostics:
   ```bash
   ./diagnose-alb.sh test
   ```

4. Check security groups allow inbound HTTP/HTTPS

### Wrong Domain Resolved

**Problem:** DNS resolves to wrong IP or domain

**Solutions:**
1. Clear local DNS cache:
   ```bash
   # Linux
   sudo systemd-resolve --flush-caches
   
   # macOS
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   ```

2. Use specific DNS server:
   ```bash
   dig @8.8.8.8 test.shoreexplorer.com
   ```

3. Check for conflicting records in hosted zone

---

## 📊 Cost Considerations

### Route 53 Costs (as of 2024)

- **Hosted zone**: $0.50/month per hosted zone
- **DNS queries**: $0.40 per million queries
- **ALIAS queries**: Free (no charge for queries to AWS resources)

**Example monthly cost for low traffic:**
- 1 hosted zone: $0.50
- 1 million ALIAS queries: $0.00
- **Total**: ~$0.50/month

### Comparison with CNAME

ALIAS records are preferred over CNAME because:
- ✅ No additional DNS query charges
- ✅ Can be used for apex domain (yourdomain.com)
- ✅ Better performance (one less DNS lookup)
- ✅ Automatic IP updates if ALB changes

---

## 🔄 Environment Workflow

Typical workflow for multi-environment setup:

```bash
# 1. Setup test environment
./setup-all.sh test
./09-setup-dns-subdomain.sh test shoreexplorer.com

# 2. Setup HTTPS with wildcard certificate (covers both test and prod)
./08-setup-https.sh test shoreexplorer.com

# 3. Test changes on test.shoreexplorer.com

# 4. When ready, setup production
./setup-all.sh prod
./09-setup-dns-subdomain.sh prod shoreexplorer.com

# 5. Use same wildcard certificate for production (already covers *.shoreexplorer.com)
./08-setup-https.sh prod shoreexplorer.com <certificate-arn-from-step-2>

# 6. Deploy to production
./build-and-deploy.sh prod
```

---

## 📚 Additional Resources

- [AWS Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- [ALIAS vs CNAME Records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html)
- [DNS Propagation Checker](https://dnschecker.org)
- [HTTPS Setup Guide](HTTPS-SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

---

## 🆘 Support

If you encounter issues:

1. Run diagnostics:
   ```bash
   ./diagnose-alb.sh test > diagnostics.txt
   ```

2. Check DNS configuration:
   ```bash
   cat .dns-outputs-test.env
   ```

3. Verify Route 53 records:
   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id YOUR_ZONE_ID
   ```

4. Review CloudWatch logs:
   ```bash
   aws logs tail /ecs/shoreexplorer-test-backend --follow
   ```
