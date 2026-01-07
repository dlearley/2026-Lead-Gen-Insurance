import {
  SupportedCurrency,
  CurrencyConversionRequest,
  SupportedRegion
} from '@insurance-lead-gen/types';
import { CURRENCY_METADATA } from '../global/config.js';

/**
 * Currency conversion rates (mock data - in production use real API)
 */
const CURRENCY_RATES: Record<SupportedCurrency, Record<SupportedCurrency, number>> = {
  USD: { EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35, JPY: 110, CNY: 6.45, KRW: 1180, INR: 74, BRL: 5.2, MXN: 20, ARS: 98 },
  EUR: { USD: 1.18, GBP: 0.86, CAD: 1.47, AUD: 1.59, JPY: 129, CNY: 7.59, KRW: 1388, INR: 87, BRL: 6.12, MXN: 23.5, ARS: 115 },
  GBP: { USD: 1.37, EUR: 1.16, CAD: 1.71, AUD: 1.85, JPY: 151, CNY: 8.84, KRW: 1617, INR: 101, BRL: 7.12, MXN: 27.4, ARS: 134 },
  CAD: { USD: 0.80, EUR: 0.68, GBP: 0.58, AUD: 1.08, JPY: 88, CNY: 5.16, KRW: 944, INR: 59, BRL: 4.16, MXN: 16, ARS: 78 },
  AUD: { USD: 0.74, EUR: 0.63, GBP: 0.54, CAD: 0.93, JPY: 81, CNY: 4.78, KRW: 874, INR: 55, BRL: 3.85, MXN: 14.8, ARS: 73 },
  JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, CAD: 0.011, AUD: 0.012, CNY: 0.059, KRW: 10.7, INR: 0.67, BRL: 0.047, MXN: 0.18, ARS: 0.89 },
  CNY: { USD: 0.155, EUR: 0.132, GBP: 0.113, CAD: 0.194, AUD: 0.209, JPY: 17, KRW: 183, INR: 11.5, BRL: 0.81, MXN: 3.1, ARS: 15.2 },
  KRW: { USD: 0.00085, EUR: 0.00072, GBP: 0.00062, CAD: 0.00106, AUD: 0.00114, JPY: 0.093, CNY: 0.0055, INR: 0.063, BRL: 0.0044, MXN: 0.017, ARS: 0.083 },
  INR: { USD: 0.0135, EUR: 0.0115, GBP: 0.0099, CAD: 0.0169, AUD: 0.0182, JPY: 1.49, CNY: 0.087, KRW: 15.9, BRL: 0.070, MXN: 0.27, ARS: 1.33 },
  BRL: { USD: 0.192, EUR: 0.163, GBP: 0.140, CAD: 0.240, AUD: 0.260, JPY: 21.2, CNY: 1.24, KRW: 227, INR: 14.3, MXN: 3.8, ARS: 18.8 },
  MXN: { USD: 0.050, EUR: 0.043, GBP: 0.037, CAD: 0.063, AUD: 0.068, JPY: 5.6, CNY: 0.323, KRW: 59, INR: 3.7, BRL: 0.26, ARS: 4.95 },
  ARS: { USD: 0.010, EUR: 0.0087, GBP: 0.0074, CAD: 0.013, AUD: 0.014, JPY: 1.12, CNY: 0.066, KRW: 12.0, INR: 0.75, BRL: 0.053, MXN: 0.20 },
};

/**
 * Currency Service for handling multi-currency operations
 */
export class CurrencyService {
  private static instance: CurrencyService;
  private conversionCache: Map<string, number> = new Map();
  private cacheExpiry: number = 1000 * 60 * 15; // 15 minutes

  private constructor() {
    // Initialize conversion cache
    this.initializeCache();
  }

  public static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  /**
   * Initialize conversion cache with base rates
   */
  private initializeCache(): void {
    const now = Date.now();
    
    for (const [fromCurrency, rates] of Object.entries(CURRENCY_RATES)) {
      for (const [toCurrency, rate] of Object.entries(rates)) {
        const cacheKey = `${fromCurrency}_${toCurrency}`;
        this.conversionCache.set(cacheKey, {
          rate,
          timestamp: now
        });
      }
    }
  }

  /**
   * Get currency metadata
   */
  public getCurrencyMetadata(currency: SupportedCurrency) {
    return CURRENCY_METADATA[currency];
  }

  /**
   * Get all supported currencies
   */
  public getSupportedCurrencies(): SupportedCurrency[] {
    return Object.keys(CURRENCY_METADATA) as SupportedCurrency[];
  }

  /**
   * Convert currency amount
   */
  public async convertCurrency(request: CurrencyConversionRequest): Promise<{
    amount: number;
    rate: number;
    fromCurrency: SupportedCurrency;
    toCurrency: SupportedCurrency;
    asOfDate: Date;
  }> {
    const { amount, fromCurrency, toCurrency, asOfDate } = request;

    if (fromCurrency === toCurrency) {
      return {
        amount,
        rate: 1,
        fromCurrency,
        toCurrency,
        asOfDate: asOfDate || new Date()
      };
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.conversionCache.get(cacheKey);

    // Check if cache is still valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      const convertedAmount = amount * cached.rate;
      return {
        amount: convertedAmount,
        rate: cached.rate,
        fromCurrency,
        toCurrency,
        asOfDate: new Date(cached.timestamp)
      };
    }

    // Get conversion rate
    const rate = this.getConversionRate(fromCurrency, toCurrency);
    
    // Cache the result
    this.conversionCache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });

    const convertedAmount = amount * rate;
    return {
      amount: convertedAmount,
      rate,
      fromCurrency,
      toCurrency,
      asOfDate: new Date()
    };
  }

  /**
   * Get conversion rate between currencies
   */
  public getConversionRate(fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency): number {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const rates = CURRENCY_RATES[fromCurrency];
    if (rates && rates[toCurrency]) {
      return rates[toCurrency];
    }

    // If direct rate not found, try to calculate via USD
    if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const fromToUSD = this.getConversionRate(fromCurrency, 'USD');
      const usdToTarget = this.getConversionRate('USD', toCurrency);
      return fromToUSD * usdToTarget;
    }

    // Fallback rate (in production, throw error or use external API)
    console.warn(`Conversion rate not found for ${fromCurrency} to ${toCurrency}, using fallback rate`);
    return 1;
  }

  /**
   * Get currency for region
   */
  public getCurrencyForRegion(region: SupportedRegion): SupportedCurrency {
    const currencyMap: Record<SupportedRegion, SupportedCurrency> = {
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      AU: 'AUD',
      DE: 'EUR',
      FR: 'EUR',
      ES: 'EUR',
      IT: 'EUR',
      BR: 'BRL',
      JP: 'JPY',
      CN: 'CNY',
      KR: 'KRW',
      IN: 'INR',
      MX: 'MXN',
      AR: 'ARS',
    };

    return currencyMap[region] || 'USD';
  }

  /**
   * Get supported currencies for region
   */
  public getSupportedCurrenciesForRegion(region: SupportedRegion): SupportedCurrency[] {
    const defaultCurrency = this.getCurrencyForRegion(region);
    const metadata = CURRENCY_METADATA[defaultCurrency];
    
    // Return default currency and related currencies
    const supported: SupportedCurrency[] = [defaultCurrency];
    
    // Add EUR for European regions
    if (['DE', 'FR', 'ES', 'IT'].includes(region)) {
      supported.push('EUR');
    }
    
    // Add USD for regions that commonly use USD
    if (['CA', 'AU', 'MX'].includes(region)) {
      supported.push('USD');
    }
    
    return supported;
  }

  /**
   * Format currency amount for display
   */
  public formatCurrency(
    amount: number,
    currency: SupportedCurrency,
    locale: string = 'en-US'
  ): string {
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: this.getCurrencyMetadata(currency)?.decimalPlaces || 2,
        maximumFractionDigits: this.getCurrencyMetadata(currency)?.decimalPlaces || 2,
      });

      return formatter.format(amount);
    } catch (error) {
      console.error(`Error formatting currency ${currency}:`, error);
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  /**
   * Parse currency string to number
   */
  public parseCurrency(currencyString: string): number {
    // Remove all non-numeric characters except decimal point and minus
    const cleaned = currencyString.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Get exchange rate information
   */
  public getExchangeRateInfo(fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency): {
    rate: number;
    lastUpdated: Date;
    source: string;
  } {
    const rate = this.getConversionRate(fromCurrency, toCurrency);
    
    return {
      rate,
      lastUpdated: new Date(),
      source: 'Mock Exchange Rate Service' // In production, use real API source
    };
  }

  /**
   * Update exchange rates (for admin use)
   */
  public updateExchangeRates(rates: Record<string, number>): void {
    for (const [key, rate] of Object.entries(rates)) {
      this.conversionCache.set(key, {
        rate,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get conversion history for analytics
   */
  public getConversionHistory(
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency,
    days: number = 30
  ): Array<{ date: Date; rate: number }> {
    // Mock historical data - in production, store and retrieve from database
    const history: Array<{ date: Date; rate: number }> = [];
    const currentRate = this.getConversionRate(fromCurrency, toCurrency);
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some random variation to simulate rate changes
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const historicalRate = currentRate * (1 + variation);
      
      history.push({
        date,
        rate: historicalRate
      });
    }
    
    return history;
  }

  /**
   * Check if currency is available for conversion
   */
  public isCurrencySupported(currency: string): currency is SupportedCurrency {
    return this.getSupportedCurrencies().includes(currency as SupportedCurrency);
  }

  /**
   * Clear conversion cache
   */
  public clearCache(): void {
    this.conversionCache.clear();
    this.initializeCache();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      rate: number;
      lastUpdated: Date;
    }>;
  } {
    const entries: Array<{ key: string; rate: number; lastUpdated: Date }> = [];
    
    for (const [key, value] of this.conversionCache.entries()) {
      entries.push({
        key,
        rate: value.rate,
        lastUpdated: new Date(value.timestamp)
      });
    }
    
    return {
      size: this.conversionCache.size,
      entries
    };
  }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();