import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  champagneImage,
  classicDestinations,
  classicLogo,
  heroImage,
  hotelImage,
  luxuryLogo,
  maldivesImage,
  monacoImage,
  retreatImage,
  serviceIcons,
  whyChooseUs,
} from '../data/travel';
import type { InquiryKind } from '../types';
import { Button, Card, PrestigeIdentity, SectionTitle, SmartImage } from '../components/ui';
export function ClassicHome({
  openPrestige,
  openInquiry,
}: {
  openPrestige: () => void;
  openInquiry: (kind: InquiryKind) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white text-slate-900">
      <section className="relative min-h-[calc(100svh-84px)] overflow-hidden bg-[#06101d] md:min-h-[700px] xl:min-h-[720px]">
        <SmartImage
          src={heroImage}
          alt={t('home.hero.imageAlt')}
          className="absolute inset-0 h-full w-full object-cover"
          fallbackClassName="opacity-100"
        />
        <div className="absolute inset-0 bg-slate-950/42 sm:bg-slate-950/28" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(4,15,31,0.92)_0%,rgba(4,15,31,0.68)_38%,rgba(4,15,31,0.24)_72%,rgba(4,15,31,0.12)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_26%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#03101f]/35 to-transparent" />

        <div className="relative mx-auto grid min-h-[calc(100svh-84px)] max-w-7xl items-start gap-10 px-4 pb-8 pt-10 sm:pb-10 sm:pt-12 md:min-h-[700px] md:px-6 md:pb-12 md:pt-14 xl:min-h-[720px] xl:grid-cols-[1.2fr_0.8fr] xl:items-center xl:py-20">
          <div className="min-w-0 max-w-4xl">
            <div className="mb-8 sm:mb-10">
              <PrestigeIdentity
                src={classicLogo}
                alt={t('brand.classicAlt')}
                descriptor={t('brand.turismo')}
                ribbonLabel={null}
                theme="classic"
              />
            </div>
            <h1 className="max-w-[21rem] text-3xl font-semibold leading-[1.04] tracking-tight text-white sm:max-w-3xl sm:text-5xl md:text-6xl 2xl:text-7xl">
              {t('home.hero.title')}
            </h1>
            <p className="mt-5 max-w-[21rem] text-base leading-7 text-white/82 sm:max-w-2xl sm:text-lg md:mt-6 md:text-xl md:leading-8">
              {t('home.hero.text')}
            </p>
            <div className="mt-8 grid max-w-[22rem] gap-3 sm:mt-9 sm:flex sm:max-w-none sm:flex-wrap">
              <Button
                size="lg"
                className="w-full rounded-full bg-[#f97316] px-7 text-white hover:bg-[#ea580c] sm:w-auto"
                onClick={() => openInquiry('classic')}
              >
                {t('home.hero.primaryCta')}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full rounded-full border border-white/15 bg-white/10 px-7 text-white backdrop-blur-sm hover:bg-white/15 sm:w-auto"
                onClick={openPrestige}
              >
                {t('nav.enterPrestige')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="hidden xl:flex xl:justify-end">
            <div className="w-full max-w-[380px] rounded-[30px] border border-white/12 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.35em] text-white/60">{t('home.hero.cardEyebrow')}</div>
              <div className="mt-3 text-2xl font-semibold leading-tight">{t('home.hero.cardTitle')}</div>
              <div className="mt-6 grid gap-3 text-sm text-white/78">
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">{t('home.hero.cardItems.flights')}</div>
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">{t('home.hero.cardItems.luxury')}</div>
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">{t('home.hero.cardItems.corporate')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20 md:px-6 md:py-24">
        <SectionTitle
          eyebrow={t('home.destinations.eyebrow')}
          title={t('home.destinations.title')}
          text={t('home.destinations.text')}
        />
        <div className="mt-10 grid gap-5 sm:mt-12 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {classicDestinations.map((item) => (
            <Card key={item.nameKey} className="group overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(2,8,23,0.08)]">
              <div className="relative h-[320px] overflow-hidden bg-slate-200 sm:h-[380px] lg:h-[420px]">
                <SmartImage src={item.image} alt={t(item.nameKey)} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/18 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <div className="text-sm text-white/72">{t(item.tagKey)}</div>
                  <div className="mt-2 text-2xl font-semibold">{t(item.nameKey)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-10 md:grid-cols-[0.92fr_1.08fr] md:items-center">
          <div>
            <SectionTitle
              eyebrow={t('home.offer.eyebrow')}
              title={t('home.offer.title')}
              text={t('home.offer.text')}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {serviceIcons.map(([labelKey, Icon]) => (
                <div key={labelKey} className="flex items-center gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e88e5]/10 text-[#1e88e5]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-medium text-slate-900">{t(labelKey)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden rounded-[30px] shadow-[0_20px_60px_rgba(2,8,23,0.08)] bg-slate-200">
              <SmartImage src={hotelImage} alt={t('home.offer.hotelAlt')} className="h-full min-h-[240px] w-full object-cover sm:min-h-[260px]" />
            </div>
            <div className="grid gap-6">
              <div className="overflow-hidden rounded-[30px] shadow-[0_20px_60px_rgba(2,8,23,0.08)] bg-slate-200">
                <SmartImage src={maldivesImage} alt={t('home.offer.maldivesAlt')} className="h-[180px] w-full object-cover sm:h-[190px]" />
              </div>
              <div className="overflow-hidden rounded-[30px] shadow-[0_20px_60px_rgba(2,8,23,0.08)] bg-slate-200">
                <SmartImage src={champagneImage} alt={t('home.offer.champagneAlt')} className="h-[180px] w-full object-cover sm:h-[190px]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 bg-[#071428] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:py-20 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-6">
          <div className="order-2 md:order-1">
            <PrestigeIdentity
              src={luxuryLogo}
              alt={t('brand.prestigeAlt')}
              descriptor={t('brand.corporateLuxuryTravel')}
              compact
              className="mb-8"
            />
            <div className="text-sm uppercase tracking-[0.3em] text-white/60">{t('home.prestige.eyebrow')}</div>
            <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              {t('home.prestige.title')}
            </h3>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
              {t('home.prestige.text')}
            </p>
            <div className="mt-8">
              <Button onClick={openPrestige} className="w-full rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e] sm:w-auto">
                {t('nav.enterPrestige')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="order-1 overflow-hidden rounded-[32px] border border-white/10 shadow-2xl md:order-2 bg-slate-700">
            <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]">
              <SmartImage src={monacoImage} alt={t('home.prestige.imageAlt')} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20 md:px-6 md:py-24">
        <SectionTitle
          eyebrow={t('home.signature.eyebrow')}
          title={t('home.signature.title')}
          text={t('home.signature.text')}
        />
        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(2,8,23,0.08)] bg-slate-200">
            <div className="relative h-[380px] sm:h-[460px] lg:h-[560px]">
              <SmartImage src={retreatImage} alt={t('home.signature.retreatAlt')} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute bottom-0 p-6 text-white sm:p-8 md:p-10">
                <div className="text-xs uppercase tracking-[0.35em] text-white/60">{t('home.signature.retreatEyebrow')}</div>
                <div className="mt-3 text-2xl font-semibold sm:text-3xl md:text-4xl">{t('home.signature.retreatTitle')}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(2,8,23,0.08)] bg-slate-200">
              <div className="relative h-[240px] sm:h-[267px]">
                <SmartImage src={champagneImage} alt={t('home.signature.celebrationAlt')} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white sm:p-7">
                  <div className="text-xs uppercase tracking-[0.35em] text-white/60">{t('home.signature.celebrationEyebrow')}</div>
                  <div className="mt-2 text-xl font-semibold sm:text-2xl">{t('home.signature.celebrationTitle')}</div>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(2,8,23,0.08)] bg-slate-200">
              <div className="relative h-[240px] sm:h-[267px]">
                <SmartImage src={hotelImage} alt={t('home.signature.stayAlt')} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white sm:p-7">
                  <div className="text-xs uppercase tracking-[0.35em] text-white/60">{t('home.signature.stayEyebrow')}</div>
                  <div className="mt-2 text-xl font-semibold sm:text-2xl">{t('home.signature.stayTitle')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-20 md:grid-cols-[0.95fr_1.05fr] md:px-6 md:py-24">
          <div>
            <SectionTitle
              eyebrow={t('home.why.eyebrow')}
              title={t('home.why.title')}
              text={t('home.why.text')}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {whyChooseUs.map(([labelKey, Icon]) => (
              <div key={labelKey} className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e88e5]/10 text-[#1e88e5]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-lg font-medium text-slate-900">{t(labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20 md:px-6 md:py-24">
        <div className="relative overflow-hidden rounded-[26px] bg-[#0f172a] px-5 py-12 text-white sm:rounded-[34px] sm:px-8 sm:py-14 md:px-12 md:py-16">
          <SmartImage src={maldivesImage} alt={t('home.contact.imageAlt')} className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.84)_50%,rgba(15,23,42,0.72)_100%)]" />
          <div className="relative">
            <SectionTitle
              eyebrow={t('home.contact.eyebrow')}
              title={t('home.contact.title')}
              text={t('home.contact.text')}
              light
            />
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Button
                className="w-full rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e] sm:w-auto"
                onClick={() => openInquiry('classic')}
              >
                {t('home.contact.cta')}
              </Button>
              <a
                href="mailto:contact@dpmundo.com"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 px-7 text-center text-white transition hover:bg-white/10 sm:w-auto"
              >
                contact@dpmundo.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
