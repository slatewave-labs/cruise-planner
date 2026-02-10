import os
import uuid
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from pymongo import MongoClient

load_dotenv()

app = FastAPI(title="ShoreExplorer API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

mongo_client = MongoClient(os.environ.get("MONGO_URL"))
db = mongo_client[os.environ.get("DB_NAME")]
trips_col = db["trips"]
plans_col = db["plans"]

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

def serialize_doc(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc

# --- Health ---

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ShoreExplorer API"}

# --- Trip CRUD ---

@app.post("/api/trips")
def create_trip(data: TripInput):
    trip = {
        "trip_id": str(uuid.uuid4()),
        "ship_name": data.ship_name,
        "cruise_line": data.cruise_line or "",
        "ports": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    trips_col.insert_one(trip)
    return serialize_doc(trip)

@app.get("/api/trips")
def list_trips(skip: int = 0, limit: int = 100):
    trips = list(trips_col.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit))
    return trips

@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: str):
    trip = trips_col.find_one({"trip_id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(404, "Trip not found")
    return trip

@app.put("/api/trips/{trip_id}")
def update_trip(trip_id: str, data: TripUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = trips_col.update_one({"trip_id": trip_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Trip not found")
    return trips_col.find_one({"trip_id": trip_id}, {"_id": 0})

@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: str):
    result = trips_col.delete_one({"trip_id": trip_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Trip not found")
    plans_col.delete_many({"trip_id": trip_id})
    return {"message": "Trip deleted"}

# --- Port Management ---

@app.post("/api/trips/{trip_id}/ports")
def add_port(trip_id: str, data: PortInput):
    trip = trips_col.find_one({"trip_id": trip_id})
    if not trip:
        raise HTTPException(404, "Trip not found")
    port = {
        "port_id": str(uuid.uuid4()),
        "name": data.name,
        "country": data.country,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "arrival": data.arrival,
        "departure": data.departure,
    }
    trips_col.update_one(
        {"trip_id": trip_id},
        {"$push": {"ports": port}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return port

@app.put("/api/trips/{trip_id}/ports/{port_id}")
def update_port(trip_id: str, port_id: str, data: PortInput):
    port_update = {
        "ports.$.name": data.name,
        "ports.$.country": data.country,
        "ports.$.latitude": data.latitude,
        "ports.$.longitude": data.longitude,
        "ports.$.arrival": data.arrival,
        "ports.$.departure": data.departure,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = trips_col.update_one(
        {"trip_id": trip_id, "ports.port_id": port_id},
        {"$set": port_update}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Port not found")
    return {"message": "Port updated"}

@app.delete("/api/trips/{trip_id}/ports/{port_id}")
def delete_port(trip_id: str, port_id: str):
    result = trips_col.update_one(
        {"trip_id": trip_id},
        {"$pull": {"ports": {"port_id": port_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Trip not found")
    plans_col.delete_many({"port_id": port_id})
    return {"message": "Port removed"}

# --- Weather (Open-Meteo) ---

@app.get("/api/weather")
async def get_weather(latitude: float, longitude: float, date: Optional[str] = None):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max",
        "timezone": "auto",
        "temperature_unit": "celsius",
    }
    if date:
        params["start_date"] = date
        params["end_date"] = date
    else:
        params["forecast_days"] = 7
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=15)
        if resp.status_code != 200:
            raise HTTPException(502, "Weather service unavailable")
        return resp.json()

# --- Day Plan Generation (Gemini 3 Flash) ---

@app.post("/api/plans/generate")
async def generate_plan(data: GeneratePlanInput):
    trip = trips_col.find_one({"trip_id": data.trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(404, "Trip not found")
    port = next((p for p in trip["ports"] if p["port_id"] == data.port_id), None)
    if not port:
        raise HTTPException(404, "Port not found in trip")

    # Fetch weather
    weather_data = None
    try:
        arrival_date = port["arrival"][:10] if port["arrival"] else None
        async with httpx.AsyncClient() as client:
            params = {
                "latitude": port["latitude"],
                "longitude": port["longitude"],
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max",
                "timezone": "auto",
                "temperature_unit": "celsius",
            }
            if arrival_date:
                params["start_date"] = arrival_date
                params["end_date"] = arrival_date
            resp = await client.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=15)
            if resp.status_code == 200:
                weather_data = resp.json()
    except Exception:
        weather_data = None

    weather_summary = "Weather data unavailable."
    if weather_data and "daily" in weather_data:
        d = weather_data["daily"]
        weather_summary = f"Temperature: {d.get('temperature_2m_min', ['?'])[0]}°C - {d.get('temperature_2m_max', ['?'])[0]}°C, Precipitation: {d.get('precipitation_sum', ['?'])[0]}mm, Wind: {d.get('windspeed_10m_max', ['?'])[0]}km/h"

    prefs = data.preferences
    prompt = f"""You are a cruise port day planner. Create a detailed day plan for a cruise passenger visiting {port['name']}, {port['country']}.

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

REQUIREMENTS:
1. Create a circular route starting and ending at the cruise ship terminal/port area
2. Ensure return to ship at least 1 hour before scheduled departure
3. Include realistic travel times between activities
4. Consider weather conditions in activity selection
5. For paid activities, include estimated costs in local currency and approximate USD equivalent
6. Include 5-8 activities appropriate for the preferences
7. For each activity with costs, include a relevant booking/info URL if known

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{{
  "plan_title": "string - catchy title for the day",
  "summary": "string - 2-3 sentence overview",
  "return_by": "string - recommended time to be back at ship",
  "total_estimated_cost": "string - estimated total cost per person",
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
      "cost_estimate": "string - e.g. Free, ~$10 USD",
      "booking_url": "string or null - URL for booking/info",
      "transport_to_next": "string - how to get to next activity",
      "travel_time_to_next": "string - estimated travel time",
      "tips": "string - useful tips for this activity"
    }}
  ],
  "packing_suggestions": ["string - items to bring"],
  "safety_tips": ["string - safety reminders"]
}}"""

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(503, "AI service not configured. Please set EMERGENT_LLM_KEY in backend/.env")

    session_id = f"plan-{data.trip_id}-{data.port_id}-{uuid.uuid4().hex[:8]}"
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message="You are an expert cruise port day planner. You always respond with valid JSON only, no markdown formatting."
    ).with_model("gemini", "gemini-3-flash-preview")

    user_msg = UserMessage(text=prompt)
    try:
        response_text = await chat.send_message(user_msg)
    except Exception as e:
        error_msg = str(e)
        if "budget" in error_msg.lower() or "exceeded" in error_msg.lower():
            raise HTTPException(
                503,
                "AI service budget has been exceeded. Please top up your Emergent Universal Key balance at Profile > Universal Key > Add Balance."
            )
        raise HTTPException(503, f"AI service temporarily unavailable: {error_msg}")

    try:
        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            clean = clean.strip()
        plan_data = json.loads(clean)
    except json.JSONDecodeError:
        plan_data = {"raw_response": response_text, "parse_error": True}

    plan = {
        "plan_id": str(uuid.uuid4()),
        "trip_id": data.trip_id,
        "port_id": data.port_id,
        "port_name": port["name"],
        "port_country": port["country"],
        "preferences": prefs.model_dump(),
        "weather": weather_data.get("daily") if weather_data and "daily" in weather_data else None,
        "plan": plan_data,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    plans_col.insert_one(plan)
    plan.pop("_id", None)
    return plan

@app.get("/api/plans/{plan_id}")
def get_plan(plan_id: str):
    plan = plans_col.find_one({"plan_id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    return plan

@app.get("/api/plans")
def list_plans(trip_id: Optional[str] = None, port_id: Optional[str] = None, skip: int = 0, limit: int = 100):
    query = {}
    if trip_id:
        query["trip_id"] = trip_id
    if port_id:
        query["port_id"] = port_id
    plans = list(plans_col.find(query, {"_id": 0}).sort("generated_at", -1).skip(skip).limit(limit))
    return plans

@app.delete("/api/plans/{plan_id}")
def delete_plan(plan_id: str):
    result = plans_col.delete_one({"plan_id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Plan not found")
    return {"message": "Plan deleted"}
