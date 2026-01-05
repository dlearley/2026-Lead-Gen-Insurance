// Integrations Routes

import express from 'express'
import { PrismaClient } from '@prisma/client'
import { IntegrationService, SyncService, WebhookService, FieldMappingService } from '@insurance-lead-gen/communication'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'
import { integrationSchemas, syncSchemas, webhookSchemas, mappingSchemas } from '../schemas/integrations.js'

const router = express.Router()
const prisma = new PrismaClient()

// Services
const integrationService = new IntegrationService(prisma)
const syncService = new SyncService(prisma)
const webhookService = new WebhookService(prisma)
const fieldMappingService = new FieldMappingService(prisma)

// Integration routes
router.post('/:type/authorize', authenticate, validateRequest(integrationSchemas.connectIntegration), async (req, res) => {
  try {
    const integration = await integrationService.connectIntegration({
      organizationId: req.user.organizationId,
      integrationType: req.params.type as any,
      ...req.body,
    })
    res.status(201).json(integration)
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect integration', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const integrations = await integrationService.listIntegrations(req.user.organizationId)
    res.json(integrations)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list integrations', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const integration = await integrationService.getIntegration(req.params.id)
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }
    res.json(integration)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get integration', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/:id', authenticate, validateRequest(integrationSchemas.updateIntegration), async (req, res) => {
  try {
    const integration = await integrationService.updateIntegration({
      integrationId: req.params.id,
      ...req.body,
    })
    res.json(integration)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update integration', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const integration = await integrationService.disconnectIntegration(req.params.id)
    res.json(integration)
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect integration', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const status = await integrationService.checkIntegrationStatus(req.params.id)
    res.json(status)
  } catch (error) {
    res.status(500).json({ error: 'Failed to check integration status', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/config', authenticate, async (req, res) => {
  try {
    const config = await integrationService.getIntegrationConfig(req.params.id)
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get integration config', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/:id/config', authenticate, async (req, res) => {
  try {
    const integration = await integrationService.updateIntegrationConfig(
      req.params.id,
      req.body
    )
    res.json(integration)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update integration config', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/type/:type', authenticate, async (req, res) => {
  try {
    const integration = await integrationService.getIntegrationByType(
      req.user.organizationId,
      req.params.type as any
    )
    res.json(integration || {})
  } catch (error) {
    res.status(500).json({ error: 'Failed to get integration by type', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/active', authenticate, async (req, res) => {
  try {
    const integrations = await integrationService.getActiveIntegrations(req.user.organizationId)
    res.json(integrations)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active integrations', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/sync/enable', authenticate, async (req, res) => {
  try {
    const integration = await integrationService.enableIntegrationSync(req.params.id)
    res.json(integration)
  } catch (error) {
    res.status(500).json({ error: 'Failed to enable integration sync', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/sync/disable', authenticate, async (req, res) => {
  try {
    const integration = await integrationService.disableIntegrationSync(req.params.id)
    res.json(integration)
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable integration sync', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await integrationService.getIntegrationStats(req.user.organizationId)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get integration stats', details: error instanceof Error ? error.message : undefined })
  }
})

// Sync routes
router.post('/:id/sync', authenticate, validateRequest(syncSchemas.triggerSync), async (req, res) => {
  try {
    const sync = await syncService.triggerSync({
      integrationId: req.params.id,
      ...req.body,
    })
    res.status(201).json(sync)
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger sync', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/sync/:syncId', authenticate, async (req, res) => {
  try {
    const sync = await syncService.getSyncStatus(req.params.syncId)
    res.json(sync)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sync status', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/sync/history', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    const history = await syncService.getSyncHistory(req.params.id, limit)
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sync history', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/mappings', authenticate, validateRequest(mappingSchemas.createFieldMapping), async (req, res) => {
  try {
    const mapping = await fieldMappingService.createFieldMapping({
      integrationId: req.params.id,
      ...req.body,
    })
    res.status(201).json(mapping)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create field mapping', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/mappings', authenticate, async (req, res) => {
  try {
    const mappings = await fieldMappingService.getFieldMappings(req.params.id)
    res.json(mappings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get field mappings', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/:id/mappings/:mappingId', authenticate, async (req, res) => {
  try {
    const mapping = await fieldMappingService.updateFieldMapping(
      req.params.mappingId,
      req.body
    )
    res.json(mapping)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update field mapping', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/:id/mappings/:mappingId', authenticate, async (req, res) => {
  try {
    const mapping = await fieldMappingService.deleteFieldMapping(req.params.mappingId)
    res.json(mapping)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete field mapping', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/mappings/transform', authenticate, async (req, res) => {
  try {
    const result = await fieldMappingService.transformData(
      req.params.id,
      req.body.sourceData
    )
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to transform data', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/mappings/reverse-transform', authenticate, async (req, res) => {
  try {
    const result = await fieldMappingService.reverseTransformData(
      req.params.id,
      req.body.targetData
    )
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to reverse transform data', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/mappings/validate', authenticate, async (req, res) => {
  try {
    const result = await fieldMappingService.validateFieldMappings(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate field mappings', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/mappings/coverage', authenticate, async (req, res) => {
  try {
    const coverage = await fieldMappingService.getMappingCoverage(req.params.id)
    res.json(coverage)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get mapping coverage', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/sync/stats', authenticate, async (req, res) => {
  try {
    const stats = await syncService.getSyncStats(req.params.id)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sync stats', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/sync/schedule', authenticate, async (req, res) => {
  try {
    const sync = await syncService.scheduleSync(
      req.params.id,
      req.body.syncType,
      req.body.direction,
      new Date(req.body.scheduleTime)
    )
    res.status(201).json(sync)
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule sync', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/sync/pending/cancel', authenticate, async (req, res) => {
  try {
    const count = await syncService.cancelPendingSyncs(req.params.id)
    res.json({ count })
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel pending syncs', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/sync/pending', authenticate, async (req, res) => {
  try {
    const pending = await syncService.getPendingSyncs(req.params.id)
    res.json(pending)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending syncs', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/sync/:syncId/retry', authenticate, async (req, res) => {
  try {
    const sync = await syncService.retryFailedSync(req.params.syncId)
    res.json(sync)
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry sync', details: error instanceof Error ? error.message : undefined })
  }
})

// Webhook routes
router.post('/:id/webhooks', authenticate, validateRequest(webhookSchemas.registerWebhook), async (req, res) => {
  try {
    const webhook = await webhookService.registerWebhook(
      req.params.id,
      req.body.event
    )
    res.status(201).json(webhook)
  } catch (error) {
    res.status(500).json({ error: 'Failed to register webhook', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/webhooks', authenticate, async (req, res) => {
  try {
    const webhooks = await webhookService.getWebhooks(req.params.id)
    res.json(webhooks)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get webhooks', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/:id/webhooks/:webhookId', authenticate, async (req, res) => {
  try {
    const webhook = await webhookService.deleteWebhook(req.params.webhookId)
    res.json(webhook)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete webhook', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/webhooks/:webhookId/enable', authenticate, async (req, res) => {
  try {
    const webhook = await webhookService.enableWebhook(req.params.webhookId)
    res.json(webhook)
  } catch (error) {
    res.status(500).json({ error: 'Failed to enable webhook', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:id/webhooks/:webhookId/disable', authenticate, async (req, res) => {
  try {
    const webhook = await webhookService.disableWebhook(req.params.webhookId)
    res.json(webhook)
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable webhook', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/webhooks/events', authenticate, async (req, res) => {
  try {
    const events = await webhookService.getWebhookEvents(req.params.id)
    res.json(events)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get webhook events', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/webhooks/active', authenticate, async (req, res) => {
  try {
    const webhooks = await webhookService.getActiveWebhooks(req.params.id)
    res.json(webhooks)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active webhooks', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:id/webhooks/stats', authenticate, async (req, res) => {
  try {
    const stats = await webhookService.getWebhookStats(req.params.id)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get webhook stats', details: error instanceof Error ? error.message : undefined })
  }
})

// Webhook handler endpoint
router.post('/webhooks/:integrationId/:event', async (req, res) => {
  try {
    const integrationId = req.params.integrationId
    const event = req.params.event
    
    // Verify signature if provided
    const signature = req.headers['x-signature'] as string
    if (signature) {
      const integration = await integrationService.getIntegration(integrationId)
      if (integration?.webhookSecret) {
        const isValid = await webhookService.verifyWebhookSignature(
          req.body,
          signature,
          integration.webhookSecret
        )
        
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid webhook signature' })
        }
      }
    }

    const result = await webhookService.handleWebhook({
      event,
      integrationId,
      data: req.body,
      timestamp: new Date(),
    })

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Failed to process webhook', details: error instanceof Error ? error.message : undefined })
  }
})

export default router