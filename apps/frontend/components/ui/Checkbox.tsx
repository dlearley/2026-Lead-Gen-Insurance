import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-600",
              error && "border-error-500 focus:ring-error-500",
              className
            )}
            id={id}
            ref={ref}
            {...props}
          />
        </div>
        {label && (
          <div className="ml-3 text-sm">
            <label htmlFor={id} className={cn("text-secondary-700", error && "text-error-600")}>
              {label}
            </label>
            {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
