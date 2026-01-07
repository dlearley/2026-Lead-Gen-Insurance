import {
  SupportedLocale,
  SupportedRegion,
  SupportedCurrency,
  FormattingOptions,
  AddressFormat,
  PhoneFormat
} from '@insurance-lead-gen/types';

/**
 * Format currency amounts according to locale and currency standards
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  options: FormattingOptions
): string {
  const { locale } = options;
  
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Format numbers according to locale standards
 */
export function formatNumber(
  number: number,
  options: FormattingOptions
): string {
  const { locale, numberStyle = 'decimal' } = options;
  
  const formatter = new Intl.NumberFormat(locale, {
    style: numberStyle,
  });

  return formatter.format(number);
}

/**
 * Format dates according to locale standards
 */
export function formatDate(
  date: Date,
  options: FormattingOptions
): string {
  const { locale, dateStyle = 'medium' } = options;
  
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: dateStyle as Intl.DateTimeFormatOptions['dateStyle'],
  });

  return formatter.format(date);
}

/**
 * Format times according to locale standards
 */
export function formatTime(
  date: Date,
  options: FormattingOptions
): string {
  const { locale, timeStyle = 'medium' } = options;
  
  const formatter = new Intl.DateTimeFormat(locale, {
    timeStyle: timeStyle as Intl.DateTimeFormatOptions['timeStyle'],
  });

  return formatter.format(date);
}

/**
 * Format dates and times according to locale standards
 */
export function formatDateTime(
  date: Date,
  options: FormattingOptions
): string {
  const { locale, dateStyle = 'medium', timeStyle = 'medium' } = options;
  
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: dateStyle as Intl.DateTimeFormatOptions['dateStyle'],
    timeStyle: timeStyle as Intl.DateTimeFormatOptions['timeStyle'],
  });

  return formatter.format(date);
}

/**
 * Get relative time formatting
 */
export function formatRelativeTime(
  date: Date,
  locale: SupportedLocale
): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
  });

  if (Math.abs(diffInSeconds) < 60) {
    return formatter.format(diffInSeconds, 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return formatter.format(Math.floor(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return formatter.format(Math.floor(diffInSeconds / 3600), 'hour');
  } else if (Math.abs(diffInSeconds) < 2592000) {
    return formatter.format(Math.floor(diffInSeconds / 86400), 'day');
  } else if (Math.abs(diffInSeconds) < 31536000) {
    return formatter.format(Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return formatter.format(Math.floor(diffInSeconds / 31536000), 'year');
  }
}

/**
 * Format addresses according to country standards
 */
export function formatAddress(
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  },
  country: SupportedRegion
): string {
  // Basic address formatting - can be enhanced for specific countries
  const parts: string[] = [];
  
  parts.push(address.line1);
  
  if (address.line2) {
    parts.push(address.line2);
  }
  
  parts.push(address.city);
  
  if (address.state && (country === 'US' || country === 'CA' || country === 'AU')) {
    parts.push(address.state);
  }
  
  parts.push(address.postalCode);
  parts.push(address.country);

  return parts.filter(part => part.trim()).join(', ');
}

/**
 * Format phone numbers according to country standards
 */
export function formatPhoneNumber(
  phoneNumber: string,
  country: SupportedRegion
): string {
  // Basic phone number formatting - can be enhanced with libphonenumber
  const countryFormats: Record<SupportedRegion, string> = {
    US: 'XXX-XXX-XXXX',
    CA: 'XXX-XXX-XXXX',
    GB: 'XXXX XXXXXX',
    AU: 'XXXX XXX XXX',
    DE: 'XXXX XXXXXXXX',
    FR: 'X XX XX XX XX',
    ES: 'XXX XXX XXX',
    IT: 'XXX XXX XXXX',
    BR: 'XX XXXXX-XXXX',
    JP: 'XXX-XXXX-XXXX',
    CN: 'XXX XXXX XXXX',
    KR: 'XXX-XXXX-XXXX',
    IN: 'XXXXX XXXXX',
    MX: 'XX XXXX XXXX',
    AR: 'XX-XXXX-XXXX',
  };

  const format = countryFormats[country] || 'XXXXXXXXXX';
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // Simple formatting - replace X with digits
  let formatted = '';
  let digitIndex = 0;
  
  for (const char of format) {
    if (char === 'X') {
      formatted += digits[digitIndex] || '';
      digitIndex++;
    } else {
      formatted += char;
    }
  }
  
  return formatted;
}

/**
 * Get timezone for region
 */
export function getTimezoneForRegion(region: SupportedRegion): string {
  const timezoneMap: Record<SupportedRegion, string> = {
    US: 'America/New_York',
    CA: 'America/Toronto',
    GB: 'Europe/London',
    AU: 'Australia/Sydney',
    DE: 'Europe/Berlin',
    FR: 'Europe/Paris',
    ES: 'Europe/Madrid',
    IT: 'Europe/Rome',
    BR: 'America/Sao_Paulo',
    JP: 'Asia/Tokyo',
    CN: 'Asia/Shanghai',
    KR: 'Asia/Seoul',
    IN: 'Asia/Kolkata',
    MX: 'America/Mexico_City',
    AR: 'America/Argentina/Buenos_Aires',
  };

  return timezoneMap[region] || 'UTC';
}

/**
 * Get currency for region
 */
export function getCurrencyForRegion(region: SupportedRegion): SupportedCurrency {
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
 * Get locale for region
 */
export function getLocaleForRegion(region: SupportedRegion): SupportedLocale {
  const localeMap: Record<SupportedRegion, SupportedLocale> = {
    US: 'en',
    CA: 'en',
    GB: 'en',
    AU: 'en',
    DE: 'de',
    FR: 'fr',
    ES: 'es',
    IT: 'it',
    BR: 'pt',
    JP: 'ja',
    CN: 'zh-CN',
    KR: 'ko',
    IN: 'en',
    MX: 'es',
    AR: 'es',
  };

  return localeMap[region] || 'en';
}

/**
 * Convert timezone for display
 */
export function convertTimezone(
  date: Date,
  fromTimezone: string,
  toTimezone: string
): Date {
  // Basic timezone conversion - can be enhanced with proper timezone libraries
  const fromOffset = getTimezoneOffset(date, fromTimezone);
  const toOffset = getTimezoneOffset(date, toTimezone);
  
  const offsetDiff = toOffset - fromOffset;
  return new Date(date.getTime() + offsetDiff);
}

/**
 * Get timezone offset in milliseconds
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  // This is a simplified implementation
  // In production, use libraries like moment-timezone or date-fns-tz
  const utcDate = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z');
  const targetDate = new Date(date.toISOString().split('T')[0] + 'T00:00:00');
  
  // For now, return 0 (UTC)
  // TODO: Implement proper timezone offset calculation
  return 0;
}

/**
 * Check if region requires RTL text direction
 */
export function isRTLRegion(region: SupportedRegion): boolean {
  // Currently only Arabic regions use RTL
  return region === 'AR' || false;
}

/**
 * Get address format for country
 */
export function getAddressFormat(country: SupportedRegion): AddressFormat {
  // Common address formats by country
  const formats: Record<SupportedRegion, AddressFormat> = {
    US: {
      country,
      format: {
        line1: 'Street address',
        line2: 'Apartment, suite, unit, building, floor, etc.',
        city: 'City',
        state: 'State',
        postalCode: 'ZIP Code',
        country: 'Country'
      },
      requiredFields: ['line1', 'city', 'state', 'postalCode'],
      optionalFields: ['line2']
    },
    GB: {
      country,
      format: {
        line1: 'Address line 1',
        line2: 'Address line 2',
        city: 'City/Town',
        state: 'County',
        postalCode: 'Postcode',
        country: 'Country'
      },
      requiredFields: ['line1', 'city', 'postalCode'],
      optionalFields: ['line2', 'state']
    },
    // Add more country-specific formats as needed
    default: {
      country,
      format: {
        line1: 'Address line 1',
        line2: 'Address line 2',
        city: 'City',
        state: 'State/Province',
        postalCode: 'Postal Code',
        country: 'Country'
      },
      requiredFields: ['line1', 'city', 'country'],
      optionalFields: ['line2', 'state', 'postalCode']
    }
  };

  return formats[country] || formats.default;
}

/**
 * Get phone format for country
 */
export function getPhoneFormat(country: SupportedRegion): PhoneFormat {
  const formats: Record<SupportedRegion, PhoneFormat> = {
    US: {
      country,
      format: '+1 (XXX) XXX-XXXX',
      example: '+1 (555) 123-4567',
      countryCode: '+1',
      nationalNumberLength: 10
    },
    CA: {
      country,
      format: '+1 (XXX) XXX-XXXX',
      example: '+1 (555) 123-4567',
      countryCode: '+1',
      nationalNumberLength: 10
    },
    GB: {
      country,
      format: '+44 XXXX XXXXXX',
      example: '+44 20 1234 5678',
      countryCode: '+44',
      nationalNumberLength: 10
    },
    // Add more country-specific formats as needed
    default: {
      country,
      format: '+XX XXX XXX XXXX',
      example: '+XX XXX XXX XXXX',
      countryCode: '+XX',
      nationalNumberLength: 10
    }
  };

  return formats[country] || formats.default;
}