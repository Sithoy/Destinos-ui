import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane,
  Crown,
  Briefcase,
  MapPin,
  Star,
  Building2,
  ArrowRight,
  ShieldCheck,
  Palmtree,
  Compass,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  X,
} from 'lucide-react';
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary';
  size?: 'default' | 'lg';
};

function Button({
  className = '',
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center transition focus:outline-none disabled:opacity-50';
  const variants = {
    default: '',
    secondary: '',
  };
  const sizes = {
    default: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 py-3',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

function Badge({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center ${className}`.trim()}>{children}</span>;
}

type Page = 'home' | 'luxury' | 'corporate';

const classicDestinations = [
  {
    name: 'Maldives',
    tag: 'Beach escape',
    image:
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Dubai',
    tag: 'City luxury',
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Cape Town',
    tag: 'Adventure',
    image:
      'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Paris',
    tag: 'Romance',
    image:
      'https://images.unsplash.com/photo-1431274172761-fca41d930114?q=80&w=1200&auto=format&fit=crop',
  },
];

const luxuryExperiences = [
  'Luxury resorts & villas',
  'Private airport transfers',
  'Curated honeymoon journeys',
  'Exclusive safari itineraries',
];

const corporateServices = [
  'Executive trip planning',
  'Conference & event travel',
  'Travel coordination for teams',
  'Priority support & reporting',
];

const pageMeta: Record<Page, { label: string; bg: string }> = {
  home: {
    label: 'Classic Home',
    bg: 'bg-white text-slate-900',
  },
  luxury: {
    label: 'Prestige Luxury',
    bg: 'bg-[rgb(36,31,27)] text-white',
  },
  corporate: {
    label: 'Prestige Corporate',
    bg: 'bg-[rgb(5,17,36)] text-white',
  },
};

function PrestigeNavToggle({
  page,
  setPrestigePage,
}: {
  page: Extract<Page, 'luxury' | 'corporate'>;
  setPrestigePage: (page: Extract<Page, 'luxury' | 'corporate'>) => void;
}) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
      <button
        onClick={() => setPrestigePage('luxury')}
        className={`rounded-full px-4 py-2 text-sm transition ${
          page === 'luxury' ? 'bg-[#d4af37] font-medium text-[#241f1b]' : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        Luxury
      </button>
      <button
        onClick={() => setPrestigePage('corporate')}
        className={`rounded-full px-4 py-2 text-sm transition ${
          page === 'corporate' ? 'bg-[#d4af37] font-medium text-[#051124]' : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        Corporate
      </button>
    </div>
  );
}

function Nav({
  openPrestige,
  page,
  goHome,
  setPrestigePage,
}: {
  openPrestige: () => void;
  page: Page;
  goHome: () => void;
  setPrestigePage: (page: Extract<Page, 'luxury' | 'corporate'>) => void;
}) {
  const isPrestige = page === 'luxury' || page === 'corporate';

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <button onClick={goHome} className="flex items-center gap-3 text-white transition hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Plane className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium tracking-[0.3em] text-white/70">DESTINOS</div>
            <div className="text-lg font-semibold leading-none">pelo mundo</div>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {isPrestige ? (
            <>
              <button
                onClick={goHome}
                className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white md:inline-flex"
              >
                Back Home
              </button>
              <PrestigeNavToggle page={page} setPrestigePage={setPrestigePage} />
              <button
                onClick={() => setPrestigePage(page === 'luxury' ? 'corporate' : 'luxury')}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15 md:hidden"
              >
                {page === 'luxury' ? 'Corporate' : 'Luxury'}
              </button>
            </>
          ) : (
            <button
              onClick={openPrestige}
              className="inline-flex items-center gap-2 rounded-full bg-[#d4af37] px-5 py-2 text-sm font-medium text-[#241f1b] transition hover:bg-[#e0bc4e]"
            >
              <Crown className="h-4 w-4" />
              Enter Prestige
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
  light = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.35em] ${light ? 'text-white/60' : 'text-slate-500'}`}>
        {eyebrow}
      </div>
      <h2 className={`text-3xl font-semibold tracking-tight md:text-5xl ${light ? 'text-white' : 'text-slate-950'}`}>
        {title}
      </h2>
      {text ? <p className={`mt-4 text-base md:text-lg ${light ? 'text-white/70' : 'text-slate-600'}`}>{text}</p> : null}
    </div>
  );
}

function ClassicHome({ openPrestige }: { openPrestige: () => void }) {
  return (
    <div className="bg-white text-slate-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c2f57]/90 via-[#0c2f57]/45 to-[#f6f8fb]/10" />

        <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:px-6 md:py-24">
          <div>
            <Badge className="mb-5 rounded-full bg-white/15 px-4 py-2 text-white hover:bg-white/15">Classic travel experience</Badge>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-white md:text-7xl">
              Explore the world with clarity, warmth, and confidence.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
              Destinos pelo Mundo helps families, couples, and leisure travelers plan smooth, memorable trips — from flights and stays to experiences on the ground.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="rounded-full bg-[#f97316] px-7 text-white hover:bg-[#ea580c]">
                Plan your trip
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full bg-white/15 px-7 text-white hover:bg-white/20"
                onClick={openPrestige}
              >
                Enter Prestige <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4">
              {([
                ['Flights', Plane],
                ['Hotels', Building2],
                ['Experiences', Compass],
                ['Transfers', CalendarDays],
              ] as const).map(([label, Icon]) => {
                const ItemIcon = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <ItemIcon className="mb-3 h-5 w-5 text-white" />
                    <div className="text-sm font-medium text-white">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Card className="overflow-hidden rounded-[28px] border-0 bg-white/95 shadow-2xl">
              <CardContent className="p-0">
                <div className="border-b bg-slate-50 px-6 py-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Quick request</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">Build your next journey</div>
                </div>
                <div className="space-y-4 p-6">
                  {['Destination', 'Travel dates', 'Number of travelers', 'Travel style'].map((field) => (
                    <div key={field} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-400">
                      {field}
                    </div>
                  ))}
                  <Button className="h-12 w-full rounded-2xl bg-[#1e88e5] text-white hover:bg-[#1976d2]">Request itinerary</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <SectionTitle
          eyebrow="Popular destinations"
          title="Classic travel designed for real people and real moments."
          text="A homepage centered on approachable travel: warm visuals, easy discovery, and a simple path to request a custom plan."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {classicDestinations.map((item) => (
            <Card key={item.name} className="overflow-hidden rounded-[28px] border-0 shadow-lg">
              <div className="relative h-80">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <div className="text-sm text-white/70">{item.tag}</div>
                  <div className="mt-1 text-2xl font-semibold">{item.name}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-6">
          <div>
            <SectionTitle
              eyebrow="Why it works"
              title="A classic-first website with a clean Prestige gate."
              text="The main site prioritizes leisure travelers, then introduces premium pathways without diluting the core offer."
            />
            <div className="mt-8 space-y-5">
              {([
                ['Trusted travel advisors', ShieldCheck],
                ['Tailored travel planning', Star],
                ['Friendly, accessible journey', Palmtree],
                ['Clear route into Prestige', Crown],
              ] as const).map(([label, Icon]) => {
                const ItemIcon = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <div key={label} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e88e5]/10 text-[#1e88e5]">
                      <ItemIcon className="h-5 w-5" />
                    </div>
                    <div className="font-medium text-slate-800">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] bg-gradient-to-br from-[#103d6b] to-[#0d2340] p-8 text-white shadow-2xl">
            <div className="text-sm uppercase tracking-[0.3em] text-white/60">Prestige invitation</div>
            <h3 className="mt-3 text-3xl font-semibold md:text-4xl">Looking for a more premium or executive travel experience?</h3>
            <p className="mt-4 max-w-xl text-white/75">
              Keep the homepage fully aligned with Classic travel, then guide premium visitors into Prestige through a focused gateway overlay.
            </p>
            <div className="mt-8">
              <Button onClick={openPrestige} className="rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e]">
                Enter Prestige <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PrestigeGateway({
  isOpen,
  onClose,
  onSelect,
  isNavigating,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (page: Extract<Page, 'luxury' | 'corporate'>) => void;
  isNavigating: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-[60] flex items-center justify-center px-4 backdrop-blur-md transition-colors duration-700 ${
            isNavigating ? 'bg-[#08111f]' : 'bg-[#08111f]/92'
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.985, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 12 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full max-w-6xl rounded-[36px] border border-white/10 bg-black/20 p-6 shadow-2xl md:p-10 ${
              isNavigating ? 'pointer-events-none' : ''
            }`}
          >
            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <Badge className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[#e8ce76] hover:bg-[#d4af37]/10">
                  Prestige selector
                </Badge>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Choose the Prestige experience that fits your journey.
                </h2>
                <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
                  A modern gateway overlay with just two options: Luxury for elevated personal travel, or Corporate for structured executive mobility.
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label="Close prestige selector"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <motion.button
                whileHover={{ y: -6 }}
                onClick={() => onSelect('luxury')}
                className="group overflow-hidden rounded-[32px] border border-[#d4af37]/20 bg-[linear-gradient(135deg,rgba(36,31,27,1),rgba(58,49,40,1))] p-8 text-left shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <Crown className="h-8 w-8 text-[#d4af37]" />
                  <ArrowRight className="h-5 w-5 text-[#d4af37] transition group-hover:translate-x-1" />
                </div>
                <div className="mt-14 text-3xl font-semibold text-white">Prestige Luxury</div>
                <p className="mt-3 max-w-md text-white/70">
                  For private escapes, premium stays, romantic journeys, bespoke hospitality, and memorable curated experiences.
                </p>
                <div className="mt-8 space-y-2 text-sm text-white/75">
                  <div>• Luxury resorts and villas</div>
                  <div>• Honeymoon and special occasion travel</div>
                  <div>• Concierge-style service</div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ y: -6 }}
                onClick={() => onSelect('corporate')}
                className="group overflow-hidden rounded-[32px] border border-[#d4af37]/20 bg-[linear-gradient(135deg,rgba(5,17,36,1),rgba(15,34,67,1))] p-8 text-left shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <Briefcase className="h-8 w-8 text-[#d4af37]" />
                  <ArrowRight className="h-5 w-5 text-[#d4af37] transition group-hover:translate-x-1" />
                </div>
                <div className="mt-14 text-3xl font-semibold text-white">Prestige Corporate</div>
                <p className="mt-3 max-w-md text-white/70">
                  For executive travel, company mobility, event logistics, structured support, and professional coordination.
                </p>
                <div className="mt-8 space-y-2 text-sm text-white/75">
                  <div>• Business trips and executive planning</div>
                  <div>• Team and conference travel coordination</div>
                  <div>• Reliable corporate-facing service</div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LuxuryPage() {
  return (
    <div className="min-h-screen bg-[rgb(36,31,27)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_25%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <Badge className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[#e8ce76] hover:bg-[#d4af37]/10">Prestige Luxury</Badge>
          <div className="mt-6 grid gap-10 md:grid-cols-[1fr_0.85fr] md:items-end">
            <div>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
                Exclusive journeys crafted around comfort, beauty, and emotion.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-white/72 md:text-xl">
                This page should feel immersive and refined — less transactional, more aspirational. Warm dark tones, measured gold accents, and editorial imagery support the premium narrative.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e]">
                  Request luxury consultation
                </Button>
                <Button size="lg" variant="secondary" className="rounded-full bg-white/10 px-7 text-white hover:bg-white/15">
                  View signature experiences
                </Button>
              </div>
            </div>
            <Card className="overflow-hidden rounded-[32px] border border-[#d4af37]/20 bg-black/20 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-sm uppercase tracking-[0.3em] text-white/50">Luxury profile</div>
                <div className="mt-4 text-2xl font-semibold">Warm premium aesthetic</div>
                <div className="mt-4 space-y-3 text-white/70">
                  <div>• Boutique hospitality tone</div>
                  <div>• High-emotion destination visuals</div>
                  <div>• Concierge-style messaging</div>
                  <div>• Elegant spacing and softer layout rhythm</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <SectionTitle
          eyebrow="Signature experiences"
          title="Luxury should be presented as a collection of crafted moments."
          text="Think in terms of experience categories, not generic service lists."
          light
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {luxuryExperiences.map((item, i) => {
            const icons = [Sparkles, Palmtree, Crown, MapPin];
            const ItemIcon = icons[i] ?? Sparkles;
            return (
              <Card key={item} className="rounded-[28px] border border-[#d4af37]/15 bg-white/5 text-white">
                <CardContent className="p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]">
                    <ItemIcon className="h-5 w-5" />
                  </div>
                  <div className="mt-5 text-xl font-medium">{item}</div>
                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Tailored presentation block for this type of offer, with premium photography and invitation-based CTA style.
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-[0.95fr_1.05fr] md:px-6">
          <div>
            <SectionTitle
              eyebrow="Process"
              title="A concierge-style flow from inquiry to itinerary."
              text="Luxury visitors expect calm, guided clarity. The page should explain the experience with precision and restraint."
              light
            />
          </div>
          <div className="grid gap-4">
            {['Share your vision', 'Receive a tailored concept', 'Refine details with our team', 'Travel with premium support'].map((step, i) => (
              <div key={step} className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d4af37] font-semibold text-[#241f1b]">{i + 1}</div>
                <div className="text-lg font-medium">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CorporatePage() {
  return (
    <div className="min-h-screen bg-[rgb(5,17,36)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_25%)]" />
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <Badge className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[#e8ce76] hover:bg-[#d4af37]/10">Prestige Corporate</Badge>
          <div className="mt-6 grid gap-10 md:grid-cols-[1fr_0.85fr] md:items-end">
            <div>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
                Executive travel management with structure, speed, and confidence.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-white/72 md:text-xl">
                This page should feel sharper and more operational than Luxury: cleaner hierarchy, tighter language, and stronger emphasis on reliability, reporting, and coordination.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="rounded-full bg-[#d4af37] px-7 text-[#051124] hover:bg-[#e0bc4e]">
                  Schedule consultation
                </Button>
                <Button size="lg" variant="secondary" className="rounded-full bg-white/10 px-7 text-white hover:bg-white/15">
                  See business solutions
                </Button>
              </div>
            </div>
            <Card className="rounded-[32px] border border-[#d4af37]/20 bg-white/5 text-white">
              <CardContent className="p-8">
                <div className="text-sm uppercase tracking-[0.3em] text-white/50">Corporate profile</div>
                <div className="mt-4 text-2xl font-semibold">Executive efficiency aesthetic</div>
                <div className="mt-4 space-y-3 text-white/70">
                  <div>• Precise value communication</div>
                  <div>• Business-first layout structure</div>
                  <div>• Premium but restrained visuals</div>
                  <div>• Direct CTA to consultation and account setup</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <SectionTitle
          eyebrow="Solutions"
          title="Corporate pages should present clear operational value."
          text="Decision-makers need fast clarity on capabilities, outcomes, and support."
          light
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {corporateServices.map((item, i) => {
            const icons = [Briefcase, CalendarDays, Building2, ShieldCheck];
            const ItemIcon = icons[i] ?? Briefcase;
            return (
              <Card key={item} className="rounded-[28px] border border-white/10 bg-white/5 text-white">
                <CardContent className="p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]">
                    <ItemIcon className="h-5 w-5" />
                  </div>
                  <div className="mt-5 text-xl font-medium">{item}</div>
                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Short module describing service scope, response model, and benefit for companies or executive teams.
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/15">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-6">
          <div>
            <SectionTitle
              eyebrow="Business benefits"
              title="Corporate buyers should immediately understand the operational gains."
              text="The page must balance premium positioning with practical assurance."
              light
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['Cost visibility', 'Executive support', 'Travel coordination', 'Faster approvals'].map((benefit) => (
              <div key={benefit} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <CheckCircle2 className="mb-3 h-5 w-5 text-[#d4af37]" />
                <div className="text-lg font-medium">{benefit}</div>
                <p className="mt-2 text-sm leading-7 text-white/65">
                  A supporting explanation block for the business case and procurement-facing narrative.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Manual test cases
 * 1. Clicking "Enter Prestige" in the nav opens the overlay gateway.
 * 2. Clicking "Enter Prestige" in the homepage content opens the same overlay.
 * 3. Closing the gateway returns the user to the current view without errors.
 * 4. Selecting Luxury opens the Luxury page.
 * 5. Selecting Corporate opens the Corporate page.
 * 6. Switching between Luxury and Corporate using the integrated top navigation toggle works without reloading.
 * 7. Clicking the logo or Back Home returns to the Classic homepage.
 * 8. On Prestige pages, there is no second sticky ribbon below the main navigation.
 * 9. Selecting Luxury or Corporate from the gateway does not briefly reveal the Home page during the slower transition.
 * 10. Gateway exit timing stays aligned with the 1.2s page fade so the user does not perceive the background switching before the new page fully settles.
 * 11. Gateway fade-in and fade-out feel softer and slower than before, without making the interface feel unresponsive.
 */
export default function DestinosPeloMundoUIConcept() {
  const [page, setPage] = useState<Page>('home');
  const [showPrestigeGate, setShowPrestigeGate] = useState(false);
  const [isGatewayNavigating, setIsGatewayNavigating] = useState(false);

  const openPrestige = () => {
    setIsGatewayNavigating(false);
    setShowPrestigeGate(true);
  };
  const closePrestige = () => {
    setIsGatewayNavigating(false);
    setShowPrestigeGate(false);
  };
  const goHome = () => {
    setPage('home');
    setIsGatewayNavigating(false);
    setShowPrestigeGate(false);
  };

  const screen = useMemo(() => {
    if (page === 'luxury') {
      return <LuxuryPage />;
    }

    if (page === 'corporate') {
      return <CorporatePage />;
    }

    return <ClassicHome openPrestige={openPrestige} />;
  }, [page]);

  return (
    <div className={`min-h-screen ${pageMeta[page].bg}`}>
      <Nav
        openPrestige={openPrestige}
        page={page}
        goHome={goHome}
        setPrestigePage={(nextPage) => {
          setPage(nextPage);
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
          setPage(selectedPage);
          setIsGatewayNavigating(true);
          window.setTimeout(() => {
            setShowPrestigeGate(false);
            setIsGatewayNavigating(false);
          }, 1200);
        }}
      />

      <footer className={`border-t ${page === 'home' ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-black/20 text-white/70'}`}>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.3em] opacity-60">Destinos pelo Mundo</div>
            <p className="mt-3 max-w-sm text-sm leading-7 opacity-80">
              UI/UX concept showing a Classic-first homepage, a gated Prestige selector, and two distinct premium service experiences.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold">Service paths</div>
            <div className="mt-3 space-y-2 text-sm opacity-80">
              <div>Classic travel experience</div>
              <div>Prestige Luxury</div>
              <div>Prestige Corporate</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">Contact</div>
            <div className="mt-3 space-y-2 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> +258 84 000 0000
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> contact@destinospelomundo.co.mz
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
