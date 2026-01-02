# Runbook: Vector Search Operations (Qdrant)

## Overview
This runbook covers the operation and maintenance of Qdrant, the vector database used for semantic search and agent matching.

## Architecture
- **Service**: Qdrant
- **Collection Name**: `agents`
- **Vector Dimension**: 1536 (OpenAI `text-embedding-3-small` default)
- **Usage**: Storing agent profiles as vectors to allow semantic matching against lead requirements.

## Monitoring

### Key Metrics
- `qdrant_collections_total`: Number of collections.
- `qdrant_vectors_total`: Total number of vectors stored.
- `qdrant_search_latency_ms`: Time taken for vector search queries.
- `qdrant_disk_usage_bytes`: Storage used by Qdrant.

### Health Checks
- API endpoint: `GET http://qdrant:6333/healthz`
- Dashboard: Qdrant Web UI (port 6333)

## Troubleshooting

### Issue: Search results are irrelevant or inaccurate
- **Cause**: Vectors might be outdated or embeddings model has changed.
- **Action**:
  1. Verify the embeddings model used for query and storage matches.
  2. Re-index the collection (see below).

### Issue: Qdrant service is unresponsive
- **Check**:
  1. Pod status: `kubectl get pods -l app=qdrant`.
  2. Memory usage: Qdrant is memory-intensive for large collections.
  3. Disk space: Qdrant requires sufficient disk for WAL and snapshots.

## Administrative Tasks

### Creating/Re-creating a Collection
If the schema changes or data is corrupted:
```bash
# Delete collection
curl -X DELETE http://qdrant:6333/collections/agents

# Create collection
curl -X PUT http://qdrant:6333/collections/agents \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

### Manual Re-indexing
To trigger a full re-indexing of agents from the primary database:
1. Run the maintenance script:
   ```bash
   kubectl exec -it -n production deployment/orchestrator -- npm run scripts:reindex-agents
   ```

### Creating a Snapshot (Backup)
```bash
curl -X POST http://qdrant:6333/collections/agents/snapshots
```
Snapshots are stored in the Qdrant data directory and should be offloaded to persistent storage (S3/MinIO).

### Restoring from Snapshot
1. Upload the snapshot file to the Qdrant pod.
2. Use the REST API:
   ```bash
   curl -X POST http://qdrant:6333/collections/agents/snapshots/recover \
     -H 'Content-Type: application/json' \
     -d '{"location": "file:///path/to/snapshot.qdrant"}'
   ```
