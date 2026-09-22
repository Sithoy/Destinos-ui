import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pageMeta } from '../data/travel';
import type { Page, PrestigePage } from '../types';
import { LanguageToggle } from './LanguageToggle';
import { BrandLockup } from './ui';
function PrestigeNavToggle({
  page,
  setPrestigePage,
}: {
  page: PrestigePage;
  setPrestigePage: (page: PrestigePage) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
      <button
        onClick={() => setPrestigePage('luxury')}
        className={`rounded-full px-4 py-2 text-sm transition ${page === 'luxury' ? 'bg-[#d4af37] font-medium text-[#241f1b]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
      >
        {t('nav.luxury')}
      </button>
      <button
        onClick={() => setPrestigePage('corporate')}
        className={`rounded-full px-4 py-2 text-sm transition ${page === 'corporate' ? 'bg-[#d4af37] font-medium text-[#051124]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
      >
        {t('nav.corporate')}
      </button>
    </div>
  );
}

export function Nav({
  page,
  goHome,
  openInquiry,
  setPrestigePage,
}: {
  page: Page;
  goHome: () => void;
  openInquiry: () => void;
  setPrestigePage: (page: PrestigePage) => void;
}) {
  const { t, i18n } = useTranslation();
  const isPrestige = page === 'luxury' || page === 'corporate';
  const isCrm = page === 'crm';

  if (isPrestige) {
    return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111d] text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3 focus:text-slate-950">{t('landing.skip')}</a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/" aria-label="Destinos pelo Mundo" className="min-w-0"><BrandLockup src={pageMeta[page].logo} alt={t(page === 'luxury' ? 'brand.luxuryAlt' : 'brand.corporateAlt')} compact gapClass="gap-3" logoSize="h-9 sm:h-10" logoArtScale="scale-[1.35]" taglineClassName="hidden" /></Link>
        <div className="flex items-center gap-6"><nav aria-label={t('landing.navLabel')} className="hidden items-center gap-6 text-sm md:flex"><Link to="/">{t('nav.backHome')}</Link><Link to="/prestige/luxury" aria-current={page === 'luxury' ? 'page' : undefined} className={page === 'luxury' ? 'text-[#ecd792]' : ''}>Luxury</Link><Link to="/prestige/corporate" aria-current={page === 'corporate' ? 'page' : undefined} className={page === 'corporate' ? 'text-[#ecd792]' : ''}>Corporate</Link></nav><LanguageToggle compact /></div>
      </div>
      <nav aria-label={t('landing.navLabel')} className="flex justify-center gap-8 border-t border-white/10 px-4 text-sm md:hidden"><Link to="/" className="py-3">{t('nav.backHome')}</Link><Link to="/prestige/luxury" className="py-3" aria-current={page === 'luxury' ? 'page' : undefined}>Luxury</Link><Link to="/prestige/corporate" className="py-3" aria-current={page === 'corporate' ? 'page' : undefined}>Corporate</Link></nav>
    </header>;
  }

  if (page === 'home') {
    return (
      <header className="sticky top-0 z-50 border-b border-[#eadcc8] bg-[#fffaf2] text-[#163e52]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-slate-950">{t('landing.skip')}</a>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" aria-label="Destinos pelo Mundo" className="min-w-0">
            <BrandLockup theme="dark" src={pageMeta.home.logo} alt={t('brand.classicAlt')} compact gapClass="gap-3" logoSize="h-9 sm:h-10" logoArtScale="scale-[1.45]" taglineClassName="hidden" />
          </Link>
          <nav aria-label={t('landing.navLabel')} className="hidden items-center gap-7 text-sm text-[#365766] lg:flex">
            <a href="/#services" className="py-2 hover:text-[#a65300]">{t('landing.leisure')}</a>
            <Link to="/inspiracao" className="py-2 hover:text-[#a65300]">{i18n.language.startsWith('pt') ? 'Inspiração' : 'Inspiration'}</Link>
            <Link to="/prestige/luxury" className="py-2 hover:text-[#a65300]">{t('landing.luxury')}</Link>
            <Link to="/prestige/corporate" className="py-2 hover:text-[#a65300]">{t('landing.corporate')}</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-4">
            <LanguageToggle compact light />
            <button type="button" onClick={openInquiry} className="hidden min-h-11 rounded-full bg-[#fe8500] px-5 text-sm font-semibold text-[#35180f] hover:bg-[#ff9b2e] md:inline-flex md:items-center">{t('landing.plan')}</button>
          </div>
        </div>
        <nav aria-label={t('landing.navLabel')} className="flex items-center justify-center gap-4 border-t border-[#eadcc8] px-4 text-sm text-[#365766] lg:hidden">
          <Link to="/inspiracao" className="py-3 hover:text-[#a65300]">{i18n.language.startsWith('pt') ? 'Inspiração' : 'Inspiration'}</Link>
          <Link to="/prestige/luxury" className="py-3 hover:text-[#a65300]">{t('landing.luxury')}</Link>
          <Link to="/prestige/corporate" className="py-3 hover:text-[#a65300]">{t('landing.corporate')}</Link>
        </nav>
      </header>
    );
  }

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#07111d]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 md:px-6">
        <button onClick={goHome} className="min-w-0 flex-1 text-left text-white transition hover:opacity-90 sm:flex-none">
          <BrandLockup
            src={pageMeta[page].logo}
            alt={t('brand.footerAlt')}
            compact
            gapClass={isPrestige ? 'gap-3 sm:gap-5 md:gap-8' : 'gap-3 sm:gap-5 md:gap-7'}
            logoSize={isPrestige ? 'h-9 sm:h-10 md:h-12' : 'h-9 sm:h-11 md:h-16'}
            logoArtScale={isPrestige ? 'scale-[1.35] sm:scale-[1.45]' : 'scale-[1.45] sm:scale-[1.55] md:scale-[1.65]'}
            taglineClassName="hidden md:block"
          />
        </button>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LanguageToggle compact />
          {isCrm ? (
            <button
              onClick={goHome}
              className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white md:inline-flex"
            >
              {t('nav.backHome')}
            </button>
          ) : isPrestige ? (
            <>
              <button
                onClick={goHome}
                className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white md:inline-flex"
              >
                {t('nav.backHome')}
              </button>
              <PrestigeNavToggle page={page} setPrestigePage={setPrestigePage} />
              <button
                onClick={() => setPrestigePage(page === 'luxury' ? 'corporate' : 'luxury')}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/15 sm:px-4 sm:text-sm md:hidden"
              >
                {page === 'luxury' ? t('nav.corporate') : t('nav.luxury')}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <nav aria-label="Travel services" className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-4 pb-3 text-sm text-white/85 md:px-6">
        <Link to="/">{t('nav.backHome')}</Link>
        <Link to="/prestige/luxury">{t('nav.luxury')}</Link>
        <Link to="/prestige/corporate">{t('nav.corporate')}</Link>
      </nav>
    </div>
  );
}
