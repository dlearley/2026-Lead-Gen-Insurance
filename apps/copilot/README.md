# Copilot Service

AI-Powered Agent Copilot & Conversation Intelligence System for insurance lead interactions.

## Overview

The Copilot Service provides real-time AI assistance to insurance agents during lead conversations. It analyzes conversations, generates insights, and offers actionable recommendations to improve conversion rates and agent performance.

## Features

### Real-Time Conversation Analysis
- **Sentiment Analysis**: Detect lead sentiment (positive, neutral, negative)
- **Intent Detection**: Identify conversation intent (information seeking, price shopping, objection handling, etc.)
- **Entity Extraction**: Extract products, amounts, dates, contacts automatically
- **Context Awareness**: Understand conversation history and flow

### AI-Powered Recommendations
- **Response Suggestions**: Context-aware response templates
- **Next-Best-Actions**: AI-recommended actions based on conversation state
- **Knowledge Base**: Instant access to product info, scripts, compliance
- **Coaching Tips**: Real-time performance coaching for agents

### Performance Insights
- **Real-time Metrics**: Response times, message balance, conversation quality
- **Peer Benchmarking**: Compare performance against team averages
- **Trend Analysis**: Track improvement over time
- **Personalized Feedback**: Individualized coaching insights

## Architecture

```
Agent UI (WebSocket) → Copilot Service → OpenAI GPT-4
    ↓                          ↓                      ↓
Sentiment Analysis      Recommendations        Natural Language
Intent Detection        Knowledge Search       Understanding
Entity Extraction       Performance Insights   Response Generation
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.3+
- **WebSockets**: Socket.IO 4.7+
- **AI/ML**: OpenAI GPT-4, LangChain
- **Vector DB**: Qdrant for semantic search
- **Observability**: OpenTelemetry, Prometheus, Winston
- **API**: Express + Socket.IO

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- OpenAI API Key
- Qdrant instance (for knowledge base)

### Installation

```bash
# From project root
pnpm install

# Build copilot service
pnpm --filter @insurance/copilot build
```

### Environment Setup

Create `.env` file in `apps/copilot/`:

```env
# Service Configuration
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4-turbo-preview
EMBEDDING_MODEL=text-embedding-3-small

# Qdrant Vector DB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_key

# OpenTelemetry (Optional)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4317
PROMETHEUS_PORT=9092
```

### Running the Service

```bash
# Development mode with hot reload
pnpm --filter @insurance/copilot dev

# Production mode
pnpm --filter @insurance/copilot build
pnpm --filter @insurance/copilot start

# Run tests
pnpm --filter @insurance/copilot test

# Seed knowledge base
pnpm --filter @insurance/copilot kb:seed
```

## WebSocket API

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token',
    agentId: 'agent-123',
    agentName: 'John Doe'
  }
});
```

### Events

#### Starting a Conversation

```javascript
socket.emit('conversation:start', {
  conversationId: 'conv-456',
  leadId: 'lead-789',
  insuranceType: 'auto',
  metadata: {
    source: 'web-form',
    priority: 'high'
  }
});
```

#### Sending Messages

```javascript
// From agent
socket.emit('message', {
  type: 'message',
  payload: {
    content: 'Hello! How can I help you today?',
    role: 'agent',
    timestamp: Date.now()
  },
  id: 'msg-001'
});

// From lead (received from your system)
socket.emit('message', {
  type: 'message',
  payload: {
    content: "I'm looking for auto insurance",
    role: 'lead',
    timestamp: Date.now()
  },
  id: 'msg-002'
});
```

#### Receiving Analysis

```javascript
// Real-time analysis updates
socket.on('message:analysis', (data) => {
  console.log('Conversation analysis:', data.analysis);
  // {
  //   sentiment: { score: 0.8, label: 'positive', confidence: 92 },
  //   intent: { primary: 'INFORMATION_SEEKING', confidence: 85 },
  //   entities: [...],
  //   engagement: 75
  // }
});

// AI recommendations
socket.on('recommendation', (data) => {
  console.log('AI recommendation:', data.recommendation);
  // {
  //   id: 'resp-123',
  //   type: 'response',
  //   title: 'Provide Information',
  //   content: 'I can help you with auto insurance...',
  //   confidence: 88,
  //   priority: 'high'
  // }
});

// Performance insights
socket.on('insight', (data) => {
  console.log('Performance insight:', data.insight);
  // {
  //   id: 'ins-456',
  //   type: 'coaching',
  //   title: 'Show Empathy',
  //   description: 'Lead is expressing concerns...',
  //   actionable: true
  // }
});
```

#### Typing Indicators

```javascript
// Send typing indicator
socket.emit('typing', {
  conversationId: 'conv-456',
  isTyping: true,
  role: 'agent'
});

// Receive typing indicator
socket.on('typing', (data) => {
  console.log(`${data.agentName} is typing...`);
});
```

#### Ending Conversation

```javascript
socket.emit('conversation:end', {
  conversationId: 'conv-456',
  reason: 'completed'
});
```

## Knowledge Base

The copilot includes a vector-based knowledge base for semantic search.

### Adding Articles

```typescript
import { KnowledgeBaseService } from './services/knowledge-base.service';

const kb = new KnowledgeBaseService();
await kb.initialize();

await kb.addArticle({
  title: 'Auto Insurance FAQ: Coverage Types',
  content: 'Liability coverage pays for damage you cause to others...',
  category: 'auto',
  tags: ['auto', 'coverage', 'liability', 'faq'],
  source: 'internal-docs'
});
```

### Searching

```typescript
// Semantic search
const results = await kb.search('What does liability cover?', {
  top_k: 5,
  filter: { category: 'auto' }
});

// Search by category
const articles = await kb.searchByCategory('auto', 10);
```

## HTTP API Endpoints

### Health Check
```
GET /health
```

### Metrics (Prometheus)
```
GET /metrics
```

### Debug Info
```
GET /debug/sockets
```

Response:
```json
{
  "totalConnections": 5,
  "sockets": [...]
}
```

## Configuration

### OpenAI Models

- **Chat Model**: `gpt-4-turbo-preview` (configurable via `OPENAI_MODEL`)
- **Embedding Model**: `text-embedding-3-small` (configurable via `EMBEDDING_MODEL`)

### Qdrant Collection

- **Collection Name**: `knowledge_base_v1`
- **Vector Size**: 1536 (text-embedding-3-small)
- **Distance**: Cosine similarity

### WebSocket Settings

- **Port**: 4000 (configurable)
- **Transports**: WebSocket (primary), Polling (fallback)
- **CORS**: Configurable via `ALLOWED_ORIGINS`

## Metrics

The service exposes Prometheus metrics:

- `copilot_conversations_total` - Total number of conversations
- `copilot_conversation_duration` - Conversation duration histogram
- `copilot_messages_processed_total` - Total messages processed
- `copilot_recommendations_generated_total` - Total recommendations generated
- `copilot_ai_model_latency` - AI model latency histogram
- `copilot_ai_model_errors_total` - Total AI model errors
- `copilot_websocket_connections` - Active WebSocket connections
- `copilot_cache_hit_rate` - Knowledge base cache hit rate

## Development

### Project Structure

```
apps/copilot/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── services/
│   │   ├── copilot.service.ts      # Main orchestration
│   │   ├── conversation-analysis.service.ts
│   │   ├── recommendation-engine.service.ts
│   │   ├── performance-insights.service.ts
│   │   └── knowledge-base.service.ts
│   ├── ws/
│   │   └── copilot-ws.controller.ts
│   └── monitoring/
│       └── observability.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test conversation-analysis.service.test.ts
```

## Troubleshooting

### Common Issues

**1. WebSocket Connection Fails**
- Check if copilot service is running: `curl http://localhost:4000/health`
- Verify CORS settings in ALLOWED_ORIGINS
- Check authentication token format

**2. AI Recommendations Not Generated**
- Verify OpenAI API key is set
- Check OpenAI API quota/limit
- Review logs for specific errors

**3. Knowledge Base Search Returns No Results**
- Ensure Qdrant is running: `docker ps | grep qdrant`
- Check article indexing: Verify articles exist in collection
- Verify embedding model configuration

**4. High Latency**
- Check OpenAI model response times
- Verify network connectivity
- Review knowledge base cache performance
- Consider using smaller embedding model

### Logs

Logs are written to console with structured JSON format. In development, colored output is enabled.

```bash
# View logs
docker compose logs -f copilot

# Or if running standalone
pnpm --filter @insurance/copilot dev 2>&1 | tee copilot.log
```

## Integration with Existing Systems

### Lead Management
```typescript
// When a new lead is assigned
socket.emit('conversation:start', {
  conversationId: lead.id,
  leadId: lead.id,
  insuranceType: lead.insuranceType,
  metadata: lead.metadata
});
```

### Agent Dashboard
```typescript
// Display performance insights
socket.on('insight', (data) => {
  dashboard.showInsight(data.insight);
});

// Show AI recommendations
socket.on('recommendation', (data) => {
  copilotPanel.addSuggestion(data.recommendation);
});
```

### Knowledge Management
```typescript
// Sync product updates to knowledge base
const kb = new KnowledgeBaseService();
await kb.addArticle({
  title: 'New Product: Premium Auto Plus',
  content: product.description,
  category: product.type,
  tags: product.tags,
  source: 'product-catalog'
});
```

## Performance Optimization

### Caching
- Embeddings cached in memory (LRU cache, 1000 items)
- Redis could be added for distributed caching

### Connection Management
- WebSocket connections pooled efficiently
- Automatic reconnection handling
- Heartbeat mechanism

### Resource Limits
- Max message size: 10MB
- Connection timeout: 30s
- Rate limiting per agent (configurable)

## Security

### Authentication
- JWT token validation (implement in production)
- Agent ID verification
- Session management

### Data Protection
- PII redaction in logs
- Encrypted WebSocket connections (wss://)
- Access controls for conversation data

## Support

For issues or questions:
1. Check logs for error details
2. Review OpenTelemetry traces in Jaeger
3. Check Prometheus metrics for performance
4. Consult development team

## License

MIT