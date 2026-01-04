import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { logger } from '../logger.js';

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  salt: string;
}

export class DataEncryption {
  private config: EncryptionConfig;
  private encryptionKey: Buffer;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      salt: config?.salt || process.env.ENCRYPTION_SALT || 'default-salt-change-in-production',
      ...config,
    };

    const masterKey = process.env.ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    this.encryptionKey = scryptSync(masterKey, this.config.salt, this.config.keyLength);
  }

  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    try {
      const iv = randomBytes(this.config.ivLength);
      const cipher = createCipheriv(this.config.algorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    try {
      const decipher = createDecipheriv(
        this.config.algorithm,
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error });
      throw new Error('Failed to decrypt data');
    }
  }

  encryptDeterministic(plaintext: string): { encrypted: string; iv: string } {
    try {
      const iv = this.generateDeterministicIV(plaintext);
      const cipher = createCipheriv(this.config.algorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      logger.error('Deterministic encryption failed', { error });
      throw new Error('Failed to encrypt data deterministically');
    }
  }

  decryptDeterministic(encrypted: string, iv: string): string {
    try {
      const decipher = createDecipheriv(
        this.config.algorithm,
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (error) {
      logger.error('Deterministic decryption failed', { error });
      throw new Error('Failed to decrypt data deterministically');
    }
  }

  encryptObject<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
  ): Partial<T> {
    const result: Partial<T> = { ...obj };

    for (const field of fields) {
      const value = obj[field];
      if (typeof value === 'string') {
        const encrypted = this.encrypt(value);
        (result as any)[`${field}_encrypted`] = encrypted.encrypted;
        (result as any)[`${field}_iv`] = encrypted.iv;
        (result as any)[`${field}_auth_tag`] = encrypted.authTag;
        delete result[field];
      }
    }

    return result;
  }

  decryptObject<T extends Record<string, any>>(
    obj: Partial<T>,
    fields: (keyof T)[]
  ): Partial<T> {
    const result: Partial<T> = { ...obj };

    for (const field of fields) {
      const encryptedField = (obj as any)[`${field}_encrypted`];
      const ivField = (obj as any)[`${field}_iv`];
      const authTagField = (obj as any)[`${field}_auth_tag`];

      if (encryptedField && ivField && authTagField) {
        try {
          const decrypted = this.decrypt(encryptedField, ivField, authTagField);
          result[field] = decrypted as any;

          delete (result as any)[`${field}_encrypted`];
          delete (result as any)[`${field}_iv`];
          delete (result as any)[`${field}_auth_tag`];
        } catch (error) {
          logger.error('Failed to decrypt field in object', { field, error });
        }
      }
    }

    return result;
  }

  hash(plaintext: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }

  compareHash(plaintext: string, hash: string): boolean {
    return this.hash(plaintext) === hash;
  }

  private generateDeterministicIV(plaintext: string): Buffer {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(plaintext).digest();
    return hash.subarray(0, this.config.ivLength);
  }

  rotateKey(newKey: string): void {
    this.encryptionKey = scryptSync(newKey, this.config.salt, this.config.keyLength);
    logger.info('Encryption key rotated');
  }
}

export const sensitiveFields = {
  LEAD: ['ssn', 'creditCard', 'bankAccount', 'dateOfBirth'] as const,
  AGENT: ['licenseNumber'] as const,
  CARRIER: ['apiKey'] as const,
  LEAD_ASSIGNMENT: [] as const,
  EVENT: [] as const,
};

export class ColumnEncryption {
  private encryption: DataEncryption;

  constructor(encryption?: DataEncryption) {
    this.encryption = encryption || new DataEncryption();
  }

  encryptColumn(value: string): { encrypted: string; iv: string; authTag: string } {
    return this.encryption.encrypt(value);
  }

  decryptColumn(encrypted: string, iv: string, authTag: string): string {
    return this.encryption.decrypt(encrypted, iv, authTag);
  }

  encryptSearchable(value: string): { encrypted: string; iv: string } {
    return this.encryption.encryptDeterministic(value);
  }

  decryptSearchable(encrypted: string, iv: string): string {
    return this.encryption.decryptDeterministic(encrypted, iv);
  }

  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : '*';
    return `${maskedLocal}@${domain}`;
  }

  maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `***-***-${cleaned.slice(-4)}`;
    }
    return '*'.repeat(cleaned.length);
  }

  maskSSN(ssn: string): string {
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length === 9) {
      return `***-**-${cleaned.slice(-4)}`;
    }
    return '*'.repeat(cleaned.length);
  }

  maskCreditCard(card: string): string {
    const cleaned = card.replace(/\D/g, '');
    if (cleaned.length >= 16) {
      return `****-****-****-${cleaned.slice(-4)}`;
    }
    return '*'.repeat(cleaned.length);
  }

  maskValue(value: string, type: 'email' | 'phone' | 'ssn' | 'creditCard' | 'default'): string {
    switch (type) {
      case 'email':
        return this.maskEmail(value);
      case 'phone':
        return this.maskPhone(value);
      case 'ssn':
        return this.maskSSN(value);
      case 'creditCard':
        return this.maskCreditCard(value);
      default:
        return value.length > 4 ? '*'.repeat(value.length - 4) + value.slice(-4) : '*'.repeat(value.length);
    }
  }
}

export class KeyRotationManager {
  private currentKey: string;
  private previousKeys: Map<string, string> = new Map();
  private keyVersions: Map<string, number> = new Map();

  constructor(initialKey: string) {
    this.currentKey = initialKey;
    this.keyVersions.set(initialKey, 1);
  }

  rotate(): { newKey: string; version: number } {
    const newKey = randomBytes(32).toString('hex');
    const previousKey = this.currentKey;
    const currentVersion = this.keyVersions.get(this.currentKey) || 0;

    this.previousKeys.set(previousKey, newKey);
    this.currentKey = newKey;
    this.keyVersions.set(newKey, currentVersion + 1);

    logger.info('Key rotated', {
      newVersion: currentVersion + 1,
      previousVersion: currentVersion,
    });

    return { newKey, version: currentVersion + 1 };
  }

  getCurrentKey(): string {
    return this.currentKey;
  }

  getKeyVersion(key: string): number {
    return this.keyVersions.get(key) || 0;
  }

  getPreviousKey(version: number): string | undefined {
    for (const [key, keyVersion] of this.keyVersions.entries()) {
      if (keyVersion === version) {
        return key;
      }
    }
    return undefined;
  }

  getAllVersions(): number[] {
    return Array.from(this.keyVersions.values()).sort((a, b) => a - b);
  }

  getMaxVersions(): number {
    return this.keyVersions.size;
  }

  cleanupOldVersions(keepVersions: number = 2): void {
    const versions = this.getAllVersions();
    const toRemove = versions.slice(0, versions.length - keepVersions);

    for (const version of toRemove) {
      const key = this.getPreviousKey(version);
      if (key) {
        this.keyVersions.delete(key);
        this.previousKeys.delete(key);
        logger.info('Cleaned up old key version', { version });
      }
    }
  }
}
