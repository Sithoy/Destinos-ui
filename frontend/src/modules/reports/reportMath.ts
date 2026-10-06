export type ReportPeriod = 'month' | 'quarter' | 'year' | 'all' | 'custom';
export type DateRange = { from: string; to: string };

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function periodRange(period: ReportPeriod, custom: DateRange, now = new Date()): DateRange {
  const year = now.getFullYear();
  if (period === 'all') return { from: '', to: dayKey(now) };
  if (period === 'custom') return custom;
  const month = period === 'year' ? 0 : period === 'quarter' ? Math.floor(now.getMonth() / 3) * 3 : now.getMonth();
  return { from: dayKey(new Date(year, month, 1)), to: dayKey(now) };
}

export function validRange(range: DateRange) {
  const valid = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && dayKey(new Date(`${value}T12:00:00`)) === value);
  return valid(range.from) && valid(range.to) && !(range.from && range.to && range.from > range.to);
}

export function inRange(value: string | null | undefined, range: DateRange) {
  if (!value || !validRange(range)) return false;
  if (value.length === 10 && !validRange({ from: value, to: '' })) return false;
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (!Number.isFinite(date.getTime())) return false;
  const key = dayKey(date);
  return (!range.from || key >= range.from) && (!range.to || key <= range.to);
}

export function previousRange(range: DateRange): DateRange | null {
  if (!range.from || !range.to || !validRange(range)) return null;
  const start = new Date(`${range.from}T12:00:00`);
  const end = new Date(`${range.to}T12:00:00`);
  const days = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1;
  const previousEnd = new Date(start); previousEnd.setDate(start.getDate() - 1);
  start.setDate(start.getDate() - days);
  return { from: dayKey(start), to: dayKey(previousEnd) };
}

export function moneyNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function sumMoney(values: number[]) {
  return values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
}

export function downloadReport(name: string, rows: unknown[][]) {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${name}-${dayKey(new Date())}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
