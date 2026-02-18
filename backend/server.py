import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from affiliate_config import process_plan_activities
from dynamodb_client import DynamoDBClient
from llm_client import (
    LLMAPIError,
    LLMAuthenticationError,
    LLMClient,
    LLMQuotaExceededError,
)
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

app = FastAPI(title="ShoreExplorer API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID middleware for correlation
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
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# DynamoDB connection with error handling
table_name = os.environ.get("DYNAMODB_TABLE_NAME", "shoreexplorer")
region_name = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
endpoint_url = os.environ.get("DYNAMODB_ENDPOINT_URL")  # For local development

try:
    db_client = DynamoDBClient(
        table_name=table_name, region_name=region_name, endpoint_url=endpoint_url
    )
    # Test connection
    db_client.ping()
    logger.info(
        f"Successfully connected to DynamoDB table '{table_name}' "
        f"in region '{region_name}'"
    )
except (BotoCoreError, ClientError) as e:
    logger.error(f"Failed to connect to DynamoDB: {str(e)}")
    # Create placeholder client to avoid immediate startup failure
    # The actual operations will fail with informative errors
    db_client = None

# --- Pydantic Models ---


class PortInput(BaseModel):
    name: str
    country: str
    latitude: float
    longitude: float
    arrival: str
    departure: str


class TripInput(BaseModel):
    ship_name: str
    cruise_line: Optional[str] = ""


class TripUpdate(BaseModel):
    ship_name: Optional[str] = None
    cruise_line: Optional[str] = None


class PlanPreferences(BaseModel):
    party_type: str = Field(description="solo, couple, or family")
    activity_level: str = Field(description="light, moderate, active, intensive")
    transport_mode: str = Field(description="walking, public_transport, taxi, mixed")
    budget: str = Field(description="free, low, medium, high")
    currency: str = Field(default="GBP", description="Currency code e.g. GBP, USD, EUR")


class GeneratePlanInput(BaseModel):
    trip_id: str
    port_id: str
    preferences: PlanPreferences


# --- Helper ---


def check_db_connection():
    """Check if database is available and raise informative error if not."""
    if db_client is None:
        logger.error("Database operation attempted but DynamoDB is not connected")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "database_unavailable",
                "message": (
                    "Database service is currently unavailable. "
                    "Please try again later."
                ),
                "troubleshooting": (
                    "If you're the administrator, check the DYNAMODB_TABLE_NAME "
                    "and AWS credentials, and ensure DynamoDB table exists."
                ),
            },
        )
    try:
        db_client.ping()
    except Exception as e:
        logger.error(f"Database ping failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "database_connection_lost",
                "message": "Lost connection to database. Please try again.",
                "technical_details": str(e),
            },
        )


# --- Health ---


@app.get("/api/health")
def health():
    """Health check endpoint with service status diagnostics."""
    status = {
        "status": "ok",
        "service": "ShoreExplorer API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {"database": "unknown", "ai_service": "unknown"},
    }

    # Check database
    try:
        if db_client is not None:
            db_client.ping()
            status["checks"]["database"] = "healthy"
        else:
            status["checks"]["database"] = "not_configured"
            status["status"] = "degraded"
    except Exception as e:
        logger.warning(f"Health check: Database unhealthy - {str(e)}")
        status["checks"]["database"] = "unhealthy"
        status["status"] = "degraded"

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


# --- Trip CRUD ---


@app.post("/api/trips")
def create_trip(data: TripInput, x_device_id: str = Header()):
    """Create a new cruise trip."""
    check_db_connection()
    try:
        trip = {
            "trip_id": str(uuid.uuid4()),
            "device_id": x_device_id,
            "ship_name": data.ship_name,
            "cruise_line": data.cruise_line or "",
            "ports": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db_client.create_trip(trip)
        logger.info(f"Created trip {trip['trip_id']} for device {x_device_id}")
        return trip
    except Exception as e:
        logger.error(f"Failed to create trip: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "trip_creation_failed",
                "message": "Failed to create trip. Please try again.",
                "technical_details": str(e),
            },
        )


@app.get("/api/trips")
def list_trips(x_device_id: str = Header(), skip: int = 0, limit: int = 100):
    """List all trips for a device."""
    check_db_connection()
    try:
        trips = db_client.list_trips(x_device_id, skip=skip, limit=limit)
        logger.info(f"Listed {len(trips)} trips for device {x_device_id}")
        return trips
    except Exception as e:
        logger.error(f"Failed to list trips: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "trip_list_failed",
                "message": "Failed to retrieve trips. Please try again.",
            },
        )


@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: str, x_device_id: str = Header()):
    """Get details of a specific trip."""
    check_db_connection()
    try:
        trip = db_client.get_trip(trip_id, x_device_id)
        if not trip:
            logger.warning(f"Trip {trip_id} not found for device {x_device_id}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "trip_not_found",
                    "message": (
                        f"Trip with ID '{trip_id}' not found or you don't "
                        "have permission to access it."
                    ),
                    "trip_id": trip_id,
                },
            )
        logger.info(f"Retrieved trip {trip_id}")
        return trip
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get trip {trip_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "trip_retrieval_failed",
                "message": "Failed to retrieve trip details. Please try again.",
            },
        )


@app.put("/api/trips/{trip_id}")
def update_trip(trip_id: str, data: TripUpdate, x_device_id: str = Header()):
    """Update an existing trip."""
    check_db_connection()
    try:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        updated_trip = db_client.update_trip(trip_id, x_device_id, updates)
        if not updated_trip:
            logger.warning(f"Trip {trip_id} not found for update")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "trip_not_found",
                    "message": (
                        f"Trip with ID '{trip_id}' not found or you don't "
                        "have permission to update it."
                    ),
                    "trip_id": trip_id,
                },
            )
        logger.info(f"Updated trip {trip_id}")
        return updated_trip
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update trip {trip_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "trip_update_failed",
                "message": "Failed to update trip. Please try again.",
            },
        )
        raise
    except Exception as e:
        logger.error(f"Failed to update trip {trip_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "trip_update_failed",
                "message": "Failed to update trip. Please try again.",
            },
        )


@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: str, x_device_id: str = Header()):
    """Delete a trip and all its associated plans."""
    check_db_connection()
    try:
        deleted = db_client.delete_trip(trip_id, x_device_id)
        if not deleted:
            logger.warning(f"Trip {trip_id} not found for deletion")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "trip_not_found",
                    "message": (
                        f"Trip with ID '{trip_id}' not found or you don't "
                        "have permission to delete it."
                    ),
                    "trip_id": trip_id,
                },
            )
        # Delete associated plans
        deleted_plans_count = db_client.delete_plans_by_trip(trip_id)
        logger.info(
            f"Deleted trip {trip_id} and {deleted_plans_count} associated plans"
        )
        return {"message": "Trip deleted", "deleted_plans": deleted_plans_count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete trip {trip_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "trip_deletion_failed",
                "message": "Failed to delete trip. Please try again.",
            },
        )


# --- Port Management ---


@app.post("/api/trips/{trip_id}/ports")
def add_port(trip_id: str, data: PortInput, x_device_id: str = Header()):
    """Add a port to a trip."""
    check_db_connection()
    try:
        # Get existing trip
        trip = db_client.get_trip(trip_id, x_device_id)
        if not trip:
            logger.warning(f"Trip {trip_id} not found when adding port")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "trip_not_found",
                    "message": f"Trip with ID '{trip_id}' not found.",
                    "trip_id": trip_id,
                },
            )

        # Create new port
        port = {
            "port_id": str(uuid.uuid4()),
            "name": data.name,
            "country": data.country,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "arrival": data.arrival,
            "departure": data.departure,
        }

        # Add port to ports list
        ports = trip.get("ports", [])
        ports.append(port)

        # Update trip with new ports list
        updates = {
            "ports": ports,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db_client.update_trip(trip_id, x_device_id, updates)

        logger.info(f"Added port {port['port_id']} ({data.name}) to trip {trip_id}")
        return port
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add port to trip {trip_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "port_addition_failed",
                "message": "Failed to add port to trip. Please try again.",
            },
        )


@app.put("/api/trips/{trip_id}/ports/{port_id}")
def update_port(
    trip_id: str, port_id: str, data: PortInput, x_device_id: str = Header()
):
    """Update a port in a trip."""
    check_db_connection()
    try:
        # Get existing trip
        trip = db_client.get_trip(trip_id, x_device_id)
        if not trip:
            logger.warning(f"Trip {trip_id} not found when updating port {port_id}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "trip_not_found",
                    "message": f"Trip with ID '{trip_id}' not found.",
                    "trip_id": trip_id,
                },
            )

        # Find and update the port in the ports list
        ports = trip.get("ports", [])
        port_found = False
        for i, port in enumerate(ports):
            if port.get("port_id") == port_id:
                ports[i] = {
                    "port_id": port_id,
                    "name": data.name,
                    "country": data.country,
                    "latitude": data.latitude,
                    "longitude": data.longitude,
                    "arrival": data.arrival,
                    "departure": data.departure,
                }
                port_found = True
                break

        if not port_found:
            logger.warning(f"Port {port_id} in trip {trip_id} not found for update")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "port_not_found",
                    "message": (
                        f"Port with ID '{port_id}' not found in " f"trip '{trip_id}'."
                    ),
                    "port_id": port_id,
                    "trip_id": trip_id,
                },
            )

        # Update trip with modified ports list
        updates = {
            "ports": ports,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db_client.update_trip(trip_id, x_device_id, updates)

        logger.info(f"Updated port {port_id} in trip {trip_id}")
        return {"message": "Port updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update port {port_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "port_update_failed",
                "message": "Failed to update port. Please try again.",
            },
        )


@app.delete("/api/trips/{trip_id}/ports/{port_id}")
def delete_port(trip_id: str, port_id: str, x_device_id: str = Header()):
    """Remove a port from a trip and delete associated plans."""
    check_db_connection()
    try:
        # Get existing trip
        trip = db_client.get_trip(trip_id, x_device_id)
        if not trip:
            logger.warning(f"Trip {trip_id} not found when deleting port {port_id}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "trip_not_found",
                    "message": f"Trip with ID '{trip_id}' not found.",
                    "trip_id": trip_id,
                },
            )

        # Remove port from ports list
        ports = trip.get("ports", [])
        original_length = len(ports)
        ports = [p for p in ports if p.get("port_id") != port_id]

        # Check if port was actually removed
        if len(ports) == original_length:
            logger.warning(f"Port {port_id} not found in trip {trip_id}")
            # Not raising error here as MongoDB behavior was to silently succeed

        # Update trip with modified ports list
        updates = {
            "ports": ports,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db_client.update_trip(trip_id, x_device_id, updates)

        # Delete associated plans
        deleted_plans_count = db_client.delete_plans_by_port(port_id)
        logger.info(
            f"Removed port {port_id} from trip {trip_id} and deleted "
            f"{deleted_plans_count} associated plans"
        )
        return {
            "message": "Port removed",
            "deleted_plans": deleted_plans_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete port {port_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "port_deletion_failed",
                "message": "Failed to remove port. Please try again.",
            },
        )


# --- Weather (Open-Meteo) ---


@app.get("/api/weather")
async def get_weather(latitude: float, longitude: float, date: Optional[str] = None):
    """Fetch weather forecast from Open-Meteo API."""
    logger.info(f"Fetching weather for lat={latitude}, lon={longitude}, date={date}")
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
async def generate_plan(data: GeneratePlanInput, x_device_id: str = Header()):
    """Generate an AI-powered day plan for a cruise port visit."""
    check_db_connection()

    logger.info(f"Generating plan for trip {data.trip_id}, port {data.port_id}")

    # Fetch trip and port data
    try:
        trip = db_client.get_trip(data.trip_id, x_device_id)
        if not trip:
            logger.warning(f"Trip {data.trip_id} not found for plan generation")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "trip_not_found",
                    "message": f"Trip with ID '{data.trip_id}' not found.",
                    "trip_id": data.trip_id,
                },
            )

        port = next((p for p in trip["ports"] if p["port_id"] == data.port_id), None)
        if not port:
            logger.warning(f"Port {data.port_id} not found in trip {data.trip_id}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "port_not_found",
                    "message": f"Port with ID '{data.port_id}' not found in this trip.",
                    "port_id": data.port_id,
                    "trip_id": data.trip_id,
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch trip/port data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "data_fetch_failed",
                "message": "Failed to retrieve trip data. Please try again.",
            },
        )

    # Fetch weather data (non-blocking - plan generation continues if this fails)
    weather_data = None
    try:
        arrival_date = port["arrival"][:10] if port["arrival"] else None
        logger.info(f"Fetching weather for {port['name']} on {arrival_date}")
        async with httpx.AsyncClient() as client:
            params = {
                "latitude": port["latitude"],
                "longitude": port["longitude"],
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
    port_name = port["name"]
    port_country = port["country"]
    prompt = f"""You are a cruise port day planner. Create a detailed day plan \
for a cruise passenger visiting {port_name}, {port_country}.

CRUISE DETAILS:
- Ship: {trip['ship_name']}
- Port arrival: {port['arrival']}
- Port departure: {port['departure']}
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
9. For each activity with costs, include a relevant booking/info URL if known
10. When suggesting bookable activities, prefer established booking platforms like \
Viator, GetYourGuide, Klook, TripAdvisor Experiences, or Booking.com when available

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
      "booking_url": "string or null - URL for booking/info",
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
        logger.info("LLM API call successful")
    except LLMQuotaExceededError as e:
        logger.error(f"LLM API quota exceeded: {str(e)}")
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

    # Parse JSON response
    try:
        plan_data = llm_client.parse_json_response(response_text)
        logger.info("Successfully parsed LLM response as JSON")

        # Process activities to add affiliate tracking parameters
        if "activities" in plan_data and isinstance(plan_data["activities"], list):
            plan_data["activities"] = process_plan_activities(plan_data["activities"])
            logger.info("Processed activities for affiliate links")
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

    # Save plan to database
    try:
        plan = {
            "plan_id": str(uuid.uuid4()),
            "device_id": x_device_id,
            "trip_id": data.trip_id,
            "port_id": data.port_id,
            "port_name": port["name"],
            "port_country": port["country"],
            "preferences": prefs.model_dump(),
            "weather": (
                weather_data.get("daily")
                if weather_data and "daily" in weather_data
                else None
            ),
            "plan": plan_data,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        db_client.create_plan(plan)
        logger.info(f"Successfully created plan {plan['plan_id']} for port {port_name}")
        return plan
    except Exception as e:
        logger.error(f"Failed to save plan to database: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "plan_save_failed",
                "message": (
                    "Generated the plan but failed to save it. " "Please try again."
                ),
                "technical_details": str(e),
            },
        )


@app.get("/api/plans/{plan_id}")
def get_plan(plan_id: str, x_device_id: str = Header()):
    """Get details of a specific generated plan."""
    check_db_connection()
    try:
        plan = db_client.get_plan(plan_id, x_device_id)
        if not plan:
            logger.warning(f"Plan {plan_id} not found")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "plan_not_found",
                    "message": (
                        f"Plan with ID '{plan_id}' not found or you don't "
                        "have permission to access it."
                    ),
                    "plan_id": plan_id,
                },
            )
        logger.info(f"Retrieved plan {plan_id}")
        return plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get plan {plan_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "plan_retrieval_failed",
                "message": "Failed to retrieve plan details. Please try again.",
            },
        )


@app.get("/api/plans")
def list_plans(
    x_device_id: str = Header(),
    trip_id: Optional[str] = None,
    port_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    """List all generated plans for a device, optionally filtered by trip or port."""
    check_db_connection()
    try:
        plans = db_client.list_plans(
            x_device_id, trip_id=trip_id, port_id=port_id, skip=skip, limit=limit
        )
        logger.info(f"Listed {len(plans)} plans for device {x_device_id}")
        return plans
    except Exception as e:
        logger.error(f"Failed to list plans: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "plan_list_failed",
                "message": "Failed to retrieve plans. Please try again.",
            },
        )


@app.delete("/api/plans/{plan_id}")
def delete_plan(plan_id: str, x_device_id: str = Header()):
    """Delete a generated plan."""
    check_db_connection()
    try:
        deleted = db_client.delete_plan(plan_id, x_device_id)
        if not deleted:
            logger.warning(f"Plan {plan_id} not found for deletion")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "plan_not_found",
                    "message": (
                        f"Plan with ID '{plan_id}' not found or you don't "
                        "have permission to delete it."
                    ),
                    "plan_id": plan_id,
                },
            )
        logger.info(f"Deleted plan {plan_id}")
        return {"message": "Plan deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete plan {plan_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "plan_deletion_failed",
                "message": "Failed to delete plan. Please try again.",
            },
        )
