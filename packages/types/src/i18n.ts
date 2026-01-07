// ========================================
// INTERNATIONALIZATION TYPES
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

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  textDirection: TextDirection;
  region: string[];
  isDefault: boolean;
}

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

export interface TranslationOptions {
  fallback?: boolean;
  namespace?: string;
  context?: string;
}

export interface TranslationResult {
  value: string;
  locale: SupportedLocale;
  found: boolean;
  key: string;
}

export interface TranslationRequest {
  keys: string[];
  locale: SupportedLocale;
  namespace?: string;
}