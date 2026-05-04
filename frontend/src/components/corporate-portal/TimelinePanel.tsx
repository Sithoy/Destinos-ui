import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import type { CorporatePortalTheme, CorporateTimelineEvent } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

function TimelineIcon({ type }: { type: CorporateTimelineEvent['type'] }) {
  if (type === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (type === 'pending') return <Clock3 className="h-4 w-4 text-sky-300" />;
  return <AlertTriangle className="h-4 w-4 text-amber-300" />;
}

export function TimelinePanel({ title = 'Service timeline', events, theme }: { title?: string; events: CorporateTimelineEvent[]; theme: CorporatePortalTheme }) {
  const styles = corporatePortalThemeStyles[theme];

  return (
    <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
      <div className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className={`mt-1 text-xs leading-5 ${styles.muted}`}>Shared operational history between company and DPM.</p>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3">
            <div className="mt-1">
              <TimelineIcon type={event.type} />
            </div>
            <div className={`min-w-0 flex-1 border-b pb-2.5 last:border-b-0 last:pb-0 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{event.title}</div>
                <div className={`text-xs ${styles.muted}`}>{event.time}</div>
              </div>
              <div className={`mt-1 text-xs leading-5 ${styles.muted}`}>{event.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
