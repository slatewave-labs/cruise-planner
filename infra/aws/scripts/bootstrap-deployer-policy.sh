#!/usr/bin/env bash
# =============================================================================
# Bootstrap IAM Permissions for shoreexplorer-deployer
# =============================================================================
# One-time script that attaches ALL required IAM permissions for the deployer
# user to provision, deploy, and tear down ShoreExplorer infrastructure.
#
# Usage: ./infra/aws/scripts/bootstrap-deployer-policy.sh [username]
#        Default username: shoreexplorer-deployer
#
# What this does:
#   1. Attaches 9 AWS managed policies for core services
#   2. Creates an inline user policy for supplementary services
#      (S3, CloudFront, Route 53, ACM)
#
# Idempotent: safe to re-run — skips already-attached policies and
#             overwrites the inline policy with the latest version.
#
# Prerequisites:
#   - AWS CLI installed and configured (with admin/IAM permissions)
#   - The target IAM user must already exist
# =============================================================================

set -euo pipefail

USERNAME="${1:-shoreexplorer-deployer}"

# ---------------------------------------------------------------------------
# Verify AWS credentials and target user
# ---------------------------------------------------------------------------
if ! aws sts get-caller-identity --no-cli-pager >/dev/null 2>&1; then
    echo "❌ AWS credentials not configured or invalid."
    echo "   Run: aws configure"
    exit 1
fi

if ! aws iam get-user --user-name "$USERNAME" --no-cli-pager >/dev/null 2>&1; then
    echo "❌ IAM user '$USERNAME' does not exist."
    echo "   Create it first:"
    echo "     aws iam create-user --user-name $USERNAME"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ShoreExplorer — Bootstrap Deployer IAM Permissions         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  User:    $USERNAME"
echo "  Account: $ACCOUNT_ID"
echo ""

# ---------------------------------------------------------------------------
# 1. Attach AWS Managed Policies
# ---------------------------------------------------------------------------
# These cover the core AWS services used by the setup, deploy, and teardown
# scripts.  CloudWatchFullAccess also includes EventBridge (events:*) which
# is needed for the async deployment callback.
# IAMFullAccess covers iam:CreateRole, iam:TagRole, iam:PassRole, etc.
# ---------------------------------------------------------------------------
MANAGED_POLICIES=(
    "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
    "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess"
    "arn:aws:iam::aws:policy/AmazonVPCFullAccess"
    "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
    "arn:aws:iam::aws:policy/CloudWatchFullAccess"
    "arn:aws:iam::aws:policy/IAMFullAccess"
    "arn:aws:iam::aws:policy/AWSCodeDeployFullAccess"
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
)

echo "  Attaching managed policies..."
echo ""

# Get currently attached policies once (avoid repeated API calls)
ATTACHED=$(aws iam list-attached-user-policies --user-name "$USERNAME" \
    --no-cli-pager --query "AttachedPolicies[].PolicyArn" --output text 2>/dev/null || echo "")

for POLICY_ARN in "${MANAGED_POLICIES[@]}"; do
    POLICY_NAME="${POLICY_ARN##*/}"
    if echo "$ATTACHED" | grep -q "$POLICY_ARN" 2>/dev/null; then
        echo "  ⏭️  $POLICY_NAME (already attached)"
    else
        aws iam attach-user-policy \
            --user-name "$USERNAME" \
            --policy-arn "$POLICY_ARN" \
            --no-cli-pager
        echo "  ✅ $POLICY_NAME"
    fi
done

# ---------------------------------------------------------------------------
# 2. Create Inline Policy for Supplementary Services
# ---------------------------------------------------------------------------
# The managed policies above do not cover S3, CloudFront, Route 53, or ACM.
# These are needed for:
#   - S3: Frontend static file hosting (deploy-test/prod workflows)
#   - CloudFront: CDN distribution + cache invalidation
#   - Route 53: DNS subdomain setup (09-setup-dns-subdomain.sh)
#   - ACM: SSL certificate management (08-setup-https.sh)
# ---------------------------------------------------------------------------
INLINE_POLICY_NAME="ShoreExplorerSupplementary"

INLINE_POLICY=$(cat <<'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3FrontendDeploy",
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:DeleteBucket",
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:HeadBucket",
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutBucketPolicy",
                "s3:GetBucketPolicy",
                "s3:PutBucketVersioning",
                "s3:PutBucketPublicAccessBlock",
                "s3:PutBucketEncryption",
                "s3:PutBucketTagging",
                "s3:PutBucketWebsite",
                "s3:GetBucketWebsite"
            ],
            "Resource": [
                "arn:aws:s3:::shoreexplorer-*",
                "arn:aws:s3:::shoreexplorer-*/*"
            ]
        },
        {
            "Sid": "CloudFrontManagement",
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateDistribution",
                "cloudfront:UpdateDistribution",
                "cloudfront:GetDistribution",
                "cloudfront:ListDistributions",
                "cloudfront:CreateInvalidation",
                "cloudfront:GetInvalidation",
                "cloudfront:TagResource",
                "cloudfront:CreateOriginAccessControl",
                "cloudfront:GetOriginAccessControl",
                "cloudfront:ListOriginAccessControls",
                "cloudfront:DeleteDistribution",
                "cloudfront:DeleteOriginAccessControl"
            ],
            "Resource": "*"
        },
        {
            "Sid": "Route53DNS",
            "Effect": "Allow",
            "Action": [
                "route53:ListHostedZonesByName",
                "route53:ListHostedZones",
                "route53:GetHostedZone",
                "route53:ChangeResourceRecordSets",
                "route53:GetChange",
                "route53:ListResourceRecordSets",
                "route53:CreateHostedZone"
            ],
            "Resource": "*"
        },
        {
            "Sid": "ACMCertificates",
            "Effect": "Allow",
            "Action": [
                "acm:RequestCertificate",
                "acm:DescribeCertificate",
                "acm:ListCertificates",
                "acm:DeleteCertificate",
                "acm:AddTagsToCertificate"
            ],
            "Resource": "*"
        }
    ]
}
EOF
)

echo ""
echo "  Creating inline policy: $INLINE_POLICY_NAME"

aws iam put-user-policy \
    --user-name "$USERNAME" \
    --policy-name "$INLINE_POLICY_NAME" \
    --policy-document "$INLINE_POLICY" \
    --no-cli-pager

echo "  ✅ $INLINE_POLICY_NAME"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployer Permissions Configured!                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  $USERNAME now has permissions for:"
echo ""
echo "    Managed policies (9):"
echo "      • AmazonECS_FullAccess"
echo "      • AmazonEC2ContainerRegistryFullAccess"
echo "      • ElasticLoadBalancingFullAccess"
echo "      • AmazonVPCFullAccess"
echo "      • SecretsManagerReadWrite"
echo "      • CloudWatchFullAccess  (includes EventBridge)"
echo "      • IAMFullAccess  (includes iam:TagRole, iam:PassRole)"
echo "      • AWSCodeDeployFullAccess"
echo "      • AmazonDynamoDBFullAccess"
echo ""
echo "    Inline policy (ShoreExplorerSupplementary):"
echo "      • S3  (frontend static file hosting)"
echo "      • CloudFront  (CDN distribution)"
echo "      • Route 53  (DNS management)"
echo "      • ACM  (SSL certificates)"
echo ""
echo "  Next steps:"
echo "    1. Run setup:  ./infra/aws/scripts/setup-all.sh test"
echo "    2. Deploy:     ./infra/aws/scripts/build-and-deploy.sh test"
echo ""
