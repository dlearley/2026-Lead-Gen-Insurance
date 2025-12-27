// Validation Middleware using Zod
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate based on schema type
      if (schema.shape.body) {
        req.body = schema.shape.body.parse(req.body);
      }
      
      if (schema.shape.query) {
        req.query = schema.shape.query.parse(req.query);
      }
      
      if (schema.shape.params) {
        req.params = schema.shape.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: error.errors 
      });
    }
  };
}