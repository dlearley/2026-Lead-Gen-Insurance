// Collaboration Routes

import express from 'express'
import { PrismaClient } from '@prisma/client'
import { DocumentService, CaseService, VersionControlService, CaseActivityService } from '@insurance-lead-gen/communication'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'
import { documentSchemas, caseSchemas } from '../schemas/collaboration.js'

const router = express.Router()
const prisma = new PrismaClient()

// Services
const documentService = new DocumentService(prisma)
const caseService = new CaseService(prisma)
const versionControlService = new VersionControlService(prisma)
const caseActivityService = new CaseActivityService(prisma)

// Document routes
router.post('/documents', authenticate, validateRequest(documentSchemas.uploadDocument), async (req, res) => {
  try {
    const document = await documentService.uploadDocument({
      organizationId: req.user.organizationId,
      ownerId: req.user.id,
      ...req.body,
    })
    res.status(201).json(document)
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents', authenticate, async (req, res) => {
  try {
    const documents = await documentService.listDocuments(
      req.user.organizationId,
      req.user.id
    )
    res.json(documents)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documents', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/:id', authenticate, async (req, res) => {
  try {
    const document = await documentService.getDocument(req.params.id)
    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }
    res.json(document)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get document', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/documents/:id', authenticate, validateRequest(documentSchemas.updateDocument), async (req, res) => {
  try {
    const document = await documentService.updateDocument(req.params.id, req.body)
    res.json(document)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/documents/:id', authenticate, async (req, res) => {
  try {
    const document = await documentService.deleteDocument(req.params.id)
    res.json(document)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/documents/:id/permissions', authenticate, validateRequest(documentSchemas.shareDocument), async (req, res) => {
  try {
    const permission = await documentService.shareDocument({
      documentId: req.params.id,
      ...req.body,
      grantedBy: req.user.id,
    })
    res.status(201).json(permission)
  } catch (error) {
    res.status(500).json({ error: 'Failed to share document', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/:id/permissions', authenticate, async (req, res) => {
  try {
    const permissions = await documentService.getDocumentPermissions(req.params.id)
    res.json(permissions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get document permissions', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/documents/:id/permissions/:userId', authenticate, async (req, res) => {
  try {
    const permission = await documentService.updateDocumentPermission(
      req.params.id,
      req.params.userId,
      req.body.permission
    )
    res.json(permission)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document permission', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/documents/:id/permissions/:userId', authenticate, async (req, res) => {
  try {
    const permission = await documentService.revokeDocumentAccess(
      req.params.id,
      req.params.userId
    )
    res.json(permission)
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke document access', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/documents/:id/comments', authenticate, validateRequest(documentSchemas.addDocumentComment), async (req, res) => {
  try {
    const comment = await documentService.addDocumentComment({
      documentId: req.params.id,
      authorId: req.user.id,
      ...req.body,
    })
    res.status(201).json(comment)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add document comment', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/:id/comments', authenticate, async (req, res) => {
  try {
    const comments = await documentService.getDocumentComments(req.params.id)
    res.json(comments)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get document comments', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/documents/:id/comments/:commentId/resolve', authenticate, async (req, res) => {
  try {
    const comment = await documentService.resolveComment(
      req.params.commentId,
      req.user.id
    )
    res.json(comment)
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve comment', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/documents/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const comment = await documentService.deleteComment(req.params.commentId)
    res.json(comment)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/search', authenticate, async (req, res) => {
  try {
    const query = req.query.query as string
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    const documents = await documentService.searchDocuments(
      req.user.organizationId,
      query,
      req.user.id,
      limit
    )
    res.json(documents)
  } catch (error) {
    res.status(500).json({ error: 'Failed to search documents', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/:id/access', authenticate, async (req, res) => {
  try {
    const hasAccess = await documentService.checkDocumentAccess(
      req.params.id,
      req.user.id
    )
    res.json({ hasAccess })
  } catch (error) {
    res.status(500).json({ error: 'Failed to check document access', details: error instanceof Error ? error.message : undefined })
  }
})

// Version control routes
router.post('/documents/:id/versions', authenticate, async (req, res) => {
  try {
    const version = await versionControlService.createVersion(
      req.params.id,
      req.body.fileUrl,
      req.body.fileSize,
      req.user.id,
      req.body.changeSummary
    )
    res.status(201).json(version)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create version', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/:id/versions', authenticate, async (req, res) => {
  try {
    const versions = await versionControlService.getVersions(req.params.id)
    res.json(versions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get versions', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/:id/versions/:versionNumber', authenticate, async (req, res) => {
  try {
    const version = await versionControlService.getVersion(
      req.params.id,
      parseInt(req.params.versionNumber)
    )
    if (!version) {
      return res.status(404).json({ error: 'Version not found' })
    }
    res.json(version)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get version', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/documents/:id/versions/:versionNumber/restore', authenticate, async (req, res) => {
  try {
    const version = await versionControlService.restoreVersion(
      req.params.id,
      parseInt(req.params.versionNumber)
    )
    res.json(version)
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore version', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/documents/:id/versions/compare', authenticate, async (req, res) => {
  try {
    const version1 = parseInt(req.query.version1 as string)
    const version2 = parseInt(req.query.version2 as string)
    
    if (isNaN(version1) || isNaN(version2)) {
      return res.status(400).json({ error: 'Invalid version numbers' })
    }

    const comparison = await versionControlService.compareVersions(
      req.params.id,
      version1,
      version2
    )
    res.json(comparison)
  } catch (error) {
    res.status(500).json({ error: 'Failed to compare versions', details: error instanceof Error ? error.message : undefined })
  }
})

// Case routes
router.post('/cases', authenticate, validateRequest(caseSchemas.createCase), async (req, res) => {
  try {
    const caseData = await caseService.createCase({
      organizationId: req.user.organizationId,
      createdById: req.user.id,
      ...req.body,
    })
    res.status(201).json(caseData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create case', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases', authenticate, async (req, res) => {
  try {
    const cases = await caseService.listCases(req.user.organizationId)
    res.json(cases)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list cases', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases/:id', authenticate, async (req, res) => {
  try {
    const caseData = await caseService.getCase(req.params.id)
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' })
    }
    res.json(caseData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get case', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/cases/:id', authenticate, validateRequest(caseSchemas.updateCase), async (req, res) => {
  try {
    const caseData = await caseService.updateCase(req.params.id, req.body)
    res.json(caseData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update case', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/cases/:id/close', authenticate, async (req, res) => {
  try {
    const caseData = await caseService.closeCase(req.params.id)
    res.json(caseData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to close case', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/cases/:id/reopen', authenticate, async (req, res) => {
  try {
    const caseData = await caseService.reopenCase(req.params.id)
    res.json(caseData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to reopen case', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/cases/:id/assign', authenticate, async (req, res) => {
  try {
    const caseData = await caseService.assignCase(req.params.id, req.body.assignedToId)
    res.json(caseData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign case', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/cases/:id/notes', authenticate, validateRequest(caseSchemas.addCaseNote), async (req, res) => {
  try {
    const note = await caseService.addCaseNote({
      caseId: req.params.id,
      authorId: req.user.id,
      ...req.body,
    })
    res.status(201).json(note)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add case note', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases/:id/notes', authenticate, async (req, res) => {
  try {
    const notes = await caseService.getCaseNotes(req.params.id)
    res.json(notes)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get case notes', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/cases/notes/:noteId', authenticate, async (req, res) => {
  try {
    const note = await caseService.updateCaseNote(req.params.noteId, req.body.content)
    res.json(note)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update case note', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/cases/notes/:noteId', authenticate, async (req, res) => {
  try {
    const note = await caseService.deleteCaseNote(req.params.noteId)
    res.json(note)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete case note', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/cases/:id/activities', authenticate, validateRequest(caseSchemas.addCaseActivity), async (req, res) => {
  try {
    const activity = await caseActivityService.addActivity({
      caseId: req.params.id,
      userId: req.user.id,
      ...req.body,
    })
    res.status(201).json(activity)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add case activity', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases/:id/activities', authenticate, async (req, res) => {
  try {
    const activities = await caseActivityService.getCaseTimeline(req.params.id)
    res.json(activities)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get case activities', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/cases/:id/documents', authenticate, async (req, res) => {
  try {
    const caseDocument = await caseService.addCaseDocument(
      req.params.id,
      req.body.documentId,
      req.body.documentType
    )
    res.status(201).json(caseDocument)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add case document', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases/:id/documents', authenticate, async (req, res) => {
  try {
    const documents = await caseService.getCaseDocuments(req.params.id)
    res.json(documents)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get case documents', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/cases/:id/documents/:documentId', authenticate, async (req, res) => {
  try {
    const caseDocument = await caseService.removeCaseDocument(
      req.params.id,
      req.params.documentId
    )
    res.json(caseDocument)
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove case document', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases/search', authenticate, async (req, res) => {
  try {
    const query = req.query.query as string
    const status = req.query.status as string | undefined
    const priority = req.query.priority as string | undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    const cases = await caseService.searchCases(
      req.user.organizationId,
      query,
      status as any,
      priority as any,
      limit
    )
    res.json(cases)
  } catch (error) {
    res.status(500).json({ error: 'Failed to search cases', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases/user', authenticate, async (req, res) => {
  try {
    const cases = await caseService.getUserCases(req.user.id)
    res.json(cases)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user cases', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/cases/stats', authenticate, async (req, res) => {
  try {
    const stats = await caseService.getCaseStats(req.user.organizationId)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get case stats', details: error instanceof Error ? error.message : undefined })
  }
})

export default router