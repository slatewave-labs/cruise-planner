# HTTPS Setup Guide for ShoreExplorer

This guide walks you through enabling HTTPS on your ALB (Application Load Balancer) with a free wildcard SSL certificate from AWS Certificate Manager (ACM).

**Key Feature:** We use a **wildcard certificate (*.domain.com)** that covers all subdomains (test.domain.com, www.domain.com, etc.) with a single certificate, simplifying management and deployment.

## Prerequisites

Before setting up HTTPS, you need:

1. ✅ A domain name (e.g., `shoreexplorer.com`, `myapp.com`)
   - Register via [Route 53](https://aws.amazon.com/route53/), GoDaddy, Namecheap, or any registrar
   - Cost: ~$12/year for most domains

2. ✅ Access to your domain's DNS settings
   - Ability to add/modify DNS records (supports Route 53, 123-reg.com, GoDaddy, Namecheap, etc.)
   - Required for SSL certificate validation

3. ✅ ALB already deployed
   - If not: Run `./infra/aws/scripts/setup-all.sh test`

---

## Quick Start

**Single command to set up HTTPS with wildcard certificate:**

```bash
./infra/aws/scripts/08-setup-https.sh test yourdomain.com
```

This will:
1. Delete any old pending certificates (if present)
2. Request a wildcard SSL certificate (*.yourdomain.com + yourdomain.com) from AWS Certificate Manager (free!)
3. Show you DNS validation records to add
4. Wait for you to validate the certificate
5. Create HTTPS listener on port 443
6. Configure HTTP → HTTPS redirect

**Why wildcard certificate?**
- Single certificate covers all subdomains (test.yourdomain.com, www.yourdomain.com, etc.)
- Easier to manage - no need to request separate certificates for each environment
- Cost-effective - still completely free with ACM
- Future-proof - automatically covers any new subdomains you create

---

## Understanding Wildcard Certificates

### What is a Wildcard Certificate?

A wildcard certificate uses an asterisk (*) to cover all first-level subdomains of a domain. For example:

- Certificate domain: **\*.yourdomain.com**
- Covers: test.yourdomain.com, www.yourdomain.com, api.yourdomain.com, staging.yourdomain.com, etc.
- Also includes: **yourdomain.com** (apex domain) via Subject Alternative Name (SAN)

### Benefits for ShoreExplorer

1. **Simplified Management**: One certificate covers both test (test.yourdomain.com) and production (yourdomain.com or www.yourdomain.com) environments
2. **Cost**: Still completely free with AWS Certificate Manager (ACM)
3. **Automatic Renewal**: ACM auto-renews as long as DNS validation records remain in place
4. **Future-Proof**: Automatically covers any new subdomains you create (e.g., staging.yourdomain.com, dev.yourdomain.com)
5. **Reduced Complexity**: No need to manage separate certificates for each environment or subdomain

### Trade-offs

- **Security**: Slightly less secure than individual certificates (if one subdomain is compromised, the certificate could potentially be misused for other subdomains)
- **Granularity**: Cannot revoke access for a specific subdomain without affecting all subdomains
- **Best Practice**: For most use cases, including ShoreExplorer, the benefits far outweigh the minimal security trade-offs

---

## Step-by-Step Guide

### Step 1: Register a Domain (if you don't have one)

#### Option A: Use AWS Route 53 (Recommended)

```bash
# Search for available domains
aws route53domains check-domain-availability \
  --domain-name shoreexplorer.com \
  --region us-east-1

# Register domain (example - adjust price and duration)
aws route53domains register-domain \
  --domain-name shoreexplorer.com \
  --duration-in-years 1 \
  --admin-contact file://contact.json \
  --registrant-contact file://contact.json \
  --tech-contact file://contact.json \
  --auto-renew \
  --region us-east-1
```

Contact JSON template (`contact.json`):
```json
{
  "FirstName": "John",
  "LastName": "Doe",
  "ContactType": "PERSON",
  "AddressLine1": "123 Main St",
  "City": "Seattle",
  "State": "WA",
  "CountryCode": "US",
  "ZipCode": "98101",
  "PhoneNumber": "+1.2065551234",
  "Email": "admin@yourdomain.com"
}
```

#### Option B: Use 123-reg.com

If your domain is registered with [123-reg.com](https://www.123-reg.co.uk/):

1. Log in to your 123-reg control panel at https://www.123-reg.co.uk/secure/cpanel/domain/overview
2. Select the domain you want to use
3. DNS management is under **"Manage DNS"** in your control panel
4. You'll add CNAME records here during the validation step (Step 3)

> **Note:** 123-reg.com domains **cannot** be transferred to Route 53 while they're within the first 60 days of registration, or if the domain is locked. Even after that, transferring `.co.uk` domains requires a different process (IPS tag change to `GANDI` via Route 53). This guide covers using 123-reg.com DNS directly — no transfer needed.

#### Option C: Use Another Registrar

Register at:
- [Google Domains](https://domains.google/)
- [GoDaddy](https://www.godaddy.com/)
- [Namecheap](https://www.namecheap.com/)
- Any other domain registrar

---

### Step 2: Run the HTTPS Setup Script

```bash
cd infra/aws/scripts
./08-setup-https.sh test yourdomain.com
```

**What happens:**
1. Script requests an SSL certificate from ACM
2. Shows DNS validation records you need to add
3. Waits for your DNS updates

**Example output:**
```
=== Step 1: SSL Certificate ===

ℹ Requesting new wildcard certificate for *.yourdomain.com...
✓ Wildcard certificate requested: arn:aws:acm:us-east-1:123456789012:certificate/abc123...

⚠ IMPORTANT: You must validate domain ownership

  This wildcard certificate covers:
    *.yourdomain.com  (all subdomains: test.yourdomain.com, www.yourdomain.com, etc.)
    yourdomain.com    (apex domain)

  Validation steps:
    1. Go to ACM console: https://console.aws.amazon.com/acm/home?region=us-east-1
    2. Click on certificate: arn:aws:acm:...
    3. Click 'Create records in Route 53' (if using Route 53)
       OR add the CNAME records shown to your DNS provider
    4. Wait 5-30 minutes for validation to complete
    5. Re-run this script after validation

  Validation details:
  +-------------------+------------------------------+------------------------------+
  | *.yourdomain.com  | _abc123.yourdomain.com      | _def456.acm-validations.aws. |
  | yourdomain.com    | _ghi789.yourdomain.com      | _jkl012.acm-validations.aws. |
  +-------------------+------------------------------+------------------------------+
```

---

### Step 3: Validate Your Domain

You need to prove you own the domain by adding DNS records.

#### Option A: Using Route 53 (Automatic - Easiest)

1. Go to ACM console: https://console.aws.amazon.com/acm/home?region=us-east-1
2. Click on your certificate
3. Click **"Create records in Route 53"** button
4. Click **"Create records"**
5. Done! Validation happens automatically in 5-30 minutes

#### Option B: Using 123-reg.com (Manual)

1. Go to ACM console: https://console.aws.amazon.com/acm/home?region=us-east-1
2. Click on your wildcard certificate
3. Copy the **CNAME Name** and **CNAME Value** for each domain (*.yourdomain.com and yourdomain.com)
4. Log in to [123-reg.com Control Panel](https://www.123-reg.co.uk/secure/cpanel/domain/overview)
5. Select your domain → click **"Manage DNS"**
6. Scroll down to the **"Advanced DNS"** section
7. Add CNAME records:

   **Example for *.yourdomain.com (wildcard):**
   ```
   Type:     CNAME
   Hostname: _abc123def456ghi789   (IMPORTANT: only the part BEFORE .yourdomain.com)
   Target:   _jkl012mno345pqr678.acm-validations.aws.
   TTL:      300
   ```

   **Example for yourdomain.com (apex):**
   ```
   Type:     CNAME
   Hostname: _stu901vwx234yza567   (IMPORTANT: only the part BEFORE .yourdomain.com)
   Target:   _bcd890efg123hij456.acm-validations.aws.
   TTL:      300
   ```

   > **⚠️ 123-reg.com specific notes:**
   > - In the **Hostname** field, enter only the subdomain part (everything before `.yourdomain.com`). 123-reg automatically appends your domain.
   > - The **Target/Destination** field must include the trailing dot (`.`) — copy the full value from ACM.
   > - If 123-reg strips the leading underscore (`_`), try entering it with and without — ACM requires the underscore.
   > - 123-reg calls the value field **"Destination"** — paste the full ACM CNAME value here.
   > - DNS propagation on 123-reg typically takes **15-45 minutes** but can take up to 24 hours.
   > - **Wildcard note:** The wildcard certificate requires validation for both *.yourdomain.com and yourdomain.com, so you'll need to add both CNAME records.

8. Click **"Add"** for each record, then **Save**
9. Wait 15-45 minutes for DNS propagation

**Verify your DNS records are live:**
```bash
dig _abc123def456ghi789.yourdomain.com CNAME
# or
nslookup -type=CNAME _abc123def456ghi789.yourdomain.com
```

You should see the ACM validation value in the response. If not, wait longer or double-check the hostname in 123-reg.

#### Option C: Using Another DNS Provider (Manual)

1. Go to ACM console: https://console.aws.amazon.com/acm/home?region=us-east-1
2. Click on your wildcard certificate
3. Copy the CNAME Name and CNAME Value for each domain (*.yourdomain.com and yourdomain.com)
4. Go to your DNS provider (GoDaddy, Namecheap, etc.)
5. Add CNAME records:

   **Example for *.yourdomain.com (wildcard):**
   ```
   Type:  CNAME
   Name:  _abc123def456ghi789  (the part before .yourdomain.com)
   Value: _jkl012mno345pqr678.acm-validations.aws.
   TTL:   300 (or default)
   ```

   **Example for yourdomain.com (apex):**
   ```
   Type:  CNAME
   Name:  _stu901vwx234yza567  (the part before .yourdomain.com)
   Value: _bcd890efg123hij456.acm-validations.aws.
   TTL:   300 (or default)
   ```

6. Save the records
7. Wait 5-30 minutes for DNS propagation

**Pro tip:** Use `dig` or `nslookup` to verify DNS records:
```bash
dig _abc123def456ghi789.yourdomain.com CNAME
```

---

### Step 4: Re-run Script After Validation

Once your certificate is validated (status = "Issued" in ACM console):

```bash
./08-setup-https.sh test yourdomain.com arn:aws:acm:us-east-1:123456789012:certificate/abc123...
```

**What happens now:**
1. ✓ Verifies certificate is issued
2. ✓ Creates HTTPS listener on port 443
3. ✓ Configures routing rules (/api/* → backend, / → frontend)
4. ✓ Sets up HTTP → HTTPS redirect
5. ✓ Updates ALB outputs

**Example output:**
```
=== HTTPS Setup Complete! ===

  ✓ SSL Certificate: arn:aws:acm:...
  ✓ HTTPS Listener: Port 443
  ✓ HTTP Redirect: Enabled (HTTP → HTTPS)

  Your application URLs:
    HTTPS:  https://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com
    HTTP:   http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com (redirects to HTTPS)
```

---

### Step 5: Point Your Domain to ALB

Now that HTTPS is working on the ALB, point your domain to it.

#### Option A: Using Route 53 (Recommended - Free, Fast)

Create an ALIAS record (Route 53's special record type for AWS resources):

```bash
# Get your hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name yourdomain.com \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

# Get ALB hosted zone ID
ALB_ZONE_ID=$(aws elbv2 describe-load-balancers \
  --names "shoreexplorer-test-alb" \
  --region us-east-1 \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "shoreexplorer-test-alb" \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Create ALIAS record
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"CREATE\",
      \"ResourceRecordSet\": {
        \"Name\": \"yourdomain.com\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"HostedZoneId\": \"$ALB_ZONE_ID\",
          \"DNSName\": \"$ALB_DNS\",
          \"EvaluateTargetHealth\": false
        }
      }
    }]
  }"

# Create www subdomain (optional)
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"CREATE\",
      \"ResourceRecordSet\": {
        \"Name\": \"www.yourdomain.com\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"HostedZoneId\": \"$ALB_ZONE_ID\",
          \"DNSName\": \"$ALB_DNS\",
          \"EvaluateTargetHealth\": false
        }
      }
    }]
  }"
```

**Why ALIAS instead of CNAME?**
- Free (CNAME queries cost money)
- Works for root domain (CNAME doesn't)
- Better performance
- Recommended by AWS

#### Option B: Using 123-reg.com

123-reg.com **does not support ALIAS or ANAME records**, so you cannot point a bare/root domain (e.g., `yourdomain.com`) directly to an AWS ALB. Use one of these approaches:

**Approach 1: Use `www` subdomain as primary (Recommended)**

1. Log in to [123-reg.com Control Panel](https://www.123-reg.co.uk/secure/cpanel/domain/overview)
2. Select your domain → **"Manage DNS"**
3. In the **Advanced DNS** section, add a CNAME record:

   ```
   Type:        CNAME
   Hostname:    www
   Destination: shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com
   TTL:         300
   ```

4. Set up a **web redirect** for the root domain to `www`:
   - In your 123-reg control panel, go to **"Manage DNS"**
   - Find **"Web Forwarding"** (or **"URL Forwarding"**)
   - Add a redirect:
     ```
     From:  yourdomain.com
     To:    https://www.yourdomain.com
     Type:  301 (Permanent)
     ```
   - This ensures visitors going to `yourdomain.com` are sent to `www.yourdomain.com`

5. Click **Save**

**Approach 2: Use an A record with Elastic IP (Advanced)**

If you need the root domain to work without redirect, you can put a CloudFront distribution or a fixed Elastic IP in front of the ALB. This is more complex — see [AWS docs on using Route 53 ALIAS](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html) for details.

> **⚠️ Why not a CNAME for root?** The DNS specification (RFC 1034) prohibits CNAME records at the zone apex (root domain). 123-reg correctly enforces this. Route 53's ALIAS record is a proprietary workaround that other providers don't support.

> **⚠️ 123-reg.com note:** DNS changes on 123-reg typically propagate within 15-45 minutes, but can take up to 24 hours. You can check propagation with `dig www.yourdomain.com CNAME`.

#### Option C: Using Another DNS Provider

Add a CNAME record:

```
Type:  CNAME
Name:  @ (for root) or www (for subdomain)
Value: shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com
TTL:   300 (or default)
```

**⚠️ Limitation:** Most DNS providers don't allow CNAME for root domain (@). Options:
1. Use `www.yourdomain.com` instead
2. Use ALIAS flattening if your provider supports it (Cloudflare, DNSimple)
3. Migrate DNS to Route 53 (recommended)

---

### Step 6: Update Frontend Environment Variable

The frontend needs to know to use HTTPS:

**Option A: Rebuild with new backend URL**

Edit your secrets or re-run build:

```bash
# If using domain:
docker build --build-arg REACT_APP_BACKEND_URL=https://yourdomain.com ...

# If using ALB DNS:
docker build --build-arg REACT_APP_BACKEND_URL=https://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com ...
```

**Option B: Use deployment script (recommended)**

The deployment workflow automatically uses the ALB DNS:

```bash
./infra/aws/scripts/build-and-deploy.sh test
```

The deploy script detects HTTPS listener and uses `https://` automatically.

---

### Step 7: Verify HTTPS is Working

```bash
# Test HTTPS
curl -I https://yourdomain.com
# Expected: HTTP/2 200

# Test HTTP redirect
curl -I http://yourdomain.com
# Expected: HTTP/1.1 301 Moved Permanently
#           Location: https://yourdomain.com/

# Test backend API
curl https://yourdomain.com/api/health
# Expected: {"status":"ok"} or {"status":"degraded"}
```

---

## Troubleshooting

### Certificate Stuck in "Pending Validation"

**Problem:** Certificate status is "Pending Validation" for more than 30 minutes

**Solutions:**

1. **Check DNS records are correct:**
   ```bash
   dig _abc123.yourdomain.com CNAME
   ```
   Should return the ACM validation CNAME value

2. **Verify DNS has propagated:**
   - Use https://dnschecker.org
   - Check all regions show the CNAME record

3. **Check DNS provider settings:**
   - Some providers strip underscores from record names
   - Try adding the full CNAME name including your domain

4. **Re-request certificate:**
   ```bash
   # Delete old certificate
   aws acm delete-certificate --certificate-arn arn:aws:acm:...
   
   # Request new one
   ./08-setup-https.sh test yourdomain.com
   ```

### Certificate Stuck on 123-reg.com

**Problem:** DNS validation not completing when using 123-reg.com

**Common causes and fixes:**

1. **123-reg appends the domain automatically:**
   - If ACM tells you to create `_abc123.yourdomain.com`, enter only `_abc123` in the 123-reg Hostname field
   - 123-reg appends `.yourdomain.com` automatically
   - Entering the full name creates `_abc123.yourdomain.com.yourdomain.com` which is wrong

2. **Leading underscore stripped:**
   - Some 123-reg interfaces strip leading underscores
   - Verify by running: `dig _abc123.yourdomain.com CNAME`
   - If the record doesn't resolve, contact 123-reg support to add it manually

3. **123-reg DNS propagation is slow:**
   - 123-reg DNS changes can take 15-45 minutes to propagate (sometimes up to 24 hours)
   - Check progress at https://dnschecker.org — enter the full CNAME name including underscore
   - Be patient before re-requesting the certificate

4. **Trailing dot on destination:**
   - Ensure the Destination/Target field includes the trailing dot, e.g., `_xyz.acm-validations.aws.`
   - Some 123-reg interfaces handle this automatically; try with and without

5. **Verify the records from the command line:**
   ```bash
   # Check the validation CNAME exists
   nslookup -type=CNAME _abc123.yourdomain.com 8.8.8.8
   
   # If you see "can't find", the record hasn't propagated yet
   # If you see an answer, check it matches the ACM expected value
   ```

### HTTPS Not Working After Setup

**Problem:** HTTPS listener created but getting connection errors

**Diagnosis:**

```bash
./infra/aws/scripts/diagnose-alb.sh test
```

**Common issues:**

1. **Certificate not attached to listener:**
   ```bash
   aws elbv2 describe-listeners \
     --load-balancer-arn arn:aws:elasticloadbalancing:... \
     --region us-east-1
   ```
   Look for `Certificates` array in HTTPS listener

2. **Security group not allowing port 443:**
   ```bash
   # Already configured by default, but verify:
   SG_ID=$(aws elbv2 describe-load-balancers \
     --names "shoreexplorer-test-alb" \
     --region us-east-1 \
     --query 'LoadBalancers[0].SecurityGroups[0]' \
     --output text)
   
   aws ec2 describe-security-groups \
     --group-ids "$SG_ID" \
     --region us-east-1
   ```

3. **Target groups unhealthy:**
   Run quick fix:
   ```bash
   ./infra/aws/scripts/quick-fix-alb.sh test
   ```

### 123-reg.com Root Domain Not Resolving

**Problem:** `yourdomain.com` doesn't load, but `www.yourdomain.com` works

**Cause:** 123-reg.com doesn't support ALIAS/ANAME records needed for root domain → ALB mapping

**Solutions:**

1. **Set up URL forwarding in 123-reg:**
   - Log in to 123-reg control panel
   - Go to **Manage DNS** → **Web Forwarding** (or **URL Forwarding**)
   - Forward `yourdomain.com` → `https://www.yourdomain.com` (301 redirect)
   - This is the simplest fix and works well

2. **Use a CloudFront distribution:**
   - Create a CloudFront distribution pointing to your ALB
   - CloudFront provides a static IP set you can use with A records
   - More complex but gives you CDN benefits too

3. **Consider partial DNS migration:**
   - Keep your domain registration on 123-reg.com
   - Change the **nameservers** on 123-reg to point to a Route 53 hosted zone
   - This gives you Route 53 ALIAS support while keeping the domain on 123-reg
   - In 123-reg: Domain → **Manage Nameservers** → enter the 4 Route 53 NS records
   - Cost: $0.50/month for the Route 53 hosted zone

### Browser Shows "Not Secure" Warning

**Problem:** HTTPS works but browser shows security warning

**Causes:**

1. **Certificate doesn't match domain:**
   - Using ALB DNS with certificate for yourdomain.com
   - Solution: Access via your domain, not ALB DNS

2. **Mixed content:**
   - Frontend loads HTTP resources on HTTPS page
   - Solution: Ensure all API calls use HTTPS in frontend code

3. **Certificate expired:**
   - ACM certificates auto-renew if validation records remain
   - Check ACM console for certificate status

---

## Cost

| Item | Cost |
|------|------|
| Domain registration | $12-50/year (varies by TLD) |
| ACM SSL certificate | **FREE** ⭐ |
| Route 53 hosted zone | $0.50/month (optional, if using Route 53) |
| Route 53 queries | $0.40 per million queries (minimal cost) |
| ALB HTTPS listener | **FREE** (included in ALB cost) |

**Total additional cost:** ~$12-50/year for domain only (certificate is free!)

---

## Automation

Once set up manually, you can automate HTTPS setup for new environments:

```bash
# Environment variables in GitHub Secrets:
# - DOMAIN_NAME
# - CERTIFICATE_ARN

# In your deploy workflow:
- name: Setup HTTPS
  run: |
    ./infra/aws/scripts/08-setup-https.sh ${{ env.ENVIRONMENT }} \
      ${{ secrets.DOMAIN_NAME }} \
      ${{ secrets.CERTIFICATE_ARN }}
```

---

## Security Best Practices

1. **Use strong TLS policy:**
   - Script uses `ELBSecurityPolicy-TLS13-1-2-2021-06` (TLS 1.2 and 1.3)
   - This is secure and widely compatible

2. **Enable HTTP Strict Transport Security (HSTS):**
   Add to backend response headers:
   ```python
   @app.middleware("http")
   async def add_security_headers(request, call_next):
       response = await call_next(request)
       response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
       return response
   ```

3. **Monitor certificate expiration:**
   - ACM auto-renews certificates
   - But only if DNS validation records remain
   - Set up CloudWatch alarm for expiration

4. **Use CAA DNS records (optional but recommended):**
   ```bash
   # Allow only Amazon to issue certificates for your domain
   yourdomain.com. CAA 0 issue "amazon.com"
   yourdomain.com. CAA 0 issuewild "amazon.com"
   ```

---

## Reverting to HTTP Only

If you need to remove HTTPS:

```bash
# Delete HTTPS listener
aws elbv2 delete-listener \
  --listener-arn arn:aws:elasticloadbalancing:...

# Restore HTTP listener default action
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...

# Delete certificate (if not needed)
aws acm delete-certificate \
  --certificate-arn arn:aws:acm:...
```

---

## Next Steps

After HTTPS is working:

- [ ] Set up automated certificate renewal monitoring
- [ ] Configure HSTS headers
- [ ] Add CAA DNS records
- [ ] Update all documentation URLs to HTTPS
- [ ] Set up CloudWatch alarms for ALB HTTPS errors
- [ ] Consider adding CloudFront CDN for better performance

---

## Support

For issues:
1. Run diagnostics: `./infra/aws/scripts/diagnose-alb.sh test`
2. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Review ACM console for certificate status
4. Check Route 53 (or your DNS provider) for correct records
