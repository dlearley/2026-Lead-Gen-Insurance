import { Router } from 'express';
import {
  SupportedLocale,
  SupportedRegion,
  SupportedCurrency,
  TranslationRequest,
  CurrencyConversionRequest,
  RegionalComplianceRequest,
  LocalizationApiResponse
} from '@insurance-lead-gen/types';
import {
  translationManager,
  regionalService,
  currencyService
} from '@insurance-lead-gen/core';
import { logger } from '../logger.js';
import { ValidationError } from '../errors.js';

/**
 * Create localization routes
 */
export function createLocalizationRoutes(): Router {
  const router = Router();

  /**
   * Get translations for a specific locale
   * GET /api/i18n/translations/:locale
   */
  router.get('/translations/:locale', async (req, res) => {
    try {
      const locale = req.params.locale as SupportedLocale;
      
      // Validate locale
      if (!translationManager.isLocaleSupported(locale)) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported locale',
          locale: locale,
          supportedLocales: translationManager.getSupportedLocales()
        });
      }

      // Get translation file
      const translationFile = await translationManager.loadTranslations(locale);

      const response: LocalizationApiResponse = {
        success: true,
        data: translationFile.translations,
        locale,
        region: 'US', // Default region for API response
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error loading translations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load translations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Translate specific keys
   * POST /api/i18n/translate
   */
  router.post('/translate', async (req, res) => {
    try {
      const { keys, locale, namespace } = req.body as TranslationRequest;

      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        throw new ValidationError('Keys array is required');
      }

      if (!locale) {
        throw new ValidationError('Locale is required');
      }

      // Validate locale
      if (!translationManager.isLocaleSupported(locale)) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported locale',
          locale,
          supportedLocales: translationManager.getSupportedLocales()
        });
      }

      // Translate keys
      const translations = await translationManager.translateMany(keys, locale, { namespace });

      const response: LocalizationApiResponse = {
        success: true,
        data: translations,
        locale,
        region: 'US',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error translating keys:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to translate keys',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get supported languages
   * GET /api/regional/languages
   */
  router.get('/languages', (req, res) => {
    try {
      const languages = translationManager.getSupportedLocales();
      const metadata = languages.map(locale => ({
        code: locale,
        ...translationManager.getLocaleMetadata(locale)
      }));

      res.json({
        success: true,
        data: metadata,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error getting languages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get languages',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get supported regions
   * GET /api/regional/regions
   */
  router.get('/regions', (req, res) => {
    try {
      const regions = regionalService.getSupportedRegions();
      const settings = regions.map(region => ({
        region,
        ...regionalService.getRegionalSettings(region)
      }));

      res.json({
        success: true,
        data: settings,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error getting regions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get regions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get supported currencies
   * GET /api/regional/currencies
   */
  router.get('/currencies', (req, res) => {
    try {
      const currencies = currencyService.getSupportedCurrencies();
      const metadata = currencies.map(currency => ({
        currency,
        ...currencyService.getCurrencyMetadata(currency)
      }));

      res.json({
        success: true,
        data: metadata,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error getting currencies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get currencies',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Convert currency
   * POST /api/regional/convert-currency
   */
  router.post('/convert-currency', async (req, res) => {
    try {
      const { amount, fromCurrency, toCurrency, asOfDate } = req.body as CurrencyConversionRequest;

      if (!amount || !fromCurrency || !toCurrency) {
        throw new ValidationError('Amount, fromCurrency, and toCurrency are required');
      }

      // Validate currencies
      if (!currencyService.isCurrencySupported(fromCurrency)) {
        throw new ValidationError(`Unsupported currency: ${fromCurrency}`);
      }

      if (!currencyService.isCurrencySupported(toCurrency)) {
        throw new ValidationError(`Unsupported currency: ${toCurrency}`);
      }

      const conversion = await currencyService.convertCurrency({
        amount,
        fromCurrency,
        toCurrency,
        asOfDate
      });

      res.json({
        success: true,
        data: conversion,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error converting currency:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to convert currency',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Detect region from IP or request headers
   * POST /api/regional/detect
   */
  router.post('/detect', (req, res) => {
    try {
      const { ipAddress, acceptLanguage, fallbackRegion } = req.body;

      const detectedRegion = regionalService.detectRegion(ipAddress, acceptLanguage, fallbackRegion);

      const response: LocalizationApiResponse = {
        success: true,
        data: {
          detectedRegion,
          recommendedLocale: regionalService.getRecommendedLocale(detectedRegion),
          recommendedCurrency: regionalService.getRecommendedCurrency(detectedRegion),
          hasComplianceRequirements: regionalService.hasComplianceRequirements(detectedRegion)
        },
        locale: regionalService.getRecommendedLocale(detectedRegion),
        region: detectedRegion,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error detecting region:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect region',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Check regional compliance requirements
   * POST /api/regional/compliance
   */
  router.post('/compliance', (req, res) => {
    try {
      const { region, operation, dataType, purpose } = req.body as RegionalComplianceRequest;

      if (!region || !operation || !dataType || !purpose) {
        throw new ValidationError('Region, operation, dataType, and purpose are required');
      }

      const compliance = regionalService.getComplianceRequirements(region);
      const hasRequirements = regionalService.hasComplianceRequirements(region);

      res.json({
        success: true,
        data: {
          region,
          hasComplianceRequirements: hasRequirements,
          compliance: compliance,
          operation,
          dataType,
          purpose,
          timestamp: new Date()
        },
        locale: 'en',
        region,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error checking compliance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check compliance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get business hours for region
   * GET /api/regional/business-hours/:region
   */
  router.get('/business-hours/:region', (req, res) => {
    try {
      const region = req.params.region as SupportedRegion;

      const businessHours = regionalService.getBusinessHours(region);

      res.json({
        success: true,
        data: businessHours,
        region,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error getting business hours:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business hours',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get regional holidays
   * GET /api/regional/holidays/:region
   */
  router.get('/holidays/:region', (req, res) => {
    try {
      const region = req.params.region as SupportedRegion;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const holidays = regionalService.getRegionalHolidays(region, year);

      res.json({
        success: true,
        data: {
          region,
          year,
          holidays
        },
        region,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error getting holidays:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get holidays',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get formatting settings for region
   * GET /api/regional/formatting/:region
   */
  router.get('/formatting/:region', (req, res) => {
    try {
      const region = req.params.region as SupportedRegion;

      const formatting = regionalService.getFormattingSettings(region);

      if (!formatting) {
        return res.status(404).json({
          success: false,
          error: 'Region not found',
          region
        });
      }

      res.json({
        success: true,
        data: formatting,
        region,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error getting formatting settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get formatting settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Update translation cache (admin only)
   * POST /api/i18n/cache/update
   */
  router.post('/cache/update', (req, res) => {
    try {
      const { locale, translations } = req.body;

      if (!locale || !translations) {
        throw new ValidationError('Locale and translations are required');
      }

      // Validate locale
      if (!translationManager.isLocaleSupported(locale)) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported locale',
          locale,
          supportedLocales: translationManager.getSupportedLocales()
        });
      }

      translationManager.updateTranslationCache(locale, translations);

      res.json({
        success: true,
        message: 'Translation cache updated successfully',
        locale,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error updating translation cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update translation cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Clear translation cache (admin only)
   * POST /api/i18n/cache/clear
   */
  router.post('/cache/clear', (req, res) => {
    try {
      const { locale } = req.body;

      translationManager.clearCache(locale);

      res.json({
        success: true,
        message: locale ? `Translation cache cleared for locale ${locale}` : 'All translation caches cleared',
        locale: locale || null,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error clearing translation cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear translation cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get cache statistics (admin only)
   * GET /api/i18n/cache/stats
   */
  router.get('/cache/stats', (req, res) => {
    try {
      const translationStats = translationManager.getCacheStats();
      const currencyStats = currencyService.getCacheStats();

      res.json({
        success: true,
        data: {
          translations: translationStats,
          currency: currencyStats
        },
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}