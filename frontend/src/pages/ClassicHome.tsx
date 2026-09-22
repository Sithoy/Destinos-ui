import { ArrowDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExperienceDiscovery } from '../components/ExperienceDiscovery';
import type { InquiryKind } from '../types';
import { Button, SmartImage } from '../components/ui';

const escapes = [
  { key: 'island', image: '/images/dpm-family-memories.webp' },
  { key: 'romantic', image: '/images/dpm-city-romance.webp' },
  { key: 'family', image: '/images/dpm-family-safari.webp' },
] as const;
const focusLink = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a65300]';

export function ClassicHome({ openInquiry }: { openInquiry: (kind: InquiryKind, destination?: string) => void }) {
  const { t } = useTranslation();
  return (
    <main id="main-content" className="bg-[#fff9f2] text-[#102337]">
      <section aria-labelledby="home-title" className="relative isolate flex min-h-[660px] flex-col justify-end overflow-hidden bg-[#164b59] text-white sm:min-h-[740px] lg:min-h-[min(820px,90svh)]">
        <SmartImage priority src="/images/dpm-sunset-hero.webp" alt={t('landing.collectionHeroAlt')} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,31,39,0.65),rgba(8,31,39,0.25)_65%,rgba(8,31,39,0.08))]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#352018]/65 via-transparent to-transparent" />
        <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-20 sm:px-8 sm:pb-16 lg:pb-20">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/90">{t('landing.collectionEyebrow')}</p>
          <h1 id="home-title" className="mt-6 max-w-3xl font-serif text-[clamp(2.4rem,6.1vw,5.5rem)] font-normal leading-[0.98] tracking-[-0.035em]">
            {t('landing.collectionTitle')} <span className="mt-2 block italic">{t('landing.collectionAccent')}</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-white/90 sm:text-lg sm:leading-8">{t('landing.collectionIntro')}</p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-7">
            <Button size="lg" onClick={() => openInquiry('classic')} className="gap-3 rounded-full bg-[#fe8500] px-7 font-semibold text-[#35180f] hover:bg-[#ff9b2e]">
              {t('landing.plan')}<ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
            <a href="#services" className={`inline-flex min-h-12 items-center justify-center gap-2 text-sm font-medium text-white underline decoration-white/50 underline-offset-8 hover:decoration-white ${focusLink}`}>
              {t('landing.collectionExplore')}<ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-10 text-xs tracking-wide text-white/80">{t('landing.holidayReassurance')}</p>
        </div>
      </section>

      <section id="services" aria-labelledby="collections-title" className="scroll-mt-28 border-b border-[#efdccc] bg-[#fff3e7]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#984b00]">{t('landing.collectionLabel')}</p>
              <h2 id="collections-title" className="mt-4 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">{t('landing.collectionHeading')}</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-600">{t('landing.collectionText')}</p>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {([
              { key: 'classic', image: '/images/dpm-sunset-hero.webp', href: '#holiday-inspiration' },
              { key: 'luxury', image: '/images/dpm-luxury-terrace.webp', href: '/prestige/luxury' },
              { key: 'corporate', image: '/images/dpm-corporate-lounge.webp', href: '/prestige/corporate' },
            ] as const).map(({ key, image, href }) => (
              <article key={key} className="group">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#254954]">
                  <SmartImage src={image} alt={t(`landing.collections.${key}.alt`)} className="h-full w-full object-cover transition duration-700 motion-safe:group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{t(`landing.collections.${key}.brand`)}</p>
                    <h3 className="mt-3 font-serif text-3xl">{t(`landing.collections.${key}.title`)}</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{t(`landing.collections.${key}.text`)}</p>
                {key === 'classic' ? <a href={href} className={`mt-2 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#984b00] ${focusLink}`}>{t(`landing.collections.${key}.cta`)}<ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
                  : <Link to={href} className={`mt-2 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#984b00] ${focusLink}`}>{t(`landing.collections.${key}.cta`)}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="holiday-inspiration" aria-labelledby="services-title" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#984b00]">{t('landing.escapeEyebrow')}</p>
          <h2 id="services-title" className="mt-4 font-serif text-4xl font-normal tracking-tight sm:text-5xl">{t('landing.escapeTitle')}</h2>
          <p className="mx-auto mt-5 max-w-lg leading-7 text-slate-600">{t('landing.escapeIntro')}</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-[1.15fr_0.85fr_1fr] md:gap-6">
          {escapes.map(({ key, image }, index) => (
            <article key={key} className={index === 1 ? 'md:pt-14' : ''}>
              <div className={`overflow-hidden bg-[#d4e3df] ${index === 0 ? 'aspect-[4/5]' : 'aspect-[4/5] md:aspect-[4/5.5]'}`}>
                <SmartImage src={image} alt={t(`landing.escapes.${key}.alt`)} className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-5 font-serif text-3xl">{t(`landing.escapes.${key}.title`)}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t(`landing.escapes.${key}.text`)}</p>
              <button type="button" onClick={() => openInquiry('classic', t(`landing.escapes.${key}.interest`))} className={`mt-3 inline-flex min-h-11 items-center gap-3 text-sm font-medium text-[#984b00] ${focusLink}`}>
                {t('landing.makeItMine')}<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <ExperienceDiscovery />

      <section aria-labelledby="contact-title" className="border-t border-[#e7dfd1] bg-[#ffe3bf] text-[#163e52]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-20 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#984b00]">{t('landing.contactEyebrow')}</p>
            <h2 id="contact-title" className="mt-4 font-serif text-4xl font-normal tracking-tight sm:text-5xl">{t('landing.contactTitle')}</h2>
            <p className="mt-4 max-w-xl leading-7 text-[#365766]">{t('landing.contactText')}</p>
          </div>
          <div className="flex flex-col items-start gap-5 md:items-end">
            <Button size="lg" onClick={() => openInquiry('classic')} className="w-full gap-3 rounded-full bg-[#fe8500] px-7 font-semibold text-[#35180f] hover:bg-[#ff9b2e] sm:w-auto">{t('landing.plan')}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            <a href="mailto:contact@dpmundo.com" className={`text-sm text-[#365766] underline underline-offset-4 hover:text-[#984b00] ${focusLink}`}>contact@dpmundo.com</a>
          </div>
        </div>
      </section>
    </main>
  );
}
