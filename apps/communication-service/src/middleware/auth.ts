// Authentication middleware

import { Request, Response, NextFunction } from 'express'

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // In a real implementation, this would validate JWT tokens
  // For now, we'll just add a mock user to the request
  
  const authHeader = req.headers['authorization']
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' })
  }

  // Mock authentication - in production this would verify JWT
  const token = authHeader.split(' ')[1]
  
  if (token !== 'mock-token') {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Add mock user to request
  req.user = {
    id: 'user_123',
    organizationId: 'org_123',
    email: 'user@example.com',
    name: 'Test User',
  }

  next()
}