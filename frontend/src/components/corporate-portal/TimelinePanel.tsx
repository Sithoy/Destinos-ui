import { AlertTriangle, CheckCircle2, Clock3, MessageSquare, ReceiptText } from 'lucide-react';
import type { CorporatePortalTheme, CorporateTimelineEvent } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

export type TimelineSource = 'DPM' | 'Company' | 'Finance' | 'Documents' | 'Messages' | 'System';

export type UnifiedTimelineEvent = CorporateTimelineEvent & {
  source?: TimelineSource;
  sortAt?: string;
};

function TimelineIcon({ type, source }: { type: CorporateTimelineEvent['type']; source?: TimelineSource }) {
  if (source === 'Messages') return <MessageSquare className="h-4 w-4 text-sky-300" />;
  if (source === 'Finance') return <ReceiptText className="h-4 w-4 text-[#d9b46f]" />;
  if (type === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (type === 'pending') return <Clock3 className="h-4 w-4 text-sky-300" />;
  return <AlertTriangle className="h-4 w-4 text-amber-300" />;
}

function sourceTone(source: TimelineSource | undefined, theme: CorporatePortalTheme) {
  if (source === 'DPM') return 'border-sky-400/25 bg-sky-500/10 text-sky-200';
  if (source === 'Company') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  if (source === 'Finance') return 'border-[#d9b46f]/25 bg-[#d9b46f]/10 text-[#d9b46f]';
  if (source === 'Documents') return 'border-violet-400/25 bg-violet-500/10 text-violet-200';
  if (source === 'Messages') return 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200';
  return theme === 'dark' ? 'border-white/10 bg-white/[0.04] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600';
}

export function TimelinePanel({
  title = 'Service timeline',
  events,
  theme,
}: {
  title?: string;
  events: UnifiedTimelineEvent[];
  theme: CorporatePortalTheme;
}) {
  const styles = corporatePortalThemeStyles[theme];
  const visibleEvents = events.slice(0, 14);

  return (
    <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className={`mt-1 text-xs leading-5 ${styles.muted}`}>Shared operational history between company and DPM.</p>
        </div>
        <span className={`w-fit rounded-full border px-2.5 py-1 text-xs ${styles.buttonGhost}`}>
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
        {visibleEvents.length === 0 ? (
          <div className={`rounded-xl border px-4 py-5 text-sm ${styles.surface} ${styles.muted}`}>
            No shared timeline events yet.
          </div>
        ) : visibleEvents.map((event) => (
          <div key={event.id} className="flex gap-3">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/15">
              <TimelineIcon type={event.type} source={event.source} />
            </div>
            <div className={`min-w-0 flex-1 border-b pb-2.5 last:border-b-0 last:pb-0 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm font-medium">{event.title}</div>
                <div className={`text-xs ${styles.muted}`}>{event.time}</div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${sourceTone(event.source, theme)}`}>
                  {event.source ?? 'System'}
                </span>
                <div className={`text-xs leading-5 ${styles.muted}`}>{event.meta}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
