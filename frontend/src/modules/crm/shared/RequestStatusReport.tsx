import { opsText } from '../../../locales/operations';
import type { CrmLead } from '../../../types';
import type { InfoCard } from './leadMeta';
import { leadLifecycleLabel, leadSegment } from './leadMeta';
import type { CrmSurfaceStyles } from './types';

type RequestStatusReportProps = {
  lead: CrmLead;
  statusCards: InfoCard[];
  styles: CrmSurfaceStyles;
};

export function RequestStatusReport({ lead, statusCards, styles }: RequestStatusReportProps) {
  return (
    <div className={`mt-5 rounded-xl border p-4 ${styles.panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>{opsText("Status report")}</div>
          <div className="mt-2 text-base font-semibold">{lead.name}</div>
          <div className={`mt-1 text-sm ${styles.muted}`}>{opsText(leadSegment(lead))} · {lead.destination || opsText("Destination pending")}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type[lead.serviceKey]}`}>
          {opsText(leadLifecycleLabel(lead))}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {statusCards.map((card) => (
          <div key={card.label} className={`rounded-lg border p-3 ${styles.panelSoft}`}>
            <div className={`text-xs uppercase tracking-[0.12em] ${styles.muted}`}>{opsText(card.label)}</div>
            <div className="mt-2 text-sm font-semibold">{card.value}</div>
            {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{opsText(card.meta)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
