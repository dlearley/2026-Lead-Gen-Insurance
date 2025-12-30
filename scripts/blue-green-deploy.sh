#!/bin/bash

set -euo pipefail

# Blue-Green Deployment Script
# Usage: ./blue-green-deploy.sh --environment <env> --tag <tag> --namespace <namespace>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT=""
TAG=""
NAMESPACE=""
DEPLOYMENT_TIMEOUT="300s"
VERIFY_TIMEOUT="60s"
CURRENT_COLOR=""
NEW_COLOR=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            DEPLOYMENT_TIMEOUT="$2"
            shift 2
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$ENVIRONMENT" || -z "$TAG" || -z "$NAMESPACE" ]]; then
    echo "Usage: $0 --environment <env> --tag <tag> --namespace <namespace> [--timeout <timeout>]"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Determine current active color
determine_current_color() {
    log "Determining current active deployment color..."
    
    if kubectl get service api-service -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' >/dev/null 2>&1; then
        CURRENT_COLOR=$(kubectl get service api-service -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}')
        log "Current active color: $CURRENT_COLOR"
    else
        # Default to blue if no service exists
        CURRENT_COLOR="blue"
        log "No existing service found, defaulting to blue"
    fi
    
    # Determine new color
    if [[ "$CURRENT_COLOR" == "blue" ]]; then
        NEW_COLOR="green"
    else
        NEW_COLOR="blue"
    fi
    
    log "New deployment color: $NEW_COLOR"
}

# Deploy application to new color
deploy_new_color() {
    log "Deploying new version to $NEW_COLOR environment..."
    
    # Create deployment manifest for new color
    cat > /tmp/deployment-${NEW_COLOR}.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-${ENVIRONMENT}-${NEW_COLOR}
  namespace: ${NAMESPACE}
  labels:
    app: api
    environment: ${ENVIRONMENT}
    version: ${NEW_COLOR}
    tag: ${TAG}
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api
      environment: ${ENVIRONMENT}
      version: ${NEW_COLOR}
  template:
    metadata:
      labels:
        app: api
        environment: ${ENVIRONMENT}
        version: ${NEW_COLOR}
        tag: ${TAG}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: api-service-account
      terminationGracePeriodSeconds: 60
      containers:
      - name: api
        image: ${ECR_REGISTRY}/api:${TAG}
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "${ENVIRONMENT}"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secrets
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
        - name: VAULT_TOKEN
          valueFrom:
            secretKeyRef:
              name: vault-secrets
              key: token
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: app-cache
          mountPath: /app/.cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: app-cache
        emptyDir: {}
      restartPolicy: Always
      securityContext:
        fsGroup: 1000
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api
                - key: version
                  operator: In
                  values:
                  - ${NEW_COLOR}
              topologyKey: kubernetes.io/hostname
      tolerations:
      - key: "node-type"
        operator: "Equal"
        value: "general"
        effect: "NoSchedule"
---
apiVersion: v1
kind: Service
metadata:
  name: api-service-${NEW_COLOR}
  namespace: ${NAMESPACE}
  labels:
    app: api
    environment: ${ENVIRONMENT}
    version: ${NEW_COLOR}
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: api
    environment: ${ENVIRONMENT}
    version: ${NEW_COLOR}
EOF

    # Apply deployment
    kubectl apply -f /tmp/deployment-${NEW_COLOR}.yaml
    
    # Wait for deployment to be ready
    log "Waiting for deployment to be ready..."
    kubectl rollout status deployment/api-${ENVIRONMENT}-${NEW_COLOR} -n "$NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"
    
    # Wait for pods to be ready
    log "Waiting for pods to be ready..."
    kubectl wait pods -l app=api,environment=${ENVIRONMENT},version=${NEW_COLOR} -n "$NAMESPACE" --for=condition=Ready --timeout="$VERIFY_TIMEOUT"
    
    log "Deployment to $NEW_COLOR completed successfully"
}

# Run smoke tests against new deployment
run_smoke_tests() {
    log "Running smoke tests against $NEW_COLOR deployment..."
    
    # Get the service endpoint
    SERVICE_IP=$(kubectl get service api-service-${NEW_COLOR} -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    
    # Forward port for testing
    kubectl port-forward service/api-service-${NEW_COLOR} 8080:80 -n "$NAMESPACE" &
    PF_PID=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    # Run health check
    if curl -f -s http://localhost:8080/health; then
        log "Health check passed"
    else
        error "Health check failed"
        kill $PF_PID 2>/dev/null || true
        return 1
    fi
    
    # Run basic API test
    if curl -f -s http://localhost:8080/api/v1/health; then
        log "API test passed"
    else
        error "API test failed"
        kill $PF_PID 2>/dev/null || true
        return 1
    fi
    
    # Cleanup port forward
    kill $PF_PID 2>/dev/null || true
    
    log "All smoke tests passed"
}

# Switch traffic to new deployment
switch_traffic() {
    log "Switching traffic to $NEW_COLOR deployment..."
    
    # Update main service selector
    kubectl patch service api-service -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"${NEW_COLOR}\"}}}"
    
    # Update ingress if it exists
    if kubectl get ingress api-ingress -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl annotate ingress api-ingress -n "$NAMESPACE" --overwrite \
            nginx.ingress.kubernetes.io/canary="false" \
            nginx.ingress.kubernetes.io/canary-weight="0"
    fi
    
    log "Traffic switched to $NEW_COLOR successfully"
}

# Scale down old deployment
scale_down_old() {
    log "Scaling down old $CURRENT_COLOR deployment..."
    
    # Scale down to 1 replica for quick rollback capability
    kubectl scale deployment/api-${ENVIRONMENT}-${CURRENT_COLOR} -n "$NAMESPACE" --replicas=1
    
    log "Old deployment scaled down to 1 replica for quick rollback"
}

# Main deployment flow
main() {
    log "Starting blue-green deployment for $ENVIRONMENT environment"
    log "New version: $TAG"
    
    determine_current_color
    deploy_new_color
    
    if run_smoke_tests; then
        switch_traffic
        scale_down_old
        log "Blue-green deployment completed successfully"
    else
        error "Smoke tests failed. New deployment will not receive traffic."
        exit 1
    fi
}

# Trap cleanup on script exit
cleanup() {
    log "Cleaning up temporary files..."
    rm -f /tmp/deployment-*.yaml
}

trap cleanup EXIT

# Run main function
main "$@"