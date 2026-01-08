# Territory Management System - Implementation Details

The Territory Management system enables the definition and assignment of geographic and custom territories to insurance agents, facilitating optimized lead routing based on location and specialization.

## Features Implemented

1. **Territory Definition**
   - Support for multiple territory types: `GEOGRAPHIC`, `ZIP_CODE`, `STATE`, `COUNTY`, `REGION`, and `CUSTOM`.
   - Hierarchical territory support (parent/child relationships).
   - Flexible criteria using JSON for defining territory boundaries (states, zip codes, etc.).

2. **Agent Assignments**
   - Assign multiple agents to territories.
   - Support for assignment roles: `PRIMARY`, `SECONDARY`, and `BACKUP`.
   - Priority-based assignment within a territory.
   - Effective date range support for temporary assignments.

3. **Lead Matching & Routing**
   - Automated matching of leads to territories based on state and zip code.
   - Specificity-based selection (e.g., ZIP code match takes priority over state match).
   - Agent retrieval for a lead based on territory assignments.

4. **Analytics & Performance Tracking**
   - Territory-level performance metrics including conversion rates, lead volume, and active agent counts.
   - Period-based performance reporting.

## Technical Architecture

### Data Models (Prisma)

- `Territory`: Stores territory metadata, type, status, and boundary criteria.
- `TerritoryAssignment`: Connects agents to territories with role and priority.
- Enums: `TerritoryType`, `TerritoryStatus`, `AssignmentRole`.

### Services & Repositories

- `TerritoryRepository`: Low-level data access for territories and assignments.
- `TerritoryService`: Business logic for territory management, validation, matching, and analytics.

### API Endpoints

All endpoints are available under `/api/v1/territories`:

- `POST /`: Create a new territory
- `GET /`: List territories with filters
- `GET /:id`: Get territory details
- `PATCH /:id`: Update territory
- `DELETE /:id`: Delete territory
- `POST /assignments`: Assign agent to territory
- `PATCH /assignments/:id`: Update assignment
- `DELETE /assignments/:id`: Remove assignment
- `GET /:id/performance`: Get territory analytics
- `POST /match-lead`: Find best territory for a lead
- `POST /agents-for-lead`: Get prioritized agents for a lead

## Future Enhancements

- **Spatial Queries**: Integration with PostGIS for complex polygon-based territories.
- **Auto-Optimization**: AI-driven territory boundary adjustments based on lead density and agent performance.
- **Overlap Prevention**: More advanced validation for overlapping territories.
- **Heatmaps**: Visual representation of territory performance and lead density.
