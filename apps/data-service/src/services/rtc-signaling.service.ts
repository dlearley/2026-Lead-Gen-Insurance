import { PrismaClient } from '@prisma/client';
import { 
  SignalMessage, 
  SignalMessageDto, 
  SignalType,
  CallEventType
} from '@repo/types';
import { v4 as uuidv4 } from 'uuid';
import { createCallLog } from './media-session.service.js';

const prisma = new PrismaClient();

/**
 * Send a signal message
 */
export async function sendSignalMessage(
  sessionId: string,
  fromParticipantId: string,
  dto: SignalMessageDto
): Promise<SignalMessage> {
  const message = await prisma.signalMessage.create({
    data: {
      id: uuidv4(),
      sessionId,
      fromParticipantId,
      toParticipantId: dto.toParticipantId,
      messageType: dto.messageType,
      payload: dto.payload,
      isBroadcast: dto.isBroadcast ?? false,
      timestamp: new Date()
    }
  });

  // Log signal event
  await createCallLog(sessionId, fromParticipantId, CallEventType.CONNECTION_ESTABLISHED, {
    messageType: dto.messageType,
    isBroadcast: dto.isBroadcast,
    timestamp: message.timestamp
  });

  return message;
}

/**
 * Send SDP offer
 */
export async function sendOffer(
  sessionId: string,
  fromParticipantId: string,
  toParticipantId: string,
  sdp: RTCSessionDescriptionInit
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, fromParticipantId, {
    toParticipantId,
    messageType: SignalType.OFFER,
    payload: {
      type: sdp.type,
      sdp: sdp.sdp
    },
    isBroadcast: false
  });
}

/**
 * Send SDP answer
 */
export async function sendAnswer(
  sessionId: string,
  fromParticipantId: string,
  toParticipantId: string,
  sdp: RTCSessionDescriptionInit
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, fromParticipantId, {
    toParticipantId,
    messageType: SignalType.ANSWER,
    payload: {
      type: sdp.type,
      sdp: sdp.sdp
    },
    isBroadcast: false
  });
}

/**
 * Send ICE candidate
 */
export async function sendIceCandidate(
  sessionId: string,
  fromParticipantId: string,
  toParticipantId: string,
  candidate: RTCIceCandidateInit
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, fromParticipantId, {
    toParticipantId,
    messageType: SignalType.ICE_CANDIDATE,
    payload: {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex
    },
    isBroadcast: false
  });
}

/**
 * Send join signal (broadcast)
 */
export async function sendJoinSignal(
  sessionId: string,
  participantId: string,
  participantInfo: {
    displayName: string;
    role: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
  }
): Promise<SignalMessage> {
  const message = await sendSignalMessage(sessionId, participantId, {
    messageType: SignalType.JOIN,
    payload: participantInfo,
    isBroadcast: true
  });

  // Log join event
  await createCallLog(sessionId, participantId, CallEventType.CONNECTION_ESTABLISHED, {
    event: 'participant_joined',
    displayName: participantInfo.displayName
  });

  return message;
}

/**
 * Send leave signal (broadcast)
 */
export async function sendLeaveSignal(
  sessionId: string,
  participantId: string
): Promise<SignalMessage> {
  const message = await sendSignalMessage(sessionId, participantId, {
    messageType: SignalType.LEAVE,
    payload: {},
    isBroadcast: true
  });

  // Log leave event
  await createCallLog(sessionId, participantId, CallEventType.CONNECTION_LOST, {
    event: 'participant_left'
  });

  return message;
}

/**
 * Send mute signal
 */
export async function sendMuteSignal(
  sessionId: string,
  participantId: string,
  targetParticipantId?: string
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, participantId, {
    toParticipantId: targetParticipantId,
    messageType: SignalType.MUTE,
    payload: {
      muted: true,
      participantId
    },
    isBroadcast: !targetParticipantId
  });
}

/**
 * Send unmute signal
 */
export async function sendUnmuteSignal(
  sessionId: string,
  participantId: string,
  targetParticipantId?: string
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, participantId, {
    toParticipantId: targetParticipantId,
    messageType: SignalType.UNMUTE,
    payload: {
      muted: false,
      participantId
    },
    isBroadcast: !targetParticipantId
  });
}

/**
 * Send start screen share signal
 */
export async function sendStartScreenShareSignal(
  sessionId: string,
  participantId: string
): Promise<SignalMessage> {
  const message = await sendSignalMessage(sessionId, participantId, {
    messageType: SignalType.START_SCREEN_SHARE,
    payload: { participantId },
    isBroadcast: true
  });

  // Log screen share start event
  await createCallLog(sessionId, participantId, CallEventType.SCREEN_SHARE_STARTED);

  return message;
}

/**
 * Send stop screen share signal
 */
export async function sendStopScreenShareSignal(
  sessionId: string,
  participantId: string
): Promise<SignalMessage> {
  const message = await sendSignalMessage(sessionId, participantId, {
    messageType: SignalType.STOP_SCREEN_SHARE,
    payload: { participantId },
    isBroadcast: true
  });

  // Log screen share stop event
  await createCallLog(sessionId, participantId, CallEventType.SCREEN_SHARE_STOPPED);

  return message;
}

/**
 * Send hand raise signal
 */
export async function sendHandRaiseSignal(
  sessionId: string,
  participantId: string
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, participantId, {
    messageType: SignalType.HAND_RAISE,
    payload: { 
      participantId,
      raised: true 
    },
    isBroadcast: true
  });
}

/**
 * Send room update signal (broadcast)
 */
export async function sendRoomUpdateSignal(
  sessionId: string,
  participantId: string,
  update: {
    participants?: any[];
    sessionStatus?: string;
    isRecording?: boolean;
    [key: string]: any;
  }
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, participantId, {
    messageType: SignalType.ROOM_UPDATE,
    payload: update,
    isBroadcast: true
  });
}

/**
 * Send error signal
 */
export async function sendErrorSignal(
  sessionId: string,
  participantId: string,
  error: {
    code: string;
    message: string;
    details?: any;
  },
  targetParticipantId?: string
): Promise<SignalMessage> {
  return sendSignalMessage(sessionId, participantId, {
    toParticipantId: targetParticipantId,
    messageType: SignalType.ERROR,
    payload: {
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    },
    isBroadcast: !targetParticipantId
  });
}

/**
 * Get recent signal messages for a session
 */
export async function getSignalMessages(
  sessionId: string,
  fromTimestamp?: Date,
  limit: number = 50
): Promise<SignalMessage[]> {
  const where: any = { sessionId };

  if (fromTimestamp) {
    where.timestamp = {
      gte: fromTimestamp
    };
  }

  return prisma.signalMessage.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit
  });
}

/**
 * Get signal messages for specific participant
 */
export async function getParticipantSignalMessages(
  sessionId: string,
  participantId: string,
  fromTimestamp?: Date,
  limit: number = 50
): Promise<SignalMessage[]> {
  const where: any = {
    sessionId,
    OR: [
      { fromParticipantId: participantId },
      { toParticipantId: participantId },
      { isBroadcast: true }
    ]
  };

  if (fromTimestamp) {
    where.timestamp = {
      gte: fromTimestamp
    };
  }

  return prisma.signalMessage.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit
  });
}

/**
 * Delete old signal messages (cleanup)
 */
export async function cleanupSignalMessages(
  sessionId: string,
  beforeTimestamp: Date
): Promise<number> {
  const result = await prisma.signalMessage.deleteMany({
    where: {
      sessionId,
      timestamp: { lt: beforeTimestamp }
    }
  });

  return result.count;
}

/**
 * Get active signaling connections count
 */
export async function getActiveConnections(sessionId: string): Promise<number> {
  const activeParticipants = await prisma.roomParticipant.count({
    where: {
      sessionId,
      status: 'CONNECTED'
    }
  });

  return activeParticipants;
}

/**
 * Clear all signal messages for a session
 */
export async function clearSignalMessages(sessionId: string): Promise<number> {
  const result = await prisma.signalMessage.deleteMany({
    where: { sessionId }
  });

  return result.count;
}