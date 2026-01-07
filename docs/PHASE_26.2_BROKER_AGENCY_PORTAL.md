# Phase 26.2: Broker & Agency Portal

## Overview

This phase implements dedicated portals for brokers and agencies to manage their networks, track referrals, monitor commissions, and analyze performance metrics.

## Features Implemented

### Broker Portal

**Location**: `/apps/frontend/app/broker-portal/`

#### Pages
- **Login**: `/broker-portal/login` - Secure authentication for brokers
- **Dashboard**: `/broker-portal/dashboard` - Overview of network metrics and activity
- **Network Management**: `/broker-portal/network` - Manage broker connections and relationships
- **Referral Management**: `/broker-portal/referrals` - Track sent and received referrals
- **Commission Tracking**: `/broker-portal/commissions` - Monitor earnings and payouts

#### Key Features
- **Network Dashboard**: Real-time metrics including network score, active connections, pending referrals, and referral multiplier
- **Connection Management**: Add, activate/deactivate connections with different relationship types
- **Referral Workflow**: View, accept, decline, and track referral status
- **Commission Tracking**: Monitor pending, processed, and paid commissions
- **Network Analytics**: Detailed metrics on network value, growth, and performance

### Agency Portal

**Location**: `/apps/frontend/app/agency-portal/`

#### Pages
- **Login**: `/agency-portal/login` - Secure authentication for agencies
- **Dashboard**: `/agency-portal/dashboard` - Agency-wide network overview and analytics

#### Key Features
- **Agency Network Overview**: Comprehensive view of all brokers in the agency network
- **Performance Analytics**: Track network growth, revenue, and conversion metrics
- **Leaderboard**: Identify top-performing brokers
- **Network Value Calculation**: Estimate the financial value of the agency's network

## API Endpoints

### Broker Authentication

**Location**: `/apps/api/src/routes/broker-auth.ts`

- `POST /api/brokers/login` - Broker login with email/password
- `GET /api/brokers/me` - Get current broker information
- `GET /api/brokers/validate-token` - Validate JWT token

### Broker Network (Existing)

The portal leverages existing broker network endpoints:

- `GET /api/broker-network/profile/:brokerId` - Get broker network profile
- `GET /api/broker-network/connections/:brokerId` - Get broker connections
- `POST /api/broker-network/connections` - Create new connection
- `PATCH /api/broker-network/connections/:id` - Update connection
- `GET /api/broker-network/referrals/:brokerId` - Get referrals
- `POST /api/broker-network/referrals` - Create referral
- `PATCH /api/broker-network/referrals/:id/status` - Update referral status
- `GET /api/broker-network/metrics/:brokerId` - Get network metrics
- `GET /api/broker-network/value/:brokerId` - Calculate network value
- `GET /api/broker-network/leaderboard` - Get network leaderboard
- `GET /api/broker-network/growth/:brokerId` - Get growth metrics

## Services

### Broker Portal Service

**Location**: `/apps/frontend/services/broker-portal.service.ts`

- Authentication management (login, logout, token handling)
- Network profile and connection management
- Referral creation and status updates
- Metrics and analytics retrieval
- Dashboard data aggregation

### Agency Portal Service

**Location**: `/apps/frontend/services/agency-portal.service.ts`

- Agency authentication
- Network overview and analytics
- Performance tracking
- Leaderboard and ranking data

## Technical Implementation

### Authentication

- **JWT-based authentication** using `jsonwebtoken`
- **Cookie-based token storage** for session persistence
- **Axios interceptors** for automatic token injection
- **Token validation middleware** for protected routes

### Frontend

- **React/Next.js** components with TypeScript
- **Lucide React** icons for UI consistency
- **Responsive design** with Tailwind CSS
- **Client-side routing** with Next.js navigation
- **State management** with React hooks

### Backend

- **Express.js** API routes
- **JWT authentication** for secure access
- **Proxy to data service** for broker network operations
- **Mock data** for demonstration purposes

## Usage

### Broker Portal

1. Navigate to `/broker-portal/login`
2. Login with broker credentials (demo: `broker@example.com` / `password123`)
3. Access dashboard to view network metrics
4. Manage connections, referrals, and commissions

### Agency Portal

1. Navigate to `/agency-portal/login`
2. Login with agency credentials (uses same auth as broker for demo)
3. View agency-wide network performance
4. Monitor top performers and growth metrics

## Security Considerations

- **JWT tokens** with 7-day expiration
- **Secure cookie storage** with HTTP-only flags
- **Token validation** on all protected routes
- **Password hashing** (not implemented in demo - use bcrypt in production)
- **Rate limiting** on authentication endpoints

## Future Enhancements

- **Password reset functionality**
- **Multi-factor authentication**
- **Role-based access control**
- **Agency-specific features** (team management, commission structures)
- **Advanced analytics** with chart visualizations
- **Real-time updates** with WebSockets
- **Mobile-responsive design** improvements

## Testing

The implementation includes:
- **Mock data** for demonstration
- **Error handling** for API failures
- **Loading states** for better UX
- **Form validation** for user inputs

## Dependencies Added

- `jsonwebtoken`: ^9.0.2 - For JWT authentication
- `js-cookie`: Already present - For cookie management

## Integration Points

- **Existing Broker Network API**: Leverages Phase 10.6 broker network functionality
- **Data Service**: Proxy calls to existing broker network endpoints
- **Authentication System**: Integrates with existing JWT infrastructure

## Success Metrics

- **Broker engagement**: Increased network activity and referrals
- **Agency oversight**: Better visibility into broker performance
- **Revenue tracking**: Clear commission and earnings monitoring
- **Network growth**: Measurable increase in connections and collaborations

This implementation provides a comprehensive portal solution for brokers and agencies to effectively manage their professional networks and track performance within the insurance lead generation platform.