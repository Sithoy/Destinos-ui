import { TripRequestRow } from '../../components/corporate-portal/TripRequestRow';
import type { CorporatePortalTheme, CorporateRequestFilter, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

export function CorporateRequestsPage({
  allRequests,
  requests,
  selectedRequestId,
  onOpenRequest,
  theme,
  activeFilter,
  onFilterChange,
  onOpenApprovals,
}: {
  allRequests: CorporateTripRequest[];
  requests: CorporateTripRequest[];
  selectedRequestId?: string | null;
  onOpenRequest: (tripId: string) => void;
  theme: CorporatePortalTheme;
  activeFilter: CorporateRequestFilter;
  onFilterChange: (filter: CorporateRequestFilter) => void;
  onOpenApprovals: () => void;
}) {
  const pendingCount = allRequests.filter((trip) => trip.approvals.some((approval) => approval.status === 'Pending')).length;
  const documentCount = allRequests.filter((trip) => trip.status === 'Needs documents').length;
  const styles = corporatePortalThemeStyles[theme];
  const filterItems: Array<{ id: CorporateRequestFilter; label: string; count: number }> = [
    { id: 'all', label: 'All requests', count: allRequests.length },
    { id: 'active', label: 'Pending attention', count: pendingCount },
    { id: 'documents', label: 'Document alerts', count: documentCount },
    { id: 'booked', label: 'Booked trips', count: allRequests.filter((trip) => trip.status === 'Booked' || trip.status === 'Completed').length },
  ];

  return (
    <section className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Corporate requests</h2>
          <p className={`mt-1 text-sm ${styles.muted}`}>A company-level queue for requests, approvals, quotes, document gaps, and booked movement.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[330px]">
          <div className={`rounded-xl border px-3 py-2.5 ${styles.surface}`}>
            <div className={styles.muted}>Open queue</div>
            <div className="mt-1 text-base font-semibold">{allRequests.length}</div>
          </div>
          <div className={`rounded-xl border px-3 py-2.5 ${styles.surface}`}>
            <div className={styles.muted}>Pending approvals</div>
            <div className="mt-1 text-base font-semibold text-[#d9b46f]">{pendingCount}</div>
          </div>
          <div className={`rounded-xl border px-3 py-2.5 ${styles.surface}`}>
            <div className={styles.muted}>Doc alerts</div>
            <div className="mt-1 text-base font-semibold text-amber-300">{documentCount}</div>
          </div>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filterItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              activeFilter === item.id
                ? 'border-[#d9b46f]/35 bg-[#d9b46f]/10 text-[#d9b46f]'
                : styles.buttonGhost
            }`}
          >
            <span>{item.label}</span>
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{item.count}</span>
          </button>
        ))}
        <button type="button" onClick={onOpenApprovals} className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm ${styles.buttonSecondary}`}>
          Open approvals
        </button>
      </div>
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className={`rounded-xl border p-6 text-center text-sm ${styles.surface} ${styles.muted}`}>
            No requests match this view yet.
          </div>
        ) : (
          requests.map((trip) => (
            <TripRequestRow key={trip.id} trip={trip} active={selectedRequestId === trip.id} onOpen={onOpenRequest} theme={theme} />
          ))
        )}
      </div>
    </section>
  );
}
