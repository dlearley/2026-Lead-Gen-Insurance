"use client";

import React, { useState, useEffect } from "react";
import { IntentScoreCard } from "../../../components/intent/intent-score-card";
import { Zap, Search, Filter, ArrowUpRight } from "lucide-react";
import type { IntentScore } from "@insurance-lead-gen/types";

export default function IntentInsightsPage() {
  const [intentScores, setIntentScores] = useState<IntentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Simulated fetch
    setTimeout(() => {
      const mockScores: IntentScore[] = [
        {
          id: "1",
          leadId: "lead_1",
          score: 85,
          level: "CRITICAL",
          confidence: 0.92,
          trend: "UP",
          lastUpdated: new Date().toISOString(),
          topSignals: [
            { id: "s1", leadId: "lead_1", category: "WEBSITE", type: "PRICING_PAGE_VISIT", score: 70, weight: 1, description: "Visited pricing page twice", timestamp: new Date().toISOString() },
            { id: "s2", leadId: "lead_1", category: "EMAIL", type: "EMAIL_CLICK", score: 40, weight: 1, description: "Clicked 'Get a Quote' link", timestamp: new Date().toISOString() }
          ],
          lead: { id: "lead_1", firstName: "John", lastName: "Doe", source: "Web", status: "qualified", createdAt: new Date(), updatedAt: new Date() } as any
        },
        {
          id: "2",
          leadId: "lead_2",
          score: 62,
          level: "HIGH",
          confidence: 0.88,
          trend: "UP",
          lastUpdated: new Date().toISOString(),
          topSignals: [
            { id: "s3", leadId: "lead_2", category: "CONTENT", type: "WHITEPAPER_DOWNLOAD", score: 60, weight: 1, description: "Downloaded Life Insurance Guide", timestamp: new Date().toISOString() }
          ],
          lead: { id: "lead_2", firstName: "Jane", lastName: "Smith", source: "Referral", status: "processing", createdAt: new Date(), updatedAt: new Date() } as any
        }
      ];
      setIntentScores(mockScores);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredScores = intentScores.filter(s => 
    `${s.lead?.firstName} ${s.lead?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary-600" />
            Intent Signal Insights
          </h1>
          <p className="text-secondary-500 mt-1">Identify high-intent leads based on real-time behavioral signals.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="pl-10 pr-4 py-2 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-secondary-200 rounded-lg text-sm font-medium hover:bg-secondary-50">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-secondary-50 animate-pulse rounded-xl border border-secondary-200"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScores.map(score => (
            <div key={score.id} className="relative group">
              <IntentScoreCard intentScore={score} />
              <div className="mt-3 flex items-center justify-between px-2">
                <div className="text-sm font-medium text-secondary-900">
                  {score.lead?.firstName} {score.lead?.lastName}
                </div>
                <button className="text-primary-600 text-xs font-semibold flex items-center gap-1 hover:underline">
                  View Lead <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredScores.length === 0 && (
        <div className="text-center py-20">
          <div className="bg-secondary-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-secondary-400" />
          </div>
          <h3 className="text-lg font-medium text-secondary-900">No matching leads found</h3>
          <p className="text-secondary-500">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
