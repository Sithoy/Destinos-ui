import type { CrmMyDayResponse, CrmMyDaySectionKey, CrmWorkflowReminder } from '../../../types';
import { formatDate, formatDateOnly } from '../shared/formatting';

export type MyDaySection = {
  key: CrmMyDaySectionKey;
  title: string;
  subtitle: string;
  count: number;
  items: MyDayItem[];
};

export type MyDayItem = {
  id: string;
  leadId: string;
  title: string;
  detail: string;
  owner: string;
};

function ownerLabel(name: string | null | undefined) {
  return name?.trim() || 'Unassigned';
}

function taskItem(task: CrmWorkflowReminder, reason: string): MyDayItem {
  return {
    id: task.id,
    leadId: String(task.leadId),
    title: task.title,
    detail: `${reason} · due ${formatDate(task.dueAt)}`,
    owner: ownerLabel(task.assignedToName),
  };
}

export function myDaySections(data: CrmMyDayResponse): MyDaySection[] {
  return [
    {
      key: 'waitingClients',
      title: 'Clients waiting for a response',
      subtitle: 'Follow-ups past due — every waiting day costs conversion.',
      count: data.counts.waitingClients,
      items: data.waitingClients.map((item) => ({
        id: item.communicationId,
        leadId: String(item.leadId),
        title: item.leadName,
        detail: `${item.subject || item.kind} · waiting since ${item.followUpDue ? formatDate(item.followUpDue) : 'date pending'} · ${item.channel}`,
        owner: ownerLabel(item.ownerName),
      })),
    },
    {
      key: 'expiringSupplierHolds',
      title: 'Supplier holds expiring',
      subtitle: 'Unconfirmed supplier deadlines inside the next two days.',
      count: data.counts.expiringSupplierHolds,
      items: data.expiringSupplierHolds.map((item) => ({
        id: item.quoteLineId,
        leadId: String(item.leadId),
        title: `${item.leadName} — ${item.description || item.category}`,
        detail: `${item.supplier || 'Supplier pending'} · hold expires ${formatDateOnly(item.supplierDeadline)} · ${item.quoteNumber}`,
        owner: ownerLabel(item.bookingOwnerName),
      })),
    },
    {
      key: 'pendingApprovals',
      title: 'Pending approvals',
      subtitle: 'Quotes waiting on a decision before work can continue.',
      count: data.counts.pendingApprovals,
      items: data.pendingApprovals.map((item) => ({
        id: item.approvalId,
        leadId: String(item.leadId),
        title: `${item.leadName} — ${item.quoteNumber}`,
        detail: `Approver ${item.approverName || item.approverEmail || 'pending'} · requested ${formatDateOnly(item.createdAt)}`,
        owner: '',
      })),
    },
    {
      key: 'upcomingDepartures',
      title: 'Upcoming departures missing travel packs',
      subtitle: 'Trips departing inside three days without a sent travel pack.',
      count: data.counts.upcomingDepartures,
      items: data.upcomingDepartures.map((item) => ({
        id: item.itineraryId,
        leadId: String(item.leadId),
        title: `${item.leadName} — ${item.title}`,
        detail: `Departs ${formatDateOnly(item.startDate)} · travel pack not sent`,
        owner: ownerLabel(item.ownerName),
      })),
    },
    {
      key: 'overdueTasks',
      title: 'Overdue tasks',
      subtitle: 'Past-due work that is blocking trips or clients.',
      count: data.counts.overdueTasks,
      items: data.overdueTasks.map((task) => taskItem(task, 'Overdue')),
    },
    {
      key: 'todayTasks',
      title: 'Due today',
      subtitle: 'Tasks due before the end of today.',
      count: data.counts.todayTasks,
      items: data.todayTasks.map((task) => taskItem(task, 'Due today')),
    },
  ];
}

export function myDayTotalCount(data: CrmMyDayResponse) {
  return Object.values(data.counts).reduce((total, count) => total + count, 0);
}
