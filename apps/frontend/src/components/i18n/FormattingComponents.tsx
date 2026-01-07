import React from 'react';
import { useLocalization, useTranslation } from './LocalizationProvider';
import { SupportedCurrency, SupportedLocale } from '@insurance-lead-gen/types';

interface CurrencyFormatterProps {
  amount: number;
  currency?: SupportedCurrency;
  locale?: SupportedLocale;
  showSymbol?: boolean;
  showDecimals?: boolean;
  className?: string;
  style?: 'standard' | 'accounting' | 'currency';
}

export function CurrencyFormatter({
  amount,
  currency,
  locale,
  showSymbol = true,
  showDecimals = true,
  className = '',
  style = 'standard'
}: CurrencyFormatterProps) {
  const { currency: contextCurrency, locale: contextLocale, formatCurrency } = useLocalization();
  const { translate } = useTranslation();
  
  const targetCurrency = currency || contextCurrency;
  const targetLocale = locale || contextLocale;
  
  const formattedAmount = formatCurrency(amount, targetCurrency);
  
  // If custom styling is needed
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: targetCurrency,
    currencyDisplay: showSymbol ? 'symbol' : 'code',
    minimumFractionDigits: showDecimals ? undefined : 0,
    maximumFractionDigits: showDecimals ? undefined : 0,
  };
  
  try {
    const formatter = new Intl.NumberFormat(targetLocale, formatOptions);
    const formatted = formatter.format(amount);
    
    return (
      <span className={className} dir="ltr">
        {formatted}
      </span>
    );
  } catch (error) {
    // Fallback to simple formatting
    return (
      <span className={className} dir="ltr">
        {targetCurrency} {amount.toFixed(showDecimals ? 2 : 0)}
      </span>
    );
  }
}

interface DateFormatterProps {
  date: Date;
  locale?: SupportedLocale;
  options?: Intl.DateTimeFormatOptions;
  format?: 'short' | 'medium' | 'long' | 'full';
  relative?: boolean;
  className?: string;
}

export function DateFormatter({
  date,
  locale,
  options,
  format = 'medium',
  relative = false,
  className = ''
}: DateFormatterProps) {
  const { locale: contextLocale, formatDate } = useLocalization();
  
  const targetLocale = locale || contextLocale;
  
  if (relative) {
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    let relativeText = '';
    
    if (Math.abs(diffInDays) < 1) {
      const diffInHours = Math.floor(Math.abs(diffInMs) / (1000 * 60 * 60));
      if (diffInHours < 1) {
        relativeText = diffInMs > 0 ? 'in a few moments' : 'a few moments ago';
      } else {
        relativeText = diffInMs > 0 ? `in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}` : `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      }
    } else if (Math.abs(diffInDays) < 7) {
      relativeText = diffInDays > 0 ? `in ${diffInDays} day${diffInDays > 1 ? 's' : ''}` : `${Math.abs(diffInDays)} day${Math.abs(diffInDays) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffInDays) < 30) {
      const weeks = Math.floor(Math.abs(diffInDays) / 7);
      relativeText = diffInDays > 0 ? `in ${weeks} week${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(Math.abs(diffInDays) / 30);
      relativeText = diffInDays > 0 ? `in ${months} month${months > 1 ? 's' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`;
    }
    
    return (
      <time 
        className={className}
        dateTime={date.toISOString()}
        title={date.toLocaleDateString(targetLocale)}
      >
        {relativeText}
      </time>
    );
  }
  
  const formattedDate = formatDate(date);
  
  return (
    <time 
      className={className}
      dateTime={date.toISOString()}
      title={date.toLocaleString(targetLocale)}
    >
      {formattedDate}
    </time>
  );
}

interface NumberFormatterProps {
  number: number;
  locale?: SupportedLocale;
  style?: 'decimal' | 'currency' | 'percent' | 'scientific' | 'engineering' | 'compact';
  currency?: SupportedCurrency;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  className?: string;
}

export function NumberFormatter({
  number,
  locale,
  style = 'decimal',
  currency,
  minimumFractionDigits,
  maximumFractionDigits,
  className = ''
}: NumberFormatterProps) {
  const { locale: contextLocale, currency: contextCurrency, formatNumber } = useLocalization();
  
  const targetLocale = locale || contextLocale;
  const targetCurrency = currency || contextCurrency;
  
  const options: Intl.NumberFormatOptions = {
    style,
    minimumFractionDigits,
    maximumFractionDigits,
  };
  
  if (style === 'currency' && targetCurrency) {
    options.currency = targetCurrency;
    options.currencyDisplay = 'symbol';
  }
  
  try {
    const formatter = new Intl.NumberFormat(targetLocale, options);
    const formatted = formatter.format(number);
    
    return (
      <span className={className} dir="ltr">
        {formatted}
      </span>
    );
  } catch (error) {
    // Fallback to simple formatting
    return (
      <span className={className} dir="ltr">
        {number.toLocaleString(targetLocale)}
      </span>
    );
  }
}

interface AddressFormatterProps {
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  country?: string;
  format?: 'full' | 'compact';
  className?: string;
}

export function AddressFormatter({
  address,
  country,
  format = 'full',
  className = ''
}: AddressFormatterProps) {
  const { formatAddress } = useLocalization();
  
  const fullAddress = formatAddress(address);
  
  if (format === 'compact') {
    const parts = fullAddress.split(', ');
    if (parts.length >= 2) {
      // Show city, state/country only
      return (
        <span className={className}>
          {parts.slice(-2).join(', ')}
        </span>
      );
    }
  }
  
  return (
    <address className={className}>
      {fullAddress}
    </address>
  );
}

interface PhoneFormatterProps {
  phoneNumber: string;
  country?: string;
  format?: 'international' | 'national' | 'local';
  className?: string;
}

export function PhoneFormatter({
  phoneNumber,
  country = 'US',
  format = 'international',
  className = ''
}: PhoneFormatterProps) {
  const { formatPhoneNumber } = useLocalization();
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  // Add tel: link for accessibility
  const telLink = `tel:${phoneNumber.replace(/\D/g, '')}`;
  
  return (
    <a 
      href={telLink}
      className={className}
      dir="ltr"
    >
      {formattedPhone}
    </a>
  );
}

interface RegionalComplianceProps {
  region: string;
  className?: string;
  showBadges?: boolean;
  compact?: boolean;
}

export function RegionalCompliance({
  region,
  className = '',
  showBadges = true,
  compact = false
}: RegionalComplianceProps) {
  const { regionMetadata } = useLocalization();
  const { translate } = useTranslation();
  
  const regionData = regionMetadata[region];
  if (!regionData) return null;
  
  const compliance = regionData.compliance;
  const badges = [];
  
  if (compliance?.gdprEnabled) {
    badges.push({ 
      label: 'GDPR', 
      color: 'bg-blue-100 text-blue-800',
      description: 'EU General Data Protection Regulation'
    });
  }
  
  if (compliance?.ccpaEnabled) {
    badges.push({ 
      label: 'CCPA', 
      color: 'bg-green-100 text-green-800',
      description: 'California Consumer Privacy Act'
    });
  }
  
  if (!compact && compliance?.consentRequired) {
    badges.push({ 
      label: 'Consent Required', 
      color: 'bg-yellow-100 text-yellow-800',
      description: 'User consent required for data processing'
    });
  }
  
  if (badges.length === 0) return null;
  
  return (
    <div className={`${className}`}>
      {showBadges && (
        <div className="flex flex-wrap gap-1">
          {badges.map((badge, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
              title={badge.description}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface BusinessHoursProps {
  region: string;
  className?: string;
  showTimezone?: boolean;
  format?: '12h' | '24h';
}

export function BusinessHours({
  region,
  className = '',
  showTimezone = true,
  format = '12h'
}: BusinessHoursProps) {
  const { regionMetadata } = useLocalization();
  const { translate } = useTranslation();
  
  const regionData = regionMetadata[region];
  if (!regionData) return null;
  
  const businessHours = regionData.formatting?.businessHours;
  if (!businessHours) return null;
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    
    if (format === '24h') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
  };
  
  return (
    <div className={className}>
      <span className="font-medium">
        {formatTime(businessHours.start)} - {formatTime(businessHours.end)}
      </span>
      {showTimezone && (
        <span className="text-gray-500 ml-2">
          ({businessHours.timezone})
        </span>
      )}
    </div>
  );
}