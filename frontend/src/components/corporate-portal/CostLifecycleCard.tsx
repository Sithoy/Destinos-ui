import { corporateCostBands } from '../../data/corporatePortal';
import type { CorporatePortalTheme, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

function currency(value?: number) {
  return value ? `$${value.toLocaleString('en-US')}` : '-';
}

export function CostLifecycleCard({ trip, theme }: { trip: CorporateTripRequest; theme: CorporatePortalTheme }) {
  const budgetBand = corporateCostBands.find((item) => item.key === trip.budgetBand) ?? corporateCostBands[0];
  const styles = corporatePortalThemeStyles[theme];

  return (
    <div className="grid grid-cols-3 gap-2 text-center text-xs">
      <div className={`rounded-xl border p-3 ${styles.surface}`}>
        <div className={styles.muted}>Budget range</div>
        <div className="mt-1 font-semibold">{budgetBand.label}</div>
      </div>
      <div className={`rounded-xl border p-3 ${styles.surface}`}>
        <div className={styles.muted}>DPM quote</div>
        <div className="mt-1 font-semibold text-[#d9b46f]">{currency(trip.quotedCost)}</div>
      </div>
      <div className={`rounded-xl border p-3 ${styles.surface}`}>
        <div className={styles.muted}>Final cost</div>
        <div className="mt-1 font-semibold text-emerald-400">{currency(trip.finalCost)}</div>
      </div>
    </div>
  );
}
