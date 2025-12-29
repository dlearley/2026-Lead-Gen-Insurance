import { PrismaClient } from '@prisma/client';
import { 
  MediaSession, 
  RoomParticipant, 
  CreateMediaSessionDto, 
  UpdateMediaSessionDto,
  JoinSessionDto,
  UpdateParticipantDto,
  SessionQueryDto,
  ParticipantQueryDto,
  ParticipantStatus,
  SessionStatus,
  CallEventType,
  AnalyticsData,
  GenerateRoomUrl,
  GenerateSessionId,
  GenerateParticipantId
} from '@repo/types';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `sess_${uuidv4()}`;
}

/**
 * Generate unique participant ID
 */
export function generateParticipantId(): string {
  return `part_${uuidv4()}`;
}

/**
 * Generate room URL
 */
export function generateRoomUrl(sessionId: string): string {
  return `/room/${sessionId}`;
}

/**
 * Create a new media session
 */
export async function createMediaSession(
  userId: string,
  dto: CreateMediaSessionDto
): Promise<MediaSession> {
  const sessionId = generateSessionId();
  const roomUrl = generateRoomUrl(sessionId);

  const session = await prisma.mediaSession.create({
    data: {
      sessionId,
      sessionType: dto.sessionType,
      title: dto.title,
      description: dto.description,
      createdBy: userId,
      maxParticipants: dto.maxParticipants,
      isRecordingEnabled: dto.isRecordingEnabled ?? false,
      isScreenShareEnabled: dto.isScreenShareEnabled ?? true,
      isWaitingRoomEnabled: dto.isWaitingRoomEnabled ?? false,
      isSecure: dto.isSecure ?? true,
      roomUrl,
      webhookUrl: dto.webhookUrl,
      metadata: dto.metadata,
      participants: {
        create: []
      }
    },
    include: {
      participants: true,
      recordings: false,
      callLogs: false,
      signalMessages: false
    }
  });

  // Log session creation event
  await createCallLog(sessionId, userId, CallEventType.SESSION_STARTED, {
    sessionType: dto.sessionType,
    title: dto.title,
    createdBy: userId
  });

  return session;
}

/**
 * Get media session by ID
 */
export async function getMediaSession(sessionId: string): Promise<MediaSession | null> {
  return prisma.mediaSession.findUnique({
    where: { sessionId },
    include: {
      participants: {
        orderBy: { joinedAt: 'asc' }
      },
      recordings: {
        orderBy: { createdAt: 'desc' }
      },
      callLogs: {
        orderBy: { timestamp: 'desc' },
        take: 100
      },
      signalMessages: false
    }
  });
}

/**
 * List media sessions with filters
 */
export async function listMediaSessions(query: SessionQueryDto): Promise<{
  sessions: MediaSession[];
  total: number;
}> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.sessionType) {
    where.sessionType = query.sessionType;
  }

  if (query.sessionStatus) {
    where.sessionStatus = query.sessionStatus;
  }

  if (query.createdBy) {
    where.createdBy = query.createdBy;
  }

  if (query.fromDate || query.toDate) {
    where.createdAt = {};
    if (query.fromDate) {
      where.createdAt.gte = query.fromDate;
    }
    if (query.toDate) {
      where.createdAt.lte = query.toDate;
    }
  }

  const [sessions, total] = await Promise.all([
    prisma.mediaSession.findMany({
      where,
      include: {
        participants: {
          where: { status: 'CONNECTED' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.mediaSession.count({ where })
  ]);

  return { sessions, total };
}

/**
 * Update media session
 */
export async function updateMediaSession(
  sessionId: string,
  dto: UpdateMediaSessionDto
): Promise<MediaSession> {
  const session = await prisma.mediaSession.update({
    where: { sessionId },
    data: {
      title: dto.title,
      description: dto.description,
      maxParticipants: dto.maxParticipants,
      isRecordingEnabled: dto.isRecordingEnabled,
      isScreenShareEnabled: dto.isScreenShareEnabled,
      isWaitingRoomEnabled: dto.isWaitingRoomEnabled,
      webhookUrl: dto.webhookUrl,
      metadata: dto.metadata
    },
    include: {
      participants: true,
      recordings: false,
      callLogs: false
    }
  });

  return session;
}

/**
 * Delete media session (soft delete)
 */
export async function deleteMediaSession(sessionId: string): Promise<MediaSession> {
  return prisma.mediaSession.update({
    where: { sessionId },
    data: { 
      sessionStatus: SessionStatus.CANCELLED,
      updatedAt: new Date()
    }
  });
}

/**
 * Join media session
 */
export async function joinMediaSession(
  sessionId: string,
  dto: JoinSessionDto
): Promise<RoomParticipant> {
  const session = await getMediaSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Check if session is active
  if (session.sessionStatus !== SessionStatus.IN_PROGRESS && session.sessionStatus !== SessionStatus.SCHEDULED) {
    throw new Error('Session is not available for joining');
  }

  // Check participant limit
  if (session.maxParticipants && session.participants.length >= session.maxParticipants) {
    throw new Error('Session has reached maximum participant limit');
  }

  const participantId = generateParticipantId();

  const participant = await prisma.roomParticipant.create({
    data: {
      sessionId,
      participantId,
      userId: dto.userId,
      displayName: dto.displayName,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      status: ParticipantStatus.JOINING,
      hasRecordingConsent: dto.hasRecordingConsent ?? false,
      deviceInfo: dto.deviceInfo,
      joinedAt: new Date(),
      lastSeenAt: new Date()
    }
  });

  // Log participant join event
  await createCallLog(sessionId, participantId, CallEventType.PARTICIPANT_JOINED, {
    displayName: dto.displayName,
    role: dto.role,
    deviceInfo: dto.deviceInfo
  });

  return participant;
}

/**
 * Get participant details
 */
export async function getParticipant(sessionId: string, participantId: string): Promise<RoomParticipant | null> {
  return prisma.roomParticipant.findUnique({
    where: { 
      sessionId_participantId: { sessionId, participantId }
    }
  });
}

/**
 * List participants with filters
 */
export async function listParticipants(query: ParticipantQueryDto): Promise<{
  participants: RoomParticipant[];
  total: number;
}> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.sessionId) {
    where.sessionId = query.sessionId;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.role) {
    where.role = query.role;
  }

  if (query.status) {
    where.status = query.status;
  }

  const [participants, total] = await Promise.all([
    prisma.roomParticipant.findMany({
      where,
      orderBy: { joinedAt: 'asc' },
      skip,
      take: limit
    }),
    prisma.roomParticipant.count({ where })
  ]);

  return { participants, total };
}

/**
 * Update participant
 */
export async function updateParticipant(
  sessionId: string,
  participantId: string,
  dto: UpdateParticipantDto
): Promise<RoomParticipant> {
  const participant = await prisma.roomParticipant.update({
    where: {
      sessionId_participantId: { sessionId, participantId }
    },
    data: {
      role: dto.role,
      status: dto.status,
      isAudioEnabled: dto.isAudioEnabled,
      isVideoEnabled: dto.isVideoEnabled,
      isHandRaised: dto.isHandRaised,
      lastSeenAt: new Date()
    }
  });

  // Log relevant events
  if (dto.isAudioEnabled !== undefined) {
    await createCallLog(sessionId, participantId, 
      dto.isAudioEnabled ? CallEventType.AUDIO_ENABLED : CallEventType.AUDIO_DISABLED);
  }

  if (dto.isVideoEnabled !== undefined) {
    await createCallLog(sessionId, participantId,
      dto.isVideoEnabled ? CallEventType.VIDEO_ENABLED : CallEventType.VIDEO_DISABLED);
  }

  if (dto.isHandRaised !== undefined) {
    await createCallLog(sessionId, participantId,
      dto.isHandRaised ? CallEventType.HAND_RAISED : CallEventType.HAND_LOWERED);
  }

  return participant;
}

/**
 * Remove participant from session
 */
export async function removeParticipant(sessionId: string, participantId: string): Promise<RoomParticipant> {
  // Log participant leave event
  await createCallLog(sessionId, participantId, CallEventType.PARTICIPANT_LEFT);

  return prisma.roomParticipant.update({
    where: {
      sessionId_participantId: { sessionId, participantId }
    },
    data: {
      status: ParticipantStatus.DISCONNECTED,
      leftAt: new Date(),
      lastSeenAt: new Date()
    }
  });
}

/**
 * Start media session
 */
export async function startMediaSession(sessionId: string, userId: string): Promise<MediaSession> {
  const session = await prisma.mediaSession.update({
    where: { sessionId },
    data: {
      sessionStatus: SessionStatus.IN_PROGRESS,
      startTime: new Date()
    },
    include: {
      participants: true
    }
  });

  // Log session start event
  await createCallLog(sessionId, userId, CallEventType.SESSION_STARTED);

  return session;
}

/**
 * End media session
 */
export async function endMediaSession(sessionId: string, userId: string): Promise<MediaSession> {
  // Update all active participants to disconnected
  await prisma.roomParticipant.updateMany({
    where: {
      sessionId,
      status: ParticipantStatus.CONNECTED
    },
    data: {
      status: ParticipantStatus.DISCONNECTED,
      leftAt: new Date(),
      lastSeenAt: new Date()
    }
  });

  // Update session status
  const session = await prisma.mediaSession.update({
    where: { sessionId },
    data: {
      sessionStatus: SessionStatus.ENDED,
      endTime: new Date(),
      duration: 0 // Calculate actual duration
    },
    include: {
      participants: true
    }
  });

  // Calculate actual duration
  if (session.startTime && session.endTime) {
    const duration = Math.floor(
      (session.endTime.getTime() - session.startTime.getTime()) / 1000
    );
    
    await prisma.mediaSession.update({
      where: { sessionId },
      data: { duration }
    });
  }

  // Log session end event
  await createCallLog(sessionId, userId, CallEventType.SESSION_ENDED);

  return session;
}

/**
 * Create call log entry
 */
export async function createCallLog(
  sessionId: string,
  participantId: string,
  eventType: CallEventType,
  details?: Record<string, any>
): Promise<void> {
  await prisma.callLog.create({
    data: {
      sessionId,
      participantId,
      eventType,
      details,
      timestamp: new Date()
    }
  });
}

/**
 * Get session analytics
 */
export async function getSessionAnalytics(): Promise<AnalyticsData> {
  const [
    totalSessions,
    activeSessions,
    totalParticipants,
    averageDuration,
    averageParticipants,
    recordingHours,
    qualityScore,
    sessionsByType,
    sessionsByStatus
  ] = await Promise.all([
    prisma.mediaSession.count(),
    prisma.mediaSession.count({ where: { sessionStatus: SessionStatus.IN_PROGRESS } }),
    prisma.roomParticipant.count(),
    prisma.mediaSession.aggregate({
      _avg: { duration: true }
    }),
    prisma.mediaSession.aggregate({
      _avg: { 
        _count: true 
      }
    }),
    prisma.mediaRecording.aggregate({
      _sum: { duration: true }
    }),
    prisma.mediaSession.aggregate({
      _avg: { qualityScore: true }
    }),
    prisma.mediaSession.groupBy({
      by: ['sessionType'],
      _count: true
    }),
    prisma.mediaSession.groupBy({
      by: ['sessionStatus'],
      _count: true
    })
  ]);

  // Get top participants
  const topParticipants = await prisma.roomParticipant.groupBy({
    by: ['participantId'],
    _count: { sessionId: true },
    orderBy: {
      _count: { sessionId: 'desc' }
    },
    take: 10
  });

  // Get quality trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const qualityTrends = await prisma.callLog.findMany({
    where: {
      eventType: CallEventType.CONNECTION_ESTABLISHED,
      timestamp: {
        gte: thirtyDaysAgo
      }
    },
    select: {
      timestamp: true,
      qualityMetrics: true
    },
    orderBy: { timestamp: 'asc' }
  });

  const sessionsByTypeMap = sessionsByType.reduce((acc, curr) => {
    acc[curr.sessionType] = curr._count;
    return acc;
  }, {} as Record<string, number>);

  const sessionsByStatusMap = sessionsByStatus.reduce((acc, curr) => {
    acc[curr.sessionStatus] = curr._count;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalSessions,
    activeSessions,
    totalParticipants,
    averageSessionDuration: Math.floor(averageDuration._avg.duration || 0),
    averageParticipants: Math.floor(averageParticipants._avg._count?._all || 0),
    recordingHours: Math.floor((recordingHours._sum.duration || 0) / 3600),
    qualityScoreAvg: qualityScore._avg.qualityScore || 0,
    sessionsByType: sessionsByTypeMap,
    sessionsByStatus: sessionsByStatusMap,
    topParticipants: topParticipants.map(p => ({
      participantId: p.participantId,
      sessionCount: p._count.sessionId,
      totalDuration: 0 // Would need additional query for duration
    })),
    qualityTrends: qualityTrends.map(q => ({
      date: q.timestamp.toISOString().split('T')[0],
      qualityScore: q.qualityMetrics?.networkQuality || 0,
      participantCount: 0 // Would need additional query
    }))
  };
}