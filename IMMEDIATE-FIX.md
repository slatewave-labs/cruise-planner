# IMMEDIATE ACTION REQUIRED - Test Environment Access

## The Issue

You reported getting a "connection closed" error when accessing:
```
https://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/
```

## The Solution (99% Likely)

### ✅ Change HTTPS to HTTP

Your test environment ALB is configured for **HTTP only**. Try this URL instead:

```
http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/
```

Note the `http://` instead of `https://`

## Why This Happens

The AWS infrastructure was set up with:
- ✅ HTTP listener on port 80
- ❌ NO HTTPS listener on port 443
- ❌ NO SSL certificate

This is intentional for the test environment to keep it simple and free. HTTPS requires additional setup.

## Verification

Try these commands to verify it's working:

```bash
# Test frontend
curl -v http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/

# Test backend health endpoint
curl -v http://shoreexplorer-test-alb-1291062377.us-east-1.elb.amazonaws.com/api/health
```

Expected result: HTTP 200 response

## If HTTP Doesn't Work

If you're still getting errors with HTTP, run the diagnostic script:

```bash
cd /path/to/cruise-planner
./infra/aws/scripts/diagnose-alb.sh test
```

This will check:
- ALB status
- Security groups
- Target health
- ECS services
- Actual connectivity

Then run the quick fix:

```bash
./infra/aws/scripts/quick-fix-alb.sh test
```

This will automatically:
- Ensure port 80 is open
- Force redeploy if needed
- Test connectivity

## Complete Documentation

I've created comprehensive troubleshooting resources:

1. **Quick Reference:** [CONNECTION-ERROR-FIX.md](./CONNECTION-ERROR-FIX.md)
2. **Full Guide:** [infra/aws/TROUBLESHOOTING.md](./infra/aws/TROUBLESHOOTING.md)
3. **Scripts Docs:** [infra/aws/scripts/README.md](./infra/aws/scripts/README.md)
4. **HTTPS Setup:** [infra/aws/HTTPS-SETUP.md](./infra/aws/HTTPS-SETUP.md)

## Setting Up HTTPS (Optional - For Later)

If you want HTTPS in the future, we now have an **automated setup script**:

```bash
./infra/aws/scripts/08-setup-https.sh test yourdomain.com
```

This will:
- ✓ Request a free SSL certificate from AWS Certificate Manager
- ✓ Guide you through DNS validation
- ✓ Create HTTPS listener on port 443
- ✓ Configure HTTP → HTTPS redirect
- ✓ Show you how to point your domain to the ALB

**📖 Full step-by-step guide:** [infra/aws/HTTPS-SETUP.md](./infra/aws/HTTPS-SETUP.md)

**Requirements:**
1. A domain name (~$12/year)
2. Access to DNS settings for validation

**Cost:** Only the domain registration (~$12/year) - SSL certificate is FREE from AWS!

## Summary

**Action:** Use `http://` instead of `https://` in your browser

**Expected Result:** Application should load normally

**If still broken:** Run `./infra/aws/scripts/diagnose-alb.sh test` and share the output

---

**Questions?** Check the troubleshooting guide or run the diagnostic script.
