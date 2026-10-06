import type { CrmLead, CrmTripItinerary, CrmWorkflowReminder } from '../../../types';

export type CalendarEvent = { id: string; leadId: string; title: string; detail: string; start: string; end: string; at?: string; kind: 'travel' | 'task' | 'followup' };

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validDay(value?: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dateKey(date) === value ? value : null;
}

// Free-form or flexible dates must remain unscheduled, never guessed.
export function travelRange(value: string): [string, string] | null {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s+(?:-|–|to|a)\s+(\d{4}-\d{2}-\d{2}))?$/);
  if (!match) {
    // Older CRM/CTM records contain an explicit English or Portuguese month.
    const named = value.trim().match(/^(\d{1,2})\s+([A-Za-zçÇ]+)(?:\s+(\d{4}))?(?:\s+[-–]\s+(\d{1,2})\s+([A-Za-zçÇ]+)\s+(\d{4}))?$/);
    if (!named || !(named[3] || named[6])) return null;
    const months: Record<string, number> = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12 };
    const day = (d: string, m: string, y: string) => months[m.toLowerCase()] ? validDay(`${y}-${String(months[m.toLowerCase()]).padStart(2, '0')}-${d.padStart(2, '0')}`) : null;
    const start = day(named[1], named[2], named[3] || named[6]);
    const end = named[4] ? day(named[4], named[5], named[6]) : start;
    return start && end && end >= start ? [start, end] : null;
  }
  const start = validDay(match[1]);
  const end = validDay(match[2] || match[1]);
  return start && end && end >= start ? [start, end] : null;
}

export function calendarEvents(leads: CrmLead[], itineraries: CrmTripItinerary[], tasks: CrmWorkflowReminder[]) {
  const events: CalendarEvent[] = [];
  const unscheduled: CrmLead[] = [];
  for (const lead of leads.filter(item => !['lost', 'completed'].includes(item.status))) {
    const plans = itineraries.filter(plan => String(plan.leadId) === String(lead.id));
    const ranges = plans.flatMap(plan => {
      const start = validDay(plan.startDate);
      const end = validDay(plan.endDate) || start;
      return start && end && end >= start ? [{ id: plan.id, start, end }] : [];
    });
    const range = travelRange(lead.dates || '');
    if (!ranges.length && range) ranges.push({ id: lead.id, start: range[0], end: range[1] });
    if (!ranges.length) unscheduled.push(lead);
    for (const item of ranges) events.push({ id: `travel-${lead.id}-${item.id}`, leadId: lead.id, title: lead.name, detail: lead.destination, start: item.start, end: item.end, kind: 'travel' });
  }
  const inactive = new Set(leads.filter(lead => ['lost', 'completed'].includes(lead.status)).map(lead => String(lead.id)));
  for (const task of tasks.filter(task => ['pending', 'in_progress', 'waiting'].includes(task.status) && !inactive.has(String(task.leadId)))) {
    for (const [kind, timestamp] of [['task', task.dueAt], ['followup', task.status === 'waiting' ? task.followUpAt : null]] as const) {
      if (!timestamp) continue;
      const date = new Date(timestamp);
      if (!Number.isFinite(date.getTime())) continue;
      const day = dateKey(date);
      events.push({ id: `${kind}-${task.id}`, leadId: task.leadId, title: task.title, detail: task.leadName, start: day, end: day, at: timestamp, kind });
    }
  }
  return {
    events: events.sort((a, b) => a.start.localeCompare(b.start)
      || (a.at ? Date.parse(a.at) : 0) - (b.at ? Date.parse(b.at) : 0)
      || a.title.localeCompare(b.title)),
    unscheduled,
  };
}
