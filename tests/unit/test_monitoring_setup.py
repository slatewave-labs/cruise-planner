"""
Unit tests for monitoring infrastructure setup.

Validates that:
- The deployer IAM user policy documentation includes CloudWatchFullAccess
  (required for cloudwatch:PutDashboard used in 10-setup-monitoring.sh)
- The monitoring setup script handles cloudwatch:PutDashboard errors gracefully
  instead of exiting the entire script on AccessDenied
"""
import os
import re

REPO_ROOT = os.path.join(os.path.dirname(__file__), "../..")
MANUAL_SETUP_GUIDE = os.path.join(REPO_ROOT, "infra/aws/MANUAL-SETUP-GUIDE.md")
MONITORING_SCRIPT = os.path.join(REPO_ROOT, "infra/aws/scripts/10-setup-monitoring.sh")


def test_manual_setup_guide_requires_cloudwatch_full_access():
    """Deployer IAM user must have CloudWatchFullAccess, not just CloudWatchLogsFullAccess.

    CloudWatchLogsFullAccess only covers CloudWatch Logs API actions (logs:*).
    The monitoring setup script calls cloudwatch:PutDashboard and
    cloudwatch:PutMetricAlarm which require CloudWatchFullAccess.
    """
    with open(MANUAL_SETUP_GUIDE) as f:
        content = f.read()

    assert "CloudWatchFullAccess" in content, (
        "MANUAL-SETUP-GUIDE.md must list 'CloudWatchFullAccess' as a required policy "
        "for the shoreexplorer-deployer IAM user. "
        "cloudwatch:PutDashboard and cloudwatch:PutMetricAlarm require this policy."
    )


def test_manual_setup_guide_does_not_use_logs_only_policy():
    """Deployer guide must not reference the insufficient CloudWatchLogsFullAccess policy.

    CloudWatchLogsFullAccess only covers logs:* actions and does NOT grant
    cloudwatch:PutDashboard needed by 10-setup-monitoring.sh.
    """
    with open(MANUAL_SETUP_GUIDE) as f:
        content = f.read()

    assert "CloudWatchLogsFullAccess" not in content, (
        "MANUAL-SETUP-GUIDE.md must not list 'CloudWatchLogsFullAccess' as the "
        "CloudWatch policy for the deployer user — it must be 'CloudWatchFullAccess' "
        "which covers both dashboards/alarms (cloudwatch:*) and logs (logs:*)."
    )


def test_monitoring_script_put_dashboard_has_error_handling():
    """The put-dashboard call must not exit the script on failure.

    With 'set -euo pipefail', a bare 'aws cloudwatch put-dashboard' call exits
    the script with code 254 on AccessDenied. The call must be wrapped in an
    if/else block so that a permission error produces a clear warning rather
    than aborting the whole monitoring setup.
    """
    with open(MONITORING_SCRIPT) as f:
        content = f.read()

    # The put-dashboard invocation should be inside a conditional, not a bare call
    # A bare call would look like: "aws cloudwatch put-dashboard" on its own line
    # without an if/else guard.
    bare_call_pattern = re.compile(
        r"^\s*aws cloudwatch put-dashboard\b",
        re.MULTILINE,
    )
    conditional_call_pattern = re.compile(
        r"if\s+aws cloudwatch put-dashboard\b",
        re.MULTILINE,
    )

    bare_matches = bare_call_pattern.findall(content)
    conditional_matches = conditional_call_pattern.findall(content)

    assert conditional_matches, (
        "10-setup-monitoring.sh must wrap 'aws cloudwatch put-dashboard' in an "
        "if/else block to handle AccessDenied gracefully instead of crashing the script."
    )
    assert not bare_matches, (
        "10-setup-monitoring.sh has a bare 'aws cloudwatch put-dashboard' call that "
        "will abort the script on AccessDenied due to 'set -euo pipefail'. "
        "Wrap it in an if/else block."
    )
