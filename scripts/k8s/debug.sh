#!/bin/bash

# Kubernetes Debug Script for Insurance Lead Gen Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed."
    exit 1
fi

# Parse arguments
ENVIRONMENT=""
POD_NAME=""
NAMESPACE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --pod|-p)
            POD_NAME="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --env <env> [--pod <pod-name>]"
            echo ""
            echo "Arguments:"
            echo "  --env, -e             Environment (dev, staging, prod)"
            echo "  --pod, -p             Specific pod to debug (optional)"
            echo "  --help, -h            Show this help message"
            echo ""
            echo "Interactive Commands (after selecting pod):"
            echo "  1. View logs"
            echo "  2. Describe pod"
            echo "  3. Get shell access"
            echo "  4. View events"
            echo "  5. Port forward"
            echo "  6. Check resources"
            echo "  7. Exit"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [ -z "$ENVIRONMENT" ]; then
    print_error "Environment is required."
    exit 1
fi

NAMESPACE="insurance-lead-gen-${ENVIRONMENT}"

print_info "=========================================="
print_info "Kubernetes Debug Tool"
print_info "Environment: $ENVIRONMENT"
print_info "Namespace: $NAMESPACE"
print_info "=========================================="

# Function to list pods and select one
select_pod() {
    print_info "Fetching pods..."
    PODS=$(kubectl get pods -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.conditions[?(@.type=='Ready')].status --no-headers 2>/dev/null || true)
    
    if [ -z "$PODS" ]; then
        print_error "No pods found in namespace $NAMESPACE"
        exit 1
    fi
    
    echo ""
    echo "Available Pods:"
    echo "$PODS" | nl -w2 -s'. '
    
    if [ -n "$POD_NAME" ]; then
        SELECTED_POD=$POD_NAME
        print_info "Using specified pod: $SELECTED_POD"
    else
        echo ""
        read -p "Enter pod number (or 'q' to quit): " selection
        
        if [[ "$selection" == "q" ]]; then
            print_info "Exiting..."
            exit 0
        fi
        
        SELECTED_POD=$(echo "$PODS" | sed -n "${selection}p" | awk '{print $1}')
        
        if [ -z "$SELECTED_POD" ]; then
            print_error "Invalid selection"
            exit 1
        fi
    fi
}

# Function to show logs
show_logs() {
    print_info "Fetching logs for $SELECTED_POD..."
    echo ""
    
    # Ask for log options
    echo "Log Options:"
    echo "1. View recent logs"
    echo "2. View all logs"
    echo "3. Follow logs (tail -f)"
    echo "4. View previous container logs (if crashed)"
    echo ""
    read -p "Select option [1-4]: " log_option
    
    case $log_option in
        1)
            kubectl logs -n "$NAMESPACE" "$SELECTED_POD" --tail=100
            ;;
        2)
            kubectl logs -n "$NAMESPACE" "$SELECTED_POD"
            ;;
        3)
            kubectl logs -n "$NAMESPACE" "$SELECTED_POD" -f
            ;;
        4)
            kubectl logs -n "$NAMESPACE" "$SELECTED_POD" --previous
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# Function to describe pod
describe_pod() {
    print_info "Describing pod $SELECTED_POD..."
    echo ""
    kubectl describe pod -n "$NAMESPACE" "$SELECTED_POD"
}

# Function to get shell access
get_shell() {
    print_info "Getting shell access to $SELECTED_POD..."
    echo ""
    
    # Check if pod has multiple containers
    CONTAINERS=$(kubectl get pod -n "$NAMESPACE" "$SELECTED_POD" -o jsonpath='{.spec.containers[*].name}')
    CONTAINER_COUNT=$(echo $CONTAINERS | wc -w)
    
    if [ "$CONTAINER_COUNT" -gt 1 ]; then
        print_info "Multiple containers found:"
        echo "$CONTAINERS" | tr ' ' '\n' | nl -w2 -s'. '
        read -p "Select container number: " container_num
        CONTAINER_NAME=$(echo $CONTAINERS | tr ' ' '\n' | sed -n "${container_num}p")
    else
        CONTAINER_NAME=$CONTAINERS
    fi
    
    print_info "Opening shell in container: $CONTAINER_NAME"
    kubectl exec -n "$NAMESPACE" "$SELECTED_POD" -c "$CONTAINER_NAME" -it -- sh 2>/dev/null || \
    kubectl exec -n "$NAMESPACE" "$SELECTED_POD" -c "$CONTAINER_NAME" -it -- bash 2>/dev/null || \
    print_error "No shell available in this container"
}

# Function to view events
show_events() {
    print_info "Viewing events for namespace $NAMESPACE..."
    echo ""
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -50
}

# Function to port forward
port_forward() {
    print_info "Setting up port forward for $SELECTED_POD..."
    
    print_info "Available ports in pod:"
    kubectl get pod -n "$NAMESPACE" "$SELECTED_POD" -o jsonpath='{.spec.containers[*].ports[*].containerPort}' | tr ' ' '\n' | nl -w2 -s'. '
    
    echo ""
    read -p "Enter pod port: " pod_port
    read -p "Enter local port: " local_port
    
    print_info "Forwarding localhost:$local_port to $SELECTED_POD:$pod_port"
    print_info "Press Ctrl+C to stop"
    kubectl port-forward -n "$NAMESPACE" "$SELECTED_POD" "$local_port:$pod_port"
}

# Function to check resources
check_resources() {
    print_info "Checking resources for $SELECTED_POD..."
    echo ""
    
    print_info "Pod resource usage:"
    kubectl top pod -n "$NAMESPACE" "$SELECTED_POD" 2>/dev/null || print_warn "Metrics server not available"
    
    echo ""
    print_info "Resource requests and limits:"
    kubectl get pod -n "$NAMESPACE" "$SELECTED_POD" -o jsonpath='{range .spec.containers[*]}Container: {.name}
  CPU Request: {.resources.requests.cpu}
  CPU Limit: {.resources.limits.cpu}
  Memory Request: {.resources.requests.memory}
  Memory Limit: {.resources.limits.memory}
{end}'
}

# Main menu
main_menu() {
    select_pod
    
    while true; do
        echo ""
        print_info "=========================================="
        print_info "Debug Menu: $SELECTED_POD"
        print_info "=========================================="
        echo "1. View logs"
        echo "2. Describe pod"
        echo "3. Get shell access"
        echo "4. View events"
        echo "5. Port forward"
        echo "6. Check resources"
        echo "7. Change pod"
        echo "8. Exit"
        echo ""
        read -p "Select option [1-8]: " option
        
        case $option in
            1)
                show_logs
                ;;
            2)
                describe_pod
                ;;
            3)
                get_shell
                ;;
            4)
                show_events
                ;;
            5)
                port_forward
                ;;
            6)
                check_resources
                ;;
            7)
                select_pod
                ;;
            8)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Run main menu
main_menu
