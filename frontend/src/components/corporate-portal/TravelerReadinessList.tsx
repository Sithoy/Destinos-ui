import type { CorporatePortalTheme, CorporateTraveler } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

export function TravelerReadinessList({ travelers, theme }: { travelers: CorporateTraveler[]; theme: CorporatePortalTheme }) {
  const styles = corporatePortalThemeStyles[theme];

  return (
    <div className="space-y-2">
      {travelers.map((traveler) => (
        <div key={traveler.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${styles.surface}`}>
          <div className="min-w-0">
            <div className="truncate font-medium">{traveler.name}</div>
            <div className={`mt-0.5 truncate text-xs ${styles.muted}`}>{traveler.department}</div>
          </div>
          <div className="shrink-0 text-right text-[11px] leading-5">
            <div className={traveler.readiness.passport === 'OK' ? 'text-emerald-300' : 'text-amber-300'}>
              Passport {traveler.readiness.passport}
            </div>
            <div className={traveler.readiness.visa === 'OK' || traveler.readiness.visa === 'N/A' ? styles.soft : 'text-amber-300'}>
              Visa {traveler.readiness.visa}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
