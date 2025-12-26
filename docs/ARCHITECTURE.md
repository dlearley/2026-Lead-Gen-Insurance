# Architecture Overview

## System Design

The Insurance Lead Generation AI Platform is designed as a distributed microservices architecture, leveraging AI and real-time processing to transform raw lead data into qualified, routed opportunities for insurance agents.

## 🏗️ Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (NestJS)                      │
│                   RESTful Endpoints / Webhooks                   │
└─────────────────────────────────────────────────────────────────┘
                                 ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Message Bus (NATS)                            │
│              Event Streaming & Service Communication             │
└─────────────────────────────────────────────────────────────────┘
                                 ↕
┌──────────────────┬──────────────────┬───────────────────────────┐
│                  │                  │                           │
│  Data Service    │  Orchestrator    │   AI Processing Pipeline │
│  (Processing)    │  (Coordination)  │   (LangChain/OpenAI)     │
│                  │                  │                           │
└──────────────────┴──────────────────┴───────────────────────────┘
         |                  |                      |
         ↕                  ↕                      ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer (Polyglot)                         │
│                                                                  │
│  PostgreSQL (Relational)    Neo4j (Graph)    Redis (Cache)      │
│  - Lead metadata            - Relationships    - Session mgmt    │
│  - Transactions             - Network graph    - Rate limits    │
│  - Audit logs               - Agent matching   - Job queues     │
│                                                                  │
│  Qdrant (Vector DB)                                             │
│  - Semantic search                                               │
│  - Document embeddings                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Lead Ingestion Flow (Webhook → Processing)

```
1. External System → API Gateway (POST /api/v1/leads)
2. API Gateway publishes "lead.received" event to NATS
3. Data Service subscribes → Stores raw lead in PostgreSQL
4. Data Service publishes "lead.processed" event
5. Orchestrator triggers AI workflow:
   - Validates lead data
   - Enriches with external APIs
   - Generates embedding → stores in Qdrant
6. Orchestrator publishes "lead.qualified" event
7. AI Agent selects best insurance type and agent
8. Orchestrator publishes "lead.routed" event
9. Notification service alerts assigned agent
```

### AI Processing Pipeline

```
Raw Lead Data
    ↓
Preprocessing (LangChain)
    ↓
GPT-4 Analysis & Classification
    ├─ Lead Type Detection (auto, home, life, health)
    ├─ Quality Scoring (0-100)
    ├─ Intent Classification
    └─ Urgency Assessment
    ↓
Embedding Generation
    └─ Semantic representation → Qdrant
    ↓
Agent Matching Algorithm
    ├─ Neo4j graph traversal
    ├─ Agent specialization match
    ├─ Performance history
    ├─ Geographic proximity
    └─ Current workload
    ↓
Lead Routing Decision
    ↓
Agent Assignment & Notification
```

## 🏛️ Service Responsibilities

### API Service (Port 3000)

- **Technology**: NestJS, Express
- **Responsibilities**:
  - RESTful API endpoints
  - Webhook ingestion
  - Rate limiting & throttling
  - Input validation (Zod)
  - JWT authentication
  - API documentation
- **Endpoints**:
  - POST `/api/v1/leads` - Create lead
  - GET `/api/v1/leads/:id` - Get lead status
  - GET `/api/v1/agents/:id/leads` - Agent leads

### Data Service (Port 3001)

- **Technology**: Prisma ORM, PostgreSQL, Neo4j, Redis
- **Responsibilities**:
  - Lead CRUD operations
  - Event sourcing & replay
  - Data enrichment
  - Neo4j graph queries
  - Redis caching & job queues
- **Key Operations**:
  - Store/fetch leads from PostgreSQL
  - Graph queries for agent matching
  - Manage job queues with BullMQ
  - Cache frequently accessed data

### Orchestrator Service (Port 3002)

- **Technology**: LangChain, OpenAI, NATS
- **Responsibilities**:
  - AI workflow coordination
  - LLM prompt management
  - Lead scoring & qualification
  - Agent matching algorithm
  - Event workflow management
- **Core Workflows**:
  ```
  LeadReceived → Validate → Enrich → Score → Match → Route
  ```

## 🗄️ Data Storage Strategy

### PostgreSQL (Relational)

```sql
Tables:
- leads (id, source, data, status, created_at)
- agents (id, name, specializations, performance_score)
- lead_assignments (lead_id, agent_id, assigned_at)
- audit_logs (entity_type, entity_id, action, metadata)
```

### Neo4j (Graph)

```cypher
Nodes:
(:Lead {id, quality_score, location, type})
(:Agent {id, name, specialization, rating})
(:InsuranceProduct {type, carrier})

Relationships:
(:Lead)-[:QUALIFIED_FOR]->(:InsuranceProduct)
(:Agent)-[:SPECIALIZES_IN]->(:InsuranceProduct)
(:Lead)-[:ASSIGNED_TO]->(:Agent)
(:Agent)-[:WORKS_IN]->(:Location)
```

### Redis

- **Key Structure**:
  - `lead:{id}:processing_lock` - Processing locks
  - `agent:{id}:queue` - Agent work queues
  - `rate_limit:{ip}` - Rate limiting
  - `session:{token}` - User sessions

### Qdrant (Vector)

```json
Collections:
{
  "name": "lead_embeddings",
  "vector_size": 1536,
  "distance": "Cosine"
}
```

## 🎙️ Event-Driven Communication

### NATS Topics

```
lead.received     → New lead ingested
lead.processed    → Preprocessing complete
lead.qualified    → AI scoring complete
lead.routed       → Agent assigned
lead.converted    → Lead became customer
lead.rejected     → Lead disqualified
agent.assigned    → Agent got new lead
agent.accepted    → Agent accepted lead
agent.completed   → Agent closed lead
```

## 🔒 Security Architecture

### Authentication & Authorization

- JWT tokens with RS256
- Role-based access control (RBAC)
- API key authentication for webhooks
- Rate limiting by IP and API key
- Request signing for critical endpoints

### Data Protection

- Encryption at rest (PostgreSQL TDE, encrypted volumes)
- Encryption in transit (TLS 1.3)
- PII data masking in logs
- GDPR/CCPA compliance mechanisms

### API Security

- OWASP Top 10 protection
- SQL injection prevention (Prisma ORM)
- XSS protection (Helmet.js)
- CORS configured per domain
- DDoS protection (Cloudflare)

## 📊 Observability

### Logging (Winston + OpenTelemetry)

```
Structured JSON logs →
  ├─ Loki (for Grafana)
  ├─ CloudWatch Logs
  └─ Log aggregation pipeline
```

### Metrics (Prometheus)

- API response times
- AI processing latency
- Error rates per service
- Queue depths
- Lead conversion rates

### Tracing (Jaeger/OpenTelemetry)

- End-to-end request tracing
- DB query performance
- External API call timing
- AI model inference time

### Dashboards (Grafana)

- Real-time lead flow
- Agent performance metrics
- System health overview
- AI model accuracy tracking

## 🔄 Scaling Strategy

### Horizontal Scaling

- Each service scales independently
- Stateless API services
- Redis for session management
- Database read replicas

### Queue-Based Processing

```
Load Spike → NATS Queue → Multiple Workers
   ↓
Auto-scaling based on:
   - Queue depth
   - Processing latency
   - Error rates
```

### Caching Strategy

- Redis for session/state
- CDN for static assets
- Query result caching
- Event-driven cache invalidation

## 🎯 Performance Targets

| Metric            | Target  | Measurement     |
| ----------------- | ------- | --------------- |
| API Response Time | <200ms  | p95 latency     |
| Lead Processing   | 95% <5s | End-to-end      |
| AI Scoring        | <2s     | Model inference |
| Database Queries  | <100ms  | Query execution |
| System Uptime     | 99.9%   | Monthly average |

## 🔧 Development Considerations

### Local Development

- Docker Compose for all services
- Hot reloading enabled
- API mocking layers
- Test data generators

### Testing Strategy

- Unit tests: Jest (+85% coverage)
- Integration tests: Supertest
- E2E tests: Playwright/Cypress
- Load tests: k6
- AI model evaluation: custom test suite

### Deployment

- Container-based (Docker)
- Kubernetes orchestration
- Blue-green deployments
- Database migration strategy
