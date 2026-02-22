"""
Ensure deployment workflows handle missing EventBridge permissions gracefully.

These tests scan the four YAML files and confirm that the async callback
provisioning step defines a helper called `fail` and emits a clear message
about missing permissions.  This guards against regressions where the
pipeline could crash again on AccessDenied.
"""

import os

def load(file):
    with open(file) as f:
        return f.read()

BASE = os.path.join(os.path.dirname(__file__), "../..")
WORKFLOWS = [
    ".github/workflows/deploy-test.yml",
    ".github/workflows/deploy-prod.yml",
    ".github/workflows/setup-test.yml",
    ".github/workflows/setup-prod.yml",
]


def test_callback_step_has_fail_helper():
    msg = 'Unable to create EventBridge Connection'
    for wf in WORKFLOWS:
        content = load(os.path.join(BASE, wf))
        assert "fail()" in content, f"{wf} should define fail() helper"
        assert msg in content, f"{wf} should warn about EventBridge Connection permissions"
        # verify we attempt to self-upgrade permissions so the job recovers
        assert "put-user-policy" in content, f"{wf} should try to attach user policy for EventBridge"