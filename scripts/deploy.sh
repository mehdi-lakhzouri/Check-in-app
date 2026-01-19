#!/bin/bash
# =============================================================================
# Check-in App Deployment Script
# =============================================================================
# This script handles deployments to staging and production environments
# using Kubernetes with Kustomize overlays.
#
# Usage:
#   ./deploy.sh <environment> [options]
#
# Environments: staging, production
# Options:
#   --dry-run       Preview changes without applying
#   --skip-tests    Skip pre-deployment tests
#   --force         Skip confirmation prompts
#   --rollback      Rollback to previous deployment
#   --version       Specify image version/tag
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
KUSTOMIZE_DIR="${PROJECT_ROOT}/infrastructure/kubernetes"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_ORG="${DOCKER_ORG:-your-org}"

# Default values
DRY_RUN=false
SKIP_TESTS=false
FORCE=false
ROLLBACK=false
IMAGE_VERSION="${IMAGE_VERSION:-latest}"

# =============================================================================
# Utility Functions
# =============================================================================

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

print_banner() {
    echo -e "${BLUE}"
    echo "============================================="
    echo "  Check-in App Deployment"
    echo "  Environment: $ENVIRONMENT"
    echo "  Version: $IMAGE_VERSION"
    echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================="
    echo -e "${NC}"
}

usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Environments:"
    echo "  staging       Deploy to staging environment"
    echo "  production    Deploy to production environment"
    echo ""
    echo "Options:"
    echo "  --dry-run       Preview changes without applying"
    echo "  --skip-tests    Skip pre-deployment tests"
    echo "  --force         Skip confirmation prompts"
    echo "  --rollback      Rollback to previous deployment"
    echo "  --version TAG   Specify image version/tag (default: latest)"
    echo "  -h, --help      Show this help message"
    exit 1
}

# =============================================================================
# Pre-deployment Checks
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v kustomize &> /dev/null; then
        missing_tools+=("kustomize")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    local kustomize_path="${KUSTOMIZE_DIR}/${ENVIRONMENT}"
    
    if [ ! -d "$kustomize_path" ]; then
        log_error "Kustomize overlay not found: $kustomize_path"
        exit 1
    fi
    
    # Validate kustomization
    if ! kustomize build "$kustomize_path" > /dev/null 2>&1; then
        log_error "Kustomize validation failed for $ENVIRONMENT"
        exit 1
    fi
    
    log_success "Environment configuration valid"
}

check_images_exist() {
    log_info "Checking if Docker images exist..."
    
    local images=(
        "${DOCKER_REGISTRY}/${DOCKER_ORG}/checkin-backend:${IMAGE_VERSION}"
        "${DOCKER_REGISTRY}/${DOCKER_ORG}/checkin-frontend:${IMAGE_VERSION}"
    )
    
    for image in "${images[@]}"; do
        if ! docker manifest inspect "$image" &> /dev/null; then
            log_warning "Image not found: $image"
            if [ "$FORCE" != true ]; then
                read -p "Continue anyway? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            fi
        else
            log_info "Image found: $image"
        fi
    done
    
    log_success "Image check complete"
}

# =============================================================================
# Deployment Functions
# =============================================================================

run_pre_deployment_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping pre-deployment tests"
        return 0
    fi
    
    log_info "Running pre-deployment tests..."
    
    # Run backend tests
    if [ -f "${PROJECT_ROOT}/backend/package.json" ]; then
        log_info "Running backend tests..."
        cd "${PROJECT_ROOT}/backend"
        npm run test:unit 2>&1 | tail -20 || {
            log_error "Backend tests failed"
            exit 1
        }
    fi
    
    # Run frontend tests
    if [ -f "${PROJECT_ROOT}/frontend/package.json" ]; then
        log_info "Running frontend tests..."
        cd "${PROJECT_ROOT}/frontend"
        npm run test 2>&1 | tail -20 || {
            log_warning "Frontend tests failed (continuing...)"
        }
    fi
    
    log_success "Pre-deployment tests passed"
}

create_namespace() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Ensuring namespace exists: $namespace"
    
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Namespace ready: $namespace"
}

deploy_with_kustomize() {
    local kustomize_path="${KUSTOMIZE_DIR}/${ENVIRONMENT}"
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Deploying to $ENVIRONMENT using Kustomize..."
    
    # Generate manifests with image override
    local manifests
    manifests=$(kustomize build "$kustomize_path" | \
        sed "s|image: .*backend.*|image: ${DOCKER_REGISTRY}/${DOCKER_ORG}/checkin-backend:${IMAGE_VERSION}|g" | \
        sed "s|image: .*frontend.*|image: ${DOCKER_REGISTRY}/${DOCKER_ORG}/checkin-frontend:${IMAGE_VERSION}|g")
    
    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run - Generated manifests:"
        echo "$manifests" | kubectl apply --dry-run=client -f - 
        return 0
    fi
    
    # Apply manifests
    echo "$manifests" | kubectl apply -f -
    
    log_success "Manifests applied successfully"
}

wait_for_rollout() {
    local namespace="checkin-${ENVIRONMENT}"
    local deployments=("backend" "frontend")
    
    log_info "Waiting for deployments to be ready..."
    
    for deployment in "${deployments[@]}"; do
        log_info "Waiting for $deployment deployment..."
        if ! kubectl rollout status deployment/"$deployment" -n "$namespace" --timeout=300s; then
            log_error "Deployment $deployment failed to become ready"
            return 1
        fi
    done
    
    log_success "All deployments are ready"
}

run_smoke_tests() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Running smoke tests..."
    
    # Get backend service URL
    local backend_url
    backend_url=$(kubectl get svc backend -n "$namespace" -o jsonpath='{.spec.clusterIP}')
    
    # Create a temporary pod to run smoke tests
    kubectl run smoke-test --rm -i --restart=Never -n "$namespace" \
        --image=curlimages/curl:latest \
        -- sh -c "
            echo 'Testing backend health endpoint...'
            curl -sf http://${backend_url}:3000/api/health || exit 1
            echo 'Health check passed!'
        " || {
            log_error "Smoke tests failed"
            return 1
        }
    
    log_success "Smoke tests passed"
}

# =============================================================================
# Rollback Functions
# =============================================================================

rollback_deployment() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Rolling back deployment in $namespace..."
    
    # Rollback backend
    log_info "Rolling back backend..."
    kubectl rollout undo deployment/backend -n "$namespace"
    
    # Rollback frontend
    log_info "Rolling back frontend..."
    kubectl rollout undo deployment/frontend -n "$namespace"
    
    # Wait for rollback to complete
    wait_for_rollout
    
    log_success "Rollback completed successfully"
}

# =============================================================================
# Post-deployment Functions
# =============================================================================

print_deployment_summary() {
    local namespace="checkin-${ENVIRONMENT}"
    
    echo ""
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}  Deployment Summary${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    
    echo "Deployed Resources:"
    kubectl get deployments,pods,services -n "$namespace" --no-headers | while read -r line; do
        echo "  $line"
    done
    
    echo ""
    echo "Deployment Status:"
    kubectl get deployments -n "$namespace" -o wide
    
    echo ""
    echo "Pod Status:"
    kubectl get pods -n "$namespace" -o wide
    
    echo ""
    
    # Get ingress URL if available
    local ingress_host
    ingress_host=$(kubectl get ingress -n "$namespace" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
    if [ -n "$ingress_host" ]; then
        echo "Application URL: https://${ingress_host}"
    fi
}

send_notification() {
    local status="$1"
    local message="$2"
    
    # Send Slack notification if webhook is configured
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[${status}] ${ENVIRONMENT}: ${message}\"}" \
            "$SLACK_WEBHOOK_URL" || true
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
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --version)
                IMAGE_VERSION="$2"
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
    
    # Confirmation for production
    if [ "$ENVIRONMENT" = "production" ] && [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
        log_warning "You are about to deploy to PRODUCTION!"
        read -p "Are you sure you want to continue? (yes/no) " -r
        if [ "$REPLY" != "yes" ]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Run checks
    check_prerequisites
    validate_environment
    
    if [ "$ROLLBACK" = true ]; then
        rollback_deployment
        print_deployment_summary
        send_notification "ROLLBACK" "Deployment rolled back successfully"
        exit 0
    fi
    
    check_images_exist
    run_pre_deployment_tests
    
    # Deploy
    create_namespace
    deploy_with_kustomize
    
    if [ "$DRY_RUN" != true ]; then
        wait_for_rollout
        run_smoke_tests
        print_deployment_summary
        send_notification "SUCCESS" "Deployment completed successfully (v${IMAGE_VERSION})"
    fi
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"
