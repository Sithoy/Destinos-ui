import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary';
  size?: 'default' | 'lg';
};

type SmartImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function Button({
  className = '',
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center text-center leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4af37] disabled:opacity-50';
  const variants = {
    default: '',
    secondary: '',
  } as const;
  const sizes = {
    default: 'min-h-10 px-4 py-2',
    lg: 'min-h-12 px-6 py-3',
  } as const;

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

export function Badge({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center ${className}`.trim()}>{children}</span>;
}

export function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37a4 4 0 1 1-2.87-2.87A4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function SmartImage({ src, alt, className = '', fallbackClassName = '' }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        aria-label={alt}
        className={`${className} ${fallbackClassName} bg-[linear-gradient(135deg,#0b1a33,#163760_55%,#1b6b8f)]`.trim()}
      />
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

function LogoMark({
  src,
  alt,
  size = 'h-14',
  className = '',
  artScale = 'scale-[1.8]',
  artOffset = 'translate-x-1.5 sm:translate-x-2',
}: {
  src: string;
  alt: string;
  size?: string;
  className?: string;
  artScale?: string;
  artOffset?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`flex ${size} aspect-square items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-semibold tracking-[0.28em] text-white/85 ${className}`}>
        DPM
      </div>
    );
  }

  return (
    <span className={`inline-flex ${size} aspect-square shrink-0 items-center justify-center overflow-visible ${className}`}>
      <img src={src} alt={alt} className={`h-full w-full object-contain ${artScale} ${artOffset}`} onError={() => setFailed(true)} />
    </span>
  );
}

export function BrandLockup({
  src,
  alt,
  theme = 'light',
  compact = false,
  align = 'left',
  gapClass,
  logoSize,
  logoArtScale,
  logoArtOffset,
  wordmarkWidthClass,
  taglineClassName = '',
}: {
  src: string;
  alt: string;
  theme?: 'light' | 'dark' | 'gold';
  compact?: boolean;
  align?: 'left' | 'center';
  gapClass?: string;
  logoSize?: string;
  logoArtScale?: string;
  logoArtOffset?: string;
  wordmarkWidthClass?: string;
  taglineClassName?: string;
}) {
  const { t } = useTranslation();
  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const wordColor = theme === 'dark' ? 'text-slate-900' : theme === 'gold' ? 'text-[#e8ce76]' : 'text-white';
  const scriptColor = theme === 'gold' ? 'text-[#f4d87a]' : wordColor;
  const subColor = theme === 'dark' ? 'text-slate-600' : theme === 'gold' ? 'text-white/70' : 'text-white/72';
  const lineColor = theme === 'dark' ? 'bg-slate-400/45' : theme === 'gold' ? 'bg-[#d4af37]/55' : 'bg-white/35';
  const resolvedGap = gapClass ?? (compact ? 'gap-4 sm:gap-5 md:gap-7' : 'gap-5 sm:gap-6 md:gap-10');
  const resolvedLogoSize = logoSize ?? (compact ? 'h-10 sm:h-12 md:h-16' : 'h-14 sm:h-16 md:h-24');
  const resolvedLogoScale = logoArtScale ?? (compact ? 'scale-[1.55] md:scale-[1.65]' : 'scale-[1.65] md:scale-[1.8]');
  const resolvedLogoOffset = logoArtOffset ?? 'translate-x-1.5 sm:translate-x-2';
  const wordmarkWidth = wordmarkWidthClass ?? (compact ? 'w-[clamp(8rem,18vw,13rem)] max-w-[calc(100vw-10rem)]' : 'w-[clamp(10rem,26vw,18rem)] max-w-full');

  return (
    <div className={`flex ${resolvedGap} ${alignClass}`}>
      <LogoMark src={src} alt={alt} size={resolvedLogoSize} className="shrink-0" artScale={resolvedLogoScale} artOffset={resolvedLogoOffset} />
      <div className={`min-w-0 ${wordmarkWidth}`}>
        <div className={`whitespace-nowrap font-serif font-semibold uppercase leading-none tracking-[0.2em] sm:tracking-[0.24em] md:tracking-[0.28em] ${compact ? 'text-[10px] sm:text-xs md:text-sm' : 'text-xs sm:text-sm md:text-lg'} ${wordColor}`}>
          DESTINOS
        </div>
        <div className={`mt-0.5 flex w-full items-center gap-1.5 ${compact ? 'text-base sm:text-xl md:text-2xl' : 'text-xl sm:text-2xl md:text-4xl'} ${scriptColor}`}>
          <span className={`h-px min-w-4 flex-1 ${lineColor}`} />
          <span className="whitespace-nowrap font-serif font-semibold italic leading-none">
            pelo mundo
          </span>
          <span className={`h-px min-w-4 flex-1 ${lineColor}`} />
        </div>
        <div className={`${taglineClassName} overflow-hidden whitespace-nowrap text-center leading-none ${compact ? 'mt-1 text-[8px] sm:text-[9px] md:text-[10px]' : 'mt-2 text-[10px] sm:text-xs md:text-sm'} uppercase tracking-[0.16em] sm:tracking-[0.2em] md:tracking-[0.26em] ${subColor}`}>
          {theme === 'gold' ? t('brand.prestigeTravel') : t('brand.turismo')}
        </div>
      </div>
    </div>
  );
}

export function LinkedInIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function PrestigeIdentity({
  src,
  alt,
  descriptor = 'Corporate & Luxury Travel',
  ribbonLabel = 'Prestige',
  theme = 'prestige',
  compact = false,
  align = 'left',
  className = '',
}: {
  src: string;
  alt: string;
  descriptor?: string;
  ribbonLabel?: string | null;
  theme?: 'prestige' | 'classic';
  compact?: boolean;
  align?: 'left' | 'center';
  className?: string;
}) {
  const identityWidth = compact ? 'w-[min(100%,clamp(15rem,52vw,34rem))]' : 'w-[min(100%,clamp(18rem,62vw,48rem))]';
  const titleSize = compact ? 'text-[clamp(1.45rem,4.8vw,2.85rem)]' : 'text-[clamp(1.75rem,6vw,4.2rem)]';
  const scriptSize = compact ? 'text-[clamp(1.05rem,3vw,1.875rem)]' : 'text-[clamp(1.35rem,4vw,3rem)]';
  const ribbonSize = compact ? 'text-[clamp(0.95rem,2.4vw,1.5rem)]' : 'text-[clamp(1rem,2.25vw,1.875rem)]';
  const identityGap = compact ? 'gap-[clamp(0.8rem,2.5vw,2.5rem)]' : 'gap-[clamp(0.9rem,3vw,3.5rem)]';
  const isClassic = theme === 'classic';
  const titleTone = isClassic
    ? 'bg-[linear-gradient(180deg,#ffffff_0%,#e7f0ff_52%,#a9bfd8_100%)]'
    : 'bg-[linear-gradient(180deg,#fff2a9_0%,#d4af37_46%,#8f6b13_100%)]';
  const scriptTone = isClassic ? 'text-white' : 'text-[#f4d87a]';
  const lineTone = isClassic ? 'bg-white/40' : 'bg-gradient-to-l from-[#d4af37] to-transparent';
  const lineToneRight = isClassic ? 'bg-white/40' : 'bg-gradient-to-r from-[#d4af37] to-transparent';
  const descriptorTone = isClassic ? 'text-white/78' : 'text-[#e9ca62]';
  const descriptorLineLeft = isClassic ? 'bg-gradient-to-l from-white/45 to-transparent' : 'bg-gradient-to-l from-[#d4af37]/70 to-transparent';
  const descriptorLineRight = isClassic ? 'bg-gradient-to-r from-white/45 to-transparent' : 'bg-gradient-to-r from-[#d4af37]/70 to-transparent';

  return (
    <div className={`inline-flex min-w-0 ${identityWidth} max-w-full flex-col items-start text-left ${align === 'center' ? 'mx-auto' : ''} ${className}`}>
      <div className={`grid w-full grid-cols-[0.28fr_minmax(0,0.72fr)] items-center ${identityGap}`}>
        <LogoMark
          src={src}
          alt={alt}
          size="w-full"
          artScale={compact ? 'scale-[1.38]' : 'scale-[1.44]'}
          className="drop-shadow-[0_16px_34px_rgba(0,0,0,0.42)]"
        />
        <div className="min-w-0 self-center text-center">
          <div className="inline-flex max-w-full flex-col">
            <div
              className={`${titleSize} ${titleTone} overflow-visible px-2 bg-clip-text font-serif font-semibold leading-none tracking-[0.055em] text-transparent drop-shadow-[0_8px_20px_rgba(0,0,0,0.34)] sm:tracking-[0.065em] xl:tracking-[0.08em]`}
            >
              DESTINOS
            </div>
            <div className={`mt-1 flex items-center gap-3 ${scriptTone} sm:mt-2`}>
              <span className={`h-px min-w-8 flex-1 ${lineTone}`} />
              <span className={`${scriptSize} whitespace-nowrap font-serif italic leading-none`}>
                pelo mundo
              </span>
              <span className={`h-px min-w-8 flex-1 ${lineToneRight}`} />
            </div>

            {ribbonLabel ? (
              <div className="mt-[clamp(0.65rem,1.8vw,1rem)] w-full">
                <div className="relative overflow-hidden bg-[linear-gradient(90deg,#9b7415_0%,#f0d46f_24%,#b88b24_52%,#f6dc79_78%,#9b7415_100%)] px-[clamp(1rem,2vw,1.5rem)] py-[clamp(0.45rem,1vw,0.65rem)] text-center shadow-[0_14px_28px_rgba(0,0,0,0.28)]">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.28)_42%,transparent_48%,transparent_100%)]" />
                  <div className={`relative font-serif font-semibold uppercase ${ribbonSize} tracking-[0.28em] text-[#071428] sm:tracking-[0.34em]`}>
                    {ribbonLabel}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className={`mt-[clamp(0.8rem,2vw,1.25rem)] flex w-full items-center justify-center gap-3 ${descriptorTone}`}>
        <span className={`h-px min-w-10 flex-1 ${descriptorLineLeft}`} />
        <span className="text-center text-[clamp(0.55rem,1.3vw,0.875rem)] font-semibold uppercase tracking-[0.34em] sm:tracking-[0.38em]">
          {descriptor}
        </span>
        <span className={`h-px min-w-10 flex-1 ${descriptorLineRight}`} />
      </div>
    </div>
  );
}

export function LogoWatermark({
  src,
  alt,
  position = 'right',
  opacity = 'opacity-10',
  verticalClassName = 'bottom-6',
  size = 'h-32 xl:h-52',
}: {
  src: string;
  alt: string;
  position?: 'left' | 'right' | 'center';
  opacity?: string;
  verticalClassName?: string;
  size?: string;
}) {
  const positionClass = position === 'left' ? 'left-6' : position === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-6';

  return (
    <div className={`pointer-events-none absolute ${verticalClassName} ${positionClass} hidden lg:block ${opacity}`}>
      <LogoMark src={src} alt={alt} size={size} className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]" artScale="scale-[1.9]" artOffset="translate-x-0" />
    </div>
  );
}

export function SectionTitle({
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
      <h2 className={`text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl ${light ? 'text-white' : 'text-slate-950'}`}>
        {title}
      </h2>
      {text ? <p className={`mt-4 text-base md:text-lg ${light ? 'text-white/70' : 'text-slate-600'}`}>{text}</p> : null}
    </div>
  );
}
