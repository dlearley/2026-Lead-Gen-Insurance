// Notification Types

export type NotificationType = 'message' | 'call' | 'case' | 'document'

export type MessageNotificationPreference = 'all' | 'mentions' | 'none'

export interface Notification {
  id: string
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  readAt?: Date
  createdAt: Date
}

export interface NotificationPreference {
  id: string
  userId: string
  organizationId: string
  pushEnabled: boolean
  emailEnabled: boolean
  messageNotifications: MessageNotificationPreference
  callNotifications: boolean
  caseNotifications: boolean
  documentNotifications: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  quietHoursEnabled: boolean
  updatedAt: Date
}

export interface PushToken {
  id: string
  userId: string
  organizationId: string
  token: string
  platform: 'ios' | 'android' | 'web'
  deviceName?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateNotificationInput {
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
}

export interface UpdateNotificationPreferencesInput {
  userId: string
  organizationId: string
  pushEnabled?: boolean
  emailEnabled?: boolean
  messageNotifications?: MessageNotificationPreference
  callNotifications?: boolean
  caseNotifications?: boolean
  documentNotifications?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  quietHoursEnabled?: boolean
}

export interface RegisterPushTokenInput {
  userId: string
  organizationId: string
  token: string
  platform: 'ios' | 'android' | 'web'
  deviceName?: string
}

export interface SendPushNotificationInput {
  userId: string
  title: string
  body: string
  data?: any
}