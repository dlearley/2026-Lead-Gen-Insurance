/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/prefer-nullish-coalescing */
import crypto from 'crypto';
import { logger } from '../logger.js';

export interface EncryptionConfig {
  algorithm?: string;
  key?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  iterations?: number;
  digest?: string;
}

export class EncryptionService {
  private algorithm: string;
  private key: Buffer;
  private ivLength: number;
  private saltLength: number;
  private iterations: number;
  private digest: string;

  constructor(config: EncryptionConfig = {}) {
    this.algorithm = config.algorithm || 'aes-256-gcm';
    this.ivLength = config.ivLength || 16;
    this.saltLength = config.saltLength || 64;
    this.iterations = config.iterations || 100000;
    this.digest = config.digest || 'sha512';

    if (config.key) {
      this.key = Buffer.from(config.key, 'hex');
    } else {
      // Generate a random key if not provided (not recommended for production)
      const keyLength = config.keyLength || 32; // 256 bits for AES-256
      this.key = crypto.randomBytes(keyLength);
      logger.warn(
        'Encryption key not provided, using randomly generated key. This should only happen in development.'
      );
    }
  }

  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = (cipher as any).getAuthTag();

      // Combine IV + encrypted data + auth tag
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);
      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new Error('Encryption failed');
    }
  }

  decrypt(ciphertext: string): string {
    try {
      const combined = Buffer.from(ciphertext, 'base64');

      const iv = combined.subarray(0, this.ivLength);
      const authTag = combined.subarray(combined.length - 16);
      const encrypted = combined.subarray(this.ivLength, combined.length - 16);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      (decipher as any).setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed', { error });
      throw new Error('Decryption failed');
    }
  }

  hash(data: string, salt?: string): { hash: string; salt: string } {
    try {
      const useSalt = salt || crypto.randomBytes(this.saltLength).toString('hex');
      const hash = crypto
        .pbkdf2Sync(data, useSalt, this.iterations, 64, this.digest)
        .toString('hex');

      return { hash, salt: useSalt };
    } catch (error) {
      logger.error('Hashing failed', { error });
      throw new Error('Hashing failed');
    }
  }

  verifyHash(data: string, hash: string, salt: string): boolean {
    try {
      const { hash: computedHash } = this.hash(data, salt);
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
    } catch (error) {
      logger.error('Hash verification failed', { error });
      return false;
    }
  }

  generateKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  encryptField<T extends Record<string, any>>(obj: T, field: keyof T): T {
    if (obj[field] && typeof obj[field] === 'string') {
      const encrypted = this.encrypt(obj[field] as string);
      const encryptedFlagKey = `${String(field)}_encrypted`;
      return {
        ...obj,
        [field]: encrypted,
        [encryptedFlagKey]: true,
      } as T;
    }
    return obj;
  }

  decryptField<T extends Record<string, any>>(obj: T, field: keyof T): T {
    const encryptedFlag = `${String(field)}_encrypted`;
    if (obj[encryptedFlag] && typeof obj[field] === 'string') {
      try {
        const decrypted = this.decrypt(obj[field] as string);
        const result = { ...obj, [field]: decrypted };
        delete result[encryptedFlag];
        return result;
      } catch (error) {
        logger.error('Field decryption failed', { field, error });
        return obj;
      }
    }
    return obj;
  }

  encryptObject<T extends Record<string, any>>(obj: T, fieldsToEncrypt: (keyof T)[]): T {
    let result = { ...obj };
    for (const field of fieldsToEncrypt) {
      result = this.encryptField(result, field);
    }
    return result;
  }

  decryptObject<T extends Record<string, any>>(obj: T, fieldsToDecrypt: (keyof T)[]): T {
    let result = { ...obj };
    for (const field of fieldsToDecrypt) {
      result = this.decryptField(result, field);
    }
    return result;
  }
}

// PII field encryption helper
export const piiFields = [
  'email',
  'phone',
  'ssn',
  'driverLicense',
  'creditCard',
  'bankAccount',
  'address',
  'firstName',
  'lastName',
  'dateOfBirth',
] as const;

export function encryptPII<T extends Record<string, any>>(
  obj: T,
  encryptionService: EncryptionService,
  additionalFields: string[] = []
): T {
  const fieldsToEncrypt = [...piiFields, ...additionalFields].filter((field) => field in obj);
  return encryptionService.encryptObject(obj, fieldsToEncrypt as (keyof T)[]);
}

export function decryptPII<T extends Record<string, any>>(
  obj: T,
  encryptionService: EncryptionService,
  additionalFields: string[] = []
): T {
  const fieldsToDecrypt = [...piiFields, ...additionalFields].filter((field) => field in obj);
  return encryptionService.decryptObject(obj, fieldsToDecrypt as (keyof T)[]);
}
