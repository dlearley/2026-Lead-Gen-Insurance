import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SentimentChartProps {
  sentiment: {
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    confidence: number;
    intensity: number;
    emotions: Record<string, number>;
  };
  historicalData?: Array<{
    date: string;
    sentiment: string;
    confidence: number;
  }>;
}

export const SentimentChart: React.FC<SentimentChartProps> = ({ sentiment, historicalData }) => {
  const emotionData = Object.entries(sentiment.emotions || {})
    .filter(([_, value]) => value > 0)
    .map(([emotion, value]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      intensity: Math.round(value * 100),
      fill: getEmotionColor(emotion)
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Current Sentiment</h3>
          <div className="flex items-center justify-center h-32">
            <div className={`text-3xl font-bold ${getSentimentColor(sentiment.sentiment)}`}>
              {sentiment.sentiment.toUpperCase()}
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Confidence: {Math.round(sentiment.confidence * 100)}%
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Intensity</h3>
          <div className="flex items-center justify-center h-32">
            <div className="relative w-full bg-gray-200 rounded-full h-8">
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-8 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ width: `${sentiment.intensity}%` }}
              >
                {Math.round(sentiment.intensity)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {emotionData.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Emotional Profile</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emotionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="emotion" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="intensity" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {historicalData && historicalData.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="confidence" stroke="#3B82F6" name="Confidence" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return 'text-green-600';
    case 'negative': return 'text-red-600';
    case 'neutral': return 'text-gray-600';
    case 'mixed': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
}

function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    happy: '#10B981',
    excited: '#3B82F6',
    curious: '#F59E0B',
    anxious: '#EF4444',
    frustrated: '#EF4444',
    skeptical: '#6B7280',
    angry: '#DC2626'
  };
  return colors[emotion] || '#3B82F6';
}