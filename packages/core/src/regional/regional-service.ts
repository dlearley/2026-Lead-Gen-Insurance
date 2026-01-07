import {
  SupportedRegion,
  SupportedLocale,
  SupportedCurrency,
  RegionalSettings,
  ComplianceSettings,
  FormattingSettings
} from '@insurance-lead-gen/types';
import { REGIONAL_MAPPING } from '../global/config.js';
import { getTimezoneForRegion, getCurrencyForRegion, getLocaleForRegion } from '../locale/formatting.js';

/**
 * Regional Service for managing regional configuration and routing
 */
export class RegionalService {
  private static instance: RegionalService;
  private regionalSettings: Map<SupportedRegion, RegionalSettings> = new Map();

  private constructor() {
    this.initializeRegionalSettings();
  }

  public static getInstance(): RegionalService {
    if (!RegionalService.instance) {
      RegionalService.instance = new RegionalService();
    }
    return RegionalService.instance;
  }

  /**
   * Initialize regional settings from configuration
   */
  private initializeRegionalSettings(): void {
    for (const [regionCode, config] of Object.entries(REGIONAL_MAPPING)) {
      const region = regionCode as SupportedRegion;
      
      const settings: RegionalSettings = {
        region,
        locales: this.getLocalesForRegion(region),
        defaultLocale: config.defaultLocale as SupportedLocale,
        currencies: this.getCurrenciesForRegion(region),
        defaultCurrency: config.defaultCurrency as SupportedCurrency,
        timezones: this.getTimezonesForRegion(region),
        defaultTimezone: config.defaultTimezone,
        compliance: {
          gdprEnabled: config.compliance.gdprEnabled,
          ccpaEnabled: config.compliance.ccpaEnabled,
          dataRetentionDays: config.compliance.dataRetentionDays,
          consentRequired: config.compliance.consentRequired,
          privacyPolicyUrl: config.compliance.privacyPolicyUrl,
          termsOfServiceUrl: config.compliance.termsOfServiceUrl,
        },
        formatting: {
          dateFormat: this.getDateFormatForRegion(region),
          timeFormat: this.getTimeFormatForRegion(region),
          numberFormat: this.getNumberFormatForRegion(region),
          currencyFormat: this.getCurrencyFormatForRegion(region),
          addressFormat: this.getAddressFormatForRegion(region),
          phoneFormat: this.getPhoneFormatForRegion(region),
        },
      };

      this.regionalSettings.set(region, settings);
    }
  }

  /**
   * Get regional settings for a specific region
   */
  public getRegionalSettings(region: SupportedRegion): RegionalSettings | undefined {
    return this.regionalSettings.get(region);
  }

  /**
   * Get all supported regions
   */
  public getSupportedRegions(): SupportedRegion[] {
    return Array.from(this.regionalSettings.keys());
  }

  /**
   * Detect region from IP address or request headers
   */
  public detectRegion(
    ipAddress?: string,
    acceptLanguage?: string,
    fallbackRegion?: SupportedRegion
  ): SupportedRegion {
    // In a real implementation, this would:
    // 1. Use IP geolocation services
    // 2. Check Accept-Language headers
    // 3. Use user preferences
    // 4. Default to configured fallback

    if (fallbackRegion && this.regionalSettings.has(fallbackRegion)) {
      return fallbackRegion;
    }

    // Mock region detection based on IP (simplified)
    if (ipAddress) {
      // This would use a real geolocation service
      const ipPrefix = ipAddress.substring(0, 6);
      
      // Mock mapping based on IP ranges
      if (ipPrefix.startsWith('192.168') || ipPrefix.startsWith('10.') || ipPrefix.startsWith('172.')) {
        return 'US'; // Private IP ranges default to US
      }
      
      // Mock geographic detection
      const geoMap: Record<string, SupportedRegion> = {
        '1.2.3': 'AU',  // Mock Australian IP
        '2.3.4': 'CA',  // Mock Canadian IP
        '3.4.5': 'GB',  // Mock UK IP
      };
      
      const detectedRegion = geoMap[ipPrefix];
      if (detectedRegion && this.regionalSettings.has(detectedRegion)) {
        return detectedRegion;
      }
    }

    // Fallback to US
    return 'US';
  }

  /**
   * Get recommended locale for region
   */
  public getRecommendedLocale(region: SupportedRegion): SupportedLocale {
    const settings = this.getRegionalSettings(region);
    return settings?.defaultLocale || 'en';
  }

  /**
   * Get recommended currency for region
   */
  public getRecommendedCurrency(region: SupportedRegion): SupportedCurrency {
    const settings = this.getRegionalSettings(region);
    return settings?.defaultCurrency || 'USD';
  }

  /**
   * Check if region requires compliance features
   */
  public hasComplianceRequirements(region: SupportedRegion): boolean {
    const settings = this.getRegionalSettings(region);
    if (!settings) return false;

    return (
      settings.compliance.gdprEnabled ||
      settings.compliance.ccpaEnabled
    );
  }

  /**
   * Get compliance requirements for region
   */
  public getComplianceRequirements(region: SupportedRegion): ComplianceSettings | undefined {
    const settings = this.getRegionalSettings(region);
    return settings?.compliance;
  }

  /**
   * Check if locale is supported in region
   */
  public isLocaleSupportedInRegion(locale: SupportedLocale, region: SupportedRegion): boolean {
    const settings = this.getRegionalSettings(region);
    return settings?.locales.includes(locale) || false;
  }

  /**
   * Get supported locales for region
   */
  public getLocalesForRegion(region: SupportedRegion): SupportedLocale[] {
    const settings = this.getRegionalSettings(region);
    return settings?.locales || ['en'];
  }

  /**
   * Get supported currencies for region
   */
  public getCurrenciesForRegion(region: SupportedRegion): SupportedCurrency[] {
    const settings = this.getRegionalSettings(region);
    return settings?.currencies || ['USD'];
  }

  /**
   * Get supported timezones for region
   */
  public getTimezonesForRegion(region: SupportedRegion): string[] {
    const settings = this.getRegionalSettings(region);
    if (settings?.timezones) {
      return settings.timezones;
    }

    // Default timezone for region
    return [getTimezoneForRegion(region)];
  }

  /**
   * Get formatting settings for region
   */
  public getFormattingSettings(region: SupportedRegion): FormattingSettings | undefined {
    const settings = this.getRegionalSettings(region);
    return settings?.formatting;
  }

  /**
   * Check if region uses RTL text direction
   */
  public isRTLRegion(region: SupportedRegion): boolean {
    const locales = this.getLocalesForRegion(region);
    return locales.some(locale => {
      // Arabic and Hebrew use RTL
      return locale === 'ar' || locale === 'he' || locale === 'fa';
    });
  }

  /**
   * Get business hours for region
   */
  public getBusinessHours(region: SupportedRegion): { start: string; end: string; timezone: string } {
    const timezone = getTimezoneForRegion(region);
    
    // Default business hours by region
    const businessHours: Record<SupportedRegion, { start: string; end: string }> = {
      US: { start: '09:00', end: '17:00' },
      CA: { start: '09:00', end: '17:00' },
      GB: { start: '09:00', end: '17:00' },
      AU: { start: '09:00', end: '17:00' },
      DE: { start: '09:00', end: '18:00' },
      FR: { start: '09:00', end: '18:00' },
      ES: { start: '09:00', end: '18:00' },
      IT: { start: '09:00', end: '18:00' },
      BR: { start: '09:00', end: '18:00' },
      JP: { start: '09:00', end: '18:00' },
      CN: { start: '09:00', end: '18:00' },
      KR: { start: '09:00', end: '18:00' },
      IN: { start: '10:00', end: '19:00' },
      MX: { start: '09:00', end: '18:00' },
      AR: { start: '09:00', end: '18:00' },
    };

    const hours = businessHours[region] || { start: '09:00', end: '17:00' };
    return { ...hours, timezone };
  }

  /**
   * Get holidays for region
   */
  public getRegionalHolidays(region: SupportedRegion, year: number): string[] {
    // Mock holiday data - in production, use a proper holidays library
    const holidays: Record<SupportedRegion, string[]> = {
      US: [
        `${year}-01-01`, // New Year's Day
        `${year}-07-04`, // Independence Day
        `${year}-12-25`, // Christmas Day
      ],
      CA: [
        `${year}-01-01`, // New Year's Day
        `${year}-07-01`, // Canada Day
        `${year}-12-25`, // Christmas Day
      ],
      GB: [
        `${year}-01-01`, // New Year's Day
        `${year}-12-25`, // Christmas Day
        `${year}-12-26`, // Boxing Day
      ],
      // Add more regions as needed
      default: [`${year}-01-01`, `${year}-12-25`],
    };

    return holidays[region] || holidays.default;
  }

  /**
   * Update regional settings (for admin use)
   */
  public updateRegionalSettings(region: SupportedRegion, settings: Partial<RegionalSettings>): void {
    const currentSettings = this.regionalSettings.get(region);
    if (currentSettings) {
      const updatedSettings = { ...currentSettings, ...settings };
      this.regionalSettings.set(region, updatedSettings);
    }
  }

  // Private helper methods for formatting settings

  private getDateFormatForRegion(region: SupportedRegion): string {
    const formats: Record<SupportedRegion, string> = {
      US: 'MM/DD/YYYY',
      CA: 'DD/MM/YYYY',
      GB: 'DD/MM/YYYY',
      AU: 'DD/MM/YYYY',
      DE: 'DD.MM.YYYY',
      FR: 'DD/MM/YYYY',
      ES: 'DD/MM/YYYY',
      IT: 'DD/MM/YYYY',
      BR: 'DD/MM/YYYY',
      JP: 'YYYY/MM/DD',
      CN: 'YYYY-MM-DD',
      KR: 'YYYY-MM-DD',
      IN: 'DD/MM/YYYY',
      MX: 'DD/MM/YYYY',
      AR: 'DD/MM/YYYY',
    };

    return formats[region] || 'MM/DD/YYYY';
  }

  private getTimeFormatForRegion(region: SupportedRegion): string {
    const timeFormats: Record<SupportedRegion, string> = {
      US: '12-hour',
      CA: '12-hour',
      GB: '24-hour',
      AU: '24-hour',
      DE: '24-hour',
      FR: '24-hour',
      ES: '24-hour',
      IT: '24-hour',
      BR: '24-hour',
      JP: '24-hour',
      CN: '24-hour',
      KR: '24-hour',
      IN: '12-hour',
      MX: '24-hour',
      AR: '24-hour',
    };

    return timeFormats[region] || '24-hour';
  }

  private getNumberFormatForRegion(region: SupportedRegion): string {
    const formats: Record<SupportedRegion, string> = {
      US: '1,234.56',
      CA: '1,234.56',
      GB: '1,234.56',
      AU: '1,234.56',
      DE: '1.234,56',
      FR: '1 234,56', // Non-breaking space
      ES: '1.234,56',
      IT: '1.234,56',
      BR: '1.234,56',
      JP: '1,234',
      CN: '1,234',
      KR: '1,234',
      IN: '1,23,456', // Indian numbering system
      MX: '1,234.56',
      AR: '1,234.56',
    };

    return formats[region] || '1,234.56';
  }

  private getCurrencyFormatForRegion(region: SupportedRegion): string {
    const currency = getCurrencyForRegion(region);
    
    const formats: Record<SupportedCurrency, string> = {
      USD: '$1,234.56',
      EUR: '1.234,56 €',
      GBP: '£1,234.56',
      CAD: 'C$1,234.56',
      AUD: 'A$1,234.56',
      JPY: '¥1,234',
      CNY: '¥1,234.56',
      KRW: '₩1,234',
      INR: '₹1,23,456',
      BRL: 'R$1.234,56',
      MXN: '$1,234.56',
      ARS: '$1.234,56',
    };

    return formats[currency] || '$1,234.56';
  }

  private getAddressFormatForRegion(region: SupportedRegion): string {
    const formats: Record<SupportedRegion, string> = {
      US: 'street, city, state zip',
      CA: 'street, city, province postal_code',
      GB: 'street, city, postcode',
      AU: 'street, city, state postcode',
      DE: 'street, city postal_code',
      FR: 'street, postal_code city',
      ES: 'street, city, postal_code',
      IT: 'street, city, postal_code',
      BR: 'street, city, state, postal_code',
      JP: 'postal_code city street',
      CN: 'city street postal_code',
      KR: 'city street postal_code',
      IN: 'street, city, state postal_code',
      MX: 'street, city, state, postal_code',
      AR: 'street, city, province, postal_code',
    };

    return formats[region] || 'street, city, state zip';
  }

  private getPhoneFormatForRegion(region: SupportedRegion): string {
    const formats: Record<SupportedRegion, string> = {
      US: '+1 (XXX) XXX-XXXX',
      CA: '+1 (XXX) XXX-XXXX',
      GB: '+44 XXXX XXXXXX',
      AU: '+61 X XXX XXX XXX',
      DE: '+49 XXX XXX XXXX',
      FR: '+33 X XX XX XX XX',
      ES: '+34 XXX XXX XXX',
      IT: '+39 XXX XXX XXXX',
      BR: '+55 XX XXXXX-XXXX',
      JP: '+81 XXX-XXXX-XXXX',
      CN: '+86 XXX XXXX XXXX',
      KR: '+82 XXX-XXXX-XXXX',
      IN: '+91 XXXXX XXXXX',
      MX: '+52 XX XXXX XXXX',
      AR: '+54 XX-XXXX-XXXX',
    };

    return formats[region] || '+XX XXX XXX XXXX';
  }
}

// Export singleton instance
export const regionalService = RegionalService.getInstance();