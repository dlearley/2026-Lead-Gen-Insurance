# Runbook: Lead Ingestion and Routing Workflow

## Overview
This runbook describes the lifecycle of a lead from ingestion to agent assignment, including monitoring procedures and troubleshooting steps for failures.

## Workflow Description
1. **Ingestion**: Leads are received via the API service (`apps/api`).
2. **Persistence**: Leads are stored in the database (managed via `apps/data-service`).
3. **Processing**: An event `lead.created` is emitted, which triggers initial processing (enrichment, scoring).
4. **Routing**: Once processed, a `lead.processed` event is emitted. The `orchestrator` service subscribes to this event.
5. **Agent Matching**: The `orchestrator` requests matching agents for the lead's criteria (insurance type, location).
6. **Ranking**: Agents are ranked based on performance, workload, and specialization.
7. **Assignment**: The lead is assigned to the top-ranked agent.

## Monitoring
- **Grafana Dashboard**: `Lead Ingestion & Routing` (ID: `lead-flow-metrics`)
- **Key Metrics**:
  - `lead_ingestion_rate`: Number of leads received per second.
  - `lead_processing_latency`: Time from ingestion to assignment.
  - `routing_failure_rate`: Percentage of leads that failed to route.
- **Alerts**:
  - `HighLeadRoutingFailure`: Alert triggers if >5% of leads fail routing in 5 minutes.
  - `LeadIngestionDrop`: Alert triggers if lead volume drops significantly below expected baseline.

## Troubleshooting

### Issue: Leads are stuck in 'received' status
- **Symptom**: Leads are created but not progressing to 'processed' or 'routed'.
- **Check**:
  1. Verify the `data-service` is running and healthy.
  2. Check NATS connectivity for both `api` and `orchestrator`.
  3. Inspect `orchestrator` logs for errors:
     ```bash
     kubectl logs -l app=orchestrator -n production
     ```
  4. Check if enrichment or scoring services are failing.

### Issue: No agents found for lead
- **Symptom**: Orchestrator logs show `No agents found for lead`.
- **Check**:
  1. Verify agents exist in the database with matching specializations.
  2. Check if agents are marked as 'active' and have capacity.
  3. Validate the matching criteria in `apps/orchestrator/src/services/lead-routing-workflow.ts`.

### Issue: High routing latency
- **Symptom**: Leads take several minutes to be assigned.
- **Check**:
  1. Monitor NATS message queue depth.
  2. Check `orchestrator` resource usage (CPU/Memory).
  3. Look for slow database queries in `data-service`.

## Manual Recovery
If the automated workflow fails, leads can be manually routed via the API:
```bash
curl -X POST https://api.insurance-lead-gen.com/api/v1/leads/{leadId}/route \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "{agentId}"}'
```
