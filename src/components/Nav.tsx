import { Crown, LayoutDashboard } from 'lucide-react';
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
  openPrestige,
  setPrestigePage,
  openCrm,
  canOpenCrm = false,
}: {
  page: Page;
  goHome: () => void;
  openPrestige: () => void;
  setPrestigePage: (page: PrestigePage) => void;
  openCrm: () => void;
  canOpenCrm?: boolean;
}) {
  const { t } = useTranslation();
  const isPrestige = page === 'luxury' || page === 'corporate';
  const isCrm = page === 'crm';

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
          {canOpenCrm ? (
            <button
              onClick={openCrm}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white transition hover:bg-white/12 sm:px-4 sm:text-sm"
              aria-label="Open CRM"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">CRM</span>
            </button>
          ) : null}
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
          ) : (
            <button
              onClick={openPrestige}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d4af37] px-3 py-2 text-sm font-medium text-[#241f1b] transition hover:bg-[#e0bc4e] sm:px-5"
              aria-label={t('nav.enterPrestige')}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.enterPrestige')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
