import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  SupportedLocale,
  SupportedRegion,
  SupportedCurrency
} from '@insurance-lead-gen/types';
import { translationManager, regionalService, currencyService } from '@insurance-lead-gen/core';

/**
 * Localization context interface
 */
interface LocalizationContextType {
  // Current locale settings
  locale: SupportedLocale;
  region: SupportedRegion;
  currency: SupportedCurrency;
  timezone: string;
  
  // Supported options
  supportedLocales: SupportedLocale[];
  supportedRegions: SupportedRegion[];
  supportedCurrencies: SupportedCurrency[];
  
  // Locale metadata
  localeMetadata: Record<string, any>;
  regionMetadata: Record<string, any>;
  currencyMetadata: Record<string, any>;
  
  // Translation cache
  translations: Record<string, string>;
  
  // Actions
  setLocale: (locale: SupportedLocale) => Promise<void>;
  setRegion: (region: SupportedRegion) => Promise<void>;
  setCurrency: (currency: SupportedCurrency) => Promise<void>;
  translate: (key: string, fallback?: string) => string;
  translateMany: (keys: string[]) => Promise<Record<string, string>>;
  formatCurrency: (amount: number, currency?: SupportedCurrency) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatAddress: (address: any) => string;
  formatPhoneNumber: (phoneNumber: string) => string;
  
  // Loading states
  isLoading: boolean;
  isTranslating: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

/**
 * Create localization context
 */
const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

/**
 * Localization provider props
 */
interface LocalizationProviderProps {
  children: ReactNode;
  defaultLocale?: SupportedLocale;
  defaultRegion?: SupportedRegion;
  defaultCurrency?: SupportedCurrency;
  fallbackLocale?: SupportedLocale;
  preloadTranslations?: boolean;
}

/**
 * Localization Provider Component
 */
export function LocalizationProvider({
  children,
  defaultLocale,
  defaultRegion,
  defaultCurrency,
  fallbackLocale = 'en',
  preloadTranslations = true
}: LocalizationProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale || 'en');
  const [region, setRegionState] = useState<SupportedRegion>(defaultRegion || 'US');
  const [currency, setCurrencyState] = useState<SupportedCurrency>(defaultCurrency || 'USD');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get metadata
  const supportedLocales = translationManager.getSupportedLocales();
  const supportedRegions = regionalService.getSupportedRegions();
  const supportedCurrencies = currencyService.getSupportedCurrencies();
  
  const localeMetadata = supportedLocales.reduce((acc, loc) => {
    acc[loc] = translationManager.getLocaleMetadata(loc);
    return acc;
  }, {} as Record<string, any>);
  
  const regionMetadata = supportedRegions.reduce((acc, reg) => {
    acc[reg] = regionalService.getRegionalSettings(reg);
    return acc;
  }, {} as Record<string, any>);
  
  const currencyMetadata = supportedCurrencies.reduce((acc, curr) => {
    acc[curr] = currencyService.getCurrencyMetadata(curr);
    return acc;
  }, {} as Record<string, any>);

  /**
   * Initialize locale from browser/cookie
   */
  useEffect(() => {
    const initializeLocale = async () => {
      try {
        setIsLoading(true);
        
        // Get locale from localStorage or detect from browser
        const savedLocale = localStorage.getItem('locale') as SupportedLocale;
        const detectedLocale = translationManager.detectLocale(
          navigator.language,
          savedLocale || fallbackLocale
        );
        
        const initialLocale = savedLocale || detectedLocale || fallbackLocale;
        
        // Get region from localStorage or detect from browser
        const savedRegion = localStorage.getItem('region') as SupportedRegion;
        const initialRegion = savedRegion || region;
        
        // Get currency from localStorage or get from region
        const savedCurrency = localStorage.getItem('currency') as SupportedCurrency;
        const initialCurrency = savedCurrency || currencyService.getCurrencyForRegion(initialRegion);
        
        await updateLocale(initialLocale, initialRegion, initialCurrency);
        
        if (preloadTranslations) {
          await preloadCommonTranslations(initialLocale);
        }
      } catch (error) {
        console.error('Error initializing locale:', error);
        setError('Failed to initialize locale settings');
      } finally {
        setIsLoading(false);
      }
    };

    initializeLocale();
  }, []);

  /**
   * Update locale with related settings
   */
  const updateLocale = async (
    newLocale: SupportedLocale,
    newRegion?: SupportedRegion,
    newCurrency?: SupportedCurrency
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Update locale
      setLocaleState(newLocale);
      localStorage.setItem('locale', newLocale);
      
      // Update region if provided or get from locale
      const targetRegion = newRegion || regionalService.getRegionsForLocale(newLocale)[0] || 'US';
      setRegionState(targetRegion);
      localStorage.setItem('region', targetRegion);
      
      // Update currency if provided or get from region
      const targetCurrency = newCurrency || currencyService.getCurrencyForRegion(targetRegion);
      setCurrencyState(targetCurrency);
      localStorage.setItem('currency', targetCurrency);
      
      // Update timezone
      const regionalSettings = regionalService.getRegionalSettings(targetRegion);
      const targetTimezone = regionalSettings?.timezones[0] || 'UTC';
      setTimezone(targetTimezone);
      
      // Load translations for new locale
      if (newLocale !== locale) {
        await loadTranslations(newLocale);
      }
    } catch (error) {
      console.error('Error updating locale:', error);
      setError('Failed to update locale settings');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load translations for a locale
   */
  const loadTranslations = async (targetLocale: SupportedLocale) => {
    try {
      setIsTranslating(true);
      
      const translationFile = await translationManager.loadTranslations(targetLocale);
      const translationMap: Record<string, string> = {};
      
      for (const [key, translation] of Object.entries(translationFile.translations)) {
        translationMap[key] = translation.value;
      }
      
      setTranslations(translationMap);
    } catch (error) {
      console.error('Error loading translations:', error);
      setError('Failed to load translations');
    } finally {
      setIsTranslating(false);
    }
  };

  /**
   * Preload common translations
   */
  const preloadCommonTranslations = async (targetLocale: SupportedLocale) => {
    const commonKeys = [
      'common.save',
      'common.cancel',
      'common.delete',
      'common.edit',
      'common.submit',
      'common.loading',
      'common.error',
      'common.success',
      'nav.dashboard',
      'nav.leads',
      'nav.agents',
      'nav.settings',
      'lead.title',
      'lead.create',
      'lead.edit',
      'form.firstName',
      'form.lastName',
      'form.email',
      'form.phone',
      'form.address',
      'form.city',
      'form.state',
      'form.zipCode',
      'form.country',
      'insurance.auto',
      'insurance.home',
      'insurance.life',
      'insurance.health',
      'insurance.commercial'
    ];
    
    await translateMany(commonKeys);
  };

  /**
   * Set locale action
   */
  const setLocale = async (newLocale: SupportedLocale) => {
    await updateLocale(newLocale);
  };

  /**
   * Set region action
   */
  const setRegion = async (newRegion: SupportedRegion) => {
    await updateLocale(locale, newRegion);
  };

  /**
   * Set currency action
   */
  const setCurrency = async (newCurrency: SupportedCurrency) => {
    await updateLocale(locale, region, newCurrency);
  };

  /**
   * Translate single key
   */
  const translate = (key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  };

  /**
   * Translate multiple keys
   */
  const translateMany = async (keys: string[]): Promise<Record<string, string>> => {
    try {
      const results = await translationManager.translateMany(keys, locale);
      const translationMap: Record<string, string> = {};
      
      for (const [key, result] of Object.entries(results)) {
        translationMap[key] = result.value;
      }
      
      // Update translations cache
      setTranslations(prev => ({ ...prev, ...translationMap }));
      
      return translationMap;
    } catch (error) {
      console.error('Error translating keys:', error);
      setError('Failed to translate keys');
      return keys.reduce((acc, key) => {
        acc[key] = key;
        return acc;
      }, {} as Record<string, string>);
    }
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount: number, targetCurrency?: SupportedCurrency): string => {
    const currencyToUse = targetCurrency || currency;
    return currencyService.formatCurrency(amount, currencyToUse, locale);
  };

  /**
   * Format date
   */
  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      ...options
    });
    return formatter.format(date);
  };

  /**
   * Format number
   */
  const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
    const formatter = new Intl.NumberFormat(locale, options);
    return formatter.format(number);
  };

  /**
   * Format address
   */
  const formatAddress = (address: any): string => {
    if (!address) return '';
    
    const parts: string[] = [];
    
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    
    return parts.filter(part => part.trim()).join(', ');
  };

  /**
   * Format phone number
   */
  const formatPhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '';
    
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Basic formatting - can be enhanced
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return phoneNumber;
  };

  /**
   * Clear error
   */
  const clearError = () => setError(null);

  const contextValue: LocalizationContextType = {
    // Current settings
    locale,
    region,
    currency,
    timezone,
    
    // Supported options
    supportedLocales,
    supportedRegions,
    supportedCurrencies,
    
    // Metadata
    localeMetadata,
    regionMetadata,
    currencyMetadata,
    
    // Translation cache
    translations,
    
    // Actions
    setLocale,
    setRegion,
    setCurrency,
    translate,
    translateMany,
    formatCurrency,
    formatDate,
    formatNumber,
    formatAddress,
    formatPhoneNumber,
    
    // States
    isLoading,
    isTranslating,
    
    // Error handling
    error,
    clearError
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
}

/**
 * Hook to use localization context
 */
export function useLocalization(): LocalizationContextType {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}

/**
 * Hook for simple locale access
 */
export function useLocale(): SupportedLocale {
  const { locale } = useLocalization();
  return locale;
}

/**
 * Hook for region access
 */
export function useRegion(): SupportedRegion {
  const { region } = useLocalization();
  return region;
}

/**
 * Hook for currency access
 */
export function useCurrency(): SupportedCurrency {
  const { currency } = useLocalization();
  return currency;
}

/**
 * Hook for timezone access
 */
export function useTimezone(): string {
  const { timezone } = useLocalization();
  return timezone;
}

/**
 * Hook for translations
 */
export function useTranslation() {
  const { translate, translateMany, translations } = useLocalization();
  return { t: translate, translateMany, translations };
}