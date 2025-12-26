import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function toast(message: string, type: Toast["type"] = "info", duration = 3000) {
  const id = Date.now().toString();
  const newToast: Toast = { id, message, type, duration };
  toasts.push(newToast);
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>([]);

  const addListener = useCallback(() => {
    toastListeners.push(setLocalToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setLocalToasts);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  const dismissAll = useCallback(() => {
    toasts = [];
    notifyListeners();
  }, []);

  return {
    toasts: localToasts,
    toast,
    dismiss,
    dismissAll,
    addListener,
  };
}
