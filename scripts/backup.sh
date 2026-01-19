#!/bin/bash
# =============================================================================
# Check-in App Database Backup Script
# =============================================================================
# This script creates backups of MongoDB database with support for:
# - Local and cloud storage (S3/Azure Blob/GCS)
# - Encryption at rest
# - Retention policies
# - Slack notifications
#
# Usage:
#   ./backup.sh <environment> [options]
#
# Environments: staging, production
# Options:
#   --type TYPE     Backup type: full, incremental (default: full)
#   --upload        Upload to cloud storage
#   --encrypt       Encrypt backup file
#   --retention N   Keep only last N backups locally
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Cloud storage configuration (override via environment)
S3_BUCKET="${S3_BUCKET:-}"
AZURE_CONTAINER="${AZURE_CONTAINER:-}"
GCS_BUCKET="${GCS_BUCKET:-}"

# Default values
BACKUP_TYPE="full"
UPLOAD=false
ENCRYPT=false
RETENTION_COUNT=7

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') - $1"
}

print_banner() {
    echo -e "${BLUE}"
    echo "============================================="
    echo "  Check-in App Database Backup"
    echo "  Environment: $ENVIRONMENT"
    echo "  Type: $BACKUP_TYPE"
    echo "  Timestamp: $TIMESTAMP"
    echo "============================================="
    echo -e "${NC}"
}

usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Environments:"
    echo "  staging       Backup staging database"
    echo "  production    Backup production database"
    echo ""
    echo "Options:"
    echo "  --type TYPE     Backup type: full, incremental (default: full)"
    echo "  --upload        Upload backup to cloud storage"
    echo "  --encrypt       Encrypt backup with GPG"
    echo "  --retention N   Keep only last N backups (default: 7)"
    echo "  -h, --help      Show this help message"
    exit 1
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        [ "$status" = "ERROR" ] && color="danger"
        [ "$status" = "WARNING" ] && color="warning"
        
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Database Backup - $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Type\", \"value\": \"$BACKUP_TYPE\", \"short\": true}
                    ],
                    \"footer\": \"Backup Script\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK_URL" || true
    fi
}

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v mongodump &> /dev/null && ! command -v kubectl &> /dev/null; then
        missing_tools+=("mongodump or kubectl")
    fi
    
    if [ "$ENCRYPT" = true ] && ! command -v gpg &> /dev/null; then
        missing_tools+=("gpg")
    fi
    
    if [ "$UPLOAD" = true ]; then
        if [ -n "$S3_BUCKET" ] && ! command -v aws &> /dev/null; then
            missing_tools+=("aws-cli")
        fi
        if [ -n "$AZURE_CONTAINER" ] && ! command -v az &> /dev/null; then
            missing_tools+=("azure-cli")
        fi
        if [ -n "$GCS_BUCKET" ] && ! command -v gsutil &> /dev/null; then
            missing_tools+=("gsutil")
        fi
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    log_success "Prerequisites check passed"
}

# =============================================================================
# Database Connection
# =============================================================================

get_mongodb_connection() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Getting MongoDB connection details..."
    
    # Get MongoDB credentials from Kubernetes secret
    MONGO_HOST=$(kubectl get svc mongodb -n "$namespace" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "localhost")
    MONGO_PORT="27017"
    
    # Get credentials from secret
    if kubectl get secret mongodb-credentials -n "$namespace" &> /dev/null; then
        MONGO_USER=$(kubectl get secret mongodb-credentials -n "$namespace" -o jsonpath='{.data.username}' | base64 -d)
        MONGO_PASS=$(kubectl get secret mongodb-credentials -n "$namespace" -o jsonpath='{.data.password}' | base64 -d)
    else
        MONGO_USER="${MONGO_USER:-admin}"
        MONGO_PASS="${MONGO_PASS:-}"
    fi
    
    MONGO_DB="checkin_${ENVIRONMENT}"
    
    log_info "MongoDB Host: $MONGO_HOST:$MONGO_PORT"
    log_info "Database: $MONGO_DB"
}

# =============================================================================
# Backup Functions
# =============================================================================

create_backup() {
    local backup_name="checkin_${ENVIRONMENT}_${TIMESTAMP}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    log_info "Creating ${BACKUP_TYPE} backup: $backup_name"
    
    local namespace="checkin-${ENVIRONMENT}"
    
    # Create backup using kubectl exec into MongoDB pod
    local mongodb_pod
    mongodb_pod=$(kubectl get pods -n "$namespace" -l app=mongodb -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -n "$mongodb_pod" ]; then
        log_info "Found MongoDB pod: $mongodb_pod"
        
        # Create dump inside the pod
        kubectl exec -n "$namespace" "$mongodb_pod" -- mongodump \
            --db="$MONGO_DB" \
            --out="/tmp/backup_${TIMESTAMP}" \
            --gzip || {
            log_error "Failed to create mongodump"
            return 1
        }
        
        # Copy backup from pod to local
        mkdir -p "$backup_path"
        kubectl cp "$namespace/$mongodb_pod:/tmp/backup_${TIMESTAMP}" "$backup_path" || {
            log_error "Failed to copy backup from pod"
            return 1
        }
        
        # Cleanup inside pod
        kubectl exec -n "$namespace" "$mongodb_pod" -- rm -rf "/tmp/backup_${TIMESTAMP}"
        
    else
        # Direct mongodump (for local development)
        log_info "Using direct mongodump connection..."
        
        local auth_params=""
        if [ -n "$MONGO_USER" ] && [ -n "$MONGO_PASS" ]; then
            auth_params="--username=$MONGO_USER --password=$MONGO_PASS --authenticationDatabase=admin"
        fi
        
        mongodump \
            --host="$MONGO_HOST" \
            --port="$MONGO_PORT" \
            $auth_params \
            --db="$MONGO_DB" \
            --out="$backup_path" \
            --gzip || {
            log_error "Failed to create mongodump"
            return 1
        }
    fi
    
    # Create archive
    local archive_name="${backup_name}.tar.gz"
    local archive_path="${BACKUP_DIR}/${archive_name}"
    
    log_info "Creating archive: $archive_name"
    tar -czf "$archive_path" -C "$BACKUP_DIR" "$backup_name"
    rm -rf "$backup_path"
    
    BACKUP_FILE="$archive_path"
    BACKUP_SIZE=$(du -h "$archive_path" | cut -f1)
    
    log_success "Backup created: $archive_name (Size: $BACKUP_SIZE)"
}

encrypt_backup() {
    if [ "$ENCRYPT" != true ]; then
        return 0
    fi
    
    log_info "Encrypting backup..."
    
    local encrypted_file="${BACKUP_FILE}.gpg"
    
    # Check for encryption key
    if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
        log_error "BACKUP_ENCRYPTION_KEY environment variable not set"
        return 1
    fi
    
    # Encrypt using symmetric encryption
    gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
        --symmetric --cipher-algo AES256 \
        -o "$encrypted_file" "$BACKUP_FILE" || {
        log_error "Failed to encrypt backup"
        return 1
    }
    
    # Remove unencrypted file
    rm -f "$BACKUP_FILE"
    BACKUP_FILE="$encrypted_file"
    
    log_success "Backup encrypted: $(basename "$encrypted_file")"
}

# =============================================================================
# Cloud Upload Functions
# =============================================================================

upload_to_cloud() {
    if [ "$UPLOAD" != true ]; then
        return 0
    fi
    
    local backup_filename
    backup_filename=$(basename "$BACKUP_FILE")
    local cloud_path="${ENVIRONMENT}/${backup_filename}"
    
    log_info "Uploading backup to cloud storage..."
    
    # Upload to S3
    if [ -n "$S3_BUCKET" ]; then
        log_info "Uploading to S3: s3://${S3_BUCKET}/${cloud_path}"
        aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/${cloud_path}" \
            --storage-class STANDARD_IA || {
            log_error "Failed to upload to S3"
            return 1
        }
        log_success "Uploaded to S3"
    fi
    
    # Upload to Azure Blob
    if [ -n "$AZURE_CONTAINER" ]; then
        log_info "Uploading to Azure: ${AZURE_CONTAINER}/${cloud_path}"
        az storage blob upload \
            --container-name "$AZURE_CONTAINER" \
            --name "$cloud_path" \
            --file "$BACKUP_FILE" \
            --tier Cool || {
            log_error "Failed to upload to Azure"
            return 1
        }
        log_success "Uploaded to Azure Blob Storage"
    fi
    
    # Upload to GCS
    if [ -n "$GCS_BUCKET" ]; then
        log_info "Uploading to GCS: gs://${GCS_BUCKET}/${cloud_path}"
        gsutil cp "$BACKUP_FILE" "gs://${GCS_BUCKET}/${cloud_path}" || {
            log_error "Failed to upload to GCS"
            return 1
        }
        log_success "Uploaded to Google Cloud Storage"
    fi
}

# =============================================================================
# Retention Management
# =============================================================================

apply_retention_policy() {
    log_info "Applying retention policy (keeping last $RETENTION_COUNT backups)..."
    
    # List and sort backups
    local backups
    backups=$(ls -1t "${BACKUP_DIR}"/checkin_${ENVIRONMENT}_*.tar.gz* 2>/dev/null || true)
    
    if [ -z "$backups" ]; then
        log_info "No backups found to clean up"
        return 0
    fi
    
    local count=0
    local deleted=0
    
    while IFS= read -r backup; do
        count=$((count + 1))
        if [ $count -gt "$RETENTION_COUNT" ]; then
            log_info "Deleting old backup: $(basename "$backup")"
            rm -f "$backup"
            deleted=$((deleted + 1))
        fi
    done <<< "$backups"
    
    if [ $deleted -gt 0 ]; then
        log_success "Deleted $deleted old backup(s)"
    else
        log_info "No backups to delete"
    fi
}

# =============================================================================
# Verification
# =============================================================================

verify_backup() {
    log_info "Verifying backup integrity..."
    
    # Check file exists and is not empty
    if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
        log_error "Backup file is missing or empty"
        return 1
    fi
    
    # Verify archive integrity
    local test_file="$BACKUP_FILE"
    
    if [[ "$BACKUP_FILE" == *.gpg ]]; then
        log_info "Skipping archive verification for encrypted backup"
    else
        if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
            log_error "Backup archive is corrupted"
            return 1
        fi
    fi
    
    log_success "Backup verification passed"
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
    echo ""
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}  Backup Summary${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    echo "  Environment:  $ENVIRONMENT"
    echo "  Type:         $BACKUP_TYPE"
    echo "  File:         $(basename "$BACKUP_FILE")"
    echo "  Size:         $BACKUP_SIZE"
    echo "  Encrypted:    $ENCRYPT"
    echo "  Uploaded:     $UPLOAD"
    echo "  Location:     $BACKUP_DIR"
    echo ""
    
    if [ "$UPLOAD" = true ]; then
        echo "  Cloud Locations:"
        [ -n "$S3_BUCKET" ] && echo "    - S3: s3://${S3_BUCKET}/${ENVIRONMENT}/"
        [ -n "$AZURE_CONTAINER" ] && echo "    - Azure: ${AZURE_CONTAINER}/${ENVIRONMENT}/"
        [ -n "$GCS_BUCKET" ] && echo "    - GCS: gs://${GCS_BUCKET}/${ENVIRONMENT}/"
        echo ""
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Parse arguments
    if [ $# -lt 1 ]; then
        usage
    fi
    
    ENVIRONMENT="$1"
    shift
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        usage
    fi
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            --upload)
                UPLOAD=true
                shift
                ;;
            --encrypt)
                ENCRYPT=true
                shift
                ;;
            --retention)
                RETENTION_COUNT="$2"
                shift 2
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done
    
    print_banner
    
    # Execute backup workflow
    check_prerequisites
    get_mongodb_connection
    
    if create_backup; then
        encrypt_backup
        verify_backup
        upload_to_cloud
        apply_retention_policy
        print_summary
        send_notification "SUCCESS" "Backup completed: $(basename "$BACKUP_FILE") ($BACKUP_SIZE)"
        log_success "Backup completed successfully!"
    else
        send_notification "ERROR" "Backup failed for $ENVIRONMENT"
        log_error "Backup failed!"
        exit 1
    fi
}

# Run main function
main "$@"
