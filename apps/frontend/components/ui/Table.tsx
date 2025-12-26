import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("min-w-full divide-y divide-secondary-200", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-secondary-50", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("bg-white divide-y divide-secondary-200", className)} {...props} />;
}

export function TableFooter({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn("bg-secondary-50", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("hover:bg-secondary-50 transition-colors", className)}
      {...props}
    />
  );
}

interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  onSort?: () => void;
  sortDirection?: "asc" | "desc" | null;
}

export function TableHead({ className, sortable, onSort, sortDirection, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider",
        sortable && "cursor-pointer hover:bg-secondary-100 select-none",
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center space-x-1">
        <span>{props.children}</span>
        {sortable && (
          <span className="text-secondary-400">
            {sortDirection === "asc" && "↑"}
            {sortDirection === "desc" && "↓"}
            {!sortDirection && "↕"}
          </span>
        )}
      </div>
    </th>
  );
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-6 py-4 whitespace-nowrap text-sm text-secondary-900", className)} {...props} />;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mx-auto h-12 w-12 text-secondary-400 mb-4">{icon}</div>}
      <h3 className="mt-2 text-sm font-medium text-secondary-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-secondary-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
