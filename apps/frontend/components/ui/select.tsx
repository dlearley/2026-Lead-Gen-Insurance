"use client";

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  HTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

interface SelectContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string | undefined;
  setValue: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within <Select>");
  return ctx;
}

export interface SelectProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Select({ value, defaultValue, onValueChange, className, children, ...props }: PropsWithChildren<SelectProps>) {
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
  const [open, setOpen] = useState(false);

  const activeValue = value ?? internalValue;

  const setValue = useCallback(
    (v: string) => {
      onValueChange?.(v);
      if (value === undefined) setInternalValue(v);
      setOpen(false);
    },
    [onValueChange, value]
  );

  const ctx = useMemo(
    () => ({ open, setOpen, value: activeValue, setValue }),
    [activeValue, open, setOpen, setValue]
  );

  return (
    <SelectContext.Provider value={ctx}>
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const ctx = useSelectContext();
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary-600",
        className
      )}
      onClick={() => ctx.setOpen(!ctx.open)}
      {...props}
    />
  );
}

export interface SelectValueProps extends HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

export function SelectValue({ placeholder, className, ...props }: SelectValueProps) {
  const ctx = useSelectContext();
  const label = ctx.value || placeholder || "Select";
  return (
    <span className={cn("text-secondary-800", !ctx.value && "text-secondary-400", className)} {...props}>
      {label}
    </span>
  );
}

export function SelectContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ctx = useSelectContext();
  if (!ctx.open) return null;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-50 mt-2 rounded-md border border-secondary-200 bg-white shadow-lg",
        className
      )}
      {...props}
    />
  );
}

export interface SelectItemProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function SelectItem({ value, className, children, ...props }: PropsWithChildren<SelectItemProps>) {
  const ctx = useSelectContext();
  const active = ctx.value === value;

  return (
    <button
      type="button"
      className={cn(
        "block w-full px-3 py-2 text-left text-sm hover:bg-secondary-50",
        active && "bg-primary-50",
        className
      )}
      onClick={() => ctx.setValue(value)}
      {...props}
    >
      {children}
    </button>
  );
}
