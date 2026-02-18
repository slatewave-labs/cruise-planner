#!/usr/bin/env bash

################################################################################
# ShoreExplorer - DynamoDB Table Creation Script
################################################################################
# Creates DynamoDB tables for dev, test, and production environments.
#
# This script creates a single-table design with:
# - Primary key: PK (partition key), SK (sort key)
# - GSI1: GSI1PK (partition), GSI1SK (sort) for device-based queries
# - On-demand billing mode (pay per request, no capacity planning needed)
# - Point-in-time recovery enabled for production
#
# Usage:
#   ./create-dynamodb-tables.sh <environment>
#
# Arguments:
#   environment: dev|test|prod
#
# Examples:
#   ./create-dynamodb-tables.sh dev
#   ./create-dynamodb-tables.sh test
#   ./create-dynamodb-tables.sh prod
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Permissions: dynamodb:CreateTable, dynamodb:DescribeTable
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        log_info "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
}

check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured or invalid."
        log_info "Run: aws configure"
        exit 1
    fi
}

table_exists() {
    local table_name=$1
    aws dynamodb describe-table --table-name "$table_name" &> /dev/null
}

################################################################################
# Main Script
################################################################################

main() {
    # Validate arguments
    if [ $# -ne 1 ]; then
        log_error "Usage: $0 <environment>"
        log_info "Example: $0 test"
        log_info "Valid environments: dev, test, prod"
        exit 1
    fi

    ENVIRONMENT=$1

    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        log_info "Valid environments: dev, test, prod"
        exit 1
    fi

    log_info "Creating DynamoDB table for environment: $ENVIRONMENT"
    echo ""

    # Check prerequisites
    check_aws_cli
    check_aws_credentials

    # Set table name based on environment
    TABLE_NAME="shoreexplorer-${ENVIRONMENT}"
    
    # Get AWS region (default to us-east-1 if not set)
    AWS_REGION=${AWS_DEFAULT_REGION:-us-east-1}
    
    log_info "Table name: $TABLE_NAME"
    log_info "AWS Region: $AWS_REGION"
    echo ""

    # Check if table already exists
    if table_exists "$TABLE_NAME"; then
        log_warning "Table '$TABLE_NAME' already exists."
        read -p "Do you want to delete and recreate it? (yes/no): " response
        if [ "$response" == "yes" ]; then
            log_info "Deleting existing table..."
            aws dynamodb delete-table \
                --table-name "$TABLE_NAME" \
                --region "$AWS_REGION" \
                > /dev/null 2>&1 || true
            
            log_info "Waiting for table deletion to complete..."
            aws dynamodb wait table-not-exists \
                --table-name "$TABLE_NAME" \
                --region "$AWS_REGION" \
                2> /dev/null || true
            
            log_success "Table deleted successfully."
            echo ""
        else
            log_info "Keeping existing table. Exiting."
            exit 0
        fi
    fi

    # Create table
    log_info "Creating DynamoDB table with single-table design..."
    
    # Set point-in-time recovery based on environment
    if [ "$ENVIRONMENT" == "prod" ]; then
        ENABLE_PITR="true"
    else
        ENABLE_PITR="false"
    fi

    # Create the table
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
        --stream-specification \
            StreamEnabled=false \
        --region "$AWS_REGION" \
        --tags \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=Application,Value=ShoreExplorer \
            Key=ManagedBy,Value=Script \
        > /dev/null

    log_info "Waiting for table to become active..."
    aws dynamodb wait table-exists \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION"

    log_success "Table '$TABLE_NAME' created successfully!"
    echo ""

    # Enable point-in-time recovery for production
    if [ "$ENABLE_PITR" == "true" ]; then
        log_info "Enabling point-in-time recovery for production table..."
        aws dynamodb update-continuous-backups \
            --table-name "$TABLE_NAME" \
            --point-in-time-recovery-specification \
                PointInTimeRecoveryEnabled=true \
            --region "$AWS_REGION" \
            > /dev/null
        log_success "Point-in-time recovery enabled."
        echo ""
    fi

    # Display table details
    log_info "Table Details:"
    aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --region "$AWS_REGION" \
        --query '{
            TableName: Table.TableName,
            TableStatus: Table.TableStatus,
            ItemCount: Table.ItemCount,
            TableSizeBytes: Table.TableSizeBytes,
            BillingMode: Table.BillingModeSummary.BillingMode,
            CreationDateTime: Table.CreationDateTime,
            GlobalSecondaryIndexes: Table.GlobalSecondaryIndexes[*].{
                IndexName: IndexName,
                IndexStatus: IndexStatus
            }
        }' \
        --output table

    echo ""
    log_success "DynamoDB setup complete for environment: $ENVIRONMENT"
    echo ""
    
    # Display next steps
    log_info "Next Steps:"
    echo "  1. Update your application environment variables:"
    echo "     - DYNAMODB_TABLE_NAME=$TABLE_NAME"
    echo "     - AWS_DEFAULT_REGION=$AWS_REGION"
    echo ""
    echo "  2. Ensure your application has IAM permissions:"
    echo "     - dynamodb:GetItem"
    echo "     - dynamodb:PutItem"
    echo "     - dynamodb:UpdateItem"
    echo "     - dynamodb:DeleteItem"
    echo "     - dynamodb:Query"
    echo "     - dynamodb:Scan"
    echo "     - dynamodb:DescribeTable"
    echo ""
    echo "  3. For ECS deployments, add these permissions to your task role."
    echo ""
    echo "  4. Test the connection with: aws dynamodb describe-table --table-name $TABLE_NAME"
}

# Run main function
main "$@"
