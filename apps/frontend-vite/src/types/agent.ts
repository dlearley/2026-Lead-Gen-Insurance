// Agent-related types
export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specializations: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  rating: number;
  isActive: boolean;
  maxLeadCapacity: number;
  currentLeadCount: number;
  averageResponseTime: number;
  conversionRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMetrics {
  agentId: string;
  rating: number;
  conversionRate: number;
  averageResponseTime: number;
  currentLeadCount: number;
  maxLeadCapacity: number;
  availableCapacity: number;
  utilizationPercentage: number;
  isActive: boolean;
}
