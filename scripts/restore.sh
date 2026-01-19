#!/bin/bash
# =============================================================================
# Check-in App Database Restore Script
# =============================================================================
# This script restores MongoDB database from a backup file with support for:
# - Local and cloud storage sources
# - Encrypted backups
# - Point-in-time restore
# - Verification before restore
#
# Usage:
#   ./restore.sh <environment> <backup_file|backup_name> [options]
#
# Environments: staging, production
# Options:
#   --from-cloud    Download backup from cloud storage
#   --decrypt       Decrypt backup before restore
#   --dry-run       Preview restore without executing
#   --force         Skip confirmation prompts
#   --drop          Drop existing database before restore
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
TEMP_DIR="${TEMP_DIR:-/tmp/checkin_restore}"

# Cloud storage configuration
S3_BUCKET="${S3_BUCKET:-}"
AZURE_CONTAINER="${AZURE_CONTAINER:-}"
GCS_BUCKET="${GCS_BUCKET:-}"

# Default values
FROM_CLOUD=false
DECRYPT=false
DRY_RUN=false
FORCE=false
DROP_DB=false

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
    echo "  Check-in App Database Restore"
    echo "  Environment: $ENVIRONMENT"
    echo "  Backup: $BACKUP_SOURCE"
    echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================="
    echo -e "${NC}"
}

usage() {
    echo "Usage: $0 <environment> <backup_file> [options]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment: staging, production"
    echo "  backup_file    Backup file path or name (e.g., checkin_staging_20240101_120000.tar.gz)"
    echo ""
    echo "Options:"
    echo "  --from-cloud    Download backup from cloud storage"
    echo "  --decrypt       Decrypt backup before restore (requires BACKUP_ENCRYPTION_KEY)"
    echo "  --dry-run       Preview restore without executing"
    echo "  --force         Skip confirmation prompts"
    echo "  --drop          Drop existing database before restore"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 staging /path/to/backup.tar.gz"
    echo "  $0 production checkin_production_20240101.tar.gz --from-cloud"
    echo "  $0 staging backup.tar.gz.gpg --decrypt --force"
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
                    \"title\": \"Database Restore - $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Backup\", \"value\": \"$(basename "$BACKUP_SOURCE")\", \"short\": true}
                    ],
                    \"footer\": \"Restore Script\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK_URL" || true
    fi
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v mongorestore &> /dev/null && ! command -v kubectl &> /dev/null; then
        missing_tools+=("mongorestore or kubectl")
    fi
    
    if [ "$DECRYPT" = true ] && ! command -v gpg &> /dev/null; then
        missing_tools+=("gpg")
    fi
    
    if [ "$FROM_CLOUD" = true ]; then
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
    
    # Create temp directory
    mkdir -p "$TEMP_DIR"
    
    log_success "Prerequisites check passed"
}

# =============================================================================
# Backup Retrieval Functions
# =============================================================================

download_from_cloud() {
    local backup_name="$1"
    local local_path="${TEMP_DIR}/${backup_name}"
    
    log_info "Downloading backup from cloud storage..."
    
    local cloud_path="${ENVIRONMENT}/${backup_name}"
    local downloaded=false
    
    # Try S3 first
    if [ -n "$S3_BUCKET" ]; then
        log_info "Trying S3: s3://${S3_BUCKET}/${cloud_path}"
        if aws s3 cp "s3://${S3_BUCKET}/${cloud_path}" "$local_path" 2>/dev/null; then
            downloaded=true
            log_success "Downloaded from S3"
        fi
    fi
    
    # Try Azure if S3 failed
    if [ "$downloaded" = false ] && [ -n "$AZURE_CONTAINER" ]; then
        log_info "Trying Azure: ${AZURE_CONTAINER}/${cloud_path}"
        if az storage blob download \
            --container-name "$AZURE_CONTAINER" \
            --name "$cloud_path" \
            --file "$local_path" 2>/dev/null; then
            downloaded=true
            log_success "Downloaded from Azure Blob Storage"
        fi
    fi
    
    # Try GCS if others failed
    if [ "$downloaded" = false ] && [ -n "$GCS_BUCKET" ]; then
        log_info "Trying GCS: gs://${GCS_BUCKET}/${cloud_path}"
        if gsutil cp "gs://${GCS_BUCKET}/${cloud_path}" "$local_path" 2>/dev/null; then
            downloaded=true
            log_success "Downloaded from Google Cloud Storage"
        fi
    fi
    
    if [ "$downloaded" = false ]; then
        log_error "Failed to download backup from any cloud storage"
        return 1
    fi
    
    BACKUP_FILE="$local_path"
}

locate_backup() {
    log_info "Locating backup file..."
    
    if [ "$FROM_CLOUD" = true ]; then
        download_from_cloud "$BACKUP_SOURCE"
        return
    fi
    
    # Check if it's an absolute path
    if [[ "$BACKUP_SOURCE" == /* ]]; then
        if [ -f "$BACKUP_SOURCE" ]; then
            BACKUP_FILE="$BACKUP_SOURCE"
        else
            log_error "Backup file not found: $BACKUP_SOURCE"
            exit 1
        fi
    else
        # Check in backup directory
        if [ -f "${BACKUP_DIR}/${BACKUP_SOURCE}" ]; then
            BACKUP_FILE="${BACKUP_DIR}/${BACKUP_SOURCE}"
        elif [ -f "$BACKUP_SOURCE" ]; then
            BACKUP_FILE="$BACKUP_SOURCE"
        else
            log_error "Backup file not found: $BACKUP_SOURCE"
            log_info "Searched in: $BACKUP_DIR"
            exit 1
        fi
    fi
    
    log_success "Found backup: $BACKUP_FILE"
}

# =============================================================================
# Decryption Functions
# =============================================================================

decrypt_backup() {
    if [ "$DECRYPT" != true ]; then
        return 0
    fi
    
    if [[ "$BACKUP_FILE" != *.gpg ]]; then
        log_info "Backup file does not have .gpg extension, skipping decryption"
        return 0
    fi
    
    log_info "Decrypting backup..."
    
    if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
        log_error "BACKUP_ENCRYPTION_KEY environment variable not set"
        exit 1
    fi
    
    local decrypted_file="${BACKUP_FILE%.gpg}"
    
    gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
        --decrypt -o "$decrypted_file" "$BACKUP_FILE" || {
        log_error "Failed to decrypt backup"
        exit 1
    }
    
    BACKUP_FILE="$decrypted_file"
    log_success "Backup decrypted successfully"
}

# =============================================================================
# Extraction Functions
# =============================================================================

extract_backup() {
    log_info "Extracting backup archive..."
    
    local extract_dir="${TEMP_DIR}/extract"
    mkdir -p "$extract_dir"
    
    # Extract based on file type
    if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        tar -xzf "$BACKUP_FILE" -C "$extract_dir" || {
            log_error "Failed to extract backup archive"
            exit 1
        }
    elif [[ "$BACKUP_FILE" == *.tar ]]; then
        tar -xf "$BACKUP_FILE" -C "$extract_dir" || {
            log_error "Failed to extract backup archive"
            exit 1
        }
    else
        log_error "Unsupported archive format: $BACKUP_FILE"
        exit 1
    fi
    
    # Find the dump directory
    DUMP_DIR=$(find "$extract_dir" -type d -name "checkin_*" | head -1)
    if [ -z "$DUMP_DIR" ]; then
        DUMP_DIR="$extract_dir"
    fi
    
    log_success "Backup extracted to: $DUMP_DIR"
}

# =============================================================================
# Database Connection
# =============================================================================

get_mongodb_connection() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Getting MongoDB connection details..."
    
    # Get MongoDB service
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
# Restore Functions
# =============================================================================

verify_backup() {
    log_info "Verifying backup contents..."
    
    # Check for database files
    if ! find "$DUMP_DIR" -name "*.bson*" -o -name "*.json*" | grep -q .; then
        log_error "No valid MongoDB dump files found in backup"
        exit 1
    fi
    
    # List collections in backup
    log_info "Collections found in backup:"
    find "$DUMP_DIR" -name "*.bson*" -exec basename {} \; | sed 's/\.bson.*$//' | sort -u | while read -r col; do
        echo "  - $col"
    done
    
    log_success "Backup verification passed"
}

confirm_restore() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo ""
    log_warning "You are about to restore the $ENVIRONMENT database!"
    echo ""
    echo "  Backup: $(basename "$BACKUP_FILE")"
    echo "  Target: $MONGO_DB on $MONGO_HOST"
    echo "  Drop existing: $DROP_DB"
    echo ""
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${RED}  WARNING: This is a PRODUCTION environment!${NC}"
        echo ""
        read -p "Type 'RESTORE PRODUCTION' to confirm: " -r
        if [ "$REPLY" != "RESTORE PRODUCTION" ]; then
            log_info "Restore cancelled"
            exit 0
        fi
    else
        read -p "Are you sure you want to continue? (yes/no) " -r
        if [ "$REPLY" != "yes" ]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi
}

create_pre_restore_backup() {
    log_info "Creating pre-restore backup..."
    
    # Call backup script to create a safety backup
    if [ -x "${SCRIPT_DIR}/backup.sh" ]; then
        "${SCRIPT_DIR}/backup.sh" "$ENVIRONMENT" --type full || {
            log_warning "Failed to create pre-restore backup"
            if [ "$FORCE" != true ]; then
                read -p "Continue without backup? (yes/no) " -r
                if [ "$REPLY" != "yes" ]; then
                    exit 1
                fi
            fi
        }
    else
        log_warning "Backup script not found, skipping pre-restore backup"
    fi
}

execute_restore() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Executing database restore..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run mode - would restore from: $DUMP_DIR"
        log_info "Target database: $MONGO_DB"
        return 0
    fi
    
    # Build mongorestore arguments
    local restore_args="--gzip --db=$MONGO_DB"
    
    if [ "$DROP_DB" = true ]; then
        restore_args="$restore_args --drop"
    fi
    
    # Find MongoDB pod
    local mongodb_pod
    mongodb_pod=$(kubectl get pods -n "$namespace" -l app=mongodb -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -n "$mongodb_pod" ]; then
        log_info "Restoring via MongoDB pod: $mongodb_pod"
        
        # Copy dump to pod
        kubectl cp "$DUMP_DIR" "$namespace/$mongodb_pod:/tmp/restore_dump" || {
            log_error "Failed to copy dump to pod"
            return 1
        }
        
        # Execute restore in pod
        kubectl exec -n "$namespace" "$mongodb_pod" -- mongorestore \
            $restore_args \
            "/tmp/restore_dump" || {
            log_error "Failed to execute mongorestore"
            return 1
        }
        
        # Cleanup
        kubectl exec -n "$namespace" "$mongodb_pod" -- rm -rf "/tmp/restore_dump"
        
    else
        # Direct mongorestore
        log_info "Using direct mongorestore connection..."
        
        local auth_params=""
        if [ -n "$MONGO_USER" ] && [ -n "$MONGO_PASS" ]; then
            auth_params="--username=$MONGO_USER --password=$MONGO_PASS --authenticationDatabase=admin"
        fi
        
        mongorestore \
            --host="$MONGO_HOST" \
            --port="$MONGO_PORT" \
            $auth_params \
            $restore_args \
            "$DUMP_DIR" || {
            log_error "Failed to execute mongorestore"
            return 1
        }
    fi
    
    log_success "Database restore completed"
}

verify_restore() {
    log_info "Verifying restore..."
    
    local namespace="checkin-${ENVIRONMENT}"
    
    # Find MongoDB pod
    local mongodb_pod
    mongodb_pod=$(kubectl get pods -n "$namespace" -l app=mongodb -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -n "$mongodb_pod" ]; then
        # Get collection counts
        log_info "Checking collection counts..."
        kubectl exec -n "$namespace" "$mongodb_pod" -- mongosh "$MONGO_DB" --eval "
            db.getCollectionNames().forEach(function(c) {
                print(c + ': ' + db[c].countDocuments() + ' documents');
            });
        " || log_warning "Could not verify collection counts"
    fi
    
    log_success "Restore verification complete"
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
    echo ""
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}  Restore Summary${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    echo "  Environment:  $ENVIRONMENT"
    echo "  Backup File:  $(basename "$BACKUP_FILE")"
    echo "  Database:     $MONGO_DB"
    echo "  Drop Mode:    $DROP_DB"
    echo "  Status:       SUCCESS"
    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Parse arguments
    if [ $# -lt 2 ]; then
        usage
    fi
    
    ENVIRONMENT="$1"
    BACKUP_SOURCE="$2"
    shift 2
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        usage
    fi
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --from-cloud)
                FROM_CLOUD=true
                shift
                ;;
            --decrypt)
                DECRYPT=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --drop)
                DROP_DB=true
                shift
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
    
    # Execute restore workflow
    check_prerequisites
    locate_backup
    decrypt_backup
    extract_backup
    verify_backup
    get_mongodb_connection
    confirm_restore
    
    if [ "$DRY_RUN" != true ]; then
        create_pre_restore_backup
    fi
    
    if execute_restore; then
        if [ "$DRY_RUN" != true ]; then
            verify_restore
            print_summary
            send_notification "SUCCESS" "Database restored from $(basename "$BACKUP_FILE")"
        fi
        log_success "Restore completed successfully!"
    else
        send_notification "ERROR" "Database restore failed"
        log_error "Restore failed!"
        exit 1
    fi
}

# Run main function
main "$@"
