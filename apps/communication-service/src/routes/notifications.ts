// Notifications Routes

import express from 'express'
import { PrismaClient } from '@prisma/client'
import { NotificationService, PushService } from '@insurance-lead-gen/communication'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'
import { notificationSchemas, pushSchemas } from '../schemas/notifications.js'

const router = express.Router()
const prisma = new PrismaClient()

// Services
const notificationService = new NotificationService(prisma)
const pushService = new PushService(prisma, {
  // Firebase config would be loaded from environment
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
})

// Notification routes
router.post('/', authenticate, validateRequest(notificationSchemas.createNotification), async (req, res) => {
  try {
    const notification = await notificationService.createNotification({
      organizationId: req.user.organizationId,
      userId: req.body.userId || req.user.id,
      ...req.body,
    })
    res.status(201).json(notification)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    const notifications = await notificationService.getUserNotifications(req.user.id, limit)
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/unread', authenticate, async (req, res) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user.id)
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread notifications', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id)
    res.json(notification)
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/read-all', authenticate, async (req, res) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id)
    res.json({ count })
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.deleteNotification(req.params.id)
    res.json(notification)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/all', authenticate, async (req, res) => {
  try {
    const count = await notificationService.deleteAllNotifications(req.user.id)
    res.json({ count })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all notifications', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/recent', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const notifications = await notificationService.getRecentNotifications(req.user.id, limit)
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recent notifications', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/count', authenticate, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id)
    res.json({ count })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification count', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await notificationService.getNotificationStats(req.user.id)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification stats', details: error instanceof Error ? error.message : undefined })
  }
})

// Preferences routes
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = await notificationService.getNotificationPreferences(req.user.id)
    res.json(preferences || {})
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification preferences', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/preferences', authenticate, validateRequest(notificationSchemas.updatePreferences), async (req, res) => {
  try {
    const preferences = await notificationService.updateNotificationPreferences({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      ...req.body,
    })
    res.json(preferences)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification preferences', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/preferences/should-send', authenticate, async (req, res) => {
  try {
    const type = req.query.type as string
    if (!type) {
      return res.status(400).json({ error: 'Type query parameter is required' })
    }

    const shouldSend = await notificationService.shouldSendNotification(
      req.user.id,
      type as any
    )
    res.json({ shouldSend })
  } catch (error) {
    res.status(500).json({ error: 'Failed to check notification preference', details: error instanceof Error ? error.message : undefined })
  }
})

// Push notification routes
router.post('/push/tokens', authenticate, validateRequest(pushSchemas.registerToken), async (req, res) => {
  try {
    const token = await pushService.registerPushToken({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      ...req.body,
    })
    res.status(201).json(token)
  } catch (error) {
    res.status(500).json({ error: 'Failed to register push token', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/push/tokens', authenticate, async (req, res) => {
  try {
    const tokens = await pushService.getUserPushTokens(req.user.id)
    res.json(tokens)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get push tokens', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/push/tokens/:token', authenticate, async (req, res) => {
  try {
    const platform = req.query.platform as 'ios' | 'android' | 'web'
    if (!platform) {
      return res.status(400).json({ error: 'Platform query parameter is required' })
    }

    const token = await pushService.deactivatePushToken(
      req.user.id,
      req.params.token,
      platform
    )
    res.json(token)
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate push token', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/push/send', authenticate, validateRequest(pushSchemas.sendPushNotification), async (req, res) => {
  try {
    const result = await pushService.sendPushNotification({
      userId: req.body.userId,
      title: req.body.title,
      body: req.body.body,
      data: req.body.data,
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to send push notification', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/push/broadcast', authenticate, validateRequest(pushSchemas.sendBroadcastNotification), async (req, res) => {
  try {
    const result = await pushService.sendBroadcastNotification(
      req.user.organizationId,
      req.body.title,
      req.body.body,
      req.body.data
    )
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to send broadcast notification', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/push/cleanup', authenticate, async (req, res) => {
  try {
    const count = await pushService.cleanupInactiveTokens()
    res.json({ count })
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup inactive tokens', details: error instanceof Error ? error.message : undefined })
  }
})

export default router