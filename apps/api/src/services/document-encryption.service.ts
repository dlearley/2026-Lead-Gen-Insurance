import { PrismaClient } from '@prisma/client';
import { createLogger } from '@neru/core/logger';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { Trace, SpanAttribute } from '@neru/core/monitoring/tracing-decorators';
import { Document, EncryptionResult, StorageProvider } from '@neru/types';
import { DocumentStorageService } from './document-storage.service.js';

const logger = createLogger('DocumentEncryptionService');

export class DocumentEncryptionService {
  private readonly prisma: PrismaClient;
  private readonly storageService: DocumentStorageService;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly SALT_LENGTH = 64; // 512 bits for key derivation
  private readonly TAG_LENGTH = 16; // 128 bits for GCM tag

  constructor() {
    this.prisma = new PrismaClient();
    this.storageService = new DocumentStorageService();
  }

  @Trace({ operationName: 'document-encryption.encryptDocument' })
  async encryptDocument(
    documentId: string,
    @SpanAttribute() sensitivityLevel: 'Public' | 'Internal' | 'Confidential' | 'Secret' = 'Confidential'
  ): Promise<EncryptionResult> {
    const startTime = Date.now();
    
    try {
      // Get document
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Check if already encrypted
      if (document.encryptionKey) {
        logger.warn('Document already encrypted', { documentId });
        const key = await this.prisma.encryptionKey.findUnique({
          where: { keyId: document.encryptionKey },
        });
        
        return {
          success: true,
          documentId,
          keyId: document.encryptionKey,
          algorithm: this.ALGORITHM,
          encryptedSize: document.fileSize,
          message: 'Document already encrypted',
          encryptionDate: key?.creationDate || new Date(),
        };
      }

      // Get or create encryption key
      const encryptionKey = await this.getOrCreateEncryptionKey(sensitivityLevel);

      // Read document content
      const fileBuffer = await this.storageService.downloadDocument(documentId);

      // Encrypt content
      const encryptedData = await this.encryptBuffer(fileBuffer, encryptionKey);

      // Store encrypted content back
      await fs.writeFile(document.storageLocation, encryptedData);

      // Update document record with encryption key reference
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          encryptionKey: encryptionKey.keyId,
          fileSize: encryptedData.length,
        },
      });

      // Update key last used date
      await this.prisma.encryptionKey.update({
        where: { id: encryptionKey.id },
        data: {
          lastUsedDate: new Date(),
        },
      });

      const result: EncryptionResult = {
        success: true,
        documentId,
        keyId: encryptionKey.keyId,
        algorithm: this.ALGORITHM,
        encryptedSize: encryptedData.length,
        encryptionDate: encryptionKey.creationDate,
        duration: Date.now() - startTime,
      };

      logger.info('Document encrypted successfully', {
        documentId,
        keyId: encryptionKey.keyId,
        originalSize: fileBuffer.length,
        encryptedSize: encryptedData.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to encrypt document', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-encryption.decryptDocument' })
  async decryptDocument(documentId: string): Promise<Buffer> {
    try {
      // Get document
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          encryptionKey: true,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Check if encrypted
      if (!document.encryptionKey) {
        throw new Error('Document is not encrypted');
      }

      if (!document.encryptionKey?.keyId) {
        throw new Error('Encryption key not found');
      }

      // Read encrypted content
      const encryptedBuffer = await fs.readFile(document.storageLocation);

      // Decrypt content
      const decryptedData = await this.decryptBuffer(
        encryptedBuffer,
        document.encryptionKey.keyId
      );

      logger.info('Document decrypted successfully', {
        documentId,
        originalSize: encryptedBuffer.length,
        decryptedSize: decryptedData.length,
      });

      return decryptedData;
    } catch (error) {
      logger.error('Failed to decrypt document', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-encryption.rotateEncryptionKey' })
  async rotateEncryptionKey(documentId: string): Promise<EncryptionResult> {
    const startTime = Date.now();
    
    try {
      // Get document
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          encryptionKey: true,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      if (!document.encryptionKey) {
        throw new Error('Document is not encrypted, cannot rotate key');
      }

      // Decrypt with old key
      const decryptedData = await this.decryptDocument(documentId);

      // Generate new key
      const newEncryptionKey = await this.generateEncryptionKey(
        document.sensitivity as 'Public' | 'Internal' | 'Confidential' | 'Secret'
      );

      // Re-encrypt with new key
      const encryptedData = await this.encryptBuffer(decryptedData, newEncryptionKey);

      // Store re-encrypted content
      await fs.writeFile(document.storageLocation, encryptedData);

      // Update document with new key
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          encryptionKey: newEncryptionKey.keyId,
        },
      });

      // Mark old key as rotated
      await this.prisma.encryptionKey.update({
        where: { id: document.encryptionKey.id },
        data: {
          status: 'Rotated',
          rotationDate: new Date(),
        },
      });

      const result: EncryptionResult = {
        success: true,
        documentId,
        keyId: newEncryptionKey.keyId,
        algorithm: this.ALGORITHM,
        encryptedSize: encryptedData.length,
        rotationDate: new Date(),
        previousKeyId: document.encryptionKey.keyId,
        duration: Date.now() - startTime,
      };

      logger.info('Encryption key rotated successfully', {
        documentId,
        oldKeyId: document.encryptionKey.keyId,
        newKeyId: newEncryptionKey.keyId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to rotate encryption key', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-encryption.generateEncryptionKey' })
  async generateEncryptionKey(
    sensitivityLevel: 'Public' | 'Internal' | 'Confidential' | 'Secret',
    @SpanAttribute() keyType: 'AES256' | 'RSA2048' | 'RSA4096' = 'AES256'
  ) {
    try {
      // Generate random key
      const keyId = this.generateKeyId();
      const keyMaterial = crypto.randomBytes(this.KEY_LENGTH);

      // Store key in database (in production, this should use a key management service)
      const keyRecord = await this.prisma.encryptionKey.create({
        data: {
          keyId,
          keyType,
          algorithm: this.ALGORITHM,
          creationDate: new Date(),
          expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days default
          status: 'Active',
          keySource: 'Local', // In production: 'AWS-KMS' or 'HashiCorp-Vault'
          metadata: JSON.stringify({
            sensitivityLevel,
            generatedFor: 'document-encryption',
          }),
        },
      });

      logger.info('Encryption key generated', {
        keyId,
        keyType,
        algorithm: this.ALGORITHM,
      });

      return keyRecord;
    } catch (error) {
      logger.error('Failed to generate encryption key', {
        keyType,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-encryption.getActiveEncryptionKey' })
  async getActiveEncryptionKey(sensitivityLevel: 'Public' | 'Internal' | 'Confidential' | 'Secret') {
    try {
      // Try to find existing active key for this sensitivity level
      const activeKey = await this.prisma.encryptionKey.findFirst({
        where: {
          status: 'Active',
          keyType: 'AES256',
          metadata: {
            contains: `"sensitivityLevel":"${sensitivityLevel}"`,
          },
          expiryDate: {
            gt: new Date(),
          },
        },
        orderBy: {
          creationDate: 'desc',
        },
      });

      if (activeKey) {
        return activeKey;
      }

      // Generate new key if no active key found
      return await this.generateEncryptionKey(sensitivityLevel);
    } catch (error) {
      logger.error('Failed to get active encryption key', {
        sensitivityLevel,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-encryption.validateEncryption' })
  async validateEncryption(documentId: string): Promise<{
    valid: boolean;
    documentId: string;
    encryptionKeyId?: string;
    issues: string[];
  }> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          encryptionKey: true,
        },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const issues: string[] = [];
      let valid = true;

      // Check if encryption is required based on sensitivity
      const requiresEncryption = document.sensitivity === 'Confidential' || 
                                document.sensitivity === 'Secret';

      if (requiresEncryption && !document.encryptionKey) {
        issues.push(`Document with ${document.sensitivity} sensitivity is not encrypted`);
        valid = false;
      }

      if (document.encryptionKey) {
        // Check if key is still valid
        if (document.encryptionKey.status !== 'Active') {
          issues.push(`Encryption key is not active: ${document.encryptionKey.status}`);
          valid = false;
        }

        if (document.encryptionKey.expiryDate && 
            document.encryptionKey.expiryDate < new Date()) {
          issues.push('Encryption key has expired');
          valid = false;
        }

        // Verify we can decrypt the document
        try {
          await this.decryptDocument(documentId);
        } catch (error) {
          issues.push('Cannot decrypt document with current key');
          valid = false;
        }
      }

      return {
        valid,
        documentId,
        encryptionKeyId: document.encryptionKey?.keyId,
        issues,
      };
    } catch (error) {
      logger.error('Failed to validate encryption', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private async getOrCreateEncryptionKey(
    sensitivityLevel: 'Public' | 'Internal' | 'Confidential' | 'Secret'
  ) {
    return await this.getActiveEncryptionKey(sensitivityLevel);
  }

  private async encryptBuffer(buffer: Buffer, encryptionKey: any): Promise<Buffer> {
    try {
      // Generate IV
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Create cipher
      const keyBuffer = Buffer.from(encryptionKey.keyId, 'hex'); // In production, use actual key material
      const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final(),
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      const result = Buffer.concat([iv, authTag, encrypted]);

      return result;
    } catch (error) {
      logger.error('Failed to encrypt buffer', {
        algorithm: this.ALGORITHM,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private async decryptBuffer(encryptedBuffer: Buffer, keyId: string): Promise<Buffer> {
    try {
      // Extract IV, auth tag, and encrypted data
      const iv = encryptedBuffer.slice(0, this.IV_LENGTH);
      const authTag = encryptedBuffer.slice(this.IV_LENGTH, this.IV_LENGTH + this.TAG_LENGTH);
      const encryptedData = encryptedBuffer.slice(this.IV_LENGTH + this.TAG_LENGTH);

      // Get key from database
      const keyRecord = await this.prisma.encryptionKey.findUnique({
        where: { keyId },
      });

      if (!keyRecord) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }

      // Create decipher
      const keyBuffer = Buffer.from(keyId, 'hex'); // In production, use actual key material
      const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt buffer', {
        keyId,
        algorithm: this.ALGORITHM,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private generateKeyId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    return `KEY-${timestamp}-${random}`;
  }

  @Trace({ operationName: 'document-encryption.rotateAllKeys' })
  async rotateAllKeys(sensitivityLevel?: 'Public' | 'Internal' | 'Confidential' | 'Secret'): Promise<{
    rotatedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    try {
      const whereClause: any = {
        encryptionKey: { isNot: null },
      };

      if (sensitivityLevel) {
        whereClause.sensitivity = sensitivityLevel;
      }

      const documents = await this.prisma.document.findMany({
        where: whereClause,
        include: {
          encryptionKey: true,
        },
      });

      let rotatedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const document of documents) {
        try {
          if (document.encryptionKey) {
            await this.rotateEncryptionKey(document.id);
            rotatedCount++;
          }
        } catch (error) {
          failedCount++;
          errors.push(`Failed to rotate key for document ${document.id}: ${error instanceof Error ? error.message : error}`);
        }
      }

      logger.info('Completed key rotation', {
        totalDocuments: documents.length,
        rotatedCount,
        failedCount,
      });

      return {
        rotatedCount,
        failedCount,
        errors,
      };
    } catch (error) {
      logger.error('Failed to rotate all keys', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}