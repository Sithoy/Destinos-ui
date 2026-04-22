import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Crown, MapPin, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { conciergeImage, corporateLogo, luxuryLogo, monacoImage, retreatImage } from '../data/travel';
import type { PrestigePage } from '../types';
import { BrandLockup, SmartImage } from './ui';
export function PrestigeGateway({
  isOpen,
  onClose,
  onSelect,
  isNavigating,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (page: PrestigePage) => void;
  isNavigating: boolean;
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="prestige-gateway-title"
          className={`fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-gradient-to-br from-[#06101d] via-[#08111f] to-[#241f1b] px-3 py-4 backdrop-blur-md transition-colors duration-700 sm:px-4 sm:py-6 ${
            isNavigating ? 'bg-[#08111f]' : ''
          }`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.985, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 12 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className={`relative my-auto w-full max-w-6xl rounded-[26px] border border-white/10 bg-black/25 p-4 shadow-2xl sm:rounded-[36px] sm:p-5 md:p-8 ${
              isNavigating ? 'pointer-events-none' : ''
            }`}
          >
            <div className="mb-6 flex items-start justify-between gap-3 md:mb-8 md:gap-6">
              <div className="min-w-0 flex-1">
                <h2 id="prestige-gateway-title" className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-5xl xl:text-6xl">
                  {t('gateway.title')}
                </h2>
                <p className="mt-4 max-w-5xl text-sm leading-7 text-white/70 md:text-base xl:text-lg">
                  {t('gateway.text')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/75 transition hover:bg-white/10 hover:text-white sm:h-11 sm:w-11"
                aria-label={t('gateway.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr] xl:items-stretch">
              <div className="hidden h-full overflow-hidden rounded-[30px] border border-white/10 bg-white/5 xl:block">
                <div className="relative h-full min-h-[520px] overflow-hidden bg-slate-800">
                  <div className="absolute inset-0">
                    <SmartImage src={conciergeImage} alt={t('gateway.visualAlt')} className="h-full w-full scale-[1.08] object-cover object-[50%_26%]" />
                  </div>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,20,0.10)_0%,rgba(4,10,20,0.18)_32%,rgba(4,10,20,0.58)_62%,rgba(3,9,18,0.98)_100%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,10,20,0.56)_0%,rgba(4,10,20,0.14)_50%,rgba(4,10,20,0.62)_100%)]" />

                  <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                    <div className="max-w-xl">
                      <div className="text-[2rem] font-semibold leading-tight">
                        {t('gateway.positioningTitle')}
                      </div>
                      <p className="mt-4 text-sm leading-7 text-white/75">
                        {t('gateway.positioningText')}
                      </p>
                      <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-white/90">
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                          <MapPin className="mb-2 h-5 w-5 text-[#d4af37]" />
                          <span className="text-center">{t('gateway.features.destinations')}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                          <Crown className="mb-2 h-5 w-5 text-[#d4af37]" />
                          <span className="text-center">{t('gateway.features.hospitality')}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                          <ShieldCheck className="mb-2 h-5 w-5 text-[#d4af37]" />
                          <span className="text-center">{t('gateway.features.support')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:gap-5">
                <motion.button
                  whileHover={{ y: -6 }}
                  onClick={() => onSelect('luxury')}
                  className="group relative overflow-hidden rounded-[24px] border border-[#d4af37]/20 bg-[linear-gradient(135deg,rgba(36,31,27,1),rgba(58,49,40,1))] p-4 text-left shadow-2xl sm:rounded-[28px] sm:p-6 md:p-7"
                >
                  <div className="absolute inset-0">
                    <SmartImage src={retreatImage} alt={t('gateway.luxury.backgroundAlt')} className="h-full w-full object-cover opacity-[0.14] transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/25" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <BrandLockup src={luxuryLogo} alt={t('brand.luxuryAlt')} theme="gold" compact />
                      <ArrowRight className="mt-2 h-5 w-5 text-[#d4af37] transition group-hover:translate-x-1" />
                    </div>
                    <div className="mt-5 text-xl font-semibold text-white sm:text-2xl md:text-3xl">{t('gateway.luxury.title')}</div>
                    <p className="mt-3 max-w-md text-sm leading-7 text-white/72 sm:text-base">
                      {t('gateway.luxury.text')}
                    </p>
                    <div className="mt-5 grid gap-2 text-sm text-white/78 sm:mt-6">
                      <div>- {t('gateway.luxury.items.villas')}</div>
                      <div>- {t('gateway.luxury.items.occasions')}</div>
                      <div>- {t('gateway.luxury.items.curated')}</div>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -6 }}
                  onClick={() => onSelect('corporate')}
                  className="group relative overflow-hidden rounded-[24px] border border-[#d4af37]/20 bg-[linear-gradient(135deg,rgba(5,17,36,1),rgba(15,34,67,1))] p-4 text-left shadow-2xl sm:rounded-[28px] sm:p-6 md:p-7"
                >
                  <div className="absolute inset-0">
                    <SmartImage src={monacoImage} alt={t('gateway.corporate.backgroundAlt')} className="h-full w-full object-cover opacity-[0.14] transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/25" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <BrandLockup src={corporateLogo} alt={t('brand.corporateAlt')} theme="gold" compact />
                      <ArrowRight className="mt-2 h-5 w-5 text-[#d4af37] transition group-hover:translate-x-1" />
                    </div>
                    <div className="mt-5 text-xl font-semibold text-white sm:text-2xl md:text-3xl">{t('gateway.corporate.title')}</div>
                    <p className="mt-3 max-w-md text-sm leading-7 text-white/72 sm:text-base">
                      {t('gateway.corporate.text')}
                    </p>
                    <div className="mt-5 grid gap-2 text-sm text-white/78 sm:mt-6">
                      <div>- {t('gateway.corporate.items.planning')}</div>
                      <div>- {t('gateway.corporate.items.logistics')}</div>
                      <div>- {t('gateway.corporate.items.clarity')}</div>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
