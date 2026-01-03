# ADR 003: Vector Search with Qdrant for Agent Matching

## Status
Accepted

## Context
Matching leads to agents requires more than just simple attribute filtering (e.g., "State = NY"). We need to match based on complex criteria like specialization, historical performance, and semantic relevance of agent bios to lead needs.

## Decision
We will use Qdrant as a vector database to store and search agent profiles.

## Implementation
- Agent profiles (specializations, bio, performance metrics) will be converted into vector embeddings using OpenAI's `text-embedding-3-small` model.
- These vectors will be stored in a Qdrant collection.
- When a new lead arrives, its requirements will also be embedded.
- Qdrant's similarity search will find the top-K matching agents based on cosine distance.

## Consequences
### Pros
- **Semantic Relevance**: Matches agents based on meaning, not just keywords.
- **Performance**: High-speed similarity search even with thousands of agents.
- **Flexibility**: Can easily add new factors to the agent profile without changing the search logic.

### Cons
- **Cost**: Requires an LLM (OpenAI) to generate embeddings.
- **Maintenance**: Need to manage an additional database (Qdrant) and keep vectors in sync with the primary database.
- **Complexity**: Debugging "why an agent matched" is less intuitive than simple SQL filters.
