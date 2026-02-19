"""
Generic FastAPI backend server template.

This template provides a complete backend infrastructure with:
- FastAPI application with CORS
- Request ID middleware for request tracing
- DynamoDB database integration
- LLM integration example
- Generic CRUD operations for items
- Health check endpoint
- Structured logging

To customize for your application:
1. Update app.config.json with your app name and metadata
2. Modify the Item models to match your domain
3. Add custom business logic endpoints
4. Configure environment variables (see .env.example)
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from dynamodb_client import DynamoDBClient
from llm_client import (
    LLMAPIError,
    LLMAuthenticationError,
    LLMClient,
    LLMQuotaExceededError,
)

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

# Read app configuration from app.config.json
_app_config = {}
try:
    with open(os.path.join(os.path.dirname(__file__), "..", "app.config.json")) as f:
        _app_config = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    pass

_app_title = _app_config.get("display_name", "My Application") + " API"
_app_version = _app_config.get("version", "0.1.0")

app = FastAPI(title=_app_title, version=_app_version)

# Read allowed origins from env var (comma-separated); default to localhost for dev
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
table_name = os.environ.get("DYNAMODB_TABLE_NAME", "myapp")
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


class CreateItemRequest(BaseModel):
    """Request model for creating a new item."""

    name: str
    description: Optional[str] = None


class UpdateItemRequest(BaseModel):
    """Request model for updating an existing item."""

    name: Optional[str] = None
    description: Optional[str] = None


class GenerateRequest(BaseModel):
    """Request model for LLM text generation."""

    prompt: str


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
        "service": _app_title,
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


# --- Items CRUD ---


@app.post("/api/items")
def create_item(data: CreateItemRequest):
    """Create a new item."""
    check_db_connection()
    try:
        item = {
            "item_id": str(uuid.uuid4()),
            "name": data.name,
            "description": data.description or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db_client.put_item(item, partition_key="item_id")
        logger.info(f"Created item {item['item_id']}")
        return item
    except Exception as e:
        logger.error(f"Failed to create item: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "item_creation_failed",
                "message": "Failed to create item. Please try again.",
                "technical_details": str(e),
            },
        )


@app.get("/api/items")
def list_items(skip: int = 0, limit: int = 100):
    """List all items."""
    check_db_connection()
    try:
        # Note: In a real implementation, you'd use DynamoDB scan with pagination
        # This is a simplified example
        items = db_client.scan_items(limit=limit)
        logger.info(f"Listed {len(items)} items")
        return items
    except Exception as e:
        logger.error(f"Failed to list items: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "item_list_failed",
                "message": "Failed to retrieve items. Please try again.",
            },
        )


@app.get("/api/items/{item_id}")
def get_item(item_id: str):
    """Get details of a specific item."""
    check_db_connection()
    try:
        item = db_client.get_item(item_id, partition_key="item_id")
        if not item:
            logger.warning(f"Item {item_id} not found")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "item_not_found",
                    "message": f"Item with ID '{item_id}' not found.",
                    "item_id": item_id,
                },
            )
        logger.info(f"Retrieved item {item_id}")
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get item {item_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "item_retrieval_failed",
                "message": "Failed to retrieve item details. Please try again.",
            },
        )


@app.put("/api/items/{item_id}")
def update_item(item_id: str, data: UpdateItemRequest):
    """Update an existing item."""
    check_db_connection()
    try:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        updated_item = db_client.update_item(item_id, updates, partition_key="item_id")
        if not updated_item:
            logger.warning(f"Item {item_id} not found for update")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "item_not_found",
                    "message": f"Item with ID '{item_id}' not found.",
                    "item_id": item_id,
                },
            )
        logger.info(f"Updated item {item_id}")
        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update item {item_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "item_update_failed",
                "message": "Failed to update item. Please try again.",
            },
        )


@app.delete("/api/items/{item_id}")
def delete_item(item_id: str):
    """Delete an item."""
    check_db_connection()
    try:
        deleted = db_client.delete_item(item_id, partition_key="item_id")
        if not deleted:
            logger.warning(f"Item {item_id} not found for deletion")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "item_not_found",
                    "message": f"Item with ID '{item_id}' not found.",
                    "item_id": item_id,
                },
            )
        logger.info(f"Deleted item {item_id}")
        return {"message": "Item deleted", "item_id": item_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete item {item_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "item_deletion_failed",
                "message": "Failed to delete item. Please try again.",
            },
        )


# --- LLM Integration Example ---


@app.post("/api/generate")
def generate_text(data: GenerateRequest):
    """
    Generate text using the LLM.

    This is a simplified example endpoint showing how to integrate
    the LLM client. Customize the prompt and system instruction
    for your specific use case.
    """
    # Initialize LLM client
    try:
        llm_client = LLMClient()
    except ValueError as e:
        logger.error(f"LLM generation attempted but not configured: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "ai_service_not_configured",
                "message": (
                    "AI service is not configured. "
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
        logger.info("Calling LLM API for text generation")
        system_instruction = (
            "You are a helpful assistant. "
            "Provide clear, concise, and accurate responses."
        )
        response_text = llm_client.generate_day_plan(
            prompt=data.prompt,
            system_instruction=system_instruction,
            temperature=0.7,
        )
        logger.info("LLM API call successful")

        return {
            "prompt": data.prompt,
            "response": response_text,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
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
                    "The AI service is temporarily unavailable. "
                    "Please try again in a few moments."
                ),
                "technical_details": str(e),
            },
        )
