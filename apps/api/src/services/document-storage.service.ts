import { PrismaClient } from '@prisma/client';
import { createLogger } from '@neru/core/logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { Trace } from '@neru/core/monitoring/tracing-decorators';
import {
  Document,
  DocumentMetadata,
  StorageResult,
  DocumentFilters,
  SearchResults,
  DocumentVersion,
  VersioningResult,
} from '@neru/types';

const logger = createLogger('DocumentStorageService');

export class DocumentStorageService {
  private readonly prisma: PrismaClient;
  private readonly STORAGE_BASE_DIR = process.env.DOCUMENT_STORAGE_PATH || './storage/documents';
  private readonly MAX_FILE_SIZE = parseInt(process.env.MAX_DOCUMENT_SIZE || '104857600'); // 100MB default

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeStorage();
  }

  @Trace({ operationName: 'document-storage.initialize' })
  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.STORAGE_BASE_DIR, { recursive: true });
      logger.info('Document storage initialized', { path: this.STORAGE_BASE_DIR });
    } catch (error) {
      logger.error('Failed to initialize document storage', { error });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.uploadDocument' })
  async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    metadata: DocumentMetadata,
    options?: {
      uploadedBy?: string;
      tags?: string[];
    }
  ): Promise<Document> {
    const startTime = Date.now();
    
    try {
      // Validate file size
      if (fileBuffer.length > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(fileBuffer);

      // Generate unique document ID
      const documentId = this.generateDocumentId();
      
      // Store file
      const storageResult = await this.storeDocument(fileBuffer, fileName, metadata.storageProvider || 'LocalStorage');

      // Create document record
      const document = await this.prisma.document.create({
        data: {
          documentId,
          filename: fileName,
          fileSize: fileBuffer.length,
          mimeType,
          storageLocation: storageResult.storageLocation,
          storageProvider: storageResult.storageProvider,
          checksum,
          documentType: metadata.documentType,
          category: metadata.category,
          sensitivity: metadata.sensitivity,
          leadId: metadata.leadId,
          agentId: metadata.agentId,
          uploadedBy: options?.uploadedBy || 'system',
          tags: options?.tags || [],
          jurisdiction: metadata.jurisdiction,
          description: metadata.description,
          retentionCategory: 'default_retention', // Will be updated by classification service
          relatedDocuments: [],
          piiFields: [],
          regulations: [],
        },
      });

      logger.info('Document uploaded successfully', {
        documentId: document.id,
        filename: document.filename,
        size: document.fileSize,
        duration: Date.now() - startTime,
      });

      return document;
    } catch (error) {
      logger.error('Failed to upload document', {
        fileName,
        metadata,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.storeDocument' })
  private async storeDocument(
    fileBuffer: Buffer,
    fileName: string,
    storageProvider: StorageProvider
  ): Promise<StorageResult> {
    try {
      const fileExtension = path.extname(fileName);
      const baseName = path.basename(fileName, fileExtension);
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const storagePath = `${Date.now()}-${uniqueId}-${baseName}${fileExtension}`;
      const fullPath = path.join(this.STORAGE_BASE_DIR, storagePath);

      await fs.writeFile(fullPath, fileBuffer);

      return {
        success: true,
        storageLocation: fullPath,
        storageProvider,
        fileSize: fileBuffer.length,
        checksum: this.calculateChecksum(fileBuffer),
      };
    } catch (error) {
      logger.error('Failed to store document', {
        fileName,
        storageProvider,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.getDocument' })
  async getDocument(documentId: string): Promise<Document> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          versions: { orderBy: { versionNumber: 'desc' } },
          retentionPolicy: true,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Update last accessed time
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          lastAccessedDate: new Date(),
        },
      });

      return document;
    } catch (error) {
      logger.error('Failed to get document', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.downloadDocument' })
  async downloadDocument(documentId: string): Promise<Buffer> {
    try {
      const document = await this.getDocument(documentId);
      
      // Check if document exists on storage
      try {
        await fs.access(document.storageLocation);
      } catch (error) {
        throw new Error(`Document file not found on storage: ${document.storageLocation}`);
      }

      const fileBuffer = await fs.readFile(document.storageLocation);

      // Verify integrity
      const currentChecksum = this.calculateChecksum(fileBuffer);
      if (currentChecksum !== document.checksum) {
        logger.error('Document integrity check failed', {
          documentId,
          expectedChecksum: document.checksum,
          actualChecksum: currentChecksum,
        });
        throw new Error('Document integrity check failed');
      }

      logger.info('Document downloaded successfully', {
        documentId,
        filename: document.filename,
        fileSize: fileBuffer.length,
      });

      return fileBuffer;
    } catch (error) {
      logger.error('Failed to download document', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.deleteDocument' })
  async deleteDocument(documentId: string, reason: string): Promise<void> {
    try {
      const document = await this.getDocument(documentId);

      // Check for legal hold
      if (document.legalHoldApplied) {
        throw new Error('Cannot delete document under legal hold');
      }

      // Delete physical file
      try {
        await fs.unlink(document.storageLocation);
      } catch (error) {
        logger.warn('Failed to delete physical file', {
          documentId,
          storageLocation: document.storageLocation,
          error: error instanceof Error ? error.message : error,
        });
      }

      // Mark document as deleted in database
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'Deleted',
          deletionDate: new Date(),
        },
      });

      logger.info('Document deleted', {
        documentId,
        filename: document.filename,
        deletionReason: reason,
      });
    } catch (error) {
      logger.error('Failed to delete document', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.listDocuments' })
  async listDocuments(filters?: DocumentFilters): Promise<Document[]> {
    try {
      const whereClause: any = {};

      if (filters) {
        if (filters.documentType) whereClause.documentType = filters.documentType;
        if (filters.category) whereClause.category = filters.category;
        if (filters.status) whereClause.status = filters.status;
        if (filters.leadId) whereClause.leadId = filters.leadId;
        if (filters.agentId) whereClause.agentId = filters.agentId;
        if (filters.sensitivity) whereClause.sensitivity = filters.sensitivity;
        if (filters.uploadedBy) whereClause.uploadedBy = filters.uploadedBy;
        if (filters.jurisdiction) whereClause.jurisdiction = filters.jurisdiction;
        
        if (filters.dateFrom || filters.dateTo) {
          whereClause.uploadedDate = {};
          if (filters.dateFrom) whereClause.uploadedDate.gte = filters.dateFrom;
          if (filters.dateTo) whereClause.uploadedDate.lte = filters.dateTo;
        }

        if (filters.tags && filters.tags.length > 0) {
          whereClause.tags = { hasSome: filters.tags };
        }

        if (filters.hasPII !== undefined) {
          whereClause.piiDetected = filters.hasPII;
        }

        if (filters.legalHold !== undefined) {
          whereClause.legalHoldApplied = filters.legalHold;
        }
      }

      const documents = await this.prisma.document.findMany({
        where: whereClause,
        orderBy: { uploadedDate: 'desc' },
        skip: filters?.page ? (filters.page - 1) * (filters.limit || 20) : 0,
        take: filters?.limit || 20,
        include: {
          retentionPolicy: true,
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });

      logger.debug('Documents listed', {
        filterCount: documents.length,
        filters,
      });

      return documents;
    } catch (error) {
      logger.error('Failed to list documents', {
        filters,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.searchDocuments' })
  async searchDocuments(query: string, filters?: DocumentFilters): Promise<SearchResults> {
    try {
      const startTime = Date.now();
      
      const whereClause: any = {
        OR: [
          { filename: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } },
          { documentType: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (filters) {
        if (filters.documentType) whereClause.documentType = filters.documentType;
        if (filters.category) whereClause.category = filters.category;
        if (filters.status) whereClause.status = filters.status;
        if (filters.sensitivity) whereClause.sensitivity = filters.sensitivity;
        if (filters.leadId) whereClause.leadId = filters.leadId;
        if (filters.agentId) whereClause.agentId = filters.agentId;
      }

      const [documents, totalCount] = await this.prisma.$transaction([
        this.prisma.document.findMany({
          where: whereClause,
          orderBy: { uploadedDate: 'desc' },
          skip: filters?.page ? (filters.page - 1) * (filters.limit || 20) : 0,
          take: filters?.limit || 20,
          include: {
            retentionPolicy: true,
          },
        }),
        this.prisma.document.count({ where: whereClause }),
      ]);

      const results: SearchResults = {
        documents,
        totalCount,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        hasMore: totalCount > ((filters?.page || 1) * (filters?.limit || 20)),
        executionTime: Date.now() - startTime,
      };

      logger.info('Documents searched', {
        query,
        resultCount: documents.length,
        executionTime: results.executionTime,
      });

      return results;
    } catch (error) {
      logger.error('Failed to search documents', {
        query,
        filters,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.updateDocumentMetadata' })
  async updateDocumentMetadata(documentId: string, metadata: Partial<Document>): Promise<Document> {
    try {
      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          description: metadata.description,
          tags: metadata.tags,
          jurisdiction: metadata.jurisdiction,
          relatedDocuments: metadata.relatedDocuments,
          sensitivity: metadata.sensitivity,
        },
        include: {
          retentionPolicy: true,
          versions: { orderBy: { versionNumber: 'desc' } },
        },
      });

      logger.info('Document metadata updated', {
        documentId,
        updatedFields: Object.keys(metadata),
      });

      return document;
    } catch (error) {
      logger.error('Failed to update document metadata', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.createDocumentVersion' })
  async createDocumentVersion(
    documentId: string,
    fileBuffer?: Buffer,
    changes?: string,
    changeDescription?: string
  ): Promise<VersioningResult> {
    try {
      const currentDocument = await this.getDocument(documentId);
      
      const newVersionNumber = currentDocument.version + 1;
      
      let storageLocation = currentDocument.storageLocation;
      let fileSize = currentDocument.fileSize;
      let checksum = currentDocument.checksum;

      // If new file content provided, store it
      if (fileBuffer) {
        const storageResult = await this.storeDocument(
          fileBuffer,
          currentDocument.filename,
          currentDocument.storageProvider as StorageProvider
        );
        storageLocation = storageResult.storageLocation;
        fileSize = fileBuffer.length;
        checksum = this.calculateChecksum(fileBuffer);
      }

      // Create version record
      const versionRecord = await this.prisma.documentVersion.create({
        data: {
          documentId,
          versionNumber: newVersionNumber,
          storageLocation,
          checksum,
          uploadedBy: currentDocument.uploadedBy, // Will be updated by caller if different
          changeDescription,
          changes,
          fileSize,
        },
      });

      // Update document version number
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          version: newVersionNumber,
        },
      });

      logger.info('Document version created', {
        documentId,
        versionNumber: newVersionNumber,
      });

      return {
        success: true,
        documentId,
        versionNumber: newVersionNumber,
        versionId: versionRecord.id,
      };
    } catch (error) {
      logger.error('Failed to create document version', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.getDocumentVersions' })
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    try {
      const versions = await this.prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
      });

      return versions;
    } catch (error) {
      logger.error('Failed to get document versions', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.getDocumentVersion' })
  async getDocumentVersion(documentId: string, versionNumber: number): Promise<DocumentVersion> {
    try {
      const version = await this.prisma.documentVersion.findUnique({
        where: {
          documentId_versionNumber: {
            documentId,
            versionNumber,
          },
        },
      });

      if (!version) {
        throw new Error(`Version ${versionNumber} not found for document ${documentId}`);
      }

      return version;
    } catch (error) {
      logger.error('Failed to get document version', {
        documentId,
        versionNumber,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-storage.restoreDocumentVersion' })
  async restoreDocumentVersion(documentId: string, versionNumber: number): Promise<Document> {
    try {
      const version = await this.getDocumentVersion(documentId, versionNumber);
      
      // Check if we can access the version file
      try {
        await fs.access(version.storageLocation);
      } catch (error) {
        throw new Error(`Version file not found on storage: ${version.storageLocation}`);
      }

      // Create new version with old content
      const fileBuffer = await fs.readFile(version.storageLocation);
      const restoreResult = await this.createDocumentVersion(
        documentId,
        fileBuffer,
        JSON.stringify({ restoredFromVersion: versionNumber }),
        `Restored from version ${versionNumber}`
      );

      // Update document to use restored version's metadata
      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          filename: documentId, // Keep current filename
          fileSize: version.fileSize,
          checksum: version.checksum,
          storageLocation: version.storageLocation,
        },
        include: {
          retentionPolicy: true,
        },
      });

      logger.info('Document version restored', {
        documentId,
        restoredFromVersion: versionNumber,
        newVersion: restoreResult.versionNumber,
      });

      return document;
    } catch (error) {
      logger.error('Failed to restore document version', {
        documentId,
        versionNumber,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private generateDocumentId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(12).toString('hex');
    return `DOC-${timestamp}-${random}`;
  }

  private calculateChecksum(buffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  @Trace({ operationName: 'document-storage.healthCheck' })
  async healthCheck(): Promise<{ healthy: boolean; message: string; storagePath: string }> {
    try {
      await fs.access(this.STORAGE_BASE_DIR);
      return {
        healthy: true,
        message: 'Document storage is accessible',
        storagePath: this.STORAGE_BASE_DIR,
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Document storage is not accessible',
        storagePath: this.STORAGE_BASE_DIR,
      };
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}