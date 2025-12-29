// ========================================
// PHASE 12.5: ENHANCED COMMUNITY TYPES
// ========================================

// ========================================
// GROUPS
// ========================================

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  coverImage?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityGroupMember {
  id: string;
  groupId: string;
  agentId: string;
  role: GroupMemberRole;
  joinedAt: Date;
}

export enum GroupMemberRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export interface CreateGroupDto {
  createdById: string;
  name: string;
  description: string;
  category: string;
  isPrivate?: boolean;
  coverImage?: string;
}

export interface JoinGroupDto {
  agentId: string;
}

// ========================================
// EVENTS
// ========================================

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  eventType: CommunityEventType;
  startTime: Date;
  endTime: Date;
  location?: string;
  isVirtual: boolean;
  meetingLink?: string;
  maxAttendees?: number;
  coverImage?: string;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum CommunityEventType {
  WEBINAR = 'WEBINAR',
  WORKSHOP = 'WORKSHOP',
  TRAINING = 'TRAINING',
  NETWORKING = 'NETWORKING',
  Q_AND_A = 'Q_AND_A',
  MEETUP = 'MEETUP',
}

export interface CommunityEventAttendee {
  id: string;
  eventId: string;
  agentId: string;
  status: EventAttendeeStatus;
  joinedAt?: Date;
  createdAt: Date;
}

export enum EventAttendeeStatus {
  REGISTERED = 'REGISTERED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export interface CreateEventDto {
  hostId: string;
  title: string;
  description: string;
  eventType: CommunityEventType;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  isVirtual?: boolean;
  meetingLink?: string;
  maxAttendees?: number;
  coverImage?: string;
}

export interface RegisterEventDto {
  agentId: string;
}

// ========================================
// BADGES & ACHIEVEMENTS
// ========================================

export interface AgentBadge {
  id: string;
  agentId: string;
  badgeType: BadgeType;
  earnedAt: Date;
  metadata?: Record<string, any>;
}

export enum BadgeType {
  // Community Engagement
  FIRST_POST = 'FIRST_POST',
  FIRST_COMMENT = 'FIRST_COMMENT',
  TOP_CONTRIBUTOR = 'TOP_CONTRIBUTOR',
  HELPFUL_ANSWER = 'HELPFUL_ANSWER',
  EXPERT_ADVISOR = 'EXPERT_ADVISOR',
  MENTOR = 'MENTOR',
  COMMUNITY_LEADER = 'COMMUNITY_LEADER',
  EARLY_ADOPTER = 'EARLY_ADOPTER',
  PERFECT_ATTENDANCE = 'PERFECT_ATTENDANCE',
  
  // Performance Milestones
  MILESTONE_10_LEADS = 'MILESTONE_10_LEADS',
  MILESTONE_50_LEADS = 'MILESTONE_50_LEADS',
  MILESTONE_100_LEADS = 'MILESTONE_100_LEADS',
  MILESTONE_500_LEADS = 'MILESTONE_500_LEADS',
  HIGH_CONVERSION_RATE = 'HIGH_CONVERSION_RATE',
}

export interface AwardBadgeDto {
  badgeType: BadgeType;
  metadata?: Record<string, any>;
}

export interface BadgeLeader {
  agentId: string;
  firstName: string;
  lastName: string;
  badgeCount: number;
}

// ========================================
// MENTORSHIP
// ========================================

export interface MentorshipRelationship {
  id: string;
  mentorId: string;
  menteeId: string;
  status: MentorshipStatus;
  startedAt?: Date;
  endedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum MentorshipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface MentorshipSession {
  id: string;
  relationshipId: string;
  scheduledAt: Date;
  duration: number; // minutes
  topic?: string;
  notes?: string;
  status: MentorshipSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum MentorshipSessionStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface CreateMentorshipRequestDto {
  mentorId: string;
  menteeId: string;
}

export interface ScheduleSessionDto {
  scheduledAt: Date | string;
  duration: number;
  topic?: string;
  notes?: string;
}

export interface CompleteSessionDto {
  notes?: string;
}

// ========================================
// AGENT PROFILES
// ========================================

export interface AgentProfile {
  id: string;
  agentId: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  specialties: string[];
  interests: string[];
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAgentProfileDto {
  bio?: string;
  avatar?: string;
  coverImage?: string;
  specialties?: string[];
  interests?: string[];
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  isPublic?: boolean;
}

// ========================================
// SOCIAL CONNECTIONS
// ========================================

export interface AgentConnection {
  id: string;
  followerId: string;
  followingId: string;
  status: ConnectionStatus;
  createdAt: Date;
}

export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED',
}

export interface ConnectionRequestDto {
  followerId: string;
  followingId: string;
}

export interface ConnectionActionDto {
  followerId: string;
  followingId: string;
}

// ========================================
// RESPONSE TYPES
// ========================================

export interface GroupWithMembers extends CommunityGroup {
  members: Array<CommunityGroupMember & {
    agent: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  _count: {
    posts: number;
  };
}

export interface EventWithAttendees extends CommunityEvent {
  host: {
    firstName: string;
    lastName: string;
  };
  attendees: Array<CommunityEventAttendee & {
    agent: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

export interface MentorshipWithDetails extends MentorshipRelationship {
  mentor?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  mentee?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    sessions: number;
  };
}

export interface ConnectionWithAgent extends AgentConnection {
  follower?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  following?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
