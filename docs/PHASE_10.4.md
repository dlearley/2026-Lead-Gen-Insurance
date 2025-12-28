# Phase 10.4: Mobile App - Enable Field Work

## Overview

This phase implements mobile-first field work capabilities for insurance agents to efficiently manage leads while on the go. The features include offline support, location-based lead discovery, quick actions, and responsive mobile UI.

## Features Implemented

### 1. Mobile-Optimized Lead Management

- **LeadList Component**: Responsive list view with filter panel, search, and view toggle (list/grid/map)
- **LeadCard Component**: Touch-friendly lead cards with priority indicators and quick actions
- **LeadDetail Component**: Comprehensive lead view with tabs for details, activity, and history

### 2. Quick Actions for Field Work

- One-tap calling and emailing
- Quick status updates (Qualify, Reject, Convert)
- Schedule follow-ups directly from lead cards
- Navigation to lead locations

### 3. Location-Based Features

- **Nearby Leads Page**: Discover leads sorted by distance
- Geolocation integration with configurable radius (10, 25, 50, 100 miles)
- Distance calculation between agent and lead locations

### 4. Offline Support

- Offline detection and status indicator
- Pending sync queue for changes made offline
- Automatic sync when connection is restored
- Local storage persistence for filters and view preferences

### 5. Mobile UI Components

- **FieldWorkWidget**: Dashboard widget showing online status, sync status, and quick stats
- **MobileQuickActions**: Bottom navigation bar for mobile devices
- Responsive sidebar with mobile-specific navigation items

## File Structure

```
apps/frontend/
├── app/leads/
│   ├── page.tsx              # Main leads list page
│   └── nearby/
│       └── page.tsx          # Nearby leads page
├── components/leads/
│   ├── LeadCard.tsx          # Lead card component
│   ├── LeadList.tsx          # Lead list with filters
│   ├── LeadDetail.tsx        # Lead detail view
│   ├── QuickActions.tsx      # Quick action buttons
│   ├── StatusBadge.tsx       # Status badge components
│   ├── FieldWorkWidget.tsx   # Field work dashboard widget
│   └── index.ts              # Exports
├── hooks/
│   ├── use-leads.ts          # Lead data hooks
│   └── use-field-work.ts     # Field work hooks (offline, location)
├── services/
│   └── leads.service.ts      # Lead API service
├── stores/
│   └── leads.store.ts        # Zustand stores (leads, field work, cache)
└── types/
    └── leads.ts              # Lead type definitions
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/leads` | List leads with pagination and filters |
| GET | `/api/v1/leads/{id}` | Get lead details |
| POST | `/api/v1/leads` | Create new lead |
| PUT | `/api/v1/leads/{id}` | Update lead |
| PATCH | `/api/v1/leads/{id}` | Partial update lead |
| DELETE | `/api/v1/leads/{id}` | Delete lead |
| PATCH | `/api/v1/leads/{id}/status` | Update lead status |
| POST | `/api/v1/leads/{id}/assign` | Assign lead to agent |
| POST | `/api/v1/leads/bulk/update` | Bulk update leads |
| POST | `/api/v1/leads/bulk/status` | Bulk status update |
| POST | `/api/v1/leads/search` | Search leads |
| GET | `/api/v1/leads/nearby` | Get nearby leads |

## Usage

### Basic Lead List

```tsx
import { LeadList } from "@/components/leads/LeadList";
import { useLeads } from "@/hooks/use-leads";

function MyComponent() {
  const { leads, loading, error, refetch } = useLeads({ autoFetch: true });

  return (
    <LeadList
      leads={leads}
      loading={loading}
      error={error}
      onLeadClick={(lead) => console.log(lead)}
      onLeadCall={(lead) => window.location.href = `tel:${lead.phone}`}
      onLeadEmail={(lead) => window.location.href = `mailto:${lead.email}`}
      onAddLead={() => router.push("/leads/new")}
      onRefresh={refetch}
    />
  );
}
```

### Lead Detail with Quick Actions

```tsx
import { LeadDetail } from "@/components/leads/LeadDetail";
import { useLeadDetail, useLeadMutations } from "@/hooks/use-leads";

function LeadDetailPage({ leadId }) {
  const { lead, loading } = useLeadDetail(leadId);
  const { updateStatus } = useLeadMutations();

  const handleStatusChange = async (status: string) => {
    await updateStatus(leadId, status);
  };

  return (
    <LeadDetail
      lead={lead}
      loading={loading}
      onCall={() => window.location.href = `tel:${lead.phone}`}
      onEmail={() => window.location.href = `mailto:${lead.email}`}
      onStatusChange={handleStatusChange}
    />
  );
}
```

### Field Work Hook

```tsx
import { useFieldWork } from "@/hooks/use-field-work";

function FieldWorkComponent() {
  const {
    isOnline,
    isOffline,
    pendingSyncCount,
    lastSyncFormatted,
    currentLocation,
    syncPendingChanges,
    getCurrentLocation,
  } = useFieldWork();

  return (
    <div>
      <p>Status: {isOnline ? "Online" : "Offline"}</p>
      <p>Pending: {pendingSyncCount}</p>
      <p>Last sync: {lastSyncFormatted}</p>
      <button onClick={syncPendingChanges}>Sync Now</button>
      <button onClick={getCurrentLocation}>Get Location</button>
    </div>
  );
}
```

### Nearby Leads

```tsx
import { useNearbyLeads } from "@/hooks/use-leads";

function NearbyLeadsPage() {
  const { leads, loading, location, fetchNearby } = useNearbyLeads();

  return (
    <div>
      <p>Current location: {location?.coords.latitude}, {location?.coords.longitude}</p>
      <button onClick={() => fetchNearby(25)}>Find within 25 miles</button>
      {leads.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
```

## Responsive Design

The components are designed with mobile-first principles:

- **Touch-friendly**: Minimum 44px touch targets
- **Readable**: Appropriate font sizes and spacing
- **Efficient**: Quick actions visible without scrolling
- **Offline-ready**: Status indicators and sync queue

## State Management

### Leads Store

```typescript
interface LeadsState {
  leads: Lead[];
  selectedLeadId: string | null;
  filters: LeadFilter;
  viewMode: "list" | "grid" | "map";
  sortBy: string;
  sortOrder: "asc" | "desc";
}
```

### Field Work Store

```typescript
interface FieldWorkState {
  isOffline: boolean;
  pendingSync: Lead[];
  lastSyncTime: string | null;
  currentLocation: GeolocationPosition | null;
  assignedLeadsCount: number;
  todayTasksCount: number;
}
```

## Browser Support

- Chrome 80+ (mobile and desktop)
- Safari 14+ (iOS and macOS)
- Firefox 75+
- Edge 80+

## Geolocation Requirements

- HTTPS required for geolocation API
- User permission prompt on first access
- Fallback for browsers without geolocation support

## Offline Strategy

1. Detect online/offline status via `navigator.onLine`
2. Queue changes in local storage when offline
3. Auto-sync when connection is restored
4. Show pending sync count and last sync time

## Future Enhancements

- [ ] Background sync with Service Workers
- [ ] Push notifications for lead assignments
- [ ] GPS tracking for route optimization
- [ ] Photo capture for lead documentation
- [ ] Signature capture for proposals
- [ ] Camera integration for document scanning
