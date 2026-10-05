import type { CrmLead } from '../../../types';
import { formatDate, initials } from './formatting';
import { attentionLevel, fallbackPriority, leadPrimaryBlocker, leadSegment, priorityLabels, typeLabels } from './leadMeta';
import type { CrmSurfaceStyles } from './types';

type RequestQueueCardProps = {
  lead: CrmLead;
  isSelected: boolean;
  styles: CrmSurfaceStyles;
  onSelect: () => void;
};

export function RequestQueueCard({ lead, isSelected, styles, onSelect }: RequestQueueCardProps) {
  const priority = fallbackPriority(lead);
  return (
    <button
      key={lead.id}
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition ${isSelected ? styles.rowActive : styles.row}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7a5a08] text-sm font-semibold text-white">
              {initials(lead.name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{lead.name}</div>
              <div className={`mt-1 truncate text-xs ${styles.muted}`}>
                {leadSegment(lead)} · {lead.destination || 'Destination pending'}
              </div>
            </div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type[lead.serviceKey]}`}>
          {typeLabels[lead.serviceKey]}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Travel dates</div>
          <div className="mt-1 text-sm font-medium">{lead.dates || 'Dates pending'}</div>
          <div className={`mt-1 text-xs ${styles.muted}`}>{lead.travelers || 'Travelers pending'}</div>
        </div>
        <div>
          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Budget</div>
          <div className="mt-1 text-sm font-medium">{lead.budget || 'Budget pending'}</div>
          <div className={`mt-1 text-xs ${styles.muted}`}>Received {formatDate(lead.createdAt)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.priority[priority]}`}>
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${styles.attention[attentionLevel(lead)]}`} />
          {priorityLabels[priority]}
        </span>
        <span className={`text-xs ${styles.muted}`}>Blocker: {leadPrimaryBlocker(lead)}</span>
      </div>
    </button>
  );
}
