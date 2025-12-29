import { PrismaClient } from '@prisma/client';
import { 
  MediaRecording, 
  RecordingConfigDto,
  RecordingQueryDto,
  RecordingStatus,
  CallEventType,
  GenerateRecordingId
} from '@repo/types';
import { v4 as uuidv4 } from 'uuid';
import { createCallLog } from './media-session.service.js';

const prisma = new PrismaClient();

/**
 * Generate unique recording ID
 */
export function generateRecordingId(): string {
  return `rec_${uuidv4()}`;
}

/**
 * Start recording for a session
 */
export async function startRecording(
  sessionId: string,
  participantId: string,
  config: RecordingConfigDto
): Promise<MediaRecording> {
  const recordingId = generateRecordingId();

  // Check if recording is already in progress for this session
  const existingRecording = await prisma.mediaRecording.findFirst({
    where: {
      sessionId,
      status: {
        in: [RecordingStatus.STARTED, RecordingStatus.IN_PROGRESS]
      }
    }
  });

  if (existingRecording) {
    throw new Error('Recording already in progress for this session');
  }

  const recording = await prisma.mediaRecording.create({
    data: {
      recordingId,
      sessionId,
      participantId,
      format: config.format,
      quality: config.quality,
      isAudioOnly: config.isAudioOnly ?? false,
      isComposite: config.isComposite ?? false,
      status: RecordingStatus.STARTED,
      startTime: new Date()
    }
  });

  // Log recording start event
  await createCallLog(sessionId, participantId, CallEventType.RECORDING_STARTED, {
    recordingId,
    format: config.format,
    quality: config.quality,
    isAudioOnly: config.isAudioOnly,
    isComposite: config.isComposite
  });

  return recording;
}

/**
 * Start individual participant recording
 */
export async function startIndividualRecording(
  sessionId: string,
  participantId: string,
  config: RecordingConfigDto
): Promise<MediaRecording> {
  const recordingId = generateRecordingId();

  const recording = await prisma.mediaRecording.create({
    data: {
      recordingId,
      sessionId,
      participantId,
      format: config.format,
      quality: config.quality,
      isAudioOnly: config.isAudioOnly ?? false,
      isComposite: false, // Individual recording is never composite
      status: RecordingStatus.STARTED,
      startTime: new Date()
    }
  });

  // Log individual recording start event
  await createCallLog(sessionId, participantId, CallEventType.RECORDING_STARTED, {
    recordingId,
    format: config.format,
    quality: config.quality,
    type: 'individual'
  });

  return recording;
}

/**
 * Stop recording
 */
export async function stopRecording(
  recordingId: string,
  sessionId: string,
  participantId: string
): Promise<MediaRecording> {
  const recording = await prisma.mediaRecording.findUnique({
    where: { recordingId }
  });

  if (!recording) {
    throw new Error('Recording not found');
  }

  if (recording.endTime) {
    throw new Error('Recording already stopped');
  }

  const now = new Date();
  const duration = Math.floor((now.getTime() - recording.startTime.getTime()) / 1000);

  const updatedRecording = await prisma.mediaRecording.update({
    where: { recordingId },
    data: {
      status: RecordingStatus.STOPPED,
      endTime: now,
      duration: duration
    }
  });

  // Log recording stop event
  await createCallLog(sessionId, participantId, CallEventType.RECORDING_STOPPED, {
    recordingId,
    duration,
    format: recording.format
  });

  return updatedRecording;
}

/**
 * Update recording status
 */
export async function updateRecordingStatus(
  recordingId: string,
  status: RecordingStatus,
  storageUrl?: string,
  fileSize?: number
): Promise<MediaRecording> {
  const updateData: any = { status };

  if (storageUrl) {
    updateData.storageUrl = storageUrl;
  }

  if (fileSize) {
    updateData.fileSize = fileSize;
  }

  return prisma.mediaRecording.update({
    where: { recordingId },
    data: updateData
  });
}

/**
 * Get recording by ID
 */
export async function getRecording(recordingId: string): Promise<MediaRecording | null> {
  return prisma.mediaRecording.findUnique({
    where: { recordingId }
  });
}

/**
 * Get recordings for a session
 */
export async function getSessionRecordings(sessionId: string): Promise<MediaRecording[]> {
  return prisma.mediaRecording.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * List recordings with filters
 */
export async function listRecordings(query: RecordingQueryDto): Promise<{
  recordings: MediaRecording[];
  total: number;
}> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.sessionId) {
    where.sessionId = query.sessionId;
  }

  if (query.participantId) {
    where.participantId = query.participantId;
  }

  if (query.status) {
    where.status = query.status;
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

  const [recordings, total] = await Promise.all([
    prisma.mediaRecording.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.mediaRecording.count({ where })
  ]);

  return { recordings, total };
}

/**
 * Delete recording
 */
export async function deleteRecording(recordingId: string): Promise<MediaRecording> {
  return prisma.mediaRecording.update({
    where: { recordingId },
    data: {
      status: RecordingStatus.DELETED,
      storageUrl: null // Remove storage reference
    }
  });
}

/**
 * Create composite recording (all participants mixed)
 */
export async function createCompositeRecording(
  sessionId: string,
  participantId: string,
  config: RecordingConfigDto
): Promise<MediaRecording> {
  const recordingId = generateRecordingId();

  const recording = await prisma.mediaRecording.create({
    data: {
      recordingId,
      sessionId,
      participantId,
      format: config.format,
      quality: config.quality,
      isAudioOnly: config.isAudioOnly ?? false,
      isComposite: true,
      status: RecordingStatus.STARTED,
      startTime: new Date()
    }
  });

  // Log composite recording start event
  await createCallLog(sessionId, participantId, CallEventType.RECORDING_STARTED, {
    recordingId,
    format: config.format,
    quality: config.quality,
    type: 'composite'
  });

  return recording;
}

/**
 * Process recording (set status to PROCESSING)
 */
export async function processRecording(recordingId: string): Promise<MediaRecording> {
  return prisma.mediaRecording.update({
    where: { recordingId },
    data: {
      status: RecordingStatus.PROCESSING,
      metadata: {
        processingStartedAt: new Date().toISOString()
      }
    }
  });
}

/**
 * Complete recording processing (set status to READY)
 */
export async function completeRecordingProcessing(
  recordingId: string,
  storageUrl: string,
  fileSize: number
): Promise<MediaRecording> {
  return prisma.mediaRecording.update({
    where: { recordingId },
    data: {
      status: RecordingStatus.READY,
      storageUrl,
      fileSize,
      metadata: {
        processingCompletedAt: new Date().toISOString()
      }
    }
  });
}

/**
 * Get recording statistics for a session
 */
export async function getRecordingStats(sessionId: string): Promise<{
  totalRecordings: number;
  totalDuration: number;
  totalFileSize: number;
  recordingsByFormat: Record<string, number>;
  recordingsByStatus: Record<string, number>;
}> {
  const recordings = await prisma.mediaRecording.findMany({
    where: { sessionId }
  });

  const stats = recordings.reduce((acc, recording) => {
    acc.totalRecordings++;
    acc.totalDuration += recording.duration;
    acc.totalFileSize += recording.fileSize || 0;

    acc.recordingsByFormat[recording.format] = 
      (acc.recordingsByFormat[recording.format] || 0) + 1;

    acc.recordingsByStatus[recording.status] = 
      (acc.recordingsByStatus[recording.status] || 0) + 1;

    return acc;
  }, {
    totalRecordings: 0,
    totalDuration: 0,
    totalFileSize: 0,
    recordingsByFormat: {} as Record<string, number>,
    recordingsByStatus: {} as Record<string, number>
  });

  return stats;
}

/**
 * Cleanup old recordings (mark as DELETED)
 */
export async function cleanupOldRecordings(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.mediaRecording.updateMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { not: RecordingStatus.DELETED }
    },
    data: {
      status: RecordingStatus.DELETED,
      storageUrl: null
    }
  });

  return result.count;
}

/**
 * Get storage usage statistics
 */
export async function getStorageUsage(): Promise<{
  totalStorageMB: number;
  audioStorageMB: number;
  videoStorageMB: number;
  recordingCount: number;
  averageFileSize: number;
}> {
  const recordings = await prisma.mediaRecording.findMany({
    where: {
      status: { not: RecordingStatus.DELETED },
      fileSize: { not: null }
    }
  });

  const totalStorageBytes = recordings.reduce((sum, r) => sum + (r.fileSize || 0), 0);
  const audioRecordings = recordings.filter(r => r.isAudioOnly);
  const videoRecordings = recordings.filter(r => !r.isAudioOnly);

  return {
    totalStorageMB: Math.round(totalStorageBytes / (1024 * 1024)),
    audioStorageMB: Math.round(audioRecordings.reduce((sum, r) => sum + (r.fileSize || 0), 0) / (1024 * 1024)),
    videoStorageMB: Math.round(videoRecordings.reduce((sum, r) => sum + (r.fileSize || 0), 0) / (1024 * 1024)),
    recordingCount: recordings.length,
    averageFileSize: recordings.length > 0 ? Math.round(totalStorageBytes / recordings.length / 1024 / 1024) : 0
  };
}