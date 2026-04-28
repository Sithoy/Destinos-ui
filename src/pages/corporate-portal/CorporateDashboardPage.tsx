import { ArrowRight, CheckCircle2, FileWarning, FolderKanban, PlusSquare } from 'lucide-react';
import { CorporateStatCard } from '../../components/corporate-portal/CorporateStatCard';
import { TripRequestRow } from '../../components/corporate-portal/TripRequestRow';
import { TimelinePanel } from '../../components/corporate-portal/TimelinePanel';
import type { CorporatePortalStat, CorporatePortalTheme, CorporateTimelineEvent, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

export function CorporateDashboardPage({
  requests,
  stats,
  activityTimeline,
  onOpenRequest,
  onOpenApprovals,
  onOpenNewTrip,
  onStatClick,
  theme,
}: {
  requests: CorporateTripRequest[];
  stats: CorporatePortalStat[];
  activityTimeline: CorporateTimelineEvent[];
  onOpenRequest: (tripId: string) => void;
  onOpenApprovals: () => void;
  onOpenNewTrip: () => void;
  onStatClick: (statId: CorporatePortalStat['id']) => void;
  theme: CorporatePortalTheme;
}) {
  const recentRequests = requests.slice(0, 3);
  const needsDocuments = requests.filter((trip) => trip.status === 'Needs documents');
  const pendingApprovals = requests.filter((trip) => trip.approvals.some((approval) => approval.status === 'Pending'));
  const styles = corporatePortalThemeStyles[theme];

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.5fr_0.82fr]">
      <div className="flex min-h-0 flex-col gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#d9b46f]">
                <FolderKanban className="h-4 w-4" />
                Dashboard
              </div>
              <h2 className="text-xl font-semibold md:text-[1.55rem]">Manage group travel through one corporate desk.</h2>
              <p className={`mt-1.5 max-w-2xl text-sm leading-6 ${styles.soft}`}>
                Keep requests, approvals, traveler readiness, quotes, and DPM operational movement in one company workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenNewTrip}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${styles.buttonPrimary}`}
              >
                <PlusSquare className="h-4 w-4" />
                New Trip
              </button>
              <button
                type="button"
                onClick={onOpenApprovals}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${styles.buttonSecondary}`}
              >
                Review approvals
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <CorporateStatCard key={stat.label} stat={stat} theme={theme} onClick={onStatClick} />
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Recent requests</h3>
              <p className={`text-sm ${styles.muted}`}>Track company requests moving through approval, quote, and booking.</p>
            </div>
          </div>
          <div className="space-y-3">
            {recentRequests.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${styles.surface} ${styles.muted}`}>
                No trip requests yet. Create the first corporate request to start the workflow.
              </div>
            ) : (
              recentRequests.map((trip) => (
                <TripRequestRow key={trip.id} trip={trip} onOpen={onOpenRequest} theme={theme} />
              ))
            )}
          </div>
        </div>
      </div>

      <aside className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <h3 className="text-base font-semibold">Approvals pressure</h3>
          </div>
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${styles.surface} ${styles.muted}`}>
                No approval queues are waiting right now.
              </div>
            ) : (
              pendingApprovals.slice(0, 3).map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => onOpenRequest(trip.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left ${styles.surface}`}
                >
                  <div className="font-medium">{trip.id}</div>
                  <div className={`mt-1 text-xs ${styles.muted}`}>{trip.route}</div>
                  <div className="mt-1 text-xs text-[#d9b46f]">
                    {trip.approvals.filter((approval) => approval.status === 'Pending').length} approval stage(s) still open
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-300" />
            <h3 className="text-base font-semibold">Document alerts</h3>
          </div>
          <div className="space-y-3">
            {needsDocuments.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${styles.surface} ${styles.muted}`}>
                All travelers currently attached to open trips look document-ready.
              </div>
            ) : (
              needsDocuments.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => onOpenRequest(trip.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left ${styles.surface}`}
                >
                  <div className="font-medium">{trip.id}</div>
                  <div className={`mt-1 text-xs ${styles.muted}`}>{trip.travelers.length} travelers - {trip.destination}</div>
                  <div className="mt-1 text-xs text-amber-300">Passport or visa input still needed</div>
                </button>
              ))
            )}
          </div>
        </div>

        <TimelinePanel title="Recent activity" events={activityTimeline} theme={theme} />
      </aside>
    </section>
  );
}
