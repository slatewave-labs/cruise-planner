"""CloudWatch metrics publisher for ShoreExplorer API.

Emits custom application metrics (request count, latency, error rates,
AI generation times) to CloudWatch so they appear on the monitoring
dashboard created by ``infra/aws/scripts/10-setup-monitoring.sh``.

Metrics are published asynchronously in batches to avoid blocking the
request path.  When running outside of AWS (local dev, CI) the module
gracefully degrades to a no-op logger.
"""

import logging
import os
import threading
import time
from collections import deque
from typing import Any, Deque, Dict, List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
_ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")
_PROJECT = "shoreexplorer"
_NAMESPACE = f"{_PROJECT}/{_ENVIRONMENT}"
_ENABLED = os.environ.get("ENABLE_CLOUDWATCH_METRICS", "").lower() in (
    "1",
    "true",
    "yes",
)
_FLUSH_INTERVAL = 60  # seconds between batch flushes
_MAX_BUFFER_SIZE = 500  # drop oldest if buffer exceeds this

# ---------------------------------------------------------------------------
# CloudWatch client (lazy-initialised)
# ---------------------------------------------------------------------------
_cw_client = None
_cw_lock = threading.Lock()


def _get_cw_client():
    """Return a boto3 CloudWatch client, creating one on first call."""
    global _cw_client
    if _cw_client is None:
        with _cw_lock:
            if _cw_client is None:
                try:
                    import boto3

                    _cw_client = boto3.client(
                        "cloudwatch",
                        region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
                    )
                except Exception:
                    logger.debug("CloudWatch client unavailable — metrics disabled")
    return _cw_client


# ---------------------------------------------------------------------------
# Metric buffer & background flush
# ---------------------------------------------------------------------------
_buffer: Deque[Dict[str, Any]] = deque(maxlen=_MAX_BUFFER_SIZE)
_buffer_lock = threading.Lock()
_flush_state = {"thread_started": False}


def _flush_metrics() -> None:
    """Publish buffered metric data to CloudWatch in batches of 25."""
    with _buffer_lock:
        items: List[Dict[str, Any]] = list(_buffer)
        _buffer.clear()

    if not items:
        return

    client = _get_cw_client()
    if client is None:
        return

    # CloudWatch PutMetricData accepts up to 25 metric data per call
    for i in range(0, len(items), 25):
        batch = items[i : i + 25]
        try:
            client.put_metric_data(Namespace=_NAMESPACE, MetricData=batch)
        except Exception:
            logger.debug("Failed to publish CloudWatch metrics batch", exc_info=True)


def _flush_loop() -> None:
    """Background thread that periodically flushes the metric buffer."""
    while True:
        time.sleep(_FLUSH_INTERVAL)
        try:
            _flush_metrics()
        except Exception:
            logger.debug("Metric flush error", exc_info=True)


def _ensure_flush_thread() -> None:
    if not _flush_state["thread_started"]:
        with _cw_lock:
            if not _flush_state["thread_started"]:
                t = threading.Thread(target=_flush_loop, daemon=True)
                t.start()
                _flush_state["thread_started"] = True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def emit_request_metric(
    method: str,
    path: str,
    status_code: int,
    latency_ms: float,
) -> None:
    """Record an API request metric (count + latency).

    Parameters
    ----------
    method:
        HTTP method (GET, POST, …).
    path:
        Request path, normalised to the first two path segments
        (e.g. ``/api/trips``).
    status_code:
        HTTP response status code.
    latency_ms:
        Total response time in milliseconds.
    """
    if not _ENABLED:
        return

    _ensure_flush_thread()

    # Normalise path to reduce high-cardinality (e.g. /api/trips/abc → /api/trips)
    segments = [s for s in path.split("/") if s]
    normalised = "/" + "/".join(segments[:3]) if len(segments) >= 3 else path

    status_class = f"{status_code // 100}xx"
    timestamp = time.time()

    with _buffer_lock:
        # Request count by status class
        _buffer.append(
            {
                "MetricName": "RequestCount",
                "Dimensions": [
                    {"Name": "StatusClass", "Value": status_class},
                ],
                "Value": 1,
                "Unit": "Count",
                "Timestamp": timestamp,
            }
        )
        # Request count by endpoint
        _buffer.append(
            {
                "MetricName": "RequestCount",
                "Dimensions": [
                    {"Name": "Endpoint", "Value": normalised},
                ],
                "Value": 1,
                "Unit": "Count",
                "Timestamp": timestamp,
            }
        )
        # Response latency
        _buffer.append(
            {
                "MetricName": "ResponseLatency",
                "Dimensions": [
                    {"Name": "Service", "Value": "backend"},
                ],
                "Value": latency_ms,
                "Unit": "Milliseconds",
                "Timestamp": timestamp,
            }
        )


def emit_ai_generation_metric(
    latency_ms: float,
    success: bool,
) -> None:
    """Record an AI plan-generation attempt.

    Parameters
    ----------
    latency_ms:
        Wall-clock time for the generation call in milliseconds.
    success:
        Whether the generation succeeded.
    """
    if not _ENABLED:
        return

    _ensure_flush_thread()

    result = "success" if success else "error"
    timestamp = time.time()

    with _buffer_lock:
        _buffer.append(
            {
                "MetricName": "AIGenerationCount",
                "Dimensions": [
                    {"Name": "Result", "Value": result},
                ],
                "Value": 1,
                "Unit": "Count",
                "Timestamp": timestamp,
            }
        )
        _buffer.append(
            {
                "MetricName": "AIGenerationLatency",
                "Dimensions": [
                    {"Name": "Service", "Value": "backend"},
                ],
                "Value": latency_ms,
                "Unit": "Milliseconds",
                "Timestamp": timestamp,
            }
        )
