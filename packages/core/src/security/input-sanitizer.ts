/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type */
import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

export interface InputSanitizerConfig {
  sanitizeBody?: boolean;
  sanitizeQuery?: boolean;
  sanitizeParams?: boolean;
  allowedTags?: string[];
  stripUnknownTags?: boolean;
}

export class InputSanitizer {
  private config: Required<InputSanitizerConfig>;

  constructor(config: InputSanitizerConfig = {}) {
    this.config = {
      sanitizeBody: config.sanitizeBody !== false,
      sanitizeQuery: config.sanitizeQuery !== false,
      sanitizeParams: config.sanitizeParams !== false,
      allowedTags: config.allowedTags || [],
      stripUnknownTags: config.stripUnknownTags !== false,
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (this.config.sanitizeBody && req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      if (this.config.sanitizeQuery && req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      if (this.config.sanitizeParams && req.params) {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    };
  }

  sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    // Trim whitespace
    let sanitized = str.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Escape HTML to prevent XSS
    sanitized = validator.escape(sanitized);

    // Remove potential SQL injection patterns (basic)
    sanitized = this.removeSqlInjection(sanitized);

    // Remove potential NoSQL injection patterns
    sanitized = this.removeNoSqlInjection(sanitized);

    // Remove path traversal attempts
    sanitized = this.removePathTraversal(sanitized);

    // Remove command injection attempts
    sanitized = this.removeCommandInjection(sanitized);

    return sanitized;
  }

  private removeSqlInjection(str: string): string {
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(%27)|(')|(--)|(%23)|(#)/gi,
      /((%3D)|(=))[^\n]*((%27)|(')|(--)|(%3B)|(;))/gi,
      /\w*((%27)|')((%6F)|o|(%4F))((%72)|r|(%52))/gi,
      /((%27)|')union/gi,
    ];

    let sanitized = str;
    for (const pattern of sqlPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  private removeNoSqlInjection(str: string): string {
    // Remove common NoSQL injection patterns
    const noSqlPatterns = [
      /\$where/gi,
      /\$ne/gi,
      /\$gt/gi,
      /\$lt/gi,
      /\$regex/gi,
      /\$nin/gi,
      /\$or/gi,
      /\$and/gi,
      /\$not/gi,
    ];

    let sanitized = str;
    for (const pattern of noSqlPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  private removePathTraversal(str: string): string {
    // Remove path traversal patterns
    return str.replace(/\.\./g, '').replace(/\.\\/g, '').replace(/\.\//g, '');
  }

  private removeCommandInjection(str: string): string {
    // Remove command injection patterns
    const commandPatterns = [/[;&|`$(){}[\]<>]/g, /\n/g, /\r/g];

    let sanitized = str;
    for (const pattern of commandPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  sanitizeEmail(email: string): string {
    return validator.normalizeEmail(email) || email;
  }

  sanitizeUrl(url: string): string {
    if (!validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
      throw new Error('Invalid URL');
    }
    return url;
  }

  sanitizeHtml(html: string): string {
    if (this.config.allowedTags.length === 0) {
      return validator.stripLow(validator.escape(html));
    }

    // Basic HTML sanitization (for production, consider using DOMPurify)
    let sanitized = html;
    const allowedTagsRegex = new RegExp(
      `<(?!\\/?(${this.config.allowedTags.join('|')})\\b)[^>]*>`,
      'gi'
    );

    if (this.config.stripUnknownTags) {
      sanitized = sanitized.replace(allowedTagsRegex, '');
    }

    return sanitized;
  }

  isValidInput(
    value: string,
    type: 'email' | 'url' | 'alphanumeric' | 'numeric' | 'alpha'
  ): boolean {
    switch (type) {
      case 'email':
        return validator.isEmail(value);
      case 'url':
        return validator.isURL(value);
      case 'alphanumeric':
        return validator.isAlphanumeric(value);
      case 'numeric':
        return validator.isNumeric(value);
      case 'alpha':
        return validator.isAlpha(value);
      default:
        return false;
    }
  }
}

export function createInputSanitizer(config?: InputSanitizerConfig) {
  const sanitizer = new InputSanitizer(config);
  return sanitizer.middleware();
}
