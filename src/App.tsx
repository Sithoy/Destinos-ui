import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { InquiryModal } from './components/InquiryModal';
import { Nav } from './components/Nav';
import { PrestigeGateway } from './components/PrestigeGateway';
import { BrandLockup, InstagramIcon } from './components/ui';
import { getPageFromPathname, pageMeta, pageRoutes } from './data/travel';
import { ClassicHome } from './pages/ClassicHome';
import { CorporatePage } from './pages/CorporatePage';
import { LuxuryPage } from './pages/LuxuryPage';
import type { InquiryKind } from './types';

export default function DestinosPeloMundoUIConcept() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const page = getPageFromPathname(location.pathname);
  const [showPrestigeGate, setShowPrestigeGate] = useState(false);
  const [isGatewayNavigating, setIsGatewayNavigating] = useState(false);
  const [inquiryKind, setInquiryKind] = useState<InquiryKind | null>(null);

  const openPrestige = () => {
    setIsGatewayNavigating(false);
    setShowPrestigeGate(true);
  };

  const openInquiry = (kind: InquiryKind) => {
    setInquiryKind(kind);
  };

  const closePrestige = () => {
    setIsGatewayNavigating(false);
    setShowPrestigeGate(false);
  };

  const goHome = () => {
    navigate(pageRoutes.home);
    setIsGatewayNavigating(false);
    setShowPrestigeGate(false);
  };

  const screen =
    page === 'luxury' ? (
      <LuxuryPage openInquiry={openInquiry} />
    ) : page === 'corporate' ? (
      <CorporatePage openInquiry={openInquiry} />
    ) : (
      <ClassicHome openPrestige={openPrestige} openInquiry={openInquiry} />
    );

  return (
    <div className={`min-h-screen ${pageMeta[page].bg}`}>
      <Nav
        page={page}
        goHome={goHome}
        openPrestige={openPrestige}
        setPrestigePage={(nextPage) => {
          navigate(pageRoutes[nextPage]);
          setIsGatewayNavigating(false);
          setShowPrestigeGate(false);
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>

      <PrestigeGateway
        isOpen={showPrestigeGate}
        isNavigating={isGatewayNavigating}
        onClose={closePrestige}
        onSelect={(selectedPage) => {
          navigate(pageRoutes[selectedPage]);
          setIsGatewayNavigating(true);
          window.setTimeout(() => {
            setShowPrestigeGate(false);
            setIsGatewayNavigating(false);
          }, 1200);
        }}
      />

      <InquiryModal kind={inquiryKind} onClose={() => setInquiryKind(null)} />

      <footer className={`border-t ${page === 'home' ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-black/20 text-white/70'}`}>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
          <div>
            <div className="mb-4">
              <BrandLockup
                src={pageMeta[page].logo}
                alt={t('brand.footerAlt')}
                theme={page === 'home' ? 'dark' : 'gold'}
                compact
              />
            </div>
            <p className="max-w-sm text-sm leading-7 opacity-80">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold">{t('footer.contact')}</div>
            <div className="mt-3 space-y-3 text-sm opacity-90">
              <a href="mailto:contact@dpmundo.com" className="flex items-center gap-2 hover:opacity-80">
                <Mail className="h-4 w-4" />
                <span>contact@dpmundo.com</span>
              </a>
              <a
                href="https://www.instagram.com/destinospelomundomoz?igsh=cGdveGw4cWhzdzY1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80"
              >
                <InstagramIcon className="h-4 w-4" />
                <span>@destinospelomundomoz</span>
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">{t('footer.services')}</div>
            <div className="mt-3 space-y-2 text-sm opacity-80">
              <div>{t('footer.classic')}</div>
              <div>{t('footer.luxury')}</div>
              <div>{t('footer.corporate')}</div>
            </div>
          </div>
        </div>
        <div className={`border-t ${page === 'home' ? 'border-slate-200' : 'border-white/10'}`}>
          <a
            href="https://etios.net"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('footer.poweredBy')} ETIOS registered trademark`}
            className="block bg-[#2b323a] text-white transition hover:bg-[#252c33]"
          >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 text-center md:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#303840] ring-1 ring-white/10">
                <img src="/etios-icon.png" alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              </span>
              <span className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 leading-none">
                <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/45">
                  {t('footer.poweredBy')}
                </span>
                <span className="flex items-start gap-1 text-sm font-semibold tracking-[0.28em] text-white">
                  ETIOS
                  <sup className="text-[9px] leading-none text-white/70">&reg;</sup>
                </span>
              </span>
            </div>
          </a>
        </div>
      </footer>
    </div>
  );
}
