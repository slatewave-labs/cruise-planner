# Connection Closed Error - Root Cause Analysis

## Issue Summary

**Symptom:** "Connection closed" error when accessing `https://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/`

**Status:** The deployment completed successfully with passing health checks (see deployment logs from run 22080486764).

## Most Likely Root Cause

### Using HTTPS Instead of HTTP ⚠️

The ALB (Application Load Balancer) is configured for **HTTP only (port 80)** by default. HTTPS requires additional configuration (SSL certificate, HTTPS listener).

**The Fix:**
Use `http://` instead of `https://` when accessing the URL:

```
❌ WRONG:  https://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/
✅ CORRECT: http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/
```

### Why This Happens

1. **ALB is not configured for HTTPS** - The infrastructure scripts create an HTTP listener on port 80, but not an HTTPS listener on port 443
2. **No SSL certificate** - HTTPS requires an SSL/TLS certificate, which is not configured by default
3. **Browser auto-upgrade** - Some browsers automatically try HTTPS first, which fails

## Quick Diagnosis

Run the diagnostic script to verify everything is working:

```bash
./infra/aws/scripts/diagnose-alb.sh test
```

This will check:
- ✓ ALB exists and is active
- ✓ Security groups allow port 80
- ✓ Target groups have healthy targets
- ✓ HTTP connectivity tests

## Alternative Root Causes

If using HTTP still doesn't work, check these:

### 1. Security Group Not Allowing Port 80

**Symptoms:**
- Connection refused or timeout
- Works for some IPs but not others

**Fix:**
```bash
./infra/aws/scripts/quick-fix-alb.sh test
```

Or manually:
```bash
SG_ID=$(aws elbv2 describe-load-balancers \
  --names "shoreexplorer-test-alb" \
  --region us-east-1 \
  --query 'LoadBalancers[0].SecurityGroups[0]' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-1
```

### 2. No Healthy Targets

**Symptoms:**
- HTTP connection works but returns 502 or 503
- Curl shows connection reset

**Diagnosis:**
```bash
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names "shoreexplorer-test-backend-tg" \
    --region us-east-1 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region us-east-1
```

**Fix:**
```bash
# Force redeploy
./infra/aws/scripts/quick-fix-alb.sh test

# Or manually
aws ecs update-service \
  --cluster "shoreexplorer-test-cluster" \
  --service "shoreexplorer-test-backend" \
  --force-new-deployment \
  --region us-east-1
```

### 3. DNS Propagation Delay

**Symptoms:**
- "Could not resolve host" error
- Works intermittently

**Fix:**
- Wait 5-10 minutes for DNS propagation
- Clear DNS cache
- Try from a different network

### 4. ALB Still Provisioning

**Symptoms:**
- Connection timeout
- Recently created ALB

**Fix:**
- Wait 3-5 minutes for ALB to become active
- Check status: `./infra/aws/scripts/diagnose-alb.sh test`

## Verification Steps

1. **Test with curl (using HTTP):**
   ```bash
   curl -v http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/
   curl -v http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/api/health
   ```

2. **Check ALB status:**
   ```bash
   aws elbv2 describe-load-balancers \
     --names "shoreexplorer-test-alb" \
     --region us-east-1 \
     --query 'LoadBalancers[0].[State.Code,Scheme,SecurityGroups]'
   ```

3. **Check target health:**
   ```bash
   ./infra/aws/scripts/diagnose-alb.sh test
   ```

## Recommended Actions

### Immediate (to resolve current issue):

1. **Use HTTP instead of HTTPS**
   - Access: `http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/`

2. **Run diagnostics**
   ```bash
   ./infra/aws/scripts/diagnose-alb.sh test
   ```

3. **If issues found, run quick fix**
   ```bash
   ./infra/aws/scripts/quick-fix-alb.sh test
   ```

### Long-term (optional HTTPS setup):

To enable HTTPS, use the automated setup script:

```bash
./infra/aws/scripts/08-setup-https.sh test yourdomain.com
```

This will:
1. Request a free SSL certificate from AWS Certificate Manager
2. Guide you through DNS validation
3. Create HTTPS listener on port 443
4. Configure HTTP → HTTPS redirect
5. Show you how to point your domain to the ALB

**📖 Full guide:** See [infra/aws/HTTPS-SETUP.md](./infra/aws/HTTPS-SETUP.md) for complete step-by-step instructions.

**Manual steps (if you prefer):**

1. **Get a domain name**
   - Use Route 53 or any domain registrar

2. **Request SSL certificate**
   ```bash
   aws acm request-certificate \
     --domain-name yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

3. **Add HTTPS listener to ALB**
   ```bash
   aws elbv2 create-listener \
     --load-balancer-arn <alb-arn> \
     --protocol HTTPS \
     --port 443 \
     --certificates CertificateArn=<cert-arn> \
     --default-actions Type=forward,TargetGroupArn=<frontend-tg-arn>
   ```

4. **Point domain to ALB**
   - Create a CNAME record pointing to the ALB DNS name

## Summary

**99% likely:** You're using `https://` instead of `http://`

**Quick fix:** Use `http://` in the URL

**If that doesn't work:** Run `./infra/aws/scripts/diagnose-alb.sh test` and `./infra/aws/scripts/quick-fix-alb.sh test`

**For HTTPS setup:** See [infra/aws/HTTPS-SETUP.md](./infra/aws/HTTPS-SETUP.md)

**For detailed help:** See [infra/aws/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
