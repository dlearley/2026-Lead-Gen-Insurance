// ========================================
// PHASE 12.5: COMMUNITY NETWORK EFFECTS
// ========================================

// ========================================
// CONNECTION & FOLLOWING TYPES
// ========================================

export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
}

export interface Connection {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  addressee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateConnectionDto {
  addresseeId: string;
}

export interface UpdateConnectionDto {
  status: ConnectionStatus;
}

export interface AgentFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  following?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// ========================================
// MENTORSHIP TYPES
// ========================================

export enum MentorStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum MentorshipRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface Mentor {
  id: string;
  agentId: string;
  specialties: string[];
  bio: string;
  yearsOfExperience: number;
  maxMentees: number;
  currentMentees: number;
  status: MentorStatus;
  rating: number;
  totalSessions: number;
  createdAt: Date;
  updatedAt: Date;
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateMentorDto {
  specialties: string[];
  bio: string;
  yearsOfExperience: number;
  maxMentees?: number;
}

export interface UpdateMentorDto {
  specialties?: string[];
  bio?: string;
  yearsOfExperience?: number;
  maxMentees?: number;
  status?: MentorStatus;
}

export interface MentorshipRequest {
  id: string;
  mentorId: string;
  menteeId: string;
  message: string;
  status: MentorshipRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  mentor?: Mentor;
  mentee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateMentorshipRequestDto {
  message: string;
}

export interface MentorshipSession {
  id: string;
  mentorshipRequestId: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: SessionStatus;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMentorshipSessionDto {
  mentorshipRequestId: string;
  scheduledAt: Date;
  durationMinutes: number;
}

export interface UpdateMentorshipSessionDto {
  status?: SessionStatus;
  notes?: string;
  rating?: number;
  feedback?: string;
}

// ========================================
// COMMUNITY GROUP TYPES
// ========================================

export enum GroupType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  SECRET = 'SECRET',
}

export enum GroupMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
}

export enum MembershipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  type: GroupType;
  category?: string;
  region?: string;
  specialty?: string;
  coverImage?: string;
  createdBy: string;
  memberCount: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateGroupDto {
  name: string;
  description: string;
  type: GroupType;
  category?: string;
  region?: string;
  specialty?: string;
  coverImage?: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  type?: GroupType;
  category?: string;
  region?: string;
  specialty?: string;
  coverImage?: string;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  agentId: string;
  role: GroupMemberRole;
  status: MembershipStatus;
  joinedAt: Date;
  updatedAt: Date;
  group?: CommunityGroup;
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface JoinGroupDto {
  message?: string;
}

export interface UpdateMembershipDto {
  role?: GroupMemberRole;
  status?: MembershipStatus;
}

// ========================================
// REFERRAL NETWORK TYPES
// ========================================

export enum ReferralStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
}

export interface AgentReferral {
  id: string;
  referrerId: string;
  refereeId: string;
  leadId: string;
  reason: string;
  status: ReferralStatus;
  commissionPercentage: number;
  commissionAmount?: number;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  referrer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  referee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateAgentReferralDto {
  refereeId: string;
  leadId: string;
  reason: string;
  commissionPercentage?: number;
}

export interface UpdateAgentReferralDto {
  status?: ReferralStatus;
  commissionAmount?: number;
}

export interface ReferralStats {
  totalReferrals: number;
  acceptedReferrals: number;
  convertedReferrals: number;
  totalCommission: number;
  pendingCommission: number;
  acceptanceRate: number;
  conversionRate: number;
}

// ========================================
// EVENT & WEBINAR TYPES
// ========================================

export enum EventType {
  WEBINAR = 'WEBINAR',
  WORKSHOP = 'WORKSHOP',
  TRAINING = 'TRAINING',
  NETWORKING = 'NETWORKING',
  CONFERENCE = 'CONFERENCE',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  hostId: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  maxAttendees?: number;
  currentAttendees: number;
  meetingUrl?: string;
  recordingUrl?: string;
  materials?: string[];
  tags?: string[];
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  host?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateEventDto {
  title: string;
  description: string;
  type: EventType;
  startTime: Date;
  endTime: Date;
  timezone: string;
  maxAttendees?: number;
  meetingUrl?: string;
  tags?: string[];
  coverImage?: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  type?: EventType;
  status?: EventStatus;
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  maxAttendees?: number;
  meetingUrl?: string;
  recordingUrl?: string;
  materials?: string[];
  tags?: string[];
  coverImage?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  agentId: string;
  status: RegistrationStatus;
  registeredAt: Date;
  attendedAt?: Date;
  rating?: number;
  feedback?: string;
  event?: CommunityEvent;
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface RegisterForEventDto {
  notes?: string;
}

export interface UpdateRegistrationDto {
  status?: RegistrationStatus;
  rating?: number;
  feedback?: string;
}

// ========================================
// REPUTATION & RECOGNITION TYPES
// ========================================

export enum BadgeType {
  MILESTONE = 'MILESTONE',
  ACHIEVEMENT = 'ACHIEVEMENT',
  SKILL = 'SKILL',
  PARTICIPATION = 'PARTICIPATION',
  LEADERSHIP = 'LEADERSHIP',
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  type: BadgeType;
  icon: string;
  criteria: Record<string, unknown>;
  points: number;
  rarity: number;
  createdAt: Date;
}

export interface AgentBadge {
  id: string;
  agentId: string;
  badgeId: string;
  awardedAt: Date;
  badge?: Badge;
}

export interface Endorsement {
  id: string;
  agentId: string;
  endorserId: string;
  skill: string;
  message?: string;
  createdAt: Date;
  endorser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateEndorsementDto {
  skill: string;
  message?: string;
}

export interface ExpertTopic {
  id: string;
  agentId: string;
  topic: string;
  endorsementCount: number;
  articlesWritten: number;
  questionsAnswered: number;
  score: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityStreak {
  id: string;
  agentId: string;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// COLLABORATION TYPES
// ========================================

export enum CollaborationStatus {
  PROPOSED = 'PROPOSED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Collaboration {
  id: string;
  leadId: string;
  initiatorId: string;
  title: string;
  description: string;
  status: CollaborationStatus;
  estimatedValue: number;
  splitPercentage: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  initiator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateCollaborationDto {
  leadId: string;
  title: string;
  description: string;
  estimatedValue: number;
}

export interface CollaborationParticipant {
  id: string;
  collaborationId: string;
  agentId: string;
  role: string;
  splitPercentage: number;
  invitedAt: Date;
  acceptedAt?: Date;
  status: string;
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AddCollaboratorDto {
  agentId: string;
  role: string;
  splitPercentage: number;
}

export interface KnowledgeArticle {
  id: string;
  authorId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  upvotes: number;
  downvotes: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateArticleDto {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

export interface UpdateArticleDto {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
}

// ========================================
// NETWORK ANALYTICS TYPES
// ========================================

export interface NetworkAnalytics {
  agentId: string;
  totalConnections: number;
  totalFollowers: number;
  totalFollowing: number;
  networkGrowth30d: number;
  engagementRate: number;
  influenceScore: number;
  reachScore: number;
  collaborationCount: number;
  referralCount: number;
  mentorshipSessions: number;
  eventsAttended: number;
  eventsHosted: number;
  articlesPublished: number;
  endorsementsReceived: number;
  badgesEarned: number;
  groupMemberships: number;
  period: {
    from: Date;
    to: Date;
  };
}

export interface NetworkGrowth {
  date: Date;
  connections: number;
  followers: number;
  engagements: number;
}

export interface NetworkROI {
  totalReferralsReceived: number;
  totalReferralsSent: number;
  referralRevenue: number;
  collaborationRevenue: number;
  networkingCost: number;
  roi: number;
}

export interface InfluenceMetrics {
  reachScore: number;
  engagementScore: number;
  expertiseScore: number;
  collaborationScore: number;
  overallInfluence: number;
  ranking: number;
  percentile: number;
}

export interface NetworkRecommendations {
  suggestedConnections: Array<{
    agentId: string;
    firstName: string;
    lastName: string;
    mutualConnections: number;
    reason: string;
  }>;
  suggestedGroups: Array<{
    groupId: string;
    name: string;
    memberCount: number;
    reason: string;
  }>;
  suggestedMentors: Array<{
    mentorId: string;
    agentId: string;
    firstName: string;
    lastName: string;
    specialties: string[];
    rating: number;
    reason: string;
  }>;
  suggestedEvents: Array<{
    eventId: string;
    title: string;
    type: EventType;
    startTime: Date;
    reason: string;
  }>;
}
