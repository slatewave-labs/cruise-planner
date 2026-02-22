"""
Unit tests for IAM policy documentation.

These ensure that both the automated policy snippet and the manual setup guide
include the new EventBridge and IAM actions required by the async deployment
callback feature.  The tests will fail if the docs are reverted or edited
without also updating the sample policies.
"""

import os

REPO_ROOT = os.path.join(os.path.dirname(__file__), "../..")
AWS_SETUP = os.path.join(REPO_ROOT, "infra/aws/AWS_GROQ_SETUP.md")
MANUAL_GUIDE = os.path.join(REPO_ROOT, "infra/aws/MANUAL-SETUP-GUIDE.md")


def test_aws_setup_lists_eventbridge_permissions():
    """The AWS_GROQ_SETUP documentation must contain the new EventBridge block.

    We look for the custom statement name (EventBridgeCallbackPermissions) as
    well as a representative action from that block.  This catches regressions
    where the snippet is accidentally reverted to the old version.
    """
    with open(AWS_SETUP) as f:
        content = f.read()

    assert "EventBridgeCallbackPermissions" in content, (
        "AWS_GROQ_SETUP.md must include an EventBridgeCallbackPermissions statement"
    )
    # also check for at least one of the actions that we added
    assert "events:CreateConnection" in content, (
        "EventBridge actions must appear in the policy snippet"
    )
    assert "iam:CreateRole" in content, (
        "IAM role creation actions should be documented for the deployer user"
    )


def test_manual_guide_warns_about_eventbridge():
    """The manual setup guide needs a note about EventBridge/IAM permissions.

    Since the bullet list uses IAMFullAccess by default the new actions are
    covered, but we also instruct the reader what to do if they prefer a
    least-privilege policy.
    """
    with open(MANUAL_GUIDE) as f:
        content = f.read()

    assert "EventBridge" in content, (
        "Manual setup guide should mention EventBridge when describing policies"
    )
    assert "events:CreateConnection" in content or "iam:CreateRole" in content, (
        "Guide must reference at least one of the required EventBridge/IAM actions"
    )
