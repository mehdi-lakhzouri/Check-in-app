#!/bin/bash
# =============================================================================
# Check-in App Health Check Script
# =============================================================================
# Comprehensive health verification for all application components including:
# - Kubernetes deployments and pods
# - API endpoints
# - Database connectivity
# - Cache health
# - Certificate validity
# - Resource utilization
#
# Usage:
#   ./health-check.sh <environment> [options]
#
# Environments: staging, production
# Options:
#   --verbose       Show detailed output
#   --json          Output in JSON format
#   --alert         Send alert on failure
#   --component X   Check specific component only
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
TIMEOUT_SECONDS=10

# Default values
VERBOSE=false
JSON_OUTPUT=false
SEND_ALERT=false
SPECIFIC_COMPONENT=""

# Health status tracking
declare -A HEALTH_STATUS
OVERALL_HEALTH="healthy"
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    if [ "$JSON_OUTPUT" != true ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" != true ]; then
        echo -e "${GREEN}[✓]${NC} $1"
    fi
}

log_warning() {
    if [ "$JSON_OUTPUT" != true ]; then
        echo -e "${YELLOW}[!]${NC} $1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" != true ]; then
        echo -e "${RED}[✗]${NC} $1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" != true ]; then
        echo -e "    $1"
    fi
}

print_banner() {
    if [ "$JSON_OUTPUT" != true ]; then
        echo -e "${BLUE}"
        echo "============================================="
        echo "  Check-in App Health Check"
        echo "  Environment: $ENVIRONMENT"
        echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "============================================="
        echo -e "${NC}"
    fi
}

usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Environments:"
    echo "  staging       Check staging environment"
    echo "  production    Check production environment"
    echo ""
    echo "Options:"
    echo "  --verbose         Show detailed output"
    echo "  --json            Output in JSON format"
    echo "  --alert           Send alert on failure"
    echo "  --component X     Check specific component (backend, frontend, mongodb, redis, ingress)"
    echo "  -h, --help        Show this help message"
    exit 1
}

record_check() {
    local component="$1"
    local check_name="$2"
    local status="$3"
    local details="${4:-}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case "$status" in
        "healthy")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            HEALTH_STATUS["${component}:${check_name}"]="healthy"
            log_success "$component - $check_name"
            ;;
        "warning")
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            HEALTH_STATUS["${component}:${check_name}"]="warning"
            [ "$OVERALL_HEALTH" = "healthy" ] && OVERALL_HEALTH="degraded"
            log_warning "$component - $check_name: $details"
            ;;
        "unhealthy")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            HEALTH_STATUS["${component}:${check_name}"]="unhealthy"
            OVERALL_HEALTH="unhealthy"
            log_error "$component - $check_name: $details"
            ;;
    esac
    
    [ -n "$details" ] && log_verbose "$details"
}

# =============================================================================
# Kubernetes Checks
# =============================================================================

check_kubernetes_connection() {
    log_info "Checking Kubernetes connection..."
    
    if kubectl cluster-info &> /dev/null; then
        record_check "kubernetes" "connection" "healthy"
        return 0
    else
        record_check "kubernetes" "connection" "unhealthy" "Cannot connect to cluster"
        return 1
    fi
}

check_namespace() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking namespace: $namespace"
    
    if kubectl get namespace "$namespace" &> /dev/null; then
        record_check "namespace" "exists" "healthy"
    else
        record_check "namespace" "exists" "unhealthy" "Namespace does not exist"
        return 1
    fi
}

check_deployments() {
    local namespace="checkin-${ENVIRONMENT}"
    local deployments=("backend" "frontend")
    
    log_info "Checking deployments..."
    
    for deployment in "${deployments[@]}"; do
        if [ -n "$SPECIFIC_COMPONENT" ] && [ "$SPECIFIC_COMPONENT" != "$deployment" ]; then
            continue
        fi
        
        # Check if deployment exists
        if ! kubectl get deployment "$deployment" -n "$namespace" &> /dev/null; then
            record_check "$deployment" "deployment-exists" "unhealthy" "Deployment not found"
            continue
        fi
        
        # Get deployment status
        local ready
        ready=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired
        desired=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [ "$ready" -eq "$desired" ] && [ "$desired" -gt 0 ]; then
            record_check "$deployment" "replicas" "healthy" "$ready/$desired replicas ready"
        elif [ "$ready" -gt 0 ]; then
            record_check "$deployment" "replicas" "warning" "Only $ready/$desired replicas ready"
        else
            record_check "$deployment" "replicas" "unhealthy" "No replicas ready ($ready/$desired)"
        fi
    done
}

check_pods() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking pod health..."
    
    # Get pods in non-running state
    local problem_pods
    problem_pods=$(kubectl get pods -n "$namespace" --field-selector=status.phase!=Running,status.phase!=Succeeded -o name 2>/dev/null | wc -l)
    
    if [ "$problem_pods" -eq 0 ]; then
        record_check "pods" "running-state" "healthy"
    else
        record_check "pods" "running-state" "warning" "$problem_pods pods not in Running state"
    fi
    
    # Check for pods with restart count
    local high_restart_pods
    high_restart_pods=$(kubectl get pods -n "$namespace" -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.containerStatuses[*].restartCount}{"\n"}{end}' 2>/dev/null | \
        awk '$2 > 5 {print $1}' | wc -l)
    
    if [ "$high_restart_pods" -eq 0 ]; then
        record_check "pods" "restart-count" "healthy"
    else
        record_check "pods" "restart-count" "warning" "$high_restart_pods pods have high restart counts"
    fi
}

check_services() {
    local namespace="checkin-${ENVIRONMENT}"
    local services=("backend" "frontend" "mongodb" "redis")
    
    log_info "Checking services..."
    
    for service in "${services[@]}"; do
        if [ -n "$SPECIFIC_COMPONENT" ] && [ "$SPECIFIC_COMPONENT" != "$service" ]; then
            continue
        fi
        
        if kubectl get svc "$service" -n "$namespace" &> /dev/null; then
            # Check if service has endpoints
            local endpoints
            endpoints=$(kubectl get endpoints "$service" -n "$namespace" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null)
            
            if [ -n "$endpoints" ]; then
                record_check "$service" "service-endpoints" "healthy"
            else
                record_check "$service" "service-endpoints" "warning" "No endpoints available"
            fi
        else
            record_check "$service" "service-exists" "unhealthy" "Service not found"
        fi
    done
}

# =============================================================================
# Application Health Checks
# =============================================================================

check_backend_health() {
    if [ -n "$SPECIFIC_COMPONENT" ] && [ "$SPECIFIC_COMPONENT" != "backend" ]; then
        return 0
    fi
    
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking backend health endpoint..."
    
    # Get backend service IP
    local backend_ip
    backend_ip=$(kubectl get svc backend -n "$namespace" -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
    
    if [ -z "$backend_ip" ]; then
        record_check "backend" "health-endpoint" "unhealthy" "Cannot get service IP"
        return 1
    fi
    
    # Create a curl pod to check health
    local health_result
    health_result=$(kubectl run health-check-$$ --rm -i --restart=Never -n "$namespace" \
        --image=curlimages/curl:latest \
        -- -sf -o /dev/null -w '%{http_code}' \
        --max-time "$TIMEOUT_SECONDS" \
        "http://${backend_ip}:3000/api/health" 2>/dev/null || echo "000")
    
    if [ "$health_result" = "200" ]; then
        record_check "backend" "health-endpoint" "healthy"
    elif [ "$health_result" = "503" ]; then
        record_check "backend" "health-endpoint" "warning" "Service unavailable (503)"
    else
        record_check "backend" "health-endpoint" "unhealthy" "HTTP status: $health_result"
    fi
}

check_frontend_health() {
    if [ -n "$SPECIFIC_COMPONENT" ] && [ "$SPECIFIC_COMPONENT" != "frontend" ]; then
        return 0
    fi
    
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking frontend health..."
    
    # Get frontend service IP
    local frontend_ip
    frontend_ip=$(kubectl get svc frontend -n "$namespace" -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
    
    if [ -z "$frontend_ip" ]; then
        record_check "frontend" "health" "unhealthy" "Cannot get service IP"
        return 1
    fi
    
    # Create a curl pod to check frontend
    local health_result
    health_result=$(kubectl run health-check-fe-$$ --rm -i --restart=Never -n "$namespace" \
        --image=curlimages/curl:latest \
        -- -sf -o /dev/null -w '%{http_code}' \
        --max-time "$TIMEOUT_SECONDS" \
        "http://${frontend_ip}:3000/" 2>/dev/null || echo "000")
    
    if [ "$health_result" = "200" ]; then
        record_check "frontend" "health" "healthy"
    else
        record_check "frontend" "health" "unhealthy" "HTTP status: $health_result"
    fi
}

# =============================================================================
# Database Checks
# =============================================================================

check_mongodb() {
    if [ -n "$SPECIFIC_COMPONENT" ] && [ "$SPECIFIC_COMPONENT" != "mongodb" ]; then
        return 0
    fi
    
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking MongoDB health..."
    
    # Find MongoDB pod
    local mongodb_pod
    mongodb_pod=$(kubectl get pods -n "$namespace" -l app=mongodb -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$mongodb_pod" ]; then
        record_check "mongodb" "pod" "unhealthy" "No MongoDB pod found"
        return 1
    fi
    
    # Check MongoDB status
    local mongo_status
    mongo_status=$(kubectl exec -n "$namespace" "$mongodb_pod" -- mongosh --eval "db.adminCommand('ping')" 2>/dev/null | grep -c "ok.*1" || echo "0")
    
    if [ "$mongo_status" -gt 0 ]; then
        record_check "mongodb" "connectivity" "healthy"
    else
        record_check "mongodb" "connectivity" "unhealthy" "Cannot ping MongoDB"
    fi
    
    # Check storage usage if verbose
    if [ "$VERBOSE" = true ]; then
        local storage_info
        storage_info=$(kubectl exec -n "$namespace" "$mongodb_pod" -- df -h /data/db 2>/dev/null | tail -1)
        log_verbose "Storage: $storage_info"
    fi
}

check_redis() {
    if [ -n "$SPECIFIC_COMPONENT" ] && [ "$SPECIFIC_COMPONENT" != "redis" ]; then
        return 0
    fi
    
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking Redis health..."
    
    # Find Redis pod
    local redis_pod
    redis_pod=$(kubectl get pods -n "$namespace" -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$redis_pod" ]; then
        record_check "redis" "pod" "unhealthy" "No Redis pod found"
        return 1
    fi
    
    # Check Redis PING
    local redis_status
    redis_status=$(kubectl exec -n "$namespace" "$redis_pod" -- redis-cli PING 2>/dev/null || echo "")
    
    if [ "$redis_status" = "PONG" ]; then
        record_check "redis" "connectivity" "healthy"
    else
        record_check "redis" "connectivity" "unhealthy" "Redis PING failed"
    fi
    
    # Check memory usage
    local memory_usage
    memory_usage=$(kubectl exec -n "$namespace" "$redis_pod" -- redis-cli INFO memory 2>/dev/null | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
    
    if [ -n "$memory_usage" ]; then
        log_verbose "Redis memory: $memory_usage"
    fi
}

# =============================================================================
# Ingress and Certificate Checks
# =============================================================================

check_ingress() {
    if [ -n "$SPECIFIC_COMPONENT" ] && [ "$SPECIFIC_COMPONENT" != "ingress" ]; then
        return 0
    fi
    
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking ingress..."
    
    # Check if ingress exists
    if ! kubectl get ingress -n "$namespace" &> /dev/null; then
        record_check "ingress" "exists" "warning" "No ingress configured"
        return 0
    fi
    
    # Get ingress status
    local ingress_ip
    ingress_ip=$(kubectl get ingress -n "$namespace" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    
    if [ -n "$ingress_ip" ]; then
        record_check "ingress" "load-balancer" "healthy" "IP: $ingress_ip"
    else
        local ingress_hostname
        ingress_hostname=$(kubectl get ingress -n "$namespace" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
        
        if [ -n "$ingress_hostname" ]; then
            record_check "ingress" "load-balancer" "healthy" "Hostname: $ingress_hostname"
        else
            record_check "ingress" "load-balancer" "warning" "No external IP/hostname assigned"
        fi
    fi
}

check_certificates() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking TLS certificates..."
    
    # Check cert-manager certificates
    if kubectl get certificates -n "$namespace" &> /dev/null 2>&1; then
        local certs
        certs=$(kubectl get certificates -n "$namespace" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
        
        for cert in $certs; do
            local ready
            ready=$(kubectl get certificate "$cert" -n "$namespace" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
            
            if [ "$ready" = "True" ]; then
                # Check expiration
                local not_after
                not_after=$(kubectl get certificate "$cert" -n "$namespace" -o jsonpath='{.status.notAfter}' 2>/dev/null)
                
                if [ -n "$not_after" ]; then
                    local expiry_timestamp
                    expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null || echo "0")
                    local current_timestamp
                    current_timestamp=$(date +%s)
                    local days_until_expiry
                    days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                    
                    if [ "$days_until_expiry" -lt 7 ]; then
                        record_check "certificate" "$cert" "warning" "Expires in $days_until_expiry days"
                    else
                        record_check "certificate" "$cert" "healthy" "Valid for $days_until_expiry days"
                    fi
                else
                    record_check "certificate" "$cert" "healthy"
                fi
            else
                record_check "certificate" "$cert" "unhealthy" "Certificate not ready"
            fi
        done
    else
        log_verbose "No certificates found (cert-manager may not be installed)"
    fi
}

# =============================================================================
# Resource Utilization Checks
# =============================================================================

check_resource_utilization() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking resource utilization..."
    
    # Check if metrics-server is available
    if ! kubectl top pods -n "$namespace" &> /dev/null 2>&1; then
        log_verbose "Metrics server not available, skipping resource checks"
        return 0
    fi
    
    # Get pod resource usage
    local pods_info
    pods_info=$(kubectl top pods -n "$namespace" --no-headers 2>/dev/null)
    
    while IFS= read -r line; do
        local pod_name cpu_usage mem_usage
        pod_name=$(echo "$line" | awk '{print $1}')
        cpu_usage=$(echo "$line" | awk '{print $2}')
        mem_usage=$(echo "$line" | awk '{print $3}')
        
        log_verbose "$pod_name: CPU=$cpu_usage, Memory=$mem_usage"
        
        # Check for high memory usage (over 1Gi)
        local mem_value
        mem_value=$(echo "$mem_usage" | sed 's/Mi//' | sed 's/Gi/*1024/' | bc 2>/dev/null || echo "0")
        
        if [ "$mem_value" -gt 1500 ]; then
            record_check "resources" "$pod_name-memory" "warning" "High memory usage: $mem_usage"
        fi
    done <<< "$pods_info"
    
    record_check "resources" "utilization" "healthy"
}

# =============================================================================
# HPA Checks
# =============================================================================

check_hpa() {
    local namespace="checkin-${ENVIRONMENT}"
    
    log_info "Checking Horizontal Pod Autoscalers..."
    
    # Get HPA status
    local hpas
    hpas=$(kubectl get hpa -n "$namespace" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    for hpa in $hpas; do
        local current
        current=$(kubectl get hpa "$hpa" -n "$namespace" -o jsonpath='{.status.currentReplicas}' 2>/dev/null)
        local max
        max=$(kubectl get hpa "$hpa" -n "$namespace" -o jsonpath='{.spec.maxReplicas}' 2>/dev/null)
        local cpu_util
        cpu_util=$(kubectl get hpa "$hpa" -n "$namespace" -o jsonpath='{.status.currentMetrics[?(@.type=="Resource")].resource.current.averageUtilization}' 2>/dev/null)
        
        if [ "$current" -eq "$max" ]; then
            record_check "hpa" "$hpa" "warning" "At max replicas ($current/$max), CPU: ${cpu_util:-N/A}%"
        else
            record_check "hpa" "$hpa" "healthy" "$current/$max replicas, CPU: ${cpu_util:-N/A}%"
        fi
    done
}

# =============================================================================
# Output Functions
# =============================================================================

output_json() {
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "{"
    echo "  \"timestamp\": \"$timestamp\","
    echo "  \"environment\": \"$ENVIRONMENT\","
    echo "  \"overall_health\": \"$OVERALL_HEALTH\","
    echo "  \"summary\": {"
    echo "    \"total_checks\": $TOTAL_CHECKS,"
    echo "    \"passed\": $PASSED_CHECKS,"
    echo "    \"warnings\": $WARNING_CHECKS,"
    echo "    \"failed\": $FAILED_CHECKS"
    echo "  },"
    echo "  \"checks\": {"
    
    local first=true
    for key in "${!HEALTH_STATUS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$key\": \"${HEALTH_STATUS[$key]}\""
    done
    
    echo ""
    echo "  }"
    echo "}"
}

print_summary() {
    if [ "$JSON_OUTPUT" = true ]; then
        output_json
        return
    fi
    
    echo ""
    echo "============================================="
    echo "  Health Check Summary"
    echo "============================================="
    echo ""
    echo "  Environment:   $ENVIRONMENT"
    echo "  Overall Health: $(
        case "$OVERALL_HEALTH" in
            "healthy") echo -e "${GREEN}HEALTHY${NC}" ;;
            "degraded") echo -e "${YELLOW}DEGRADED${NC}" ;;
            "unhealthy") echo -e "${RED}UNHEALTHY${NC}" ;;
        esac
    )"
    echo ""
    echo "  Total Checks:  $TOTAL_CHECKS"
    echo "  Passed:        ${GREEN}$PASSED_CHECKS${NC}"
    echo "  Warnings:      ${YELLOW}$WARNING_CHECKS${NC}"
    echo "  Failed:        ${RED}$FAILED_CHECKS${NC}"
    echo ""
}

send_alert() {
    if [ "$SEND_ALERT" != true ] || [ "$OVERALL_HEALTH" = "healthy" ]; then
        return 0
    fi
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="warning"
        [ "$OVERALL_HEALTH" = "unhealthy" ] && color="danger"
        
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Health Check Alert - ${ENVIRONMENT^^}\",
                    \"text\": \"Environment health: $OVERALL_HEALTH\",
                    \"fields\": [
                        {\"title\": \"Passed\", \"value\": \"$PASSED_CHECKS\", \"short\": true},
                        {\"title\": \"Failed\", \"value\": \"$FAILED_CHECKS\", \"short\": true},
                        {\"title\": \"Warnings\", \"value\": \"$WARNING_CHECKS\", \"short\": true}
                    ],
                    \"footer\": \"Health Check Script\",
                    \"ts\": $(date +%s)
                }]
            }" \
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
            --verbose)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --alert)
                SEND_ALERT=true
                shift
                ;;
            --component)
                SPECIFIC_COMPONENT="$2"
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
    
    # Run health checks
    check_kubernetes_connection || exit 1
    check_namespace || exit 1
    check_deployments
    check_pods
    check_services
    check_backend_health
    check_frontend_health
    check_mongodb
    check_redis
    check_ingress
    check_certificates
    check_resource_utilization
    check_hpa
    
    # Output results
    print_summary
    send_alert
    
    # Exit with appropriate code
    case "$OVERALL_HEALTH" in
        "healthy") exit 0 ;;
        "degraded") exit 1 ;;
        "unhealthy") exit 2 ;;
    esac
}

# Run main function
main "$@"
