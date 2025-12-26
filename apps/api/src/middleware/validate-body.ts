import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';

export const validateBody = <T>(schema: ZodSchema<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        issues: parsed.error.issues,
      });
      return;
    }

    (req as unknown as { validatedBody: T }).validatedBody = parsed.data;
    next();
  };
};
