import { useReportCopy } from './useReportCopy';
import type { DateRange, ReportPeriod } from './reportMath';

export function ReportControls({ period, custom, onPeriod, onCustom, children }: {
  period: ReportPeriod; custom: DateRange; onPeriod: (value: ReportPeriod) => void; onCustom: (value: DateRange) => void; children?: React.ReactNode;
}) {
  const c = useReportCopy();
  return <div className="flex flex-wrap items-end gap-3 rounded-xl border crm-panel p-4">
    <label className="grid gap-1 text-xs crm-muted">{c('Period', 'Período')}
      <select className="crm-select rounded-lg border px-3 py-2 text-sm" value={period} onChange={event => onPeriod(event.target.value as ReportPeriod)}>
        <option value="month">{c('Month to date', 'Mês até hoje')}</option><option value="quarter">{c('Quarter to date', 'Trimestre até hoje')}</option><option value="year">{c('Year to date', 'Ano até hoje')}</option><option value="all">{c('All dates', 'Todas as datas')}</option><option value="custom">{c('Custom dates', 'Datas personalizadas')}</option>
      </select>
    </label>
    {period === 'custom' && <><label className="grid gap-1 text-xs crm-muted">{c('From', 'De')}<input type="date" value={custom.from} onChange={event => onCustom({ ...custom, from: event.target.value })} className="crm-input rounded-lg border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs crm-muted">{c('To', 'Até')}<input type="date" value={custom.to} min={custom.from} onChange={event => onCustom({ ...custom, to: event.target.value })} className="crm-input rounded-lg border px-3 py-2 text-sm" /></label></>}
    {children}
  </div>;
}

export function ReportMetric({ label, value, note, onClick, active }: { label: string; value: string | number; note: string; onClick: () => void; active?: boolean }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`crm-metric crm-panel rounded-xl border p-5 text-left ${active ? 'ring-2 ring-orange-400' : ''}`}>
    <div className="text-sm crm-muted">{label}</div><div className="my-2 break-words text-2xl font-semibold tabular-nums">{value}</div><div className="text-xs leading-5 crm-muted">{note}</div>
  </button>;
}
