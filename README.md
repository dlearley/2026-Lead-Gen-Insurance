# 2026 Lead Generation Insurance Platform - Lead Management System

A comprehensive lead management system built with FastAPI (backend) and React + TypeScript (frontend).

## Features

### Backend (FastAPI + SQLAlchemy)
- **Lead CRUD Operations**: Create, read, update, and delete leads
- **Advanced Filtering**: Filter leads by status, priority, source, campaign, assignee, and date range
- **Pagination**: Built-in pagination with configurable page sizes
- **Bulk Operations**: Bulk update, assign, status change, and delete
- **Search**: Full-text search across lead names, emails, phones, and companies
- **Export**: Export leads to CSV or JSON format
- **Activity Logging**: Complete audit trail of all lead activities
- **Lead Sources**: Track and manage lead sources
- **Campaigns**: Create and track marketing campaigns
- **Status History**: Track all status changes with reasons
- **Assignment History**: Track lead assignments

### Frontend (React + TypeScript)
- **Leads Dashboard**: View and manage all leads in a responsive table
- **Advanced Filtering**: Filter leads by multiple criteria
- **Search**: Real-time search functionality
- **Create/Edit Leads**: Form with validation for creating and editing leads
- **Lead Details View**: Comprehensive lead information with activity timeline
- **Bulk Operations**: Select multiple leads for bulk actions
- **Export**: Export filtered leads to CSV
- **Pagination**: Navigate through large lead lists
- **State Management**: Zustand for efficient state management

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: SQLite (with async SQLAlchemy)
- **Validation**: Pydantic v2
- **API Documentation**: OpenAPI/Swagger

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **State Management**: Zustand
- **Build Tool**: Vite
- **Styling**: CSS with CSS Variables

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection and session management
│   ├── models/
│   │   ├── __init__.py
│   │   └── lead.py          # SQLAlchemy models (Lead, Campaign, etc.)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── lead.py          # Pydantic schemas for leads
│   │   └── user.py          # Pydantic schemas for users, sources, campaigns
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── leads.py         # Lead API endpoints
│   │   ├── lead_sources.py  # Lead source API endpoints
│   │   └── campaigns.py     # Campaign API endpoints
│   └── services/
│       ├── __init__.py
│       ├── lead_service.py  # Lead business logic
│       ├── source_service.py# Lead source business logic
│       └── campaign_service.py # Campaign business logic
├── migrations/
│   └── run_migrations.py    # Database migration script
├── tests/
│   ├── conftest.py
│   └── test_leads.py        # API endpoint tests
├── requirements.txt
└── pytest.ini

frontend/
├── src/
│   ├── main.tsx             # Application entry point
│   ├── types/
│   │   ├── index.ts
│   │   ├── lead.ts          # Lead-related TypeScript types
│   │   └── user.ts          # User, Source, Campaign types
│   ├── services/
│   │   ├── leadApi.ts       # Lead API service
│   │   ├── leadSourceApi.ts # Lead source API service
│   │   └── campaignApi.ts   # Campaign API service
│   ├── store/
│   │   ├── index.ts
│   │   └── leadStore.ts     # Zustand lead state store
│   ├── hooks/
│   │   ├── index.ts
│   │   └── useLeads.ts      # Custom hook for lead operations
│   ├── components/
│   │   ├── index.ts
│   │   ├── LeadForm.tsx/.css
│   │   ├── LeadsTable.tsx/.css
│   │   ├── LeadFilters.tsx/.css
│   │   ├── Pagination.tsx/.css
│   │   ├── LeadDetail.tsx/.css
│   │   └── StatusBadge.tsx/.css
│   ├── pages/
│   │   ├── index.ts
│   │   └── LeadsPage.tsx/.css
│   └── styles/
│       └── global.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## API Endpoints

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/leads` | Create a new lead |
| GET | `/api/v1/leads` | Get leads with filtering and pagination |
| GET | `/api/v1/leads/{id}` | Get a single lead by ID |
| PUT | `/api/v1/leads/{id}` | Update a lead |
| DELETE | `/api/v1/leads/{id}` | Delete a lead |
| PUT | `/api/v1/leads/{id}/assign` | Assign a lead to an agent |
| PUT | `/api/v1/leads/{id}/status` | Update lead status |
| GET | `/api/v1/leads/search` | Search leads |
| POST | `/api/v1/leads/bulk/update` | Bulk update leads |
| POST | `/api/v1/leads/bulk/assign` | Bulk assign leads |
| POST | `/api/v1/leads/bulk/status` | Bulk update status |
| POST | `/api/v1/leads/bulk/delete` | Bulk delete leads |
| POST | `/api/v1/leads/export` | Export leads (CSV/JSON) |
| GET | `/api/v1/leads/stats` | Get lead statistics |

### Lead Sources
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/lead-sources` | Create a lead source |
| GET | `/api/v1/lead-sources` | Get all lead sources |
| GET | `/api/v1/lead-sources/{id}` | Get a lead source by ID |
| PUT | `/api/v1/lead-sources/{id}` | Update a lead source |
| DELETE | `/api/v1/lead-sources/{id}` | Delete a lead source |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/campaigns` | Create a campaign |
| GET | `/api/v1/campaigns` | Get all campaigns |
| GET | `/api/v1/campaigns/{id}` | Get a campaign by ID |
| PUT | `/api/v1/campaigns/{id}` | Update a campaign |
| DELETE | `/api/v1/campaigns/{id}` | Delete a campaign |
| GET | `/api/v1/campaigns/{id}/performance` | Get campaign performance |

## Getting Started

### Backend Setup

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
uvicorn app.main:app --reload
```

4. API documentation available at:
   - Swagger UI: http://localhost:8000/api/docs
   - ReDoc: http://localhost:8000/api/redoc

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Access the application at http://localhost:3000

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

## Lead Status Workflow

```
new → contacted → qualified → converted
                     ↓
              unqualified → lost
```

## License

MIT License
