// Integration Types

export type IntegrationType = 
  | 'salesforce'
  | 'hubspot'
  | 'pipedrive'
  | 'slack'
  | 'teams'
  | 'outlook'
  | 'google_calendar'
  | 'quickbooks'
  | 'xero'

export interface Integration {
  id: string
  organizationId: string
  integrationType: IntegrationType
  isActive: boolean
  isAuthenticated: boolean
  credentials: any
  webhookUrl?: string
  webhookSecret?: string
  syncEnabled: boolean
  lastSyncAt?: Date
  config: any
  createdAt: Date
  updatedAt: Date
}

export interface IntegrationSync {
  id: string
  integrationId: string
  syncType: string
  direction: 'one_way' | 'two_way'
  syncedRecords: number
  failedRecords: number
  lastRun: Date
  nextRun?: Date
  status: 'pending' | 'running' | 'success' | 'failed'
  errorMessage?: string
  createdAt: Date
}

export interface IntegrationMapping {
  id: string
  integrationId: string
  sourceField: string
  targetField: string
  transformationRules?: any
  isActive: boolean
}

export interface IntegrationWebhook {
  id: string
  integrationId: string
  event: string
  isActive: boolean
  createdAt: Date
}

export interface ConnectIntegrationInput {
  organizationId: string
  integrationType: IntegrationType
  credentials: any
  config?: any
}

export interface UpdateIntegrationInput {
  integrationId: string
  credentials?: any
  config?: any
  isActive?: boolean
  syncEnabled?: boolean
}

export interface CreateFieldMappingInput {
  integrationId: string
  sourceField: string
  targetField: string
  transformationRules?: any
}

export interface TriggerSyncInput {
  integrationId: string
  syncType: string
  direction: 'one_way' | 'two_way'
}

export interface WebhookPayload {
  event: string
  timestamp: Date
  data: any
  integrationId: string
}