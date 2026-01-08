import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export const validate = (validators: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validators.map(validator => validator.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};