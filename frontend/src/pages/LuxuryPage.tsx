import { useTranslation } from 'react-i18next';
import { luxuryExperienceCards, luxuryHeroImage, luxuryLogo } from '../data/travel';
import type { InquiryKind } from '../types';
import { Button, Card, CardContent, LogoWatermark, PrestigeIdentity, SectionTitle, SmartImage } from '../components/ui';
export function LuxuryPage({ openInquiry }: { openInquiry: (kind: InquiryKind) => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[rgb(36,31,27)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-slate-900">
          <SmartImage src={luxuryHeroImage} alt={t('luxury.backgroundAlt')} className="h-full w-full object-cover opacity-32" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,31,27,0.96)_0%,rgba(36,31,27,0.86)_42%,rgba(36,31,27,0.62)_72%,rgba(36,31,27,0.46)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_25%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-20 md:px-6 md:py-28">
          <LogoWatermark
            src={luxuryLogo}
            alt={t('luxury.watermarkAlt')}
            position="right"
            opacity="opacity-[0.09]"
            verticalClassName="top-20 xl:top-24"
            size="h-64 xl:h-80"
          />
          <PrestigeIdentity
            src={luxuryLogo}
            alt={t('brand.luxuryAlt')}
            descriptor={t('brand.luxuryTravel')}
            className="mb-8"
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                {t('luxury.hero.title')}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg md:mt-6 md:text-xl">
                {t('luxury.hero.text')}
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Button
                  size="lg"
                  className="w-full rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e] sm:w-auto"
                  onClick={() => openInquiry('luxury')}
                >
                  {t('luxury.hero.primaryCta')}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full rounded-full bg-white/10 px-7 text-white hover:bg-white/15 sm:w-auto"
                  onClick={() => document.getElementById('luxury-experiences')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('luxury.hero.secondaryCta')}
                </Button>
              </div>
            </div>
            <Card className="overflow-hidden rounded-[32px] border border-[#d4af37]/20 bg-black/20 backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="text-sm uppercase tracking-[0.3em] text-white/50">{t('luxury.profile.eyebrow')}</div>
                <div className="mt-4 text-2xl font-semibold">{t('luxury.profile.title')}</div>
                <div className="mt-4 space-y-3 text-white/70">
                  <div>- {t('luxury.profile.items.hospitality')}</div>
                  <div>- {t('luxury.profile.items.visuals')}</div>
                  <div>- {t('luxury.profile.items.planning')}</div>
                  <div>- {t('luxury.profile.items.curated')}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="luxury-experiences" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:py-20 md:px-6">
        <SectionTitle
          eyebrow={t('luxury.experiences.eyebrow')}
          title={t('luxury.experiences.title')}
          text={t('luxury.experiences.text')}
          light
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {luxuryExperienceCards.map(({ itemKey, Icon, image, position }) => (
            <Card
              key={itemKey}
              className="group relative overflow-hidden rounded-[28px] border border-[#d4af37]/20 bg-white/5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition duration-500 hover:-translate-y-1 hover:border-[#d4af37]/40 hover:shadow-[0_28px_80px_rgba(0,0,0,0.34)]"
            >
              <div className="absolute inset-0">
                <SmartImage
                  src={image}
                  alt={t(itemKey)}
                  className={`h-full w-full object-cover ${position} opacity-[0.38] transition duration-700 group-hover:scale-110 group-hover:opacity-[0.52]`}
                />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,11,8,0.18)_0%,rgba(18,14,9,0.44)_36%,rgba(18,14,9,0.88)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.24),transparent_34%)] opacity-70 transition duration-700 group-hover:opacity-100" />
              <div className="absolute inset-x-6 top-5 h-px bg-gradient-to-r from-transparent via-[#f1da8d]/60 to-transparent opacity-60 transition duration-700 group-hover:via-[#f1da8d] sm:inset-x-7" />
              <CardContent className="relative flex min-h-[320px] flex-col justify-end p-6 sm:p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f1da8d]/30 bg-black/25 text-[#f3d985] backdrop-blur-sm transition duration-500 group-hover:scale-105 group-hover:border-[#f1da8d]/50 group-hover:bg-black/35">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-xl font-medium text-white">{t(itemKey)}</div>
                <p className="mt-3 max-w-[18rem] text-sm leading-7 text-white/75 transition duration-500 group-hover:text-white/88">
                  {t('luxury.experiences.description')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-20 md:grid-cols-[0.95fr_1.05fr] md:px-6">
          <div>
            <SectionTitle
              eyebrow={t('luxury.flow.eyebrow')}
              title={t('luxury.flow.title')}
              text={t('luxury.flow.text')}
              light
            />
          </div>
          <div className="grid gap-4">
            {['luxury.flow.steps.tell', 'luxury.flow.steps.design', 'luxury.flow.steps.approve', 'luxury.flow.steps.coordinate'].map((stepKey, i) => (
              <div key={stepKey} className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4af37] font-semibold text-[#241f1b]">
                  {i + 1}
                </div>
                <div className="text-lg font-medium">{t(stepKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
