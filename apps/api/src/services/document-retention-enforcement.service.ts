import { PrismaClient } from '@prisma/client';
import { createLogger } from '@neru/core/logger';
import { Trace } from '@neru/core/monitoring/tracing-decorators';
import {
  ArchiveResult,
  DeletionMethod,
  DeletionResult,
  Document,
  ProcessingResult,
  RetentionStatus,
} from '@neru/types';
import { DocumentStorageService } from './document-storage.service.js';
import { DocumentEncryptionService } from './document-encryption.service.js';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';

const logger = createLogger('DocumentRetentionEnforcementService');

export class DocumentRetentionEnforcementService {
  private readonly prisma: PrismaClient;
  private readonly storageService: DocumentStorageService;
  private readonly encryptionService: DocumentEncryptionService;
  private readonly ARCHIVE_BASE_DIR = process.env.ARCHIVE_STORAGE_PATH || './storage/archives';

  constructor() {
    this.prisma = new PrismaClient();
    this.storageService = new DocumentStorageService();
    this.encryptionService = new DocumentEncryptionService();
    this.initializeArchiveStorage();
  }

  @Trace({ operationName: 'document-retention.initializeArchiveStorage' })
  private async initializeArchiveStorage(): Promise<void> {
    try {
      await fs.mkdir(this.ARCHIVE_BASE_DIR, { recursive: true });
      logger.info('Archive storage initialized', { path: this.ARCHIVE_BASE_DIR });
    } catch (error) {
      logger.error('Failed to initialize archive storage', { error });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.enforceRetentionPolicies' })
  async enforceRetentionPolicies(): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let archivedCount = 0;
    let deletedCount = 0;
    let notifiedCount = 0;

    try {
      // Get documents eligible for archival (past archive date but not expired)
      const docsToArchive = await this.prisma.document.findMany({
        where: {
          status: 'Active',
          legalHoldApplied: false,
          expiryDate: {
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days before expiry
            gt: new Date(),
          },
        },
      });

      // Archive documents
      for (const document of docsToArchive) {
        try {
          await this.archiveDocument(document.id);
          archivedCount++;
          logger.info('Document archived', { documentId: document.id });
        } catch (error) {
          errors.push(`Failed to archive document ${document.id}: ${error instanceof Error ? error.message : error}`);
        }
      }

      // Get documents eligible for deletion (expired and no legal hold)
      const docsToDelete = await this.prisma.document.findMany({
        where: {
          status: 'Active',
          legalHoldApplied: false,
          expiryDate: {
            lte: new Date(),
          },
        },
      });

      // Schedule deletion for expired documents
      for (const document of docsToDelete) {
        try {
          await this.scheduleDocumentDeletion(document.id);
          deletedCount++;
          logger.info('Document scheduled for deletion', { documentId: document.id });
        } catch (error) {
          errors.push(`Failed to schedule deletion for document ${document.id}: ${error instanceof Error ? error.message : error}`);
        }
      }

      // Get documents nearing expiry for notification
      const docsToNotify = await this.prisma.document.findMany({
        where: {
          status: 'Active',
          expiryDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expiring within 7 days
            gt: new Date(),
          },
        },
      });

      // Send notifications
      for (const document of docsToNotify) {
        try {
          await this.sendExpiryNotification(document.id);
          notifiedCount++;
        } catch (error) {
          errors.push(`Failed to send expiry notification for document ${document.id}: ${error instanceof Error ? error.message : error}`);
        }
      }

      // Log expiration events
      for (const document of docsToNotify) {
        await this.createExpirationEvent(document.id, 'WillExpireIn7Days', document.expiryDate!);
      }

      logger.info('Retention policies enforced', {
        archivedCount,
        deletedCount,
        notifiedCount,
        errors: errors.length,
        duration: Date.now() - startTime,
      });

      return {
        success: errors.length === 0,
        processedCount: archivedCount + deletedCount + notifiedCount,
        failedCount: errors.length,
        errors,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Failed to enforce retention policies', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.calculateDocumentExpiry' })
  async calculateDocumentExpiry(documentId: string): Promise<Date> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          retentionPolicy: true,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Use override retention period if set
      if (document.retentionPeriodDays) {
        return new Date(document.uploadedDate.getTime() + document.retentionPeriodDays * 24 * 60 * 60 * 1000);
      }

      // Use policy retention period
      if (document.retentionPolicy) {
        return new Date(document.uploadedDate.getTime() + document.retentionPolicy.retentionDays * 24 * 60 * 60 * 1000);
      }

      // Default retention: 7 years (2555 days)
      return new Date(document.uploadedDate.getTime() + 2555 * 24 * 60 * 60 * 1000);
    } catch (error) {
      logger.error('Failed to calculate document expiry', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.archiveDocument' })
  async archiveDocument(documentId: string): Promise<ArchiveResult> {
    const startTime = Date.now();
    
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Check if already archived
      if (document.status === 'Archived') {
        logger.warn('Document already archived', { documentId });
        return {
          success: true,
          documentId,
          message: 'Document already archived',
        };
      }

      // Check for legal hold
      if (document.legalHoldApplied) {
        throw new Error('Cannot archive document under legal hold');
      }

      // Create archive package
      const archivePath = await this.createArchivePackage(document);

      // Calculate compressed size
      const stats = await fs.stat(archivePath);

      // Create archived document record
      await this.prisma.archivedDocument.create({
        data: {
          documentId,
          originalStorageLocation: document.storageLocation,
          archiveLocation: archivePath,
          archiveFormat: 'TAR.GZ',
          archivedBy: 'system',
          checksum: this.calculateChecksum(await fs.readFile(archivePath)),
          expiryDate: document.expiryDate,
        },
      });

      // Update document status
      const updatedDocument = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'Archived',
          archivedDate: new Date(),
        },
      });

      // Delete original file to free up space
      try {
        await fs.unlink(document.storageLocation);
      } catch (error) {
        logger.warn('Failed to delete original file after archival', {
          documentId,
          error: error instanceof Error ? error.message : error,
        });
      }

      const result: ArchiveResult = {
        success: true,
        documentId,
        archiveLocation: archivePath,
        archiveFormat: 'TAR.GZ',
        compressedSize: stats.size,
        originalSize: document.fileSize,
        duration: Date.now() - startTime,
      };

      logger.info('Document archived successfully', {
        documentId,
        archivePath,
        compressionRatio: ((document.fileSize - stats.size) / document.fileSize * 100).toFixed(2) + '%',
      });

      return result;
    } catch (error) {
      logger.error('Failed to archive document', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.scheduleDocumentDeletion' })
  async scheduleDocumentDeletion(documentId: string): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Check if already scheduled
      if (document.status === 'PendingDeletion') {
        logger.warn('Document already scheduled for deletion', { documentId });
        return;
      }

      // Update document status
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'PendingDeletion',
          deletionScheduledDate: new Date(),
        },
      });

      // Create deletion request
      await this.prisma.documentDeletionRequest.create({
        data: {
          documentId,
          documentType: document.documentType,
          requestedBy: 'system',
          requestReason: 'Retention policy expired',
          status: 'Pending',
          requestDate: new Date(),
        },
      });

      logger.info('Document deletion scheduled', {
        documentId,
        scheduledDate: new Date(),
      });
    } catch (error) {
      logger.error('Failed to schedule document deletion', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.executeDocumentDeletion' })
  async executeDocumentDeletion(documentId: string): Promise<DeletionResult> {
    const startTime = Date.now();
    
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Check for legal hold
      if (document.legalHoldApplied) {
        throw new Error('Cannot delete document under legal hold');
      }

      // Get deletion method from policy or use secure delete
      const deletionMethod: DeletionMethod = 'SecureDelete';

      // Execute secure deletion
      const deletionProof = await this.secureDelete(document.storageLocation, deletionMethod);

      // Update document status
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'Deleted',
          deletionDate: new Date(),
        },
      });

      // Update deletion request
      await this.prisma.documentDeletionRequest.updateMany({
        where: {
          documentId,
          status: 'Pending',
        },
        data: {
          status: 'Completed',
          executionDate: new Date(),
          completionDetails: JSON.stringify(deletionProof),
        },
      });

      const result: DeletionResult = {
        success: true,
        documentId,
        deletionMethod,
        auditProof: JSON.stringify(deletionProof),
        deletedAt: new Date(),
        duration: Date.now() - startTime,
      };

      logger.info('Document deleted successfully', {
        documentId,
        deletionMethod,
        auditProof: deletionProof,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete document', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.applyLegalHold' })
  async applyLegalHold(
    documentId: string,
    holdReason: string,
    caseNumber?: string,
    jurisdiction?: string
  ): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Update document with legal hold
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          legalHoldApplied: true,
          legalHoldReason: holdReason,
        },
      });

      // Create litigation hold record
      const holdId = `HOLD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      await this.prisma.litigationHold.create({
        data: {
          holdId,
          caseNumber,
          description: `Legal hold applied to document ${document.filename}`,
          reason: holdReason,
          appliedBy: 'system',
          targetDocuments: [documentId],
          jurisdiction,
        },
      });

      logger.info('Legal hold applied', {
        documentId,
        holdId,
        reason: holdReason,
      });
    } catch (error) {
      logger.error('Failed to apply legal hold', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.removeLegalHold' })
  async removeLegalHold(documentId: string, liftReason: string): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      if (!document.legalHoldApplied) {
        logger.warn('Document is not under legal hold', { documentId });
        return;
      }

      // Update document
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          legalHoldApplied: false,
          legalHoldReason: null,
        },
      });

      // Update litigation hold record
      await this.prisma.litigationHold.updateMany({
        where: {
          targetDocuments: {
            has: documentId,
          },
          status: 'Active',
        },
        data: {
          status: 'Lifted',
          liftedDate: new Date(),
          liftReason,
        },
      });

      logger.info('Legal hold removed', {
        documentId,
        liftReason,
      });
    } catch (error) {
      logger.error('Failed to remove legal hold', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-retention.getDocumentRetentionStatus' })
  async getDocumentRetentionStatus(documentId: string): Promise<RetentionStatus> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          retentionPolicy: true,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const now = new Date();
      const daysRemaining = document.expiryDate
        ? Math.ceil((document.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : undefined;

      const lastAccessed = document.lastAccessedDate;
      const lastAccessedDaysAgo = lastAccessed
        ? Math.ceil((now.getTime() - lastAccessed.getTime()) / (24 * 60 * 60 * 1000))
        : undefined;

      const canBeDeleted = !document.legalHoldApplied && 
                          daysRemaining !== undefined && 
                          daysRemaining <= 0;

      const canBeArchived = !document.legalHoldApplied && 
                           document.status === 'Active' &&
                           (daysRemaining !== undefined && daysRemaining <= 30);

      return {
        documentId,
        policyName: document.retentionPolicy?.policyName || 'default',
        expiryDate: document.expiryDate || null,
        daysRemaining: daysRemaining || null,
        legalHoldApplied: document.legalHoldApplied,
        canBeDeleted,
        canBeArchived,
        lastAccessedDaysAgo: lastAccessedDaysAgo || null,
        currentStatus: document.status,
      };
    } catch (error) {
      logger.error('Failed to get retention status', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private async createArchivePackage(document: Document): Promise<string> {
    const archiveId = `ARCHIVE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const archivePath = path.join(this.ARCHIVE_BASE_DIR, `${archiveId}.tar.gz`);

    // Create archive file
    const output = await fs.open(archivePath, 'w');
    
    return new Promise((resolve, reject) => {
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: { level: 9 },
      });

      archive.on('error', reject);
      archive.pipe(output.createWriteStream());

      // Add document file
      archive.file(document.storageLocation, { name: document.filename });

      // Add metadata
      const metadata = {
        documentId: document.id,
        documentType: document.documentType,
        filename: document.filename,
        uploadDate: document.uploadedDate,
        checksum: document.checksum,
        version: document.version,
      };
      
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

      archive.finalize();
      
      archive.on('end', () => {
        output.close();
        resolve(archivePath);
      });
    });
  }

  private async secureDelete(filePath: string, method: DeletionMethod): Promise<any> {
    try {
      // Verify file exists
      await fs.access(filePath);

      // Get file stats for audit
      const stats = await fs.stat(filePath);

      // Overwrite file with random data multiple times (DOD 5220.22-M standard)
      if (method === 'SecureDelete') {
        const passes = 3;
        for (let i = 0; i < passes; i++) {
          const randomData = crypto.randomBytes(stats.size);
          await fs.writeFile(filePath, randomData);
        }
      }

      // Delete file
      await fs.unlink(filePath);

      return {
        method,
        filePath,
        fileSize: stats.size,
        deletionDate: new Date(),
        overwritePasses: method === 'SecureDelete' ? 3 : 0,
      };
    } catch (error) {
      logger.error('Failed to securely delete file', {
        filePath,
        method,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private async sendExpiryNotification(documentId: string): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document || !document.expiryDate) {
        return;
      }

      const daysRemaining = Math.ceil(
        (document.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      logger.info('Sending expiry notification', {
        documentId,
        filename: document.filename,
        daysRemaining,
      });

      // In production, integrate with notification service
      // For now, just log the notification
    } catch (error) {
      logger.error('Failed to send expiry notification', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private async createExpirationEvent(
    documentId: string,
    eventType: string,
    scheduledDate: Date
  ): Promise<void> {
    try {
      await this.prisma.documentExpirationEvent.create({
        data: {
          documentId,
          eventType,
          scheduledDate,
          status: 'Scheduled',
        },
      });
    } catch (error) {
      logger.error('Failed to create expiration event', {
        documentId,
        eventType,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private calculateChecksum(buffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  async disconnect() {
    await this.storageService.disconnect();
    await this.encryptionService.disconnect();
    await this.prisma.$disconnect();
  }
}