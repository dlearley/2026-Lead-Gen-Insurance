/**
 * Voice/Video Core Communication Types
 * Defines interfaces for real-time communication capabilities
 */

export interface MediaSession {
  id: string;
  sessionId: string;
  sessionType: MediaSessionType;
  sessionStatus: SessionStatus;
  title: string;
  description?: string;
  createdBy: string;
  participants: RoomParticipant[];
  maxParticipants?: number;
  isRecordingEnabled: boolean;
  isScreenShareEnabled: boolean;
  isWaitingRoomEnabled: boolean;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  qualityScore?: number;
  isSecure: boolean;
  encryptionKey?: string;
  roomUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomParticipant {
  id: string;
  sessionId: string;
  participantId: string;
  userId?: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  hasRecordingConsent: boolean;
  browserInfo?: BrowserInfo;
  deviceInfo?: DeviceInfo;
  networkStats?: NetworkStats;
  joinedAt: Date;
  leftAt?: Date;
  lastSeenAt: Date;
}

export interface MediaRecording {
  id: string;
  recordingId: string;
  sessionId: string;
  participantId?: string;
  format: RecordingFormat;
  status: RecordingStatus;
  storageUrl?: string;
  fileSize?: number;
  duration: number;
  quality: RecordingQuality;
  isAudioOnly: boolean;
  isComposite: boolean;
  startTime: Date;
  endTime?: Date;
  transcriptionId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CallLog {
  id: string;
  sessionId: string;
  participantId: string;
  eventType: CallEventType;
  timestamp: Date;
  details?: Record<string, any>;
  qualityMetrics?: QualityMetrics;
}

export interface SignalMessage {
  id: string;
  sessionId: string;
  fromParticipantId: string;
  toParticipantId?: string;
  messageType: SignalType;
  payload: Record<string, any>;
  isBroadcast: boolean;
  timestamp: Date;
}

export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
}

export interface DeviceInfo {
  deviceType: DeviceType;
  audioInputDevice?: MediaDeviceInfo;
  videoInputDevice?: MediaDeviceInfo;
  audioOutputDevice?: MediaDeviceInfo;
}

export interface MediaDeviceInfo {
  deviceId: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
  label: string;
  groupId: string;
}

export interface NetworkStats {
  connectionType: ConnectionType;
  ipAddress?: string;
  rtt?: number;
  jitter?: number;
  packetLoss?: number;
  bandwidth?: number;
  connectionScore?: number;
}

export interface QualityMetrics {
  audioQuality?: number;
  videoQuality?: number;
  networkQuality?: number;
  fps?: number;
  resolution?: string;
  codec?: string;
  bitrate?: number;
}

// Enums
export enum MediaSessionType {
  VOICE = 'VOICE',
  VIDEO = 'VIDEO',
  SCREEN_SHARE = 'SCREEN_SHARE',
  BROADCAST = 'BROADCAST'
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  ENDED = 'ENDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ParticipantRole {
  HOST = 'HOST',
  CO_HOST = 'CO_HOST',
  PARTICIPANT = 'PARTICIPANT',
  VIEWER = 'VIEWER',
  MODERATOR = 'MODERATOR'
}

export enum ParticipantStatus {
  INVITED = 'INVITED',
  JOINING = 'JOINING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  REMOVED = 'REMOVED',
  ERROR = 'ERROR'
}

export enum RecordingFormat {
  MP4 = 'MP4',
  WEBM = 'WEBM',
  MP3 = 'MP3',
  WAV = 'WAV',
  M4A = 'M4A'
}

export enum RecordingStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  STOPPED = 'STOPPED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  DELETED = 'DELETED'
}

export enum RecordingQuality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  HD = 'HD',
  FULL_HD = 'FULL_HD',
  _4K = '_4K'
}

export enum CallEventType {
  SESSION_STARTED = 'SESSION_STARTED',
  SESSION_ENDED = 'SESSION_ENDED',
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
  AUDIO_ENABLED = 'AUDIO_ENABLED',
  AUDIO_DISABLED = 'AUDIO_DISABLED',
  VIDEO_ENABLED = 'VIDEO_ENABLED',
  VIDEO_DISABLED = 'VIDEO_DISABLED',
  SCREEN_SHARE_STARTED = 'SCREEN_SHARE_STARTED',
  SCREEN_SHARE_STOPPED = 'SCREEN_SHARE_STOPPED',
  RECORDING_STARTED = 'RECORDING_STARTED',
  RECORDING_STOPPED = 'RECORDING_STOPPED',
  HAND_RAISED = 'HAND_RAISED',
  HAND_LOWERED = 'HAND_LOWERED',
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',
  CONNECTION_LOST = 'CONNECTION_LOST',
  QUALITY_DEGRADED = 'QUALITY_DEGRADED',
  QUALITY_IMPROVED = 'QUALITY_IMPROVED',
  ERROR = 'ERROR'
}

export enum SignalType {
  OFFER = 'OFFER',
  ANSWER = 'ANSWER',
  ICE_CANDIDATE = 'ICE_CANDIDATE',
  JOIN = 'JOIN',
  LEAVE = 'LEAVE',
  MUTE = 'MUTE',
  UNMUTE = 'UNMUTE',
  START_SCREEN_SHARE = 'START_SCREEN_SHARE',
  STOP_SCREEN_SHARE = 'STOP_SCREEN_SHARE',
  HAND_RAISE = 'HAND_RAISE',
  MESSAGE = 'MESSAGE',
  CONNECTION_STATE = 'CONNECTION_STATE',
  ROOM_UPDATE = 'ROOM_UPDATE',
  ERROR = 'ERROR'
}

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  UNKNOWN = 'UNKNOWN'
}

export enum ConnectionType {
  WIRED = 'WIRED',
  WIFI = 'WIFI',
  CELLULAR = 'CELLULAR',
  UNKNOWN = 'UNKNOWN'
}

// DTOs
export interface CreateMediaSessionDto {
  sessionType: MediaSessionType;
  title: string;
  description?: string;
  maxParticipants?: number;
  isRecordingEnabled?: boolean;
  isScreenShareEnabled?: boolean;
  isWaitingRoomEnabled?: boolean;
  isSecure?: boolean;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMediaSessionDto {
  title?: string;
  description?: string;
  maxParticipants?: number;
  isRecordingEnabled?: boolean;
  isScreenShareEnabled?: boolean;
  isWaitingRoomEnabled?: boolean;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface JoinSessionDto {
  displayName: string;
  email?: string;
  phone?: string;
  role: ParticipantRole;
  hasRecordingConsent?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface UpdateParticipantDto {
  role?: ParticipantRole;
  status?: ParticipantStatus;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isHandRaised?: boolean;
}

export interface SignalMessageDto {
  toParticipantId?: string;
  messageType: SignalType;
  payload: Record<string, any>;
  isBroadcast?: boolean;
}

export interface RecordingConfigDto {
  format: RecordingFormat;
  quality: RecordingQuality;
  isAudioOnly?: boolean;
  isComposite?: boolean;
}

export interface SessionQueryDto {
  sessionType?: MediaSessionType;
  sessionStatus?: SessionStatus;
  createdBy?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface ParticipantQueryDto {
  sessionId?: string;
  userId?: string;
  role?: ParticipantRole;
  status?: ParticipantStatus;
  page?: number;
  limit?: number;
}

export interface RecordingQueryDto {
  sessionId?: string;
  participantId?: string;
  status?: RecordingStatus;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface AnalyticsData {
  totalSessions: number;
  activeSessions: number;
  totalParticipants: number;
  averageSessionDuration: number;
  averageParticipants: number;
  recordingHours: number;
  qualityScoreAvg: number;
  sessionsByType: Record<MediaSessionType, number>;
  sessionsByStatus: Record<SessionStatus, number>;
  topParticipants: Array<{
    participantId: string;
    sessionCount: number;
    totalDuration: number;
  }>;
  qualityTrends: Array<{
    date: string;
    qualityScore: number;
    participantCount: number;
  }>;
}

export interface ConnectionTestDto {
  sessionId: string;
  participantId: string;
  networkStats: NetworkStats;
}
