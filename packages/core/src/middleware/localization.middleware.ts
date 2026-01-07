import { Request, Response, NextFunction } from 'express';
import {
  SupportedLocale,
  SupportedRegion,
  SupportedCurrency
} from '@insurance-lead-gen/types';
import {
  translationManager,
  regionalService,
  currencyService
} from '@insurance-lead-gen/core';
import { logger } from '../logger.js';

/**
 * Extended Request interface with localization context
 */
export interface LocalizedRequest extends Request {
  locale: SupportedLocale;
  region: SupportedRegion;
  currency: SupportedCurrency;
  timezone: string;
  translationCache: Map<string, any>;
}

/**
 * Locale detection middleware
 */
export function detectLocale(req: Request, res: Response, next: NextFunction): void {
  try {
    const acceptLanguage = req.headers['accept-language'] as string;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Detect region first
    const detectedRegion = regionalService.detectRegion(ipAddress, acceptLanguage, 'US');
    
    // Get recommended locale for region
    const detectedLocale = translationManager.detectLocale(acceptLanguage, regionalService.getRecommendedLocale(detectedRegion));
    
    // Get recommended currency for region
    const detectedCurrency = currencyService.getCurrencyForRegion(detectedRegion);
    
    // Add to request context
    (req as LocalizedRequest).locale = detectedLocale;
    (req as LocalizedRequest).region = detectedRegion;
    (req as LocalizedRequest).currency = detectedCurrency;
    (req as LocalizedRequest).timezone = regionalService.getRegionalSettings(detectedRegion)?.timezones[0] || 'UTC';
    
    // Add headers for client
    res.setHeader('X-Detected-Locale', detectedLocale);
    res.setHeader('X-Detected-Region', detectedRegion);
    res.setHeader('X-Detected-Currency', detectedCurrency);
    
    next();
  } catch (error) {
    logger.error('Error in locale detection middleware:', error);
    
    // Fallback to defaults
    (req as LocalizedRequest).locale = 'en';
    (req as LocalizedRequest).region = 'US';
    (req as LocalizedRequest).currency = 'USD';
    (req as LocalizedRequest).timezone = 'UTC';
    
    next();
  }
}

/**
 * Force locale middleware (for testing)
 */
export function forceLocale(locale: SupportedLocale): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const detectedRegion = regionalService.detectRegion(ipAddress, undefined, 'US');
      
      (req as LocalizedRequest).locale = locale;
      (req as LocalizedRequest).region = detectedRegion;
      (req as LocalizedRequest).currency = currencyService.getCurrencyForRegion(detectedRegion);
      (req as LocalizedRequest).timezone = regionalService.getRegionalSettings(detectedRegion)?.timezones[0] || 'UTC';
      
      res.setHeader('X-Forced-Locale', locale);
      
      next();
    } catch (error) {
      logger.error('Error in force locale middleware:', error);
      next();
    }
  };
}

/**
 * Translation middleware - pre-load translations for request
 */
export async function preloadTranslations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const localizedReq = req as LocalizedRequest;
    
    // Initialize translation cache for request
    localizedReq.translationCache = new Map();
    
    // Pre-load common translations
    const commonKeys = [
      'common.save',
      'common.cancel',
      'common.error',
      'common.success',
      'nav.dashboard',
      'nav.leads',
      'nav.agents',
      'form.firstName',
      'form.lastName',
      'form.email',
      'form.phone'
    ];
    
    const translations = await translationManager.translateMany(
      commonKeys,
      localizedReq.locale
    );
    
    // Store in request cache
    for (const [key, result] of Object.entries(translations)) {
      localizedReq.translationCache.set(key, result.value);
    }
    
    next();
  } catch (error) {
    logger.error('Error pre-loading translations:', error);
    next(); // Continue without pre-loaded translations
  }
}

/**
 * Regional routing middleware
 */
export function regionalRouting(req: Request, res: Response, next: NextFunction): void {
  try {
    const localizedReq = req as LocalizedRequest;
    const region = localizedReq.region;
    
    // Add regional context headers
    res.setHeader('X-Region-Context', region);
    res.setHeader('X-Timezone', localizedReq.timezone);
    
    // Check for regional compliance requirements
    const hasCompliance = regionalService.hasComplianceRequirements(region);
    if (hasCompliance) {
      res.setHeader('X-Compliance-Required', 'true');
      
      // Add compliance context
      const compliance = regionalService.getComplianceRequirements(region);
      res.locals.compliance = compliance;
    }
    
    next();
  } catch (error) {
    logger.error('Error in regional routing middleware:', error);
    next();
  }
}

/**
 * Currency conversion middleware
 */
export async function currencyConversion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const localizedReq = req as LocalizedRequest;
    const originalCurrency = req.query.currency as SupportedCurrency;
    
    // If currency parameter is provided and different from detected
    if (originalCurrency && originalCurrency !== localizedReq.currency) {
      // Store original currency for reference
      res.locals.originalCurrency = originalCurrency;
      res.locals.convertedCurrency = localizedReq.currency;
      
      // Add conversion info headers
      res.setHeader('X-Currency-Converted', 'true');
      res.setHeader('X-Target-Currency', localizedReq.currency);
    }
    
    next();
  } catch (error) {
    logger.error('Error in currency conversion middleware:', error);
    next();
  }
}

/**
 * Response localization middleware - adds locale info to responses
 */
export function responseLocalization(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  
  res.json = function(data: any): Response {
    // Add localization metadata to response
    const localizedReq = req as LocalizedRequest;
    
    if (data && typeof data === 'object') {
      // Add localization context if not already present
      if (!data.locale) {
        data.locale = localizedReq.locale;
      }
      if (!data.region) {
        data.region = localizedReq.region;
      }
      if (!data.timestamp) {
        data.timestamp = new Date();
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Validation middleware for supported locales
 */
export function validateLocale(localeParam: string = 'locale') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const locale = req.params[localeParam] || req.query[localeParam] || req.body[localeParam];
    
    if (locale && !translationManager.isLocaleSupported(locale as string)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported locale',
        locale,
        supportedLocales: translationManager.getSupportedLocales()
      });
    }
    
    next();
  };
}

/**
 * Validation middleware for supported regions
 */
export function validateRegion(regionParam: string = 'region') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const region = req.params[regionParam] || req.query[regionParam] || req.body[regionParam];
    
    if (region && !regionalService.getSupportedRegions().includes(region as any)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported region',
        region,
        supportedRegions: regionalService.getSupportedRegions()
      });
    }
    
    next();
  };
}

/**
 * Validation middleware for supported currencies
 */
export function validateCurrency(currencyParam: string = 'currency') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currency = req.params[currencyParam] || req.query[currencyParam] || req.body[currencyParam];
    
    if (currency && !currencyService.isCurrencySupported(currency as string)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported currency',
        currency,
        supportedCurrencies: currencyService.getSupportedCurrencies()
      });
    }
    
    next();
  };
}

/**
 * Helper function to extract locale from request
 */
export function extractLocale(req: Request): SupportedLocale {
  return (req as LocalizedRequest).locale || 'en';
}

/**
 * Helper function to extract region from request
 */
export function extractRegion(req: Request): SupportedRegion {
  return (req as LocalizedRequest).region || 'US';
}

/**
 * Helper function to extract currency from request
 */
export function extractCurrency(req: Request): SupportedCurrency {
  return (req as LocalizedRequest).currency || 'USD';
}

/**
 * Helper function to extract timezone from request
 */
export function extractTimezone(req: Request): string {
  return (req as LocalizedRequest).timezone || 'UTC';
}

/**
 * Complete localization middleware chain
 */
export function localizationMiddleware(): (req: Request, res: Response, next: NextFunction) => void[] {
  return [
    detectLocale,
    preloadTranslations,
    regionalRouting,
    currencyConversion,
    responseLocalization
  ];
}