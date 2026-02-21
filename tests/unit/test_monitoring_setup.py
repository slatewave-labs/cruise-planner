"""
Unit tests for monitoring infrastructure setup.

Validates that:
- The deployer IAM user policy documentation includes CloudWatchFullAccess
  (required for cloudwatch:PutDashboard used in 10-setup-monitoring.sh)
- The monitoring setup script handles cloudwatch:PutDashboard errors gracefully
  instead of exiting the entire script on AccessDenied
- The create_alarm helper uses --extended-statistic for percentile statistics
- The put-dashboard error handler surfaces the actual AWS error
"""
import json
import os
import re
import subprocess

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
        r"if\s+(?:\w+=\$\()?aws cloudwatch put-dashboard\b",
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


def test_create_alarm_uses_extended_statistic_for_percentiles():
    """The create_alarm helper must use --extended-statistic for percentile stats.

    AWS CLI put-metric-alarm requires --extended-statistic (not --statistic) for
    percentile statistics like p50, p95, p99.  Using --statistic with a percentile
    value causes the alarm creation to fail silently.
    """
    with open(MONITORING_SCRIPT) as f:
        content = f.read()

    assert "--extended-statistic" in content, (
        "10-setup-monitoring.sh must use '--extended-statistic' for percentile "
        "statistics (p50, p95, p99). AWS CLI rejects percentiles passed via "
        "'--statistic'."
    )


def test_create_alarm_does_not_hardcode_statistic_flag():
    """The create_alarm helper must NOT unconditionally use --statistic for all stats.

    The function must branch: use --statistic for standard stats (Average, Sum, etc.)
    and --extended-statistic for percentile stats (p50, p95, p99, etc.).
    A single hard-coded '--statistic "$statistic"' line means percentile alarms break.
    """
    with open(MONITORING_SCRIPT) as f:
        content = f.read()

    # Extract the create_alarm function body
    func_match = re.search(
        r"create_alarm\s*\(\)\s*\{(.*?)\n\}",
        content,
        re.DOTALL,
    )
    assert func_match, "Could not find create_alarm() function in monitoring script"
    func_body = func_match.group(1)

    # The function should NOT have a single unconditional --statistic line
    # that applies to all statistics including percentiles.
    # It should have conditional logic to choose between --statistic and
    # --extended-statistic.
    has_statistic = "--statistic" in func_body
    has_extended = "--extended-statistic" in func_body
    has_conditional = re.search(r"if\s+\[\[.*statistic", func_body)

    assert has_statistic and has_extended and has_conditional, (
        "create_alarm() must conditionally choose between '--statistic' (for "
        "Average, Sum, etc.) and '--extended-statistic' (for p50, p95, p99). "
        f"Found --statistic={has_statistic}, --extended-statistic={has_extended}, "
        f"conditional={bool(has_conditional)}"
    )


def test_put_dashboard_error_is_surfaced():
    """The put-dashboard error handler must show the actual AWS error, not suppress it.

    Using '2>/dev/null' on the put-dashboard call hides the real AWS error
    (e.g. InvalidParameterInput vs AccessDenied), making debugging impossible.
    The stderr output must be captured and printed.
    """
    with open(MONITORING_SCRIPT) as f:
        content = f.read()

    # Find the put-dashboard section (between the heredoc end and rm -f)
    dashboard_section = re.search(
        r"DASHBOARD_EOF.*?rm\s+-f\s+/tmp/dashboard-body\.json",
        content,
        re.DOTALL,
    )
    assert dashboard_section, "Could not find put-dashboard section"
    section = dashboard_section.group(0)

    # The put-dashboard call must NOT suppress stderr with 2>/dev/null
    assert "put-dashboard" in section
    # Check that 2>/dev/null is not used on the put-dashboard line
    put_dash_line = [
        line for line in section.split("\n") if "put-dashboard" in line
    ]
    for line in put_dash_line:
        assert "2>/dev/null" not in line, (
            "put-dashboard must not use '2>/dev/null' — the actual AWS error "
            "must be captured and surfaced for debugging. Use '2>&1' instead."
        )


def test_dashboard_json_template_produces_valid_json():
    """The dashboard heredoc template must produce valid JSON after variable expansion.

    Runs the heredoc through bash with representative variable values and validates
    that the output is well-formed JSON with the expected widget structure.
    """
    # Simulate the shell variable expansion by running the heredoc in bash
    script = r"""
        ENVIRONMENT=test
        PROJECT_NAME=shoreexplorer
        APP_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
        AWS_REGION=us-east-1
        ECS_CLUSTER_NAME="${APP_NAME}-cluster"
        BACKEND_SERVICE_NAME="${APP_NAME}-backend"
        FRONTEND_SERVICE_NAME="${APP_NAME}-frontend"
        ALB_ARN_SUFFIX="app/test-alb/abc123"
        BACKEND_TG_ARN_SUFFIX="test-backend-tg/def456"
        FRONTEND_TG_ARN_SUFFIX="test-frontend-tg/ghi789"
        METRIC_NAMESPACE="${PROJECT_NAME}/${ENVIRONMENT}"
    """

    # Read the heredoc from the monitoring script
    with open(MONITORING_SCRIPT) as f:
        content = f.read()

    heredoc_match = re.search(
        r"cat > /tmp/dashboard-body\.json << DASHBOARD_EOF\n(.*?)\nDASHBOARD_EOF",
        content,
        re.DOTALL,
    )
    assert heredoc_match, "Could not find dashboard heredoc in monitoring script"

    heredoc_body = heredoc_match.group(1)

    # Run through bash to expand variables
    full_script = script + '\ncat << DASHBOARD_EOF\n' + heredoc_body + '\nDASHBOARD_EOF'
    result = subprocess.run(
        ["bash", "-c", full_script],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"Heredoc expansion failed: {result.stderr}"

    # Validate JSON
    dashboard = json.loads(result.stdout)
    assert "widgets" in dashboard, "Dashboard JSON must have a 'widgets' key"
    assert len(dashboard["widgets"]) > 0, "Dashboard must have at least one widget"

    # Verify widget types are valid CloudWatch types
    valid_types = {"text", "metric", "log", "alarm", "explorer"}
    for widget in dashboard["widgets"]:
        assert widget["type"] in valid_types, (
            f"Invalid widget type '{widget['type']}' — "
            f"must be one of {valid_types}"
        )
        # Every widget must have position and size
        for key in ("x", "y", "width", "height"):
            assert key in widget, f"Widget missing '{key}': {widget.get('type')}"
        # Width must not exceed dashboard grid (24 units)
        assert widget["x"] + widget["width"] <= 24, (
            f"Widget exceeds grid: x={widget['x']} + width={widget['width']} > 24"
        )
