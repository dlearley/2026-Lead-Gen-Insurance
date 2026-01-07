// ========================================
// GLOBAL EXPANSION TYPES
// ========================================

export type SupportedLocale = 
  | 'en'     // English
  | 'es'     // Spanish  
  | 'fr'     // French
  | 'de'     // German
  | 'it'     // Italian
  | 'pt'     // Portuguese
  | 'ar'     // Arabic (RTL)
  | 'zh-CN'  // Chinese Simplified
  | 'ja'     // Japanese
  | 'ko';    // Korean

export type SupportedRegion = 
  | 'US'     // United States
  | 'CA'     // Canada
  | 'GB'     // United Kingdom
  | 'AU'     // Australia
  | 'DE'     // Germany
  | 'FR'     // France
  | 'ES'     // Spain
  | 'IT'     // Italy
  | 'BR'     // Brazil
  | 'JP'     // Japan
  | 'CN'     // China
  | 'KR'     // South Korea
  | 'IN'     // India
  | 'MX'     // Mexico
  | 'AR'     // Argentina;

export type SupportedCurrency = 
  | 'USD'    // US Dollar
  | 'EUR'    // Euro
  | 'GBP'    // British Pound
  | 'CAD'    // Canadian Dollar
  | 'AUD'    // Australian Dollar
  | 'JPY'    // Japanese Yen
  | 'CNY'    // Chinese Yuan
  | 'KRW'    // South Korean Won
  | 'INR'    // Indian Rupee
  | 'BRL'    // Brazilian Real
  | 'MXN'    // Mexican Peso
  | 'ARS';   // Argentine Peso

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  textDirection: TextDirection;
  region: SupportedRegion[];
  isDefault: boolean;
}

export interface CurrencyMetadata {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  region: SupportedRegion[];
  decimalPlaces: number;
}

export interface TimezoneMetadata {
  timezone: string;
  displayName: string;
  region: SupportedRegion[];
  utcOffset: string;
}

// ========================================
// TRANSLATION TYPES
// ========================================

export interface TranslationValue {
  value: string;
  context?: string;
  description?: string;
}

export interface TranslationFile {
  locale: SupportedLocale;
  translations: Record<string, TranslationValue>;
  lastUpdated: Date;
}

export interface TranslationKey {
  namespace: string;
  key: string;
  description?: string;
  context?: string;
}

// ========================================
// REGIONAL CONFIGURATION TYPES
// ========================================

export interface RegionalSettings {
  region: SupportedRegion;
  locales: SupportedLocale[];
  defaultLocale: SupportedLocale;
  currencies: SupportedCurrency[];
  defaultCurrency: SupportedCurrency;
  timezones: string[];
  defaultTimezone: string;
  compliance: ComplianceSettings;
  formatting: FormattingSettings;
}

export interface ComplianceSettings {
  gdprEnabled: boolean;
  ccpaEnabled: boolean;
  dataRetentionDays: number;
  consentRequired: boolean;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

export interface FormattingSettings {
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currencyFormat: string;
  addressFormat: string;
  phoneFormat: string;
}

// ========================================
// CUSTOMER LOCALIZATION TYPES
// ========================================

export interface CustomerLocalizationPreferences {
  customerId: string;
  locale: SupportedLocale;
  region: SupportedRegion;
  currency: SupportedCurrency;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  addressFormat: string;
  phoneFormat: string;
  communicationLanguage: SupportedLocale;
  marketingConsent: boolean;
  privacyConsent: boolean;
  gdprConsent?: boolean;
  ccpaConsent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// AGENT LOCALIZATION TYPES
// ========================================

export interface AgentLanguageCapability {
  agentId: string;
  locale: SupportedLocale;
  proficiencyLevel: 'basic' | 'conversational' | 'fluent' | 'native';
  certification?: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface AgentRegionalExpertise {
  agentId: string;
  region: SupportedRegion;
  specialization: string[];
  experienceYears: number;
  localKnowledge: string[];
  culturalCompetence: string[];
  createdAt: Date;
}

// ========================================
// LEAD LOCALIZATION TYPES
// ========================================

export interface LeadRegionalData {
  leadId: string;
  region: SupportedRegion;
  locale: SupportedLocale;
  timezone: string;
  preferredLanguage?: SupportedLocale;
  currency: SupportedCurrency;
  addressCountry: SupportedRegion;
  phoneCountry: SupportedRegion;
  culturalContext?: CulturalContext;
  complianceFlags: ComplianceFlag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CulturalContext {
  communicationStyle: 'direct' | 'indirect' | 'formal' | 'informal';
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  holidays: string[];
  culturalPreferences: Record<string, unknown>;
}

export interface ComplianceFlag {
  type: 'gdpr' | 'ccpa' | 'local' | 'industry';
  region: SupportedRegion;
  status: 'pending' | 'compliant' | 'non_compliant';
  requirements: string[];
  lastChecked: Date;
}

// ========================================
// FORMATTING TYPES
// ========================================

export interface FormattingOptions {
  locale: SupportedLocale;
  currency?: SupportedCurrency;
  timezone?: string;
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
  timeStyle?: 'short' | 'medium' | 'long' | 'full';
  numberStyle?: 'decimal' | 'currency' | 'percent' | 'scientific' | 'engineering' | 'compact';
}

export interface AddressFormat {
  country: SupportedRegion;
  format: {
    line1: string; // street address
    line2?: string; // apartment, suite, etc.
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  requiredFields: string[];
  optionalFields: string[];
}

export interface PhoneFormat {
  country: SupportedRegion;
  format: string; // regex pattern or format string
  example: string;
  countryCode: string;
  nationalNumberLength: number;
}

// ========================================
// API TYPES
// ========================================

export interface LocalizationApiResponse<T = unknown> {
  success: boolean;
  data: T;
  locale: SupportedLocale;
  region: SupportedRegion;
  timestamp: Date;
}

export interface TranslationRequest {
  keys: string[];
  locale: SupportedLocale;
  namespace?: string;
}

export interface CurrencyConversionRequest {
  amount: number;
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  asOfDate?: Date;
}

export interface RegionalComplianceRequest {
  region: SupportedRegion;
  operation: string;
  dataType: string;
  purpose: string;
}

// ========================================
// EVENT TYPES
// ========================================

export type LocalizationEventType = 
  | 'locale_changed'
  | 'region_changed'
  | 'currency_changed'
  | 'timezone_changed'
  | 'compliance_updated'
  | 'translation_updated';

export interface LocalizationEvent {
  type: LocalizationEventType;
  customerId?: string;
  agentId?: string;
  leadId?: string;
  oldValue: unknown;
  newValue: unknown;
  locale: SupportedLocale;
  region: SupportedRegion;
  timestamp: Date;
}

// ========================================
// CONFIGURATION TYPES
// ========================================

export interface GlobalConfiguration {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  defaultRegion: SupportedRegion;
  supportedRegions: SupportedRegion[];
  defaultCurrency: SupportedCurrency;
  supportedCurrencies: SupportedCurrency[];
  enableCDN: boolean;
  enableRegionalRouting: boolean;
  enableComplianceChecking: boolean;
  enableTranslationFallback: boolean;
}

export interface CDNConfiguration {
  enabled: boolean;
  edgeLocations: string[];
  cacheExpiry: number;
  compressionEnabled: boolean;
  regionalRedirects: boolean;
}

export interface TranslationCacheConfiguration {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  preloadLanguages: SupportedLocale[];
  fallbackToEnglish: boolean;
}