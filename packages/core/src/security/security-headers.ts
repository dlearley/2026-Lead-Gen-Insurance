/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersConfig {
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  contentSecurityPolicy?: {
    directives?: Record<string, string[]>;
    reportOnly?: boolean;
  };
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  xssProtection?: boolean;
  noSniff?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: Record<string, string[]>;
}

export function createSecurityHeaders(config: SecurityHeadersConfig = {}) {
  const {
    hsts = {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy = {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
      reportOnly: false,
    },
    frameOptions = 'DENY',
    xssProtection = true,
    noSniff = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy = {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
    },
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Strict-Transport-Security (HSTS)
    if (hsts) {
      let hstsValue = `max-age=${hsts.maxAge}`;
      if (hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (hsts.preload) {
        hstsValue += '; preload';
      }
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Content-Security-Policy
    if (contentSecurityPolicy?.directives) {
      const cspDirectives = Object.entries(contentSecurityPolicy.directives)
        .map(([key, values]) => {
          const directive = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          return `${directive} ${values.join(' ')}`;
        })
        .join('; ');

      const headerName = contentSecurityPolicy.reportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';
      res.setHeader(headerName, cspDirectives);
    }

    // X-Frame-Options
    if (frameOptions) {
      res.setHeader('X-Frame-Options', frameOptions);
    }

    // X-Content-Type-Options
    if (noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (legacy, but still useful for older browsers)
    if (xssProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (referrerPolicy) {
      res.setHeader('Referrer-Policy', referrerPolicy);
    }

    // Permissions-Policy
    if (permissionsPolicy) {
      const permissionsValue = Object.entries(permissionsPolicy)
        .map(([feature, origins]) => {
          if (origins.length === 0) {
            return `${feature}=()`;
          }
          return `${feature}=(${origins.join(' ')})`;
        })
        .join(', ');
      res.setHeader('Permissions-Policy', permissionsValue);
    }

    // Additional security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    next();
  };
}

// Preset configurations
export const securityHeaderPresets = {
  strict: {
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    frameOptions: 'DENY' as const,
    xssProtection: true,
    noSniff: true,
    referrerPolicy: 'no-referrer',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
    },
  },
  moderate: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    frameOptions: 'SAMEORIGIN' as const,
    xssProtection: true,
    noSniff: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
    },
  },
  lenient: {
    hsts: {
      maxAge: 31536000,
      includeSubDomains: false,
      preload: false,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", '*'],
        styleSrc: ["'self'", "'unsafe-inline'", '*'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ['*', 'data:', 'blob:'],
        connectSrc: ['*'],
      },
    },
    frameOptions: 'SAMEORIGIN' as const,
    xssProtection: true,
    noSniff: true,
    referrerPolicy: 'no-referrer-when-downgrade',
  },
};
