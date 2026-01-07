import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';

const router = Router();
const config = getConfig();

// Mock broker database for demo purposes
const mockBrokers = [
  {
    id: 'broker_12345',
    email: 'broker@example.com',
    password: 'password123', // In production, use hashed passwords!
    name: 'John Doe',
    agency: 'Insurance Pros',
  },
  {
    id: 'broker_67890',
    email: 'agent@insurance.com',
    password: 'securepass', // In production, use hashed passwords!
    name: 'Jane Smith',
    agency: 'Coverage Experts',
  },
];

const JWT_SECRET = config.jwt.secret || 'your-secret-key-here';
const JWT_EXPIRES_IN = '7d';

/**
 * POST /api/brokers/login
 * Broker login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find broker in mock database
    const broker = mockBrokers.find(b => b.email === email && b.password === password);

    if (!broker) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        brokerId: broker.id,
        email: broker.email,
        name: broker.name,
        role: 'broker',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      brokerId: broker.id,
      email: broker.email,
      name: broker.name,
    });
  } catch (error) {
    logger.error('Broker login failed', { error });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/brokers/me
 * Get current broker info
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would be protected by JWT middleware
    // For demo purposes, we'll return mock data
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Find the broker in our mock database
      const broker = mockBrokers.find(b => b.id === decoded.brokerId);

      if (!broker) {
        return res.status(404).json({ error: 'Broker not found' });
      }

      res.json({
        id: broker.id,
        email: broker.email,
        name: broker.name,
        agency: broker.agency,
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Failed to get broker info', { error });
    res.status(500).json({ error: 'Failed to get broker info' });
  }
});

/**
 * GET /api/brokers/validate-token
 * Validate broker token
 */
router.get('/validate-token', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Check if broker exists
      const brokerExists = mockBrokers.some(b => b.id === decoded.brokerId);

      if (!brokerExists) {
        return res.status(404).json({ error: 'Broker not found' });
      }

      res.json({
        valid: true,
        brokerId: decoded.brokerId,
        email: decoded.email,
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Token validation failed', { error });
    res.status(500).json({ error: 'Token validation failed' });
  }
});

export default router;