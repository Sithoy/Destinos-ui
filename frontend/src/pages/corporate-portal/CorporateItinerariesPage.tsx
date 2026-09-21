import type { CorporatePortalTheme, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

export function CorporateItinerariesPage({ requests, theme, onOpenRequest }: {
  requests: CorporateTripRequest[];
  theme: CorporatePortalTheme;
  onOpenRequest: (id: string) => void;
}) {
  const styles = corporatePortalThemeStyles[theme];
  const trips = requests.filter((trip) => trip.booking && ['confirmed', 'ticketed', 'completed'].includes(trip.booking.status));
  return <section className={`rounded-xl border p-5 ${styles.panel}`}>
    <h2 className="text-xl font-semibold">Itineraries</h2>
    <p className={`mt-2 text-sm ${styles.muted}`}>Confirmed travel, supplier references, and travel packs.</p>
    {trips.length === 0 ? <p className={`mt-6 ${styles.muted}`}>No confirmed itineraries yet. They will appear after DPM confirms a booking.</p> :
      <div className="mt-5 grid gap-3 md:grid-cols-2">{trips.map((trip) => <button key={trip.id} type="button" onClick={() => onOpenRequest(trip.id)} className={`rounded-xl border p-4 text-left ${styles.surface}`}>
        <div className="font-semibold">{trip.origin} → {trip.destination}</div>
        <div className={`mt-2 text-sm ${styles.muted}`}>{trip.id} · {trip.booking?.bookingReference}</div>
        <div className="mt-3 text-sm underline">View itinerary and travel pack</div>
      </button>)}</div>}
  </section>;
}
