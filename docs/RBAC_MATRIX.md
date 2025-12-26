# RBAC Permission Matrix

| Role | Permissions | Description |
| --- | --- | --- |
| Admin | all | Full access to all resources and system settings |
| Manager | organization:read, organization:write, team:read, team:write, lead:read, lead:write, user:read | Manage organization, teams, leads, and view users |
| Agent | team:read, lead:read, lead:write | View team and manage leads |
| Viewer | team:read, lead:read | View-only access to team and leads |

## Roles and Responsibilities

### Admin
- Manage all organizations
- Manage all users
- Assign roles to users
- Full access to system logs

### Manager
- Manage their own organization
- Create and manage teams within their organization
- Assign users to teams
- Manage leads within their organization

### Agent
- View their team members
- Create and update leads
- Assigned leads management

### Viewer
- View leads and teams they are assigned to
- Cannot make changes
