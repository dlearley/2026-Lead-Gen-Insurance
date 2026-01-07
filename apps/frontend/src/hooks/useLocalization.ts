import { useState, useEffect } from 'react';
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

/**
 * Hook for locale management
 */
export function useLocale() {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [isLoading, setIsLoading] = useState(false);

  const changeLocale = async (newLocale: SupportedLocale) => {
    try {
      setIsLoading(true);
      setLocale(newLocale);
      
      // Save to localStorage
      localStorage.setItem('locale', newLocale);
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('localeChanged', { 
        detail: { locale: newLocale } 
      }));
    } catch (error) {
      console.error('Failed to change locale:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize locale from localStorage or browser
    const savedLocale = localStorage.getItem('locale') as SupportedLocale;
    const browserLocale = navigator.language.split('-')[0] as SupportedLocale;
    const initialLocale = savedLocale || browserLocale || 'en';
    
    setLocale(initialLocale);
  }, []);

  return {
    locale,
    setLocale: changeLocale,
    isLoading,
    supportedLocales: translationManager.getSupportedLocales()
  };
}

/**
 * Hook for region management
 */
export function useRegion() {
  const [region, setRegion] = useState<SupportedRegion>('US');
  const [isLoading, setIsLoading] = useState(false);

  const changeRegion = async (newRegion: SupportedRegion) => {
    try {
      setIsLoading(true);
      setRegion(newRegion);
      
      // Save to localStorage
      localStorage.setItem('region', newRegion);
      
      // Update related settings
      const recommendedCurrency = currencyService.getCurrencyForRegion(newRegion);
      localStorage.setItem('currency', recommendedCurrency);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('regionChanged', { 
        detail: { region: newRegion, currency: recommendedCurrency } 
      }));
    } catch (error) {
      console.error('Failed to change region:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize region from localStorage or detect from IP
    const savedRegion = localStorage.getItem('region') as SupportedRegion;
    
    if (savedRegion) {
      setRegion(savedRegion);
    } else {
      // Auto-detect region (in production, this would use IP geolocation)
      const browserRegion = 'US'; // Fallback
      setRegion(browserRegion);
    }
  }, []);

  return {
    region,
    setRegion: changeRegion,
    isLoading,
    supportedRegions: regionalService.getSupportedRegions(),
    hasComplianceRequirements: regionalService.hasComplianceRequirements(region)
  };
}

/**
 * Hook for currency management
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [isLoading, setIsLoading] = useState(false);

  const changeCurrency = async (newCurrency: SupportedCurrency) => {
    try {
      setIsLoading(true);
      setCurrency(newCurrency);
      
      // Save to localStorage
      localStorage.setItem('currency', newCurrency);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('currencyChanged', { 
        detail: { currency: newCurrency } 
      }));
    } catch (error) {
      console.error('Failed to change currency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize currency from localStorage or region
    const savedCurrency = localStorage.getItem('currency') as SupportedCurrency;
    
    if (savedCurrency) {
      setCurrency(savedCurrency);
    } else {
      // Get currency from region
      const region = localStorage.getItem('region') as SupportedRegion || 'US';
      const recommendedCurrency = currencyService.getCurrencyForRegion(region);
      setCurrency(recommendedCurrency);
    }
  }, []);

  return {
    currency,
    setCurrency: changeCurrency,
    isLoading,
    supportedCurrencies: currencyService.getSupportedCurrencies()
  };
}

/**
 * Hook for translations
 */
export function useTranslation() {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const translate = (key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  };

  const translateMany = async (keys: string[], locale: SupportedLocale = 'en') => {
    try {
      setIsLoading(true);
      
      const results = await translationManager.translateMany(keys, locale);
      const translationMap: Record<string, string> = {};
      
      for (const [key, result] of Object.entries(results)) {
        translationMap[key] = result.value;
      }
      
      setTranslations(prev => ({ ...prev, ...translationMap }));
      
      return translationMap;
    } catch (error) {
      console.error('Failed to translate keys:', error);
      return keys.reduce((acc, key) => {
        acc[key] = key;
        return acc;
      }, {} as Record<string, string>);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTranslations = async (locale: SupportedLocale) => {
    try {
      setIsLoading(true);
      
      const translationFile = await translationManager.loadTranslations(locale);
      const translationMap: Record<string, string> = {};
      
      for (const [key, translation] of Object.entries(translationFile.translations)) {
        translationMap[key] = translation.value;
      }
      
      setTranslations(translationMap);
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load initial translations
    const locale = localStorage.getItem('locale') as SupportedLocale || 'en';
    loadTranslations(locale);
  }, []);

  return {
    translations,
    translate,
    translateMany,
    loadTranslations,
    isLoading
  };
}

/**
 * Hook for regional settings
 */
export function useRegionalSettings() {
  const [region] = useRegion();
  const [locale] = useLocale();

  const regionalSettings = regionalService.getRegionalSettings(region);
  const businessHours = regionalService.getBusinessHours(region);
  const holidays = regionalService.getRegionalHolidays(region, new Date().getFullYear());

  const hasCompliance = regionalService.hasComplianceRequirements(region);
  const compliance = regionalService.getComplianceRequirements(region);

  const formatAddress = (address: any) => {
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

  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '';
    
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Basic formatting for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return phoneNumber;
  };

  return {
    region,
    locale,
    regionalSettings,
    businessHours,
    holidays,
    hasCompliance,
    compliance,
    formatAddress,
    formatPhoneNumber,
    isRTLRegion: regionalService.isRTLRegion(region)
  };
}

/**
 * Hook for currency conversion and formatting
 */
export function useCurrencyFormatting() {
  const [currency] = useCurrency();
  const [locale] = useLocale();

  const formatCurrency = (amount: number, targetCurrency?: SupportedCurrency) => {
    const currencyToUse = targetCurrency || currency;
    return currencyService.formatCurrency(amount, currencyToUse, locale);
  };

  const convertCurrency = async (amount: number, fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency) => {
    try {
      const conversion = await currencyService.convertCurrency({
        amount,
        fromCurrency,
        toCurrency
      });
      
      return conversion.amount;
    } catch (error) {
      console.error('Failed to convert currency:', error);
      return amount; // Return original amount on error
    }
  };

  const parseCurrency = (currencyString: string): number => {
    return currencyService.parseCurrency(currencyString);
  };

  const getExchangeRate = (fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency) => {
    return currencyService.getConversionRate(fromCurrency, toCurrency);
  };

  return {
    currency,
    locale,
    formatCurrency,
    convertCurrency,
    parseCurrency,
    getExchangeRate
  };
}

/**
 * Combined hook for all localization features
 */
export function useLocalization() {
  const locale = useLocale();
  const region = useRegion();
  const currency = useCurrency();
  const translation = useTranslation();
  const regionalSettings = useRegionalSettings();
  const currencyFormatting = useCurrencyFormatting();

  return {
    ...locale,
    ...region,
    ...currency,
    ...translation,
    ...regionalSettings,
    ...currencyFormatting
  };
}