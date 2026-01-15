import { cn } from "../../utils/cn";
import { IntentScore, IntentLevel } from "@insurance-lead-gen/types";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Zap,
  Info
} from "lucide-react";

interface IntentScoreCardProps {
  intentScore: IntentScore;
  className?: string;
}

export function IntentScoreCard({ intentScore, className }: IntentScoreCardProps) {
  const getLevelColor = (level: IntentLevel) => {
    switch (level) {
      case "CRITICAL": return "text-red-600 bg-red-50 border-red-200";
      case "HIGH": return "text-orange-600 bg-orange-50 border-orange-200";
      case "MEDIUM": return "text-blue-600 bg-blue-50 border-blue-200";
      case "LOW": return "text-gray-600 bg-gray-50 border-gray-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-blue-500";
    return "bg-gray-400";
  };

  return (
    <div className={cn("p-6 bg-white rounded-xl border border-secondary-200 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-secondary-900">Intent Score</h3>
        </div>
        <div className={cn("px-3 py-1 rounded-full text-xs font-bold border", getLevelColor(intentScore.level))}>
          {intentScore.level}
        </div>
      </div>

      <div className="flex items-end gap-4 mb-6">
        <div className="text-4xl font-bold text-secondary-900">{Math.round(intentScore.score)}</div>
        <div className="flex items-center gap-1 text-sm pb-1">
          {intentScore.trend === 'UP' ? (
            <span className="text-success-600 flex items-center gap-0.5">
              <TrendingUp className="h-4 w-4" /> Increasing
            </span>
          ) : intentScore.trend === 'DOWN' ? (
            <span className="text-red-600 flex items-center gap-0.5">
              <TrendingDown className="h-4 w-4" /> Decreasing
            </span>
          ) : (
            <span className="text-secondary-400">Stable</span>
          )}
        </div>
      </div>

      <div className="w-full bg-secondary-100 rounded-full h-2.5 mb-6">
        <div 
          className={cn("h-2.5 rounded-full transition-all duration-500", getProgressColor(intentScore.score))} 
          style={{ width: `${intentScore.score}%` }}
        ></div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-secondary-700 flex items-center gap-1.5">
          <Target className="h-4 w-4" /> Top Intent Signals
        </h4>
        <div className="space-y-2">
          {intentScore.topSignals.map((signal, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary-50 text-sm">
              <div className="mt-0.5">
                <Activity className="h-4 w-4 text-primary-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-secondary-900">{signal.description}</div>
                <div className="text-secondary-500 text-xs mt-0.5">
                  {new Date(signal.timestamp).toLocaleDateString()} • {signal.category}
                </div>
              </div>
              <div className="font-bold text-primary-600">+{signal.score}</div>
            </div>
          ))}
          {intentScore.topSignals.length === 0 && (
            <div className="text-center py-4 text-secondary-500 text-sm italic">
              No recent high-intent signals detected
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-secondary-100 flex items-center justify-between text-xs text-secondary-400">
        <div className="flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          Confidence: {Math.round(intentScore.confidence * 100)}%
        </div>
        <div>Updated {new Date(intentScore.lastUpdated).toLocaleTimeString()}</div>
      </div>
    </div>
  );
}
