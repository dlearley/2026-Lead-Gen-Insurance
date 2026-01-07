import { SupportedLocale, SupportedRegion, SupportedCurrency, GlobalConfiguration } from '@insurance-lead-gen/types';

/**
 * Default global configuration
 */
export const DEFAULT_GLOBAL_CONFIG: GlobalConfiguration = {
  defaultLocale: 'en',
  supportedLocales: [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'zh-CN', 'ja', 'ko'
  ],
  defaultRegion: 'US',
  supportedRegions: [
    'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'BR', 'JP', 'CN', 'KR', 'IN', 'MX', 'AR'
  ],
  defaultCurrency: 'USD',
  supportedCurrencies: [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'KRW', 'INR', 'BRL', 'MXN', 'ARS'
  ],
  enableCDN: true,
  enableRegionalRouting: true,
  enableComplianceChecking: true,
  enableTranslationFallback: true,
};

/**
 * Locale metadata configuration
 */
export const LOCALE_METADATA = {
  en: {
    code: 'en' as SupportedLocale,
    name: 'English',
    nativeName: 'English',
    textDirection: 'ltr' as const,
    region: ['US', 'CA', 'GB', 'AU', 'IN'] as SupportedRegion[],
    isDefault: true,
  },
  es: {
    code: 'es' as SupportedLocale,
    name: 'Spanish',
    nativeName: 'Español',
    textDirection: 'ltr' as const,
    region: ['ES', 'MX', 'AR'] as SupportedRegion[],
    isDefault: false,
  },
  fr: {
    code: 'fr' as SupportedLocale,
    name: 'French',
    nativeName: 'Français',
    textDirection: 'ltr' as const,
    region: ['FR'] as SupportedRegion[],
    isDefault: false,
  },
  de: {
    code: 'de' as SupportedLocale,
    name: 'German',
    nativeName: 'Deutsch',
    textDirection: 'ltr' as const,
    region: ['DE'] as SupportedRegion[],
    isDefault: false,
  },
  it: {
    code: 'it' as SupportedLocale,
    name: 'Italian',
    nativeName: 'Italiano',
    textDirection: 'ltr' as const,
    region: ['IT'] as SupportedRegion[],
    isDefault: false,
  },
  pt: {
    code: 'pt' as SupportedLocale,
    name: 'Portuguese',
    nativeName: 'Português',
    textDirection: 'ltr' as const,
    region: ['BR'] as SupportedRegion[],
    isDefault: false,
  },
  ar: {
    code: 'ar' as SupportedLocale,
    name: 'Arabic',
    nativeName: 'العربية',
    textDirection: 'rtl' as const,
    region: ['IN'] as SupportedRegion[],
    isDefault: false,
  },
  'zh-CN': {
    code: 'zh-CN' as SupportedLocale,
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    textDirection: 'ltr' as const,
    region: ['CN'] as SupportedRegion[],
    isDefault: false,
  },
  ja: {
    code: 'ja' as SupportedLocale,
    name: 'Japanese',
    nativeName: '日本語',
    textDirection: 'ltr' as const,
    region: ['JP'] as SupportedRegion[],
    isDefault: false,
  },
  ko: {
    code: 'ko' as SupportedLocale,
    name: 'Korean',
    nativeName: '한국어',
    textDirection: 'ltr' as const,
    region: ['KR'] as SupportedRegion[],
    isDefault: false,
  },
};

/**
 * Currency metadata configuration
 */
export const CURRENCY_METADATA = {
  USD: {
    code: 'USD' as SupportedCurrency,
    name: 'US Dollar',
    symbol: '$',
    region: ['US', 'CA'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR' as SupportedCurrency,
    name: 'Euro',
    symbol: '€',
    region: ['DE', 'FR', 'ES', 'IT'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP' as SupportedCurrency,
    name: 'British Pound',
    symbol: '£',
    region: ['GB'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  CAD: {
    code: 'CAD' as SupportedCurrency,
    name: 'Canadian Dollar',
    symbol: 'C$',
    region: ['CA'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  AUD: {
    code: 'AUD' as SupportedCurrency,
    name: 'Australian Dollar',
    symbol: 'A$',
    region: ['AU'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  JPY: {
    code: 'JPY' as SupportedCurrency,
    name: 'Japanese Yen',
    symbol: '¥',
    region: ['JP'] as SupportedRegion[],
    decimalPlaces: 0,
  },
  CNY: {
    code: 'CNY' as SupportedCurrency,
    name: 'Chinese Yuan',
    symbol: '¥',
    region: ['CN'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  KRW: {
    code: 'KRW' as SupportedCurrency,
    name: 'South Korean Won',
    symbol: '₩',
    region: ['KR'] as SupportedRegion[],
    decimalPlaces: 0,
  },
  INR: {
    code: 'INR' as SupportedCurrency,
    name: 'Indian Rupee',
    symbol: '₹',
    region: ['IN'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  BRL: {
    code: 'BRL' as SupportedCurrency,
    name: 'Brazilian Real',
    symbol: 'R$',
    region: ['BR'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  MXN: {
    code: 'MXN' as SupportedCurrency,
    name: 'Mexican Peso',
    symbol: '$',
    region: ['MX'] as SupportedRegion[],
    decimalPlaces: 2,
  },
  ARS: {
    code: 'ARS' as SupportedCurrency,
    name: 'Argentine Peso',
    symbol: '$',
    region: ['AR'] as SupportedRegion[],
    decimalPlaces: 2,
  },
};

/**
 * Regional mapping configuration
 */
export const REGIONAL_MAPPING = {
  // North America
  US: {
    defaultLocale: 'en',
    defaultCurrency: 'USD',
    defaultTimezone: 'America/New_York',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: true,
      dataRetentionDays: 2555, // 7 years
      consentRequired: true,
      privacyPolicyUrl: '/privacy-us',
      termsOfServiceUrl: '/terms-us',
    },
  },
  CA: {
    defaultLocale: 'en',
    defaultCurrency: 'CAD',
    defaultTimezone: 'America/Toronto',
    compliance: {
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-ca',
      termsOfServiceUrl: '/terms-ca',
    },
  },
  MX: {
    defaultLocale: 'es',
    defaultCurrency: 'MXN',
    defaultTimezone: 'America/Mexico_City',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825, // 5 years
      consentRequired: true,
      privacyPolicyUrl: '/privacy-mx',
      termsOfServiceUrl: '/terms-mx',
    },
  },
  
  // Europe
  GB: {
    defaultLocale: 'en',
    defaultCurrency: 'GBP',
    defaultTimezone: 'Europe/London',
    compliance: {
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-gb',
      termsOfServiceUrl: '/terms-gb',
    },
  },
  DE: {
    defaultLocale: 'de',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Berlin',
    compliance: {
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-de',
      termsOfServiceUrl: '/terms-de',
    },
  },
  FR: {
    defaultLocale: 'fr',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Paris',
    compliance: {
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-fr',
      termsOfServiceUrl: '/terms-fr',
    },
  },
  ES: {
    defaultLocale: 'es',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Madrid',
    compliance: {
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-es',
      termsOfServiceUrl: '/terms-es',
    },
  },
  IT: {
    defaultLocale: 'it',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Rome',
    compliance: {
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-it',
      termsOfServiceUrl: '/terms-it',
    },
  },
  
  // Asia-Pacific
  JP: {
    defaultLocale: 'ja',
    defaultCurrency: 'JPY',
    defaultTimezone: 'Asia/Tokyo',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-jp',
      termsOfServiceUrl: '/terms-jp',
    },
  },
  CN: {
    defaultLocale: 'zh-CN',
    defaultCurrency: 'CNY',
    defaultTimezone: 'Asia/Shanghai',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-cn',
      termsOfServiceUrl: '/terms-cn',
    },
  },
  KR: {
    defaultLocale: 'ko',
    defaultCurrency: 'KRW',
    defaultTimezone: 'Asia/Seoul',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-kr',
      termsOfServiceUrl: '/terms-kr',
    },
  },
  IN: {
    defaultLocale: 'en',
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-in',
      termsOfServiceUrl: '/terms-in',
    },
  },
  AU: {
    defaultLocale: 'en',
    defaultCurrency: 'AUD',
    defaultTimezone: 'Australia/Sydney',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-au',
      termsOfServiceUrl: '/terms-au',
    },
  },
  
  // South America
  BR: {
    defaultLocale: 'pt',
    defaultCurrency: 'BRL',
    defaultTimezone: 'America/Sao_Paulo',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-br',
      termsOfServiceUrl: '/terms-br',
    },
  },
  AR: {
    defaultLocale: 'es',
    defaultCurrency: 'ARS',
    defaultTimezone: 'America/Argentina/Buenos_Aires',
    compliance: {
      gdprEnabled: false,
      ccpaEnabled: false,
      dataRetentionDays: 1825,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-ar',
      termsOfServiceUrl: '/terms-ar',
    },
  },
};