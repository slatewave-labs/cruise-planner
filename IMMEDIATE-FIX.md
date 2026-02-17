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

## Setting Up HTTPS (Optional - For Later)

If you want HTTPS in the future, you'll need to:

1. Register a domain name (e.g., via Route 53)
2. Request an SSL certificate in AWS Certificate Manager
3. Add an HTTPS listener to your ALB
4. Point your domain to the ALB DNS

See [CONNECTION-ERROR-FIX.md](./CONNECTION-ERROR-FIX.md) section "Long-term (optional HTTPS setup)" for detailed steps.

## Summary

**Action:** Use `http://` instead of `https://` in your browser

**Expected Result:** Application should load normally

**If still broken:** Run `./infra/aws/scripts/diagnose-alb.sh test` and share the output

---

**Questions?** Check the troubleshooting guide or run the diagnostic script.
