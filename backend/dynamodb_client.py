"""
DynamoDB client for ShoreExplorer.

This module provides a clean abstraction layer over AWS DynamoDB operations,
replacing the previous MongoDB implementation. It uses boto3 for AWS SDK integration
and follows the same patterns as the MongoDB implementation for easy migration.

Design decisions:
- Single table design with composite keys (PK, SK) for efficiency and cost optimization
- GSI for device_id queries (required for multi-tenancy isolation)
- Denormalized data (embedded ports in trips) to minimize read operations
- On-demand billing mode for unpredictable traffic patterns (MVP optimization)
"""

import logging
import os
from decimal import Decimal
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)


class DynamoDBClient:
    """
    DynamoDB client wrapper for ShoreExplorer data operations.

    Table structure:
    - PK (Partition Key): Entity type and ID (e.g., "TRIP#uuid", "PLAN#uuid")
    - SK (Sort Key): Entity type (e.g., "METADATA")
    - GSI1PK: device_id for device-based queries
    - GSI1SK: created_at or generated_at for sorting

    This allows:
    1. Direct access by ID (PK + SK)
    2. Query all items for a device (GSI1PK + GSI1SK)
    3. Efficient single-table design with minimal cost
    """

    def __init__(
        self,
        table_name: Optional[str] = None,
        region_name: Optional[str] = None,
        endpoint_url: Optional[str] = None,
    ):
        """
        Initialize DynamoDB client.

        Args:
            table_name: DynamoDB table name
                (defaults to env var DYNAMODB_TABLE_NAME)
            region_name: AWS region
                (defaults to env var AWS_DEFAULT_REGION or us-east-1)
            endpoint_url: Custom endpoint URL
                (for DynamoDB Local in development)
        """
        self.table_name = table_name or os.environ.get(
            "DYNAMODB_TABLE_NAME", "shoreexplorer"
        )
        self.region_name = region_name or os.environ.get(
            "AWS_DEFAULT_REGION", "us-east-1"
        )
        self.endpoint_url = endpoint_url or os.environ.get("DYNAMODB_ENDPOINT_URL")

        # Initialize boto3 DynamoDB resource
        session_kwargs = {"region_name": self.region_name}
        if self.endpoint_url:
            # Local development with DynamoDB Local
            session_kwargs["endpoint_url"] = self.endpoint_url
            logger.info(f"Using local DynamoDB at {self.endpoint_url}")

        try:
            self.dynamodb = boto3.resource("dynamodb", **session_kwargs)
            self.table = self.dynamodb.Table(self.table_name)
            logger.info(
                f"Initialized DynamoDB client for table '{self.table_name}' "
                f"in region '{self.region_name}'"
            )
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to initialize DynamoDB client: {str(e)}")
            raise

    def ping(self) -> bool:
        """
        Test connection to DynamoDB (equivalent to MongoDB ping).

        Returns:
            True if connection is healthy

        Raises:
            Exception if connection fails
        """
        try:
            # Describe table to verify connectivity
            self.table.load()
            logger.debug(f"DynamoDB ping successful for table {self.table_name}")
            return True
        except (BotoCoreError, ClientError) as e:
            logger.error(f"DynamoDB ping failed: {str(e)}")
            raise

    # --- Trip Operations ---

    def create_trip(self, trip: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new trip.

        Args:
            trip: Trip data with trip_id, device_id, ship_name, etc.

        Returns:
            Created trip data
        """
        item = self._convert_floats(
            {
                "PK": f"TRIP#{trip['trip_id']}",
                "SK": "METADATA",
                "entity_type": "trip",
                "GSI1PK": f"DEVICE#{trip['device_id']}",
                "GSI1SK": trip["created_at"],
                **trip,
            }
        )
        try:
            self.table.put_item(Item=item)
            logger.debug(f"Created trip {trip['trip_id']}")
            return trip
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to create trip: {str(e)}")
            raise

    def get_trip(self, trip_id: str, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific trip by ID.

        Args:
            trip_id: Trip UUID
            device_id: Device ID (for authorization)

        Returns:
            Trip data or None if not found
        """
        try:
            response = self.table.get_item(
                Key={"PK": f"TRIP#{trip_id}", "SK": "METADATA"}
            )
            item = response.get("Item")
            if item and item.get("device_id") == device_id:
                # Remove DynamoDB internal fields
                return self._clean_item(item)
            return None
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to get trip {trip_id}: {str(e)}")
            raise

    def list_trips(
        self, device_id: str, skip: int = 0, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List all trips for a device.

        Args:
            device_id: Device ID
            skip: Number of items to skip (pagination)
            limit: Maximum number of items to return

        Returns:
            List of trip data
        """
        try:
            # Query GSI1 by device_id, sorted by created_at descending
            response = self.table.query(
                IndexName="GSI1",
                KeyConditionExpression="GSI1PK = :device_pk",
                FilterExpression="entity_type = :entity_type",
                ExpressionAttributeValues={
                    ":device_pk": f"DEVICE#{device_id}",
                    ":entity_type": "trip",
                },
                ScanIndexForward=False,  # Descending order (newest first)
                Limit=skip + limit,  # DynamoDB doesn't support skip, so we fetch more
            )

            items = response.get("Items", [])
            # Manual skip implementation (DynamoDB limitation)
            items = items[skip : skip + limit]
            return [self._clean_item(item) for item in items]
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to list trips for device {device_id}: {str(e)}")
            raise

    def update_trip(
        self, trip_id: str, device_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update a trip.

        Args:
            trip_id: Trip UUID
            device_id: Device ID (for authorization)
            updates: Fields to update

        Returns:
            Updated trip data or None if not found
        """
        # First verify the trip exists and belongs to this device
        existing = self.get_trip(trip_id, device_id)
        if not existing:
            return None

        try:
            # Convert floats to Decimals for DynamoDB compatibility
            converted_updates = self._convert_floats(updates)

            # Build update expression
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}

            for key, value in converted_updates.items():
                # DynamoDB doesn't allow updating PK/SK
                if key in ["PK", "SK", "GSI1PK", "GSI1SK"]:
                    continue
                safe_key = f"#{key}"
                update_expr_parts.append(f"{safe_key} = :{key}")
                expr_attr_names[safe_key] = key
                expr_attr_values[f":{key}"] = value

            update_expression = "SET " + ", ".join(update_expr_parts)

            # Add condition to ensure trip exists and belongs to this device
            expr_attr_values[":device_pk"] = f"DEVICE#{device_id}"

            response = self.table.update_item(
                Key={"PK": f"TRIP#{trip_id}", "SK": "METADATA"},
                UpdateExpression=update_expression,
                ConditionExpression="attribute_exists(PK) AND GSI1PK = :device_pk",
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues="ALL_NEW",
            )
            logger.debug(f"Updated trip {trip_id}")
            return self._clean_item(response["Attributes"])
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning(
                    f"Update condition failed for trip {trip_id} "
                    f"- item doesn't exist or wrong device"
                )
                return None
            logger.error(f"Failed to update trip {trip_id}: {str(e)}")
            raise
        except BotoCoreError as e:
            logger.error(f"Failed to update trip {trip_id}: {str(e)}")
            raise

    def delete_trip(self, trip_id: str, device_id: str) -> bool:
        """
        Delete a trip.

        Args:
            trip_id: Trip UUID
            device_id: Device ID (for authorization)

        Returns:
            True if deleted, False if not found
        """
        # Verify ownership first
        existing = self.get_trip(trip_id, device_id)
        if not existing:
            return False

        try:
            self.table.delete_item(Key={"PK": f"TRIP#{trip_id}", "SK": "METADATA"})
            logger.debug(f"Deleted trip {trip_id}")
            return True
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to delete trip {trip_id}: {str(e)}")
            raise

    # --- Plan Operations ---

    def create_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new day plan.

        Args:
            plan: Plan data with plan_id, device_id, trip_id, port_id, etc.

        Returns:
            Created plan data
        """
        item = self._convert_floats(
            {
                "PK": f"PLAN#{plan['plan_id']}",
                "SK": "METADATA",
                "entity_type": "plan",
                "GSI1PK": f"DEVICE#{plan['device_id']}",
                "GSI1SK": plan["generated_at"],
                **plan,
            }
        )
        try:
            self.table.put_item(Item=item)
            logger.debug(f"Created plan {plan['plan_id']}")
            return plan
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to create plan: {str(e)}")
            raise

    def get_plan(self, plan_id: str, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific plan by ID.

        Args:
            plan_id: Plan UUID
            device_id: Device ID (for authorization)

        Returns:
            Plan data or None if not found
        """
        try:
            response = self.table.get_item(
                Key={"PK": f"PLAN#{plan_id}", "SK": "METADATA"}
            )
            item = response.get("Item")
            if item and item.get("device_id") == device_id:
                return self._clean_item(item)
            return None
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to get plan {plan_id}: {str(e)}")
            raise

    def list_plans(
        self,
        device_id: str,
        trip_id: Optional[str] = None,
        port_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        List plans for a device, optionally filtered by trip or port.

        Args:
            device_id: Device ID
            trip_id: Optional trip ID filter
            port_id: Optional port ID filter
            skip: Number of items to skip
            limit: Maximum number of items to return

        Returns:
            List of plan data
        """
        try:
            query_kwargs = {
                "IndexName": "GSI1",
                "KeyConditionExpression": "GSI1PK = :device_pk",
                "ExpressionAttributeValues": {":device_pk": f"DEVICE#{device_id}"},
                "ScanIndexForward": False,  # Descending (newest first)
                "Limit": skip + limit,
            }

            # Add filter expressions for trip_id and port_id
            filter_expressions = ["entity_type = :entity_type"]
            query_kwargs["ExpressionAttributeValues"][":entity_type"] = "plan"

            if trip_id:
                filter_expressions.append("trip_id = :trip_id")
                query_kwargs["ExpressionAttributeValues"][":trip_id"] = trip_id

            if port_id:
                filter_expressions.append("port_id = :port_id")
                query_kwargs["ExpressionAttributeValues"][":port_id"] = port_id

            if filter_expressions:
                query_kwargs["FilterExpression"] = " AND ".join(filter_expressions)

            response = self.table.query(**query_kwargs)
            items = response.get("Items", [])
            items = items[skip : skip + limit]
            return [self._clean_item(item) for item in items]
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to list plans for device {device_id}: {str(e)}")
            raise

    def delete_plan(self, plan_id: str, device_id: str) -> bool:
        """
        Delete a plan.

        Args:
            plan_id: Plan UUID
            device_id: Device ID (for authorization)

        Returns:
            True if deleted, False if not found
        """
        # Verify ownership first
        existing = self.get_plan(plan_id, device_id)
        if not existing:
            return False

        try:
            self.table.delete_item(Key={"PK": f"PLAN#{plan_id}", "SK": "METADATA"})
            logger.debug(f"Deleted plan {plan_id}")
            return True
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to delete plan {plan_id}: {str(e)}")
            raise

    def delete_plans_by_trip(self, trip_id: str) -> int:
        """
        Delete all plans for a specific trip.

        Args:
            trip_id: Trip UUID

        Returns:
            Number of plans deleted
        """
        # Query all plans for this trip (across all devices that have access)
        # This is a cascade delete operation when a trip is deleted
        try:
            # Scan for all plans with this trip_id
            response = self.table.scan(
                FilterExpression="entity_type = :entity_type AND trip_id = :trip_id",
                ExpressionAttributeValues={
                    ":entity_type": "plan",
                    ":trip_id": trip_id,
                },
            )

            items = response.get("Items", [])
            deleted_count = 0

            # DynamoDB doesn't support batch delete with conditions,
            # so we delete one by one
            for item in items:
                try:
                    self.table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
                    deleted_count += 1
                except (BotoCoreError, ClientError) as e:
                    logger.warning(
                        f"Failed to delete plan {item.get('plan_id')}: {str(e)}"
                    )

            logger.debug(f"Deleted {deleted_count} plans for trip {trip_id}")
            return deleted_count
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to delete plans for trip {trip_id}: {str(e)}")
            raise

    def delete_plans_by_port(self, port_id: str) -> int:
        """
        Delete all plans for a specific port.

        Args:
            port_id: Port UUID

        Returns:
            Number of plans deleted
        """
        try:
            response = self.table.scan(
                FilterExpression="entity_type = :entity_type AND port_id = :port_id",
                ExpressionAttributeValues={
                    ":entity_type": "plan",
                    ":port_id": port_id,
                },
            )

            items = response.get("Items", [])
            deleted_count = 0

            for item in items:
                try:
                    self.table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
                    deleted_count += 1
                except (BotoCoreError, ClientError) as e:
                    logger.warning(
                        f"Failed to delete plan {item.get('plan_id')}: {str(e)}"
                    )

            logger.debug(f"Deleted {deleted_count} plans for port {port_id}")
            return deleted_count
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to delete plans for port {port_id}: {str(e)}")
            raise

    # --- Helper Methods ---

    @staticmethod
    def _convert_floats(obj: Any) -> Any:
        """
        Recursively convert Python float values to Decimal for DynamoDB.

        DynamoDB does not support Python float types. All numeric values
        must be stored as Decimal. This method handles nested dicts and lists.

        Args:
            obj: Any Python object (dict, list, float, etc.)

        Returns:
            Object with all floats converted to Decimal
        """
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: DynamoDBClient._convert_floats(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [DynamoDBClient._convert_floats(i) for i in obj]
        return obj

    @staticmethod
    def _convert_decimals(obj: Any) -> Any:
        """
        Recursively convert Decimal values back to float for API responses.

        Args:
            obj: Any Python object (dict, list, Decimal, etc.)

        Returns:
            Object with all Decimals converted to float
        """
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: DynamoDBClient._convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [DynamoDBClient._convert_decimals(i) for i in obj]
        return obj

    def _clean_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove DynamoDB internal fields from an item and convert Decimals to floats.

        Args:
            item: DynamoDB item

        Returns:
            Cleaned item without PK, SK, GSI fields
        """
        cleaned = dict(item)
        for key in ["PK", "SK", "GSI1PK", "GSI1SK", "entity_type"]:
            cleaned.pop(key, None)
        return self._convert_decimals(cleaned)
