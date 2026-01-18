// @ts-check
// `@type` import to ensure auto-type suggestions are available for docsConfig
const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Insurance Lead Generation Platform Documentation',
  tagline: 'AI-powered lead generation, qualification, and routing',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.insurance-leads-platform.com',
  // Set the /<baseUrl>/ to <url> by default
  baseUrl: '/',

  // GitHub pages deployment config
  organizationName: 'insurance-leads-platform',
  projectName: 'docs',
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr'],
    localeConfigs: {
      en: {
        label: 'English',
        htmlLang: 'en-US',
      },
      es: {
        label: 'Español',
        htmlLang: 'es-ES',
      },
      fr: {
        label: 'Français',
        htmlLang: 'fr-FR',
      },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: '.',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/insurance-leads-platform/docs/tree/main/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl: 'https://github.com/insurance-leads-platform/docs/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Insurance Lead Platform',
        logo: {
          alt: 'Insurance Lead Platform Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'userSidebar',
            position: 'left',
            label: 'User Guide',
          },
          {
            type: 'docSidebar',
            sidebarId: 'adminSidebar',
            position: 'left',
            label: 'Admin Guide',
          },
          {
            type: 'docSidebar',
            sidebarId: 'apiSidebar',
            position: 'left',
            label: 'API Reference',
          },
          {
            type: 'docSidebar',
            sidebarId: 'integrationSidebar',
            position: 'left',
            label: 'Integrations',
          },
          {
            type: 'docSidebar',
            sidebarId: 'complianceSidebar',
            position: 'left',
            label: 'Compliance',
          },
          {
            to: '/blog',
            label: 'Blog',
            position: 'left',
          },
          {
            type: 'docsVersionDropdown',
            position: 'right',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/insurance-leads-platform',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://insurance-leads-platform.com',
            label: 'Platform',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/user/quickstart',
              },
              {
                label: 'User Guide',
                to: '/docs/user/features',
              },
              {
                label: 'Admin Guide',
                to: '/docs/admin/system-config',
              },
              {
                label: 'API Reference',
                to: '/docs/api/overview',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Community Forum',
                href: 'https://community.insurance-leads-platform.com',
              },
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/insurance-leads-platform',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/insurance-leads-platform',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/insuranceleadsai',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/insurance-leads-platform',
              },
              {
                label: 'Support',
                href: 'https://insurance-leads-platform.com/support',
              },
              {
                label: 'Status',
                href: 'https://status.insurance-leads-platform.com',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Insurance Lead Generation AI Platform. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'python', 'javascript', 'typescript', 'php', 'json', 'yaml'],
      },
      algolia: {
        // The application ID provided by Algolia
        appId: 'YOUR_APP_ID',

        // Public API key: it is safe to commit it
        apiKey: 'YOUR_SEARCH_API_KEY',

        indexName: 'insurance-leads-platform',

        // Optional: see doc section below
        contextualSearch: true,

        // Optional: see doc section below
        // externalUrlRegexp: 'https://(?:docusaurus\\.io|your\\.site\\.com)/',

        // Optional: Algolia search parameters
        searchParameters: {},

        // Optional: path for search page that will be rendered (e.g., '/search')
        // path: 'search',

        // Optional: Algolia search input placeholder
        searchPagePath: 'search',
      },
      analytics: {
        // The analytics ID from your Analytics service
        googleAnalytics: {
          trackingID: 'G-XXXXXXXXXX',
          anonymizeIP: true,
        },
      },
    }),
};

module.exports = config;
