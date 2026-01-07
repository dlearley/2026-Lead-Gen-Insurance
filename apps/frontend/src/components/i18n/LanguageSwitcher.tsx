import React, { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useLocalization, useTranslation } from './LocalizationProvider';
import { SupportedLocale } from '@insurance-lead-gen/types';

interface LanguageSwitcherProps {
  className?: string;
  showFlag?: boolean;
  compact?: boolean;
  onLocaleChange?: (locale: SupportedLocale) => void;
}

export function LanguageSwitcher({
  className = '',
  showFlag = true,
  compact = false,
  onLocaleChange
}: LanguageSwitcherProps) {
  const { locale, supportedLocales, localeMetadata, setLocale, isLoading } = useLocalization();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocale = localeMetadata[locale];

  const handleLocaleChange = async (newLocale: SupportedLocale) => {
    try {
      await setLocale(newLocale);
      onLocaleChange?.(newLocale);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change locale:', error);
    }
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {showFlag && currentLocale && (
            <span className="text-lg">{getFlagEmoji(locale)}</span>
          )}
          <span className="font-medium">{currentLocale?.nativeName || locale}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="py-1">
              {supportedLocales.map((loc) => {
                const metadata = localeMetadata[loc];
                return (
                  <button
                    key={loc}
                    onClick={() => handleLocaleChange(loc)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3 ${
                      loc === locale ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {showFlag && metadata && (
                      <span className="text-lg">{getFlagEmoji(loc)}</span>
                    )}
                    <div>
                      <div className="font-medium">{metadata?.nativeName || loc}</div>
                      <div className="text-xs text-gray-500">{metadata?.name}</div>
                    </div>
                    {loc === locale && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-w-[200px] justify-between"
      >
        <div className="flex items-center space-x-3">
          <Globe className="w-5 h-5" />
          {showFlag && currentLocale && (
            <span className="text-xl">{getFlagEmoji(locale)}</span>
          )}
          <div className="text-left">
            <div className="font-medium">{currentLocale?.nativeName || locale}</div>
            <div className="text-xs text-gray-500">{currentLocale?.name}</div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('language.select', 'Select Language')}
              </div>
              <div className="border-t border-gray-100">
                {supportedLocales.map((loc) => {
                  const metadata = localeMetadata[loc];
                  return (
                    <button
                      key={loc}
                      onClick={() => handleLocaleChange(loc)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3 ${
                        loc === locale ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {showFlag && metadata && (
                        <span className="text-xl">{getFlagEmoji(loc)}</span>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{metadata?.nativeName || loc}</div>
                        <div className="text-sm text-gray-500">{metadata?.name}</div>
                        {metadata?.textDirection === 'rtl' && (
                          <div className="text-xs text-orange-600 mt-1">
                            {t('language.rtl', 'Right-to-left')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {loc === locale && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Get flag emoji for locale
 */
function getFlagEmoji(locale: SupportedLocale): string {
  const flagMap: Record<string, string> = {
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇵🇹',
    ar: '🇸🇦',
    'zh-CN': '🇨🇳',
    ja: '🇯🇵',
    ko: '🇰🇷'
  };
  
  return flagMap[locale] || '🌍';
}