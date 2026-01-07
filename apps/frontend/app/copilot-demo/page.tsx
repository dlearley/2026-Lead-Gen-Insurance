'use client';

import React, { useState } from 'react';
import { CopilotWidget } from '@/components/copilot/CopilotWidget';
import { Bot, User, Mail, Phone, MapPin, Calendar } from 'lucide-react';

export default function CopilotDemoPage() {
  const [selectedLead, setSelectedLead] = useState({
    id: 'lead-demo-001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    insuranceType: 'auto',
    qualityScore: 75,
    status: 'qualified',
    location: 'San Francisco, CA',
    age: 35,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Bot className="h-10 w-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Copilot Demo</h1>
              <p className="text-gray-600">
                Experience real-time AI assistance for insurance agents
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="bg-blue-100 rounded-lg p-3 w-fit mb-4">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Intelligent Suggestions
            </h3>
            <p className="text-gray-600 text-sm">
              Get AI-powered suggestions for responses, objection handling, product
              recommendations, and more.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="bg-purple-100 rounded-lg p-3 w-fit mb-4">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Insights</h3>
            <p className="text-gray-600 text-sm">
              Receive live alerts about risks, opportunities, sentiment, and engagement
              patterns.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="bg-green-100 rounded-lg p-3 w-fit mb-4">
              <Bot className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Context-Aware</h3>
            <p className="text-gray-600 text-sm">
              Copilot understands your lead's profile, conversation history, and current stage
              for relevant assistance.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Profile */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">Lead Profile</h2>
              </div>
              <div className="p-6">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="bg-blue-100 rounded-full p-3">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {selectedLead.status}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        Quality: {selectedLead.qualityScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 text-gray-600">
                    <Mail className="h-5 w-5" />
                    <span>{selectedLead.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-600">
                    <Phone className="h-5 w-5" />
                    <span>{selectedLead.phone}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-600">
                    <MapPin className="h-5 w-5" />
                    <span>{selectedLead.location}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-600">
                    <Calendar className="h-5 w-5" />
                    <span>Age: {selectedLead.age}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Insurance Interest
                  </h4>
                  <p className="text-gray-600 capitalize">{selectedLead.insuranceType} Insurance</p>
                </div>
              </div>
            </div>

            {/* Conversation Simulator */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">Conversation</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {/* Sample conversation */}
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-200 rounded-full p-2">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-md">
                      <p className="text-sm text-gray-900">
                        Hi, I'm interested in getting auto insurance for my new car.
                      </p>
                      <span className="text-xs text-gray-500 mt-1">2 minutes ago</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 justify-end">
                    <div className="bg-blue-600 rounded-lg px-4 py-3 max-w-md">
                      <p className="text-sm text-white">
                        Great! I'd be happy to help you with that. Can you tell me a bit more
                        about your vehicle?
                      </p>
                      <span className="text-xs text-blue-100 mt-1">1 minute ago</span>
                    </div>
                    <div className="bg-blue-600 rounded-full p-2">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-200 rounded-full p-2">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-md">
                      <p className="text-sm text-gray-900">
                        It's a 2024 Honda Accord. But honestly, I'm worried about the cost...
                      </p>
                      <span className="text-xs text-gray-500 mt-1">Just now</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                  <input
                    type="text"
                    placeholder="Type your response or use AI suggestions..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                How to Use the Copilot
              </h3>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </span>
                  <span>
                    Click the <strong>AI Copilot button</strong> in the bottom-right corner
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </span>
                  <span>
                    Explore the <strong>Suggestions tab</strong> for AI-generated recommendations
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </span>
                  <span>
                    Check the <strong>Insights tab</strong> for real-time alerts and
                    opportunities
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    4
                  </span>
                  <span>
                    Use <strong>quick actions</strong> like "Next Action" or "Handle Objection"
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    5
                  </span>
                  <span>
                    Provide <strong>feedback</strong> (👍 Accept / 👎 Reject) to improve AI
                  </span>
                </li>
              </ol>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  🎯 Next Best Action
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  💬 Response Template
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  🛡️ Handle Objection
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  📦 Product Recommendation
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  🔍 Risk Assessment
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  🎁 Cross-Sell Opportunity
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> This is a demonstration. Suggestions and insights are
                generated in real-time using GPT-4.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Copilot Widget */}
      <CopilotWidget
        userId="agent-demo-001"
        leadId={selectedLead.id}
        agentId="agent-demo-001"
        initialContext={{
          leadData: selectedLead,
          stage: 'qualification',
          insuranceType: selectedLead.insuranceType,
        }}
      />
    </div>
  );
}
