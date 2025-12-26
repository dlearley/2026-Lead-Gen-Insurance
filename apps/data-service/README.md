# Data Service

The Data Service is responsible for managing all database operations, including PostgreSQL, Neo4j, Redis, and Qdrant integrations.

## 📦 Features

- **PostgreSQL Database**: Relational data storage with Prisma ORM
- **Complete Data Models**: Leads, Agents, Assignments, and Lead Events
- **Repository Pattern**: Clean separation of data access logic
- **Type-Safe Operations**: Full TypeScript support with Prisma Client
- **Event Sourcing**: Track all lead state changes
- **Performance Optimized**: Indexed queries and efficient data access

## 🗄️ Database Schema

### Models

#### Lead

- Personal information (name, email, phone, DOB)
- Insurance details (type, provider, policy expiry)
- Lead information (source, status, quality score, urgency)
- Location data (address, city, state, zip)
- AI processing data (score reason, similarity)
- Relationships to assignments and events

#### Agent

- Personal information (name, email, phone)
- Professional info (license, experience)
- Specializations (insurance types)
- Performance metrics (conversion rate, response time, score)
- Capacity management (current/max capacity)
- Location and service area

#### Assignment

- Lead-to-agent mapping
- Status tracking (pending, accepted, rejected, completed, converted)
- Priority and matching details
- Timeline (assigned, accepted, completed dates)
- Outcome tracking (converted, value, notes)

#### LeadEvent

- Event sourcing for all lead activities
- Flexible event data structure (JSON)
- Actor tracking (system, agent, API)
- Full audit trail

#### SystemConfig

- Application configuration storage
- Key-value pairs with JSON values

## 🚀 Quick Start

### Initial Setup

1. **Generate Prisma Client**:

   ```bash
   pnpm db:generate
   ```

2. **Create Database** (if needed):

   ```bash
   docker-compose up -d postgres
   ```

3. **Run Migrations**:

   ```bash
   pnpm db:push
   ```

4. **Seed Sample Data**:
   ```bash
   pnpm db:seed
   ```

### Database Scripts

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Create and apply migrations
pnpm db:migrate

# Deploy migrations to production
pnpm db:migrate:deploy

# Open Prisma Studio (GUI)
pnpm db:studio

# Seed database with sample data
pnpm db:seed
```

## 📚 Usage Examples

### Using Repositories

```typescript
import { leadRepository, agentRepository, assignmentRepository } from './repositories';

// Create a new lead
const lead = await leadRepository.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@email.com',
  phone: '+1-555-0100',
  insuranceType: InsuranceType.AUTO,
  source: LeadSource.WEB_FORM,
  urgency: Urgency.HIGH,
  city: 'Los Angeles',
  state: 'CA',
  zipCode: '90001',
});

// Find leads by filters
const highQualityLeads = await leadRepository.findMany(
  {
    minQualityScore: 80,
    status: [LeadStatus.NEW, LeadStatus.QUALIFIED],
  },
  0,
  10
);

// Get available agents by insurance type
const availableAgents = await agentRepository.getAvailableAgentsByInsuranceType(
  InsuranceType.AUTO,
  20
);

// Create assignment
const assignment = await assignmentRepository.create({
  leadId: lead.id,
  agentId: availableAgents[0].id,
  priority: 1,
  matchScore: 95.0,
  matchReason: 'Perfect match based on location and specialization',
});

// Accept assignment
await assignmentRepository.acceptAssignment(
  assignment.id,
  'Looking forward to helping this client!'
);

// Update lead quality score
await leadRepository.updateQualityScore(
  lead.id,
  85.5,
  'High engagement score and good demographics'
);
```

### Direct Prisma Usage

```typescript
import prisma from './db/prisma';

// Custom query
const leads = await prisma.lead.findMany({
  where: {
    status: 'NEW',
    qualityScore: { gte: 70 },
  },
  include: {
    assignments: {
      include: {
        agent: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});
```

## 🔍 Key Repository Methods

### LeadRepository

- `create(input)` - Create new lead
- `findById(id)` - Find lead by ID
- `findByEmail(email)` - Find lead by email
- `findMany(filters, skip, take)` - Find leads with filters
- `update(id, input)` - Update lead
- `updateStatus(id, status)` - Update lead status
- `updateQualityScore(id, score, reason)` - Update AI quality score
- `getHighQualityLeads(minScore, limit)` - Get top quality leads
- `getUnassignedLeads(limit)` - Get leads without assignments

### AgentRepository

- `create(input)` - Create new agent
- `findById(id)` - Find agent by ID
- `findByEmail(email)` - Find agent by email
- `findMany(filters, skip, take)` - Find agents with filters
- `update(id, input)` - Update agent
- `incrementCapacity(id)` - Increase agent's current capacity
- `decrementCapacity(id)` - Decrease agent's current capacity
- `getAvailableAgentsByInsuranceType(type, limit)` - Get available agents
- `getTopPerformingAgents(limit)` - Get top performers
- `getAgentsByLocation(state, zipCode)` - Get agents by location

### AssignmentRepository

- `create(input)` - Create new assignment
- `findById(id)` - Find assignment by ID
- `findByLeadAndAgent(leadId, agentId)` - Find specific assignment
- `acceptAssignment(id, notes)` - Agent accepts assignment
- `rejectAssignment(id, reason, notes)` - Agent rejects assignment
- `completeAssignment(id, converted, value, notes)` - Complete assignment
- `getPendingAssignments(agentId)` - Get pending assignments
- `getExpiredAssignments()` - Get expired assignments
- `markExpiredAssignments()` - Mark expired as EXPIRED status

### LeadEventRepository

- `create(input)` - Create event
- `getEventsByLead(leadId)` - Get lead's event history
- `createStatusChangeEvent(...)` - Record status change
- `createAssignmentEvent(...)` - Record assignment
- `createScoreChangeEvent(...)` - Record score change
- `createNoteEvent(...)` - Record note addition
- `getLeadTimeline(leadId)` - Get complete lead timeline

## 🗂️ Enums

### InsuranceType

- AUTO, HOME, LIFE, HEALTH, BUSINESS, RENTERS, UMBRELLA, DISABILITY, LONG_TERM_CARE

### LeadStatus

- NEW, CONTACTED, QUALIFIED, UNQUALIFIED, ASSIGNED, ACCEPTED, IN_PROGRESS, CONVERTED, REJECTED, EXPIRED, ARCHIVED

### LeadSource

- WEB_FORM, API, FILE_UPLOAD, REFERRAL, PHONE, EMAIL, SOCIAL_MEDIA, ADVERTISEMENT, ORGANIC

### AgentStatus

- ACTIVE, INACTIVE, ON_BREAK, BUSY, OFFLINE

### AssignmentStatus

- PENDING, ACCEPTED, REJECTED, EXPIRED, COMPLETED, CONVERTED, CANCELLED

### Urgency

- LOW, MEDIUM, HIGH, CRITICAL

## 🔧 Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insurance_lead_gen
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=insurance_lead_gen
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## 📊 Prisma Studio

To view and edit data in a GUI:

```bash
pnpm db:studio
```

Then open http://localhost:5555

## 🧪 Testing

Repository methods are designed to be easily testable. Use Prisma's mock or test databases for unit tests.

## 📝 Migration Workflow

### Development

```bash
# Make changes to schema.prisma
# Then push changes (no migration files)
pnpm db:push
```

### Production

```bash
# Create migration
pnpm db:migrate

# Deploy migrations
pnpm db:migrate:deploy
```

## 🔗 Related

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL](https://www.postgresql.org/)
- Phase 2 Implementation: Data Pipeline & Real-time Lead Processing
