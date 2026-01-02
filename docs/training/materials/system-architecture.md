# Training: System Architecture Overview

## Introduction
The Insurance Lead Gen Platform is a cloud-native, microservices-based system designed for high-throughput lead processing and intelligent agent matching.

## High-Level Architecture
The system is composed of several layers:

### 1. Ingress Layer
- **Nginx Ingress Controller**: Handles incoming HTTP traffic, SSL termination, and routing to services.
- **API Gateway**: (Part of the API Service) Validates requests, handles authentication (JWT/RBAC), and routes requests to internal services or NATS.

### 2. Service Layer
- **API Service (Node.js/Express)**: Primary interface for clients. Handles CRUD operations for leads, agents, and users.
- **Orchestrator (Node.js/TypeScript)**: The "brain" of the system. Manages background workflows, AI processing, and lead routing logic.
- **Data Service (Node.js/TypeScript)**: abstracts database operations and ensures consistent data access across the platform.

### 3. Messaging Layer
- **NATS JetStream**: Provides a resilient backbone for inter-service communication and event-driven workflows.

### 4. Persistence Layer
- **PostgreSQL**: Primary relational database for structured data (leads, agents, assignments).
- **Redis**: High-speed cache and backend for BullMQ job queues.
- **Qdrant**: Vector database for semantic search and AI matching.
- **MinIO**: Object storage for documents and assets.

## Deployment Model
- **Platform**: Kubernetes (EKS/GKE or local via Docker Compose).
- **Configuration**: Managed via Helm charts.
- **CI/CD**: GitHub Actions for building, testing, and deploying.

## Interaction Diagram (Simplified)
```text
[Client] -> [API Service] -> [NATS] -> [Orchestrator]
                                         |
                                         +-> [OpenAI API]
                                         +-> [Qdrant]
                                         +-> [Data Service] -> [PostgreSQL]
```
