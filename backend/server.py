import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from affiliate_config import process_plan_activities
from llm_client import (
    LLMAPIError,
    LLMAuthenticationError,
    LLMClient,
    LLMQuotaExceededError,
)
from metrics import emit_ai_generation_metric, emit_request_metric
from ports_data import CRUISE_PORTS

load_dotenv()

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(extra_fields)s"
        if hasattr(logging, "extra_fields")
        else "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    ),
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="ShoreExplorer API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Read allowed origins from env var (comma-separated); default to localhost for dev
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Device-Id", "X-Request-ID"],
)


# Request ID middleware for correlation and metrics
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    logger.info(
        f"Incoming request: {request.method} {request.url.path}",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
        },
    )
    start = time.monotonic()
    response = await call_next(request)
    latency_ms = (time.monotonic() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    emit_request_metric(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        latency_ms=latency_ms,
    )
    logger.info(
        f"Response: {request.method} {request.url.path} "
        f"status={response.status_code} latency={latency_ms:.1f}ms",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": round(latency_ms, 1),
        },
    )
    return response


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'"
    )
    return response


# --- Pydantic Models ---

_VALID_CURRENCY_RE = re.compile(r"^[A-Z]{3}$")
_CONTROL_CHAR_RE = re.compile(
    r"[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]"
)


def _sanitize(value: str) -> str:
    """Strip control and invisible characters to prevent prompt injection."""
    return _CONTROL_CHAR_RE.sub("", value).strip()


def _parse_datetime(value: str, field_name: str) -> datetime:
    """Parse an ISO-like datetime string, returning a naive datetime."""
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(
        f"{field_name} must be a valid datetime in ISO format "
        "(YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)"
    )


def _validate_arrival_departure(values: dict) -> dict:
    """Shared validation: arrival not >24h in past, departure not before arrival."""
    arrival_str = values.get("arrival", "")
    departure_str = values.get("departure", "")
    if not arrival_str or not departure_str:
        return values

    arrival_dt = _parse_datetime(arrival_str, "arrival")
    departure_dt = _parse_datetime(departure_str, "departure")

    earliest_allowed = datetime.now() - timedelta(hours=24)
    if arrival_dt < earliest_allowed:
        raise ValueError("arrival must not be more than 24 hours in the past")

    if departure_dt < arrival_dt:
        raise ValueError("departure must not be before arrival")

    return values


class PortInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    arrival: str = Field(min_length=1, max_length=50)
    departure: str = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def check_arrival_departure(self) -> "PortInput":
        _validate_arrival_departure(
            {"arrival": self.arrival, "departure": self.departure}
        )
        return self


class TripInput(BaseModel):
    ship_name: str = Field(min_length=1, max_length=200)
    cruise_line: Optional[str] = Field(default="", max_length=200)


class TripUpdate(BaseModel):
    ship_name: Optional[str] = Field(default=None, max_length=200)
    cruise_line: Optional[str] = Field(default=None, max_length=200)


class PlanPreferences(BaseModel):
    party_type: Literal["solo", "couple", "family"] = Field(
        description="solo, couple, or family"
    )
    activity_level: Literal["light", "moderate", "active", "intensive"] = Field(
        description="light, moderate, active, intensive"
    )
    transport_mode: Literal["walking", "public_transport", "taxi", "mixed"] = Field(
        description="walking, public_transport, taxi, mixed"
    )
    budget: Literal["free", "low", "medium", "high"] = Field(
        description="free, low, medium, high"
    )
    currency: str = Field(default="GBP", min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if not _VALID_CURRENCY_RE.match(v):
            raise ValueError(
                "currency must be exactly 3 uppercase letters (e.g. GBP, USD, EUR)"
            )
        return v


class GeneratePlanInput(BaseModel):
    trip_id: str = Field(min_length=1, max_length=100)
    port_id: str = Field(min_length=1, max_length=100)
    port_name: str = Field(min_length=1, max_length=100)
    port_country: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    arrival: str = Field(min_length=1, max_length=50)
    departure: str = Field(min_length=1, max_length=50)
    ship_name: str = Field(default="", max_length=200)
    preferences: PlanPreferences

    @model_validator(mode="after")
    def check_arrival_departure(self) -> "GeneratePlanInput":
        _validate_arrival_departure(
            {"arrival": self.arrival, "departure": self.departure}
        )
        return self


# --- Health ---


@app.get("/api/health")
def health():
    """Health check endpoint with service status diagnostics."""
    status = {
        "status": "ok",
        "service": "ShoreExplorer API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {"ai_service": "unknown"},
    }

    # Check AI service configuration
    if os.environ.get("GROQ_API_KEY"):
        status["checks"]["ai_service"] = "configured"
    else:
        status["checks"]["ai_service"] = "not_configured"
        status["status"] = "degraded"

    logger.info(f"Health check completed: {status['status']}")
    return status


# --- Port Search ---


@app.get("/api/ports/search")
def search_ports(
    q: str = Query("", min_length=0),
    region: Optional[str] = None,
    limit: int = Query(20, le=50),
):
    query = q.lower().strip()
    results = []
    for port in CRUISE_PORTS:
        if region and str(port["region"]).lower() != region.lower():
            continue
        if query:
            searchable = f"{port['name']} {port['country']} {port['region']}".lower()
            if query not in searchable:
                continue
        results.append(port)
        if len(results) >= limit:
            break
    return results


@app.get("/api/ports/regions")
def list_regions():
    regions = sorted(set(p["region"] for p in CRUISE_PORTS))
    return regions


# --- Weather (Open-Meteo) ---


@app.get("/api/weather")
async def get_weather(
    latitude: float = Query(ge=-90.0, le=90.0),
    longitude: float = Query(ge=-180.0, le=180.0),
    date: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    """Fetch weather forecast from Open-Meteo API."""
    logger.info("Fetching weather forecast")
    params: dict[str, Any] = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": (
            "temperature_2m_max,temperature_2m_min,precipitation_sum,"
            "weathercode,windspeed_10m_max"
        ),
        "timezone": "auto",
        "temperature_unit": "celsius",
    }
    if date:
        params["start_date"] = date
        params["end_date"] = date
    else:
        params["forecast_days"] = 7

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast", params=params, timeout=15
            )
            if resp.status_code != 200:
                logger.error(
                    f"Weather API returned status {resp.status_code}: {resp.text}"
                )
                raise HTTPException(
                    status_code=502,
                    detail={
                        "error": "weather_service_unavailable",
                        "message": (
                            "Weather service is temporarily unavailable. "
                            "Please try again later."
                        ),
                        "status_code": resp.status_code,
                    },
                )
            logger.info("Weather data retrieved successfully")
            return resp.json()
    except httpx.TimeoutException:
        logger.error("Weather API request timed out")
        raise HTTPException(
            status_code=504,
            detail={
                "error": "weather_service_timeout",
                "message": ("Weather service request timed out. Please try again."),
            },
        )
    except httpx.RequestError as e:
        logger.error(f"Weather API request failed: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail={
                "error": "weather_service_error",
                "message": (
                    "Failed to connect to weather service. " "Please try again later."
                ),
                "technical_details": str(e),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error fetching weather: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "weather_fetch_failed",
                "message": "An unexpected error occurred while fetching weather data.",
            },
        )


# --- Day Plan Generation (Gemini 2.0 Flash) ---


@app.post("/api/plans/generate")
@limiter.limit("10/minute")
async def generate_plan(
    request: Request, data: GeneratePlanInput, x_device_id: str = Header(max_length=200)
):
    """Generate an AI-powered day plan for a cruise port visit.

    Trip/plan data is stored on-device in localStorage. The backend only
    generates the plan and returns it — no database read or write needed.
    """

    logger.info(f"Generating plan for trip {data.trip_id}, port {data.port_id}")

    # Port details come directly from the client (localStorage-backed)
    port_name_raw = data.port_name
    port_country_raw = data.port_country
    port_latitude = data.latitude
    port_longitude = data.longitude
    port_arrival_raw = data.arrival
    port_departure_raw = data.departure
    ship_name_raw = data.ship_name

    # Fetch weather data (non-blocking - plan generation continues if this fails)
    weather_data = None
    try:
        arrival_date = port_arrival_raw[:10] if port_arrival_raw else None
        logger.info(f"Fetching weather for {port_name_raw} on {arrival_date}")
        async with httpx.AsyncClient() as client:
            params = {
                "latitude": port_latitude,
                "longitude": port_longitude,
                "daily": (
                    "temperature_2m_max,temperature_2m_min,precipitation_sum,"
                    "weathercode,windspeed_10m_max"
                ),
                "timezone": "auto",
                "temperature_unit": "celsius",
            }
            if arrival_date:
                params["start_date"] = arrival_date
                params["end_date"] = arrival_date
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast", params=params, timeout=15
            )
            if resp.status_code == 200:
                weather_data = resp.json()
                logger.info("Weather data retrieved successfully")
            else:
                logger.warning(f"Weather API returned status {resp.status_code}")
    except Exception as e:
        logger.warning(f"Failed to fetch weather data (non-blocking): {str(e)}")
        weather_data = None

    weather_summary = "Weather data unavailable."
    if weather_data and "daily" in weather_data:
        d = weather_data["daily"]
        temp_min = d.get("temperature_2m_min", ["?"])[0]
        temp_max = d.get("temperature_2m_max", ["?"])[0]
        precip = d.get("precipitation_sum", ["?"])[0]
        wind = d.get("windspeed_10m_max", ["?"])[0]
        weather_summary = (
            f"Temperature: {temp_min}°C - {temp_max}°C, "
            f"Precipitation: {precip}mm, Wind: {wind}km/h"
        )

    prefs = data.preferences
    currency = prefs.currency or "GBP"
    # Sanitize all user-controlled strings before inserting into LLM prompt
    port_name = _sanitize(port_name_raw)
    port_country = _sanitize(port_country_raw)
    ship_name = _sanitize(ship_name_raw)
    port_arrival = _sanitize(port_arrival_raw)
    port_departure = _sanitize(port_departure_raw)
    prompt = f"""You are a cruise port day planner. Create a detailed day plan \
for a cruise passenger visiting {port_name}, {port_country}.

CRUISE DETAILS:
- Ship: {ship_name}
- Port arrival: {port_arrival}
- Port departure: {port_departure}
- Weather forecast: {weather_summary}

TRAVELER PREFERENCES:
- Party type: {prefs.party_type}
- Activity level: {prefs.activity_level}
- Transport mode: {prefs.transport_mode}
- Budget: {prefs.budget}
- Preferred currency: {currency}

IMPORTANT RULES:
1. Create a circular route starting and ending at the cruise ship terminal/port area
2. Ensure return to ship at least 1 hour before scheduled departure
3. Include realistic travel times between activities
4. Consider weather conditions in activity selection
5. ALL temperatures must be in Celsius (°C) — never use Fahrenheit
6. ALL cost estimates must be shown in {currency} — use the {currency} symbol/code
7. The "total_estimated_cost" must also be in {currency}
8. Include 5-8 activities appropriate for the preferences
9. For each bookable activity, set "booking_url" to a REAL product-page URL on \
one of these platforms: viator.com, getyourguide.com, klook.com, tripadvisor.com, \
or booking.com. Only include a URL you are confident actually exists — do NOT \
invent or guess URLs. If you are unsure, set "booking_url" to null.
10. For each activity, set "booking_search_term" to a short search phrase a tourist \
would type on a booking platform to find this exact experience (e.g. \
"Skip the Line Sagrada Familia Guided Tour"). Keep it concise and specific.

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{{
  "plan_title": "string - catchy title for the day",
  "summary": "string - 2-3 sentence overview",
  "return_by": "string - recommended time to be back at ship",
  "total_estimated_cost": "string - estimated total cost per person in {currency}",
  "activities": [
    {{
      "order": 1,
      "name": "string - activity name",
      "description": "string - brief description",
      "location": "string - specific location/address",
      "latitude": number,
      "longitude": number,
      "start_time": "string - HH:MM format",
      "end_time": "string - HH:MM format",
      "duration_minutes": number,
      "cost_estimate": "string - e.g. Free, ~{currency} 8",
      "booking_url": "string or null - real URL on a supported booking platform",
      "booking_search_term": "string - short search phrase for booking platforms",
      "transport_to_next": "string - how to get to next activity",
      "travel_time_to_next": "string - estimated travel time",
      "tips": "string - useful tips for this activity"
    }}
  ],
  "packing_suggestions": ["string - items to bring"],
  "safety_tips": ["string - safety reminders"]
}}"""

    # Initialize LLM client
    try:
        llm_client = LLMClient()
    except ValueError as e:
        logger.error(f"Plan generation attempted but LLM is not configured: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "ai_service_not_configured",
                "message": (
                    "AI plan generation service is not configured. "
                    "Please contact your administrator to set up the "
                    "GROQ_API_KEY environment variable."
                ),
                "troubleshooting": (
                    "Administrators: Set the GROQ_API_KEY environment "
                    "variable with a valid Groq API key. "
                    "Get your free key at https://console.groq.com/keys"
                ),
            },
        )

    # Call LLM API
    ai_start = time.monotonic()
    ai_success = False
    try:
        logger.info(f"Calling LLM API for plan generation (port: {port_name})")
        system_instruction = (
            "You are an expert cruise port day planner. "
            "You always respond with valid JSON only, no markdown."
        )
        response_text = llm_client.generate_day_plan(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.7,
        )
        ai_success = True
        logger.info("LLM API call successful")
    except LLMQuotaExceededError as e:
        logger.error(f"LLM API quota exceeded: {str(e)}")
        emit_ai_generation_metric(
            latency_ms=(time.monotonic() - ai_start) * 1000, success=False
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": "ai_service_quota_exceeded",
                "message": (
                    "The AI service has reached its usage quota. "
                    "This is temporary - please try again in a few minutes."
                ),
                "troubleshooting": (
                    "Administrators: Check your Groq Console for "
                    "API quotas at https://console.groq.com/settings/limits"
                ),
                "retry_after": 300,  # Suggest retry after 5 minutes
            },
        )
    except LLMAuthenticationError as e:
        logger.error(f"LLM API authentication failed: {str(e)}")
        emit_ai_generation_metric(
            latency_ms=(time.monotonic() - ai_start) * 1000, success=False
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": "ai_service_auth_failed",
                "message": (
                    "AI service authentication failed. "
                    "The API key may be invalid or expired."
                ),
                "troubleshooting": (
                    "Administrators: Verify the GROQ_API_KEY environment "
                    "variable contains a valid, active API key from "
                    "https://console.groq.com/keys"
                ),
            },
        )
    except LLMAPIError as e:
        # Generic LLM API failure
        logger.error(f"LLM API error: {str(e)}")
        emit_ai_generation_metric(
            latency_ms=(time.monotonic() - ai_start) * 1000, success=False
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": "ai_service_unavailable",
                "message": (
                    "The AI plan generation service is temporarily unavailable. "
                    "Please try again in a few moments."
                ),
                "technical_details": str(e),
            },
        )

    # Emit success metric for the LLM call
    emit_ai_generation_metric(
        latency_ms=(time.monotonic() - ai_start) * 1000, success=ai_success
    )

    # Parse JSON response
    try:
        plan_data = llm_client.parse_json_response(response_text)
        logger.info("Successfully parsed LLM response as JSON")

        # Generate valid booking search URLs (AI-generated URLs are hallucinated)
        if "activities" in plan_data and isinstance(plan_data["activities"], list):
            plan_data["activities"] = process_plan_activities(
                plan_data["activities"], port_name=port_name
            )
            logger.info("Processed activities with booking URLs")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
        logger.debug(f"Raw response: {response_text[:500]}")  # Log first 500 chars
        # Fallback: Return raw response with error flag
        plan_data = {
            "raw_response": response_text,
            "parse_error": True,
            "error_message": (
                "The AI generated an invalid response format. "
                "Please try generating the plan again."
            ),
        }

    # Build plan response (stored on-device by the frontend)
    now = datetime.now(timezone.utc)
    plan = {
        "plan_id": str(uuid.uuid4()),
        "trip_id": data.trip_id,
        "port_id": data.port_id,
        "port_name": data.port_name,
        "port_country": data.port_country,
        "preferences": prefs.model_dump(),
        "weather": (
            weather_data.get("daily")
            if weather_data and "daily" in weather_data
            else None
        ),
        "plan": plan_data,
        "generated_at": now.isoformat(),
    }
    logger.info(f"Successfully generated plan {plan['plan_id']} for port {port_name}")
    return plan
