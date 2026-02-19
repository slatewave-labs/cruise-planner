"""
Generic DynamoDB client for single-table design patterns.

This module provides a clean abstraction layer over AWS DynamoDB operations
using the single-table design pattern. It uses boto3 for AWS SDK integration
and provides generic CRUD operations suitable for any application.

Design decisions:
- Single table design with composite keys (PK, SK) for efficiency and cost optimization
- Generic entity type support through configurable partition keys
- Denormalized data to minimize read operations
- On-demand billing mode for unpredictable traffic patterns
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
    Generic DynamoDB client wrapper for single-table design operations.

    Table structure:
    - PK (Partition Key): Entity type and ID (e.g., "ITEM#abc123")
    - SK (Sort Key): Fixed value "METADATA" for main entity records
    - entity_type: Field to track the type of entity stored

    This allows:
    1. Direct access by ID using PK + SK
    2. Entity type filtering for scans
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
                (defaults to env var DYNAMODB_TABLE_NAME or "myapp")
            region_name: AWS region
                (defaults to env var AWS_DEFAULT_REGION or us-east-1)
            endpoint_url: Custom endpoint URL
                (for DynamoDB Local in development)
        """
        self.table_name = table_name or os.environ.get("DYNAMODB_TABLE_NAME", "myapp")
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
        Test connection to DynamoDB.

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

    # --- Generic CRUD Operations ---

    def put_item(
        self, item: Dict[str, Any], partition_key: str = "item_id"
    ) -> Dict[str, Any]:
        """
        Store an item using single-table design pattern.

        Args:
            item: Item data including the partition key field
            partition_key: Name of the ID field in the item (e.g., "item_id", "user_id")

        Returns:
            The original item data

        Raises:
            KeyError: If partition_key field not found in item
            BotoCoreError, ClientError: If DynamoDB operation fails
        """
        if partition_key not in item:
            raise KeyError(f"Item must contain '{partition_key}' field")

        pk_value = item[partition_key]
        # Extract entity type from partition_key: "item_id" -> "item"
        entity_type = partition_key.replace("_id", "")

        # Build DynamoDB item with PK/SK pattern
        db_item = self._convert_floats(
            {
                "PK": f"{entity_type.upper()}#{pk_value}",
                "SK": "METADATA",
                "entity_type": entity_type,
                **item,
            }
        )

        try:
            self.table.put_item(Item=db_item)
            logger.debug(f"Created {entity_type} {pk_value}")
            return item
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to create {entity_type}: {str(e)}")
            raise

    def get_item(
        self, item_id: str, partition_key: str = "item_id"
    ) -> Optional[Dict[str, Any]]:
        """
        Get an item by its ID.

        Args:
            item_id: The item's unique identifier
            partition_key: Name of the ID field (e.g., "item_id", "user_id")

        Returns:
            Item data or None if not found

        Raises:
            BotoCoreError, ClientError: If DynamoDB operation fails
        """
        entity_type = partition_key.replace("_id", "")

        try:
            response = self.table.get_item(
                Key={"PK": f"{entity_type.upper()}#{item_id}", "SK": "METADATA"}
            )
            item = response.get("Item")
            if item:
                return self._clean_item(item)
            return None
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to get {entity_type} {item_id}: {str(e)}")
            raise

    def scan_items(
        self, entity_type: str = "item", limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Scan for items of a specific entity type.

        Note: Scan operations are expensive. Use sparingly and consider
        adding a GSI for frequently queried access patterns.

        Args:
            entity_type: Type of entity to scan for (e.g., "item", "user")
            limit: Maximum number of items to return

        Returns:
            List of items matching the entity type

        Raises:
            BotoCoreError, ClientError: If DynamoDB operation fails
        """
        try:
            response = self.table.scan(
                FilterExpression="entity_type = :et",
                ExpressionAttributeValues={":et": entity_type},
                Limit=limit,
            )
            items = response.get("Items", [])
            logger.debug(f"Scanned {len(items)} {entity_type} items")
            return [self._clean_item(item) for item in items]
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to scan {entity_type} items: {str(e)}")
            raise

    def update_item(
        self, item_id: str, updates: Dict[str, Any], partition_key: str = "item_id"
    ) -> Optional[Dict[str, Any]]:
        """
        Update an item by ID.

        Args:
            item_id: The item's unique identifier
            updates: Dictionary of fields to update
            partition_key: Name of the ID field (e.g., "item_id", "user_id")

        Returns:
            Updated item data or None if not found

        Raises:
            BotoCoreError, ClientError: If DynamoDB operation fails
        """
        # First check if item exists
        existing = self.get_item(item_id, partition_key)
        if not existing:
            return None

        entity_type = partition_key.replace("_id", "")

        try:
            # Convert floats to Decimals for DynamoDB compatibility
            converted_updates = self._convert_floats(updates)

            # Build update expression
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}

            for key, value in converted_updates.items():
                # DynamoDB doesn't allow updating PK/SK
                if key in ["PK", "SK", "entity_type"]:
                    continue
                # Use attribute names to handle reserved keywords
                safe_key = f"#{key}"
                update_expr_parts.append(f"{safe_key} = :{key}")
                expr_attr_names[safe_key] = key
                expr_attr_values[f":{key}"] = value

            if not update_expr_parts:
                # No fields to update
                logger.debug(
                    f"No updateable fields provided for {entity_type} {item_id}"
                )
                return existing

            update_expression = "SET " + ", ".join(update_expr_parts)

            response = self.table.update_item(
                Key={"PK": f"{entity_type.upper()}#{item_id}", "SK": "METADATA"},
                UpdateExpression=update_expression,
                ConditionExpression="attribute_exists(PK)",
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues="ALL_NEW",
            )
            logger.debug(f"Updated {entity_type} {item_id}")
            return self._clean_item(response["Attributes"])
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning(
                    f"Update condition failed for {entity_type} "
                    f"{item_id} - item doesn't exist"
                )
                return None
            logger.error(f"Failed to update {entity_type} {item_id}: {str(e)}")
            raise
        except BotoCoreError as e:
            logger.error(f"Failed to update {entity_type} {item_id}: {str(e)}")
            raise

    def delete_item(self, item_id: str, partition_key: str = "item_id") -> bool:
        """
        Delete an item by ID.

        Args:
            item_id: The item's unique identifier
            partition_key: Name of the ID field (e.g., "item_id", "user_id")

        Returns:
            True if deleted, False if not found

        Raises:
            BotoCoreError, ClientError: If DynamoDB operation fails
        """
        # Verify item exists first
        existing = self.get_item(item_id, partition_key)
        if not existing:
            return False

        entity_type = partition_key.replace("_id", "")

        try:
            self.table.delete_item(
                Key={"PK": f"{entity_type.upper()}#{item_id}", "SK": "METADATA"}
            )
            logger.debug(f"Deleted {entity_type} {item_id}")
            return True
        except (BotoCoreError, ClientError) as e:
            logger.error(f"Failed to delete {entity_type} {item_id}: {str(e)}")
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
            Cleaned item without PK, SK, entity_type fields
        """
        cleaned = dict(item)
        for key in ["PK", "SK", "entity_type"]:
            cleaned.pop(key, None)
        return self._convert_decimals(cleaned)
