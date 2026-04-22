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
  taglineClassName?: string;
}) {
  const { t } = useTranslation();
  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const wordColor = theme === 'dark' ? 'text-slate-900' : theme === 'gold' ? 'text-[#e8ce76]' : 'text-white';
  const subColor = theme === 'dark' ? 'text-slate-600' : theme === 'gold' ? 'text-white/70' : 'text-white/72';
  const resolvedGap = gapClass ?? (compact ? 'gap-4 sm:gap-5 md:gap-7' : 'gap-5 sm:gap-6 md:gap-10');
  const resolvedLogoSize = logoSize ?? (compact ? 'h-10 sm:h-12 md:h-16' : 'h-14 sm:h-16 md:h-24');
  const resolvedLogoScale = logoArtScale ?? (compact ? 'scale-[1.55] md:scale-[1.65]' : 'scale-[1.65] md:scale-[1.8]');

  return (
    <div className={`flex ${resolvedGap} ${alignClass}`}>
      <LogoMark src={src} alt={alt} size={resolvedLogoSize} className="shrink-0" artScale={resolvedLogoScale} />
      <div className="min-w-0">
        <div className={`whitespace-nowrap font-semibold uppercase tracking-[0.22em] sm:tracking-[0.28em] ${compact ? 'text-[9px] sm:text-[10px] md:text-xs' : 'text-[10px] sm:text-xs md:text-sm'} ${wordColor}`}>
          Destinos
        </div>
        <div className={`whitespace-nowrap ${compact ? 'mt-0.5 text-base sm:text-xl md:text-2xl' : 'mt-1 text-xl sm:text-2xl md:text-4xl'} font-semibold leading-none ${wordColor}`}>
          pelo mundo
        </div>
        <div className={`${taglineClassName} ${compact ? 'mt-1 text-[9px] sm:text-[10px] md:text-xs' : 'mt-2 text-[10px] sm:text-xs md:text-sm'} uppercase tracking-[0.2em] sm:tracking-[0.28em] ${subColor}`}>
          {theme === 'gold' ? t('brand.prestigeTravel') : t('brand.turismo')}
        </div>
      </div>
    </div>
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
  const logoSize = compact ? 'h-12 sm:h-16 md:h-20 lg:h-24' : 'h-16 sm:h-24 md:h-32 lg:h-44';
  const titleSize = compact ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl' : 'text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl';
  const scriptSize = compact ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';
  const ribbonSize = compact ? 'text-base sm:text-lg md:text-xl lg:text-2xl' : 'text-base sm:text-xl md:text-2xl lg:text-3xl';
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
    <div className={`inline-flex w-fit max-w-full flex-col items-start text-left ${align === 'center' ? 'mx-auto' : ''} ${className}`}>
      <div className="grid w-fit max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-5 md:gap-8 lg:gap-10">
        <LogoMark
          src={src}
          alt={alt}
          size={logoSize}
          artScale="scale-[1.5] sm:scale-[1.58]"
          className="drop-shadow-[0_16px_34px_rgba(0,0,0,0.42)]"
        />
        <div className="min-w-0 self-center text-center">
          <div className="inline-flex max-w-full flex-col">
            <div
              className={`${titleSize} ${titleTone} px-1 bg-clip-text font-serif font-semibold leading-none tracking-[0.08em] text-transparent drop-shadow-[0_8px_20px_rgba(0,0,0,0.34)]`}
            >
              DESTINOS
            </div>
            <div className={`mt-1 flex items-center gap-3 ${scriptTone} sm:mt-2`}>
              <span className={`hidden h-px flex-1 ${lineTone} sm:block`} />
              <span className={`${scriptSize} whitespace-nowrap font-serif italic leading-none`}>
                pelo mundo
              </span>
              <span className={`hidden h-px flex-1 ${lineToneRight} sm:block`} />
            </div>

            {ribbonLabel ? (
              <div className="mt-4 w-full">
                <div className="relative overflow-hidden bg-[linear-gradient(90deg,#9b7415_0%,#f0d46f_24%,#b88b24_52%,#f6dc79_78%,#9b7415_100%)] px-5 py-2 text-center shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:px-6 sm:py-2.5">
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
      <div className={`mt-5 flex w-full items-center justify-center gap-3 ${descriptorTone}`}>
        <span className={`h-px min-w-10 flex-1 ${descriptorLineLeft}`} />
        <span className="text-center text-[9px] font-semibold uppercase tracking-[0.34em] sm:text-xs sm:tracking-[0.38em] md:text-sm">
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
