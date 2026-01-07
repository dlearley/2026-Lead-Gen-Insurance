/**
 * Phase 30: Partner Ecosystem & Integrations
 * API Key and OAuth management routes
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { APIManagementService, OAuth2Service } from '@insurance-platform/core';
import type { ApiKeyCreateRequest, OAuthTokenRequest } from '@insurance-platform/types';

const router = Router();
const prisma = new PrismaClient();
const apiManagementService = new APIManagementService(prisma);
const oauth2Service = new OAuth2Service(prisma);

// ============================================================================
// API Keys
// ============================================================================

/**
 * POST /api/keys
 * Generate new API key
 */
router.post('/', async (req, res, next) => {
  try {
    const { partnerId, ...keyRequest } = req.body;
    const request: ApiKeyCreateRequest = keyRequest;

    const apiKey = await apiManagementService.generateApiKey(partnerId, request);

    res.status(201).json({
      success: true,
      data: apiKey,
      message: 'API key generated successfully. Please save the full key as it will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/keys
 * List API keys for a partner
 */
router.get('/', async (req, res, next) => {
  try {
    const { partnerId, appId } = req.query;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'partnerId is required' },
      });
    }

    const apiKeys = await apiManagementService.listApiKeys(
      partnerId as string,
      appId as string | undefined
    );

    res.json({ success: true, data: apiKeys });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/keys/:id/rotate
 * Rotate API key
 */
router.post('/:id/rotate', async (req, res, next) => {
  try {
    const newKey = await apiManagementService.rotateApiKey(req.params.id);

    res.json({
      success: true,
      data: newKey,
      message: 'API key rotated successfully. Old key has been revoked.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/keys/:id
 * Revoke API key
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await apiManagementService.revokeApiKey(req.params.id);

    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/keys/:id/scopes
 * Update API key scopes
 */
router.put('/:id/scopes', async (req, res, next) => {
  try {
    const { scopes } = req.body;

    const apiKey = await apiManagementService.updateScopes(req.params.id, scopes);

    res.json({ success: true, data: apiKey });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/keys/:id/rate-limit
 * Update API key rate limit
 */
router.put('/:id/rate-limit', async (req, res, next) => {
  try {
    const { rateLimit } = req.body;

    const apiKey = await apiManagementService.updateRateLimit(req.params.id, rateLimit);

    res.json({ success: true, data: apiKey });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// OAuth 2.0
// ============================================================================

/**
 * POST /api/oauth/clients
 * Create OAuth client
 */
router.post('/oauth/clients', async (req, res, next) => {
  try {
    const { partnerId, appId, redirectUris, allowedFlows } = req.body;

    const client = await oauth2Service.createClient(
      partnerId,
      appId,
      redirectUris,
      allowedFlows
    );

    res.status(201).json({
      success: true,
      data: client,
      message: 'OAuth client created. Please save the client secret as it will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/oauth/authorize
 * OAuth authorization endpoint
 */
router.get('/oauth/authorize', async (req, res, next) => {
  try {
    const { response_type, client_id, redirect_uri, scope, state } = req.query;

    // TODO: Show authorization page to user
    // For now, auto-approve (should be replaced with actual UI)
    const userId = 'user-123'; // TODO: Get from session

    const code = await oauth2Service.generateAuthorizationCode(
      {
        responseType: response_type as 'code' | 'token',
        clientId: client_id as string,
        redirectUri: redirect_uri as string,
        scope: scope as string,
        state: state as string,
      },
      userId
    );

    // Redirect back to client with authorization code
    const redirectUrl = new URL(redirect_uri as string);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state as string);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/oauth/token
 * OAuth token endpoint
 */
router.post('/oauth/token', async (req, res, next) => {
  try {
    const tokenRequest: OAuthTokenRequest = req.body;

    let tokenResponse;

    switch (tokenRequest.grantType) {
      case 'authorization_code':
        tokenResponse = await oauth2Service.exchangeAuthorizationCode(
          tokenRequest.code!,
          tokenRequest.clientId,
          tokenRequest.clientSecret,
          tokenRequest.redirectUri!
        );
        break;

      case 'client_credentials':
        tokenResponse = await oauth2Service.clientCredentialsGrant(
          tokenRequest.clientId,
          tokenRequest.clientSecret,
          tokenRequest.scope
        );
        break;

      case 'refresh_token':
        tokenResponse = await oauth2Service.refreshToken(
          tokenRequest.refreshToken!,
          tokenRequest.clientId,
          tokenRequest.clientSecret
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_GRANT', message: 'Unsupported grant type' },
        });
    }

    res.json(tokenResponse);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
  }
});

/**
 * POST /api/oauth/token/introspect
 * Token introspection endpoint
 */
router.post('/oauth/token/introspect', async (req, res, next) => {
  try {
    const { token } = req.body;

    const introspection = await oauth2Service.introspectToken(token);

    res.json({ success: true, data: introspection });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/oauth/token/revoke
 * Token revocation endpoint
 */
router.post('/oauth/token/revoke', async (req, res, next) => {
  try {
    const { token } = req.body;

    await oauth2Service.revokeToken(token);

    res.json({ success: true, message: 'Token revoked successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
