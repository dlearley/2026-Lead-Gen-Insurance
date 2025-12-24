import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type AlertVariant = "success" | "error" | "warning" | "info";

const variantClasses: Record<AlertVariant, string> = {
  success: "bg-success-50 border-success-200 text-success-800",
  error: "bg-error-50 border-error-200 text-error-800",
  warning: "bg-warning-50 border-warning-200 text-warning-800",
  info: "bg-primary-50 border-primary-200 text-primary-800",
};

const iconMap: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
};

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

export function Alert({ variant = "info", title, children, className, ...props }: AlertProps) {
  return (
    <div
      className={cn(
        "flex items-start space-x-3 rounded-lg border p-4",
        variantClasses[variant],
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex-shrink-0">{iconMap[variant]}</div>
      <div className="flex-1">
        {title && <h4 className="font-medium mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
