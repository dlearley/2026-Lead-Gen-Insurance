import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService, logger } from '@insurance-lead-gen/core';
import { validateBody } from '../utils/validation.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8), // In a real app, we would verify this against the DB
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = validateBody(loginSchema, req.body);
    
    // MOCK authentication for demonstration purposes
    // In a real app, this would query the database and verify the hashed password
    if (email === 'admin@example.com' && password === 'password123') {
      const tokens = await authService.generateTokens({
        id: '00000000-0000-0000-0000-000000000001',
        email,
        roles: ['admin'],
        permissions: ['admin:all'],
      });
      return res.json(tokens);
    }

    res.status(401).json({ error: 'Invalid email or password' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { id } = await authService.verifyRefreshToken(refreshToken);
    
    // In a real app, fetch user from DB to get latest roles/permissions
    const tokens = await authService.generateTokens({
      id,
      email: 'user@example.com', // Should be fetched from DB
      roles: ['agent'], // Should be fetched from DB
      permissions: ['read:leads'], // Should be fetched from DB
    });

    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

export default router;
