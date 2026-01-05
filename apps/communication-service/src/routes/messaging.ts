// Messaging Routes

import express from 'express'
import { PrismaClient } from '@prisma/client'
import { ConversationService, MessageService, PresenceService } from '@insurance-lead-gen/communication'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'
import { conversationSchemas, messageSchemas, presenceSchemas } from '../schemas/messaging.js'

const router = express.Router()
const prisma = new PrismaClient()

// Services
const conversationService = new ConversationService(prisma)
const messageService = new MessageService(prisma)
const presenceService = new PresenceService(prisma)

// Conversation routes
router.post('/conversations', authenticate, validateRequest(conversationSchemas.createConversation), async (req, res) => {
  try {
    const conversation = await conversationService.createConversation(req.body)
    res.status(201).json(conversation)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await conversationService.listConversations(
      req.user.organizationId,
      req.user.id
    )
    res.json(conversations)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list conversations', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/conversations/:id', authenticate, async (req, res) => {
  try {
    const conversation = await conversationService.getConversation(req.params.id)
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }
    res.json(conversation)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get conversation', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/conversations/:id', authenticate, validateRequest(conversationSchemas.updateConversation), async (req, res) => {
  try {
    const conversation = await conversationService.updateConversation(req.params.id, req.body)
    res.json(conversation)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update conversation', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/conversations/:id', authenticate, async (req, res) => {
  try {
    const conversation = await conversationService.deleteConversation(req.params.id)
    res.json(conversation)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete conversation', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/conversations/:id/participants', authenticate, validateRequest(conversationSchemas.addParticipant), async (req, res) => {
  try {
    const participant = await conversationService.addParticipant(
      req.params.id,
      req.body.userId,
      req.body.role
    )
    res.status(201).json(participant)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add participant', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/conversations/:id/participants/:userId', authenticate, async (req, res) => {
  try {
    const participant = await conversationService.removeParticipant(
      req.params.id,
      req.params.userId
    )
    res.json(participant)
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove participant', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/conversations/:id/read', authenticate, async (req, res) => {
  try {
    const participant = await conversationService.markAsRead(
      req.params.id,
      req.user.id
    )
    res.json(participant)
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read', details: error instanceof Error ? error.message : undefined })
  }
})

// Message routes
router.post('/:conversationId/send', authenticate, validateRequest(messageSchemas.sendMessage), async (req, res) => {
  try {
    const message = await messageService.sendMessage({
      conversationId: req.params.conversationId,
      authorId: req.user.id,
      ...req.body,
    })
    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:conversationId/history', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
    const cursor = req.query.cursor as string | undefined
    
    const messages = await messageService.getMessageHistory(
      req.params.conversationId,
      limit,
      cursor
    )
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get message history', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:conversationId/threads/:threadId', authenticate, async (req, res) => {
  try {
    const messages = await messageService.getThreadMessages(req.params.threadId)
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get thread messages', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/:messageId', authenticate, validateRequest(messageSchemas.updateMessage), async (req, res) => {
  try {
    const message = await messageService.updateMessage({
      messageId: req.params.messageId,
      content: req.body.content,
    })
    res.json(message)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const message = await messageService.deleteMessage(req.params.messageId)
    res.json(message)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:messageId/react', authenticate, validateRequest(messageSchemas.addReaction), async (req, res) => {
  try {
    await messageService.addReaction({
      messageId: req.params.messageId,
      userId: req.user.id,
      emoji: req.body.emoji,
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reaction', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:messageId/pin', authenticate, async (req, res) => {
  try {
    const message = await messageService.pinMessage(
      req.params.messageId,
      req.body.isPinned
    )
    res.json(message)
  } catch (error) {
    res.status(500).json({ error: 'Failed to pin message', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/search', authenticate, async (req, res) => {
  try {
    const query = req.query.query as string
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    const messages = await messageService.searchMessages(
      req.user.organizationId,
      query,
      limit
    )
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: 'Failed to search messages', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:conversationId/unread', authenticate, async (req, res) => {
  try {
    const count = await messageService.getUnreadCount(
      req.params.conversationId,
      req.user.id
    )
    res.json({ count })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread count', details: error instanceof Error ? error.message : undefined })
  }
})

// Presence routes
router.post('/presence', authenticate, validateRequest(presenceSchemas.updatePresence), async (req, res) => {
  try {
    const presence = await presenceService.updatePresence({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      status: req.body.status,
    })
    res.json(presence)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update presence', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/presence', authenticate, async (req, res) => {
  try {
    const presence = await presenceService.getPresence(req.user.id)
    res.json(presence)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get presence', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/presence/online', authenticate, async (req, res) => {
  try {
    const onlineUsers = await presenceService.getOnlineUsers(req.user.organizationId)
    res.json(onlineUsers)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get online users', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/presence/status', authenticate, async (req, res) => {
  try {
    const userIds = req.query.userIds as string[]
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds query parameter is required and must be an array' })
    }

    const statuses = await presenceService.getUserStatuses(userIds)
    res.json(statuses)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user statuses', details: error instanceof Error ? error.message : undefined })
  }
})

export default router