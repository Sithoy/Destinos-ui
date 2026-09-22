import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { InquiryModal } from './components/InquiryModal';
import { Nav } from './components/Nav';
import { PrestigeGateway } from './components/PrestigeGateway';
import { BrandLockup, InstagramIcon } from './components/ui';
import { CRM_AUTH_EVENT, canAccessCrm, clearCrmSession, fetchCrmCurrentUser, hasCrmApi, readCrmSession, saveCrmSession } from './data/crm';
import { ctmLegacyRoute, ctmPrimaryRoute, getPageFromPathname, pageMeta, pageRoutes } from './data/travel';
import { ClassicHome } from './pages/ClassicHome';
import { CorporatePage } from './pages/CorporatePage';

import { InspirationPage } from './pages/InspirationPage';
import type { TravelExperience } from './data/experiences';
import { LuxuryPage } from './pages/LuxuryPage';

import type { InquiryKind } from './types';

const CrmPage = lazy(() => import('./pages/CrmPage').then((module) => ({ default: module.CrmPage })));

const CorporatePortalApp = lazy(() => import('./pages/corporate-portal/CorporatePortalApp').then((module) => ({ default: module.CorporatePortalApp })));

export default function DestinosPeloMundoUIConcept() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const page = getPageFromPathname(location.pathname);
  const inspiration = location.pathname === '/inspiracao' || location.pathname.startsWith('/inspiracao/');
  const experienceSlug = location.pathname.split('/')[2] || '';
  const [inquiryExperience, setInquiryExperience] = useState<TravelExperience | undefined>();
  const [showPrestigeGate, setShowPrestigeGate] = useState(false);
  const [isGatewayNavigating, setIsGatewayNavigating] = useState(false);
  const [inquiryKind, setInquiryKind] = useState<InquiryKind | null>(null);
  const [inquiryDestination, setInquiryDestination] = useState('');
  const [crmSession, setCrmSession] = useState(() => readCrmSession());
  const whatsappNumber = '+258 87 963 2250';
  const whatsappHref = `https://wa.me/258879632250`;
  const socialByPage = {
    home: {
      href: 'https://www.instagram.com/destinospelomundomoz?igsh=cGdveGw4cWhzdzY1',
      label: '@destinospelomundomoz',
      Icon: InstagramIcon,
    },
    luxury: {
      href: 'https://www.instagram.com/dp_luxury_travel',
      label: '@dp_luxury_travel',
      Icon: InstagramIcon,
    },
    corporate: {
      href: 'https://www.instagram.com/destinospelomundomoz',
      label: '@destinospelomundomoz',
      Icon: InstagramIcon,
    },
    crm: {
      href: 'https://www.instagram.com/destinospelomundomoz',
      label: '@destinospelomundomoz',
      Icon: InstagramIcon,
    },
    corporatePortal: {
      href: 'https://www.instagram.com/destinospelomundomoz',
      label: '@destinospelomundomoz',
      Icon: InstagramIcon,
    },
  } as const;
  const socialLink = socialByPage[page];
  const canEnterCrm = hasCrmApi() && canAccessCrm(crmSession?.user);

  useEffect(() => {
    const refreshSession = () => setCrmSession(readCrmSession());
    window.addEventListener(CRM_AUTH_EVENT, refreshSession);
    window.addEventListener('storage', refreshSession);
    return () => {
      window.removeEventListener(CRM_AUTH_EVENT, refreshSession);
      window.removeEventListener('storage', refreshSession);
    };
  }, []);

  useEffect(() => {
    const session = readCrmSession();
    if (!hasCrmApi() || !session?.token) return;

    fetchCrmCurrentUser(session)
      .then((user) => {
        if (!user?.canAccessCrm) {
          clearCrmSession();
          setCrmSession(null);
          return;
        }
        saveCrmSession({ ...session, user });
        setCrmSession({ ...session, user });
      })
      .catch(() => {
        clearCrmSession();
        setCrmSession(null);
      });
  }, [crmSession?.token]);

  useEffect(() => {
    const normalizedPathname = location.pathname.toLowerCase();
    const ctmSuffix = normalizedPathname === ctmPrimaryRoute || normalizedPathname.startsWith(`${ctmPrimaryRoute}/`)
      ? location.pathname.slice(ctmPrimaryRoute.length)
      : null;
    const legacySuffix = normalizedPathname === ctmLegacyRoute || normalizedPathname.startsWith(`${ctmLegacyRoute}/`)
      ? location.pathname.slice(ctmLegacyRoute.length)
      : null;

    if (legacySuffix !== null || (ctmSuffix !== null && !location.pathname.startsWith(ctmPrimaryRoute))) {
      navigate(`${ctmPrimaryRoute}${legacySuffix ?? ctmSuffix}${location.search}${location.hash}`, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const portuguese = i18n.language.startsWith('pt');
    const titles = { home: 'Destinos pelo Mundo', luxury: 'DPM Luxury Travel', corporate: 'DPM Corporate Travel', crm: 'DPM CRM', corporatePortal: 'DPM CTM' };
    if (!inspiration) document.title = titles[page];
    document.documentElement.lang = portuguese ? 'pt' : 'en';
    if (inspiration) return;
    const description = portuguese
      ? 'Planeie viagens de lazer, luxo e negócios com a Destinos pelo Mundo em Moçambique. Peça um itinerário à sua medida.'
      : 'Plan leisure, luxury and corporate travel with Destinos pelo Mundo in Mozambique. Request a tailored itinerary.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    if (!inspiration) document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://www.dpmundo.com${pageRoutes[page]}`);
  }, [page, i18n.language, inspiration]);

  const openPrestige = () => {
    setIsGatewayNavigating(false);
    setShowPrestigeGate(true);
  };

  const openInquiry = (kind: InquiryKind, destination = '') => {
    setInquiryExperience(undefined);
    setInquiryDestination(destination);
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
    inspiration ? (
      <InspirationPage key={experienceSlug} slug={experienceSlug} onCustomise={(item) => { setInquiryExperience(item); setInquiryDestination(i18n.language.startsWith('pt') ? item.pt.destination : item.en.destination); setInquiryKind('classic'); }} />
    ) : page === 'crm' ? (
      <CrmPage />
    ) : page === 'corporatePortal' ? (
      <CorporatePortalApp />
    ) : page === 'luxury' ? (
      <LuxuryPage openInquiry={openInquiry} />
    ) : page === 'corporate' ? (
      <CorporatePage openInquiry={openInquiry} />
    ) : (
      <ClassicHome openInquiry={openInquiry} />
    );

  return (
    <div className={`min-h-screen ${pageMeta[page].bg} ${page === 'home' ? 'classic-theme' : ''}`}>
      {page !== 'crm' && page !== 'corporatePortal' ? (
        <Nav
          page={page}
          goHome={goHome}
          openPrestige={openPrestige}
          openInquiry={() => openInquiry('classic')}
          setPrestigePage={(nextPage) => {
            navigate(pageRoutes[nextPage]);
            setIsGatewayNavigating(false);
            setShowPrestigeGate(false);
          }}
        />
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={inspiration ? location.pathname : page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<div role="status" className="p-8 text-center">Loading workspace…</div>}>{screen}</Suspense>
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

      <InquiryModal experience={inquiryExperience} kind={inquiryKind} initialDestination={inquiryDestination} onClose={() => setInquiryKind(null)} />

      {page !== 'crm' && page !== 'corporatePortal' ? (
      <footer className={`border-t ${page === 'home' ? 'border-[#eadcc8] bg-[#fffaf2] text-slate-700' : 'border-white/10 bg-black/20 text-white/70'}`}>
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
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold">W</span>
                <span>{whatsappNumber}</span>
              </a>
              <a
                href={socialLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80"
              >
                <socialLink.Icon className="h-4 w-4" />
                <span>{socialLink.label}</span>
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">{t('footer.services')}</div>
            <div className="mt-3 space-y-2 text-sm opacity-80">
              <div>{t('footer.classic')}</div>
              <div>{t('footer.luxury')}</div>
              <div>{t('footer.corporate')}</div>
              <button type="button" onClick={() => navigate(pageRoutes.crm)} className="mt-4 text-xs underline">
                {canEnterCrm ? t('home.hero.supportDesk.openWorkspace') : t('home.hero.supportDesk.teamAccess')}
              </button>
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
      ) : null}
    </div>
  );
}
