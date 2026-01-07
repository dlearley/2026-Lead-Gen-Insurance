# ADR 002: Event-Driven Architecture using NATS JetStream

## Status
Accepted

## Context
Inter-service communication in a microservices architecture can be synchronous (REST/gRPC) or asynchronous (Events). Synchronous communication can lead to tight coupling and cascading failures. We need a reliable way to decouple services and handle long-running workflows like lead enrichment.

## Decision
We will use an Event-Driven Architecture (EDA) for core business processes, with NATS JetStream as the message broker.

## Implementation
- **NATS JetStream** will be used for persistent, repliable message streams.
- Services will publish events (e.g., `lead.created`, `lead.processed`).
- Consumer services will subscribe to these events to trigger their own logic.
- Request-Response pattern over NATS will be used for internal service calls where a response is immediately needed but decoupling is still desired.

## Consequences
### Pros
- **Decoupling**: Services don't need to know about each other; they only care about events.
- **Reliability**: NATS JetStream provides message persistence and retries.
- **Scalability**: Multiple consumers can handle events in parallel.
- **Extensibility**: New features can be added by subscribing to existing events without modifying the producer.

### Cons
- **Debugging Complexity**: Distributed tracing becomes essential to follow a single request across multiple asynchronous events.
- **Ordering**: Ensuring message order across distributed consumers can be challenging.
- **Infrastructure Dependency**: NATS becomes a critical component of the system.
