import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { corporateLogo, corporateServices } from '../data/travel';
import type { InquiryKind } from '../types';
import { Button, Card, CardContent, LogoWatermark, PrestigeIdentity, SectionTitle } from '../components/ui';
export function CorporatePage({ openInquiry }: { openInquiry: (kind: InquiryKind) => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[rgb(5,17,36)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_25%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-20 md:px-6 md:py-28">
          <LogoWatermark
            src={corporateLogo}
            alt={t('corporate.watermarkAlt')}
            position="right"
            opacity="opacity-[0.09]"
            verticalClassName="top-20 xl:top-24"
            size="h-64 xl:h-80"
          />
          <PrestigeIdentity
            src={corporateLogo}
            alt={t('brand.corporateAlt')}
            descriptor={t('brand.corporateTravel')}
            className="mb-8"
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                {t('corporate.hero.title')}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg md:mt-6 md:text-xl">
                {t('corporate.hero.text')}
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Button
                  size="lg"
                  className="w-full rounded-full bg-[#d4af37] px-7 text-[#051124] hover:bg-[#e0bc4e] sm:w-auto"
                  onClick={() => openInquiry('corporate')}
                >
                  {t('corporate.hero.primaryCta')}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full rounded-full bg-white/10 px-7 text-white hover:bg-white/15 sm:w-auto"
                  onClick={() => document.getElementById('corporate-services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('corporate.hero.secondaryCta')}
                </Button>
              </div>
            </div>
            <Card className="rounded-[32px] border border-[#d4af37]/20 bg-white/5 text-white">
              <CardContent className="p-6 sm:p-8">
                <div className="text-sm uppercase tracking-[0.3em] text-white/50">{t('corporate.profile.eyebrow')}</div>
                <div className="mt-4 text-2xl font-semibold">{t('corporate.profile.title')}</div>
                <div className="mt-4 space-y-3 text-white/70">
                  <div>- {t('corporate.profile.items.communication')}</div>
                  <div>- {t('corporate.profile.items.structure')}</div>
                  <div>- {t('corporate.profile.items.restrained')}</div>
                  <div>- {t('corporate.profile.items.support')}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="corporate-services" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:py-20 md:px-6">
        <SectionTitle
          eyebrow={t('corporate.services.eyebrow')}
          title={t('corporate.services.title')}
          text={t('corporate.services.text')}
          light
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {corporateServices.map(([itemKey, Icon]) => (
            <Card key={itemKey} className="rounded-[28px] border border-white/10 bg-white/5 text-white">
              <CardContent className="p-6 sm:p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-xl font-medium">{t(itemKey)}</div>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  {t('corporate.services.description')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/15">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-20 md:grid-cols-[0.9fr_1.1fr] md:px-6">
          <div>
            <SectionTitle
              eyebrow={t('corporate.benefits.eyebrow')}
              title={t('corporate.benefits.title')}
              text={t('corporate.benefits.text')}
              light
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['corporate.benefits.items.cost', 'corporate.benefits.items.executive', 'corporate.benefits.items.coordination', 'corporate.benefits.items.approvals'].map((benefitKey) => (
              <div key={benefitKey} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <CheckCircle2 className="mb-3 h-5 w-5 text-[#d4af37]" />
                <div className="text-lg font-medium">{t(benefitKey)}</div>
                <p className="mt-2 text-sm leading-7 text-white/65">
                  {t('corporate.benefits.description')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
