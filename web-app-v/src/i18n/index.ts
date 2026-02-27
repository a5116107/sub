import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enKeys from './locales/en/keys.json';
import enUsage from './locales/en/usage.json';
import enSubs from './locales/en/subs.json';
import enBilling from './locales/en/billing.json';
import enRedeem from './locales/en/redeem.json';
import enSettings from './locales/en/settings.json';
import enAdmin from './locales/en/admin.json';
import enLanding from './locales/en/landing.json';

import zhCommon from './locales/zh-CN/common.json';
import zhAuth from './locales/zh-CN/auth.json';
import zhDashboard from './locales/zh-CN/dashboard.json';
import zhKeys from './locales/zh-CN/keys.json';
import zhUsage from './locales/zh-CN/usage.json';
import zhSubs from './locales/zh-CN/subs.json';
import zhBilling from './locales/zh-CN/billing.json';
import zhRedeem from './locales/zh-CN/redeem.json';
import zhSettings from './locales/zh-CN/settings.json';
import zhAdmin from './locales/zh-CN/admin.json';
import zhLanding from './locales/zh-CN/landing.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        keys: enKeys,
        usage: enUsage,
        subs: enSubs,
        billing: enBilling,
        redeem: enRedeem,
        settings: enSettings,
        admin: enAdmin,
        landing: enLanding,
      },
      'zh-CN': {
        common: zhCommon,
        auth: zhAuth,
        dashboard: zhDashboard,
        keys: zhKeys,
        usage: zhUsage,
        subs: zhSubs,
        billing: zhBilling,
        redeem: zhRedeem,
        settings: zhSettings,
        admin: zhAdmin,
        landing: zhLanding,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18n-lang',
    },
  });

export default i18n;
