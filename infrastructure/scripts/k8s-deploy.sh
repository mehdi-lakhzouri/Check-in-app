#!/bin/bash
# =============================================================================
# Check-in App - Kubernetes Deployment Script
# Single VPS with K3s
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="checkin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/../kubernetes"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Check-in App - Kubernetes Deployment                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl not found. Please install kubectl first.${NC}"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to deploy
deploy() {
    echo ""
    echo -e "${YELLOW}🚀 Deploying Check-in App...${NC}"
    
    # Apply base resources
    echo -e "${BLUE}  → Applying Kubernetes manifests...${NC}"
    kubectl apply -k "$K8S_DIR/base/"
    
    echo ""
    echo -e "${YELLOW}⏳ Waiting for pods to be ready...${NC}"
    
    # Wait for backend
    echo -e "${BLUE}  → Waiting for backend pods...${NC}"
    kubectl wait --namespace $NAMESPACE \
        --for=condition=ready pod \
        --selector=app=backend \
        --timeout=300s || true
    
    # Wait for frontend
    echo -e "${BLUE}  → Waiting for frontend pods...${NC}"
    kubectl wait --namespace $NAMESPACE \
        --for=condition=ready pod \
        --selector=app=frontend \
        --timeout=300s || true
    
    # Wait for redis
    echo -e "${BLUE}  → Waiting for redis pod...${NC}"
    kubectl wait --namespace $NAMESPACE \
        --for=condition=ready pod \
        --selector=app=redis \
        --timeout=120s || true
    
    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
}

# Function to show status
status() {
    echo ""
    echo -e "${BLUE}📊 Deployment Status:${NC}"
    echo ""
    
    echo -e "${YELLOW}Pods:${NC}"
    kubectl get pods -n $NAMESPACE -o wide
    
    echo ""
    echo -e "${YELLOW}Services:${NC}"
    kubectl get svc -n $NAMESPACE
    
    echo ""
    echo -e "${YELLOW}Ingress:${NC}"
    kubectl get ingress -n $NAMESPACE
    
    echo ""
    echo -e "${YELLOW}HPA (Auto-scaling):${NC}"
    kubectl get hpa -n $NAMESPACE
}

# Function to show resource usage
resources() {
    echo ""
    echo -e "${BLUE}💾 Resource Usage:${NC}"
    kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available"
}

# Main
check_prerequisites
deploy
status
resources

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Deployment Summary                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Backend:${NC}  2-3 pods (auto-scaling)"
echo -e "  ${BLUE}Frontend:${NC} 1-2 pods (auto-scaling)"
echo -e "  ${BLUE}Redis:${NC}    1 pod"
echo -e "  ${BLUE}Monitoring:${NC} Prometheus + Grafana"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo -e "  1. Update secrets with real values:"
echo -e "     ${BLUE}kubectl edit secret checkin-secrets -n checkin${NC}"
echo -e "  2. Update domain in ingress.yaml"
echo -e "  3. Configure DNS to point to your VPS IP"
echo ""
