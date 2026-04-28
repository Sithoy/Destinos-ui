import { Building2, CheckCircle2, PlaneTakeoff } from 'lucide-react';
import { CostLifecycleCard } from '../../components/corporate-portal/CostLifecycleCard';
import { ServiceChipList } from '../../components/corporate-portal/ServiceChipList';
import { TimelinePanel } from '../../components/corporate-portal/TimelinePanel';
import { TravelerReadinessList } from '../../components/corporate-portal/TravelerReadinessList';
import { TripStatusBadge } from '../../components/corporate-portal/TripStatusBadge';
import type { CorporatePortalTheme, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

export function CorporateRequestDetailPage({ trip, theme }: { trip: CorporateTripRequest | null; theme: CorporatePortalTheme }) {
  const styles = corporatePortalThemeStyles[theme];

  if (!trip) {
    return (
      <section className={`rounded-xl border p-6 text-center shadow-2xl ${styles.panel}`}>
        <h2 className="text-xl font-semibold">No request selected</h2>
        <p className={`mt-2 text-sm ${styles.muted}`}>Open a trip from the requests queue or create a new one to continue.</p>
      </section>
    );
  }

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
      <div className="grid gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-[#d9b46f]">{trip.id}</span>
                <TripStatusBadge status={trip.status} theme={theme} />
              </div>
              <h2 className="text-xl font-semibold">{trip.route}</h2>
              <p className={`mt-1.5 max-w-2xl text-sm leading-6 ${styles.soft}`}>{trip.purpose}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-sm ${styles.surface}`}>
              <div className="font-medium">{trip.travelers.length} traveler{trip.travelers.length === 1 ? '' : 's'}</div>
              <div className={`mt-1 ${styles.muted}`}>{trip.travelDate}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className={`rounded-xl border p-3.5 ${styles.surface}`}>
              <div className={`flex items-center gap-2 ${styles.muted}`}>
                <Building2 className="h-4 w-4" />
                Department
              </div>
              <div className="mt-2 font-semibold">{trip.department}</div>
              <div className={`mt-1 text-xs ${styles.muted}`}>Requested by {trip.requestedBy}</div>
            </div>
            <div className={`rounded-xl border p-3.5 ${styles.surface}`}>
              <div className={`flex items-center gap-2 ${styles.muted}`}>
                <PlaneTakeoff className="h-4 w-4" />
                Services
              </div>
              <div className="mt-2.5">
                <ServiceChipList services={trip.services} theme={theme} />
              </div>
            </div>
            <div className={`rounded-xl border p-3.5 md:col-span-2 xl:col-span-1 ${styles.surface}`}>
              <div className={`flex items-center gap-2 ${styles.muted}`}>
                <CheckCircle2 className="h-4 w-4" />
                Operational summary
              </div>
              <div className={`mt-2 text-sm leading-6 ${styles.soft}`}>{trip.internalSummary}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Traveler readiness</h3>
              <div className={`text-xs ${styles.muted}`}>Documents and visa preparation</div>
            </div>
            <TravelerReadinessList travelers={trip.travelers} theme={theme} />
          </div>

          <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
            <div className="mb-3 text-base font-semibold">Approvals</div>
            <div className="space-y-2.5">
              {trip.approvals.map((approval) => (
                <div key={`${approval.stage}-${approval.approver}`} className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{approval.stage}</div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        approval.status === 'Approved'
                          ? 'bg-emerald-500/12 text-emerald-200'
                          : approval.status === 'Rejected'
                            ? 'bg-rose-500/12 text-rose-200'
                            : theme === 'dark'
                              ? 'bg-sky-500/12 text-sky-200'
                              : 'bg-sky-50 text-sky-800'
                      }`}
                    >
                      {approval.status}
                    </span>
                  </div>
                  <div className={`mt-1 text-xs ${styles.muted}`}>{approval.approver}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <TimelinePanel events={trip.timeline} theme={theme} />
      </div>

      <aside className="grid gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 text-base font-semibold">Cost lifecycle</div>
          <CostLifecycleCard trip={trip} theme={theme} />
          {trip.invoice ? (
            <div className="mt-3 grid gap-2">
              <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
                <div className={`text-xs ${styles.muted}`}>Invoice</div>
                <div className="mt-1 text-sm font-semibold">{trip.invoice.invoiceNumber}</div>
                <div className={`mt-1 text-xs ${styles.muted}`}>
                  {trip.invoice.status.replace(/_/g, ' ')} · {trip.invoice.currency} {trip.invoice.amount.toLocaleString('en-US')}
                </div>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
                <div className={`text-xs ${styles.muted}`}>Payments</div>
                <div className="mt-1 text-sm font-semibold">{trip.payments.length} recorded</div>
                <div className={`mt-1 text-xs ${styles.muted}`}>
                  {trip.payments.length > 0
                    ? `${trip.payments.filter((payment) => payment.status === 'received' || payment.status === 'reconciled').length} cleared against invoice`
                    : 'No payment captured yet'}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 text-base font-semibold">Request signals</div>
          <div className="grid gap-2">
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Origin</div>
              <div className="mt-1 text-sm font-medium">{trip.origin}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Destination</div>
              <div className="mt-1 text-sm font-medium">{trip.destination}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Services selected</div>
              <div className="mt-1 text-sm font-medium">{trip.services.length}</div>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
