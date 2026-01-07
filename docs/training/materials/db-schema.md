# Training: Database Schema Documentation

## Overview
The platform uses PostgreSQL as its primary relational database. The schema is managed via Prisma.

## Core Models

### 1. Lead
Stores all information related to a potential customer.
- `id`: UUID (Primary Key)
- `source`: Where the lead came from (e.g., "Facebook", "Google").
- `email`, `phone`, `firstName`, `lastName`: Personal contact details.
- `street`, `city`, `state`, `zipCode`, `country`: Address information.
- `insuranceType`: Enum (AUTO, HOME, LIFE, HEALTH, COMMERCIAL).
- `qualityScore`: Calculated score (0-100).
- `status`: Enum (RECEIVED, PROCESSING, QUALIFIED, ROUTED, CONVERTED, REJECTED).
- `metadata`: JSON field for additional provider-specific data.

### 2. Agent
Stores information about insurance agents who receive leads.
- `id`: UUID
- `email`, `phone`, `licenseNumber`: Unique identification and contact.
- `specializations`: String array of insurance types.
- `rating`: Average customer rating (0.0-5.0).
- `isActive`: Boolean flag for availability.
- `maxLeadCapacity`: Maximum leads the agent can handle simultaneously.
- `currentLeadCount`: Number of currently assigned leads.

### 3. LeadAssignment
Tracks the link between a lead and an agent.
- `id`: UUID
- `leadId`, `agentId`: Foreign keys.
- `assignedAt`: Timestamp.
- `status`: Enum (PENDING, ACCEPTED, REJECTED, TIMEOUT).

### 4. Event
Audit log and event sourcing for system actions.
- `id`: UUID
- `type`: Event name (e.g., "lead.created").
- `entityType`, `entityId`: Reference to the affected object.
- `data`: JSON payload of the event.

### 5. Carrier & CarrierPerformanceMetric
Manages insurance carriers and tracks their performance over time.

## Database Access Guidelines
- **Always use the Data Service**: Do not connect directly to the database from the API or Orchestrator services if possible.
- **Use Indexes**: Most common queries are indexed (see `schema.prisma`). If adding new query patterns, ensure proper indexes are added.
- **JSON Fields**: Use `metadata` or `data` fields for unstructured data, but prefer typed columns for data used in filters or joins.

## Common Queries
### Get all active agents in a state
```sql
SELECT * FROM "Agent" WHERE "isActive" = true AND "state" = 'NY';
```

### Calculate average lead quality per source
```sql
SELECT "source", AVG("qualityScore") FROM "Lead" GROUP BY "source";
```
