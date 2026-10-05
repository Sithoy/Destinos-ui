import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, CalendarDays, CheckSquare, Mail, Sunrise } from 'lucide-react';
import { CRM_EVENT, fetchCrmMyDay } from '../../../data/crm';
import type { CrmMyDayResponse, CrmSession } from '../../../types';
import type { CrmSurfaceStyles } from '../shared/types';
import { myDaySections, myDayTotalCount, type MyDaySection } from './myDayLogic';

type MyDayProps = {
  session: CrmSession | null;
  styles: CrmSurfaceStyles;
  onOpenLead: (leadId: string) => void;
};

const sectionIcons: Record<MyDaySection['key'], typeof Mail> = {
  waitingClients: Mail,
  expiringSupplierHolds: AlertTriangle,
  pendingApprovals: Bell,
  upcomingDepartures: CalendarDays,
  overdueTasks: AlertTriangle,
  todayTasks: CheckSquare,
};

export function MyDay({ session, styles, onOpenLead }: MyDayProps) {
  const [data, setData] = useState<CrmMyDayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    try {
      const next = await fetchCrmMyDay(session);
      if (next) setData(next);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load My Day.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener(CRM_EVENT, onRefresh);
    return () => window.removeEventListener(CRM_EVENT, onRefresh);
  }, [refresh]);

  if (!session?.token) {
    return <div className={`rounded-xl border p-5 text-sm ${styles.panel}`}>My Day needs the CRM backend connection.</div>;
  }

  if (isLoading && !data) {
    return <div className={`rounded-xl border px-4 py-3 text-sm ${styles.panelSoft}`}>Loading your day...</div>;
  }

  if (error && !data) {
    return <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>;
  }

  if (!data) return null;

  const sections = myDaySections(data);
  const visibleSections = sections.filter((section) => section.items.length > 0);

  return (
    <div className="grid gap-5">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${styles.panel}`}>
        <div className="flex items-center gap-3">
          <span className="crm-metric-icon flex h-9 w-9 items-center justify-center rounded-xl">
            <Sunrise className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{data.scope === 'team' ? 'Team view' : 'My work'}</div>
            <div className={`text-xs ${styles.muted}`}>
              {myDayTotalCount(data)} item(s) need attention
              {isLoading ? ' · refreshing…' : ''}
            </div>
          </div>
        </div>
        {error ? <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}
      </div>

      {visibleSections.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${styles.panel}`}>
          <CheckSquare className={`mx-auto h-10 w-10 ${styles.muted}`} />
          <div className="mt-4 text-lg font-semibold">Nothing needs your attention right now</div>
          <p className={`mt-2 text-sm ${styles.muted}`}>New client follow-ups, expiring holds, approvals, and tasks will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {visibleSections.map((section) => {
            const Icon = sectionIcons[section.key];
            return (
              <section key={section.key} className={`rounded-xl border p-5 ${styles.panel}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="crm-metric-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold">{section.title}</h2>
                      <p className={`mt-1 text-xs ${styles.muted}`}>{section.subtitle}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${section.key === 'overdueTasks' || section.key === 'expiringSupplierHolds' ? 'bg-red-500 text-white' : styles.buttonGhost}`}>
                    {section.count}
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenLead(item.leadId)}
                      className={`rounded-lg border p-3 text-left transition ${styles.row}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate text-sm font-semibold">{item.title}</div>
                        {item.owner ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{item.owner}</span> : null}
                      </div>
                      <div className={`mt-1 text-xs ${styles.muted}`}>{item.detail}</div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
