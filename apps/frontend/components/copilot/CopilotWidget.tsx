'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Send,
} from 'lucide-react';
import type {
  CopilotSession,
  CopilotSuggestion,
  RealTimeInsight,
  CopilotSuggestionType,
} from '@insurance-lead-gen/types';

interface CopilotWidgetProps {
  userId: string;
  leadId?: string;
  agentId?: string;
  initialContext?: Record<string, unknown>;
}

export function CopilotWidget({
  userId,
  leadId,
  agentId,
  initialContext,
}: CopilotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const [insights, setInsights] = useState<RealTimeInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [activeTab, setActiveTab] = useState<'suggestions' | 'insights'>('suggestions');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session
  useEffect(() => {
    if (isOpen && !session) {
      initializeSession();
    }
  }, [isOpen, userId, leadId, agentId]);

  // Auto-refresh insights
  useEffect(() => {
    if (session && isOpen && !isMinimized) {
      const interval = setInterval(() => {
        fetchInsights();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [session, isOpen, isMinimized]);

  const initializeSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/copilot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          context: {
            leadId,
            agentId,
            currentPage: window.location.pathname,
            ...initialContext,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setSuggestions(data.session.suggestions || []);
        setInsights(
          data.session.insights?.map((i: any) => ({
            id: i.id,
            type: i.type,
            title: i.title,
            message: i.description,
            severity: i.severity,
            actionable: i.actionable,
            timestamp: new Date(i.createdAt),
          })) || []
        );
      }
    } catch (error) {
      console.error('Failed to initialize copilot session', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/v1/copilot/sessions/${session.id}/suggestions`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions', error);
    }
  };

  const fetchInsights = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/v1/copilot/sessions/${session.id}/insights`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights.map((i: any) => ({
          id: i.id,
          type: i.type,
          title: i.title,
          message: i.description,
          severity: i.severity,
          actionable: i.actionable,
          timestamp: new Date(i.createdAt),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch insights', error);
    }
  };

  const generateSuggestion = async (type: CopilotSuggestionType) => {
    if (!session) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/copilot/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          type,
          userInput: userInput || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions((prev) => [data.suggestion, ...prev]);
        setUserInput('');
      }
    } catch (error) {
      console.error('Failed to generate suggestion', error);
    } finally {
      setIsLoading(false);
    }
  };

  const provideFeedback = async (suggestionId: string, feedbackType: 'accepted' | 'rejected') => {
    try {
      await fetch(`/api/v1/copilot/suggestions/${suggestionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackType }),
      });

      // Update local suggestion state
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                [feedbackType === 'accepted' ? 'acceptedAt' : 'rejectedAt']: new Date(),
              }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to provide feedback', error);
    }
  };

  const copySuggestion = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getSeverityIcon = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-500';
      default:
        return 'border-l-gray-500';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50"
        title="Open AI Copilot"
      >
        <Bot className="h-6 w-6" />
        {insights.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {insights.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-semibold">AI Copilot</h3>
          {session && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'suggestions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Suggestions
              {suggestions.length > 0 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                  {suggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Insights
              {insights.length > 0 && (
                <span className="ml-1 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                  {insights.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="h-[440px] overflow-y-auto p-4 space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!isLoading && activeTab === 'suggestions' && suggestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No suggestions yet</p>
                <p className="text-sm">Ask me anything or generate a suggestion</p>
              </div>
            )}

            {!isLoading && activeTab === 'insights' && insights.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No insights available</p>
                <p className="text-sm">Insights will appear as they are detected</p>
              </div>
            )}

            {activeTab === 'suggestions' &&
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`border-l-4 ${getPriorityColor(suggestion.priority)} bg-gray-50 rounded-r-lg p-3 space-y-2`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{suggestion.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {suggestion.type.replace(/_/g, ' ')} • {suggestion.confidence * 100}%
                        confidence
                      </p>
                    </div>
                    <button
                      onClick={() => copySuggestion(suggestion.content)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{suggestion.content}</p>
                  {suggestion.reasoning && (
                    <p className="text-xs text-gray-500 italic">{suggestion.reasoning}</p>
                  )}
                  <div className="flex items-center space-x-2 pt-2">
                    {!suggestion.acceptedAt && !suggestion.rejectedAt && (
                      <>
                        <button
                          onClick={() => provideFeedback(suggestion.id, 'accepted')}
                          className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => provideFeedback(suggestion.id, 'rejected')}
                          className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          <ThumbsDown className="h-3 w-3" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                    {suggestion.acceptedAt && (
                      <span className="flex items-center space-x-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Accepted</span>
                      </span>
                    )}
                    {suggestion.rejectedAt && (
                      <span className="flex items-center space-x-1 text-xs text-red-600">
                        <XCircle className="h-3 w-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}

            {activeTab === 'insights' &&
              insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-lg p-3 border ${
                    insight.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : insight.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {getSeverityIcon(insight.severity)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{insight.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{insight.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(insight.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {insight.actions && insight.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {insight.actions.map((action) => (
                        <button
                          key={action.id}
                          className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-lg">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && userInput.trim()) {
                    generateSuggestion('response_template');
                  }
                }}
                placeholder="Ask for help..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => generateSuggestion('response_template')}
                disabled={!userInput.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => generateSuggestion('next_action')}
                className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Next Action
              </button>
              <button
                onClick={() => generateSuggestion('product_recommendation')}
                className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Product Rec
              </button>
              <button
                onClick={() => generateSuggestion('objection_handling')}
                className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Handle Objection
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
