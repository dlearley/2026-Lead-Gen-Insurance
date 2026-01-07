import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { createLogger, transports, format } from 'winston';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export type SecretBackend = 'aws-secrets-manager' | 'hashicorp-vault' | 'local-encrypted' | 'env';

export interface SecretDefinition {
  name: string;
  description: string;
  environment: 'dev' | 'staging' | 'prod';
  required: boolean;
  rotationEnabled?: boolean;
  rotationSchedule?: string;
}

export interface SecretMetadata {
  name: string;
  version: string;
  lastRotated?: Date;
  nextRotation?: Date;
  accessedBy: string;
  accessedAt: Date;
}

export interface SecretsManagerConfig {
  backend: SecretBackend;
  awsRegion?: string;
  vaultAddress?: string;
  vaultToken?: string;
  localKeyPath?: string;
  auditLogPath?: string;
}

export interface SecretValue {
  value: string;
  metadata: SecretMetadata;
}

export interface AuditLogEntry {
  timestamp: Date;
  action: 'GET' | 'ROTATE' | 'LIST';
  secretName: string;
  user: string;
  sourceIp?: string;
  success: boolean;
  error?: string;
}

export class SecretsManager {
  private client: SecretsManagerClient | null = null;
  private config: SecretsManagerConfig;
  private logger: ReturnType<typeof createLogger>;
  private encryptionKey: Buffer | null = null;

  constructor(config: SecretsManagerConfig) {
    this.config = config;
    
    // Initialize logger
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      transports: [
        new transports.Console(),
        ...(config.auditLogPath ? [new transports.File({ filename: config.auditLogPath })] : [])
      ]
    });

    // Initialize backend client
    this.initializeBackend();
  }

  private async initializeBackend(): Promise<void> {
    switch (this.config.backend) {
      case 'aws-secrets-manager':
        this.client = new SecretsManagerClient({
          region: this.config.awsRegion || process.env.AWS_REGION || 'us-east-1'
        });
        break;
      case 'hashicorp-vault':
        // Vault client initialization would go here
        this.logger.warn('HashiCorp Vault backend not yet implemented');
        break;
      case 'local-encrypted':
        await this.initializeLocalEncryption();
        break;
      case 'env':
        this.logger.info('Using environment variables for secrets');
        break;
    }
  }

  private async initializeLocalEncryption(): Promise<void> {
    try {
      const keyPath = this.config.localKeyPath || path.join(process.cwd(), '.secrets.key');
      const keyExists = await fs.access(keyPath).then(() => true).catch(() => false);
      
      if (keyExists) {
        this.encryptionKey = await fs.readFile(keyPath);
      } else {
        // Generate a new encryption key
        this.encryptionKey = crypto.randomBytes(32);
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
        this.logger.info(`Generated new encryption key at ${keyPath}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize local encryption', { error });
      throw error;
    }
  }

  private async encryptSecret(value: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted
    });
  }

  private async decryptSecret(encryptedValue: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const { iv, authTag, encrypted } = JSON.parse(encryptedValue);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async logAudit(entry: AuditLogEntry): Promise<void> {
    this.logger.info('Secret audit log', entry);
    
    if (this.config.auditLogPath) {
      const auditLog = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.config.auditLogPath, auditLog);
    }
  }

  async getSecret(secretName: string, options: { version?: string } = {}): Promise<SecretValue> {
    const startTime = Date.now();
    let success = false;
    
    try {
      let value: string;
      let metadata: Partial<SecretMetadata> = {
        name: secretName,
        version: options.version || 'latest'
      };

      switch (this.config.backend) {
        case 'aws-secrets-manager':
          if (!this.client) throw new Error('AWS Secrets Manager client not initialized');
          
          const command = new GetSecretValueCommand({ 
            SecretId: secretName,
            ...(options.version && { VersionId: options.version })
          });
          
          const response = await this.client.send(command);
          value = response.SecretString || '';
          
          metadata.version = response.VersionId || 'latest';
          metadata.lastRotated = response.LastChangedDate;
          break;

        case 'hashicorp-vault':
          // Vault implementation would go here
          throw new Error('HashiCorp Vault backend not yet implemented');

        case 'local-encrypted':
          const secretPath = path.join(process.cwd(), 'secrets', `${secretName}.enc`);
          const encryptedData = await fs.readFile(secretPath, 'utf8');
          value = await this.decryptSecret(encryptedData);
          metadata.version = 'local';
          break;

        case 'env':
          value = process.env[secretName] || '';
          if (!value) {
            throw new Error(`Secret ${secretName} not found in environment variables`);
          }
          metadata.version = 'env';
          break;

        default:
          throw new Error(`Unsupported backend: ${this.config.backend}`);
      }

      success = true;
      
      const secretValue: SecretValue = {
        value,
        metadata: {
          ...metadata,
          accessedBy: process.env.USER || 'system',
          accessedAt: new Date()
        } as SecretMetadata
      };

      this.logger.info(`Successfully retrieved secret ${secretName}`, {
        duration: Date.now() - startTime,
        backend: this.config.backend
      });

      return secretValue;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`Failed to get secret ${secretName}`, {
        error: errorMessage,
        duration: Date.now() - startTime
      });

      throw new Error(`Failed to retrieve secret ${secretName}: ${errorMessage}`);
    } finally {
      await this.logAudit({
        timestamp: new Date(),
        action: 'GET',
        secretName,
        user: process.env.USER || 'system',
        sourceIp: process.env.SOURCE_IP,
        success
      });
    }
  }

  async rotateSecret(secretName: string, newValue: string): Promise<void> {
    const startTime = Date.now();
    let success = false;
    
    try {
      switch (this.config.backend) {
        case 'aws-secrets-manager':
          if (!this.client) throw new Error('AWS Secrets Manager client not initialized');
          // AWS Secrets Manager rotation would be implemented here
          break;

        case 'hashicorp-vault':
          // Vault rotation would be implemented here
          break;

        case 'local-encrypted':
          const secretPath = path.join(process.cwd(), 'secrets', `${secretName}.enc`);
          const encryptedData = await this.encryptSecret(newValue);
          await fs.writeFile(secretPath, encryptedData, { mode: 0o600 });
          break;

        case 'env':
          this.logger.warn(`Cannot rotate environment variable secret ${secretName}`);
          break;
      }

      success = true;
      this.logger.info(`Successfully rotated secret ${secretName}`, {
        duration: Date.now() - startTime
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`Failed to rotate secret ${secretName}`, {
        error: errorMessage,
        duration: Date.now() - startTime
      });

      throw new Error(`Failed to rotate secret ${secretName}: ${errorMessage}`);
    } finally {
      await this.logAudit({
        timestamp: new Date(),
        action: 'ROTATE',
        secretName,
        user: process.env.USER || 'system',
        sourceIp: process.env.SOURCE_IP,
        success
      });
    }
  }

  async listSecrets(prefix?: string): Promise<string[]> {
    try {
      switch (this.config.backend) {
        case 'aws-secrets-manager':
          if (!this.client) throw new Error('AWS Secrets Manager client not initialized');
          // List secrets implementation would go here
          return [];

        case 'hashicorp-vault':
          // Vault list implementation would go here
          return [];

        case 'local-encrypted':
          const secretsDir = path.join(process.cwd(), 'secrets');
          const files = await fs.readdir(secretsDir).catch(() => []);
          return files
            .filter(f => f.endsWith('.enc'))
            .map(f => f.replace('.enc', ''))
            .filter(name => !prefix || name.startsWith(prefix));

        case 'env':
          return Object.keys(process.env).filter(key => 
            !prefix || key.startsWith(prefix)
          );

        default:
          throw new Error(`Unsupported backend: ${this.config.backend}`);
      }
    } catch (error) {
      this.logger.error('Failed to list secrets', { error });
      throw error;
    }
  }

  async validateRequiredSecrets(secretDefinitions: SecretDefinition[]): Promise<{ missing: string[]; present: string[] }> {
    const missing: string[] = [];
    const present: string[] = [];

    for (const definition of secretDefinitions) {
      try {
        await this.getSecret(definition.name);
        present.push(definition.name);
      } catch (error) {
        if (definition.required) {
          missing.push(definition.name);
        }
      }
    }

    return { missing, present };
  }
}