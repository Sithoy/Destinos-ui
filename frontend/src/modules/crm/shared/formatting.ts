import { opsLocale, opsText } from '../../../locales/operations';

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(opsLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function dateTimeValue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDueBy(value: string | null | undefined, limit: Date) {
  const date = dateTimeValue(value);
  return Boolean(date && date.getTime() <= limit.getTime());
}

export function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? 'D'}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export function formatDateOnly(value?: string | null) {
  if (!value) return opsText('Date pending');
  return new Intl.DateTimeFormat(opsLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
