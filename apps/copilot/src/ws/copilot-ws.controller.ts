import { Server, Socket } from 'socket.io';
import { CopilotService, ConversationContext } from '../services/copilot.service';
import { monitoring } from '../monitoring/observability';
import { SpanStatusCode } from '@opentelemetry/api';

interface AuthenticatedSocket extends Socket {
  agentId?: string;
  agentName?: string;
  conversationId?: string;
}

interface WebSocketMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'status_update' | 'request_recommendations';
  payload: any;
  timestamp: number;
  id: string;
}

export class CopilotWebSocketController {
  private activeConnections: Map<string, AuthenticatedSocket> = new Map();
  private connectionMetadata: Map<string, any> = new Map();

  constructor(
    private readonly io: Server,
    private readonly copilotService: CopilotService
  ) {}

  initialize(): void {
    this.setupMiddleware();
    this.setupConnectionHandlers();
    this.setupEventHandlers();
    
    global.logger.info('Copilot WebSocket controller initialized');
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      const span = monitoring.startSpan('websocket.auth');

      try {
        const token = socket.handshake.auth.token;
        const agentId = socket.handshake.auth.agentId;
        const agentName = socket.handshake.auth.agentName;

        if (!token || !agentId) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Authentication failed: Missing token or agentId',
          });
          span.end();
          return next(new Error('Authentication failed: Missing token or agentId'));
        }

        // TODO: Implement proper JWT validation
        // For now, accept the token as-is in development
        if (process.env.NODE_ENV === 'production') {
          // jwt.verify(token, process.env.JWT_SECRET);
        }

        socket.agentId = agentId;
        socket.agentName = agentName || 'Unknown Agent';

        monitoring.recordEvent('websocket.auth.success', {
          'agent.id': agentId,
          'socket.id': socket.id,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        next();
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.end();
        
        monitoring.recordEvent('websocket.auth.failure', {
          error: error.message,
          'socket.id': socket.id,
        });

        next(new Error('Authentication failed'));
      }
    });

    // Monitoring middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      monitoring.recordEvent('websocket.connection.attempt', {
        'socket.id': socket.id,
      });
      next();
    });
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private setupEventHandlers(): void {
    // Global event handlers for monitoring
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.activeConnections.set(socket.id, socket);

      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      socket.on('error', (error) => {
        this.handleError(socket, error);
      });
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const span = monitoring.startSpan('websocket.connection', {
      'agent.id': socket.agentId!,
      'socket.id': socket.id,
    });

    try {
      global.logger.info('Agent connected to copilot', {
        agentId: socket.agentId,
        socketId: socket.id,
        agentName: socket.agentName,
      });

      // Join agent's personal room for targeted messages
      socket.join(`agent:${socket.agentId}`);

      // Store connection metadata
      this.connectionMetadata.set(socket.id, {
        connectedAt: Date.now(),
        agentId: socket.agentId,
        agentName: socket.agentName,
      });

      // Send connection confirmation
      socket.emit('connected', {
        socketId: socket.id,
        agentId: socket.agentId,
        timestamp: Date.now(),
        message: 'Connected to copilot',
      });

      // Setup message handlers
      this.setupMessageHandlers(socket);

      monitoring.recordEvent('websocket.connection.established', {
        'agent.id': socket.agentId!,
        'socket.id': socket.id,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      global.logger.error('Failed to handle connection', {
        agentId: socket.agentId,
        error: error.message,
      });

      socket.emit('error', {
        type: 'connection_error',
        message: 'Failed to establish connection',
      });
    }
  }

  private setupMessageHandlers(socket: AuthenticatedSocket): void {
    // Handle conversation initialization
    socket.on('conversation:start', async (data) => {
      await this.handleConversationStart(socket, data);
    });

    // Handle incoming messages
    socket.on('message', async (data: WebSocketMessage) => {
      await this.handleMessage(socket, data);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      this.handleTyping(socket, data);
    });

    // Handle read receipts
    socket.on('message:read', (data) => {
      this.handleReadReceipt(socket, data);
    });

    // Handle recommendation requests
    socket.on('recommendations:request', async (data) => {
      await this.handleRecommendationRequest(socket, data);
    });

    // Handle conversation end
    socket.on('conversation:end', async (data) => {
      await this.handleConversationEnd(socket, data);
    });
  }

  private async handleConversationStart(socket: AuthenticatedSocket, data: any): Promise<void> {
    const span = monitoring.startSpan('websocket.conversation.start', {
      'agent.id': socket.agentId!,
      'socket.id': socket.id,
    });

    try {
      const { conversationId, leadId, insuranceType, metadata } = data;

      if (!conversationId) {
        socket.emit('error', {
          type: 'validation_error',
          message: 'conversationId is required',
        });
        return;
      }

      socket.conversationId = conversationId;

      // Join conversation-specific room
      socket.join(`conversation:${conversationId}`);

      // Create conversation context
      const context: ConversationContext = {
        conversationId,
        agentId: socket.agentId!,
        leadId,
        insuranceType,
        messages: [],
        metadata,
      };

      // Notify other agents or systems about the new conversation
      socket.to(`conversation:${conversationId}`).emit('conversation:member_joined', {
        agentId: socket.agentId,
        agentName: socket.agentName,
        timestamp: Date.now(),
      });

      // Send confirmation
      socket.emit('conversation:started', {
        conversationId,
        timestamp: Date.now(),
        message: 'Conversation started',
        context,
      });

      monitoring.recordEvent('conversation.started', {
        'conversation.id': conversationId,
        'agent.id': socket.agentId!,
        'lead.id': leadId,
        'insurance.type': insuranceType,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      global.logger.error('Failed to start conversation', {
        agentId: socket.agentId,
        error: error.message,
      });

      socket.emit('error', {
        type: 'conversation_error',
        message: 'Failed to start conversation',
      });
    }
  }

  private async handleMessage(socket: AuthenticatedSocket, data: WebSocketMessage): Promise<void> {
    const span = monitoring.startSpan('websocket.message', {
      'agent.id': socket.agentId!,
      'socket.id': socket.id,
      'message.type': data.type,
    });

    try {
      if (!socket.conversationId) {
        socket.emit('error', {
          type: 'conversation_error',
          message: 'No active conversation. Start a conversation first.',
        });
        return;
      }

      const { type, payload, id } = data;

      switch (type) {
        case 'message':
          await this.handleChatMessage(socket, payload, id);
          break;
        case 'typing':
          this.handleTyping(socket, payload);
          break;
        case 'request_recommendations':
          await this.handleRecommendationRequest(socket, payload);
          break;
        default:
          socket.emit('error', {
            type: 'validation_error',
            message: `Unknown message type: ${type}`,
          });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      global.logger.error('Failed to handle message', {
        agentId: socket.agentId,
        messageType: data.type,
        error: error.message,
      });

      socket.emit('error', {
        type: 'message_error',
        message: 'Failed to process message',
      });
    }
  }

  private async handleChatMessage(socket: AuthenticatedSocket, payload: any, messageId: string): Promise<void> {
    const { content, role, timestamp } = payload;

    global.logger.debug('Processing chat message', {
      agentId: socket.agentId,
      conversationId: socket.conversationId,
      role,
      messageId,
    });

    // Emit message received confirmation
    socket.emit('message:received', {
      messageId,
      timestamp: Date.now(),
    });

    // Process with copilot service
    const result = await this.copilotService.processMessage(
      socket.conversationId!,
      {
        role,
        content,
        timestamp,
      },
      {
        agentId: socket.agentId!,
        leadId: payload.leadId,
        insuranceType: payload.insuranceType,
      }
    );

    // Send analysis results
    socket.emit('message:analysis', {
      messageId,
      analysis: result.analysis,
      timestamp: Date.now(),
    });

    // Stream recommendations
    socket.emit('recommendations:start', {
      messageId,
      timestamp: Date.now(),
    });

    for (const recommendation of result.recommendations) {
      socket.emit('recommendation', {
        messageId,
        recommendation,
        timestamp: Date.now(),
      });

      // Small delay for more natural streaming feel
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    socket.emit('recommendations:complete', {
      messageId,
      timestamp: Date.now(),
    });

    // Send insights
    for (const insight of result.insights) {
      socket.emit('insight', {
        messageId,
        insight,
        timestamp: Date.now(),
      });
    }

    monitoring.recordEvent('message.processed', {
      'conversation.id': socket.conversationId!,
      'agent.id': socket.agentId!,
      'message.role': role,
      recommendationsCount: result.recommendations.length,
      insightsCount: result.insights.length,
    });
  }

  private handleTyping(socket: AuthenticatedSocket, payload: any): void {
    const { conversationId, isTyping, role } = payload;

    if (!conversationId) return;

    // Broadcast typing indicator to other participants
    socket.to(`conversation:${conversationId}`).emit('typing', {
      agentId: socket.agentId,
      agentName: socket.agentName,
      isTyping,
      role,
      timestamp: Date.now(),
    });

    monitoring.recordEvent('typing.indicator', {
      'conversation.id': conversationId,
      'agent.id': socket.agentId!,
      isTyping,
    });
  }

  private handleReadReceipt(socket: AuthenticatedSocket, payload: any): void {
    const { messageId, conversationId } = payload;

    // Broadcast read receipt
    socket.to(`conversation:${conversationId}`).emit('message:read', {
      messageId,
      agentId: socket.agentId,
      timestamp: Date.now(),
    });

    monitoring.recordEvent('message.read', {
      'message.id': messageId,
      'conversation.id': conversationId,
      'agent.id': socket.agentId!,
    });
  }

  private async handleRecommendationRequest(socket: AuthenticatedSocket, payload: any): Promise<void>
  
  {
    const { message, context } = payload;

    const span = monitoring.startSpan('websocket.recommendations', {
      'agent.id': socket.agentId!,
      'conversation.id': socket.conversationId!,
    });

    try {
      // Stream analysis results
      socket.emit('analysis:start', {
        timestamp: Date.now(),
      });

      const stream = this.copilotService.streamAnalysis(
        socket.conversationId!,
        message,
        {
          agentId: socket.agentId!,
          leadId: context.leadId,
        }
      );

      for await (const item of stream) {
        switch (item.type) {
          case 'analysis':
            socket.emit('analysis:update', item.data);
            break;
          case 'recommendation':
            socket.emit('recommendation', { recommendation: item.data });
            break;
          case 'insight':
            socket.emit('insight', { insight: item.data });
            break;
          case 'complete':
            socket.emit('analysis:complete', item.data);
            break;
        }
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      socket.emit('error', {
        type: 'recommendation_error',
        message: 'Failed to generate recommendations',
      });
    }
  }

  private async handleConversationEnd(socket: AuthenticatedSocket, payload: any): Promise<void>
  
  {
    const { conversationId, reason } = payload;

    if (!conversationId) return;

    const span = monitoring.startSpan('websocket.conversation.end', {
      'agent.id': socket.agentId!,
      'conversation.id': conversationId,
    });

    try {
      // End conversation in copilot service
      this.copilotService.endConversation(conversationId);

      // Leave conversation room
      socket.leave(`conversation:${conversationId}`);

      // Notify other participants
      socket.to(`conversation:${conversationId}`).emit('conversation:member_left', {
        agentId: socket.agentId,
        agentName: socket.agentName,
        timestamp: Date.now(),
        reason,
      });

      // Send confirmation
      socket.emit('conversation:ended', {
        conversationId,
        timestamp: Date.now(),
        reason,
      });

      // Clear conversation ID from socket
      socket.conversationId = undefined;

      monitoring.recordEvent('conversation.ended', {
        'conversation.id': conversationId,
        'agent.id': socket.agentId!,
        reason,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      socket.emit('error', {
        type: 'conversation_end_error',
        message: 'Failed to end conversation',
      });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    const span = monitoring.startSpan('websocket.disconnect', {
      'agent.id': socket.agentId!,
      'socket.id': socket.id,
    });

    global.logger.info('Agent disconnected from copilot', {
      agentId: socket.agentId,
      socketId: socket.id,
      reason,
    });

    // Clean up conversation if needed
    if (socket.conversationId) {
      this.copilotService.endConversation(socket.conversationId);
    }

    // Clean up connection metadata
    this.activeConnections.delete(socket.id);
    this.connectionMetadata.delete(socket.id);

    monitoring.recordEvent('websocket.disconnection', {
      'agent.id': socket.agentId!,
      'socket.id': socket.id,
      reason,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  private handleError(socket: AuthenticatedSocket, error: Error): void {
    global.logger.error('WebSocket error', {
      agentId: socket.agentId,
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
    });

    monitoring.recordEvent('websocket.error', {
      'agent.id': socket.agentId!,
      'socket.id': socket.id,
      error: error.message,
    });
  }

  // Public utility methods
  getActiveConnections(): Array<{
    socketId: string;
    agentId: string;
    agentName: string;
    connectedAt: number;
    conversationId?: string;
  }> {
    return Array.from(this.activeConnections.entries()).map(([socketId, socket]) => {
      const metadata = this.connectionMetadata.get(socketId);
      return {
        socketId,
        agentId: socket.agentId!,
        agentName: socket.agentName || 'Unknown Agent',
        connectedAt: metadata?.connectedAt || Date.now(),
        conversationId: socket.conversationId,
      };
    });
  }

  getMetrics(): any {
    return {
      activeConnections: this.io.engine.clientsCount,
      connectionDetails: this.getActiveConnections(),
      rooms: this.io.sockets.adapter.rooms,
    };
  }

  async broadcastToAgent(agentId: string, event: string, data: any): Promise<void> {
    this.io.to(`agent:${agentId}`).emit(event, data);
  }

  async broadcastToConversation(conversationId: string, event: string, data: any): Promise<void> {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  cleanup(): void {
    this.activeConnections.clear();
    this.connectionMetadata.clear();
  }
}