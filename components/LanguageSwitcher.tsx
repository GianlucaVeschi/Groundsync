import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentFlag = i18n.language === 'en' ? '🇬🇧' : '🇩🇪';
  const currentLangCode = i18n.language === 'en' ? 'EN' : 'DE';
  const tooltip = i18n.language === 'en' ? 'Switch to German' : 'Zu Englisch wechseln';

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="text-lg">{currentFlag}</span>
      <span>{currentLangCode}</span>
    </button>
  );
};

export default LanguageSwitcher;
