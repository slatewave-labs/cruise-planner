# AWS Infrastructure

This template uses a minimal AWS stack for static site hosting:

## Architecture

```
┌───────────┐      ┌──────────────┐      ┌──────────────┐
│  Browser  │─────▶│  CloudFront  │─────▶│   S3 Bucket  │
│           │◀─────│  (CDN/HTTPS) │◀─────│  (private)   │
└───────────┘      └──────────────┘      └──────────────┘
                         │
                   ┌─────┴─────┐
                   │    OAC    │
                   │ (access   │
                   │  control) │
                   └───────────┘
```

## Resources Created

| Resource | Purpose |
|----------|---------|
| **S3 Bucket** | Stores static site files (private, versioned, encrypted) |
| **CloudFront Distribution** | CDN with HTTPS, HTTP/2+3, gzip compression |
| **Origin Access Control** | Ensures only CloudFront can read from S3 |
| **Route 53 Record** | (Optional) Maps custom domain to CloudFront |

## How It Works

1. **Setup workflow** creates the S3 bucket, CloudFront distribution, and OAC
2. **Deploy workflow** builds the site, syncs to S3, and invalidates CloudFront
3. **Teardown workflow** destroys all resources (requires confirmation)

## Custom Domain Setup

To use a custom domain:

1. Register or transfer your domain to Route 53
2. Request an ACM certificate in **us-east-1** (required for CloudFront)
3. Add these GitHub secrets:
   - `PROD_DOMAIN` — your domain (e.g., `example.com`)
   - `PROD_ACM_CERT_ARN` — the ACM certificate ARN
   - `TEST_DOMAIN` — same domain (test uses `test.example.com`)
   - `TEST_ACM_CERT_ARN` — the ACM certificate ARN

4. Run the setup workflow — it will configure DNS automatically

## IAM Permissions

The deploying IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:PutBucketPolicy",
        "s3:PutBucketVersioning",
        "s3:PutBucketTagging",
        "s3:PutBucketEncryption",
        "s3:PutPublicAccessBlock",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:DeleteBucket",
        "s3:ListBucketVersions",
        "s3:DeleteObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::*-frontend",
        "arn:aws:s3:::*-frontend/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:HeadBucket"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:GetDistributionConfig",
        "cloudfront:UpdateDistribution",
        "cloudfront:DeleteDistribution",
        "cloudfront:ListDistributions",
        "cloudfront:CreateInvalidation",
        "cloudfront:CreateOriginAccessControl",
        "cloudfront:GetOriginAccessControl",
        "cloudfront:DeleteOriginAccessControl",
        "cloudfront:ListOriginAccessControls"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZonesByName",
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

## Cost

| Resource | Estimated Cost |
|----------|---------------|
| S3 | ~$0.023/GB/month storage + $0.0004/1000 requests |
| CloudFront | Free tier: 1TB/month, then ~$0.085/GB |
| Route 53 | $0.50/month per hosted zone + $0.40/million queries |
| ACM | Free (for certificates used with CloudFront) |

**Typical cost for a low-traffic site: $1-5/month**
