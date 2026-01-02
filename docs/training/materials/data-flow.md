# Training: Data Flow Documentation

## 1. Lead Lifecycle Flow
This is the most critical path in the system.

1. **Submission**: A lead is submitted via `POST /api/v1/leads`.
2. **Event**: API service stores the lead and publishes `lead.created` to NATS.
3. **Enrichment**: Orchestrator worker picks up `lead.created`, calls AI services (OpenAI) to enrich data, and updates the lead record.
4. **Qualification**: Orchestrator scores the lead based on enrichment results.
5. **Processing Complete**: Orchestrator publishes `lead.processed`.
6. **Matching**: Orchestrator subscribes to `lead.processed`, embeds the lead requirements, and queries Qdrant for matching agents.
7. **Assignment**: The best agent is selected and an assignment record is created. `lead.assigned` is published.
8. **Notification**: Notification service (part of API or separate) sends an email/push to the assigned agent.

## 2. Agent Update Flow
1. **Update**: Agent profile is updated via `PUT /api/v1/agents/{id}`.
2. **Persistence**: Data service updates PostgreSQL.
3. **Vector Update**: An event `agent.updated` triggers the orchestrator to re-calculate the agent's vector embedding and update Qdrant.

## 3. Analytics Flow
1. **Events**: Services publish various events (`lead.created`, `assignment.completed`, etc.).
2. **Aggregation**: Analytics service (or BI worker) consumes these events and updates materialized views in PostgreSQL or an external OLAP store.
3. **Visualization**: Frontend requests analytics data via `GET /api/v1/analytics`.

## Data Consistency Model
- **Primary Source of Truth**: PostgreSQL.
- **Derived Data**: Redis (Cache), Qdrant (Vectors).
- **Consistency**: Eventual consistency via NATS events. If Qdrant is temporarily out of sync, the system will still function but matching might be slightly less accurate until the `agent.updated` event is processed.
