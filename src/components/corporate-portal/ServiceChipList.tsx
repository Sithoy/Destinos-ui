import type { CorporatePortalTheme, CorporateServiceType } from '../../types/corporatePortal';

export function ServiceChipList({ services, theme }: { services: CorporateServiceType[]; theme: CorporatePortalTheme }) {
  const chipClass =
    theme === 'dark'
      ? 'border-white/10 bg-white/6 text-slate-300'
      : 'border-slate-200 bg-slate-100 text-slate-700';

  return (
    <div className="flex flex-wrap gap-1.5">
      {services.map((service) => (
        <span key={service} className={`rounded-full border px-2.5 py-1 text-[11px] ${chipClass}`}>
          {service}
        </span>
      ))}
    </div>
  );
}
