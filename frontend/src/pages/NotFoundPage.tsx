import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main id="main-content" className="mx-auto flex min-h-[60vh] w-full max-w-7xl flex-col items-start justify-center px-5 py-20 sm:px-8">
      <p className="text-xs uppercase tracking-[0.2em] text-[#984b00]">404</p>
      <h1 className="mt-4 font-serif text-5xl">{t('notFound.title')}</h1>
      <p className="mt-4 max-w-md leading-7 text-slate-600">{t('notFound.text')}</p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#fe8500] px-7 font-semibold text-[#35180f] hover:bg-[#ff9b2e]"
      >
        {t('notFound.home')}
      </Link>
    </main>
  );
}
