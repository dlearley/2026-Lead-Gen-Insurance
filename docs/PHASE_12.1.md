# Phase 12.1: Voice/Video Core Communication - Implementation Guide

## Overview

Phase 12.1 implements comprehensive real-time voice and video communication capabilities for the Insurance Lead Generation AI Platform. This foundational communication layer enables agents and customers to connect via voice calls, video conferences, and screen sharing sessions, directly within the platform.

## Key Features Implemented

### 1. Media Session Management
- **Session Creation**: Create voice, video, screen share, and broadcast sessions
- **Session Lifecycle**: Start, pause, resume, and end sessions with full state management
- **Room Management**: Virtual rooms with configurable capacity (1:1, group meetings, broadcasts)
- **Security**: Encrypted sessions with participant authentication
- **Recording**: Optional session recording with consent management

### 2. Participant Management
- **Multi-Role Support**: Host, co-host, moderator, participant, and viewer roles
- **Participant Controls**: Join, leave, remove participants
- **Media Controls**: Mute/unmute audio, enable/disable video per participant
- **Hand Raising**: Non-verbal communication signal
- **Waiting Room**: Pre-session staging area with host approval
- **Presence Tracking**: Real-time participant status and last seen

### 3. Real-Time Communication (WebRTC Signaling)
- **SDP Exchange**: Session Description Protocol for establishing peer connections
- **ICE Candidates**: Interactive Connectivity Establishment for NAT traversal
- **Signaling Server**: Complete WebRTC signaling implementation
- **Quality Monitoring**: Network stats and connection quality tracking
- **Automatic Reconnection**: Handle connection drops and quality degradation
- **Browser/Device Info**: Capture participant device and browser details

### 4. Recording & Storage
- **Recording Types**: Individual and composite (mixed) recordings
- **Multiple Formats**: MP4, WebM (video), MP3, WAV, M4A (audio)
- **Quality Settings**: Low, Medium, High, HD, Full HD, 4K options
- **Audio-Only Mode**: Record audio without video for bandwidth optimization
- **Cloud Storage**: Integration-ready storage system with metadata tracking
- **Processing Pipeline**: Transcoding and preparation for playback

### 5. Analytics & Monitoring
- **Session Analytics**: Usage statistics and trends
- **Quality Metrics**: Audio/video quality, network performance
- **Participation Tracking**: Join/leave times, engagement metrics
- **Recording Analytics**: Storage usage, recording duration statistics
- **Connection Health**: Network latency, jitter, packet loss monitoring

## Architecture

### System Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│  Data Service    │────▶│   PostgreSQL    │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   WebRTC Client  │
                        │  (Browser/Mobile)│
                        └──────────────────┘
```

### Data Flow

1. **Session Creation**: Client → API → Data Service → Database
2. **Participant Join**: Client → API → Data Service → Database + Signaling
3. **WebRTC Setup**: Client ↔ Signaling Service ↔ Other Clients (via API)
4. **Recording**: Media Service → Storage → Database metadata
5. **Analytics**: Database → Analytics Service → Client Dashboard

### Technology Stack

- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL with JSONB for flexible metadata
- **Real-time**: WebRTC with custom signaling server
- **Recording**: Integration-ready for media server (Kurento, Janus)
- **Storage**: Abstracted interface (AWS S3, GCP Storage compatible)

## Database Schema

### MediaSession Model

```typescript
model MediaSession {
  sessionId            String            @unique
  sessionType          MediaSessionType  // VOICE, VIDEO, SCREEN_SHARE, BROADCAST
  sessionStatus        SessionStatus     // SCHEDULED, IN_PROGRESS, ENDED, etc.
  title                String
  createdBy            String            // User ID
  maxParticipants      Int?              // Optional participant limit
  isRecordingEnabled   Boolean           @default(false)
  isScreenShareEnabled Boolean           @default(true)
  isWaitingRoomEnabled Boolean           @default(false)
  isSecure             Boolean           @default(true)
  roomUrl              String            // Join URL
  startTime            DateTime?
  endTime              DateTime?
  duration             Int               @default(0)
  qualityScore         Float?
  
  // Relationships
  participants         RoomParticipant[]
  recordings           MediaRecording[]
  callLogs             CallLog[]
  signalMessages       SignalMessage[]
}
```

### RoomParticipant Model

```typescript
model RoomParticipant {
  sessionId            String
  participantId        String
  userId               String?           // Optional platform user mapping
  displayName          String
  email                String?
  role                 ParticipantRole   // HOST, CO_HOST, MODERATOR, PARTICIPANT, VIEWER
  status               ParticipantStatus // INVITED, JOINING, CONNECTED, etc.
  isAudioEnabled       Boolean           @default(false)
  isVideoEnabled       Boolean           @default(false)
  isScreenSharing      Boolean           @default(false)
  isHandRaised         Boolean           @default(false)
  hasRecordingConsent  Boolean           @default(false)
  browserInfo          Json?            // Browser name, version, platform
  deviceInfo           Json?            // Device type, media devices
  networkStats         Json?            // RTT, jitter, packet loss, bandwidth
  joinedAt             DateTime          @default(now())
  leftAt               DateTime?
  lastSeenAt           DateTime          @updatedAt
  
  @@unique([sessionId, participantId])
}
```

### MediaRecording Model

```typescript
model MediaRecording {
  recordingId       String           @unique
  sessionId         String
  participantId     String?          // Null for composite recordings
  format            RecordingFormat  // MP4, WEBM, MP3, WAV, M4A
  status            RecordingStatus  // STARTED, IN_PROGRESS, COMPLETED, etc.
  storageUrl        String?          // Cloud storage URL
  fileSize          Int?             // Bytes
  duration          Int              @default(0) // Seconds
  quality           RecordingQuality // LOW, MEDIUM, HIGH, HD, FULL_HD, _4K
  isAudioOnly       Boolean          @default(false)
  isComposite       Boolean          @default(false) // Mixed all participants
  startTime         DateTime         @default(now())
  endTime           DateTime?
  transcriptionId   String?          // Link to transcription if enabled
}
```

## API Endpoints

### Media Sessions API

#### Create Session
```http
POST /api/v1/media-sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionType": "VIDEO",
  "title": "Customer Consultation - John Smith",
  "description": "Auto insurance consultation for new lead",
  "maxParticipants": 3,
  "isRecordingEnabled": true,
  "isScreenShareEnabled": true,
  "isSecure": true,
  "metadata": {
    "leadId": "lead_123",
    "agentId": "agent_456"
  }
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "sessionType": "VIDEO",
  "sessionStatus": "SCHEDULED",
  "title": "Customer Consultation - John Smith",
  "roomUrl": "/room/sess_abc123",
  "isRecordingEnabled": true,
  "participants": [],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Join Session
```http
POST /api/v1/media-sessions/{sessionId}/join
Content-Type: application/json

{
  "displayName": "John Agent",
  "email": "john@insurance.com",
  "role": "HOST",
  "hasRecordingConsent": true,
  "deviceInfo": {
    "deviceType": "DESKTOP",
    "audioInputDevice": {
      "deviceId": "mic123",
      "label": "Built-in Microphone"
    }
  }
}
```

**Response:**
```json
{
  "participantId": "part_xyz789",
  "displayName": "John Agent",
  "role": "HOST",
  "status": "JOINING",
  "isAudioEnabled": false,
  "isVideoEnabled": false,
  "joinedAt": "2024-01-15T10:35:00Z",
  "roomUrl": "/room/sess_abc123"
}
```

#### Start Session
```http
POST /api/v1/media-sessions/{sessionId}/start
Authorization: Bearer <token>
```

**Response:** Updates session status to "IN_PROGRESS" and records start time.

#### Session Analytics
```http
GET /api/v1/media-sessions/analytics
```

**Response:**
```json
{
  "totalSessions": 152,
  "activeSessions": 3,
  "totalParticipants": 487,
  "averageSessionDuration": 1847,
  "recordingHours": 78,
  "qualityScoreAvg": 8.5,
  "sessionsByType": {
    "VOICE": 89,
    "VIDEO": 45,
    "SCREEN_SHARE": 18
  },
  "topParticipants": [
    {
      "participantId": "part_user123",
      "sessionCount": 45,
      "totalDuration": 16200
    }
  ]
}
```

### Participants API

#### Update Participant
```http
PUT /api/v1/media-sessions/{sessionId}/participants/{participantId}
Content-Type: application/json

{
  "isAudioEnabled": true,
  "isVideoEnabled": true,
  "isHandRaised": false
}
```

#### List Participants
```http
GET /api/v1/media-sessions/{sessionId}/participants?status=CONNECTED
```

**Response:**
```json
{
  "participants": [
    {
      "participantId": "part_xyz789",
      "displayName": "John Agent",
      "role": "HOST",
      "status": "CONNECTED",
      "isAudioEnabled": true,
      "isVideoEnabled": true,
      "joinedAt": "2024-01-15T10:35:00Z",
      "lastSeenAt": "2024-01-15T11:15:00Z"
    }
  ],
  "total": 1
}
```

### Recordings API

#### Start Recording
```http
POST /api/v1/media-sessions/{sessionId}/recordings/start
Content-Type: application/json

{
  "format": "MP4",
  "quality": "HD",
  "isAudioOnly": false,
  "isComposite": true
}
```

**Response:**
```json
{
  "recordingId": "rec_abc456",
  "sessionId": "sess_abc123",
  "format": "MP4",
  "quality": "HD",
  "status": "STARTED",
  "isComposite": true,
  "startTime": "2024-01-15T10:40:00Z",
  "duration": 0
}
```

#### Stop Recording
```http
POST /api/v1/media-recordings/{recordingId}/stop
```

#### Get Recording
```http
GET /api/v1/media-recordings/{recordingId}
```

**Response:**
```json
{
  "recordingId": "rec_abc456",
  "sessionId": "sess_abc123",
  "format": "MP4",
  "quality": "HD",
  "status": "READY",
  "storageUrl": "https://storage.example.com/recordings/rec_abc456.mp4",
  "fileSize": 52428800,
  "duration": 2340,
  "isComposite": true,
  "startTime": "2024-01-15T10:40:00Z",
  "endTime": "2024-01-15T11:19:00Z"
}
```

#### Recording Statistics
```http
GET /api/v1/media-sessions/{sessionId}/recordings/stats
```

**Response:**
```json
{
  "totalRecordings": 45,
  "totalDuration": 128340,
  "totalFileSize": 2147483648,
  "recordingsByFormat": {
    "MP4": 32,
    "WEBM": 13
  },
  "recordingsByStatus": {
    "READY": 42,
    "PROCESSING": 2,
    "FAILED": 1
  }
}
```

#### Storage Usage
```http
GET /api/v1/media-recordings/stats/storage
```

**Response:**
```json
{
  "totalStorageMB": 2048,
  "audioStorageMB": 256,
  "videoStorageMB": 1792,
  "recordingCount": 45,
  "averageFileSize": 45
}
```

### RTC Signaling API

#### Send WebRTC Offer
```http
POST /api/v1/rtc-signal/{sessionId}/offer
Content-Type: application/json

{
  "toParticipantId": "part_xyz789",
  "sdp": {
    "type": "offer",
    "sdp": "v=0\r\no=-..."
  }
}
```

#### Send ICE Candidate
```http
POST /api/v1/rtc-signal/{sessionId}/ice-candidate
Content-Type: application/json

{
  "toParticipantId": "part_xyz789",
  "candidate": {
    "candidate": "candidate:8421630491 1 udp 1677729535 ...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

#### Join Signal (Broadcast)
```http
POST /api/v1/rtc-signal/{sessionId}/join
Content-Type: application/json

{
  "displayName": "John Agent",
  "role": "HOST",
  "isAudioEnabled": true,
  "isVideoEnabled": true
}
```

#### Get Recent Messages
```http
GET /api/v1/rtc-signal/{sessionId}/messages?limit=50
```

**Response:**
```json
[
  {
    "id": "msg_123",
    "sessionId": "sess_abc123",
    "fromParticipantId": "part_xyz789",
    "messageType": "JOIN",
    "payload": {
      "displayName": "John Agent",
      "role": "HOST"
    },
    "isBroadcast": true,
    "timestamp": "2024-01-15T10:35:00Z"
  }
]
```

## WebRTC Integration Guide

### Client-Side Implementation Required

The API provides the signaling infrastructure, but you need to implement WebRTC on the client side. Here's how:

#### 1. Session Join Flow

```javascript
// 1. Create or get session
const session = await fetch('/api/v1/media-sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionType: 'VIDEO',
    title: 'Consultation'
  })
}).then(r => r.json());

// 2. Join session
const participant = await fetch(`/api/v1/media-sessions/${session.sessionId}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    displayName: 'John Agent',
    role: 'HOST'
  })
}).then(r => r.json());

// 3. Start session
await fetch(`/api/v1/media-sessions/${session.sessionId}/start`, {
  method: 'POST'
});
```

#### 2. WebRTC Setup

```javascript
// Initialize peer connection
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add your TURN servers for production
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
});

// Get user media
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// Add tracks to peer connection
stream.getTracks().forEach(track => {
  peerConnection.addTrack(track, stream);
});

// Handle incoming tracks
peerConnection.ontrack = (event) => {
  const remoteVideo = document.getElementById('remoteVideo');
  if (remoteVideo.srcObject !== event.streams[0]) {
    remoteVideo.srcObject = event.streams[0];
  }
};

// Collect ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    fetch(`/api/v1/rtc-signal/${sessionId}/ice-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toParticipantId: targetParticipantId,
        candidate: event.candidate
      })
    });
  }
};
```

#### 3. Signaling Implementation

```javascript
// Poll for messages (or use WebSockets for production)
async function pollMessages(sessionId, participantId) {
  const messages = await fetch(
    `/api/v1/rtc-signal/${sessionId}/participants/${participantId}/messages`
  ).then(r => r.json());

  for (const message of messages) {
    await handleSignalMessage(message);
  }
}

async function handleSignalMessage(message) {
  switch (message.messageType) {
    case 'OFFER':
      await handleOffer(message);
      break;
    case 'ANSWER':
      await handleAnswer(message);
      break;
    case 'ICE_CANDIDATE':
      await handleIceCandidate(message);
      break;
  }
}

async function handleOffer(message) {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(message.payload)
  );
  
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  // Send answer back
  await fetch(`/api/v1/rtc-signal/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toParticipantId: message.fromParticipantId,
      sdp: answer
    })
  });
}

async function handleAnswer(message) {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(message.payload)
  );
}

async function handleIceCandidate(message) {
  await peerConnection.addIceCandidate(
    new RTCIceCandidate(message.payload)
  );
}
```

#### 4. Initiate Call

```javascript
async function initiateCall(sessionId, targetParticipantId) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  await fetch(`/api/v1/rtc-signal/${sessionId}/offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toParticipantId: targetParticipantId,
      sdp: offer
    })
  });
}
```

## Common Use Cases

### 1. 1-on-1 Agent-Customer Video Call

```javascript
// Agent initiates call with customer
const session = await createMediaSession(agentId, {
  sessionType: 'VIDEO',
  title: 'Consultation with Customer',
  maxParticipants: 2,
  isRecordingEnabled: true
});

// Send invitation to customer
const roomUrl = `${window.location.origin}/join/${session.sessionId}`;
sendEmail(customer.email, 'Join Video Call', `Click here: ${roomUrl}`);

// Customer joins via shared URL
const participant = await joinMediaSession(session.sessionId, {
  displayName: customer.name,
  role: 'PARTICIPANT',
  hasRecordingConsent: true
});
```

### 2. Team Meeting with Screen Sharing

```javascript
// Create team meeting
const session = await createMediaSession(hostId, {
  sessionType: 'VIDEO',
  title: 'Weekly Team Sync',
  maxParticipants: 10,
  isScreenShareEnabled: true,
  isRecordingEnabled: true
});

// Team members join
// During meeting, any participant can share screen
await fetch(`/api/v1/rtc-signal/${sessionId}/screen-share/start`, {
  method: 'POST',
  headers: { 'x-participant-id': participantId }
});
```

### 3. Customer Support Broadcast

```javascript
// Create broadcast session
const session = await createMediaSession(hostId, {
  sessionType: 'BROADCAST',
  title: 'Q&A: Understanding Auto Insurance',
  isRecordingEnabled: true
});

// Host can manage participants (mute, remove)
await fetch(`/api/v1/media-sessions/${sessionId}/participants/${participantId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ isAudioEnabled: false })
});
```

## Security Considerations

### 1. Authentication
- All API endpoints require authentication via JWT tokens
- Participant endpoints require participant ID in headers
- Sessions can be secured with room passwords (implementation-ready)

### 2. Consent Management
- Recording consent explicitly tracked per participant
- Visual indicators for active recording
- GDPR-compliant data handling

### 3. Encryption
- WebRTC provides end-to-end encryption for media streams
- Signaling messages are server-side encrypted
- Database encryption for stored recordings

## Performance Optimization

### 1. Connection Quality
```javascript
// Monitor network quality
peerConnection.getStats().then(stats => {
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      const qualityScore = calculateQualityScore(report);
      // Update participant network stats
      fetch(`/api/v1/media-sessions/${sessionId}/participants/${participantId}`, {
        method: 'PUT',
        body: JSON.stringify({
          networkStats: {
            connectionScore: qualityScore,
            timestamp: new Date().toISOString()
          }
        })
      });
    }
  });
});
```

### 2. Bandwidth Management
- Adaptive bitrate based on network conditions
- Optional audio-only mode for poor connections
- Automatic quality adjustment recommendations

## Monitoring & Logging

### Session Events Tracked
- SESSION_STARTED/ENDED
- PARTICIPANT_JOINED/LEFT
- AUDIO/VIDEO_ENABLED/DISABLED
- SCREEN_SHARE_STARTED/STOPPED
- RECORDING_STARTED/STOPPED
- CONNECTION_ESTABLISHED/LOST
- QUALITY_DEGRADED/IMPROVED

### Analytics Dashboard Integration
```javascript
// Get session metrics for dashboard
const analytics = await fetch('/api/v1/media-sessions/analytics').then(r => r.json());

// Display in UI:
// - Total sessions this week
// - Average call duration
// - Most active agents
// - Recording storage usage
```

## Next Steps & Future Enhancements

### Phase 12.2 (Scheduled Enhancements)
- [ ] **Live Transcription**: Real-time speech-to-text with speaker identification
- [ ] **AI Assistance**: Real-time coaching suggestions for agents
- [ ] **Sentiment Analysis**: Track customer emotions during calls
- [ ] **Call Summarization**: Automatic summary generation
- [ ] **CRM Integration**: Link calls to customer records automatically
- [ ] **Advanced Analytics**: Deeper insights into call effectiveness

### Phase 12.3 (Premium Features)
- [ ] **Virtual Backgrounds**: Replace backgrounds without green screen
- [ ] **Call Scheduling**: Integrated calendar booking
- [ ] **Call Queuing**: Queue system for high-traffic periods
- [ ] **Quality-Based Routing**: Route to agents with best connection
- [ ] **Mobile SDK**: Native iOS/Android SDK development

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check ICE server configuration
   - Verify network firewall settings
   - Ensure proper SSL certificates

2. **Recording Not Working**
   - Confirm recording consent from all participants
   - Check storage service credentials
   - Verify sufficient storage space

3. **Poor Video Quality**
   - Monitor networkStats for high latency/packet loss
   - Reduce video resolution dynamically
   - Switch to audio-only if bandwidth is limited

### Debug Endpoints

```javascript
// Get participant network stats
const participant = await getParticipant(sessionId, participantId);
console.log('Network Stats:', participant.networkStats);

// Get session logs for debugging
const session = await getMediaSession(sessionId);
console.log('Recent events:', session.callLogs.slice(0, 10));
```

## API Reference Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/media-sessions` | POST | Create new media session |
| `/media-sessions/{id}` | GET | Get session details |
| `/media-sessions/{id}/join` | POST | Join session as participant |
| `/media-sessions/{id}/participants` | GET | List participants |
| `/media-sessions/{id}/start` | POST | Start session |
| `/media-sessions/{id}/end` | POST | End session |
| `/media-recordings/{id}/start` | POST | Start recording |
| `/media-recordings/{id}/stop` | POST | Stop recording |
| `/rtc-signal/{id}/offer` | POST | Send WebRTC offer |
| `/rtc-signal/{id}/answer` | POST | Send WebRTC answer |
| `/rtc-signal/{id}/ice-candidate` | POST | Send ICE candidate |
| `/media-sessions/analytics` | GET | Get usage analytics |

## Support & Resources

- **Documentation**: See individual route files for detailed endpoints
- **Type Definitions**: `@repo/types/src/voice-video.ts`
- **Service Layer**: `apps/data-service/src/services/media-*.service.ts`
- **Database Schema**: `prisma/schema.prisma` (MediaSession, RoomParticipant, MediaRecording models)

---

**Implementation Status**: ✅ Phase 12.1 Complete - Core voice/video infrastructure ready for integration and testing.
