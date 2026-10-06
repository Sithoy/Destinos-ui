import { opsText } from '../../locales/operations';
import { BarChart3, CalendarDays, ClipboardCheck, ClipboardList, LayoutDashboard, PlusSquare, Users } from 'lucide-react';
import { BrandLockup } from '../ui';
import { classicLogo, ctmPrimaryRoute } from '../../data/travel';
import type { CorporatePortalTheme } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, href: ctmPrimaryRoute },
  { id: 'newTrip', label: 'New Trip', Icon: PlusSquare, href: `${ctmPrimaryRoute}/new-trip` },
  { id: 'requests', label: 'Requests', Icon: ClipboardList, href: `${ctmPrimaryRoute}/requests` },
  { id: 'approvals', label: 'Approvals', Icon: ClipboardCheck, href: `${ctmPrimaryRoute}/approvals` },
  { id: 'itineraries', label: 'Itineraries', Icon: CalendarDays, href: `${ctmPrimaryRoute}/itineraries` },
  { id: 'travelers', label: 'Travelers', Icon: Users, href: `${ctmPrimaryRoute}/travelers` },
  { id: 'reports', label: 'Reports', Icon: BarChart3, href: `${ctmPrimaryRoute}/reports` },
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
    <aside className={`flex min-w-0 flex-col border-b px-4 py-3 xl:min-h-screen xl:border-r xl:py-5 ${styles.sidebar}`}>
      <div className="ctm-brand mb-3 max-w-[208px] xl:mb-7">
        <BrandLockup
          src={classicLogo}
          alt="Destinos pelo Mundo"
          theme={styles.brandTheme}
          compact
          align="left"
          gapClass="gap-2.5"
          logoSize="h-[52px]"
          logoArtScale="scale-[1.55]"
          logoArtOffset="translate-x-0"
          wordmarkWidthClass="w-[8.5rem]"
        />
      </div>

      <label className="crm-mobile-nav md:hidden">{opsText("Workspace")}<select value={navItems.find(({ href }) => activeHref === href || (href !== ctmPrimaryRoute && activeHref.startsWith(href)))?.href ?? ctmPrimaryRoute} onChange={(event) => onNavigate(event.target.value)}>
          {navItems.map(({ href, label }) => <option key={href} value={href}>{opsText(label)}</option>)}
        </select>
      </label>
      <div className="crm-sidebar-caption">{opsText("Corporate travel")}</div>
      <nav aria-label={opsText("CTM navigation")} className="hidden gap-2 overflow-x-auto md:flex xl:grid">
        {navItems.map(({ id, label, Icon, href }) => {
          const active = activeHref === href || (href !== ctmPrimaryRoute && activeHref.startsWith(href));
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(href)}
              aria-current={active ? 'page' : undefined}
              className="crm-nav-item flex h-12 shrink-0 items-center gap-3 px-3 text-left font-medium transition"
            >
              <Icon className="h-4 w-4" />
              <span>{opsText(label)}</span>
            </button>
          );
        })}
      </nav>

      <div className="ctm-sidebar-note mt-6 mb-6 hidden rounded-xl xl:block border p-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#a5b9c1]">{opsText("Your company workspace")}</div>
        <div className="text-sm font-semibold">{opsText("From travel request to a confirmed journey.")}</div>
      </div>

      <a
        href="https://etios.net"
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-auto hidden items-center xl:flex gap-3 rounded-xl p-3 ring-1 transition ${styles.etios}`}
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
