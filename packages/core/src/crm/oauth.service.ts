import axios from 'axios';
import {
  CrmProvider,
  OAuthConfig,
  OAuthTokenResponse,
  OAuthState,
} from '@insurance-lead-gen/types';

export class CrmOAuthService {
  private configs: Map<CrmProvider, OAuthConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs(): void {
    // Salesforce OAuth Configuration
    this.configs.set('SALESFORCE', {
      provider: 'SALESFORCE',
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      redirectUri: process.env.SALESFORCE_REDIRECT_URI || `${process.env.APP_URL}/api/crm/oauth/salesforce/callback`,
      scopes: ['api', 'refresh_token', 'full'],
      authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    });

    // HubSpot OAuth Configuration
    this.configs.set('HUBSPOT', {
      provider: 'HUBSPOT',
      clientId: process.env.HUBSPOT_CLIENT_ID || '',
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
      redirectUri: process.env.HUBSPOT_REDIRECT_URI || `${process.env.APP_URL}/api/crm/oauth/hubspot/callback`,
      scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read', 'crm.objects.deals.write'],
      authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    });

    // Pipedrive OAuth Configuration (uses API key by default, but supports OAuth)
    this.configs.set('PIPEDRIVE', {
      provider: 'PIPEDRIVE',
      clientId: process.env.PIPEDRIVE_CLIENT_ID || '',
      clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET || '',
      redirectUri: process.env.PIPEDRIVE_REDIRECT_URI || `${process.env.APP_URL}/api/crm/oauth/pipedrive/callback`,
      scopes: ['deals:full', 'contacts:full', 'activities:full'],
      authorizationUrl: 'https://oauth.pipedrive.com/oauth/authorize',
      tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    });
  }

  getAuthorizationUrl(
    provider: CrmProvider,
    state?: OAuthState,
  ): string {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth configuration not found for provider: ${provider}`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: state ? Buffer.from(JSON.stringify(state)).toString('base64') : '',
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(
    provider: CrmProvider,
    code: string,
  ): Promise<OAuthTokenResponse> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth configuration not found for provider: ${provider}`);
    }

    try {
      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        scope: response.data.scope,
        instanceUrl: response.data.instance_url,
      };
    } catch (error: unknown) {
      throw new Error(`Failed to exchange code for token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async refreshAccessToken(
    provider: CrmProvider,
    refreshToken: string,
  ): Promise<OAuthTokenResponse> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`OAuth configuration not found for provider: ${provider}`);
    }

    try {
      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        scope: response.data.scope,
        instanceUrl: response.data.instance_url,
      };
    } catch (error: unknown) {
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  parseState(stateString: string): OAuthState | null {
    try {
      const decoded = Buffer.from(stateString, 'base64').toString('utf-8');
      return JSON.parse(decoded) as OAuthState;
    } catch {
      return null;
    }
  }

  validateConfig(provider: CrmProvider): boolean {
    const config = this.configs.get(provider);
    if (!config) {
      return false;
    }

    return !!(
      config.clientId &&
      config.clientSecret &&
      config.redirectUri &&
      config.authorizationUrl &&
      config.tokenUrl
    );
  }
}

export const oAuthService = new CrmOAuthService();
