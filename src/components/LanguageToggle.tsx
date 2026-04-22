import { useTranslation } from 'react-i18next';
import { supportedLanguages, type SupportedLanguage } from '../i18n';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage === 'pt' ? 'pt' : 'en';

  function changeLanguage(language: SupportedLanguage) {
    void i18n.changeLanguage(language);
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/5 p-1 ${compact ? 'gap-0.5' : 'gap-1'}`}
      aria-label={t('language.label')}
    >
      {supportedLanguages.map((language) => {
        const isActive = currentLanguage === language;
        const label = language === 'pt' ? t('language.portuguese') : t('language.english');

        return (
          <button
            key={language}
            type="button"
            onClick={() => changeLanguage(language)}
            className={`rounded-full py-1.5 text-xs font-semibold transition ${compact ? 'px-2 sm:px-3' : 'px-3'} ${
              isActive ? 'bg-white text-slate-950' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
