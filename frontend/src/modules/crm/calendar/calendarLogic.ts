import type { CrmLead } from '../../../types';

export function leadHasTravelDates(lead: CrmLead) {
  return Boolean(lead.dates);
}

export function calendarRequestCount(leads: CrmLead[]) {
  return leads.filter((lead) => leadHasTravelDates(lead) && lead.status !== 'lost' && lead.status !== 'completed').length;
}

export const calendarSurfaceMeta = {
  title: 'Travel Calendar',
  subtitle: 'Requests with travel dates, useful for upcoming movement planning',
};
