import {
  SupportedLocale,
  TranslationValue,
  TranslationFile,
  SupportedRegion,
  TextDirection,
  LOCALE_METADATA,
  CURRENCY_METADATA,
  REGIONAL_MAPPING
} from '@insurance-lead-gen/types';
import { DEFAULT_GLOBAL_CONFIG } from './config.js';

interface TranslationCache {
  [locale: string]: TranslationFile;
}

interface TranslationOptions {
  fallback?: boolean;
  namespace?: string;
  context?: string;
}

interface TranslationResult {
  value: string;
  locale: SupportedLocale;
  found: boolean;
  key: string;
}

/**
 * Translation Manager for handling multi-language support
 */
export class TranslationManager {
  private static instance: TranslationManager;
  private cache: TranslationCache = {};
  private defaultLocale: SupportedLocale = DEFAULT_GLOBAL_CONFIG.defaultLocale;
  private supportedLocales: SupportedLocale[] = DEFAULT_GLOBAL_CONFIG.supportedLocales;
  private enableFallback: boolean = DEFAULT_GLOBAL_CONFIG.enableTranslationFallback;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  /**
   * Get metadata for a specific locale
   */
  public getLocaleMetadata(locale: SupportedLocale) {
    return LOCALE_METADATA[locale];
  }

  /**
   * Get all supported locales
   */
  public getSupportedLocales(): SupportedLocale[] {
    return [...this.supportedLocales];
  }

  /**
   * Get locale text direction (LTR/RTL)
   */
  public getTextDirection(locale: SupportedLocale): TextDirection {
    const metadata = this.getLocaleMetadata(locale);
    return metadata?.textDirection || 'ltr';
  }

  /**
   * Detect locale from request headers or browser
   */
  public detectLocale(acceptLanguage?: string, fallbackLocale?: SupportedLocale): SupportedLocale {
    if (!acceptLanguage) {
      return fallbackLocale || this.defaultLocale;
    }

    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, quality] = lang.trim().split(';q=');
        return {
          locale: locale.split('-')[0] as SupportedLocale,
          quality: quality ? parseFloat(quality) : 1.0
        };
      })
      .sort((a, b) => b.quality - a.quality);

    // Try to find supported locale
    for (const { locale } of languages) {
      if (this.supportedLocales.includes(locale)) {
        return locale;
      }
    }

    // Try exact locale match first
    for (const { locale } of languages) {
      const exactMatch = this.supportedLocales.find(supported => supported === locale);
      if (exactMatch) {
        return exactMatch;
      }
    }

    return fallbackLocale || this.defaultLocale;
  }

  /**
   * Load translations for a specific locale
   */
  public async loadTranslations(locale: SupportedLocale): Promise<TranslationFile> {
    if (this.cache[locale]) {
      return this.cache[locale];
    }

    try {
      // In a real implementation, this would fetch from API or load from files
      const translations = await this.fetchTranslations(locale);
      
      const translationFile: TranslationFile = {
        locale,
        translations,
        lastUpdated: new Date()
      };

      this.cache[locale] = translationFile;
      return translationFile;
    } catch (error) {
      console.error(`Failed to load translations for locale ${locale}:`, error);
      
      if (this.enableFallback && locale !== this.defaultLocale) {
        return this.loadTranslations(this.defaultLocale);
      }
      
      throw error;
    }
  }

  /**
   * Translate a key to the specified locale
   */
  public async translate(
    key: string,
    locale: SupportedLocale,
    options: TranslationOptions = {}
  ): Promise<TranslationResult> {
    const translationFile = await this.loadTranslations(locale);
    const translation = translationFile.translations[key];

    if (translation) {
      return {
        value: translation.value,
        locale,
        found: true,
        key
      };
    }

    // Try fallback to default locale if enabled
    if (this.enableFallback && locale !== this.defaultLocale) {
      const fallbackResult = await this.translate(key, this.defaultLocale, options);
      if (fallbackResult.found) {
        return {
          ...fallbackResult,
          locale,
          found: false
        };
      }
    }

    // Return key if not found
    return {
      value: key,
      locale,
      found: false,
      key
    };
  }

  /**
   * Translate multiple keys at once
   */
  public async translateMany(
    keys: string[],
    locale: SupportedLocale,
    options: TranslationOptions = {}
  ): Promise<Record<string, TranslationResult>> {
    const results: Record<string, TranslationResult> = {};
    
    for (const key of keys) {
      results[key] = await this.translate(key, locale, options);
    }
    
    return results;
  }

  /**
   * Check if a locale is supported
   */
  public isLocaleSupported(locale: string): locale is SupportedLocale {
    return this.supportedLocales.includes(locale as SupportedLocale);
  }

  /**
   * Get regions that support a specific locale
   */
  public getRegionsForLocale(locale: SupportedLocale): SupportedRegion[] {
    const metadata = this.getLocaleMetadata(locale);
    return metadata?.region || [];
  }

  /**
   * Update translations cache (for real-time updates)
   */
  public updateTranslationCache(locale: SupportedLocale, translations: Record<string, TranslationValue>): void {
    this.cache[locale] = {
      locale,
      translations,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear translation cache
   */
  public clearCache(locale?: SupportedLocale): void {
    if (locale) {
      delete this.cache[locale];
    } else {
      this.cache = {};
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { [locale: string]: Date } {
    const stats: { [locale: string]: Date } = {};
    
    for (const [locale, file] of Object.entries(this.cache)) {
      stats[locale] = file.lastUpdated;
    }
    
    return stats;
  }

  /**
   * Private method to fetch translations (mock implementation)
   * In production, this would fetch from translation service/API
   */
  private async fetchTranslations(locale: SupportedLocale): Promise<Record<string, TranslationValue>> {
    // Mock translation data - in production this would be loaded from:
    // 1. Translation service API
    // 2. Database
    // 3. Static files
    // 4. CDN

    const baseTranslations: Record<string, TranslationValue> = {
      // Common UI elements
      'common.save': { value: 'Save', description: 'Save button text' },
      'common.cancel': { value: 'Cancel', description: 'Cancel button text' },
      'common.delete': { value: 'Delete', description: 'Delete button text' },
      'common.edit': { value: 'Edit', description: 'Edit button text' },
      'common.submit': { value: 'Submit', description: 'Submit button text' },
      'common.loading': { value: 'Loading...', description: 'Loading indicator' },
      'common.error': { value: 'Error', description: 'Error message' },
      'common.success': { value: 'Success', description: 'Success message' },

      // Navigation
      'nav.dashboard': { value: 'Dashboard', description: 'Navigation dashboard' },
      'nav.leads': { value: 'Leads', description: 'Navigation leads' },
      'nav.agents': { value: 'Agents', description: 'Navigation agents' },
      'nav.settings': { value: 'Settings', description: 'Navigation settings' },

      // Lead management
      'lead.title': { value: 'Lead Management', description: 'Lead page title' },
      'lead.create': { value: 'Create Lead', description: 'Create lead button' },
      'lead.edit': { value: 'Edit Lead', description: 'Edit lead button' },
      'lead.delete': { value: 'Delete Lead', description: 'Delete lead button' },
      'lead.status': { value: 'Status', description: 'Lead status' },
      'lead.quality': { value: 'Quality Score', description: 'Lead quality score' },

      // Insurance types
      'insurance.auto': { value: 'Auto Insurance', description: 'Auto insurance type' },
      'insurance.home': { value: 'Home Insurance', description: 'Home insurance type' },
      'insurance.life': { value: 'Life Insurance', description: 'Life insurance type' },
      'insurance.health': { value: 'Health Insurance', description: 'Health insurance type' },
      'insurance.commercial': { value: 'Commercial Insurance', description: 'Commercial insurance type' },

      // Customer portal
      'portal.login': { value: 'Login', description: 'Portal login' },
      'portal.register': { value: 'Register', description: 'Portal register' },
      'portal.dashboard': { value: 'Dashboard', description: 'Portal dashboard' },
      'portal.documents': { value: 'Documents', description: 'Portal documents' },
      'portal.messages': { value: 'Messages', description: 'Portal messages' },

      // Error messages
      'error.required': { value: 'This field is required', description: 'Required field error' },
      'error.invalidEmail': { value: 'Please enter a valid email address', description: 'Invalid email error' },
      'error.invalidPhone': { value: 'Please enter a valid phone number', description: 'Invalid phone error' },
      'error.networkError': { value: 'Network error. Please try again.', description: 'Network error message' },
      'error.unauthorized': { value: 'You are not authorized to perform this action', description: 'Authorization error' },

      // Form labels
      'form.firstName': { value: 'First Name', description: 'First name field' },
      'form.lastName': { value: 'Last Name', description: 'Last name field' },
      'form.email': { value: 'Email', description: 'Email field' },
      'form.phone': { value: 'Phone', description: 'Phone field' },
      'form.address': { value: 'Address', description: 'Address field' },
      'form.city': { value: 'City', description: 'City field' },
      'form.state': { value: 'State', description: 'State field' },
      'form.zipCode': { value: 'ZIP Code', description: 'ZIP code field' },
      'form.country': { value: 'Country', description: 'Country field' },
      'form.password': { value: 'Password', description: 'Password field' },
      'form.confirmPassword': { value: 'Confirm Password', description: 'Confirm password field' },

      // Time and date
      'date.today': { value: 'Today', description: 'Today date' },
      'date.yesterday': { value: 'Yesterday', description: 'Yesterday date' },
      'date.tomorrow': { value: 'Tomorrow', description: 'Tomorrow date' },
      'date.thisWeek': { value: 'This Week', description: 'This week date' },
      'date.thisMonth': { value: 'This Month', description: 'This month date' },

      // Units
      'unit.days': { value: 'days', description: 'Days unit' },
      'unit.hours': { value: 'hours', description: 'Hours unit' },
      'unit.minutes': { value: 'minutes', description: 'Minutes unit' },
      'unit.seconds': { value: 'seconds', description: 'Seconds unit' },
      'unit.milliseconds': { value: 'milliseconds', description: 'Milliseconds unit' },
    };

    // Return locale-specific translations
    switch (locale) {
      case 'es':
        return {
          ...baseTranslations,
          'common.save': { value: 'Guardar', description: 'Save button text' },
          'common.cancel': { value: 'Cancelar', description: 'Cancel button text' },
          'nav.dashboard': { value: 'Panel de Control', description: 'Navigation dashboard' },
          'nav.leads': { value: 'Prospectos', description: 'Navigation leads' },
          'lead.title': { value: 'Gestión de Prospectos', description: 'Lead page title' },
          'form.firstName': { value: 'Nombre', description: 'First name field' },
          'form.lastName': { value: 'Apellido', description: 'Last name field' },
        };

      case 'fr':
        return {
          ...baseTranslations,
          'common.save': { value: 'Enregistrer', description: 'Save button text' },
          'common.cancel': { value: 'Annuler', description: 'Cancel button text' },
          'nav.dashboard': { value: 'Tableau de Bord', description: 'Navigation dashboard' },
          'nav.leads': { value: 'Prospects', description: 'Navigation leads' },
          'lead.title': { value: 'Gestion des Prospects', description: 'Lead page title' },
          'form.firstName': { value: 'Prénom', description: 'First name field' },
          'form.lastName': { value: 'Nom', description: 'Last name field' },
        };

      case 'de':
        return {
          ...baseTranslations,
          'common.save': { value: 'Speichern', description: 'Save button text' },
          'common.cancel': { value: 'Abbrechen', description: 'Cancel button text' },
          'nav.dashboard': { value: 'Dashboard', description: 'Navigation dashboard' },
          'nav.leads': { value: 'Leads', description: 'Navigation leads' },
          'lead.title': { value: 'Lead-Verwaltung', description: 'Lead page title' },
          'form.firstName': { value: 'Vorname', description: 'First name field' },
          'form.lastName': { value: 'Nachname', description: 'Last name field' },
        };

      default:
        return baseTranslations;
    }
  }
}

// Export singleton instance
export const translationManager = TranslationManager.getInstance();