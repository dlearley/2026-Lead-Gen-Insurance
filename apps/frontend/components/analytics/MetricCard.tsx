import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel = "from last period",
  icon,
  color = "bg-primary-500",
  loading = false,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return "text-secondary-500";
    if (change > 0) return "text-success-600";
    if (change < 0) return "text-error-600";
    return "text-secondary-500";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-secondary-600">{title}</CardTitle>
          {icon && (
            <div className={`p-2 rounded-lg ${color}`}>
              <div className="text-white">{icon}</div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-secondary-200 animate-pulse rounded" />
          <div className="h-4 bg-secondary-100 animate-pulse rounded mt-2 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-secondary-600">{title}</CardTitle>
        {icon && (
          <div className={`p-2 rounded-lg ${color}`}>
            <div className="text-white">{icon}</div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-secondary-900">{value}</div>
        {change !== undefined && change !== null && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}% {changeLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
