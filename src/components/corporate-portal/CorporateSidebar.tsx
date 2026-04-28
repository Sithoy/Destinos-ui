import { BarChart3, CalendarDays, ClipboardCheck, ClipboardList, LayoutDashboard, PlusSquare, Users } from 'lucide-react';
import { BrandLockup } from '../ui';
import { classicLogo } from '../../data/travel';
import type { CorporatePortalTheme } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, href: '/corporate-portal' },
  { id: 'newTrip', label: 'New Trip', Icon: PlusSquare, href: '/corporate-portal/new-trip' },
  { id: 'requests', label: 'Requests', Icon: ClipboardList, href: '/corporate-portal/requests' },
  { id: 'approvals', label: 'Approvals', Icon: ClipboardCheck, href: '/corporate-portal/approvals' },
  { id: 'itineraries', label: 'Itineraries', Icon: CalendarDays, href: '/corporate-portal/itineraries' },
  { id: 'travelers', label: 'Travelers', Icon: Users, href: '/corporate-portal/travelers' },
  { id: 'reports', label: 'Reports', Icon: BarChart3, href: '/corporate-portal/reports' },
];

export function CorporateSidebar({
  activeHref,
  onNavigate,
  theme,
}: {
  activeHref: string;
  onNavigate: (href: string) => void;
  theme: CorporatePortalTheme;
}) {
  const styles = corporatePortalThemeStyles[theme];

  return (
    <aside className={`hidden min-h-screen border-r px-4 py-5 xl:flex xl:flex-col ${styles.sidebar}`}>
      <div className="mb-7 max-w-[208px]">
        <BrandLockup
          src={classicLogo}
          alt="Destinos pelo Mundo"
          theme={styles.brandTheme}
          compact
          align="left"
          gapClass="gap-2.5"
          logoSize="h-10"
          logoArtScale="scale-[1.06]"
          logoArtOffset="translate-x-0"
          wordmarkWidthClass="w-[10.75rem] max-w-[calc(100vw-9rem)]"
        />
      </div>

      <nav className="grid gap-2">
        {navItems.map(({ id, label, Icon, href }) => {
          const active = activeHref === href || (href !== '/corporate-portal' && activeHref.startsWith(href));
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(href)}
              className={`flex h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition ${
                active ? 'bg-[#12305a] text-white' : styles.buttonGhost
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className={`mt-6 rounded-xl border p-3 ${styles.surface}`}>
        <div className={`mb-1 text-xs uppercase tracking-[0.22em] ${styles.muted}`}>Workflow focus</div>
        <div className="text-sm font-semibold">Need approval - quote - final approval - DPM booking</div>
      </div>

      <a
        href="https://etios.net"
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-auto flex items-center gap-3 rounded-xl p-3 ring-1 transition ${styles.etios}`}
        aria-label="Powered by ETIOS registered trademark"
      >
        <img src="/etios-icon.png" alt="" className="h-9 w-9 rounded-lg object-cover" loading="lazy" decoding="async" />
        <span className="min-w-0">
          <span className="block text-[9px] uppercase tracking-[0.2em] text-white/48">Powered by</span>
          <span className="flex items-start gap-1 text-sm font-semibold tracking-[0.2em] text-white">
            ETIOS
            <sup className="text-[8px] text-white/70">&reg;</sup>
          </span>
        </span>
      </a>
    </aside>
  );
}
