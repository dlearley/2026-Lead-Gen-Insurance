#!/bin/bash

# Main deployment script for CI/CD pipeline
# Usage: ./deploy.sh <environment> [deployment_strategy]
# Environment: dev, staging, prod
# Deployment strategy: rolling, blue-green, canary

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Validate environment
validate_environment() {
    local env=$1
    case $env in
        dev|staging|prod)
            return 0
            ;;
        *)
            log_error "Invalid environment: $env. Must be dev, staging, or prod"
            exit 1
            ;;
    esac
}

# Validate deployment strategy
validate_deployment_strategy() {
    local strategy=${1:-rolling}
    case $strategy in
        rolling|blue-green|canary)
            return 0
            ;;
        *)
            log_error "Invalid deployment strategy: $strategy. Must be rolling, blue-green, or canary"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        exit 1
    fi
    
    # Check if aws cli is installed
    if ! command -v aws &> /dev/null; then
        log_error "aws CLI is not installed"
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Load environment configuration
load_environment_config() {
    local env=$1
    local config_file="deploy/$env/config.yaml"
    
    if [[ ! -f "$config_file" ]]; then
        log_warning "Configuration file $config_file not found, using defaults"
        return 0
    fi
    
    log_info "Loading environment configuration from $config_file"
    
    # Load configuration using jq (convert YAML to JSON first)
    export NAMESPACE=$(jq -r '.namespace // "default"' <(yq eval -o=json "$config_file" 2>/dev/null || echo '{"namespace":"default"}'))
    export REPLICAS=$(jq -r '.replicas // 1' <(yq eval -o=json "$config_file" 2>/dev/null || echo '{"replicas":1}'))
    export RESOURCE_LIMITS=$(jq -r '.resource_limits // "{}"' <(yq eval -o=json "$config_file" 2>/dev/null || echo '{}'))
    export HEALTH_CHECKS=$(jq -r '.health_checks // "{}"' <(yq eval -o=json "$config_file" 2>/dev/null || echo '{}'))
    
    log_info "Loaded configuration for $env environment"
    log_info "Namespace: $NAMESPACE"
    log_info "Replicas: $REPLICAS"
}

# Validate environment variables
validate_environment_vars() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "IMAGE_TAG"
        "AWS_REGION"
        "ECR_REPOSITORY"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_success "All required environment variables are set"
}

# Check cluster connectivity
check_cluster_connectivity() {
    log_info "Checking cluster connectivity..."
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Creating namespace $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    fi
    
    log_success "Cluster connectivity verified"
}

# Deploy using rolling update strategy
deploy_rolling() {
    log_info "Starting rolling deployment..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    
    # Deploy each service
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    
    for service in "${services[@]}"; do
        log_info "Deploying $service..."
        
        # Create deployment manifest
        create_deployment_manifest "$service" "$NAMESPACE" "$IMAGE_TAG" "$REPLICAS"
        
        # Apply deployment
        kubectl apply -f "deploy/temp/${service}-deployment-${timestamp}.yaml" -n "$NAMESPACE"
        
        # Wait for rollout
        kubectl rollout status "deployment/$service" -n "$NAMESPACE" --timeout=600s
        
        log_success "$service deployed successfully"
    done
    
    # Clean up temporary files
    rm -rf deploy/temp/
}

# Deploy using blue-green strategy
deploy_blue_green() {
    log_info "Starting blue-green deployment..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local new_env="green"
    local old_env="blue"
    
    # Determine current environment
    local current_env=$(kubectl get service api -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")
    
    if [[ "$current_env" == "blue" ]]; then
        new_env="green"
        old_env="blue"
    else
        new_env="blue"
        old_env="green"
    fi
    
    log_info "Deploying to $new_env environment, will switch from $old_env"
    
    # Deploy to new environment
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    
    for service in "${services[@]}"; do
        log_info "Deploying $service to $new_env..."
        
        # Create blue-green deployment manifest
        create_blue_green_deployment_manifest "$service" "$NAMESPACE" "$IMAGE_TAG" "$new_env" "$REPLICAS"
        
        # Apply deployment
        kubectl apply -f "deploy/temp/${service}-${new_env}-deployment-${timestamp}.yaml" -n "$NAMESPACE"
        
        # Wait for rollout
        kubectl rollout status "deployment/${service}-${new_env}" -n "$NAMESPACE" --timeout=600s
        
        log_success "$service deployed to $new_env successfully"
    done
    
    # Update services to point to new environment
    for service in "${services[@]}"; do
        kubectl patch service "$service" -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"'$new_env'"}}}'
    done
    
    log_success "Traffic switched to $new_env environment"
    
    # Keep old environment as backup for 24 hours
    log_info "Keeping $old_env environment as backup for 24 hours"
    
    # Clean up temporary files
    rm -rf deploy/temp/
}

# Deploy using canary strategy
deploy_canary() {
    log_info "Starting canary deployment..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local canary_percentage=${CANARY_PERCENTAGE:-10}
    
    log_info "Deploying canary with $canary_percentage% traffic allocation"
    
    # Create canary deployment
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    
    for service in "${services[@]}"; do
        log_info "Deploying canary for $service..."
        
        # Create canary deployment manifest
        create_canary_deployment_manifest "$service" "$NAMESPACE" "$IMAGE_TAG" "$canary_percentage" "$REPLICAS"
        
        # Apply canary deployment
        kubectl apply -f "deploy/temp/${service}-canary-deployment-${timestamp}.yaml" -n "$NAMESPACE"
        
        # Wait for rollout
        kubectl rollout status "deployment/${service}-canary" -n "$NAMESPACE" --timeout=600s
        
        log_success "Canary deployment for $service completed"
    done
    
    log_success "Canary deployment completed with $canary_percentage% traffic"
    
    # Clean up temporary files
    rm -rf deploy/temp/
}

# Create deployment manifest
create_deployment_manifest() {
    local service=$1
    local namespace=$2
    local image_tag=$3
    local replicas=$4
    
    mkdir -p deploy/temp
    
    cat > "deploy/temp/${service}-deployment-${timestamp}.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $service
  namespace: $namespace
  labels:
    app: $service
    version: $image_tag
spec:
  replicas: $replicas
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: $service
  template:
    metadata:
      labels:
        app: $service
        version: $image_tag
    spec:
      containers:
      - name: $service
        image: ${AWS_REGION}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}/${service}:${image_tag}
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: $namespace
        - name: IMAGE_TAG
          value: $image_tag
        - name: DEPLOYMENT_TIMESTAMP
          value: $timestamp
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: $service
  namespace: $namespace
  labels:
    app: $service
spec:
  selector:
    app: $service
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP
EOF
}

# Create blue-green deployment manifest
create_blue_green_deployment_manifest() {
    local service=$1
    local namespace=$2
    local image_tag=$3
    local version=$4
    local replicas=$5
    
    mkdir -p deploy/temp
    
    cat > "deploy/temp/${service}-${version}-deployment-${timestamp}.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service}-${version}
  namespace: $namespace
  labels:
    app: $service
    version: $version
spec:
  replicas: $replicas
  selector:
    matchLabels:
      app: $service
      version: $version
  template:
    metadata:
      labels:
        app: $service
        version: $version
    spec:
      containers:
      - name: $service
        image: ${AWS_REGION}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}/${service}:${image_tag}
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: $namespace
        - name: VERSION
          value: $version
        - name: IMAGE_TAG
          value: $image_tag
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
EOF
}

# Create canary deployment manifest
create_canary_deployment_manifest() {
    local service=$1
    local namespace=$2
    local image_tag=$3
    local canary_percentage=$4
    local replicas=$5
    
    mkdir -p deploy/temp
    
    cat > "deploy/temp/${service}-canary-deployment-${timestamp}.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service}-canary
  namespace: $namespace
  labels:
    app: $service
    deployment: canary
spec:
  replicas: $replicas
  selector:
    matchLabels:
      app: $service
      deployment: canary
  template:
    metadata:
      labels:
        app: $service
        deployment: canary
    spec:
      containers:
      - name: $service
        image: ${AWS_REGION}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}/${service}:${image_tag}
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: $namespace
        - name: DEPLOYMENT_TYPE
          value: canary
        - name: CANARY_PERCENTAGE
          value: $canary_percentage
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ${service}-canary
  namespace: $namespace
spec:
  http:
  - route:
    - destination:
        host: ${service}
        subset: stable
      weight: $((100 - canary_percentage))
    - destination:
        host: ${service}
        subset: canary
      weight: $canary_percentage
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ${service}
  namespace: $namespace
spec:
  host: ${service}
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
  subsets:
  - name: stable
    labels:
      deployment: stable
  - name: canary
    labels:
      deployment: canary
EOF
}

# Wait for deployment to be ready
wait_for_deployment() {
    local service=$1
    local namespace=$2
    
    log_info "Waiting for $service deployment to be ready..."
    
    if kubectl rollout status "deployment/$service" -n "$namespace" --timeout=600s; then
        log_success "$service deployment is ready"
    else
        log_error "$service deployment failed"
        kubectl describe "deployment/$service" -n "$namespace"
        exit 1
    fi
}

# Post-deployment cleanup
cleanup() {
    log_info "Performing post-deployment cleanup..."
    
    # Remove old unused resources
    kubectl delete pods -n "$NAMESPACE" --field-selector status.phase=Succeeded --ignore-not-found=true
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    local environment=${1:-dev}
    local deployment_strategy=${2:-rolling}
    
    log_info "Starting deployment to $environment environment with $deployment_strategy strategy"
    log_info "Image tag: ${IMAGE_TAG:-latest}"
    log_info "Timestamp: $(date)"
    
    # Validate inputs
    validate_environment "$environment"
    validate_deployment_strategy "$deployment_strategy"
    
    # Check prerequisites and load configuration
    check_prerequisites
    load_environment_config "$environment"
    validate_environment_vars
    check_cluster_connectivity
    
    # Execute deployment strategy
    case $deployment_strategy in
        rolling)
            deploy_rolling
            ;;
        blue-green)
            deploy_blue_green
            ;;
        canary)
            deploy_canary
            ;;
    esac
    
    # Post-deployment cleanup
    cleanup
    
    log_success "Deployment to $environment completed successfully!"
    log_info "Deployment details:"
    log_info "  Environment: $environment"
    log_info "  Strategy: $deployment_strategy"
    log_info "  Image tag: ${IMAGE_TAG:-latest}"
    log_info "  Timestamp: $(date)"
}

# Handle script arguments
if [[ $# -lt 1 ]]; then
    log_error "Usage: $0 <environment> [deployment_strategy]"
    log_error "Environment: dev, staging, prod"
    log_error "Deployment strategy: rolling, blue-green, canary"
    exit 1
fi

# Run main function
main "$@"