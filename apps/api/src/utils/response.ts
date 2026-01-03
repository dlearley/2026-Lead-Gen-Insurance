import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.get('X-Request-ID'),
  };
  return res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode: number = 500, details?: any) {
  const response: ApiResponse = {
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
    requestId: res.get('X-Request-ID'),
  };
  return res.status(statusCode).json(response);
}
