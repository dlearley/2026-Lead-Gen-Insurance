'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CopilotWidget } from './CopilotWidget';

interface CopilotContextType {
  isEnabled: boolean;
  enableCopilot: () => void;
  disableCopilot: () => void;
  updateContext: (context: Record<string, unknown>) => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within CopilotProvider');
  }
  return context;
}

interface CopilotProviderProps {
  children: React.ReactNode;
  userId?: string;
  leadId?: string;
  agentId?: string;
  enabledByDefault?: boolean;
}

export function CopilotProvider({
  children,
  userId,
  leadId,
  agentId,
  enabledByDefault = true,
}: CopilotProviderProps) {
  const [isEnabled, setIsEnabled] = useState(enabledByDefault);
  const [context, setContext] = useState<Record<string, unknown>>({});

  const enableCopilot = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disableCopilot = useCallback(() => {
    setIsEnabled(false);
  }, []);

  const updateContext = useCallback((newContext: Record<string, unknown>) => {
    setContext((prev) => ({ ...prev, ...newContext }));
  }, []);

  return (
    <CopilotContext.Provider
      value={{
        isEnabled,
        enableCopilot,
        disableCopilot,
        updateContext,
      }}
    >
      {children}
      {isEnabled && userId && (
        <CopilotWidget
          userId={userId}
          leadId={leadId}
          agentId={agentId}
          initialContext={context}
        />
      )}
    </CopilotContext.Provider>
  );
}
