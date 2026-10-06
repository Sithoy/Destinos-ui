import { opsText, opsLocale, opsDate } from '../../locales/operations';
import { ChevronRight } from 'lucide-react';
import type { CorporatePortalTheme, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';
import { ServiceChipList } from './ServiceChipList';
import { TripStatusBadge } from './TripStatusBadge';

function currency(value?: number) {
  return value ? `$${value.toLocaleString(opsLocale())}` : '-';
}

function currentTripCost(trip: CorporateTripRequest) {
  return trip.finalCost ?? trip.quotedCost;
}

export function TripRequestRow({
  trip,
  active = false,
  onOpen,
  theme,
}: {
  trip: CorporateTripRequest;
  active?: boolean;
  onOpen: (tripId: string) => void;
  theme: CorporatePortalTheme;
}) {
  const styles = corporatePortalThemeStyles[theme];

  return (
    <button
      type="button"
      onClick={() => onOpen(trip.id)}
      className={`grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl border p-3.5 text-left transition ${
        active
          ? theme === 'dark'
            ? 'border-[#fe8500]/40 bg-[#fe8500]/10'
            : 'border-[#fe8500]/40 bg-[#fff7df]'
          : styles.surface
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold">{trip.id}</div>
          <TripStatusBadge status={trip.status} theme={theme} />
        </div>
        <div className="mt-1.5 text-sm">
          {trip.travelers.length} {opsText(trip.travelers.length === 1 ? 'Traveler' : 'Travelers')} - {trip.route}
        </div>
        <div className={`mt-1 text-[11px] ${styles.muted}`}>
          {trip.department} {opsText("- requested by")}{' '}{trip.requestedBy} - {opsDate(trip.travelDate)}
        </div>
        <div className="mt-2.5">
          <ServiceChipList services={trip.services} theme={theme} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        <div className="text-right">
          <div className="font-semibold">{currency(currentTripCost(trip))}</div>
          <div className={`text-[11px] ${styles.muted}`}>{opsText("Current tracked cost")}</div>
        </div>
        <ChevronRight className={`h-4 w-4 ${styles.muted}`} />
      </div>
    </button>
  );
}
