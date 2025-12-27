// Authentication and Authorization Middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock user roles for demonstration
interface UserPayload {
  userId: string;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Verify token (in production, use proper JWT secret from environment)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as UserPayload;
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Please authenticate',
      error: error.message 
    });
  }
}

export function authorize(roles: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Check if user has required role
      if (roles.length && !roles.includes(user.role)) {
        throw new Error('Unauthorized - insufficient permissions');
      }
      
      next();
    } catch (error) {
      res.status(403).json({ 
        success: false,
        message: 'Forbidden',
        error: error.message 
      });
    }
  };
}