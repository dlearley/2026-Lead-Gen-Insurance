# Phase 27.8: AI Copilot - Quick Start Guide

## 🚀 Overview

The AI Copilot provides real-time assistance to insurance agents with intelligent suggestions, insights, and recommendations powered by GPT-4 and LangChain.

## ⚡ Quick Start

### 1. Environment Setup

Add your OpenAI API key to `.env`:

```bash
OPENAI_API_KEY=sk-your-key-here
```

### 2. Start Services

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### 3. Try the Demo

Visit: http://localhost:3001/copilot-demo

The demo page shows:
- Lead profile with context
- Simulated conversation
- AI Copilot widget in action

### 4. Use the Copilot

1. Click the **AI Copilot button** (blue floating button, bottom-right)
2. Explore **Suggestions** tab for AI-generated recommendations
3. Check **Insights** tab for real-time alerts
4. Use **quick actions** for common suggestion types
5. Provide **feedback** (👍/👎) to improve AI

## 🎯 Key Features

### Intelligent Suggestions (10 Types)

- **Response Templates**: Professional, empathetic responses
- **Next Action**: Optimal next step suggestions
- **Objection Handling**: Counter-arguments and value props
- **Product Recommendations**: Suitable insurance products
- **Competitive Intelligence**: Market insights
- **Policy Explanation**: Simplified insurance terms
- **Risk Assessment**: Lead quality and risk evaluation
- **Cross-Sell**: Bundle opportunities
- **Upsell**: Premium product suggestions
- **Follow-Up**: Timing and messaging strategies

### Real-Time Insights (9 Types)

- **Risk Alerts**: Quality score warnings
- **Opportunity Detection**: Cross-sell/upsell potential
- **Churn Risk**: Retention strategies
- **Sentiment Analysis**: Conversation tone
- **Competitive Intelligence**: Competitor mentions
- **Policy Gaps**: Coverage opportunities
- **Price Sensitivity**: Budget constraints
- **Engagement Patterns**: Communication preferences
- **Compliance Issues**: Regulatory concerns

## 📡 API Endpoints

### Create Session

```bash
POST /api/v1/copilot/sessions
{
  "userId": "user-123",
  "context": {
    "leadId": "lead-456",
    "insuranceType": "auto",
    "stage": "qualification"
  }
}
```

### Generate Suggestion

```bash
POST /api/v1/copilot/suggestions
{
  "sessionId": "session-789",
  "type": "product_recommendation",
  "userInput": "Customer needs affordable auto insurance"
}
```

### Get Insights

```bash
GET /api/v1/copilot/sessions/{sessionId}/insights
```

## 🔧 Integration

### Frontend (React)

```tsx
import { CopilotProvider } from '@/components/copilot';

export default function Layout({ children }) {
  return (
    <CopilotProvider
      userId="user-123"
      leadId="lead-456"
      enabledByDefault={true}
    >
      {children}
    </CopilotProvider>
  );
}
```

### Backend (TypeScript)

```typescript
import { CopilotService } from '@insurance-lead-gen/core';

const copilot = new CopilotService();
const suggestion = await copilot.generateSuggestion(
  sessionId,
  'next_action',
  context
);
```

## 📊 Monitoring

### Session Metrics

```bash
GET /api/v1/copilot/sessions/{sessionId}/metrics

Response:
{
  "totalSuggestions": 15,
  "acceptedSuggestions": 9,
  "rejectedSuggestions": 2,
  "averageConfidence": 0.82,
  "insightsGenerated": 5
}
```

## 🎨 UI Components

### Copilot Widget Features

- ✅ Minimizable floating window
- ✅ Tabbed interface (Suggestions/Insights)
- ✅ Real-time updates (30s refresh)
- ✅ Quick action buttons
- ✅ Feedback collection
- ✅ Copy to clipboard
- ✅ Priority indicators
- ✅ Severity icons

## 🧪 Testing

### Manual Testing

1. Open http://localhost:3001/copilot-demo
2. Click the copilot button
3. Generate suggestions using quick actions
4. Check insights tab for alerts
5. Provide feedback on suggestions

### API Testing

```bash
# Test session creation
curl -X POST http://localhost:3000/api/v1/copilot/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","context":{}}'

# Test suggestion generation
curl -X POST http://localhost:3000/api/v1/copilot/suggestions \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"session-id","type":"next_action"}'
```

## 💡 Best Practices

### For Agents

1. **Review carefully**: AI is an assistant, not a replacement
2. **Provide feedback**: Helps improve future suggestions
3. **Customize content**: Adapt to your voice and style
4. **Monitor insights**: Stay aware of opportunities
5. **Update context**: Keep lead information current

### For Developers

1. **Keep context rich**: More data = better suggestions
2. **Monitor performance**: Track acceptance rates
3. **Analyze feedback**: Use data to improve prompts
4. **Handle errors**: Graceful degradation
5. **Optimize prompts**: Regularly refine for quality

## 📚 Documentation

- **Full Docs**: `/docs/PHASE_27.8_AI_COPILOT.md`
- **API Reference**: See REST endpoints in docs
- **Type Definitions**: `packages/types/src/copilot.ts`

## 🐛 Troubleshooting

### Copilot Not Appearing

- Check OpenAI API key is set
- Verify user ID is provided
- Check browser console for errors

### Suggestions Not Generating

- Verify session is active
- Check API endpoint connectivity
- Review server logs for errors

### Insights Not Updating

- Ensure session context is populated
- Check auto-refresh interval
- Verify lead data is available

## 🚀 Next Steps

1. Explore different suggestion types
2. Test with various lead scenarios
3. Analyze feedback and metrics
4. Customize prompts for your needs
5. Integrate with production workflows

## 📞 Support

For issues or questions:
- Review documentation in `/docs`
- Check logs in development console
- Test API endpoints directly

---

**Phase 27.8 Complete** ✅  
Real-Time AI Insights & Agent Copilot is ready for use!
