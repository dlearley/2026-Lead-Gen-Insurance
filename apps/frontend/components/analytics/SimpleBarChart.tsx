import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  maxValue?: number;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
}

export function SimpleBarChart({
  title,
  description,
  data,
  maxValue,
  valueFormatter = (v) => v.toString(),
  loading = false,
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-secondary-200 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-secondary-500">No data available</div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => {
              const percentage = (item.value / max) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-secondary-700">{item.label}</span>
                    <span className="text-secondary-900 font-semibold">
                      {valueFormatter(item.value)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        item.color || "bg-primary-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
