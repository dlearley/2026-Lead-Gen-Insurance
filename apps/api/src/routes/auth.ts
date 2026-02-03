/**
 * Phase 13.2: Security Hardening & OAuth/SSO
 * Authentication Routes - Login, Register, SSO, MFA, Session Management
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  oauthSSOService,
  sessionService,
  deviceFingerprinting,
  securityPolicyService,
  authService,
  getJWTService,
  getMFAService,
  logger,
} from '@insurance-lead-gen/core';
import { asyncHandler } from '../middleware/async-handler.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * POST /api/v1/auth/login
 * Standard email/password login
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Check account lockout
  const clientIp = req.ip || req.socket.remoteAddress || '';
  const lockoutCheck = securityPolicyService.checkLockout(clientIp);
  if (lockoutCheck.isLocked) {
    return res.status(423).json({ 
      error: lockoutCheck.message,
      lockoutEndTime: lockoutCheck.lockoutEndTime,
    });
  }

  // Validate credentials (mock implementation - replace with real auth)
  // In production, this would verify against the user database
  const isValidCredentials = email && password.length >= 8;
  
  if (!isValidCredentials) {
    securityPolicyService.recordFailedAttempt(clientIp);
    const remaining = securityPolicyService.checkLockout(clientIp);
    return res.status(401).json({
      error: 'Invalid credentials',
      remainingAttempts: remaining.remainingAttempts,
    });
  }

  // Record successful login
  securityPolicyService.recordSuccessfulLogin(clientIp);

  // Generate JWT token
  const token = jwt.sign(
    {
      sub: 'user_id',
      email,
      role: 'user',
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { sub: 'user_id', type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    accessToken: token,
    refreshToken,
    expiresIn: 86400,
    tokenType: 'Bearer',
  });
}));

/**
 * POST /api/v1/auth/register
 * User registration
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Validate password strength
  const passwordResult = securityPolicyService.validatePassword(password, `${firstName} ${lastName}`, email);
  if (passwordResult.score < 60) {
    return res.status(400).json({
      error: 'Password does not meet security requirements',
      strength: passwordResult.strength,
      suggestions: passwordResult.suggestions,
    });
  }

  // Hash password
  const hashedPassword = await securityPolicyService.hashPassword(password);

  // In production, create user in database
  logger.info('User registered', { email });

  // Generate tokens
  const token = jwt.sign(
    { sub: 'new_user_id', email, role: 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { sub: 'new_user_id', type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    accessToken: token,
    refreshToken,
    expiresIn: 86400,
    user: { email, firstName, lastName },
  });
}));

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { sub: string; type: string };
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { sub: decoded.sub, role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      accessToken: newAccessToken,
      expiresIn: 86400,
      tokenType: 'Bearer',
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}));

/**
 * POST /api/v1/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken, allDevices } = req.body;

  // In production, revoke tokens in database/Redis
  if (refreshToken) {
    // Add to revocation list
  }

  res.json({ message: 'Successfully logged out' });
}));

/**
 * POST /api/v1/auth/sso/initiate
 * Initiate SSO login flow
 */
router.post('/sso/initiate', asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.body;

  if (!provider || !['google', 'microsoft', 'oidc'].includes(provider)) {
    return res.status(400).json({ 
      error: 'Invalid provider',
      availableProviders: oauthSSOService.getAvailableProviders(),
    });
  }

  // Generate state and nonce for security
  const state = OAuthSSOService.generateState();
  const nonce = OAuthSSOService.generateNonce();

  // Store state/nonce in session or cache for validation
  const stateData = { state, nonce, provider, createdAt: Date.now() };
  
  // In production, store in Redis with short TTL
  // cache.set(`sso:state:${state}`, stateData, 600000); // 10 minutes

  const authUrl = oauthSSOService.getAuthorizationUrl(provider, state, nonce);

  res.json({
    authorizationUrl: authUrl,
    state,
    provider,
  });
}));

/**
 * GET /api/v1/auth/sso/callback
 * SSO callback endpoint
 */
router.get('/sso/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`/login?sso_error=${error}&sso_description=${error_description}`);
  }

  if (!code || !state) {
    return res.redirect('/login?sso_error=missing_params');
  }

  try {
    // Validate state
    // const stateData = cache.get(`sso:state:${state}`);
    // if (!stateData || stateData.state !== state) {
    //   return res.redirect('/login?sso_error=invalid_state');
    // }

    // Determine provider from state
    const provider = 'google'; // From stateData

    // Exchange code for tokens
    const tokenResponse = await oauthSSOService.exchangeCodeForToken(provider, code as string);

    // Get user info
    const userInfo = await oauthSSOService.getUserInfo(provider, tokenResponse.accessToken);

    // Validate domain restriction
    if (!oauthSSOService.validateDomainRestriction(userInfo.email)) {
      return res.redirect('/login?sso_error=domain_not_allowed');
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        sub: userInfo.id, 
        email: userInfo.email,
        name: userInfo.name,
        provider: userInfo.provider,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { sub: userInfo.id, type: 'refresh', provider: userInfo.provider },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with tokens
    res.redirect(`/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}&state=${state}`);
  } catch (error) {
    logger.error('SSO callback error', { error });
    res.redirect('/login?sso_error=authentication_failed');
  }
}));

/**
 * POST /api/v1/auth/mfa/setup
 * Setup MFA for user
 */
router.post('/mfa/setup', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  const { method } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const mfaService = getMFAService();

  if (method === 'totp') {
    const mfaSecret = await mfaService.generateMFASecret(userId, (req as any).user?.email);
    
    res.json({
      secret: mfaSecret.secret,
      qrCode: mfaSecret.qrCodeUrl,
      backupCodes: mfaSecret.backupCodes,
    });
  } else if (method === 'sms') {
    // SMS OTP setup requires phone number
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required for SMS MFA' });
    }
    
    // Generate initial SMS OTP
    const otp = mfaService.generateSMSOTP();
    res.json({
      message: 'SMS OTP sent to your phone for verification',
      // In production, send SMS via SMS service
    });
  } else {
    return res.status(400).json({ error: 'Invalid MFA method' });
  }
}));

/**
 * POST /api/v1/auth/mfa/verify
 * Verify MFA code
 */
router.post('/mfa/verify', asyncHandler(async (req: Request, res: Response) => {
  const { userId, code, method, rememberDevice } = req.body;

  if (!userId || !code) {
    return res.status(400).json({ error: 'User ID and code are required' });
  }

  const mfaService = getMFAService();

  let isValid = false;
  if (method === 'totp') {
    isValid = mfaService.verifyTOTP(userId, code);
  } else if (method === 'backup') {
    isValid = mfaService.verifyBackupCode(userId, code);
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid MFA code' });
  }

  // Generate MFA-verified token
  const accessToken = jwt.sign(
    { sub: userId, mfa_verified: true },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    accessToken,
    expiresIn: 86400,
    tokenType: 'Bearer',
  });
}));

/**
 * POST /api/v1/auth/password/validate
 * Validate password strength
 */
router.post('/password/validate', asyncHandler(async (req: Request, res: Response) => {
  const { password, username, email } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const result = securityPolicyService.validatePassword(password, username, email);

  res.json({
    score: result.score,
    strength: result.strength,
    errors: result.errors,
    suggestions: result.suggestions,
  });
}));

/**
 * POST /api/v1/auth/password/reset/initiate
 * Initiate password reset
 */
router.post('/password/reset/initiate', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // In production:
  // 1. Generate reset token
  // 2. Send email with reset link
  // 3. Log the event

  logger.info('Password reset initiated', { email });

  res.json({
    message: 'If an account exists with this email, a password reset link has been sent',
  });
}));

/**
 * POST /api/v1/auth/security/check
 * Check account security status
 */
router.get('/security/check', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;

  const mfaService = getMFAService();
  const sessionStats = sessionService.getSessionStats();
  const securityEvents = securityPolicyService.getSecurityEvents({ 
    userId, 
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
  });

  res.json({
    mfaEnabled: mfaService.isMFAEnabled(userId),
    mfaMethod: 'totp', // In production, get from user record
    activeSessions: sessionService.getUserSessions(userId).length,
    recentSecurityEvents: securityEvents.slice(0, 10),
    securityScore: 85, // Calculate based on factors
  });
}));

/**
 * GET /api/v1/auth/devices
 * Get user's trusted devices
 */
router.get('/devices', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  const devices = deviceFingerprinting.getUserDevices(userId);

  res.json({
    devices: devices.map(d => ({
      fingerprint: d.fingerprint,
      isTrusted: d.isTrusted,
      firstSeen: d.firstSeen,
      lastSeen: d.lastSeen,
      loginCount: d.loginCount,
      browser: d.components.browser,
      os: d.components.platform,
    })),
  });
}));

/**
 * DELETE /api/v1/auth/devices/:fingerprint
 * Remove a trusted device
 */
router.delete('/devices/:fingerprint', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  const { fingerprint } = req.params;

  const removed = deviceFingerprinting.removeDevice(userId, fingerprint);

  if (!removed) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json({ message: 'Device removed successfully' });
}));

/**
 * POST /api/v1/auth/devices/:fingerprint/trust
 * Trust a device
 */
router.post('/devices/:fingerprint/trust', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  const { fingerprint } = req.params;

  const trusted = deviceFingerprinting.trustDevice(userId, fingerprint);

  if (!trusted) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json({ message: 'Device trusted successfully' });
}));

export default router;
