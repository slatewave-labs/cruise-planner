"""
Security hardening tests: input validation, headers, rate limiting, prompt sanitization.
"""

import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from server import _sanitize, app  # noqa: E402

client = TestClient(app, raise_server_exceptions=False)


# ── Security headers ──────────────────────────────────────────────────────────


class TestSecurityHeaders:
    def test_x_content_type_options(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": "k"}):
            r = client.get("/api/health")
        assert r.headers.get("x-content-type-options") == "nosniff"

    def test_x_frame_options(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": "k"}):
            r = client.get("/api/health")
        assert r.headers.get("x-frame-options") == "DENY"

    def test_referrer_policy(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": "k"}):
            r = client.get("/api/health")
        assert r.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    def test_content_security_policy_present(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": "k"}):
            r = client.get("/api/health")
        assert "content-security-policy" in r.headers


# ── CORS allow_headers tightened ─────────────────────────────────────────────


class TestCORSHeaders:
    def test_cors_allow_headers_no_wildcard(self):
        """CORS allow_headers must not be a bare wildcard."""
        # Inspect the CORSMiddleware config stored on the app
        for mw in app.user_middleware:
            if "CORSMiddleware" in str(mw):
                kwargs = mw.kwargs if hasattr(mw, "kwargs") else {}
                ah = kwargs.get("allow_headers", [])
                assert ah != ["*"], "allow_headers must not be wildcard"
                break


# ── Pydantic model field constraints ─────────────────────────────────────────


class TestInputValidation:
    # GeneratePlanInput validation
    def test_invalid_party_type_rejected(self):
        r = client.post(
            "/api/plans/generate",
            json={
                "trip_id": "t1",
                "port_id": "p1",
                "port_name": "Barcelona",
                "port_country": "Spain",
                "latitude": 41.38,
                "longitude": 2.19,
                "arrival": "2027-06-01T08:00",
                "departure": "2027-06-01T18:00",
                "preferences": {
                    "party_type": "INVALID",
                    "activity_level": "light",
                    "transport_mode": "walking",
                    "budget": "free",
                },
            },
            headers={"X-Device-Id": "dev-1"},
        )
        assert r.status_code == 422

    def test_invalid_activity_level_rejected(self):
        r = client.post(
            "/api/plans/generate",
            json={
                "trip_id": "t1",
                "port_id": "p1",
                "port_name": "Barcelona",
                "port_country": "Spain",
                "latitude": 41.38,
                "longitude": 2.19,
                "arrival": "2027-06-01T08:00",
                "departure": "2027-06-01T18:00",
                "preferences": {
                    "party_type": "solo",
                    "activity_level": "extreme",
                    "transport_mode": "walking",
                    "budget": "free",
                },
            },
            headers={"X-Device-Id": "dev-1"},
        )
        assert r.status_code == 422

    def test_invalid_currency_rejected(self):
        r = client.post(
            "/api/plans/generate",
            json={
                "trip_id": "t1",
                "port_id": "p1",
                "port_name": "Barcelona",
                "port_country": "Spain",
                "latitude": 41.38,
                "longitude": 2.19,
                "arrival": "2027-06-01T08:00",
                "departure": "2027-06-01T18:00",
                "preferences": {
                    "party_type": "solo",
                    "activity_level": "light",
                    "transport_mode": "walking",
                    "budget": "free",
                    "currency": "gbp",  # lowercase – invalid
                },
            },
            headers={"X-Device-Id": "dev-1"},
        )
        assert r.status_code == 422

    def test_valid_currency_accepted(self):
        """Valid currency passes Pydantic validation (may fail later at LLM layer)."""
        # We only need 422 NOT to be returned for valid input
        r = client.post(
            "/api/plans/generate",
            json={
                "trip_id": "t1",
                "port_id": "p1",
                "port_name": "Barcelona",
                "port_country": "Spain",
                "latitude": 41.38,
                "longitude": 2.19,
                "arrival": "2027-06-01T08:00",
                "departure": "2027-06-01T18:00",
                "preferences": {
                    "party_type": "solo",
                    "activity_level": "light",
                    "transport_mode": "walking",
                    "budget": "free",
                    "currency": "USD",
                },
            },
            headers={"X-Device-Id": "dev-1"},
        )
        assert r.status_code != 422

    def test_generate_plan_latitude_out_of_range_rejected(self):
        r = client.post(
            "/api/plans/generate",
            json={
                "trip_id": "t1",
                "port_id": "p1",
                "port_name": "Barcelona",
                "port_country": "Spain",
                "latitude": 999.0,
                "longitude": 2.19,
                "arrival": "2027-06-01T08:00",
                "departure": "2027-06-01T18:00",
                "preferences": {
                    "party_type": "solo",
                    "activity_level": "light",
                    "transport_mode": "walking",
                    "budget": "free",
                },
            },
            headers={"X-Device-Id": "dev-1"},
        )
        assert r.status_code == 422

    # Weather endpoint
    def test_weather_latitude_out_of_range_rejected(self):
        r = client.get("/api/weather?latitude=999&longitude=0")
        assert r.status_code == 422

    def test_weather_longitude_out_of_range_rejected(self):
        r = client.get("/api/weather?latitude=0&longitude=999")
        assert r.status_code == 422

    def test_weather_bad_date_format_rejected(self):
        r = client.get("/api/weather?latitude=41&longitude=2&date=not-a-date")
        assert r.status_code == 422

    def test_weather_valid_date_accepted(self):
        from unittest.mock import AsyncMock

        with patch("httpx.AsyncClient") as mock_ac:
            mock_client = MagicMock()
            mock_client.__aenter__.return_value = mock_client
            mock_ac.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {}
            mock_client.get = AsyncMock(return_value=mock_resp)
            r = client.get("/api/weather?latitude=41&longitude=2&date=2025-06-01")
        assert r.status_code == 200


# ── Prompt sanitization helper ───────────────────────────────────────────────


class TestSanitize:
    def test_strips_null_bytes(self):
        assert "\x00" not in _sanitize("hello\x00world")

    def test_strips_newline_control_chars(self):
        result = _sanitize("ignore\ninjection\r\nhere")
        assert "\n" not in result
        assert "\r" not in result
        assert result == "ignoreinjectionhere"

    def test_strips_escape_sequence(self):
        assert "\x1b" not in _sanitize("text\x1b[31mred")
        assert _sanitize("text\x1b[31mred") == "text[31mred"

    def test_strips_unicode_directional_override(self):
        assert _sanitize("hello\u202eworld") == "helloworld"

    def test_strips_zero_width_space(self):
        assert _sanitize("hello\u200bworld") == "helloworld"

    def test_preserves_normal_text(self):
        assert _sanitize("Barcelona, Spain") == "Barcelona, Spain"

    def test_preserves_unicode(self):
        assert _sanitize("Côte d'Azur") == "Côte d'Azur"
