import type { CrmLead } from '../../../types';
import { csvEscape } from '../shared/formatting';
import { fallbackPriority, leadLifecycleLabel, priorityLabels, statusLabels, typeLabels } from '../shared/leadMeta';

export function exportCsv(leads: CrmLead[]) {
  const headers = [
    'Created',
    'Type',
    'Service',
    'Status',
    'Lifecycle stage',
    'Priority',
    'Name',
    'Email',
    'WhatsApp',
    'Preferred contact',
    'Requested services',
    'Trip type',
    'Departure city',
    'Destination',
    'Dates',
    'Travelers',
    'Budget',
    'Urgency',
    'Notes',
    'Internal notes',
  ];
  const rows = leads.map((lead) => [
    lead.createdAt,
    typeLabels[lead.serviceKey] ?? lead.serviceKey,
    lead.service,
    statusLabels[lead.status],
    leadLifecycleLabel(lead),
    priorityLabels[fallbackPriority(lead)],
    lead.name,
    lead.email,
    lead.whatsapp,
    lead.preferredContact,
    lead.requestedServices,
    lead.tripType,
    lead.departureCity,
    lead.destination,
    lead.dates,
    lead.travelers,
    lead.budget,
    lead.urgency,
    lead.notes,
    lead.internalNotes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dpm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const reportsSurfaceMeta = {
  title: 'Reports',
  subtitle: 'Commercial performance and operational attention',
};
