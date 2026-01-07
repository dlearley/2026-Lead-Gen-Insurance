// Validation middleware

import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate based on request method
      let dataToValidate = req.body
      
      if (req.method === 'GET') {
        dataToValidate = req.query
      } else if (req.method === 'PUT' || req.method === 'PATCH') {
        dataToValidate = { ...req.body, ...req.params }
      }

      const result = schema.parse(dataToValidate)
      req.body = result // Update request body with parsed data
      next()
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.message,
        })
      } else {
        res.status(400).json({
          error: 'Validation failed',
          details: 'Unknown validation error',
        })
      }
    }
  }
}