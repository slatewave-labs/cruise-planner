#!/usr/bin/env bash

################################################################################
# Initialize DynamoDB Local Table
################################################################################
# This script creates the ShoreExplorer table in DynamoDB Local
# for development and testing purposes.
#
# Usage:
#   ./init-dynamodb-local.sh
#
# Prerequisites:
#   - DynamoDB Local running (via docker-compose or standalone)
#   - AWS CLI installed
################################################################################

set -euo pipefail

# Configuration
TABLE_NAME="${DYNAMODB_TABLE_NAME:-shoreexplorer}"
ENDPOINT_URL="${DYNAMODB_ENDPOINT_URL:-http://localhost:8000}"
AWS_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if table exists
table_exists() {
    aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --endpoint-url "$ENDPOINT_URL" \
        --region "$AWS_REGION" \
        > /dev/null 2>&1
}

main() {
    log_info "Initializing DynamoDB Local table..."
    log_info "Table name: $TABLE_NAME"
    log_info "Endpoint: $ENDPOINT_URL"
    echo ""

    # Check if table already exists
    if table_exists; then
        log_info "Table '$TABLE_NAME' already exists. Skipping creation."
        exit 0
    fi

    # Create table
    log_info "Creating table..."
    aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --global-secondary-indexes \
            "[
                {
                    \"IndexName\": \"GSI1\",
                    \"KeySchema\": [
                        {\"AttributeName\": \"GSI1PK\", \"KeyType\": \"HASH\"},
                        {\"AttributeName\": \"GSI1SK\", \"KeyType\": \"RANGE\"}
                    ],
                    \"Projection\": {
                        \"ProjectionType\": \"ALL\"
                    }
                }
            ]" \
        --endpoint-url "$ENDPOINT_URL" \
        --region "$AWS_REGION" \
        > /dev/null

    log_success "Table '$TABLE_NAME' created successfully in DynamoDB Local!"
    echo ""
    
    # Verify table
    log_info "Table details:"
    aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --endpoint-url "$ENDPOINT_URL" \
        --region "$AWS_REGION" \
        --query '{
            TableName: Table.TableName,
            TableStatus: Table.TableStatus,
            KeySchema: Table.KeySchema,
            GlobalSecondaryIndexes: Table.GlobalSecondaryIndexes[*].IndexName
        }' \
        --output table
}

main "$@"
