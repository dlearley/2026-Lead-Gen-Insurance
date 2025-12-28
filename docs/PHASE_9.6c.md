# Phase 9.6c: VIP Program & Community Engagement

## Overview

Phase 9.6c introduces a comprehensive VIP Program for agents and a Community Engagement platform to foster collaboration, recognize top performers, and provide exclusive benefits to high-achieving insurance agents.

## Features Implemented

### 1. VIP Program
- **Tiered System**: Four tiers (SILVER, GOLD, PLATINUM, DIAMOND).
- **Point-Based Progression**: Agents earn points through various platform activities.
- **Automated Tier Management**: Automatic tier upgrades based on accumulated points.
- **Exclusive Benefits**: Tier-specific benefits including lead priority multipliers, commission bonuses, and exclusive features.
- **Leaderboard**: Real-time ranking of top agents based on VIP points.
- **API Endpoints**:
  - `GET /api/v1/vip/agents/:agentId/status`: Get current VIP status and points.
  - `POST /api/v1/vip/agents/:agentId/points`: Manually adjust agent points.
  - `PUT /api/v1/vip/agents/:agentId/tier`: Manually set agent tier.
  - `GET /api/v1/vip/leaderboard`: View top-performing agents.

### 2. Community Engagement
- **Discussion Posts**: Agents can share success stories, tips, and ask questions.
- **Categories**: Posts are categorized (General, Success Story, Tip, Question, Announcement).
- **Comments**: Interactive discussions on posts.
- **Likes**: Peer recognition for posts and comments.
- **Engagement Rewards**: Automated point rewards for community participation:
  - Posting: 5 points
  - Commenting: 2 points
  - Receiving a Like: 1 point
- **API Endpoints**:
  - `POST /api/v1/community/posts`: Create a new post.
  - `GET /api/v1/community/posts`: List posts with filtering and search.
  - `GET /api/v1/community/posts/:id`: Get detailed post view with comments.
  - `POST /api/v1/community/posts/:id/comments`: Add a comment to a post.
  - `POST /api/v1/community/like`: Toggle like on a post or comment.
  - `GET /api/v1/community/success-stories`: View featured success stories.

## Technical Implementation

### Data Models (Prisma)
- `AgentVIPStatus`: Tracks points, tier, and expiration.
- `CommunityPost`: Stores discussion topics and content.
- `CommunityComment`: Stores interactive replies.
- `CommunityLike`: Tracks peer recognition.

### Services & Repositories
- `VIPRepository`: Data access for VIP status and point calculations.
- `CommunityRepository`: Management of posts, comments, and likes.
- `VIPService`: Business logic for rewarding engagement and managing tier benefits.

### API Architecture
- **Data Service**: Implements the core business logic and database interactions.
- **API Proxy**: Exposes the features through the main API gateway with unified endpoint patterns.

## Reward System Configuration

| Action | Points Awarded |
|--------|----------------|
| Lead Accepted | 10 |
| Lead Converted | 100 |
| Community Post | 5 |
| Community Comment | 2 |
| Like Received | 1 |

## VIP Tier Requirements

| Tier | Min Points | Benefits |
|------|------------|----------|
| SILVER | 0 | Base status |
| GOLD | 1,000 | 1.2x Lead Priority, 5% Bonus |
| PLATINUM | 5,000 | 1.5x Lead Priority, 10% Bonus, Advanced Analytics |
| DIAMOND | 10,000 | 2.0x Lead Priority, 20% Bonus, Dedicated Manager |

## Usage Examples

### Getting Agent VIP Status
```bash
curl http://localhost:3000/api/v1/vip/agents/{agentId}/status
```

### Creating a Success Story
```bash
curl -X POST http://localhost:3000/api/v1/community/posts \
  -H "Content-Type: application/json" \
  -d '{
    "authorId": "agent-uuid",
    "title": "Closing a $1M Commercial Policy",
    "content": "I used the AI insights to identify...",
    "category": "SUCCESS_STORY"
  }'
```

### Liking a Post
```bash
curl -X POST http://localhost:3000/api/v1/community/like \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "liking-agent-uuid",
    "postId": "post-uuid"
  }'
```
