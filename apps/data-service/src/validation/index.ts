import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export * from './partner.validation.js';
export * from './referral.validation.js';
export * from './reward.validation.js';

export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body) as unknown as Request['body'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Validation failed',
      });
    }
  };
}
