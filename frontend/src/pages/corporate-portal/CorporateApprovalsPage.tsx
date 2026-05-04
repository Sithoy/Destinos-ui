import { Check, X } from 'lucide-react';
import type { CorporateApprovalFilter, CorporateApprovalStage, CorporatePortalTheme, CorporateTripRequest } from '../../types/corporatePortal';
import { ServiceChipList } from '../../components/corporate-portal/ServiceChipList';
import { TripStatusBadge } from '../../components/corporate-portal/TripStatusBadge';
import { corporatePortalThemeStyles } from './portalTheme';

function approvalSummary(trip: CorporateTripRequest) {
  return trip.approvals.filter((approval) => approval.status === 'Pending');
}

export function CorporateApprovalsPage({
  allRequests,
  requests,
  onOpenRequest,
  onApprove,
  onReject,
  theme,
  activeFilter,
  onFilterChange,
  onOpenRequests,
}: {
  allRequests: CorporateTripRequest[];
  requests: CorporateTripRequest[];
  onOpenRequest: (tripId: string) => void;
  onApprove: (tripId: string, stage: CorporateApprovalStage) => void;
  onReject: (tripId: string, stage: CorporateApprovalStage) => void;
  theme: CorporatePortalTheme;
  activeFilter: CorporateApprovalFilter;
  onFilterChange: (filter: CorporateApprovalFilter) => void;
  onOpenRequests: () => void;
}) {
  const pendingRequests = requests.filter((trip) => approvalSummary(trip).length > 0);
  const styles = corporatePortalThemeStyles[theme];
  const filterItems: Array<{ id: CorporateApprovalFilter; label: string; count: number }> = [
    { id: 'all', label: 'All approvals', count: allRequests.filter((trip) => approvalSummary(trip).length > 0).length },
    { id: 'travelNeed', label: 'Travel need', count: allRequests.filter((trip) => trip.approvals.some((approval) => approval.status === 'Pending' && approval.stage === 'Travel need')).length },
    { id: 'finalCost', label: 'Final cost', count: allRequests.filter((trip) => trip.approvals.some((approval) => approval.status === 'Pending' && approval.stage === 'Final cost')).length },
  ];

  return (
    <section className={`rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">Approvals queue</h2>
        <p className={`mt-2 max-w-2xl text-sm leading-6 ${styles.muted}`}>
          Review travel need and final-cost decisions without leaving the corporate workflow.
        </p>
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
        <button type="button" onClick={onOpenRequests} className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm ${styles.buttonSecondary}`}>
          Open requests
        </button>
      </div>

      {pendingRequests.length === 0 ? (
        <div className={`rounded-xl border p-6 text-center text-sm ${styles.surface} ${styles.muted}`}>
          No approval decisions are waiting right now.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((trip) => {
            const pendingStages = approvalSummary(trip);
            return (
              <div key={trip.id} className={`rounded-xl border p-5 ${styles.surface}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => onOpenRequest(trip.id)} className="font-semibold hover:text-[#d9b46f]">
                        {trip.id}
                      </button>
                      <TripStatusBadge status={trip.status} theme={theme} />
                    </div>
                    <div className="text-sm">
                      {trip.route} - {trip.travelers.length} traveler{trip.travelers.length === 1 ? '' : 's'}
                    </div>
                    <div className={`mt-1 text-xs ${styles.muted}`}>
                      {trip.department} - requested by {trip.requestedBy} - {trip.travelDate}
                    </div>
                    <div className={`mt-3 max-w-2xl text-sm leading-6 ${styles.soft}`}>{trip.purpose}</div>
                    <div className="mt-3">
                      <ServiceChipList services={trip.services} theme={theme} />
                    </div>
                  </div>

                  <div className="grid gap-3 xl:min-w-[360px]">
                    {pendingStages.map((approval) => (
                      <div key={`${trip.id}-${approval.stage}`} className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{approval.stage}</div>
                            <div className={`mt-1 text-sm ${styles.muted}`}>{approval.approver}</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs ${theme === 'dark' ? 'bg-sky-500/12 text-sky-200' : 'bg-sky-50 text-sky-800'}`}>Pending</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onApprove(trip.id, approval.stage)}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white"
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject(trip.id, approval.stage)}
                            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${theme === 'dark' ? 'border-rose-300/20 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
