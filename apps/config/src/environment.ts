import { config } from 'dotenv';
import { join } from 'path';
import { 
  EnvironmentConfig, 
  DevConfig, 
  StagingConfig, 
  ProdConfig,
  SecretsManagerConfig
} from './types';
import { SecretsManager } from './secrets-manager';
import { validateConfig } from './validation';

export class EnvironmentLoader {
  private static instance: EnvironmentLoader | null = null;
  private config: EnvironmentConfig | null = null;
  private secretsManager: SecretsManager | null = null;

  private constructor() {
    // Private to enforce singleton
  }

  public static getInstance(): EnvironmentLoader {
    if (!EnvironmentLoader.instance) {
      EnvironmentLoader.instance = new EnvironmentLoader();
    }
    return EnvironmentLoader.instance;
  }

  public async loadConfig(): Promise<EnvironmentConfig> {
    try {
      const nodeEnv = process.env.NODE_ENV || 'development';
      const environment = this.getEnvironmentFromString(nodeEnv);
      
      // Load environment-specific .env file
      await this.loadEnvFile(environment);
      
      // Initialize secrets manager based on backend
      this.secretsManager = await this.initializeSecretsManager();
      
      // Load and validate configuration
      this.config = await this.buildConfig(environment);
      
      // Validate configuration
      const validationResult = validateConfig(this.config);
      if (!validationResult.success) {
        throw new Error(`Configuration validation failed: ${validationResult.error.message}`);
      }
      
      console.log(`✅ Configuration loaded successfully for environment: ${environment}`);
      return this.config;
      
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      throw error;
    }
  }

  private getEnvironmentFromString(env: string): 'dev' | 'staging' | 'prod' {
    const envMap: Record<string, 'dev' | 'staging' | 'prod'> = {
      'development': 'dev',
      'dev': 'dev',
      'staging': 'staging',
      'stage': 'staging',
      'production': 'prod',
      'prod': 'prod'
    };
    
    const normalizedEnv = env.toLowerCase();
    return envMap[normalizedEnv] || 'dev';
  }

  private async loadEnvFile(environment: string): Promise<void> {
    const envFileMap = {
      'dev': '.env.development',
      'staging': '.env.staging',
      'prod': '.env.production'
    };
    
    const envFile = envFileMap[environment];
    const envPath = join(process.cwd(), envFile);
    
    try {
      const result = config({ path: envPath });
      if (result.error) {
        throw new Error(`Failed to load ${envFile}: ${result.error.message}`);
      }
      console.log(`Loaded environment file: ${envFile}`);
    } catch (error) {
      console.warn(`Warning: Could not load ${envFile}, using process.env and defaults`);
    }
  }

  private async initializeSecretsManager(): Promise<SecretsManager> {
    const secretsBackend = process.env.SECRETS_BACKEND || 'env';
    
    const config: SecretsManagerConfig = {
      backend: secretsBackend as any,
      awsRegion: process.env.AWS_REGION,
      vaultAddress: process.env.VAULT_ADDR,
      vaultToken: process.env.VAULT_TOKEN,
      localKeyPath: process.env.LOCAL_KEY_PATH,
      auditLogPath: process.env.AUDIT_LOG_PATH || './logs/secrets-audit.log'
    };
    
    return new SecretsManager(config);
  }

  private async buildConfig(environment: string): Promise<EnvironmentConfig> {
    if (!this.secretsManager) {
      throw new Error('SecretsManager not initialized');
    }

    const baseConfig = {
      environment,
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      apiUrl: process.env.API_URL || 'http://localhost:3000',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      secretsManager: this.secretsManager
    };

    // Load secrets based on environment
    const dbPassword = await this.secretsManager.getSecret(`DB_PASSWORD_${environment.toUpperCase()}`);
    const redisPassword = await this.secretsManager.getSecret(`REDIS_PASSWORD_${environment.toUpperCase()}`);
    const neo4jPassword = await this.secretsManager.getSecret(`NEO4J_PASSWORD_${environment.toUpperCase()}`);
    const jwtSecret = await this.secretsManager.getSecret(`JWT_SECRET_${environment.toUpperCase()}`);

    if (environment === 'dev') {
      return {
        ...baseConfig,
        database: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
          user: process.env.POSTGRES_USER || 'postgres',
          password: dbPassword.value,
          database: process.env.POSTGRES_DB || 'insurance_lead_gen_dev',
          maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
          idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
          connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10),
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insurance_lead_gen_dev'
        },
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: redisPassword.value,
          tlsEnabled: process.env.REDIS_TLS_ENABLED === 'true'
        },
        neo4j: {
          uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
          auth: {
            username: 'neo4j',
            password: neo4jPassword.value
          },
          httpPort: parseInt(process.env.NEO4J_HTTP_PORT || '7474', 10),
          boltPort: parseInt(process.env.NEO4J_BOLT_PORT || '7687', 10),
          encryption: process.env.NEO4J_ENCRYPTION === 'true'
        }
      } as DevConfig;
    }

    // Similar patterns for staging and prod configs
    return baseConfig as EnvironmentConfig;
  }

  public getConfig(): EnvironmentConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  public getSecretsManager(): SecretsManager {
    if (!this.secretsManager) {
      throw new Error('SecretsManager not initialized. Call loadConfig() first.');
    }
    return this.secretsManager;
  }

  public static async initialize(): Promise<EnvironmentConfig> {
    const loader = EnvironmentLoader.getInstance();
    return await loader.loadConfig();
  }
}

// Convenience exports
export const getConfig = () => EnvironmentLoader.getInstance().getConfig();
export const getSecretsManager = () => EnvironmentLoader.getInstance().getSecretsManager();

// Initialize configuration when module is imported (for most use cases)
export const configPromise = EnvironmentLoader.initialize();