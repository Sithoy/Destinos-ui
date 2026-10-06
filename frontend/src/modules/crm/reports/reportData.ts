import type { CrmLead, CrmQuote, CrmWorkflowReminder } from '../../../types';
import { inRange, moneyNumber, sumMoney, type DateRange } from '../../reports/reportMath.ts';

export function cohortLeads(leads: CrmLead[], range: DateRange, service: string, owner: string) {
  return leads.filter(lead => inRange(lead.createdAt, range) && (service === 'all' || lead.serviceKey === service)
    && (owner === 'all' || (owner === 'unassigned' ? !lead.ownerId : String(lead.ownerId) === owner)));
}

export function reportGroups(leads: CrmLead[], tasks: CrmWorkflowReminder[], now = new Date()) {
  const active = leads.filter(lead => !['completed', 'lost'].includes(lead.status));
  const overdueIds = new Set(tasks.filter(task => ['pending', 'in_progress', 'waiting'].includes(task.status) && (new Date(task.dueAt).getTime() < now.getTime() || (task.status === 'waiting' && task.followUpAt && new Date(task.followUpAt).getTime() < now.getTime()))).map(task => String(task.leadId)));
  return {
    all: leads,
    active,
    confirmed: leads.filter(lead => ['won', 'execution', 'completed'].includes(lead.status)),
    proposal: leads.filter(lead => lead.status === 'proposal'),
    lost: leads.filter(lead => lead.status === 'lost'),
    overdue: active.filter(lead => overdueIds.has(String(lead.id))),
    unassigned: active.filter(lead => !lead.ownerId),
    stale: active.filter(lead => now.getTime() - new Date(lead.updatedAt).getTime() >= 7 * 86400000),
  };
}

// Only the latest version per request contributes; rejected/expired versions have no live value.
export function latestReportQuotes(quotes: CrmQuote[], leads: CrmLead[]) {
  const ids = new Set(leads.map(lead => String(lead.id)));
  const latest = new Map<string, CrmQuote>();
  for (const quote of quotes.filter(quote => ids.has(String(quote.leadId)))) {
    const previous = latest.get(String(quote.leadId));
    if (!previous || quote.version > previous.version || (quote.version === previous.version && quote.createdAt > previous.createdAt)) latest.set(String(quote.leadId), quote);
  }
  return [...latest.values()].filter(quote => !['rejected', 'expired'].includes(quote.status));
}

export function quoteTotals(quotes: CrmQuote[], includeMargin: boolean) {
  return [...new Set(quotes.map(quote => quote.currency))].sort().map(currency => {
    const rows = quotes.filter(quote => quote.currency === currency);
    const sales = rows.map(quote => moneyNumber(quote.subtotalSell));
    const margins = rows.map(quote => moneyNumber(quote.margin));
    return { currency, count: rows.length, value: sales.every(value => value !== null) ? sumMoney(sales as number[]) : null,
      margin: includeMargin && margins.every(value => value !== null) ? sumMoney(margins as number[]) : null };
  });
}
