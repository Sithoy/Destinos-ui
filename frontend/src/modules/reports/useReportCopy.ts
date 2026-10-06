import { useTranslation } from 'react-i18next';

export function useReportCopy() {
  const { i18n } = useTranslation();
  return (en: string, pt: string) => i18n.resolvedLanguage === 'pt' ? pt : en;
}
