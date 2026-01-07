import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration script for Phase 28: Global Expansion & Multi-Language
 * This script seeds the database with initial data for languages, currencies, regions, and translations
 */
async function main() {
  console.log('Starting Phase 28: Global Expansion & Multi-Language migration...');

  // Create languages
  console.log('Creating languages...');
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', textDirection: 'LTR', isDefault: true },
    { code: 'es', name: 'Spanish', nativeName: 'Español', textDirection: 'LTR' },
    { code: 'fr', name: 'French', nativeName: 'Français', textDirection: 'LTR' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', textDirection: 'LTR' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', textDirection: 'LTR' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', textDirection: 'LTR' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', textDirection: 'RTL' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', textDirection: 'LTR' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', textDirection: 'LTR' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', textDirection: 'LTR' },
  ];

  for (const language of languages) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: language,
      create: language,
    });
  }

  // Create currencies
  console.log('Creating currencies...');
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, isDefault: true },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2 },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimalPlaces: 0 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2 },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalPlaces: 2 },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: currency,
    });
  }

  // Create regional settings
  console.log('Creating regional settings...');
  const regions = [
    {
      regionCode: 'US',
      name: 'United States',
      defaultLocale: 'en',
      defaultCurrency: 'USD',
      defaultTimezone: 'America/New_York',
      gdprEnabled: false,
      ccpaEnabled: true,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-us',
      termsOfServiceUrl: '/terms-us',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12-hour',
      numberFormat: '1,234.56',
      currencyFormat: '$1,234.56',
      addressFormat: 'street, city, state zip',
      phoneFormat: '+1 (XXX) XXX-XXXX',
    },
    {
      regionCode: 'CA',
      name: 'Canada',
      defaultLocale: 'en',
      defaultCurrency: 'CAD',
      defaultTimezone: 'America/Toronto',
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-ca',
      termsOfServiceUrl: '/terms-ca',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12-hour',
      numberFormat: '1,234.56',
      currencyFormat: 'C$1,234.56',
      addressFormat: 'street, city, province postal_code',
      phoneFormat: '+1 (XXX) XXX-XXXX',
    },
    {
      regionCode: 'GB',
      name: 'United Kingdom',
      defaultLocale: 'en',
      defaultCurrency: 'GBP',
      defaultTimezone: 'Europe/London',
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-gb',
      termsOfServiceUrl: '/terms-gb',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24-hour',
      numberFormat: '1,234.56',
      currencyFormat: '£1,234.56',
      addressFormat: 'street, city, postcode',
      phoneFormat: '+44 XXXX XXXXXX',
    },
    {
      regionCode: 'DE',
      name: 'Germany',
      defaultLocale: 'de',
      defaultCurrency: 'EUR',
      defaultTimezone: 'Europe/Berlin',
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-de',
      termsOfServiceUrl: '/terms-de',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24-hour',
      numberFormat: '1.234,56',
      currencyFormat: '1.234,56 €',
      addressFormat: 'street, city postal_code',
      phoneFormat: '+49 XXX XXX XXXX',
    },
    {
      regionCode: 'FR',
      name: 'France',
      defaultLocale: 'fr',
      defaultCurrency: 'EUR',
      defaultTimezone: 'Europe/Paris',
      gdprEnabled: true,
      ccpaEnabled: false,
      dataRetentionDays: 2555,
      consentRequired: true,
      privacyPolicyUrl: '/privacy-fr',
      termsOfServiceUrl: '/terms-fr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24-hour',
      numberFormat: '1 234,56',
      currencyFormat: '1 234,56 €',
      addressFormat: 'street, postal_code city',
      phoneFormat: '+33 X XX XX XX XX',
    },
  ];

  for (const region of regions) {
    await prisma.regionalSettings.upsert({
      where: { regionCode: region.regionCode },
      update: region,
      create: region,
    });
  }

  // Create basic translations for English (default)
  console.log('Creating basic translations...');
  const englishTranslations = [
    { key: 'common.save', namespace: 'common', value: 'Save', context: 'Button text', description: 'Save button text' },
    { key: 'common.cancel', namespace: 'common', value: 'Cancel', context: 'Button text', description: 'Cancel button text' },
    { key: 'common.delete', namespace: 'common', value: 'Delete', context: 'Button text', description: 'Delete button text' },
    { key: 'common.edit', namespace: 'common', value: 'Edit', context: 'Button text', description: 'Edit button text' },
    { key: 'common.submit', namespace: 'common', value: 'Submit', context: 'Button text', description: 'Submit button text' },
    { key: 'common.loading', namespace: 'common', value: 'Loading...', context: 'Status text', description: 'Loading indicator' },
    { key: 'common.error', namespace: 'common', value: 'Error', context: 'Message type', description: 'Error message' },
    { key: 'common.success', namespace: 'common', value: 'Success', context: 'Message type', description: 'Success message' },
    
    { key: 'nav.dashboard', namespace: 'nav', value: 'Dashboard', context: 'Navigation', description: 'Navigation dashboard' },
    { key: 'nav.leads', namespace: 'nav', value: 'Leads', context: 'Navigation', description: 'Navigation leads' },
    { key: 'nav.agents', namespace: 'nav', value: 'Agents', context: 'Navigation', description: 'Navigation agents' },
    { key: 'nav.settings', namespace: 'nav', value: 'Settings', context: 'Navigation', description: 'Navigation settings' },
    
    { key: 'lead.title', namespace: 'lead', value: 'Lead Management', context: 'Page title', description: 'Lead page title' },
    { key: 'lead.create', namespace: 'lead', value: 'Create Lead', context: 'Button', description: 'Create lead button' },
    { key: 'lead.edit', namespace: 'lead', value: 'Edit Lead', context: 'Button', description: 'Edit lead button' },
    { key: 'lead.delete', namespace: 'lead', value: 'Delete Lead', context: 'Button', description: 'Delete lead button' },
    { key: 'lead.status', namespace: 'lead', value: 'Status', context: 'Field', description: 'Lead status' },
    { key: 'lead.quality', namespace: 'lead', value: 'Quality Score', context: 'Field', description: 'Lead quality score' },
    
    { key: 'insurance.auto', namespace: 'insurance', value: 'Auto Insurance', context: 'Insurance type', description: 'Auto insurance type' },
    { key: 'insurance.home', namespace: 'insurance', value: 'Home Insurance', context: 'Insurance type', description: 'Home insurance type' },
    { key: 'insurance.life', namespace: 'insurance', value: 'Life Insurance', context: 'Insurance type', description: 'Life insurance type' },
    { key: 'insurance.health', namespace: 'insurance', value: 'Health Insurance', context: 'Insurance type', description: 'Health insurance type' },
    { key: 'insurance.commercial', namespace: 'insurance', value: 'Commercial Insurance', context: 'Insurance type', description: 'Commercial insurance type' },
    
    { key: 'form.firstName', namespace: 'form', value: 'First Name', context: 'Field label', description: 'First name field' },
    { key: 'form.lastName', namespace: 'form', value: 'Last Name', context: 'Field label', description: 'Last name field' },
    { key: 'form.email', namespace: 'form', value: 'Email', context: 'Field label', description: 'Email field' },
    { key: 'form.phone', namespace: 'form', value: 'Phone', context: 'Field label', description: 'Phone field' },
    { key: 'form.address', namespace: 'form', value: 'Address', context: 'Field label', description: 'Address field' },
    { key: 'form.city', namespace: 'form', value: 'City', context: 'Field label', description: 'City field' },
    { key: 'form.state', namespace: 'form', value: 'State', context: 'Field label', description: 'State field' },
    { key: 'form.zipCode', namespace: 'form', value: 'ZIP Code', context: 'Field label', description: 'ZIP code field' },
    { key: 'form.country', namespace: 'form', value: 'Country', context: 'Field label', description: 'Country field' },
  ];

  for (const translation of englishTranslations) {
    await prisma.translation.upsert({
      where: {
        key_locale: {
          key: translation.key,
          locale: 'en'
        }
      },
      update: translation,
      create: {
        ...translation,
        locale: 'en'
      },
    });
  }

  // Create Spanish translations
  console.log('Creating Spanish translations...');
  const spanishTranslations = [
    { key: 'common.save', namespace: 'common', value: 'Guardar', description: 'Save button text' },
    { key: 'common.cancel', namespace: 'common', value: 'Cancelar', description: 'Cancel button text' },
    { key: 'common.delete', namespace: 'common', value: 'Eliminar', description: 'Delete button text' },
    { key: 'nav.dashboard', namespace: 'nav', value: 'Panel de Control', description: 'Navigation dashboard' },
    { key: 'nav.leads', namespace: 'nav', value: 'Prospectos', description: 'Navigation leads' },
    { key: 'lead.title', namespace: 'lead', value: 'Gestión de Prospectos', description: 'Lead page title' },
    { key: 'form.firstName', namespace: 'form', value: 'Nombre', description: 'First name field' },
    { key: 'form.lastName', namespace: 'form', value: 'Apellido', description: 'Last name field' },
    { key: 'form.email', namespace: 'form', value: 'Correo electrónico', description: 'Email field' },
    { key: 'form.phone', namespace: 'form', value: 'Teléfono', description: 'Phone field' },
  ];

  for (const translation of spanishTranslations) {
    await prisma.translation.upsert({
      where: {
        key_locale: {
          key: translation.key,
          locale: 'es'
        }
      },
      update: translation,
      create: {
        ...translation,
        locale: 'es'
      },
    });
  }

  console.log('✅ Phase 28: Global Expansion & Multi-Language migration completed successfully!');
  console.log(`
    Summary:
    - Created ${languages.length} languages
    - Created ${currencies.length} currencies
    - Created ${regions.length} regional settings
    - Created ${englishTranslations.length} English translations
    - Created ${spanishTranslations.length} Spanish translations
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Migration failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });