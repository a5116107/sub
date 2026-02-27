import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language?.startsWith('zh') ? 'en' : 'zh-CN';
    i18n.changeLanguage(newLang);
  };

  const isZh = i18n.language?.startsWith('zh');

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color-subtle)] transition-colors"
      title={isZh ? 'Switch to English' : '切换到中文'}
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{isZh ? 'EN' : '中文'}</span>
    </button>
  );
};

export default LanguageSwitcher;
