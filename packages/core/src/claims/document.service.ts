import {
  ClaimDocument,
  UploadDocumentDto,
  ClaimAttachment,
  ClaimDocumentAccessLog,
  AccessType,
  DocumentType,
  AttachmentCategory,
  CreatedByType
} from '@insurance-lead-gen/types';
import { BaseError } from '../errors.js';
import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';
import * as AWS from 'aws-sdk';

/**
 * Document Service - Manages claims documents, attachments, and file operations
 */
export class DocumentService {
  private metrics = new MetricsCollector('claims_documents');
  private s3: AWS.S3;

  constructor() {
    // Initialize AWS S3 client
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Upload document to claim
   */
  async uploadDocument(
    file: Express.Multer.File,
    uploadData: UploadDocumentDto,
    uploadedBy: string,
    uploadedByType: CreatedByType,
    ipAddress?: string
  ): Promise<{ success: boolean; data?: ClaimDocument; error?: string }> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check claim exists
      const claim = await this.getClaimFromDatabase(uploadData.claimId);
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }

      // Upload to S3
      const s3Key = this.generateS3Key(uploadData.claimId, file.originalname);
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET || 'claims-documents',
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        Metadata: {
          claimId: uploadData.claimId,
          documentType: uploadData.documentType,
          uploadedBy,
          uploadedByType
        }
      };

      const s3Result = await this.s3.upload(uploadParams).promise();

      // Create document record
      const document = await this.createDocumentInDatabase({
        claimId: uploadData.claimId,
        documentType: uploadData.documentType,
        documentName: file.originalname,
        filePath: s3Result.Location,
        s3Key: s3Key,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy,
        uploadedByType,
        description: uploadData.description,
        isSharedWithInsured: uploadData.isSharedWithInsured || false,
        isSharedWithCarrier: uploadData.isSharedWithCarrier || false,
        isConfidential: uploadData.isConfidential || false
      });

      // Log access
      await this.logDocumentAccess({
        documentId: document.id,
        userId: uploadedBy,
        accessType: AccessType.VIEW,
        ipAddress
      });

      this.metrics.incrementCounter('documents_uploaded', { 
        documentType: uploadData.documentType,
        uploadedByType 
      });

      logger.info('Document uploaded successfully', {
        documentId: document.id,
        claimId: uploadData.claimId,
        fileName: file.originalname,
        fileSize: file.size
      });

      return {
        success: true,
        data: document,
        message: 'Document uploaded successfully'
      };
    } catch (error) {
      logger.error('Failed to upload document', { error, uploadData, fileName: file?.originalname });
      this.metrics.incrementCounter('document_upload_errors');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document'
      };
    }
  }

  /**
   * Get documents for a claim
   */
  async getClaimDocuments(
    claimId: string,
    userId?: string,
    userType?: 'INSURED' | 'ADJUSTER' | 'ADMIN'
  ): Promise<{ success: boolean; data?: ClaimDocument[]; error?: string }> {
    try {
      // Get claim documents with access control
      const documents = await this.getDocumentsByClaimId(claimId, userId, userType);

      // Log access for each document (view access)
      await Promise.all(
        documents.map(doc => 
          this.logDocumentAccess({
            documentId: doc.id,
            userId,
            accessType: AccessType.VIEW
          })
        )
      );

      return {
        success: true,
        data: documents
      };
    } catch (error) {
      logger.error('Failed to retrieve claim documents', { error, claimId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve documents'
      };
    }
  }

  /**
   * Download/view document with access control
   */
  async downloadDocument(
    documentId: string,
    userId: string,
    userType: 'INSURED' | 'ADJUSTER' | 'ADMIN',
    ipAddress?: string
  ): Promise<{ success: boolean; data?: { url: string; document: ClaimDocument }; error?: string }> {
    try {
      // Get document with access check
      const document = await this.getDocumentFromDatabase(documentId);
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      // Check access permissions
      const hasAccess = this.checkDocumentAccess(document, userId, userType);
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Generate signed URL for download
      const signedUrl = await this.generateSignedDownloadUrl(document.s3Key);

      // Log access
      await this.logDocumentAccess({
        documentId,
        userId,
        accessType: AccessType.DOWNLOAD,
        ipAddress
      });

      this.metrics.incrementCounter('documents_downloaded', { 
        documentType: document.documentType,
        userType 
      });

      return {
        success: true,
        data: {
          url: signedUrl,
          document
        }
      };
    } catch (error) {
      logger.error('Failed to download document', { error, documentId, userId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download document'
      };
    }
  }

  /**
   * Share document with external party
   */
  async shareDocument(
    documentId: string,
    sharedWith: string,
    shareType: 'INSURED' | 'CARRIER' | 'VENDOR',
    sharedBy: string
  ): Promise<{ success: boolean; data?: { shareUrl: string; expiresAt: Date }; error?: string }> {
    try {
      const document = await this.getDocumentFromDatabase(documentId);
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      // Check if document can be shared
      if (document.isConfidential && shareType !== 'INSURED') {
        return {
          success: false,
          error: 'Cannot share confidential document'
        };
      }

      // Generate shareable link with expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

      const shareToken = this.generateShareToken(documentId, sharedWith, expiresAt);
      const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

      // Update document sharing settings
      if (shareType === 'INSURED') {
        await this.updateDocumentSharing(documentId, { isSharedWithInsured: true });
      } else if (shareType === 'CARRIER') {
        await this.updateDocumentSharing(documentId, { isSharedWithCarrier: true });
      }

      // Log sharing access
      await this.logDocumentAccess({
        documentId,
        userId: sharedBy,
        accessType: AccessType.SHARE
      });

      this.metrics.incrementCounter('documents_shared', { 
        documentType: document.documentType,
        shareType 
      });

      return {
        success: true,
        data: {
          shareUrl,
          expiresAt
        },
        message: 'Document shared successfully'
      };
    } catch (error) {
      logger.error('Failed to share document', { error, documentId, sharedWith, shareType });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share document'
      };
    }
  }

  /**
   * Upload attachment (photos, videos, etc.)
   */
  async uploadAttachment(
    file: Express.Multer.File,
    claimId: string,
    attachmentType: string,
    attachmentCategory: AttachmentCategory,
    createdByType: CreatedByType,
    createdBy: string,
    description?: string
  ): Promise<{ success: boolean; data?: ClaimAttachment; error?: string }> {
    try {
      // Validate file for attachments
      const validation = this.validateAttachmentFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check claim exists
      const claim = await this.getClaimFromDatabase(claimId);
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }

      // Upload to S3
      const s3Key = this.generateAttachmentS3Key(claimId, file.originalname);
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET || 'claims-attachments',
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256'
      };

      const s3Result = await this.s3.upload(uploadParams).promise();

      // Extract metadata for media files
      const metadata = await this.extractFileMetadata(file);

      // Create attachment record
      const attachment = await this.createAttachmentInDatabase({
        claimId,
        attachmentType,
        attachmentCategory,
        attachmentUrl: s3Result.Location,
        s3Key: s3Key,
        fileSize: file.size,
        mimeType: file.mimetype,
        description,
        metadata,
        createdByType
      });

      this.metrics.incrementCounter('attachments_uploaded', { 
        attachmentType,
        attachmentCategory,
        createdByType 
      });

      logger.info('Attachment uploaded successfully', {
        attachmentId: attachment.id,
        claimId,
        fileName: file.originalname,
        fileSize: file.size
      });

      return {
        success: true,
        data: attachment,
        message: 'Attachment uploaded successfully'
      };
    } catch (error) {
      logger.error('Failed to upload attachment', { error, claimId, attachmentType });
      this.metrics.incrementCounter('attachment_upload_errors');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload attachment'
      };
    }
  }

  /**
   * Delete document with audit trail
   */
  async deleteDocument(
    documentId: string,
    deletedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const document = await this.getDocumentFromDatabase(documentId);
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      // Soft delete - mark as deleted rather than removing
      await this.softDeleteDocument(documentId, deletedBy, reason);

      // Delete from S3
      if (document.s3Key) {
        await this.s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET || 'claims-documents',
          Key: document.s3Key
        }).promise();
      }

      this.metrics.incrementCounter('documents_deleted', { 
        documentType: document.documentType 
      });

      logger.info('Document deleted successfully', {
        documentId,
        deletedBy,
        reason
      });

      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete document', { error, documentId, deletedBy });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document'
      };
    }
  }

  /**
   * Get document access log
   */
  async getDocumentAccessLog(
    documentId: string,
    userId?: string
  ): Promise<{ success: boolean; data?: ClaimDocumentAccessLog[]; error?: string }> {
    try {
      const accessLog = await this.getAccessLogByDocumentId(documentId, userId);
      
      return {
        success: true,
        data: accessLog
      };
    } catch (error) {
      logger.error('Failed to retrieve document access log', { error, documentId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve access log'
      };
    }
  }

  /**
   * Validate file for upload
   */
  private validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    // Check allowed file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'File type not allowed'
      };
    }

    return { valid: true };
  }

  /**
   * Validate attachment file
   */
  private validateAttachmentFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size (max 50MB for attachments)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 50MB limit'
      };
    }

    // Check allowed attachment types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/avi',
      'video/mov',
      'audio/mp3',
      'audio/wav',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'File type not allowed for attachments'
      };
    }

    return { valid: true };
  }

  /**
   * Check document access permissions
   */
  private checkDocumentAccess(
    document: ClaimDocument,
    userId: string,
    userType: 'INSURED' | 'ADJUSTER' | 'ADMIN'
  ): boolean {
    // Admin has access to all documents
    if (userType === 'ADMIN') {
      return true;
    }

    // Confidential documents only for internal users
    if (document.isConfidential && userType === 'INSURED') {
      return false;
    }

    // Check sharing permissions
    if (userType === 'INSURED' && !document.isSharedWithInsured) {
      return false;
    }

    // For adjusters, check if they're assigned to the claim
    if (userType === 'ADJUSTER') {
      return this.isAdjusterAssignedToClaim(document.claimId, userId);
    }

    return true;
  }

  /**
   * Generate S3 key for document
   */
  private generateS3Key(claimId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `claims/${claimId}/documents/${timestamp}_${sanitizedFileName}`;
  }

  /**
   * Generate S3 key for attachment
   */
  private generateAttachmentS3Key(claimId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `claims/${claimId}/attachments/${timestamp}_${sanitizedFileName}`;
  }

  /**
   * Generate signed download URL
   */
  private async generateSignedDownloadUrl(s3Key: string): Promise<string> {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'claims-documents',
      Key: s3Key,
      Expires: 3600 // 1 hour
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  /**
   * Generate share token
   */
  private generateShareToken(documentId: string, sharedWith: string, expiresAt: Date): string {
    const crypto = require('crypto');
    const data = `${documentId}:${sharedWith}:${expiresAt.getTime()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Extract metadata from file
   */
  private async extractFileMetadata(file: Express.Multer.File): Promise<any> {
    const metadata: any = {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    };

    // For images, you could use sharp to get dimensions
    if (file.mimetype.startsWith('image/')) {
      // This would require sharp library
      // const sharp = require('sharp');
      // const image = sharp(file.buffer);
      // const dimensions = await image.metadata();
      // metadata.width = dimensions.width;
      // metadata.height = dimensions.height;
    }

    // For videos, you could use ffprobe to get duration
    if (file.mimetype.startsWith('video/')) {
      // This would require ffprobe
      // metadata.duration = await this.getVideoDuration(file.buffer);
    }

    return metadata;
  }

  // Database abstraction methods
  private async createDocumentInDatabase(data: any): Promise<ClaimDocument> {
    throw new Error('Database implementation required');
  }

  private async getDocumentFromDatabase(id: string): Promise<ClaimDocument | null> {
    throw new Error('Database implementation required');
  }

  private async getDocumentsByClaimId(claimId: string, userId?: string, userType?: string): Promise<ClaimDocument[]> {
    throw new Error('Database implementation required');
  }

  private async createAttachmentInDatabase(data: any): Promise<ClaimAttachment> {
    throw new Error('Database implementation required');
  }

  private async logDocumentAccess(data: any): Promise<ClaimDocumentAccessLog> {
    throw new Error('Database implementation required');
  }

  private async getAccessLogByDocumentId(documentId: string, userId?: string): Promise<ClaimDocumentAccessLog[]> {
    throw new Error('Database implementation required');
  }

  private async updateDocumentSharing(documentId: string, data: any): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async softDeleteDocument(documentId: string, deletedBy: string, reason?: string): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async getClaimFromDatabase(claimId: string): Promise<any> {
    throw new Error('Database implementation required');
  }

  private async isAdjusterAssignedToClaim(claimId: string, adjusterId: string): Promise<boolean> {
    throw new Error('Database implementation required');
  }
}