"use client";

import React, { useState, useEffect } from "react";
import { Zap, TrendingUp, Users, Target, CheckCircle2 } from "lucide-react";
import { IntentScoreCard } from "../../../components/intent/intent-score-card";
import type { IntentScore } from "@insurance-lead-gen/types";

export default function LeadIntentDashboard() {
  const [highIntentLeads, setHighIntentLeads] = useState<IntentScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch
    setTimeout(() => {
      const mockScores: IntentScore[] = [
        {
          id: "1",
          leadId: "lead_1",
          score: 92,
          level: "CRITICAL",
          confidence: 0.95,
          trend: "UP",
          lastUpdated: new Date().toISOString(),
          topSignals: [
            { id: "s1", leadId: "lead_1", category: "BUYING", type: "BUYING_KEYWORD", score: 90, weight: 1, description: "Mentioned 'ready to purchase' in call", timestamp: new Date().toISOString() },
            { id: "s2", leadId: "lead_1", category: "WEBSITE", type: "DEMO_REQUEST", score: 85, weight: 1, description: "Requested a live demo", timestamp: new Date().toISOString() }
          ],
          lead: { id: "lead_1", firstName: "Robert", lastName: "Miller", source: "Direct", status: "qualified", createdAt: new Date(), updatedAt: new Date() } as any
        },
        {
          id: "3",
          leadId: "lead_3",
          score: 78,
          level: "HIGH",
          confidence: 0.90,
          trend: "UP",
          lastUpdated: new Date().toISOString(),
          topSignals: [
            { id: "s4", leadId: "lead_3", category: "VELOCITY", type: "VELOCITY_SPIKE", score: 80, weight: 1, description: "300% increase in activity last 24h", timestamp: new Date().toISOString() },
            { id: "s5", leadId: "lead_3", category: "WEBSITE", type: "PRICING_PAGE_VISIT", score: 70, weight: 1, description: "Viewed pricing 4 times today", timestamp: new Date().toISOString() }
          ],
          lead: { id: "lead_3", firstName: "Sarah", lastName: "Connor", source: "Web", status: "processing", createdAt: new Date(), updatedAt: new Date() } as any
        }
      ];
      setHighIntentLeads(mockScores);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
          <Target className="h-6 w-6 text-primary-600" />
          Priority Lead Intent
        </h1>
        <p className="text-secondary-500 mt-1">Sales-ready leads identified by high-intent behavioral signals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 text-sm mb-2">
            <Zap className="h-4 w-4" /> High Intent
          </div>
          <div className="text-2xl font-bold text-secondary-900">12</div>
          <div className="text-xs text-success-600 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +20% from last week
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 text-sm mb-2">
            <Users className="h-4 w-4" /> Active Leads
          </div>
          <div className="text-2xl font-bold text-secondary-900">148</div>
          <div className="text-xs text-secondary-400 mt-1">Current period</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 text-sm mb-2">
            <Target className="h-4 w-4" /> Avg. Intent Score
          </div>
          <div className="text-2xl font-bold text-secondary-900">54.2</div>
          <div className="text-xs text-success-600 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +5.4 pts
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 text-sm mb-2">
            <CheckCircle2 className="h-4 w-4" /> Conversion Rate
          </div>
          <div className="text-2xl font-bold text-secondary-900">24.5%</div>
          <div className="text-xs text-success-600 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +2.1%
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-secondary-900 mb-4">Urgent Actions Required</h2>
      
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="h-80 bg-secondary-50 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {highIntentLeads.map(score => (
            <div key={score.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                    {score.lead?.firstName?.[0]}{score.lead?.lastName?.[0]}
                  </div>
                  <div>
                    <div className="font-bold text-secondary-900">{score.lead?.firstName} {score.lead?.lastName}</div>
                    <div className="text-xs text-secondary-500">{score.lead?.source} • {score.lead?.status}</div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors">
                  Contact Now
                </button>
              </div>
              <IntentScoreCard intentScore={score} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
