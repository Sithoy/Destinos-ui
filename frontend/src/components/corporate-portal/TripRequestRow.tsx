import { ChevronRight } from 'lucide-react';
import type { CorporatePortalTheme, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';
import { ServiceChipList } from './ServiceChipList';
import { TripStatusBadge } from './TripStatusBadge';

function currency(value?: number) {
  return value ? `$${value.toLocaleString('en-US')}` : '-';
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
            ? 'border-[#d9b46f]/40 bg-[#d9b46f]/10'
            : 'border-[#d9b46f]/40 bg-[#fff7df]'
          : styles.surface
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold">{trip.id}</div>
          <TripStatusBadge status={trip.status} theme={theme} />
        </div>
        <div className="mt-1.5 text-sm">
          {trip.travelers.length} traveler{trip.travelers.length === 1 ? '' : 's'} - {trip.route}
        </div>
        <div className={`mt-1 text-[11px] ${styles.muted}`}>
          {trip.department} - requested by {trip.requestedBy} - {trip.travelDate}
        </div>
        <div className="mt-2.5">
          <ServiceChipList services={trip.services} theme={theme} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        <div className="text-right">
          <div className="font-semibold">{currency(currentTripCost(trip))}</div>
          <div className={`text-[11px] ${styles.muted}`}>Current tracked cost</div>
        </div>
        <ChevronRight className={`h-4 w-4 ${styles.muted}`} />
      </div>
    </button>
  );
}
